import {createClient} from 'npm:@supabase/supabase-js@2.86.0';

// Public referral lookup. Intentionally returns only the public referral code,
// never partner identity, email, tax records, balance, payout status or customer details.
const allowed=new Set(['https://trenerki.com','https://www.trenerki.com','https://trenerki-academy.expo.app']);
const headers=(origin:string)=>({
 ...(allowed.has(origin)?{'access-control-allow-origin':origin}:{}),
 'access-control-allow-methods':'GET,OPTIONS',
 'access-control-allow-headers':'content-type,apikey,authorization',
 'content-type':'application/json; charset=utf-8',
 'cache-control':'no-store',
 'vary':'Origin'
});
const respond=(origin:string,data:unknown,status=200)=>
 new Response(JSON.stringify(data),{status,headers:headers(origin)});

Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(origin)});
 if(req.method!=='GET')return respond(origin,{error:'method_not_allowed'},405);
 const url=new URL(req.url());
 const text=(url.searchParams.get('id')||'').trim();
 if(!/^[1-9][0-9]{0,8}$/.test(text)||Number(text)>999999999)
  return respond(origin,{error:'invalid_partner_number'},400);
 const dbUrl=Deno.env.get('SUPABASE_URL'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!dbUrl||!service)return respond(origin,{error:'service_unavailable'},503);
 const db=createClient(dbUrl,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.from('ta_affiliate_partners')
  .select('code').eq('short_id',Number(text)).eq('status','active').maybeSingle();
 if(error)return respond(origin,{error:'lookup_unavailable'},503);
 if(!data?.code||!/^TA[A-F0-9]{12}$/.test(data.code))
  return respond(origin,{error:'partner_not_found'},404);
 return respond(origin,{ok:true,ref:data.code});
});
