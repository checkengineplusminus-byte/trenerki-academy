// Execute the actual payment handler with signed fixtures and intercepted I/O.
// No Stripe requests, real payments, account writes or email deliveries occur.
import {termsVersion} from '../supabase/functions/_shared/order-confirmation.ts';
const assert=(value:unknown,message:string)=>{if(!value)throw new Error(message)};
type Handler=(request:Request)=>Response|Promise<Response>;
Deno.test('course payment callback validates, retries and reverses a synthetic purchase',async()=>{
 const originalFetch=globalThis.fetch,originalServe=Deno.serve,originalGet=Deno.env.get;
 const owner='00000000-0000-4000-a000-000000000241';
 const env:Record<string,string>={SUPABASE_URL:'https://order-fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture-role',
  STRIPE_SECRET_KEY:'sk_live_fixture',STRIPE_WEBHOOK_SECRET:'whsec_fixture',RESEND_API_KEY:'fixture-mail',RESEND_FROM_EMAIL:'Test <fixture@example.invalid>'};
 let handler:Handler,rows=new Map<string,any>(),refunded=new Set<string>(),delivered=new Map<string,string>();
 let calls=0,mailAttempts=0,failMail=false,failStamp=false;
 const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
 const reset=()=>{rows=new Map();refunded=new Set();delivered=new Map();calls=0;mailAttempts=0;failMail=false;failStamp=false;};
 const session=()=>({id:'cs_fixture',mode:'payment',payment_status:'paid',client_reference_id:owner,payment_intent:'pi_fixture',
  amount_total:12000,currency:'pln',metadata:{user_id:owner,course_slug:'fixture-course',course_title:'Fikcyjny kurs <B>',unit_amount_grosze:'12000',terms_version:termsVersion}});
 try{
  (Deno as any).serve=(value:Handler)=>{handler=value;return {}};
  Deno.env.get=name=>env[name];
  globalThis.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
   const url=new URL(input instanceof Request?input.url:String(input));
   assert(['order-fixture.invalid','api.resend.com'].includes(url.hostname),'Unintercepted external I/O: '+url.hostname);
   const method=init?.method||(input instanceof Request?input.method:'GET');
   const raw=init?.body??(input instanceof Request&&method!=='GET'?await input.clone().text():null);
   const body=typeof raw==='string'&&raw?JSON.parse(raw):null;
   if(url.hostname==='api.resend.com'){
    mailAttempts++;
    if(failMail){failMail=false;return json({message:'synthetic unavailable'},503)}
    const key=new Headers(init?.headers).get('Idempotency-Key');assert(key,'Missing email retry key');
    const payload=JSON.stringify(body);
    if(delivered.has(key!))assert(delivered.get(key!)===payload,'Retry changed the confirmation payload');
    else delivered.set(key!,payload);
    return json({id:'synthetic-mail'});
   }
   calls++;
   if(url.pathname.startsWith('/auth/v1/admin/users/'))return json({user:{id:owner,email:'buyer@example.invalid',email_confirmed_at:'2026-01-01T00:00:00Z'}});
   if(url.pathname.endsWith('/ta_courses'))return json({title_pl:'Fikcyjny kurs'});
   if(url.pathname.endsWith('/ta_enrollments')){
    const id=url.searchParams.get('stripe_checkout_session_id')?.replace(/^eq\./,'')||body?.stripe_checkout_session_id;
    if(method==='POST'){if(!rows.has(body.stripe_checkout_session_id))rows.set(body.stripe_checkout_session_id,{...body,buyer_email_sent_at:null});return json([])}
    if(method==='PATCH'){
     if(failStamp){failStamp=false;return json({message:'synthetic stamp failure'},503)}
     Object.assign(rows.get(id),body);return json([]);
    }
    return json(rows.get(id)||[]);
   }
   if(url.pathname.endsWith('/ta_stripe_refunds')){
    const id=url.searchParams.get('payment_id')?.replace(/^eq\./,'');return json(refunded.has(id||'')?{payment_id:id}:[]);
   }
   if(url.pathname.includes('/rpc/')){
    if(url.pathname.endsWith('/ta_refund_stripe_payment')){
     refunded.add(body.p_payment);
     for(const row of rows.values())if(row.stripe_payment_intent_id===body.p_payment)row.status='refunded';
    }
    return json({ok:true});
   }
   if(url.pathname.endsWith('/ta_affiliate_commissions'))return json([]);
   throw new Error('Unexpected fixture request: '+method+' '+url.pathname);
  };
  await import('../supabase/functions/ta-stripe-webhook/index.ts');
  (Deno as any).serve=originalServe;
  async function send(object:any=session(),options:{type?:string;live?:boolean;badSignature?:boolean}={}){
   const timestamp=Math.floor(Date.now()/1000);
   const body=JSON.stringify({id:'evt_fixture',type:options.type||'checkout.session.completed',livemode:options.live!==false,created:timestamp,data:{object}});
   const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
   const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(timestamp+'.'+body)));
   const signature=[...bytes].map(byte=>byte.toString(16).padStart(2,'0')).join('');
   return handler!(new Request('https://fixture.invalid',{method:'POST',headers:{'stripe-signature':'t='+timestamp+',v1='+(options.badSignature?'00':signature)},body}));
  }
  reset();assert((await send(session(),{badSignature:true})).status===400,'Invalid signature accepted');assert(calls===0&&delivered.size===0,'Invalid signature changed data');
  reset();assert((await send(session(),{live:false})).status===200,'Test-mode event not ignored');assert(calls===0,'Test-mode fixture entered live logic');
  reset();await send({...session(),payment_status:'unpaid'});assert(rows.size===0&&delivered.size===0,'Unpaid order granted access');
  for(const bad of [{currency:'eur'},{client_reference_id:'another-user'},{amount_total:12001}]){
   reset();assert((await send({...session(),...bad})).status===400,'Invalid payment identity, amount or currency accepted');assert(rows.size===0&&delivered.size===0,'Rejected event changed the order');
  }
  reset();assert((await send()).status===200,'Paid callback failed');assert(rows.size===1&&delivered.size===1,'Expected one enrollment and confirmation');
  const saved=JSON.stringify([...rows.values()]);await send();assert(JSON.stringify([...rows.values()])===saved&&delivered.size===1&&mailAttempts===1,'Repeat issued an enrollment or confirmation twice');
  const mail=JSON.parse([...delivered.values()][0]);assert(mail.html.includes('Fikcyjny kurs &lt;B&gt;')&&!mail.html.includes('Fikcyjny kurs <B>'),'Course title not escaped');
  assert(mail.attachments?.length>0&&mail.html.includes('moje-kursy'),'Order confirmation omitted terms or course entry');
  reset();failMail=true;assert((await send()).status===500,'Mail failure was hidden');assert(rows.size===1&&![...rows.values()][0].buyer_email_sent_at,'Failed delivery stamped success');
  assert((await send()).status===200&&rows.size===1&&delivered.size===1&&mailAttempts===2,'Retry failed to recover one confirmation');
  reset();failStamp=true;assert((await send()).status===500,'Database stamp failure was hidden');assert(delivered.size===1,'First mail was not sent');
  assert((await send()).status===200&&rows.size===1&&delivered.size===1&&mailAttempts===2,'Retry after stamp failure changed the idempotency key or order');
  reset();refunded.add('pi_fixture');assert((await send()).status===200,'Refund-before-callback failed');assert([...rows.values()][0].status==='refunded'&&delivered.size===0,'Refunded order reactivated or mailed');
  reset();await send();await send({payment_intent:'pi_fixture',amount:12000,amount_refunded:12000},{type:'charge.refunded'});
  assert([...rows.values()][0].status==='refunded','Full refund did not revoke the fixture access');await send();assert([...rows.values()][0].status==='refunded'&&delivered.size===1,'A delayed paid event undid a refund');
  console.log('13 payment-handler scenarios passed using signed fixtures; 0 real payments, emails or database writes.');
 }finally{globalThis.fetch=originalFetch;(Deno as any).serve=originalServe;Deno.env.get=originalGet;}
});
