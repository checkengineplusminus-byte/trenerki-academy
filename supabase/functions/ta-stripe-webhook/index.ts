import Stripe from 'npm:stripe@17.7.0';import {createClient} from 'npm:@supabase/supabase-js@2.86.0';
const reply=(status=200)=>new Response('ok',{status});
Deno.serve(async req=>{if(req.method!=='POST')return reply(405);
 const key=Deno.env.get('STRIPE_SECRET_KEY'),signing=Deno.env.get('STRIPE_WEBHOOK_SECRET'),url=Deno.env.get('SUPABASE_URL'),role=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!key||!signing||!url||!role)return reply(503);
 const stripe=new Stripe(key);let event:Stripe.Event;try{event=await stripe.webhooks.constructEventAsync(await req.text(),req.headers.get('stripe-signature')||'',signing,undefined,Stripe.createSubtleCryptoProvider())}catch(_){return reply(400)}
 if(!event.livemode)return reply(); // Test charges cannot create paid course access on production.
 const db=createClient(url,role,{auth:{persistSession:false}});
 try{
 if(event.type==='charge.refunded'){const charge=event.data.object as Stripe.Charge;if(charge.amount_refunded>=charge.amount&&typeof charge.payment_intent==='string'){const {error}=await db.from('ta_enrollments').update({status:'refunded',updated_at:new Date().toISOString()}).eq('stripe_payment_intent_id',charge.payment_intent);if(error)return reply(500)}return reply()}
 if(!['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type))return reply();
 const s=event.data.object as Stripe.Checkout.Session;if(s.payment_status!=='paid'||s.mode!=='payment'||!s.id)return reply();
 const slug=s.metadata?.course_slug||'',uid=s.metadata?.user_id||'';if(!/^[a-z0-9][a-z0-9_-]{1,79}$/.test(slug)||!uid||s.client_reference_id!==uid||s.currency!=='pln')return reply(400);
 const {data:c,error:ce}=await db.from('ta_courses').select('slug,title_pl,price_grosze').eq('slug',slug).single();if(ce||!c)return reply(400);
 const paidAmount=Number(s.metadata?.unit_amount_grosze||c.price_grosze);
 if(!Number.isSafeInteger(paidAmount)||paidAmount<=0||paidAmount!==s.amount_total)return reply(400);
 const {data:user,error:ue}=await db.auth.admin.getUserById(uid);if(ue||!user.user?.email||!user.user?.email_confirmed_at)return reply(400);
 const start=new Date(),end=new Date(start);end.setUTCFullYear(end.getUTCFullYear()+1);
 const {error}=await db.from('ta_enrollments').insert({user_id:uid,course_slug:slug,stripe_checkout_session_id:s.id,stripe_payment_intent_id:typeof s.payment_intent==='string'?s.payment_intent:null,amount_grosze:paidAmount,currency:'PLN',status:'active',purchased_at:start.toISOString(),expires_at:end.toISOString()});
 if(error?.code==='23505')return reply();if(error)return reply(500);
 const resend=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('RESEND_FROM_EMAIL');if(resend&&from){const safe=c.title_pl.replace(/[&<>"']/g,(x:string)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]||x));try{await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+resend,'content-type':'application/json','Idempotency-Key':'trenerki-'+s.id},body:JSON.stringify({from,to:[user.user.email],subject:'TRENERKI Academy — Twój kurs',html:'<p>Masz już dostęp do kursu '+safe+'.</p>'})})}catch(_){}}
 return reply();
 }catch(_){return reply(500)}
});