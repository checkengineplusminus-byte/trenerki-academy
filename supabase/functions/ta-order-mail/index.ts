import {createClient} from 'npm:@supabase/supabase-js@2.86.0';
import {contractAttachments,money} from '../_shared/order-confirmation.ts';

const reply=(status:number)=>new Response(null,{status});
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]??c));
const date=(iso:string)=>new Intl.DateTimeFormat('pl-PL',{dateStyle:'long',timeStyle:'short',timeZone:'Europe/Warsaw'}).format(new Date(iso));

Deno.serve(async req=>{
 if(req.method!=='POST')return reply(405);
 const token=req.headers.get('x-ta-order-worker')||'';
 if(!/^[0-9a-f]{64}$/.test(token))return reply(401);
 const url=Deno.env.get('SUPABASE_URL'),role=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 const key=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('RESEND_FROM_EMAIL');
 if(!url||!role||!key||!from)return reply(503);
 const db=createClient(url,role,{auth:{persistSession:false}});
 const {data:authorized,error:authError}=await db.rpc('ta_check_order_mail_worker',{p_token:token});
 if(authError)return reply(503);
 if(authorized!==true)return reply(403);
 const {data:jobs,error}=await db.rpc('ta_claim_order_mail');
 if(error)return reply(503);
 const results=await Promise.allSettled((jobs??[]).map(async (job)=>{
  const attachments=contractAttachments(job.terms_version);
  if(!attachments)throw Error('terms_version_unavailable');
  const html='<p>Potwierdzenie zawarcia umowy z TRENERKI Sp. z o.o.</p><p>Kurs <strong>'+escape(job.course_title)+'</strong>. Rozliczono z salda '+money(job.amount_grosze)+'. Numer zamówienia '+escape(job.order_ref)+'.</p>'+
   '<p>Umowa zawarta '+date(job.accepted_at)+'. Dostęp do '+date(job.access_expires_at)+'.</p>'+
   '<p>Potwierdzamy złożone oświadczenie o rozpoczęciu dostarczania treści przed upływem 14 dni i przyjęcie informacji o możliwej utracie prawa odstąpienia po spełnieniu warunków ustawowych. W załączniku znajdują się warunki umowy, dane spółki oraz instrukcja odstąpienia.</p>';
  const sent=await fetch('https://api.resend.com/emails',{method:'POST',
   headers:{authorization:'Bearer '+key,'content-type':'application/json','Idempotency-Key':'trenerki-order-'+job.order_ref},
   body:JSON.stringify({from,to:[job.email],reply_to:'trenerki.pl@gmail.com',subject:'TRENERKI Academy — potwierdzenie zakupu z salda',html,attachments}),
   signal:AbortSignal.timeout(14000)});
  if(!sent.ok)throw Error('order_mail_delivery_failed');
  const {error:save}=await db.from('ta_order_mail_outbox').update({sent_at:new Date().toISOString(),leased_until:null})
   .eq('order_ref',job.order_ref).eq('leased_until',job.leased_until).is('sent_at',null);
  if(save)throw Error('order_mail_delivery_save_failed');
 }));
 return reply(results.some(result=>result.status==='rejected')?503:204);
});
