import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.86.0';
import { buildDiplomaPdf, diplomaFilename, pdfBase64, type Diploma } from './lib/pdf.ts';

const allowedOrigins = new Set([
  'https://trenerki.com', 'https://www.trenerki.com', 'https://trenerki-academy.expo.app',
]);
const fields = 'id,user_id,course_slug,certificate_no,holder_name,title_pl,title_en,issued_at,is_demo,revoked_at';
const registryFields = `${fields},ta_diploma_mail(status,sent_at,last_error)` as const;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
type MailJob = { certificate_id: string; request_key: string; attempts: number };

async function sendDiploma(db: SupabaseClient, job: MailJob) {
  let problem = '';
  let providerId = '';
  try {
    const key = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('RESEND_FROM_EMAIL');
    if (!key || !from) throw new Error('email_not_configured');
    const { data: diploma, error } = await db.from('ta_certificates').select(fields)
      .eq('id', job.certificate_id).eq('is_demo', false).is('revoked_at', null).maybeSingle();
    if (error) throw new Error('database_unavailable');
    if (!diploma) throw new Error('diploma_unavailable');
    const { data: { user }, error: userError } = await db.auth.admin.getUserById(diploma.user_id);
    if (userError || !user?.email || !user.email_confirmed_at) throw new Error('recipient_unavailable');
    const attachments = await Promise.all((['pl', 'en'] as const).map(async language => ({
      filename: diplomaFilename(diploma, language),
      content: pdfBase64(await buildDiplomaPdf(diploma, language)),
    })));
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer ' + key,
        'content-type': 'application/json',
        'idempotency-key': 'trenerki-diploma/' + job.request_key,
      },
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        from, to: [user.email],
        subject: 'TRENERKI Academy · Dyplom / Certificate ' + diploma.certificate_no,
        text: 'Gratulacje! W załącznikach znajdziesz dyplom ukończenia kursu w języku polskim i angielskim.\n\nCongratulations! Your Polish and English certificates of completion are attached.\n\nTRENERKI Academy',
        attachments,
      }),
    });
    if (!response.ok) throw new Error('email_provider_' + response.status);
    const result = await response.json();
    if (typeof result.id !== 'string' || !result.id) throw new Error('email_provider_invalid_response');
    providerId = result.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    problem = /^(?:email_(?:not_configured|provider_[0-9]+|provider_invalid_response)|database_unavailable|diploma_unavailable|recipient_unavailable)$/.test(message)
      ? message : 'temporary_delivery_error';
  }
  const retry = !providerId && job.attempts < 8 && !['diploma_unavailable', 'recipient_unavailable'].includes(problem);
  const { error: saveError } = await db.from('ta_diploma_mail').update({
    status: providerId ? 'sent' : retry ? 'pending' : 'failed',
    sent_at: providerId ? new Date().toISOString() : null,
    provider_id: providerId || null,
    last_error: problem || null,
    lease_until: null,
    next_attempt_at: new Date(Date.now() + Math.min(2 ** job.attempts, 120) * 60000).toISOString(),
  }).eq('certificate_id', job.certificate_id).eq('request_key', job.request_key)
    .eq('attempts', job.attempts).eq('status', 'sending');
  if (saveError) throw new Error('delivery_status_not_saved');
  return !!providerId;
}

