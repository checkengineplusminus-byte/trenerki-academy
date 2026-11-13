import {giftCodeHash,legacyGiftCode,shortGiftCode} from '../supabase/functions/_shared/gift-code.ts';

const assert=(condition:unknown,message:string)=>{if(!condition)throw new Error(message);};
const owner='11111111-1111-4111-9111-111111111111';
const stranger='22222222-2222-4222-9222-222222222222';
const id='12345678-1234-4234-9234-123456789abc';
const requestId='33333333-3333-4333-9333-333333333333';
const bundleId='44444444-4444-4444-9444-444444444444';
const baseCard={id,created_by:owner,course_slug:'test-course',recipient_email:'recipient@example.invalid',
 gift_message:'WZÓR — test bez wysyłki',mode:'free',status:'issued',created_at:'2026-11-13T10:00:00Z',
 expires_at:'2035-11-13T10:00:00Z',paid_at:null,buyer_email_sent_at:null,recipient_email_sent_at:null};
type Handler=(req:Request)=>Response|Promise<Response>;

Deno.test('real gift handlers preserve short/legacy codes, authorization, batch retries and Stripe delivery',async()=>{
 const originalFetch=globalThis.fetch,originalServe=Deno.serve,originalGet=Deno.env.get;
 const handlers=new Map<string,Handler>();
 let capture='',state:any={},requests:{path:string;method:string;body:any}[]=[],mails:any[]=[],lastRpc:any;
 const json=(value:unknown)=>new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});
 const env:Record<string,string>={SUPABASE_URL:'https://mock.supabase.invalid',SUPABASE_ANON_KEY:'fixture-anon',
  SUPABASE_SERVICE_ROLE_KEY:'fixture-service',RESEND_API_KEY:'fixture-resend',RESEND_FROM_EMAIL:'TRENERKI <fixture@example.invalid>',
  STRIPE_SECRET_KEY:'sk_live_fixture',STRIPE_WEBHOOK_SECRET:'whsec_fixture'};
 const user=()=>({id:state.userId||stranger,email:state.email||'stranger@example.invalid',
  email_confirmed_at:state.unconfirmed?null:'2026-01-01T00:00:00Z',role:'authenticated',aud:'authenticated'});
 const reset=(next:any)=>{state=next;requests=[];mails=[];lastRpc=null;};
 const matches=(row:any,url:URL)=>[...url.searchParams].every(([key,value])=>!value.startsWith('eq.')||String(row[key])===value.slice(3));
 try{
  (Deno as any).serve=(fn:Handler)=>{handlers.set(capture,fn);return {};};
  Deno.env.get=(name:string)=>env[name];
  globalThis.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
   const url=new URL(input instanceof Request?input.url:String(input));
   const method=init?.method||(input instanceof Request?input.method:'GET');
   const raw=init?.body??(input instanceof Request&&method!=='GET'?await input.clone().text():null);
   const body=typeof raw==='string'&&raw?JSON.parse(raw):null;
   requests.push({path:url.pathname,method,body});
   assert(['mock.supabase.invalid','api.resend.com'].includes(url.hostname),'Unexpected real network destination: '+url.hostname);
   if(url.hostname==='api.resend.com'){
    assert(method==='POST'&&url.pathname==='/emails','Unexpected email API operation');
    const headers=new Headers(init?.headers||(input instanceof Request?input.headers:undefined));
    mails.push({body,key:headers.get('Idempotency-Key')});
    return json({id:'fixture-email'});
   }
   if(url.pathname==='/auth/v1/user')return json(user());
   if(url.pathname.startsWith('/auth/v1/admin/users/'))return json({user:{id:owner,email:'buyer@example.invalid',email_confirmed_at:'2026-01-01T00:00:00Z'}});
   if(url.pathname==='/rest/v1/ta_admins')return json(state.admin?{role:'owner'}:[]);
   if(url.pathname==='/rest/v1/ta_stripe_refunds')return json([]);
   if(url.pathname==='/rest/v1/ta_courses')return json({slug:'test-course',title_pl:'Kurs testowy',price_grosze:10000});
   if(url.pathname==='/rest/v1/ta_company_seats'){
    if(method==='PATCH')return json([]);
    return json(state.company?{bundle_id:bundleId}:[]);
   }
   if(url.pathname==='/rest/v1/ta_company_bundles')return json(state.company&&url.searchParams.get('manager_email')==='eq.manager@example.invalid'?{id:bundleId}:[]);
   if(url.pathname==='/rest/v1/ta_credit_promo_batches'){
    if(method==='PATCH'){Object.assign(state.batch,body);return json([]);}
    return json(state.batch||[]);
   }
   if(url.pathname==='/rest/v1/ta_gift_cards'||url.pathname==='/rest/v1/ta_credit_vouchers'){
    if(method==='PATCH'){if(state.card)Object.assign(state.card,body);return json([]);}
    if(state.mode==='history')return json(state.rows.filter((row:any)=>matches(row,url)));
    const row=state.card;
    return json(row&&matches(row,url)?row:[]);
   }
   if(url.pathname.startsWith('/rest/v1/rpc/')){
    lastRpc={name:url.pathname.split('/').at(-1),body};
    if(lastRpc.name==='ta_credit_issue_promo_batch'){
     const replayed=!!state.batch;
     if(!state.batch){
      state.batch={id:body.p_request_id,created_by:body.p_admin,recipient_email:body.p_email,amount_grosze:body.p_amount,
       quantity:body.p_quantity,gift_message:body.p_message,transferable:body.p_transferable,
       created_at:baseCard.created_at,recipient_email_sent_at:'2026-11-13T11:00:00Z'};
      state.cards=body.p_cards.map((candidate:any,index:number)=>({...baseCard,...candidate,amount_grosze:body.p_amount,
       recipient_email:body.p_email,transferable:body.p_transferable,is_promo:true,batch_id:body.p_request_id,batch_position:index+1}));
     }
     return json({ok:true,replayed,batch:state.batch,cards:state.cards});
    }
    if(lastRpc.name==='ta_company_assign'){
     state.card={...baseCard,id:bundleId,recipient_email:body.p_employee,code_hash:body.p_hash};
     return json({ok:true,gift_card_id:bundleId,course_slug:'test-course',title_pl:'Kurs testowy'});
    }
    if(['ta_credit_redeem','ta_redeem_gift','ta_credit_issue_voucher'].includes(lastRpc.name))return json({ok:true});
   }
   throw new Error('Unexpected mock route: '+method+' '+url.pathname);
  };
  for(const [name,path]of [
   ['print','../supabase/functions/ta-gift-print/index.ts'],
   ['credit','../supabase/functions/ta-credit/index.ts'],
   ['academy','../supabase/functions/ta-academy/index.ts'],
   ['company','../supabase/functions/ta-company/index.ts'],
   ['webhook','../supabase/functions/ta-stripe-webhook/index.ts'],
  ]){capture=name;await import(path);}
  (Deno as any).serve=originalServe;
  async function call(name:string,body:any,status=200,token=true){
   const response=await handlers.get(name)!(new Request('https://edge.invalid',{method:'POST',
    headers:{'content-type':'application/json',...(token?{authorization:'Bearer fixture-token'}:{})},body:JSON.stringify(body)}));
   const data=await response.json();
   assert(response.status===status,name+' returned '+response.status+' instead of '+status+': '+JSON.stringify(data));
   if(status!==200)assert(data.pdf_base64===undefined,'Denied caller received PDF content');
   return data;
  }
  const ta=await shortGiftCode('TA',id),tw=await shortGiftCode('TW',id),oldTa=legacyGiftCode('TA',id),oldTw=legacyGiftCode('TW',id);
  for(const code of [ta,oldTa]){
   const card={...baseCard,code_hash:await giftCodeHash(code)};
   reset({card});await call('print',{action:'pdf',gift_id:id},404);
   reset({card,email:'recipient@example.invalid'});await call('print',{action:'pdf',gift_id:id},404);
   reset({card,userId:owner});const owned=await call('print',{action:'pdf',gift_id:id});
   assert(owned.pdf_base64.startsWith('JVBER'),'Creator did not receive a PDF');
   assert(requests.every(request=>request.method==='GET'),'Printing changed server state');
   reset({card,email:'recipient@example.invalid'});await call('print',{action:'pdf',code});
   reset({card});await call('print',{action:'pdf',code},403);
   reset({card,company:true,email:'manager@example.invalid'});await call('print',{action:'pdf',code});
   reset({card,company:true,email:'other-manager@example.invalid'});await call('print',{action:'pdf',code},403);
   reset({card:{...card,recipient_email:null}});await call('print',{action:'pdf',code});
   reset({card:{...card,status:'redeemed'},email:'recipient@example.invalid'});await call('print',{action:'pdf',code},409);
   reset({card,unconfirmed:true});await call('print',{action:'pdf',code},401);
   reset({card});await call('print',{action:'pdf',code},401,false);
  }
  for(const code of [tw,oldTw]){
   const card={...baseCard,code_hash:await giftCodeHash(code),amount_grosze:10000,is_promo:true,transferable:true};
   reset({card});await call('print',{action:'pdf',code});
   reset({card:{...card,transferable:false}});await call('print',{action:'pdf',code},403);
   reset({});await call('credit',{action:'redeem',code:code.slice(0,3)+code.slice(3).match(/.{1,4}/g)!.join('-')});
   assert(lastRpc.name==='ta_credit_redeem'&&lastRpc.body.p_hash===await giftCodeHash(code),'Value redemption used the wrong code hash');
  }
  for(const code of [ta,oldTa]){
   reset({});await call('academy',{action:'redeem_gift',code:code.toLowerCase()});
   assert(lastRpc.name==='ta_redeem_gift'&&lastRpc.body.p_hash===await giftCodeHash(code),'Course redemption used the wrong code hash');
  }

  reset({admin:true,userId:owner});
  const issued=await call('credit',{action:'admin_issue_promo',request_id:requestId,recipient_email:'foundation@example.invalid',amount_grosze:10000,quantity:2});
  assert(lastRpc.body.p_transferable===true,'New admin cards must be transferable unless explicitly restricted');
  assert(issued.cards.length===2&&issued.cards.every((card:any)=>card.code.length===19&&!('code_hash'in card)),'New value cards are not short or expose their hashes');
  for(const card of lastRpc.body.p_cards)assert(card.code_hash===await giftCodeHash(await shortGiftCode('TW',card.id)),'New card hash differs from its printed code');
  const retry=await call('credit',{action:'admin_issue_promo',request_id:requestId,recipient_email:'foundation@example.invalid',amount_grosze:10000,quantity:2});
  assert(retry.replayed===true&&JSON.stringify(retry.cards)===JSON.stringify(issued.cards),'Retry changed committed voucher codes');
  assert(mails.length===0,'Already sent batch was emailed again');
  reset({admin:true,userId:owner});
  await call('credit',{action:'admin_issue_promo',request_id:requestId,recipient_email:'recipient@example.invalid',amount_grosze:10000,transferable:false});
  assert(lastRpc.body.p_transferable===false,'Explicit recipient binding was ignored');

  reset({admin:true,userId:owner,batch:{id:requestId,created_by:owner,recipient_email:'recipient@example.invalid',quantity:1,
   amount_grosze:10000,gift_message:'Legacy retry',transferable:false,created_at:baseCard.created_at,recipient_email_sent_at:'2026-11-13T11:00:00Z'},
   cards:[{...baseCard,code_hash:await giftCodeHash(oldTw),batch_id:requestId,batch_position:1,amount_grosze:10000,transferable:false,is_promo:true}]});
  const oldRetry=await call('credit',{action:'admin_issue_promo',request_id:requestId,recipient_email:'recipient@example.invalid',amount_grosze:10000,transferable:false});
  assert(oldRetry.cards[0].code===oldTw&&oldRetry.code===oldTw,'Old batch retry issued a different code');

  const randomLegacy='TA-FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF';
  reset({mode:'history',userId:owner,rows:[
   {...baseCard,code_hash:await giftCodeHash(ta)},
   {...baseCard,code_hash:await giftCodeHash(oldTa)},
   {...baseCard,code_hash:await giftCodeHash(randomLegacy)},
  ]});
  const history=await call('academy',{action:'my_gifts'});
  assert(history.gifts[0].printable&&history.gifts[1].printable&&!history.gifts[2].printable,'Print history confused new, legacy and unrelated random codes');
  assert(history.gifts.every((gift:any)=>!('code_hash'in gift)),'Gift history exposes code hashes');

  reset({email:'manager@example.invalid',company:true});
  const assignment=await call('company',{action:'assign',seat_id:requestId,employee_email:'employee@example.invalid'});
  assert(assignment.code.length===19&&lastRpc.body.p_hash===await giftCodeHash(assignment.code),'Company code/hash are not compatible');
  assert(lastRpc.body.p_employee==='employee@example.invalid','Company assignment lost its employee binding');
  assert(mails.length===1&&mails[0].body.attachments.length===1&&mails[0].key.includes('pdf-v2-'),'Company mail did not include its PDF/versioned key');

  async function stripeRequest(){
   const timestamp=Math.floor(Date.now()/1000);
   const event={id:'evt_fixture',type:'checkout.session.completed',livemode:true,created:timestamp,data:{object:{
    id:'cs_live_fixture',mode:'payment',payment_status:'paid',client_reference_id:owner,payment_intent:'pi_fixture',
    amount_total:10000,currency:'pln',metadata:{ta_credit_voucher_id:id,user_id:owner,credit_amount_grosze:'10000'},
   }}};
   const body=JSON.stringify(event);
   const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
   const signature=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(timestamp+'.'+body))),byte=>byte.toString(16).padStart(2,'0')).join('');
   const response=await handlers.get('webhook')!(new Request('https://edge.invalid',{method:'POST',headers:{'stripe-signature':'t='+timestamp+',v1='+signature},body}));
   assert(response.status===200,'Signed fixture webhook failed: '+response.status);
  }
  for(const code of [tw,oldTw]){
   reset({mode:'webhook',card:{...baseCard,code_hash:await giftCodeHash(code),amount_grosze:10000,transferable:false,is_promo:false,
    paid_at:'2026-11-13T10:00:00Z',stripe_checkout_session_id:'cs_live_fixture'}});
   await stripeRequest();
   assert(mails.length===2&&mails.every(mail=>mail.body.html.includes(code)&&mail.body.attachments.length===1),'Stripe changed a pending gift code or omitted its PDF');
   assert(mails.every(mail=>mail.key.includes('pdf-v2-')),'Stripe gift payload reused a prior template idempotency key');
   await stripeRequest();
   assert(mails.length===2,'Stripe retry sent gift messages twice despite persisted stamps');
  }
 }finally{
  globalThis.fetch=originalFetch;
  (Deno as any).serve=originalServe;
  Deno.env.get=originalGet;
 }
});
