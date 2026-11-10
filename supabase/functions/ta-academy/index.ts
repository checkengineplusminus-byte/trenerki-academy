import {createClient} from 'npm:@supabase/supabase-js@2.86.0';

const cors={
 'access-control-allow-origin':'*',
 'access-control-allow-methods':'POST,OPTIONS',
 'access-control-allow-headers':'authorization,x-client-info,apikey,content-type,x-retry-count,traceparent,tracestate,baggage'
};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'content-type':'application/json','cache-control':'no-store'}});
const baseUrl='https://trenerki.com';
const cleanText=(v,n=200)=>String(v||'').trim().slice(0,n);
const validSlug=v=>/^[a-z0-9][a-z0-9_-]{1,79}$/.test(v);
const validMail=v=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
const htmlEsc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const afterDays=d=>new Date(Date.now()+d*86400e3).toISOString();
const afterYear=()=>{const d=new Date();d.setUTCFullYear(d.getUTCFullYear()+1);return d.toISOString()};
async function codeHash(code){
 const buf=new TextEncoder().encode(code);
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buf)),b=>b.toString(16).padStart(2,'0')).join('');
}
function randomCode(){
 const a=new Uint8Array(16);crypto.getRandomValues(a);
 return 'TA-'+Array.from(a,b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
}
async function sendViaResend(to,subject,html){
 const api=Deno.env.get('RESEND_API_KEY');
 const from=Deno.env.get('RESEND_FROM_EMAIL');
 if(!api||!from)return {sent:false,reason:'email_not_configured'};
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'authorization':'Bearer '+api,'content-type':'application/json'},
  body:JSON.stringify({from,to:[to],subject,html})});
 if(!r.ok)return {sent:false,reason:'email_provider_unavailable'};
 return {sent:true};
}
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return reply({ok:true});
 if(request.method!=='POST')return reply({error:'method_not_allowed'},405);
 const token=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!token)return reply({error:'login_required'},401);
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!anon||!secret)return reply({error:'service_not_ready'},503);
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(token);
 if(authError||!user?.id||!user.email_confirmed_at)return reply({error:'confirmed_login_required'},401);
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 let payload={};try{payload=await request.json();}catch{return reply({error:'invalid_json'},400)}
 const action=cleanText(payload?.action,40),slug=cleanText(payload?.course_slug,80);
 const {data:adminRec,error:adminError}=await db.from('ta_admins').select('role').eq('user_id',user.id).maybeSingle();
 if(adminError)return reply({error:'role_check_failed'},503);
 const isAdmin=!!adminRec?.role;
 try{
 if(action==='whoami')return reply({is_admin:isAdmin,email:user.email});
 if(action==='demo_checkout')return reply({error:'demo_checkout_disabled'},403);
 if(action==='create_gift'){
  if(!validSlug(slug))return reply({error:'invalid_course'},400);
  const {data:c,error:ce}=await db.from('ta_courses').select('slug,title_pl,price_grosze').eq('slug',slug).eq('published',true).maybeSingle();
  if(ce||!c)return reply({error:'course_unavailable'},404);
  const mode=c.price_grosze===0?'free':'demo';
  if(mode==='demo')return reply({error:'paid_gifts_disabled'},403);
  const email=cleanText(payload?.recipient_email,190).toLowerCase();
  if(email&&!validMail(email))return reply({error:'invalid_recipient_email'},400);
  const message=cleanText(payload?.message,300);
  if(!isAdmin){const {count}=await db.from('ta_gift_cards').select('id',{count:'exact',head:true}).eq('created_by',user.id).gte('created_at',afterDays(-1));if((count||0)>=10)return reply({error:'daily_gift_limit'},429)}
  const code=randomCode(),hash=await codeHash(code);
  const {data:gift,error:ge}=await db.from('ta_gift_cards').insert({code_hash:hash,course_slug:slug,created_by:user.id,recipient_email:email||null,gift_message:message||null,mode}).select('id,expires_at').single();
  if(ge)return reply({error:'gift_creation_failed'},500);
  const giftUrl=baseUrl+'/prezent?code='+encodeURIComponent(code);
  let delivered={sent:false,reason:'share_link'};
  if(email){const html='<h2>Prezent od bliskiej osoby 🎁</h2><p>Otrzymujesz dostęp do kursu: <b>'+htmlEsc(c.title_pl)+'</b>.</p><p>'+htmlEsc(message)+'</p><p><a href="'+htmlEsc(giftUrl)+'">Otwórz prezent w TRENERKI Academy</a></p><p>'+(mode==='demo'?'To testowa karta podarunkowa, bez wpłaty i wartości pieniężnej.':'To prezent do bezpłatnego kursu.')+'</p>';delivered=await sendViaResend(email,'TRENERKI Academy — prezent dla Ciebie',html)}
  return reply({ok:true,code,link:giftUrl,gift_id:gift.id,expires_at:gift.expires_at,mode,email_sent:delivered.sent,email_message:delivered.reason||null});
 }
 if(action==='redeem_gift'){
  const code=cleanText(payload?.code,90).toUpperCase().replace(/\s/g,'');
  if(!/^TA-[0-9A-F]{32}$/.test(code))return reply({error:'invalid_gift_code'},400);
  const hash=await codeHash(code);
  const {data:g,error:ge}=await db.from('ta_gift_cards').select('id,course_slug,recipient_email,mode,status,expires_at').eq('code_hash',hash).maybeSingle();
  if(ge||!g)return reply({error:'invalid_gift_code'},404);
  if(g.mode!=='free')return reply({error:'paid_gifts_disabled'},403);
  if(g.status!=='issued'||new Date(g.expires_at)<new Date())return reply({error:'gift_used_or_expired'},409);
  if(g.recipient_email&&g.recipient_email.toLowerCase()!==String(user.email||'').toLowerCase())return reply({error:'gift_for_another_email'},403);
  const {data:existing}=await db.from('ta_enrollments').select('id').eq('user_id',user.id).eq('course_slug',g.course_slug).in('status',['active','demo']).gt('expires_at',new Date().toISOString()).limit(1);
  if(existing?.length)return reply({error:'course_already_active'},409);
  const {data:locked,error:lockedError}=await db.from('ta_gift_cards').update({status:'redeemed',redeemed_by:user.id,redeemed_at:new Date().toISOString()}).eq('id',g.id).eq('status','issued').select('id').maybeSingle();
  if(lockedError||!locked)return reply({error:'gift_already_redeemed'},409);
  const exp=g.mode==='free'?afterYear():afterDays(14);
  const now=new Date().toISOString();
  const {error:ie}=await db.from('ta_enrollments').insert({user_id:user.id,course_slug:g.course_slug,stripe_checkout_session_id:'gift:'+g.id,amount_grosze:0,currency:'PLN',status:g.mode==='free'?'active':'demo',purchased_at:now,expires_at:exp});
  if(ie){await db.from('ta_gift_cards').update({status:'issued',redeemed_by:null,redeemed_at:null}).eq('id',g.id).eq('redeemed_by',user.id);return reply({error:'gift_redemption_failed'},500)}
  if(g.mode==='demo')await db.from('ta_demo_orders').insert({user_id:user.id,course_slug:g.course_slug,list_price_grosze:0,actual_paid_grosze:0,source:'gift',gift_card_id:g.id,expires_at:exp});
  return reply({ok:true,course_slug:g.course_slug,mode:g.mode,expires_at:exp,money_collected:false});
 }
 if(action==='my_gifts'){
  const {data,error}=await db.from('ta_gift_cards').select('id,course_slug,mode,status,recipient_email,created_at,expires_at,redeemed_at').eq('created_by',user.id).order('created_at',{ascending:false}).limit(50);
  if(error)return reply({error:'gifts_unavailable'},503);
  return reply({gifts:data||[]});
 }
 if(action==='admin_dashboard'){
  if(!isAdmin)return reply({error:'admin_only'},403);
  const [users,orders,gifts,documents,courses,enrollments]=await Promise.all([
   db.auth.admin.listUsers({page:1,perPage:100}),
   db.from('ta_demo_orders').select('id,user_id,course_slug,list_price_grosze,actual_paid_grosze,source,created_at,expires_at').order('created_at',{ascending:false}).limit(40),
   db.from('ta_gift_cards').select('id,course_slug,mode,status,recipient_email,created_at,redeemed_at').order('created_at',{ascending:false}).limit(40),
   db.from('ta_invoice_drafts').select('id,user_id,course_slug,recipient_email,amount_grosze,doc_status,created_at,sent_at').order('created_at',{ascending:false}).limit(40),
   db.from('ta_courses').select('slug',{count:'exact',head:true}).eq('published',true),
   db.from('ta_enrollments').select('id',{count:'exact',head:true}).in('status',['active','demo'])
  ]);
  if(users.error||orders.error||gifts.error||documents.error)return reply({error:'admin_data_unavailable'},503);
  return reply({is_admin:true,counts:{users:users.data?.total??users.data?.users?.length??0,courses:courses.count??0,active_or_demo_access:enrollments.count??0,demo_orders:orders.data?.length??0,gift_codes:gifts.data?.length??0},users:(users.data?.users||[]).map(u=>({id:u.id,email:u.email,created_at:u.created_at,last_sign_in_at:u.last_sign_in_at,confirmed:!!u.email_confirmed_at})),orders:orders.data||[],gifts:gifts.data||[],invoice_drafts:documents.data||[],money_received:0});
 }
 if(action==='create_invoice_draft'){
  if(!isAdmin)return reply({error:'admin_only'},403);
  const uid=cleanText(payload?.user_id,50),courseSlug=cleanText(payload?.course_slug,80);
  if(!/^[0-9a-f-]{36}$/i.test(uid)||!validSlug(courseSlug))return reply({error:'invalid_selection'},400);
  const [{data:{user:target},error:ue},{data:course,error:ce}]=await Promise.all([db.auth.admin.getUserById(uid),db.from('ta_courses').select('slug,price_grosze').eq('slug',courseSlug).maybeSingle()]);
  if(ue||!target?.email||ce||!course)return reply({error:'user_or_course_unavailable'},404);
  const {data:doc,error:de}=await db.from('ta_invoice_drafts').insert({user_id:uid,course_slug:courseSlug,recipient_email:target.email,amount_grosze:course.price_grosze,created_by:user.id,doc_status:'draft'}).select('id,recipient_email,amount_grosze,doc_status').single();
  if(de)return reply({error:'invoice_draft_failed'},500);
  return reply({ok:true,draft:doc,label:'DOKUMENT TESTOWY / NIE JEST FAKTURĄ VAT'});
 }
 if(action==='send_invoice_test'){
  if(!isAdmin)return reply({error:'admin_only'},403);
  const id=cleanText(payload?.draft_id,50);
  if(!/^[0-9a-f-]{36}$/i.test(id))return reply({error:'invalid_draft_id'},400);
  const {data:doc,error:de}=await db.from('ta_invoice_drafts').select('id,recipient_email,amount_grosze,course_slug,doc_status').eq('id',id).maybeSingle();
  if(de||!doc)return reply({error:'draft_not_found'},404);
  if(doc.doc_status==='test_email_sent')return reply({ok:true,already_sent:true});
  const html='<h2>Zestawienie testowe TRENERKI Academy</h2><p><b>TO NIE JEST FAKTURA, NIE JEST WEZWANIE DO ZAPŁATY.</b></p><p>Kurs: '+htmlEsc(doc.course_slug)+'</p><p>Cena katalogowa: '+(doc.amount_grosze/100).toFixed(2)+' zł. Faktycznie zapłacono: 0 zł.</p><p>Dokument pokazowy do testowania procesu obsługi klienta.</p>';
  const sent=await sendViaResend(doc.recipient_email,'TRENERKI Academy — testowy dokument (nie faktura)',html);
  if(!sent.sent)return reply({error:sent.reason||'email_failed'},503);
  await db.from('ta_invoice_drafts').update({doc_status:'test_email_sent',sent_at:new Date().toISOString()}).eq('id',id).eq('doc_status','draft');
  return reply({ok:true,recipient_email:doc.recipient_email,document_type:'TEST_ONLY'});
 }
 return reply({error:'unknown_action'},400);
 }catch(err){console.error('TRENERKI action failed',action,String(err).slice(0,350));return reply({error:'operation_failed'},500)}
});