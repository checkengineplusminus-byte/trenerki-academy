import {createClient} from 'npm:@supabase/supabase-js@2.86.0';
import {buildGiftCardPdf,buildCourseGiftCardPdf,giftCardFilename,courseGiftCardFilename,bytesBase64} from '../_shared/gift-card-pdf.ts';

const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'authorization,apikey,content-type,x-client-info','access-control-allow-methods':'POST,OPTIONS','cache-control':'no-store'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const hash=async(code:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code))),b=>b.toString(16).padStart(2,'0')).join('');

Deno.serve(async req=>{
 if(req.method==='OPTIONS')return reply({ok:true});
 if(req.method!=='POST')return reply({error:'method_not_allowed'},405);
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),role=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!anon||!role)return reply({error:'service_not_ready'},503);
 const bearer=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!bearer)return reply({error:'login_required'},401);
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(bearer);
 if(authError||!user?.email_confirmed_at||!user.email)return reply({error:'confirmed_login_required'},401);
 let body:any;try{body=await req.json();}catch{return reply({error:'invalid_body'},400);}
 if(body?.action!=='pdf')return reply({error:'unknown_action'},400);
 let code=String(body?.code||'').trim().toUpperCase().replace(/\s/g,'');
 const byId=!code&&uuid(body?.gift_id);
 if(byId)code='TA-'+body.gift_id.replaceAll('-','').toUpperCase();
 if(!/^T[AW]-[0-9A-F]{32}$/.test(code))return reply({error:'invalid_gift_code'},400);
 const db=createClient(url,role,{auth:{persistSession:false,autoRefreshToken:false}});
 const email=user.email.toLowerCase();
 try{
  if(code.startsWith('TW-')){
   const {data:card,error}=await db.from('ta_credit_vouchers').select('id,created_by,recipient_email,gift_message,amount_grosze,status,is_promo,transferable,created_at,expires_at,paid_at').eq('code_hash',await hash(code)).maybeSingle();
   if(error)return reply({error:'pdf_not_ready'},503);
   if(!card)return reply({error:'card_not_found'},404);
   if(card.created_by!==user.id&&card.recipient_email.toLowerCase()!==email&&!(card.is_promo&&card.transferable))return reply({error:'gift_for_another_email'},403);
   if(card.status!=='issued'||(!card.is_promo&&!card.paid_at)||new Date(card.expires_at).getTime()<=Date.now())return reply({error:'card_inactive'},409);
   const printable={...card,code};
   return reply({ok:true,pdf_base64:bytesBase64(await buildGiftCardPdf(printable)),filename:giftCardFilename(printable)});
  }
  const {data:card,error}=await db.from('ta_gift_cards').select('id,code_hash,course_slug,created_by,recipient_email,gift_message,mode,status,created_at,expires_at,paid_at').eq('code_hash',await hash(code)).maybeSingle();
  if(error)return reply({error:'pdf_not_ready'},503);
  if(!card)return reply({error:'card_not_found'},404);
  // ID-only lookup is restricted to the creator. A full unpredictable gift code
  // is required for the recipient or the holder of a transferable gift.
  let allowed=byId?card.created_by===user.id:card.created_by===user.id||!card.recipient_email||card.recipient_email.toLowerCase()===email;
  // The firm's manager assigns a seat, while the card's creator remains the
  // platform administrator. Verify that relationship before allowing its PDF.
  if(!allowed&&!byId){
   const {data:seat,error:seatError}=await db.from('ta_company_seats').select('bundle_id').eq('gift_card_id',card.id).maybeSingle();
   if(!seatError&&seat){
    const {data:bundle,error:bundleError}=await db.from('ta_company_bundles').select('id').eq('id',seat.bundle_id).eq('manager_email',email).maybeSingle();
    allowed=!bundleError&&!!bundle;
   }
  }
  if(!allowed)return reply({error:'gift_for_another_email'},403);
  if(card.status!=='issued'||(card.mode==='stripe'&&!card.paid_at)||card.mode==='demo'||new Date(card.expires_at).getTime()<=Date.now())return reply({error:'card_inactive'},409);
  const {data:course,error:courseError}=await db.from('ta_courses').select('title_pl').eq('slug',card.course_slug).maybeSingle();
  if(courseError||!course)return reply({error:'pdf_not_ready'},503);
  const printable={...card,code,course_title:course.title_pl,is_demo:false};
  return reply({ok:true,pdf_base64:bytesBase64(await buildCourseGiftCardPdf(printable)),filename:courseGiftCardFilename(printable)});
 }catch{return reply({error:'pdf_not_ready'},503);}
});
