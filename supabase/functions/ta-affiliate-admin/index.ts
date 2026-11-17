import {createClient} from 'npm:@supabase/supabase-js@2.86.0';
const origins=new Set(['https://trenerki.com','https://www.trenerki.com','https://trenerki-academy.expo.app']);
const headers=(origin:string)=>({
 ...(origins.has(origin)?{'access-control-allow-origin':origin}:{}),
 'access-control-allow-methods':'POST,OPTIONS',
 'access-control-allow-headers':'authorization,apikey,content-type,x-client-info',
 'content-type':'application/json','cache-control':'no-store','vary':'Origin'
});
const reply=(origin:string,data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:headers(origin)});
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(origin)});
 if(req.method!=='POST')return reply(origin,{error:'method_not_allowed'},405);
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),role=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!anon||!role)return reply(origin,{error:'server_unavailable'},503);
 const authHeader=req.headers.get('authorization')||'';
 const bearer=authHeader.replace(/^Bearer\s+/i,'');
 if(!bearer)return reply(origin,{error:'login_required'},401);
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authErr}=await auth.auth.getUser(bearer);
 if(authErr||!user?.id||!user.email_confirmed_at)return reply(origin,{error:'login_required'},401);
 const db=createClient(url,role,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:owner,error:roleErr}=await db.from('ta_admins').select('user_id,role').eq('user_id',user.id).eq('role','owner').maybeSingle();
 if(roleErr||!owner)return reply(origin,{error:'owner_only'},403);
 let body:any;try{body=await req.json()}catch{return reply(origin,{error:'invalid_json'},400)}
 const action=typeof body?.action==='string'?body.action:'';
 if(action==='report'){
  const [report,config]=await Promise.all([
   db.rpc('ta_affiliate_admin_report'),db.from('ta_affiliate_config').select('*').eq('singleton',true).single()
  ]);
  if(report.error||config.error)return reply(origin,{error:'report_unavailable'},503);
  return reply(origin,{ok:true,partners:report.data||[],config:{
   program_enabled:config.data.program_enabled,
   payout_enabled:config.data.payout_enabled,
   tax_review_approved:config.data.tax_review_approved,
   commission_percent:config.data.commission_percent,
   payout_min_grosze:config.data.payout_min_grosze,
   hold_days:config.data.hold_days,
   terms_version:config.data.terms_version
  }});
 }
 if(action==='monthly'){
  const month=String(body?.month||'');
  if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))return reply(origin,{error:'invalid_month'},400);
  const {data,error}=await db.rpc('ta_affiliate_monthly_report',{p_month:month+'-01'});
  if(error)return reply(origin,{error:'monthly_report_unavailable'},503);
  return reply(origin,{ok:true,month,rows:data||[]});
 }
 if(action==='suspend_partner'){
  const partnerId=String(body?.partner_id||'');
  if(!/^[0-9a-f-]{36}$/i.test(partnerId)||body?.reason?.length<10||body?.reason?.length>500)
   return reply(origin,{error:'invalid_reason'},400);
  const {data,error}=await db.from('ta_affiliate_partners').update({status:'suspended',updated_at:new Date().toISOString()})
   .eq('id',partnerId).eq('status','active').select('id').maybeSingle();
  if(error||!data)return reply(origin,{error:'cannot_suspend'},409);
  await db.from('ta_affiliate_audit').insert({partner_id:partnerId,actor_user_id:user.id,event_type:'partner_suspended',info:{reason:String(body.reason).slice(0,500)}});
  return reply(origin,{ok:true});
 }
 if(action==='mark_tax_verified'){
  const partnerId=String(body?.partner_id||'');
  const evidence=String(body?.evidence_reference||'').trim();
  // This is an owner decision that requires a real accountant's supporting reference.
  if(!/^[0-9a-f-]{36}$/i.test(partnerId)||body?.tax_reviewer_confirmed!==true||evidence.length<12||evidence.length>250)
   return reply(origin,{error:'accountant_evidence_required'},400);
  const {data,error}=await db.from('ta_affiliate_partners').update({payout_tax_status:'verified',updated_at:new Date().toISOString()})
    .eq('id',partnerId).eq('status','active').select('id').maybeSingle();
  if(error||!data)return reply(origin,{error:'partner_not_eligible'},409);
  await db.from('ta_affiliate_audit').insert({partner_id:partnerId,actor_user_id:user.id,event_type:'tax_documents_approved',info:{evidence_reference:evidence}});
  return reply(origin,{ok:true});
 }
 return reply(origin,{error:'invalid_action'},400);
});
