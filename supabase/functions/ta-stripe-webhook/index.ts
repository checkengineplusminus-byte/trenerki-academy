import Stripe from 'npm:stripe@17.7.0';
import {createClient} from 'npm:@supabase/supabase-js@2.86.0';

const site='https://trenerki.com';
const reply=(status=200)=>new Response(null,{status});
const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]??c));

async function sendMail(key:string,to:string,subject:string,html:string){
 const api=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('RESEND_FROM_EMAIL');
 if(!api||!from)throw new Error('resend_not_configured');
 const result=await fetch('https://api.resend.com/emails',{
  method:'POST',
  headers:{Authorization:'Bearer '+api,'content-type':'application/json','Idempotency-Key':key},
  body:JSON.stringify({from,to:[to],reply_to:'trenerki.pl@gmail.com',subject,html})
 });
 if(!result.ok)throw new Error('resend_http_'+result.status);
}

Deno.serve(async req=>{
 if(req.method!=='POST')return reply(405);
 const key=Deno.env.get('STRIPE_SECRET_KEY'),signing=Deno.env.get('STRIPE_WEBHOOK_SECRET');
 const url=Deno.env.get('SUPABASE_URL'),role=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!key||!signing||!url||!role)return reply(503);
 const stripe=new Stripe(key);
 let event:Stripe.Event;
 try{
  event=await stripe.webhooks.constructEventAsync(await req.text(),req.headers.get('stripe-signature')||'',signing,undefined,Stripe.createSubtleCryptoProvider());
 }catch{return reply(400)}
 if(!event.livemode)return reply();
 const db=createClient(url,role,{auth:{persistSession:false}});
 try{
  if(event.type==='charge.refunded'){
   const charge=event.data.object as Stripe.Charge;
   if(charge.amount_refunded>=charge.amount&&typeof charge.payment_intent==='string'){
    const {error}=await db.rpc('ta_refund_stripe_payment',{p_payment:charge.payment_intent});
    if(error)throw error;
   }
   return reply();
  }
  if(event.type==='checkout.session.expired'){
   const id=event.data.object.metadata?.gift_id;
   if(id){
    const {error}=await db.from('ta_gift_cards').update({status:'cancelled'}).eq('id',id).eq('status','pending');
    if(error)throw error;
   }
   return reply();
  }
  if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))return reply();
  const s=event.data.object as Stripe.Checkout.Session;
  if(s.payment_status!=='paid'||s.mode!=='payment'||!s.id)return reply();
  const slug=s.metadata?.course_slug||'',uid=s.metadata?.user_id||'';
  if(!slug||!uid)return reply(); // Other Checkout integrations may share this Stripe account.
  const paymentId=s.payment_intent;
  if(!/^[a-z0-9][a-z0-9_-]{1,79}$/.test(slug)||s.client_reference_id!==uid||s.currency!=='pln'||typeof paymentId!=='string')return reply(400);
  const amount=Number(s.metadata?.unit_amount_grosze);
  if(!Number.isSafeInteger(amount)||amount<=0||amount!==s.amount_total)return reply(400);
  const {data:course,error:courseError}=await db.from('ta_courses').select('title_pl').eq('slug',slug).single();
  if(courseError)throw courseError;
  const {data:{user},error:userError}=await db.auth.admin.getUserById(uid);
  if(userError||!user?.email_confirmed_at)throw new Error('buyer_lookup_failed');
  const email=s.customer_email||user.email;
  if(!email)throw new Error('buyer_email_missing');
  const title=escape(course.title_pl),paid=new Date(event.created*1000);
  const cost=new Intl.NumberFormat('pl-PL',{style:'currency',currency:'PLN'}).format(amount/100);
  const orderInfo='<p>Zapłacono '+escape(cost)+'. Numer zamówienia: '+escape(s.id)+'.</p>';
  async function wasRefunded(){
   const {data,error}=await db.from('ta_stripe_refunds').select('payment_id').eq('payment_id',paymentId).maybeSingle();
   if(error)throw error;
   if(!data)return false;
   const {error:refundError}=await db.rpc('ta_refund_stripe_payment',{p_payment:paymentId});
   if(refundError)throw refundError;
   return true;
  }
  const giftId=s.metadata?.gift_id;
  if(giftId){
   const {error:issueError}=await db.from('ta_gift_cards').update({
    status:'issued',paid_at:paid.toISOString(),stripe_checkout_session_id:s.id,stripe_payment_intent_id:paymentId
   }).eq('id',giftId).eq('created_by',uid).eq('course_slug',slug).eq('amount_grosze',amount).eq('mode','stripe').eq('status','pending');
   if(issueError)throw issueError;
   const {data:gift,error:giftError}=await db.from('ta_gift_cards')
    .select('status,recipient_email,gift_message,recipient_email_sent_at,buyer_email_sent_at')
    .eq('id',giftId).eq('stripe_checkout_session_id',s.id).single();
   if(giftError)throw giftError;
   if(gift.status==='cancelled'||await wasRefunded())return reply();
   const code='TA-'+giftId.replaceAll('-','').toUpperCase();
   const giftLink=site+'/prezent?code='+code;
   if(!gift.buyer_email_sent_at){
    await sendMail('trenerki-buyer-'+s.id,email,'TRENERKI Academy — zakup karty podarunkowej',
     '<p>Kupiono kartę podarunkową na kurs <strong>'+title+'</strong>.</p>'+orderInfo+
     '<p>Odbiorca: '+escape(gift.recipient_email)+'.</p><p><a href="'+giftLink+'">Link do karty podarunkowej</a></p>');
    const {error}=await db.from('ta_gift_cards').update({buyer_email_sent_at:new Date().toISOString()}).eq('id',giftId);
    if(error)throw error;
   }
   if(!gift.recipient_email_sent_at){
    await sendMail('trenerki-gift-'+s.id,gift.recipient_email,'TRENERKI Academy — masz prezent',
     '<p>Otrzymujesz kurs <strong>'+title+'</strong>.</p><p>'+escape(gift.gift_message||'')+'</p><p><a href="'+giftLink+'">Odbierz prezent</a> po zalogowaniu na ten adres e-mail. Twój kod: '+code+'.</p>');
    const {error}=await db.from('ta_gift_cards').update({recipient_email_sent_at:new Date().toISOString()}).eq('id',giftId);
    if(error)throw error;
   }
   return reply();
  }
  const end=new Date(paid);
  end.setUTCFullYear(end.getUTCFullYear()+1);
  const {error:saveError}=await db.from('ta_enrollments').upsert({
   user_id:uid,course_slug:slug,stripe_checkout_session_id:s.id,stripe_payment_intent_id:paymentId,
   amount_grosze:amount,currency:'PLN',status:'active',purchased_at:paid.toISOString(),expires_at:end.toISOString()
  },{onConflict:'stripe_checkout_session_id',ignoreDuplicates:true});
  if(saveError)throw saveError;
  const {data:order,error:orderError}=await db.from('ta_enrollments').select('buyer_email_sent_at,status').eq('stripe_checkout_session_id',s.id).single();
  if(orderError)throw orderError;
  if(order.status==='refunded'||await wasRefunded()||order.buyer_email_sent_at)return reply();
  await sendMail('trenerki-buyer-'+s.id,email,'TRENERKI Academy — potwierdzenie zakupu',
   '<p>Kupiono kurs <strong>'+title+'</strong> z dostępem na 12 miesięcy.</p>'+orderInfo+
   '<p>Potwierdzamy Twoją zgodę na dostarczenie treści cyfrowych przed upływem 14 dni i przyjęcie do wiadomości utraty prawa odstąpienia po rozpoczęciu dostarczania.</p>'+
   '<p><a href="'+site+'/moje-kursy">Otwórz kurs</a> · <a href="'+site+'/academy/regulamin.html">Regulamin</a></p>');
  const {error}=await db.from('ta_enrollments').update({buyer_email_sent_at:new Date().toISOString()}).eq('stripe_checkout_session_id',s.id);
  if(error)throw error;
  return reply();
 }catch(error){
  console.error('ta-stripe-webhook',event.type,error instanceof Error?error.message:'database_operation_failed');
  return reply(500);
 }
});
