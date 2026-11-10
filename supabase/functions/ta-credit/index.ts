import {createClient} from 'npm:@supabase/supabase-js@2.86.0';
const site='https://trenerki.com';
const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'authorization,apikey,content-type,x-client-info','access-control-allow-methods':'POST,OPTIONS','cache-control':'no-store'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
const mailValid=(m:string)=>/^[^@\s]{1,70}@[^@\s]{1,100}\.[^@\s]{2,20}$/.test(m);
const courseValid=(slug:string)=>/^[a-z0-9][a-z0-9_-]{1,79}$/.test(slug);
const sum=(values:{wallet_grosze:number}[])=>(values||[]).reduce((acc,r)=>acc+Number(r.wallet_grosze||0),0);
const fullCode=(id:string)=>'TW-'+id.replaceAll('-','').toUpperCase();
async function hash(code:string){const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code));return Array.from(new Uint8Array(buf),b=>b.toString(16).padStart(2,'0')).join('')}
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
 if(action==='admin_issue_promo'){
  const {data:roleData,error:roleError}=await db.from('ta_admins').select('role').eq('user_id',user.id).maybeSingle();
  if(roleError)return reply({error:'role_verification_failed'},503);
  if(roleData?.role!=='owner')return reply({error:'owner_only'},403);
  const amount=Number(body?.amount_grosze);
  const recipient=String(body?.recipient_email||'').trim().toLowerCase();
  const msg=String(body?.message||'').trim().slice(0,300);
  if(!Number.isSafeInteger(amount)||amount<2500||amount>100000||!mailValid(recipient))return reply({error:'invalid_input'},400);
  const id=crypto.randomUUID(),code=fullCode(id),code_hash=await hash(code);
  const {data,error}=await db.rpc('ta_credit_issue_promo',{
   p_id:id,p_admin:user.id,p_email:recipient,p_amount:amount,p_hash:code_hash,p_message:msg
  });
  if(error){console.error('admin_promo_grant_failed',error.code);return reply({error:'promo_grant_failed'},503)}
  if(!data?.ok)return reply({error:data?.error||'promo_grant_failed'},data?.error==='daily_limit'?429:403);
  let email_sent=false;
  const api=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('RESEND_FROM_EMAIL');
  const pln=new Intl.NumberFormat('pl-PL',{style:'currency',currency:'PLN'}).format(amount/100);
  const link=site+'/prezent?code='+code;
  if(api&&from){
   try{
    const sent=await fetch('https://api.resend.com/emails',{method:'POST',
     headers:{Authorization:'Bearer '+api,'content-type':'application/json'},
     body:JSON.stringify({from,to:[recipient],subject:'TRENERKI Academy — karta podarunkowa '+pln,
      html:'<h2>Masz prezent!</h2><p>Otrzymujesz kartę TRENERKI Academy o wartości <strong>'+pln+'</strong>.</p>'+
       '<p>Twój kod: <strong>'+code+'</strong></p><p><a href="'+link+'">Odbierz środki na swoje konto</a></p>'+
       '<p>Po wykorzystaniu części środków pozostałe saldo pozostanie na Twoim koncie.</p>'}),
     signal:AbortSignal.timeout(12000)});
    email_sent=sent.ok;
   }catch{email_sent=false}
  }
  return reply({ok:true,code,link,recipient_email:recipient,amount_grosze:amount,email_sent});
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
  const code=String(body?.code||'').trim().toUpperCase().replace(/\s/g,'');
  if(!/^TW-[0-9A-F]{32}$/.test(code))return reply({error:'invalid_value_code'},400);
  const {data,error}=await db.rpc('ta_credit_redeem',{p_hash:await hash(code),p_user:user.id});
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
  const secret=Deno.env.get('STRIPE_SECRET_KEY');
  if(!secret||!/^sk_live_/.test(secret)||Deno.env.get('TA_SALES_ENABLED')!=='true')return reply({error:'payments_not_ready'},503);
  if(!Deno.env.get('RESEND_API_KEY')||!Deno.env.get('RESEND_FROM_EMAIL'))return reply({error:'email_not_configured'},503);
  const id=crypto.randomUUID(),codeHash=await hash(fullCode(id));
  const {error:saveErr}=await db.from('ta_credit_vouchers').insert({id,code_hash:codeHash,created_by:user.id,recipient_email:recipient,amount_grosze:amount,gift_message:message||null,status:'pending'});
  if(saveErr){console.error('value_voucher_insert',saveErr.code);return reply({error:'voucher_not_ready'},503)}
  const price=(amount/100).toFixed(2);
  const params=new URLSearchParams({
   mode:'payment',customer_email:email,client_reference_id:user.id,
   success_url:site+'/prezent?checkout=success',cancel_url:site+'/prezent',
   'line_items[0][price_data][currency]':'pln',
   'line_items[0][price_data][unit_amount]':String(amount),
   'line_items[0][price_data][product_data][name]':'Karta podarunkowa TRENERKI — '+price+' zł',
   'line_items[0][quantity]':'1',
   'metadata[ta_credit_voucher_id]':id,
   'metadata[user_id]':user.id,
   'metadata[credit_amount_grosze]':String(amount),
   'metadata[terms_version]':'2026-11-10'
  });
  try{return reply({ok:true,...await checkout(secret,params)})}catch(e){console.error('value_voucher_checkout',e instanceof Error?e.message:'error');return reply({error:'stripe_unavailable'},502)}
 }
 if(action==='purchase_course'){
  const slug=String(body?.course_slug||'');
  if(!courseValid(slug))return reply({error:'invalid_course'},400);
  if(body?.accepted_terms!==true||body?.immediate_content_consent!==true)return reply({error:'consent_required'},400);
  const {data:reservation,error:rerr}=await db.rpc('ta_credit_begin_purchase',{p_user:user.id,p_course:slug});
  if(rerr){console.error('credit_purchase_prepare',rerr.code);return reply({error:'purchase_not_ready'},503)}
  if(reservation?.error)return reply({error:reservation.error},reservation.error==='no_balance'?409:reservation.error==='purchase_in_progress'?409:400);
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
   mode:'payment',customer_email:email,client_reference_id:user.id,
   success_url:site+'/moje-kursy?checkout=success',
   cancel_url:site+'/kup?course='+encodeURIComponent(slug),
   expires_at:String(Math.floor(Date.now()/1000)+45*60),
   'line_items[0][price_data][currency]':'pln',
   'line_items[0][price_data][unit_amount]':String(reservation.stripe_grosze),
   'line_items[0][price_data][product_data][name]':(course?.title_pl||slug)+' — dopłata',
   'line_items[0][quantity]':'1',
   'metadata[user_id]':user.id,
   'metadata[course_slug]':slug,
   'metadata[unit_amount_grosze]':String(reservation.stripe_grosze),
   'metadata[course_price_grosze]':String(reservation.course_price_grosze),
   'metadata[ta_credit_hold_id]':hold,
   'metadata[terms_version]':'2026-11-10',
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
