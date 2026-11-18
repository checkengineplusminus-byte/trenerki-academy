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
 let requestBody:any={};try{const raw=await req.text();requestBody=raw.trim()?JSON.parse(raw):{};}catch{return send({error:'invalid_json'},400);}
 if(requestBody?.action==='accounting_document_save'){
  if(privileges.role!=='owner')return send({error:'owner_only'},403);
  const source=String(requestBody.stripe_source||'');
  const type=String(requestBody.document_type||'pending');
  const status=String(requestBody.document_status||'pending');
  const treatment=String(requestBody.tax_treatment||'review');
  const doc=String(requestBody.document_number||'').trim();
  const ksef=String(requestBody.ksef_number||'').trim();
  const notes=String(requestBody.notes||'').trim();
  if(!/^(ch|py|pi|cs)_[A-Za-z0-9_]{6,120}$/.test(source)||
     !['pending','b2c_register','b2c_invoice','b2b_invoice','refund_correction','not_applicable'].includes(type)||
     !['pending','prepared','issued','reconciled','review'].includes(status)||
     !['review','pl_23','exempt','reverse_charge','oss','outside_scope'].includes(treatment)||
     doc.length>120||ksef.length>150||notes.length>500||
     (['issued','reconciled'].includes(status)&&!doc&&type!=='b2c_register'))
   return send({error:'invalid_document'},400);
  // Verify the Stripe source is genuinely present in the merchant account, not a client-created key.
  const stripe=Deno.env.get('STRIPE_SECRET_KEY');
  if(!stripe||!/^sk_live_/.test(stripe))return send({error:'stripe_reporting_unavailable'},503);
  const resource=source.startsWith('ch_')?'charges':source.startsWith('py_')?'payment_intents':source.startsWith('pi_')?'payment_intents':null;
  if(!resource)return send({error:'unsupported_stripe_source'},400);
  const lookup=await fetch('https://api.stripe.com/v1/'+resource+'/'+encodeURIComponent(source),{headers:{Authorization:'Bearer '+stripe},signal:AbortSignal.timeout(12000)});
  if(!lookup.ok)return send({error:'stripe_source_not_found'},400);
  const verified=await lookup.json();
  if(source.startsWith('ch_')&&verified.paid!==true)return send({error:'unpaid_source'},409);
  const payload={stripe_source:source,document_type:type,document_status:status,tax_treatment:treatment,
   document_number:doc||null,ksef_number:ksef||null,notes:notes||null,
   processed_by:user.id,processed_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  const {data:stored,error:saveErr}=await admin.from('ta_accounting_documents').upsert(payload,{onConflict:'stripe_source'})
   .select('stripe_source,document_type,document_status,document_number,ksef_number,tax_treatment,notes').single();
  if(saveErr)return send({error:saveErr.code==='23505'?'document_already_assigned':'document_save_failed'},409);
  return send({ok:true,document:stored});
 }
 if(requestBody?.action==='accounting_export'){
  const period=String(requestBody.period||'');
  if(!/^20\d{2}(?:-(?:0[1-9]|1[0-2]))?$/.test(period))return send({error:'invalid_period'},400);
  const stripe=Deno.env.get('STRIPE_SECRET_KEY');
  if(!stripe||!/^sk_live_/.test(stripe))return send({error:'stripe_reporting_unavailable'},503);
  const start=period.length===7?period+'-01':period+'-01-01';
  const year=Number(period.slice(0,4)),month=period.length===7?Number(period.slice(5)):1;
  const end=period.length===7?(month===12?String(year+1)+'-01-01':String(year)+'-'+String(month+1).padStart(2,'0')+'-01'):String(year+1)+'-01-01';
  // Expand the search window by one day to keep Warsaw-local dates accurate across DST.
  const from=Math.floor(Date.parse(start+'T00:00:00Z')/1000)-86400;
  const to=Math.floor(Date.parse(end+'T00:00:00Z')/1000)+86400;
  const raw:any[]=[];let after='';
  for(let page=0;page<100;page++){
   const query=new URLSearchParams({'limit':'100','created[gte]':String(from),'created[lt]':String(to)});
   if(after)query.set('starting_after',after);
   const response=await fetch('https://api.stripe.com/v1/balance_transactions?'+query.toString(),{
    headers:{Authorization:'Bearer '+stripe},signal:AbortSignal.timeout(15000)
   });
   if(!response.ok)return send({error:'stripe_reporting_unavailable'},502);
   const body=await response.json();
   if(!Array.isArray(body.data))return send({error:'stripe_reporting_unavailable'},502);
   raw.push(...body.data);if(!body.has_more)break;
   after=String(body.data.at(-1)?.id||'');
   if(!after||page===99)return send({error:'report_too_large'},503);
  }
  const warsaw=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Warsaw',year:'numeric',month:'2-digit',day:'2-digit'});
  const entries=raw.filter(t=>{const local=warsaw.format(new Date(t.created*1000));return local>=start&&local<end})
   .map(t=>({id:String(t.id),date:warsaw.format(new Date(t.created*1000)),source:String(t.source||''),
    category:String(t.reporting_category||t.type||'other'),currency:String(t.currency||'').toUpperCase(),
    gross_grosze:Number(t.amount)||0,fee_grosze:Number(t.fee)||0,net_grosze:Number(t.net)||0}))
   .sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
  const chargeSources=entries.filter(x=>x.source.startsWith('ch_')).map(x=>x.source);
  let documents:any[]=[];
  if(chargeSources.length){
   // No client access to this table: the owner-only function looks up matching references.
   const unique=[...new Set(chargeSources)];
   for(let i=0;i<unique.length;i+=200){
    const {data,error}=await admin.from('ta_accounting_documents')
      .select('stripe_source,document_type,document_status,document_number,ksef_number,tax_treatment,notes')
      .in('stripe_source',unique.slice(i,i+200));
    if(error)return send({error:'document_register_unavailable'},503);
    documents.push(...(data||[]));
   }
  }
  const documentMap=new Map(documents.map(d=>[d.stripe_source,d]));
  const summary:Record<string,{currency:string,category:string,count:number,gross_grosze:number,fee_grosze:number,net_grosze:number}>={};
  for(const t of entries){
   const key=t.currency+'/'+t.category;
   const v=summary[key]||{currency:t.currency,category:t.category,count:0,gross_grosze:0,fee_grosze:0,net_grosze:0};
   v.count++;v.gross_grosze+=t.gross_grosze;v.fee_grosze+=t.fee_grosze;v.net_grosze+=t.net_grosze;summary[key]=v;
  }
  return send({ok:true,period,time_zone:'Europe/Warsaw',rows:entries.map(x=>({...x,document:documentMap.get(x.source)||null})),summary:Object.values(summary),
   note:'Zestawienie techniczne Stripe: nie jest fakturą VAT, paragonem ani gotowym dokumentem księgowym. Payout nie jest kolejnym przychodem; fee to koszt Stripe. Sprawdź faktury, zwroty, kursy walut i kwalifikację podatkową.'});
 }
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
   for(const o of data||[])if(typeof o.stripe_checkout_session_id==='string'&&o.stripe_checkout_session_id.startsWith('cs_live_')&&['active','expired'].includes(o.status))orders.push(o as Payment);
   if((data||[]).length<1000)break;
   if(start===49000)throw new Error('order_page_limit');
  }
  for(let start=0;start<50000;start+=1000){
   const {data,error}=await admin.from('ta_gift_cards')
    .select('created_by,course_slug,amount_grosze,status,paid_at,stripe_checkout_session_id')
    .eq('mode','stripe').in('status',['issued','redeemed']).not('paid_at','is',null)
    .order('paid_at',{ascending:false}).order('id').range(start,start+999);
   if(error)throw error;
   for(const gift of data||[])if(typeof gift.stripe_checkout_session_id==='string'&&gift.stripe_checkout_session_id.startsWith('cs_live_')&&gift.amount_grosze>0)orders.push({
    user_id:gift.created_by,course_slug:gift.course_slug,amount_grosze:gift.amount_grosze,
    status:gift.status,purchased_at:gift.paid_at,stripe_checkout_session_id:gift.stripe_checkout_session_id,is_gift:true
   });
   if((data||[]).length<1000)break;
   if(start===49000)throw new Error('gift_page_limit');
  }
  // Amount-based gift cards are live Stripe sales too, even before redemption.
  for(let start=0;start<50000;start+=1000){
   const {data,error}=await admin.from('ta_credit_vouchers')
    .select('created_by,amount_grosze,status,paid_at,stripe_checkout_session_id')
    .in('status',['issued','redeemed']).not('paid_at','is',null)
    .order('paid_at',{ascending:false}).range(start,start+999);
   if(error)throw error;
   for(const gift of data||[])if(typeof gift.stripe_checkout_session_id==='string'&&gift.stripe_checkout_session_id.startsWith('cs_live_')){
    orders.push({user_id:gift.created_by,course_slug:'Karta na kwotę',amount_grosze:gift.amount_grosze,
     status:gift.status,purchased_at:gift.paid_at,stripe_checkout_session_id:gift.stripe_checkout_session_id,is_gift:true});
   }
   if((data||[]).length<1000)break;
   if(start===49000)throw new Error('credit_gift_page_limit');
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
