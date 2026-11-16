import {termsVersion} from '../_shared/order-confirmation.ts';
import {buildGiftCardPdf,bytesBase64,giftCardFilename,type GiftCard} from '../_shared/gift-card-pdf.ts';
import {giftCardMailContent,giftCardLink} from '../_shared/gift-card-mail.ts';
import {giftCodeHash,isGiftCode,normalizeGiftCode,resolveGiftCode,shortGiftCode} from '../_shared/gift-code.ts';
import {createClient,type SupabaseClient} from 'npm:@supabase/supabase-js@2.86.0';
const site='https://trenerki.com';
const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'authorization,apikey,content-type,x-client-info','access-control-allow-methods':'POST,OPTIONS','cache-control':'no-store'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const mailValid=(m:string)=>/^[^@\s]{1,70}@[^@\s]{1,100}\.[^@\s]{2,20}$/.test(m);
const courseValid=(slug:string)=>/^[a-z0-9][a-z0-9_-]{1,79}$/.test(slug);
const sum=(values:{wallet_grosze:number}[])=>(values||[]).reduce((acc,r)=>acc+Number(r.wallet_grosze||0),0);
const uuidValid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const voucherFields='id,code_hash,batch_id,batch_position,recipient_email,amount_grosze,gift_message,transferable,created_at,expires_at,status,recipient_email_sent_at';
type PromoCard=Omit<GiftCard,'code'>&{code_hash:string;batch_id:string;batch_position:number;status:string;recipient_email_sent_at:string|null};
async function printableCard(row:any):Promise<GiftCard>{
 const code=await resolveGiftCode('TW',row.id,row.code_hash);
 if(!code)throw new Error('gift_code_unavailable');
 return {...row,code,transferable:row.transferable===true};
}
async function publicCard(row:any){
 const card=await printableCard(row);
 return {id:row.id,code:card.code,link:giftCardLink(card.code),amount_grosze:row.amount_grosze,
  transferable:row.transferable===true,expires_at:row.expires_at,status:row.status};
}
async function loadPromoBatch(db:SupabaseClient,batchId:string,adminId:string){
 const {data:batch,error:batchError}=await db.from('ta_credit_promo_batches').select('*').eq('id',batchId).eq('created_by',adminId).maybeSingle();
 if(batchError)throw new Error('batch_lookup_failed');
 if(!batch)return null;
 const {data:cards,error:cardsError}=await db.from('ta_credit_vouchers').select(voucherFields).eq('batch_id',batchId).eq('created_by',adminId).eq('is_promo',true).order('batch_position');
 if(cardsError||cards?.length!==batch.quantity)throw new Error('batch_lookup_failed');
 return {batch,cards:cards as PromoCard[]};
}
async function sendPromoBatch(db:SupabaseClient,batch:any,cards:PromoCard[]){
 if(batch.recipient_email_sent_at)return {email_sent:true};
 if(cards.some(card=>card.status!=='issued'||new Date(card.expires_at).getTime()<=Date.now()))return {email_sent:false,email_error:'card_inactive'};
 const api=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('RESEND_FROM_EMAIL');
 if(!api||!from)return {email_sent:false,email_error:'email_not_configured'};
 try{
  const content=await giftCardMailContent(await Promise.all(cards.map(printableCard)));
  const result=await fetch('https://api.resend.com/emails',{method:'POST',
   headers:{Authorization:'Bearer '+api,'content-type':'application/json','Idempotency-Key':'trenerki-promo-pdf-v2-'+batch.id},
   body:JSON.stringify({from,to:[batch.recipient_email],reply_to:'trenerki.pl@gmail.com',...content}),signal:AbortSignal.timeout(15000)});
  if(!result.ok){console.error('promo_email_failed',result.status);return {email_sent:false,email_error:'email_send_failed'};}
  const stamp=new Date().toISOString();
  const {error:cardStampError}=await db.from('ta_credit_vouchers').update({recipient_email_sent_at:stamp}).eq('batch_id',batch.id).eq('created_by',batch.created_by);
  const {error:batchStampError}=await db.from('ta_credit_promo_batches').update({recipient_email_sent_at:stamp}).eq('id',batch.id).eq('created_by',batch.created_by);
  if(cardStampError||batchStampError)console.error('promo_email_status_failed');
  return {email_sent:true};
 }catch{console.error('promo_email_or_pdf_failed');return {email_sent:false,email_error:'email_send_failed'};}
}
async function checkout(secret:string,params:URLSearchParams){
 const res=await fetch('https://api.stripe.com/v1/checkout/sessions',{method:'POST',headers:{Authorization:'Bearer '+secret,'content-type':'application/x-www-form-urlencoded'},body:params,signal:AbortSignal.timeout(14000)});
 if(!res.ok)throw new Error('stripe_unavailable');
 const session=await res.json();
 if(typeof session?.id!=='string'||!session.id.startsWith('cs_live_')||typeof session.url!=='string'||!session.url.startsWith('https://checkout.stripe.com/'))throw new Error('stripe_unavailable');
 return {id:session.id,url:session.url};
}
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return reply({ok:true});
 if(req.method!=='POST')return reply({error:'method_not_allowed'},405);
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),role=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!anon||!role)return reply({error:'service_not_ready'},503);
 const bearer=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!bearer)return reply({error:'login_required'},401);
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authErr}=await auth.auth.getUser(bearer);
 if(authErr||!user?.email_confirmed_at||!user.email)return reply({error:'confirmed_login_required'},401);
 const db=createClient(url,role,{auth:{persistSession:false,autoRefreshToken:false}});
 let body:any;try{body=await req.json()}catch{return reply({error:'invalid_body'},400)}
 const action=String(body?.action||'');
 const email=user.email.trim().toLowerCase();
 if(['admin_issue_promo','admin_list_promo','admin_card_pdf','admin_resend_promo'].includes(action)){
  const {data:roleData,error:roleError}=await db.from('ta_admins').select('role').eq('user_id',user.id).maybeSingle();
  if(roleError)return reply({error:'role_verification_failed'},503);
  if(roleData?.role!=='owner')return reply({error:'owner_only'},403);
  if(action==='admin_list_promo'){
   const {data:batches,error:batchError}=await db.from('ta_credit_promo_batches').select('id,recipient_email,amount_grosze,quantity,gift_message,transferable,created_at,recipient_email_sent_at').eq('created_by',user.id).order('created_at',{ascending:false}).limit(10);
   if(batchError)return reply({error:'batch_lookup_failed'},503);
   if(!batches?.length)return reply({ok:true,batches:[]});
   const {data:cards,error:cardsError}=await db.from('ta_credit_vouchers').select(voucherFields).eq('created_by',user.id).eq('is_promo',true).in('batch_id',batches.map(b=>b.id)).order('batch_position');
   if(cardsError)return reply({error:'batch_lookup_failed'},503);
   try{
    return reply({ok:true,batches:await Promise.all(batches.map(async batch=>({...batch,cards:await Promise.all((cards||[]).filter(c=>c.batch_id===batch.id).map(publicCard))})))});
   }catch{return reply({error:'batch_lookup_failed'},503);}
  }
  if(action==='admin_card_pdf'){
   if(!uuidValid(body?.card_id))return reply({error:'invalid_input'},400);
   const {data:card,error:cardError}=await db.from('ta_credit_vouchers').select(voucherFields).eq('id',body.card_id).eq('created_by',user.id).eq('is_promo',true).maybeSingle();
   if(cardError)return reply({error:'card_lookup_failed'},503);
   if(!card)return reply({error:'card_not_found'},404);
   if(card.status!=='issued'||new Date(card.expires_at).getTime()<=Date.now())return reply({error:'card_inactive'},409);
   try{
    const printable=await printableCard(card);
    return reply({ok:true,pdf_base64:bytesBase64(await buildGiftCardPdf(printable)),filename:giftCardFilename(printable)});
   }catch{return reply({error:'pdf_not_ready'},503);}
  }
  if(action==='admin_resend_promo'){
   if(!uuidValid(body?.batch_id))return reply({error:'invalid_input'},400);
   try{
    const found=await loadPromoBatch(db,body.batch_id,user.id);
    if(!found)return reply({error:'batch_not_found'},404);
    if(found.batch.recipient_email_sent_at)return reply({ok:true,email_sent:true,already_sent:true});
    if(found.cards.some(card=>card.status!=='issued'||new Date(card.expires_at).getTime()<=Date.now()))return reply({error:'card_inactive'},409);
    return reply({ok:true,...await sendPromoBatch(db,found.batch,found.cards)});
   }catch{return reply({error:'batch_lookup_failed'},503);}
  }
  const amount=Number(body?.amount_grosze);
  const recipient=String(body?.recipient_email||'').trim().toLowerCase();
  const msg=String(body?.message||'').trim().slice(0,300);
  const quantity=body?.quantity===undefined?1:Number(body.quantity);
  const transferable=body?.transferable!==false;
  if(!Number.isSafeInteger(amount)||amount<2500||amount>100000||!mailValid(recipient)||!Number.isInteger(quantity)||quantity<1||quantity>10||
   (body?.transferable!==undefined&&typeof body.transferable!=='boolean')||
   (body?.request_id!==undefined&&!uuidValid(body.request_id)))return reply({error:'invalid_input'},400);
  // A delivery address does not bind new promotional cards unless explicitly
  // requested. Clients retain the request ID to avoid duplicate funds on retry.
  const requestId=body?.request_id||crypto.randomUUID();
  const candidateCards=await Promise.all(Array.from({length:quantity},async()=>{
   const id=crypto.randomUUID();return {id,code_hash:await giftCodeHash(await shortGiftCode('TW',id))};
  }));
  const {data,error}=await db.rpc('ta_credit_issue_promo_batch',{
   p_request_id:requestId,p_admin:user.id,p_email:recipient,p_amount:amount,p_quantity:quantity,p_message:msg,p_transferable:transferable,p_cards:candidateCards
  });
  if(error){console.error('admin_promo_grant_failed',error.code);return reply({error:'promo_grant_failed'},503)}
  if(!data?.ok){
   const status=data?.error==='daily_limit'?429:data?.error==='owner_only'?403:['request_conflict','card_conflict'].includes(data?.error)?409:400;
   return reply({error:data?.error||'promo_grant_failed'},status);
  }
  const cards=(data.cards||[]) as PromoCard[];
  const delivery=await sendPromoBatch(db,data.batch,cards);
  let responseCards;
  try{responseCards=await Promise.all(cards.map(publicCard));}catch{return reply({error:'batch_lookup_failed'},503);}
  return reply({ok:true,batch_id:data.batch.id,quantity:cards.length,total_grosze:cards.reduce((total,c)=>total+c.amount_grosze,0),
   recipient_email:data.batch.recipient_email,cards:responseCards,replayed:data.replayed,...delivery,
   // Retain the response fields consumed by the previous one-card admin screen.
   code:responseCards[0]?.code??null,link:responseCards[0]?.link??null,amount_grosze:data.batch.amount_grosze});
 }
 if(action==='balance'){
  const [{data:wallet,error:we},{data:entries,error:le},{data:holds,error:he}]=await Promise.all([
   db.from('ta_credit_wallets').select('balance_grosze').eq('user_id',user.id).maybeSingle(),
   db.from('ta_credit_movements').select('amount_grosze,balance_after_grosze,kind,description,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(15),
   db.from('ta_credit_holds').select('wallet_grosze').eq('user_id',user.id).eq('status','pending')
  ]);
  if(we||le||he)return reply({error:'wallet_unavailable'},503);
  const balance=Number(wallet?.balance_grosze||0),reserved=sum(holds||[]);
  return reply({ok:true,balance_grosze:balance,available_grosze:Math.max(0,balance-reserved),reserved_grosze:reserved,history:entries||[]});
 }
 if(action==='redeem'){
  const code=normalizeGiftCode(body?.code);
  if(!isGiftCode(code,'TW'))return reply({error:'invalid_value_code'},400);
  const {data,error}=await db.rpc('ta_credit_redeem',{p_hash:await giftCodeHash(code),p_user:user.id});
  if(error){console.error('redeem_failed',error.code);return reply({error:'redeem_failed'},503)}
  const status=String(data?.error||'');
  if(status)return reply({error:status},status==='invalid_code'?404:status==='wrong_email'?403:409);
  return reply({ok:true,...data});
 }
 if(action==='create_voucher'){
  const amount=Number(body?.amount_grosze);
  const recipient=String(body?.recipient_email||'').trim().toLowerCase();
  const message=String(body?.message||'').trim().slice(0,300);
  if(!Number.isSafeInteger(amount)||amount<2500||amount>100000)return reply({error:'invalid_amount'},400);
  if(!mailValid(recipient))return reply({error:'invalid_recipient_email'},400);
  if(body?.accepted_terms!==true)return reply({error:'consent_required'},400);
  if(body?.terms_version!==termsVersion)return reply({error:'quote_changed'},409);
  const secret=Deno.env.get('STRIPE_SECRET_KEY');
  if(!secret||!/^sk_live_/.test(secret)||Deno.env.get('TA_SALES_ENABLED')!=='true')return reply({error:'payments_not_ready'},503);
  if(!Deno.env.get('RESEND_API_KEY')||!Deno.env.get('RESEND_FROM_EMAIL'))return reply({error:'email_not_configured'},503);
  const id=crypto.randomUUID(),codeHash=await giftCodeHash(await shortGiftCode('TW',id));
  const {error:saveErr}=await db.from('ta_credit_vouchers').insert({id,code_hash:codeHash,created_by:user.id,recipient_email:recipient,amount_grosze:amount,gift_message:message||null,status:'pending'});
  if(saveErr){console.error('value_voucher_insert',saveErr.code);return reply({error:'voucher_not_ready'},503)}
  const price=(amount/100).toFixed(2);
  const params=new URLSearchParams({
   mode:'payment',locale:'pl',submit_type:'pay',customer_email:email,client_reference_id:user.id,
   success_url:site+'/prezent?checkout=success',cancel_url:site+'/prezent',
   'line_items[0][price_data][currency]':'pln',
   'line_items[0][price_data][unit_amount]':String(amount),
   'line_items[0][price_data][product_data][name]':'Karta podarunkowa TRENERKI — '+price+' zł',
   'line_items[0][quantity]':'1',
   'metadata[ta_credit_voucher_id]':id,
   'metadata[user_id]':user.id,
   'metadata[credit_amount_grosze]':String(amount),
   'metadata[terms_version]':termsVersion,
   'metadata[terms_accepted_at]':new Date().toISOString()
  });
  try{return reply({ok:true,...await checkout(secret,params)})}catch(e){console.error('value_voucher_checkout',e instanceof Error?e.message:'error');return reply({error:'stripe_unavailable'},502)}
 }
 if(action==='purchase_course'){
  const slug=String(body?.course_slug||'');
  if(!courseValid(slug))return reply({error:'invalid_course'},400);
  if(body?.accepted_terms!==true||body?.immediate_content_consent!==true)return reply({error:'consent_required'},400);
  if(body?.terms_version!==termsVersion||!Number.isSafeInteger(body?.expected_price_grosze)||!Number.isSafeInteger(body?.expected_credit_grosze))return reply({error:'quote_changed'},409);
  if(!Deno.env.get('RESEND_API_KEY')||!Deno.env.get('RESEND_FROM_EMAIL'))return reply({error:'email_not_configured'},503);
  const {data:reservation,error:rerr}=await db.rpc('ta_credit_confirm_purchase',{
   p_user:user.id,p_course:slug,p_price:body.expected_price_grosze,p_credit:body.expected_credit_grosze,p_terms_version:termsVersion
  });
  if(rerr){console.error('credit_purchase_prepare',rerr.code);return reply({error:'purchase_not_ready'},503)}
  if(reservation?.error)return reply({error:reservation.error},['no_balance','purchase_in_progress','quote_changed'].includes(reservation.error)?409:400);
  if(reservation?.mode==='covered')return reply({ok:true,mode:'covered',balance_grosze:reservation.balance_grosze});
  if(reservation?.mode!=='split')return reply({error:'purchase_not_ready'},503);
  const secret=Deno.env.get('STRIPE_SECRET_KEY');
  const hold=String(reservation.hold_id);
  if(!secret||!/^sk_live_/.test(secret)||Deno.env.get('TA_SALES_ENABLED')!=='true'){
   await db.rpc('ta_credit_cancel_hold',{p_hold:hold,p_session:null});
   return reply({error:'payments_not_ready'},503);
  }
  const {data:course}=await db.from('ta_courses').select('title_pl').eq('slug',slug).single();
  const params=new URLSearchParams({
   mode:'payment',locale:'pl',submit_type:'pay',customer_email:email,client_reference_id:user.id,
   success_url:site+'/moje-kursy?checkout=success&session_id={CHECKOUT_SESSION_ID}',
   cancel_url:site+'/kup?course='+encodeURIComponent(slug),
   expires_at:String(Math.floor(Date.now()/1000)+45*60),
   'line_items[0][price_data][currency]':'pln',
   'line_items[0][price_data][unit_amount]':String(reservation.stripe_grosze),
   'line_items[0][price_data][product_data][name]':(course?.title_pl||slug)+' — dopłata',
   'line_items[0][quantity]':'1',
   'metadata[user_id]':user.id,
   'metadata[course_slug]':slug,
   'metadata[course_title]':String(course?.title_pl||slug).slice(0,300),
   'metadata[unit_amount_grosze]':String(reservation.stripe_grosze),
   'metadata[course_price_grosze]':String(reservation.course_price_grosze),
   'metadata[ta_credit_hold_id]':hold,
   'metadata[terms_version]':termsVersion,
   'metadata[terms_accepted_at]':new Date().toISOString(),
   'metadata[immediate_content_consent]':'true'
  });
  try{
   const session=await checkout(secret,params);
   const {data:attached,error:attachErr}=await db.rpc('ta_credit_attach_session',{p_hold:hold,p_user:user.id,p_session:session.id});
   if(attachErr||attached!==true){console.error('credit_hold_attach_failed',attachErr?.code);return reply({error:'purchase_not_ready'},503)}
   return reply({ok:true,mode:'split',url:session.url,credit_grosze:reservation.wallet_grosze,stripe_grosze:reservation.stripe_grosze});
  }catch(e){
   await db.rpc('ta_credit_cancel_hold',{p_hold:hold,p_session:null});
   console.error('split_checkout_error',e instanceof Error?e.message:'error');
   return reply({error:'stripe_unavailable'},502);
  }
 }
 return reply({error:'unknown_action'},400);
});
