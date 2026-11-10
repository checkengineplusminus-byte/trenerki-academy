import {createClient} from 'npm:@supabase/supabase-js@2.86.0';
const headers={'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'authorization, x-client-info, apikey, content-type','access-control-allow-methods':'POST, OPTIONS'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return reply({ok:true});
 if(req.method!=='POST')return reply({error:'method_not_allowed'},405);
 try{
  const auth=req.headers.get('authorization')||'';
  if(!/^Bearer\s+\S+/i.test(auth))return reply({error:'login_required'},401);
  const token=auth.replace(/^Bearer\s+/i,'');
  const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),role=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!url||!anon||!role)return reply({error:'server_not_ready'},503);
  const client=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false}});
  const {data:{user},error:authError}=await client.auth.getUser(token);
  if(authError||!user?.email||!user.email_confirmed_at)return reply({error:'confirmed_login_required'},401);
  const body=await req.json();
  const slug=String(body?.course_slug||'');
  if(!/^[a-z0-9][a-z0-9_-]{1,79}$/.test(slug))return reply({error:'invalid_course'},400);
  if(body?.accepted_terms!==true||body?.immediate_content_consent!==true)return reply({error:'consent_required'},400);
  const admin=createClient(url,role,{auth:{persistSession:false}});
  const {data:course,error:courseError}=await admin.from('ta_courses').select('slug,title_pl,price_grosze').eq('slug',slug).eq('published',true).maybeSingle();
  if(courseError)return reply({error:'database_unavailable'},503);
  if(!course||!Number.isInteger(course.price_grosze)||course.price_grosze<=0)return reply({error:'course_unavailable_or_free'},404);
  const {data:already,error:alreadyError}=await admin.from('ta_enrollments').select('id').eq('user_id',user.id).eq('course_slug',slug).eq('status','active').gt('expires_at',new Date().toISOString()).limit(1);
  if(alreadyError)return reply({error:'database_unavailable'},503);
  if(already?.length)return reply({error:'already_purchased'},409);
  const stripe=Deno.env.get('STRIPE_SECRET_KEY');
  if(!stripe||!Deno.env.get('STRIPE_WEBHOOK_SECRET'))return reply({error:'payments_not_configured'},503);
  if(!stripe.startsWith('sk_live_'))return reply({error:'payments_not_live'},503);
  const site='https://trenerki.com';
  const consentDate=new Date().toISOString();
  const p=new URLSearchParams({
   mode:'payment',
   success_url:site+'/moje-kursy?checkout=success',
   cancel_url:site+'/kup?course='+encodeURIComponent(slug),
   customer_email:user.email,
   client_reference_id:user.id,
   'line_items[0][price_data][currency]':'pln',
   'line_items[0][price_data][unit_amount]':String(course.price_grosze),
   'line_items[0][price_data][product_data][name]':course.title_pl,
   'line_items[0][quantity]':'1',
   'metadata[user_id]':user.id,
   'metadata[course_slug]':slug,
   'metadata[unit_amount_grosze]':String(course.price_grosze),
   'metadata[terms_version]':'2026-11-10',
   'metadata[terms_accepted_at]':consentDate,
   'metadata[immediate_content_consent]':'true'
  });
  const response=await fetch('https://api.stripe.com/v1/checkout/sessions',{
    method:'POST',
    headers:{Authorization:'Bearer '+stripe,'content-type':'application/x-www-form-urlencoded'},
    body:p
  });
  if(!response.ok)return reply({error:'payment_provider_unavailable'},502);
  const result=await response.json();
  if(typeof result?.url!=='string'||!result.url.startsWith('https://checkout.stripe.com/'))return reply({error:'payment_provider_unavailable'},502);
  return reply({url:result.url});
 }catch(_){return reply({error:'checkout_unavailable'},500)}
});