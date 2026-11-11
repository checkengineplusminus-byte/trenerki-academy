import {privacyNotice} from '../_shared/recipient-privacy.ts';
import {createClient} from 'npm:@supabase/supabase-js@2.86.0';
const cors={
 'access-control-allow-origin':'*',
 'access-control-allow-methods':'POST,OPTIONS',
 'access-control-allow-headers':'authorization,apikey,content-type,x-client-info,x-retry-count'
};
const send=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'content-type':'application/json','cache-control':'no-store'}});
const validSlug=(slug:string)=>/^[a-z0-9][a-z0-9_-]{1,79}$/.test(slug);
const validMail=(email:string)=>/^[^@\s]{1,70}@[^@\s]{1,120}\.[^@\s]{2,20}$/.test(email);
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
function makeCode(){
 const values=new Uint8Array(16);crypto.getRandomValues(values);
 return 'TA-'+Array.from(values,v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
}
async function hash(code:string){
 const bytes=new TextEncoder().encode(code),digest=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
}
Deno.serve(async request=>{
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='POST')return send({error:'method_not_allowed'},405);
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!anon||!secret)return send({error:'service_not_configured'},503);
 const bearer=(request.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!bearer)return send({error:'login_required'},401);
 const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(bearer);
 if(authError||!user?.id||!user.email_confirmed_at)return send({error:'login_required'},401);
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:admin,error:adminError}=await db.from('ta_admins').select('role').eq('user_id',user.id).maybeSingle();
 if(adminError)return send({error:'admin_verification_failed'},503);
 if(!['owner','admin'].includes(admin?.role||''))return send({error:'admin_only'},403);
 let body:any;try{body=await request.json()}catch{return send({error:'invalid_json'},400)}
 if(body?.action==='set_discount'){
  if(admin.role!=='owner')return send({error:'owner_only'},403);
  const day=String(body?.day||''),percent=Number(body?.percent);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isInteger(percent)||percent<0||percent>80)
   return send({error:'invalid_discount'},400);
  const parsed=new Date(day+'T12:00:00Z');
  if(Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==day)
   return send({error:'invalid_discount'},400);
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Warsaw',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  if(day<today)return send({error:'past_discount_date'},400);
  const {data:saved,error:saveError}=await db.from('ta_daily_discounts')
   .upsert({day,percent,created_by:user.id,updated_at:new Date().toISOString()},{onConflict:'day'})
   .select('day,percent').single();
  if(saveError){console.error('discount_save_failed',saveError.code);return send({error:'discount_save_failed'},503);}
  return send({ok:true,discount:saved});
 }
 if(body?.action!=='issue')return send({error:'invalid_action'},400);
 const slugs=body?.course_slugs;
 if(!Array.isArray(slugs)||slugs.length<1||slugs.length>10||!slugs.every((s:any)=>typeof s==='string'&&validSlug(s)))
  return send({error:'choose_1_to_10_courses'},400);
 const destination=String(body?.destination_email||'').trim().toLowerCase().slice(0,200);
 if(destination&&!validMail(destination))return send({error:'invalid_recipient_email'},400);
 const bind=body?.bind_to_recipient===true;
 if(bind&&!destination)return send({error:'recipient_required'},400);
 const companyMode=body?.company_mode===true;
 if(companyMode&&!destination)return send({error:'recipient_required'},400);
 const {data:available,error:courseError}=await db.from('ta_courses').select('slug,title_pl,published').in('slug',[...new Set(slugs)]).eq('published',true);
 if(courseError)return send({error:'courses_unavailable'},503);
 const bySlug=new Map((available||[]).map((c:any)=>[c.slug,c]));
 if(slugs.some((slug:string)=>!bySlug.has(slug)))return send({error:'unpublished_or_invalid_course'},422);
 const {count:recentCount,error:countError}=await db.from('ta_gift_cards')
  .select('id',{count:'exact',head:true}).eq('created_by',user.id)
  .gte('created_at',new Date(Date.now()-24*60*60*1000).toISOString());
 if(countError)return send({error:'gift_rate_check_failed'},503);
 if((recentCount||0)+slugs.length>200)return send({error:'admin_daily_limit'},429);
 if(companyMode){
  const name=String(body?.company_name||'').trim().slice(0,150);
  const {data:bundle,error:bundleError}=await db.rpc('ta_company_create_bundle',{
   p_admin:user.id,p_email:destination,p_name:name,p_courses:slugs
  });
  if(bundleError||bundle?.error||!bundle?.ok){
   console.error('ta_company_grant_failed',bundleError?.code);
   return send({error:bundle?.error||'company_grant_failed'},503);
  }
  const dashboard='https://trenerki.com/firma';
  let emailSent=false;
  const api=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('RESEND_FROM_EMAIL');
  if(api&&from){
   const summary=slugs.reduce((o:Record<string,number>,slug:string)=>(o[slug]=(o[slug]||0)+1,o),{});
   const entries=Object.entries(summary).map(([slug,n])=>'<li>'+esc(String(n))+' × '+esc((bySlug.get(slug) as any).title_pl)+'</li>').join('');
   const html='<h2>Twoja firma otrzymała kursy TRENERKI</h2><p>Przydzielono '+slugs.length+' miejsc szkoleniowych.</p><ul>'+entries+'</ul>'+
    '<p><a href="'+esc(dashboard)+'">Otwórz panel firmy</a></p>'+
    '<p>Załóż konto lub zaloguj się używając dokładnie tego adresu e-mail. W panelu wybierasz pracowników, przesyłasz im kursy i widzisz, które zostały odebrane.</p>';
   try{
    const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:'Bearer '+api,'content-type':'application/json'},
     body:JSON.stringify({from,to:[destination],subject:'TRENERKI Academy — panel firmy i '+slugs.length+' kursów',html:html+privacyNotice}),
     signal:AbortSignal.timeout(12000)});
    emailSent=res.ok;
   }catch{emailSent=false}
  }
  return send({ok:true,company_panel:true,company_email:destination,company_name:name,dashboard_url:dashboard,
   seats:slugs.length,email_sent:emailSent,bundle_id:bundle.bundle_id});
 }
  const codes=slugs.map(()=>makeCode());
 const hashes=await Promise.all(codes.map(hash));
 const rows=slugs.map((slug:string,index:number)=>({
  code_hash:hashes[index],course_slug:slug,created_by:user.id,
  recipient_email:bind?destination:null,
  gift_message:bind?'Bezpłatny prezent od TRENERKI Academy':'Pakiet kursów dla odbiorcy wskazanego przez administratora',
  mode:'free',status:'issued'
 }));
 // Bulk insert is one Postgres statement: either all vouchers are created or none.
 const {data:issued,error:insertError}=await db.from('ta_gift_cards').insert(rows).select('id,expires_at');
 if(insertError||issued?.length!==rows.length){console.error('admin_gift_insert_failed',insertError?.code);return send({error:'gift_create_failed'},500);}
 const gifts=slugs.map((slug:string,index:number)=>({
  course_slug:slug,title_pl:(bySlug.get(slug) as any).title_pl,
  code:codes[index],link:'https://trenerki.com/prezent?code='+codes[index],
  expires_at:issued[index]?.expires_at
 }));
 let emailSent=false,emailError='';
 if(destination){
  const api=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('RESEND_FROM_EMAIL');
  if(api&&from){
   const entries=gifts.map((gift,i)=>'<li style="padding:8px 0"><strong>'+esc((i+1)+'. '+gift.title_pl)+'</strong><br><a href="'+esc(gift.link)+'">'+esc(gift.link)+'</a></li>').join('');
   const html='<h2>Twoje kursy od TRENERKI Academy</h2><p>Otrzymujesz '+gifts.length+' bezpłatnych '+(gifts.length===1?'kurs':'kodów do kursów')+'. Każdy kod można wykorzystać jeden raz. '+(bind?'Te kody są przypisane do Twojego adresu e-mail.':'Możesz przekazać każdy link wybranemu pracownikowi lub znajomemu.')+'</p><ol>'+entries+'</ol><p>Po odebraniu kodu dostęp do nauki trwa 12 miesięcy. <a href="https://trenerki.com">TRENERKI Academy</a>.</p>';
   try{
    const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:'Bearer '+api,'content-type':'application/json'},body:JSON.stringify({from,to:[destination],subject:'TRENERKI Academy — '+gifts.length+' bezpłatnych kursów',html:html+privacyNotice}),signal:AbortSignal.timeout(12000)});
    emailSent=res.ok;if(!res.ok)emailError='email_provider_unavailable';
   }catch{emailError='email_provider_unavailable'}
  }else emailError='email_not_configured';
 }
 return send({ok:true,gifts,email_sent:emailSent,email_error:emailError,delivery_email:destination||null,restricted_to_email:bind});
});