import {courseGiftMailContent} from '../_shared/gift-card-mail.ts';
import {createClient} from 'npm:@supabase/supabase-js@2.86.0';
const cors={'access-control-allow-origin':'*','access-control-allow-methods':'POST,OPTIONS','access-control-allow-headers':'authorization,apikey,content-type,x-client-info','content-type':'application/json','cache-control':'no-store'};
const send=(x:any,status=200)=>new Response(JSON.stringify(x),{status,headers:cors});
const validMail=(s:string)=>/^[^@\s]{1,70}@[^@\s]{1,110}\.[^@\s]{2,20}$/.test(s);
function voucherCode(){
 const x=new Uint8Array(16);crypto.getRandomValues(x);
 return 'TA-'+Array.from(x,b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
}
async function codeHash(code:string){
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code));
 return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}
const esc=(s:string)=>s.replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]||ch));
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='POST')return send({error:'method_not_allowed'},405);
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),role=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!anon||!role)return send({error:'service_unavailable'},503);
 const bearer=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!bearer)return send({error:'login_required'},401);
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(bearer);
 if(authError||!user?.email_confirmed_at||!user.email)return send({error:'login_required'},401);
 const email=user.email.toLowerCase().trim(),db=createClient(url,role,{auth:{persistSession:false,autoRefreshToken:false}});
 let body:any;try{body=await request.json()}catch{return send({error:'invalid_json'},400)}
 if(body?.action==='dashboard'){
  const {data:bundles,error:be}=await db.from('ta_company_bundles')
   .select('id,company_name,created_at').eq('manager_email',email).order('created_at',{ascending:false});
  if(be)return send({error:'dashboard_unavailable'},503);
  const ids=(bundles||[]).map(x=>x.id);
  if(!ids.length)return send({ok:true,authorized:false,bundles:[],seats:[]});
  const {data:seats,error:se}=await db.from('ta_company_seats')
   .select('id,bundle_id,course_slug,state,assigned_email,assigned_at,email_sent_at,gift_card_id')
   .in('bundle_id',ids).order('created_at',{ascending:false});
  if(se)return send({error:'dashboard_unavailable'},503);
  const slugs=[...new Set((seats||[]).map(x=>x.course_slug))];
  const {data:courses,error:ce}=await db.from('ta_courses').select('slug,title_pl').in('slug',slugs);
  if(ce)return send({error:'dashboard_unavailable'},503);
  const titles=new Map((courses||[]).map(x=>[x.slug,x.title_pl]));
  const giftIds=(seats||[]).filter(x=>x.gift_card_id).map(x=>x.gift_card_id);
  let redemption=new Map<string,string>();
  if(giftIds.length){
   const {data:giftRows,error:ge}=await db.from('ta_gift_cards').select('id,status,redeemed_at').in('id',giftIds);
   if(ge)return send({error:'dashboard_unavailable'},503);
   redemption=new Map((giftRows||[]).map(x=>[x.id,x.status]));
  }
  return send({ok:true,authorized:true,bundles:bundles||[],
   seats:(seats||[]).map(x=>({
    id:x.id,bundle_id:x.bundle_id,course_slug:x.course_slug,title_pl:titles.get(x.course_slug)||x.course_slug,
    state:x.state,assigned_email:x.assigned_email,assigned_at:x.assigned_at,email_sent_at:x.email_sent_at,
    redeemed:x.gift_card_id?redemption.get(x.gift_card_id)==='redeemed':false
   }))});
 }
 if(body?.action==='assign'){
  const seatId=String(body?.seat_id||'');
  const recipient=String(body?.employee_email||'').trim().toLowerCase();
  if(!/^[a-f0-9-]{36}$/i.test(seatId)||!validMail(recipient))return send({error:'invalid_recipient'},400);
  const code=voucherCode();
  const {data:assigned,error:assignError}=await db.rpc('ta_company_assign',{
   p_seat:seatId,p_manager:user.id,p_employee:recipient,p_hash:await codeHash(code)
  });
  if(assignError){console.error('company_assignment_error',assignError.code);return send({error:'assignment_unavailable'},503)}
  if(assigned?.error)return send({error:assigned.error},assigned.error==='already_assigned'?409:assigned.error==='forbidden'?403:422);
  if(assigned?.ok!==true)return send({error:'assignment_unavailable'},503);
  const link='https://trenerki.com/prezent?code='+code;
  let emailSent=false;
  const api=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('RESEND_FROM_EMAIL');
  if(api&&from){
   try{
    const {data:gift,error:giftError}=await db.from('ta_gift_cards').select('id,recipient_email,gift_message,created_at,expires_at').eq('id',assigned.gift_card_id).single();
    if(giftError||!gift)throw new Error('gift_lookup_failed');
    const content=await courseGiftMailContent([{...gift,code,course_title:assigned.title_pl||assigned.course_slug}]);
    const resp=await fetch('https://api.resend.com/emails',{method:'POST',
     headers:{authorization:'Bearer '+api,'content-type':'application/json','Idempotency-Key':'trenerki-company-pdf-v1-'+assigned.gift_card_id+'-'+code},
     body:JSON.stringify({from,to:[recipient],reply_to:'trenerki.pl@gmail.com',...content}),
     signal:AbortSignal.timeout(12000)});
    emailSent=resp.ok;
    if(emailSent)await db.from('ta_company_seats').update({email_sent_at:new Date().toISOString()}).eq('id',seatId).eq('state','assigned');
   }catch{emailSent=false}
  }
  return send({ok:true,gift_id:assigned.gift_card_id,course_slug:assigned.course_slug,title_pl:assigned.title_pl,recipient,code,link,email_sent:emailSent});
 }
 return send({error:'unknown_action'},400);
});
