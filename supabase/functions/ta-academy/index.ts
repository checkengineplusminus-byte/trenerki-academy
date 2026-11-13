import {privacyNotice} from '../_shared/recipient-privacy.ts';
import {courseGiftMailContent} from '../_shared/gift-card-mail.ts';
import {giftCodeHash,isGiftCode,normalizeGiftCode,resolveGiftCode,shortGiftCode} from '../_shared/gift-code.ts';
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
async function sendViaResend(to,subject,html,attachments?:{filename:string;content:string}[],text?:string,idempotencyKey?:string){
 const api=Deno.env.get('RESEND_API_KEY');
 const from=Deno.env.get('RESEND_FROM_EMAIL');
 if(!api||!from)return {sent:false,reason:'email_not_configured'};
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{'authorization':'Bearer '+api,'content-type':'application/json',...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},
  body:JSON.stringify({from,to:[to],reply_to:'trenerki.pl@gmail.com',subject,html,attachments,text})});
 if(!r.ok)return {sent:false,reason:'email_provider_unavailable'};
 return {sent:true};
}
async function printableGifts(rows:any[],creatorId:string){
 return Promise.all((rows||[]).map(async row=>{
  const {code_hash,created_by,paid_at,...safe}=row;
  const printable=created_by===creatorId&&row.status==='issued'&&row.mode!=='demo'&&
   (row.mode!=='stripe'||!!paid_at)&&new Date(row.expires_at).getTime()>Date.now()&&
   !!await resolveGiftCode('TA',row.id,code_hash);
  return {...safe,printable};
 }));
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
 let payload:any={};try{payload=await request.json();}catch{return reply({error:'invalid_json'},400)}
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
  const giftId=crypto.randomUUID(),code=await shortGiftCode('TA',giftId),hash=await giftCodeHash(code);
  const {data:gift,error:ge}=await db.from('ta_gift_cards').insert({id:giftId,code_hash:hash,course_slug:slug,created_by:user.id,recipient_email:email||null,gift_message:message||null,mode}).select('id,created_at,expires_at').single();
  if(ge)return reply({error:'gift_creation_failed'},500);
  const giftUrl=baseUrl+'/prezent?code='+encodeURIComponent(code);
  let delivered:{sent:boolean;reason?:string}={sent:false,reason:'share_link'};
  if(email){
   try{
    const content=await courseGiftMailContent([{...gift,code,course_title:c.title_pl,gift_message:message,recipient_email:email,is_demo:false}]);
    delivered=await sendViaResend(email,content.subject,content.html,content.attachments,content.text,'trenerki-free-gift-pdf-v2-'+gift.id);
    if(delivered.sent)await db.from('ta_gift_cards').update({recipient_email_sent_at:new Date().toISOString()}).eq('id',gift.id).eq('created_by',user.id);
   }catch{delivered={sent:false,reason:'email_provider_unavailable'};}
  }
  return reply({ok:true,code,link:giftUrl,gift_id:gift.id,expires_at:gift.expires_at,mode,email_sent:delivered.sent,email_message:delivered.reason||null});
 }
 if(action==='redeem_gift'){
  const code=normalizeGiftCode(cleanText(payload?.code,90));
  if(!isGiftCode(code,'TA'))return reply({error:'invalid_gift_code'},400);
  if(!user.email)return reply({error:'confirmed_login_required'},401);
  const hash=await giftCodeHash(code);
  const {data,error}=await db.rpc('ta_redeem_gift',{p_hash:hash,p_user:user.id,p_verified_email:user.email});
  if(error){console.error('course_gift_redemption_failed',error.code);return reply({error:'gift_redemption_failed'},500);}
  const codes={invalid_gift_code:404,gift_used_or_expired:409,gift_for_another_email:403,course_already_active:409};
  return reply(data,data.error?(codes[data.error]||400):200);
 }
 if(action==='my_gifts'){
  const {data,error}=await db.from('ta_gift_cards').select('id,code_hash,created_by,paid_at,course_slug,mode,status,recipient_email,created_at,expires_at,redeemed_at').eq('created_by',user.id).neq('status','pending').order('created_at',{ascending:false}).limit(50);
  if(error)return reply({error:'gifts_unavailable'},503);
  return reply({gifts:await printableGifts(data||[],user.id)});
 }
 if(action==='admin_dashboard'){
  if(!isAdmin)return reply({error:'admin_only'},403);
  const [users,orders,gifts,documents,courses,enrollments]=await Promise.all([
   db.auth.admin.listUsers({page:1,perPage:100}),
   db.from('ta_demo_orders').select('id,user_id,course_slug,list_price_grosze,actual_paid_grosze,source,created_at,expires_at').order('created_at',{ascending:false}).limit(40),
   db.from('ta_gift_cards').select('id,code_hash,created_by,paid_at,course_slug,mode,status,recipient_email,created_at,expires_at,redeemed_at').order('created_at',{ascending:false}).limit(40),
   db.from('ta_invoice_drafts').select('id,user_id,course_slug,recipient_email,amount_grosze,doc_status,created_at,sent_at').order('created_at',{ascending:false}).limit(40),
   db.from('ta_courses').select('slug',{count:'exact',head:true}).eq('published',true),
   db.from('ta_enrollments').select('id',{count:'exact',head:true}).in('status',['active','demo'])
  ]);
  if(users.error||orders.error||gifts.error||documents.error)return reply({error:'admin_data_unavailable'},503);
  return reply({is_admin:true,counts:{users:(users.data as any)?.total??users.data?.users?.length??0,courses:courses.count??0,active_or_demo_access:enrollments.count??0,demo_orders:orders.data?.length??0,gift_codes:gifts.data?.length??0},users:(users.data?.users||[]).map(u=>({id:u.id,email:u.email,created_at:u.created_at,last_sign_in_at:u.last_sign_in_at,confirmed:!!u.email_confirmed_at})),orders:orders.data||[],gifts:await printableGifts(gifts.data||[],user.id),invoice_drafts:documents.data||[],money_received:0});
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
