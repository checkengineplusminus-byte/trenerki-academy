import {createClient} from 'npm:@supabase/supabase-js@2.86.0';
import {examAttemptWindow,maxExamQuestions,nextChoice,questionKey,type Choice} from './selection.ts';

const origins=new Set(['https://trenerki.com','https://www.trenerki.com','https://trenerki-academy.expo.app','https://trenerki.academy','https://www.trenerki.academy']);
const trim=(v:unknown,n=200)=>typeof v==='string'?v.trim().slice(0,n):'';
const validSlug=(s:string)=>/^[a-z0-9][a-z0-9_-]{1,79}$/.test(s);
const advancedModuleStart=5;
type Lesson={lesson_no:number;title_pl:string;material:any};
function choiceBank(lessons:Lesson[]):Choice[]{
 const bank:Choice[]=[];
 for(const l of lessons){
  const m=l.material||{},q=m.learning?.options?.length>=2?m.learning:m.construction?.roleplay?.options?.length>=2?m.construction.roleplay:null;
  if(!q||!Array.isArray(q.options))continue;
  const arr=q.options.map((v:any)=>trim(v,450)),correct=Number(q.correct);
  if(arr.length<2||arr.length>6||!arr.every((x:string)=>x.length>0)||new Set(arr).size!==arr.length||!Number.isInteger(correct)||correct<0||correct>=arr.length)continue;
  bank.push({
   lesson_no:l.lesson_no,
   question:trim(m.learning===q?'Sytuacja: '+trim(m.learning.situation,500)+' '+trim(q.question,360):'Zadanie językowe „'+l.title_pl+'”: '+trim(q.question,780),1150),
   expected_answer:trim(arr[correct]+'. '+(q.explanation||q.why||m.learning?.intro||''),1100),
   question_options:arr,correct_option:correct
  });
 }
 return bank;
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 const cors={
  ...(origins.has(origin)?{'access-control-allow-origin':origin}:{}),
  'access-control-allow-headers':'authorization,apikey,content-type,x-client-info,x-retry-count,traceparent,tracestate,baggage',
  'access-control-allow-methods':'POST,OPTIONS','vary':'Origin'
 };
 const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'content-type':'application/json','cache-control':'no-store'}});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return json({error:'method_not_allowed'},405);
 const url=Deno.env.get('SUPABASE_URL'),pub=Deno.env.get('SUPABASE_ANON_KEY'),secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!pub||!secret)return json({error:'service_unavailable'},503);
 const bearer=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!bearer)return json({error:'login_required'},401);
 const auth=createClient(url,pub,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(bearer);
 if(authError||!user?.id||!user.email_confirmed_at)return json({error:'login_required'},401);
 let input:any;try{input=await req.json()}catch{return json({error:'invalid_json'},400)}
 if(!input||typeof input!=='object'||Array.isArray(input))return json({error:'invalid_input'},400);
 const action=trim(input.action,20),slug=trim(input.course_slug,80);
 if(!['status','start','answer','switch_mode'].includes(action)||!validSlug(slug))return json({error:'invalid_input'},400);
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const [enrollmentResult,previewResult,certResult]=await Promise.all([
  db.from('ta_enrollments').select('status').eq('user_id',user.id).eq('course_slug',slug)
    .in('status',['active','demo']).gt('expires_at',new Date().toISOString()).order('status').limit(1),
  db.from('ta_course_previews').select('review_status').eq('course_slug',slug).maybeSingle(),
  db.from('ta_certificates').select('id,certificate_no,holder_name,title_pl,title_en,issued_at,is_demo,revoked_at')
    .eq('user_id',user.id).eq('course_slug',slug).is('revoked_at',null).order('is_demo').order('issued_at',{ascending:false}).limit(1).maybeSingle(),
 ]);
 if(enrollmentResult.error||previewResult.error||certResult.error)return json({error:'db_unavailable'},503);
 const enrollment=enrollmentResult.data?.[0],existingCert=certResult.data;
 const requireReal=enrollment?.status==='active'&&previewResult.data?.review_status==='approved';
 if(existingCert&&(!existingCert.is_demo||!requireReal))return json({ok:true,state:'passed',certificate:existingCert});
 async function issue(sessionId:string,feedback?:string){
  const {data:certificate,error}=await db.rpc('ta_issue_diploma',{p_user:user!.id,p_session:sessionId});
  if(error||!certificate){
   console.error('diploma_issue_failed',error?.code);
   return json({error:'certificate_issue_failed'},503);
  }
  if(certificate.revoked_at)return json({error:'certificate_revoked'},409);
  return json({ok:true,state:'passed',feedback,...(feedback?{answer_correct:true}:{}),certificate,
   message:certificate.is_demo?'Gratulacje, egzamin zaliczony. Twój dyplom jest oznaczony jako wzór testowy.':
    'Gratulacje, egzamin zaliczony. Obie wersje dyplomu są gotowe do pobrania. Przekazaliśmy je też do kolejki wysyłki.'});
 }
 const recoveryQuery=db.from('ta_exam_sessions').select('id').eq('user_id',user.id).eq('course_slug',slug)
   .eq('status','passed').order('updated_at',{ascending:false}).limit(1);
 if(requireReal)recoveryQuery.eq('is_demo',false);
 const {data:passedSession,error:recoveryError}=await recoveryQuery.maybeSingle();
 if(recoveryError)return json({error:'db_unavailable'},503);
 if(passedSession)return issue(passedSession.id);
 if(!enrollment)return json({error:'course_not_owned'},403);
 const {data:lessons,error:le}=await db.from('ta_lessons').select('lesson_no,title_pl,material').eq('course_slug',slug).order('lesson_no');
 if(le||!lessons?.length)return json({error:'lessons_not_found'},404);
 const {count:completed,error:ce}=await db.from('ta_learning_progress').select('lesson_no',{count:'exact',head:true}).eq('user_id',user.id).eq('course_slug',slug);
 if(ce)return json({error:'db_unavailable'},503);
 const ready=(completed||0)>=lessons.length;
 const {data:storedBank,error:bankError}=await db.rpc('ta_private_exam_bank',{p_course:slug});
 if(bankError)return json({error:'db_unavailable'},503);
 const privateBank:Choice[]=(storedBank||[]).flatMap((row:any)=>{
  const question=trim(row.question_text,1150),options=Array.isArray(row.options)?row.options.map((item:unknown)=>trim(item,450)):[];
  const correct=Number(row.correct_option),moduleNo=Number(row.module_no);
  return question&&options.length===4&&options.every(Boolean)&&new Set(options).size===options.length&&Number.isInteger(correct)&&options[correct]
   ?[{lesson_no:moduleNo,advanced:moduleNo>=advancedModuleStart,question,question_options:options,correct_option:correct,expected_answer:trim(row.explanation,1100)}]
   :[];
 });
 const legacyBank=choiceBank(lessons as Lesson[]);
 // Never discard the other 30–63 course lessons just because eight authored
 // exam questions exist. Combine both banks, removing duplicate question stems.
 const seenPrompts=new Set<string>();
 const bank=[...privateBank,...legacyBank].filter(q=>{
  const normalized=questionKey(q.question);
  if(!normalized||seenPrompts.has(normalized))return false;
  seenPrompts.add(normalized);return true;
 });
 const available=bank.length>=maxExamQuestions;
 let {data:session,error:se}=await db.from('ta_exam_sessions').select('*')
 .eq('user_id',user.id).eq('course_slug',slug).eq('status','in_progress').order('created_at',{ascending:false}).limit(1).maybeSingle();
 if(se)return json({error:'db_unavailable'},503);
 if(session&&new Date(session.expires_at).getTime()<Date.now()){
  await db.from('ta_exam_sessions').update({status:'failed',phase:'failed',updated_at:new Date().toISOString()}).eq('id',session.id).eq('status','in_progress');
  session=null;
 }
 async function previousAttempts(sessionId?:string){
  const query=db.from('ta_exam_sessions').select('history,question')
   .eq('user_id',user!.id).eq('course_slug',slug)
   .order('created_at',{ascending:false}).order('id',{ascending:false}).limit(examAttemptWindow-1);
  if(sessionId)query.neq('id',sessionId);
  return query;
 }
 const present=(s:any)=>({ok:true,state:s?'in_progress':ready?'ready':'not_ready',available,completed:completed||0,total:lessons.length,
  session:s?{id:s.id,phase:s.phase,question:s.question,step:s.step,correct:s.correct_count,wrong:s.wrong_count,
  history:(s.history||[]).map((v:any)=>({question:v.question,answer:v.answer,correct:v.correct,feedback:v.feedback})),
  holder_name:s.holder_name,is_demo:s.is_demo,grading_mode:s.grading_mode||'oral',options:(s.grading_mode==='choice'?s.question_options||[]:[])}:null});
 if(session&&session.grading_mode!=='choice'&&ready&&available){
  const {data:previous,error:historyError}=await previousAttempts(session.id);
  if(historyError)return json({error:'db_unavailable'},503);
  const first=nextChoice(bank,session.history||[],session.phase,previous||[]);
  if(!first)return json({error:'question_bank_incomplete'},422);
  const {data:changed,error:e}=await db.from('ta_exam_sessions').update({
   grading_mode:'choice',question:first.question,question_lesson_no:first.lesson_no,
   expected_answer:first.expected_answer,question_options:first.question_options,correct_option:first.correct_option,
   updated_at:new Date().toISOString()
  }).eq('id',session.id).eq('user_id',user.id).eq('status','in_progress').eq('step',session.step)
   .eq('grading_mode',session.grading_mode).select('*').maybeSingle();
  if(e||!changed)return json({error:'exam_switch_failed'},409);
  if(action==='answer')return json({error:'exam_answer_already_submitted'},409);
  session=changed;
 }
 if(action==='status')return json(present(session));
 if(!ready)return json({error:'lessons_incomplete',completed:completed||0,total:lessons.length},403);
 if(!available)return json({error:'question_bank_incomplete'},422);
 if(action==='start'){
  if(session)return json(present(session));
  const name=trim(input.holder_name||user.user_metadata?.full_name,120).replace(/\s+/g,' ');
  if(name.length<3||/[<>\r\n]/.test(name))return json({error:'invalid_holder_name'},400);
  const today=new Date();today.setUTCHours(0,0,0,0);
  const {count:failedAttempts,error:ae}=await db.from('ta_exam_results').select('id',{count:'exact',head:true})
   .eq('user_id',user.id).eq('course_slug',slug).gte('assessed_at',today.toISOString());
  if(ae)return json({error:'db_unavailable'},503);
  if((failedAttempts||0)>=3)return json({error:'exam_daily_limit'},429);
  const {data:previous,error:historyError}=await previousAttempts();
  if(historyError)return json({error:'db_unavailable'},503);
  const first=nextChoice(bank,[],'practice',previous||[]);
  if(!first)return json({error:'question_bank_incomplete'},422);
  const isDemo=!requireReal;
  const {data:s,error:e}=await db.from('ta_exam_sessions').insert({
   user_id:user.id,course_slug:slug,holder_name:name,step:1,correct_count:0,wrong_count:0,phase:'practice',
   question_lesson_no:first.lesson_no,question:first.question,expected_answer:first.expected_answer,
   grading_mode:'choice',question_options:first.question_options,correct_option:first.correct_option,
   history:[],status:'in_progress',is_demo:isDemo
  }).select('*').single();
  if(e?.code==='23505'){
   const {data:active,error:activeError}=await db.from('ta_exam_sessions').select('*')
    .eq('user_id',user.id).eq('course_slug',slug).eq('status','in_progress').maybeSingle();
   if(!activeError&&active)return json(present(active));
  }
  if(e)return json({error:'exam_start_failed'},409);
  return json(present(s));
 }
 if(!session)return json({error:'exam_not_started'},409);
 if(action==='switch_mode')return json(present(session));
 if((input.session_id!==undefined&&input.session_id!==session.id)||(input.step!==undefined&&input.step!==session.step))
  return json({error:'exam_answer_already_submitted'},409);
 if((session.history||[]).length>=12)return json({error:'exam_limit'},409);
 const selected=input.selected_index,opts=session.question_options||[];
 if(!Number.isInteger(selected)||selected<0||selected>=opts.length||!Number.isInteger(session.correct_option))return json({error:'invalid_choice'},400);
 const correct=selected===session.correct_option,answer=trim(opts[selected],450);
 const evaluation={correct,feedback:correct?'To prawidłowy wybór. '+trim(session.expected_answer,440):
  'Ta odpowiedź nie rozwiązuje zadania. Porównaj działanie z wymaganym rezultatem. '+trim(session.expected_answer,400)};
 const correctCount=session.correct_count+(evaluation.correct?1:0);
 const wrongCount=session.wrong_count+(evaluation.correct?0:1);
 let phase=session.phase,status='in_progress';
 if(phase==='practice'){
  if(wrongCount>=3||session.step>=10) {phase='failed';status='failed';}
  else if(correctCount>=5)phase='final';
 }else if(phase==='final'){
  if(evaluation.correct){phase='passed';status='passed';}
  else phase='extra';
 }else if(phase==='extra'){
  phase=evaluation.correct?'passed':'failed';status=phase;
 }
 const history=[...(session.history||[]),{
  lesson_no:session.question_lesson_no,question:session.question,answer,correct:evaluation.correct,feedback:evaluation.feedback,
  correct_option:session.correct_option,answered_at:new Date().toISOString()}];
 let next:Choice|null=null;
 if(status==='in_progress'){
  const {data:previous,error:historyError}=await previousAttempts(session.id);
  if(historyError)return json({error:'db_unavailable'},503);
  next=nextChoice(bank,history,phase,previous||[]);
 }
 if(status==='in_progress'&&!next)return json({error:'question_bank_incomplete'},422);
 const now=new Date().toISOString();
 const {data:changed,error:saveError}=await db.from('ta_exam_sessions').update({
  status,phase,step:session.step+1,correct_count:correctCount,wrong_count:wrongCount,history,
  question:next?.question||null,question_lesson_no:next?.lesson_no??null,
  expected_answer:next?.expected_answer||null,
  question_options:next?.question_options||[],correct_option:next?.correct_option??null,updated_at:now
 }).eq('id',session.id).eq('user_id',user.id).eq('status','in_progress')
 .eq('step',session.step).eq('question',session.question).select('id,step').maybeSingle();
 if(saveError)return json({error:'exam_save_failed'},503);
 if(!changed)return json({error:'exam_answer_already_submitted'},409);
 if(status==='in_progress')return json({ok:true,state:'in_progress',phase,correct:correctCount,wrong:wrongCount,
  feedback:evaluation.feedback,answer_correct:evaluation.correct,question:next?.question,step:session.step+1,
  session_id:session.id,grading_mode:session.grading_mode,options:next?.question_options||[],
  announcement:phase==='final'?'Gratulacje! Widzę, że dałeś radę pięć razy. Jeszcze ostatnie pytanie i dyplom.':
    phase==='extra'?'Ostatnia odpowiedź nie wystarczyła. Masz jeszcze jedną szansę — pokaż, co naprawdę rozumiesz.':null});
 if(status==='passed')return issue(session.id,evaluation.feedback);
 const score=Math.round(correctCount/Math.max(1,history.length)*100);
 const {error:resultError}=await db.from('ta_exam_results').insert({
  user_id:user.id,course_slug:slug,exam_session_id:session.id,score_percent:score,passed:false,assessed_at:now
 });
 if(resultError){console.error('exam_results_insert_failed',resultError.code);return json({error:'exam_result_save_failed'},503);}
 return json({ok:true,state:'failed',feedback:evaluation.feedback,answer_correct:evaluation.correct,correct:correctCount,wrong:wrongCount,
  message:'Tym razem nie udało się zaliczyć. Możesz wrócić do lekcji i spróbować ponownie (do trzech pełnych podejść dziennie).'});
});
