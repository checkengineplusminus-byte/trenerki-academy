import {createClient} from 'npm:@supabase/supabase-js@2.86.0';
import {teachingContext,coachInstruction} from './context.js';
const origins=new Set(['https://trenerki.com','https://www.trenerki.com','https://trenerki-academy.expo.app']);
const clip=(x:unknown,n:number)=>typeof x==='string'?x.trim().slice(0,n):'';
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const headers:Record<string,string>={'content-type':'application/json','cache-control':'no-store','vary':'Origin','access-control-allow-methods':'POST,OPTIONS','access-control-allow-headers':'authorization,apikey,content-type,x-client-info'};
 if(origins.has(origin))headers['access-control-allow-origin']=origin;
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!origins.has(origin))return reply({error:'origin_not_allowed'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'method_not_allowed'},405);
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 const key=Deno.env.get('OPENAI_API_KEY')||Deno.env.get('OPENAI_KEY_API');
 if(!url||!anon||!service||!key)return reply({error:'coach_unavailable'},503);
 const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!token)return reply({error:'login_required'},401);
 if(Number(req.headers.get('content-length')||0)>4096)return reply({error:'input_too_large'},413);
 let payload:any;
 try{const text=await req.text();if(text.length>4096)return reply({error:'input_too_large'},413);payload=JSON.parse(text);}catch{return reply({error:'invalid_json'},400);}
 const id=clip(payload?.workspace_id,40),question=clip(payload?.question,700);
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||question.length<4)return reply({error:'invalid_input'},400);
 if(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(question)||/\b(?:\d[ -]*){10,}\b/.test(question))return reply({error:'omit_personal_identifiers'},400);
 const client=createClient(url,anon,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await client.auth.getUser(token);
 if(authError||!user?.id||!user.email_confirmed_at)return reply({error:'login_required'},401);
 const [workspace,access]=await Promise.all([
  client.from('ta_accounting_lab_workspaces').select('state,version').eq('id',id).eq('user_id',user.id).maybeSingle(),
  client.rpc('ta_accounting_overview')
 ]);
 if(workspace.error||access.error||!workspace.data)return reply({error:'workspace_not_available'},403);
 // Do modelu trafiają tylko jawnie wybrane liczby i lokalne etykiety powiązań.
 // Nazwy, NIP, adresy, numery faktur i opisy wyciągów nie są częścią kontekstu.
 const summary=teachingContext(workspace.data.state,workspace.data.version);
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 // Rola serwisowa służy wyłącznie zapisowi wspólnego limitu tutora.
 const day=new Date().toISOString().slice(0,10);
 const {data:quota,error:qe}=await db.from('ta_tutor_usage').select('request_count').eq('user_id',user.id).eq('usage_day',day).maybeSingle();
 if(qe)return reply({error:'quota_unavailable'},503);
 const count=quota?.request_count||0;if(count>=15)return reply({error:'daily_limit'},429);
 if(quota){const result=await db.from('ta_tutor_usage').update({request_count:count+1,updated_at:new Date().toISOString()}).eq('user_id',user.id).eq('usage_day',day).eq('request_count',count).select('request_count');if(result.error||!result.data?.length)return reply({error:'retry_request'},409);}
 else {const result=await db.from('ta_tutor_usage').insert({user_id:user.id,usage_day:day,request_count:1});if(result.error)return reply({error:'retry_request'},409);}
 try{
  const ai=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'authorization':'Bearer '+key,'content-type':'application/json'},body:JSON.stringify({model:Deno.env.get('ACCOUNTING_COACH_MODEL')||'gpt-6-luna',store:false,max_output_tokens:800,reasoning:{effort:'low'},input:[{role:'developer',content:coachInstruction},{role:'user',content:JSON.stringify({question,teaching_data:summary})}]}),signal:AbortSignal.timeout(14000)});
  if(!ai.ok)return reply({error:'coach_unavailable'},503);
  const result=await ai.json();const answer=clip(result.output_text||(result.output||[]).flatMap((x:any)=>x.content||[]).filter((x:any)=>x.type==='output_text').map((x:any)=>x.text).join('\n'),4000);
  if(!answer)return reply({error:'coach_unavailable'},503);
  return reply({ok:true,answer,workspace_version:workspace.data.version,remaining_today:14-count});
 }catch{return reply({error:'coach_unavailable'},503);}
});