Deno.serve(async request => {
  const origin = request.headers.get('origin') || '';
  const cors = {
    ...(allowedOrigins.has(origin) ? { 'access-control-allow-origin': origin } : {}),
    'access-control-allow-headers': 'authorization,apikey,content-type,x-client-info,x-retry-count,traceparent,tracestate,baggage',
    'access-control-allow-methods': 'POST,OPTIONS',
    'cache-control': 'no-store',
    'vary': 'Origin',
  };
  const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
    status, headers: { ...cors, 'content-type': 'application/json' },
  });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return reply({ error: 'service_unavailable' }, 503);
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  let input: { action?: string; id?: string; language?: string; number?: string; before?: string };
  try {
    const payload = await request.text();
    if (payload.length > 2048) return reply({ error: 'invalid_input' }, 400);
    input = JSON.parse(payload);
    if (!input || typeof input !== 'object' || Array.isArray(input)) return reply({ error: 'invalid_input' }, 400);
  } catch { return reply({ error: 'invalid_input' }, 400); }
  if (input.action === 'deliver') {
    const token = request.headers.get('x-ta-diploma-worker');
    if (!token || !/^[0-9a-f]{64}$/.test(token)) return reply({ error: 'not_authorized' }, 401);
    const { data: authorized } = await db.rpc('ta_is_diploma_worker', { p_token: token });
    if (!authorized) return reply({ error: 'not_authorized' }, 401);
    const { data: jobs, error } = await db.rpc('ta_diploma_mail_claim', { p_certificate: null, p_limit: 4 });
    if (error) return reply({ error: 'database_unavailable' }, 503);
    const results = await Promise.allSettled((jobs as MailJob[]).map(job => sendDiploma(db, job)));
    return reply({ ok: true, sent: results.filter(result => result.status === 'fulfilled' && result.value).length });
  }

  const bearer = request.headers.get('authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!bearer) return reply({ error: 'login_required' }, 401);
  const { data: { user }, error: authError } = await db.auth.getUser(bearer);
  if (authError || !user?.id || !user.email_confirmed_at) return reply({ error: 'login_required' }, 401);

  const isAdmin = async () => {
    const { data, error } = await db.from('ta_admins').select('user_id').eq('user_id', user.id).maybeSingle();
    return !error && !!data;
  };
  if (input.action === 'list') {
    if (!(await isAdmin())) return reply({ error: 'not_authorized' }, 403);
    const number = typeof input.number === 'string' ? input.number.trim().toUpperCase() : '';
    if (number && !/^[A-Z0-9-]{3,30}$/.test(number)) return reply({ error: 'invalid_number' }, 400);
    let query = db.from('ta_certificates').select(registryFields)
      .order('issued_at', { ascending: false }).order('id', { ascending: false }).limit(51);
    if (number) query = query.eq('certificate_no', number);
    if (input.before) {
      const [stamp, id, extra] = typeof input.before === 'string' ? input.before.split('|') : [];
      if (extra !== undefined || !stamp || !id || !uuid.test(id) ||
        !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(stamp)) {
        return reply({ error: 'invalid_cursor' }, 400);
      }
      query = query.or('issued_at.lt.' + stamp + ',and(issued_at.eq.' + stamp + ',id.lt.' + id + ')');
    }
    const { data, error } = await query;
    if (error) return reply({ error: 'database_unavailable' }, 503);
    const certificates = (data || []).slice(0, 50);
    return reply({ certificates, more: (data || []).length > 50 ? certificates[49].issued_at + '|' + certificates[49].id : null });
  }
  if (!['download', 'resend'].includes(input.action || '') || typeof input.id !== 'string' || !uuid.test(input.id)) {
    return reply({ error: 'invalid_input' }, 400);
  }
  if (input.action === 'resend') {
    if (!(await isAdmin())) return reply({ error: 'not_authorized' }, 403);
    const { data, error } = await db.rpc('ta_diploma_mail_resend', { p_certificate: input.id });
    return error ? reply({ error: 'database_unavailable' }, 503) : reply({ queued: !!data });
  }
  if (input.language !== 'pl' && input.language !== 'en') return reply({ error: 'invalid_language' }, 400);
  const { data: diploma, error } = await db.from('ta_certificates').select(fields)
    .eq('id', input.id).is('revoked_at', null).maybeSingle();
  if (error) return reply({ error: 'database_unavailable' }, 503);
  if (!diploma || (diploma.user_id !== user.id && !(await isAdmin()))) return reply({ error: 'diploma_unavailable' }, 404);
  try {
    const pdf = await buildDiplomaPdf(diploma as Diploma, input.language);
    return reply({ filename: diplomaFilename(diploma as Diploma, input.language), pdf: pdfBase64(pdf) });
  } catch {
    return reply({ error: 'pdf_unavailable' }, 503);
  }
});
