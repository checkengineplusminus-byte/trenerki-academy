import {createClient} from 'npm:@supabase/supabase-js@2.86.0';
const origins=new Set(['https://trenerki.com','https://www.trenerki.com','https://trenerki-academy.expo.app']);
const headers=(origin:string)=>({
 ...(origins.has(origin)?{'access-control-allow-origin':origin}:{}),
 'access-control-allow-headers':'authorization,apikey,content-type,x-client-info',
 'access-control-allow-methods':'POST,OPTIONS','content-type':'application/json','cache-control':'no-store','vary':'Origin'
});
const cut=(x:unknown,n=200)=>typeof x==='string'?x.trim().slice(0,n):'';
const reply=(origin:string,obj:unknown,status=200)=>new Response(JSON.stringify(obj),{status,headers:headers(origin)});
const slug=(s:string)=>/^TA[A-F0-9]{12}$/.test(s);
const hex=()=>Array.from(crypto.getRandomValues(new Uint8Array(6))).map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();
const safeMessage=(x:unknown)=>typeof x==='string'?x.slice(0,60):'';
async function stripeRequest(secret:string,path:string,params?:URLSearchParams){
 const result=await fetch('https://api.stripe.com/v1/'+path,{
  method:params?'POST':'GET',headers:{authorization:'Bearer '+secret,...(params?{'content-type':'application/x-www-form-urlencoded'}:{})},...(params?{body:params}:{})
 });
 const body=await result.json().catch(()=>({}));
 if(!result.ok)return {ok:false,error:body?.error?.code||'stripe_unavailable',status:result.status};
 return {ok:true,data:body};
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(origin)});
 if(req.method!=='POST')return reply(origin,{error:'method_not_allowed'},405);
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!anon||!secret)return reply(origin,{error:'service_unavailable'},503);
 const bearer=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!bearer)return reply(origin,{error:'login_required'},401);
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:ae}=await auth.auth.getUser(bearer);
 if(ae||!user?.id||!user.email||!user.email_confirmed_at)return reply(origin,{error:'confirmed_login_required'},401);
 let input:any;try{input=await req.json()}catch{return reply(origin,{error:'invalid_json'},400)}
 const action=cut(input?.action,30);
 if(!['register','status','onboard'].includes(action))return reply(origin,{error:'invalid_action'},400);
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:cfg,error:cfgError}=await db.from('ta_affiliate_config').select('*').eq('singleton',true).single();
 if(cfgError||!cfg)return reply(origin,{error:'config_unavailable'},503);
 const {data:old,error:pe}=await db.from('ta_affiliate_partners').select('*').eq('user_id',user.id).maybeSingle();
 if(pe)return reply(origin,{error:'partner_unavailable'},503);
 if(action==='register'){
  if(old)return reply(origin,{error:'already_registered'},409);
  if(!cfg.program_enabled)return reply(origin,{error:'registrations_paused'},403);
  const kind=cut(input.partner_type,20),name=cut(input.legal_name,160),nip=cut(input.company_tax_id,10);
  if(!['individual','company'].includes(kind)||name.length<3||
    input.terms_accepted!==true||input.privacy_acknowledged!==true||
    input.adult_confirmed!==true||input.tax_residency!=='PL'||
    input.terms_version!==cfg.terms_version||
    (kind==='company'&&!/^\d{10}$/.test(nip)))
   return reply(origin,{error:'invalid_registration'},400);
  let partner:any=null;
  for(let i=0;i<4;i++){
   const {data,error}=await db.from('ta_affiliate_partners').insert({
    user_id:user.id,email:user.email.toLowerCase(),code:'TA'+hex(),partner_type:kind,legal_name:name,company_tax_id:kind==='company'?nip:null,
    tax_residency:'PL',adult_confirmed:true,terms_version:cfg.terms_version,
    status:'active'
   }).select('id,code,short_id').single();
   if(!error){partner=data;break}
   if(error.code!=='23505')return reply(origin,{error:'registration_unavailable'},503);
  }
  if(!partner)return reply(origin,{error:'registration_unavailable'},503);
  await db.from('ta_affiliate_audit').insert({partner_id:partner.id,actor_user_id:user.id,event_type:'partner_registered',info:{terms_version:cfg.terms_version,partner_type:kind}});
  return reply(origin,{ok:true,code:partner.code,short_id:partner.short_id,registration:true});
 }
 if(!old)return reply(origin,{error:'not_registered'},404);
 // Only verified Auth users can update their own partner email through this function.
 const confirmedEmail=user.email.toLowerCase();
 if(old.email!==confirmedEmail){
  const {error:syncError}=await db.from('ta_affiliate_partners')
    .update({email:confirmedEmail,updated_at:new Date().toISOString()})
    .eq('id',old.id);
  if(syncError)return reply(origin,{error:'partner_email_sync_failed'},503);
  old.email=confirmedEmail;
 }
 if(action==='onboard'){
  if(old.partner_type!=='individual')return reply(origin,{error:'company_uses_invoice'},409);
  if(old.status!=='active')return reply(origin,{error:'partner_inactive'},403);
  if(!cfg.stripe_onboarding_enabled)return reply(origin,{error:'onboarding_pending'},409);
  const stripe=Deno.env.get('STRIPE_SECRET_KEY');
  if(!stripe||!/^sk_live_/.test(stripe))return reply(origin,{error:'stripe_connect_not_configured'},503);
  let acct=old.stripe_account_id;
  if(!acct){
   const p=new URLSearchParams({
    type:'express',country:'PL',email:user.email,
    business_type:old.partner_type==='individual'?'individual':'company',
    'capabilities[transfers][requested]':'true',
    'metadata[ta_affiliate_partner_id]':old.id,
    'metadata[program]':'TRENERKI_10_PERCENT'
   });
   const result=await stripeRequest(stripe,'accounts',p);
   if(!result.ok||!/^acct_[a-zA-Z0-9]+$/.test(result.data?.id||''))
    return reply(origin,{error:'stripe_connect_not_enabled',detail:'Sprawdź aktywację Connect w panelu Stripe.'},409);
   acct=result.data.id;
   const {error}=await db.from('ta_affiliate_partners').update({stripe_account_id:acct,updated_at:new Date().toISOString()}).eq('id',old.id).is('stripe_account_id',null);
   if(error)return reply(origin,{error:'connect_account_save_failed'},503);
  }
  const p=new URLSearchParams({account:acct,
    type:'account_onboarding',
    refresh_url:'https://trenerki.com/partner?connect=refresh',
    return_url:'https://trenerki.com/partner?connect=return'
  });
  const link=await stripeRequest(stripe,'account_links',p);
  if(!link.ok||typeof link.data?.url!=='string'||!link.data.url.startsWith('https://connect.stripe.com/'))
   return reply(origin,{error:'onboarding_link_unavailable'},503);
  return reply(origin,{ok:true,url:link.data.url});
 }
 // Status is a summary of the caller's *own* commissions, never customer identities.
 if(old.stripe_account_id){
  const stripe=Deno.env.get('STRIPE_SECRET_KEY');
  if(stripe&&/^sk_live_/.test(stripe)){
   const state=await stripeRequest(stripe,'accounts/'+encodeURIComponent(old.stripe_account_id));
   if(state.ok){
    const next={
     stripe_details_submitted:!!state.data.details_submitted,
     stripe_payouts_enabled:!!state.data.payouts_enabled,
     stripe_transfers_enabled:state.data.capabilities?.transfers==='active',
     updated_at:new Date().toISOString()
    };
    await db.from('ta_affiliate_partners').update(next).eq('id',old.id);
    Object.assign(old,next);
   }
  }
 }
 const [commissions,payouts,aggregates]=await Promise.all([
  db.from('ta_affiliate_commissions').select('id,course_slug,base_amount_grosze,commission_grosze,status,purchased_at,eligible_at').eq('partner_id',old.id).order('purchased_at',{ascending:false}).limit(200),
  db.from('ta_affiliate_payouts').select('id,payout_month,amount_grosze,status,sent_at').eq('partner_id',old.id).order('payout_month',{ascending:false}).limit(36),
  db.rpc('ta_affiliate_partner_totals',{p_partner:old.id})
 ]);
 if(commissions.error||payouts.error||aggregates.error)return reply(origin,{error:'statement_unavailable'},503);
 const rows=commissions.data||[],pay=payouts.data||[];
 return reply(origin,{ok:true,
  profile:{code:old.code,short_id:old.short_id,partner_type:old.partner_type,legal_name:old.legal_name,status:old.status,
   stripe_connected:!!old.stripe_account_id,stripe_details_submitted:old.stripe_details_submitted,
   stripe_payouts_enabled:old.stripe_payouts_enabled,stripe_transfers_enabled:old.stripe_transfers_enabled,
   payout_tax_status:old.payout_tax_status,terms_version:old.terms_version},
  policy:{commission_percent:cfg.commission_percent,min_payout_grosze:cfg.payout_min_grosze,
   hold_days:cfg.hold_days,payouts_live:cfg.payout_enabled&&cfg.tax_review_approved,terms_version:cfg.terms_version},
  totals:aggregates.data||{pending_grosze:0,approved_grosze:0,in_process_grosze:0,transferred_grosze:0,total_sales:0},
  transactions:rows.map((r:any)=>({course_slug:r.course_slug,amount_grosze:r.commission_grosze,
   status:r.status,purchased_at:r.purchased_at,eligible_at:r.eligible_at})),
  payouts:pay
 });
});
