import {createClient} from 'npm:@supabase/supabase-js@2.86.0';
const HEADERS={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'authorization, x-client-info, apikey, content-type','access-control-allow-methods':'POST, OPTIONS'};
const send=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:HEADERS});
const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Warsaw',year:'numeric',month:'2-digit',day:'2-digit'});
function day(x:string|Date){const parts=fmt.formatToParts(new Date(x));const val=(k:string)=>parts.find(p=>p.type===k)?.value||'';return val('year')+'-'+val('month')+'-'+val('day');}
function bucket(x:string|Date,interval:'day'|'month'|'year'){const d=day(x);return interval==='day'?d:interval==='month'?d.slice(0,7):d.slice(0,4);}
function keys(interval:'day'|'month'|'year',n:number){
 const result:string[]=[];
 for(let i=n-1;i>=0;i--){
  const now=new Date(),d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),15,12));
  if(interval==='day')d.setUTCDate(now.getUTCDate()-i);
  if(interval==='month')d.setUTCMonth(d.getUTCMonth()-i);
  if(interval==='year')d.setUTCFullYear(d.getUTCFullYear()-i);
  result.push(bucket(d,interval));
 }
 return [...new Set(result)];
}
type Payment={user_id:string;course_slug:string;amount_grosze:number;status:string;purchased_at:string;stripe_checkout_session_id:string;is_gift?:boolean};
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return send({ok:true});
 if(req.method!=='POST')return send({error:'method_not_allowed'},405);
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),role=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!anon||!role)return send({error:'server_not_ready'},503);
 const authorization=req.headers.get('authorization')||'';
 if(!/^Bearer\s+\S+$/i.test(authorization))return send({error:'login_required'},401);
 const client=createClient(url,anon,{auth:{persistSession:false}});
 const {data:{user},error:authError}=await client.auth.getUser(authorization.replace(/^Bearer\s+/i,''));
 if(authError||!user||!user.email_confirmed_at)return send({error:'login_required'},401);
 const admin=createClient(url,role,{auth:{persistSession:false}});
 const {data:privileges,error:privilegesError}=await admin.from('ta_admins').select('role').eq('user_id',user.id).maybeSingle();
 if(privilegesError)return send({error:'database_unavailable'},503);
 if(!privileges||!['owner','admin'].includes(privileges.role))return send({error:'admin_only'},403);
 try{
  const users:{created_at:string}[]=[];
  for(let p=1;p<=50;p++){
   const {data,error}=await admin.auth.admin.listUsers({page:p,perPage:1000});
   if(error)throw error;
   const values=data.users||[];
   for(const u of values)users.push({created_at:u.created_at});
   if(values.length<1000)break;
   if(p===50)throw new Error('user_page_limit');
  }
  const orders:Payment[]=[];
  for(let start=0;start<50000;start+=1000){
   const {data,error}=await admin.from('ta_enrollments')
    .select('user_id,course_slug,amount_grosze,status,purchased_at,stripe_checkout_session_id')
    .gt('amount_grosze',0).range(start,start+999).order('purchased_at',{ascending:false});
   if(error)throw error;
   for(const o of data||[])if(typeof o.stripe_checkout_session_id==='string'&&o.stripe_checkout_session_id.startsWith('cs_')&&['active','expired'].includes(o.status))orders.push(o as Payment);
   if((data||[]).length<1000)break;
   if(start===49000)throw new Error('order_page_limit');
  }
  for(let start=0;start<50000;start+=1000){
   const {data,error}=await admin.from('ta_gift_cards')
    .select('created_by,course_slug,amount_grosze,status,paid_at,stripe_checkout_session_id')
    .eq('mode','stripe').in('status',['issued','redeemed']).not('paid_at','is',null)
    .order('paid_at',{ascending:false}).order('id').range(start,start+999);
   if(error)throw error;
   for(const gift of data||[])orders.push({
    user_id:gift.created_by,course_slug:gift.course_slug,amount_grosze:gift.amount_grosze,
    status:gift.status,purchased_at:gift.paid_at,stripe_checkout_session_id:gift.stripe_checkout_session_id,is_gift:true
   });
   if((data||[]).length<1000)break;
   if(start===49000)throw new Error('gift_page_limit');
  }
  orders.sort((a,b)=>b.purchased_at.localeCompare(a.purchased_at));
  const stats=(interval:'day'|'month'|'year',n:number)=>{
   const labels=keys(interval,n);
   return labels.map(label=>{
    const us=users.filter(u=>bucket(u.created_at,interval)===label);
    const os=orders.filter(o=>bucket(o.purchased_at,interval)===label);
    return {period:label,new_users:us.length,purchases:os.filter(o=>!o.is_gift).length,gifts:os.filter(o=>o.is_gift).length,revenue_grosze:os.reduce((sum,o)=>sum+o.amount_grosze,0),unique_buyers:new Set(os.map(o=>o.user_id)).size};
   });
  };
  const today=day(new Date()),month=today.slice(0,7),year=today.slice(0,4);
  const summarize=(interval:'day'|'month'|'year',label:string)=>{
   const us=users.filter(u=>bucket(u.created_at,interval)===label),os=orders.filter(o=>bucket(o.purchased_at,interval)===label);
   return {new_users:us.length,purchases:os.filter(o=>!o.is_gift).length,gifts:os.filter(o=>o.is_gift).length,revenue_grosze:os.reduce((sum,o)=>sum+o.amount_grosze,0),unique_buyers:new Set(os.map(o=>o.user_id)).size};
  };
  return send({ok:true,timezone:'Europe/Warsaw',
   totals:{users:users.length,purchases:orders.filter(o=>!o.is_gift).length,gifts:orders.filter(o=>o.is_gift).length,revenue_grosze:orders.reduce((v,o)=>v+o.amount_grosze,0)},
   today:summarize('day',today),current_month:summarize('month',month),current_year:summarize('year',year),
   daily:stats('day',30),monthly:stats('month',12),yearly:stats('year',5),
   stripe_configuration:{secret_key_present:!!Deno.env.get('STRIPE_SECRET_KEY'),webhook_secret_present:!!Deno.env.get('STRIPE_WEBHOOK_SECRET'),resend_configured:!!Deno.env.get('RESEND_API_KEY')&&!!Deno.env.get('RESEND_FROM_EMAIL'),sales_enabled:Deno.env.get('TA_SALES_ENABLED')==='true'},
   orders:orders.slice(0,100).map(o=>({course_slug:o.course_slug,amount_grosze:o.amount_grosze,purchased_at:o.purchased_at,status:o.status,is_gift:!!o.is_gift}))});
 }catch(e){console.error('ta-admin-analytics failed',e instanceof Error?e.message:'unknown');return send({error:'analytics_unavailable'},503);}
});
