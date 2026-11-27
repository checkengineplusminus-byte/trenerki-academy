import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Image,Linking,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {Link,useLocalSearchParams,useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
import {DocumentDecision} from '../src/accounting/DocumentDecision';
import {AccountingWalkthrough} from '../src/accounting/AccountingWalkthrough';
// @ts-ignore — walidatory czytnika są wspólne z wcześniejszymi lekcjami.
import {checkExercise,sourceURL,glossaryExplanation} from '../src/accounting/reader-core.js';
import {accountingSupplements} from '../src/accounting/topic-supplements.js';
// @ts-ignore — same read-only progress rules as the 100-topic programme.
import {buildCorePracticeProgress} from '../src/accounting/core-progress.js';
// @ts-ignore — pure homework validation; authority remains the Supabase RPC.
import {homeworkCanSubmit,homeworkSubmitted,homeworkVersion} from '../src/accounting/homework-core.js';
// @ts-ignore — offline, deterministic formative checks; not a grade.
import {draftGuidance} from '../src/accounting/homework-feedback.js';
// @ts-ignore — pure CSV template; no answers, private records, or keys are exported.
import {buildHomeworkCsv,homeworkSheetFilename} from '../src/accounting/homework-worksheet.js';
// @ts-ignore — only suggests the correct existing tab; auth remains server-side.
import {recommendedLabTab,LAB_TAB_NAMES} from '../src/accounting/lab-navigation.js';
// @ts-ignore — strictly validates in-house generated and locally bundled photo IDs.
import {topicPhotoAssetId} from '../src/accounting/topic-media.js';

type Lesson={topic_no:number;title_pl:string;learning_goal:string;editorial_status:string;legal_as_of:string|null;material:any;body_text:string};
type LearningStep='learn'|'example'|'practice'|'homework'|'summary';
const LESSON_STEPS:{id:LearningStep;icon:string;label:string;hint:string}[]=[
 {id:'learn',icon:'📗',label:'Poznaj',hint:'Zrozum temat'},
 {id:'example',icon:'💡',label:'Przykład',hint:'Zobacz rozwiązanie'},
 {id:'practice',icon:'✍️',label:'Ćwicz',hint:'Odpowiedz tutaj'},
 {id:'homework',icon:'🧰',label:'Zadanie',hint:'Wpisz własną pracę'},
 {id:'summary',icon:'✅',label:'Sprawdź',hint:'Podsumuj wyniki'},
];
const BEGINNER_GUIDES:Record<number,{intro:string;items:{icon:string;title:string;description:string}[]}>={
 1:{intro:'Najpierw ustalamy, czyj jest dokument. Dopiero później zajmiemy się kwotami i księgowaniem.',items:[
  {icon:'👤',title:'JDG',description:'Jednoosobowa działalność gospodarcza — firmę prowadzi konkretna osoba fizyczna.'},
  {icon:'🏢',title:'Spółka z o.o.',description:'Spółka jest odrębnym podmiotem. Faktura wystawiona na jej wspólnika nie staje się automatycznie fakturą spółki.'},
  {icon:'🤝',title:'Fundacja',description:'Organizacja z własnymi dokumentami i celami. Jej pieniądze nie są prywatnymi środkami członków zarządu.'}
 ]},
 2:{intro:'Jedna faktura może mieć kilka ważnych dat. Zanim zrobisz zapis, dowiedz się, kiedy nastąpiło zdarzenie.',items:[
  {icon:'📦',title:'Zdarzenie',description:'Co rzeczywiście się stało, np. firma odebrała towar.'},
  {icon:'🧾',title:'Dokument',description:'Dowód opisujący zdarzenie, np. faktura — ma własną datę.'},
  {icon:'💳',title:'Płatność',description:'Dzień zapłaty może być inny niż dzień dostawy i wystawienia faktury.'}
 ]},
 3:{intro:'Najpierw rozpoznaj majątek firmy oraz skąd pochodziły pieniądze na jego zakup.',items:[
  {icon:'📦',title:'Aktywa',description:'To, co firma posiada lub jej się należy, np. środki na rachunku i należności.'},
  {icon:'🧮',title:'Zobowiązania',description:'Kwoty, które firma ma zapłacić innym osobom lub firmom.'},
  {icon:'⚖️',title:'Bilans',description:'Porównuje majątek firmy ze źródłami jego finansowania.'}
 ]}
};
// Static require() is intentionally used for Expo Web, Android and iOS bundling.
// Assets never come from externally supplied URLs or user-generated HTML.
const GENERATED_PHOTO_ASSETS:Record<string,number>=Object.freeze({
 'accounting-desk-01':require('../assets/accounting/generated/accounting-desk-01.webp'),
 'accounting-archive-02':require('../assets/accounting/generated/accounting-archive-02.webp'),
 'accounting-sales-document-2026':require('../assets/accounting/generated/accounting-sales-document-2026.webp'),
 'accounting-digital-receipt-2026':require('../assets/accounting/generated/accounting-digital-receipt-2026.webp'),
 'accounting-advance-and-settlement-2026':require('../assets/accounting/generated/accounting-advance-and-settlement-2026.webp'),
 'accounting-invoice-correction-2026':require('../assets/accounting/generated/accounting-invoice-correction-2026.webp'),
 'accounting-retail-close-2026':require('../assets/accounting/generated/accounting-retail-close-2026.webp'),
 'accounting-stock-receipt-2026':require('../assets/accounting/generated/accounting-stock-receipt-2026.webp'),
 'accounting-purchase-match-2026':require('../assets/accounting/generated/accounting-purchase-match-2026.webp'),
});
function SectionPhoto({photo}:{photo:any}){
 const assetId=topicPhotoAssetId(photo);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{setFailed(false);},[assetId]);
 const source=assetId?GENERATED_PHOTO_ASSETS[assetId]:null;
 if(!source||failed)return null;
 return <Image accessible accessibilityLabel={photo.alt} source={source} onError={()=>setFailed(true)} resizeMode="cover" style={s.sectionPhoto}/>;
}
type Answer={exercise_id:string;answer:string};
type Homework={response:string;version:number;submitted_at:string|null;updated_at:string}|null;
type CoachResult={ok:true;verdict:'needs_revision'|'possibly_ready'|'uncertain';reply:string;next_step:string;agent_online?:boolean;math_error?:boolean};
type CoachMessage=CoachResult&{mode:'hint'|'review'};
function Task({exercise,topicNo,userId,initial,onSaved}:{exercise:any;topicNo:number;userId:string;initial:string;onSaved:(id:string,answer:string)=>void}){
 const [answer,setAnswer]=useState(initial),[feedback,setFeedback]=useState<any>(null);
 const [saving,setSaving]=useState(false),[saved,setSaved]=useState(false),[saveError,setSaveError]=useState('');
 const [hint,setHint]=useState(''),[hintBusy,setHintBusy]=useState(false),[hintError,setHintError]=useState('');
 const lock=useRef(false),hintLock=useRef(false);
 const change=(v:string)=>{setAnswer(v);setFeedback(null);setSaved(false);setSaveError('');};
 async function askQuizHint(){
  if(hintLock.current||typeof exercise?.id!=='string')return;
  hintLock.current=true;setHintBusy(true);setHintError('');
  try{
   const {data,error:requestError}=await supabase.functions.invoke<{ok?:boolean;reply?:string}>('ta-accounting-lesson-coach',{
    body:{topic_no:topicNo,mode:'hint',exercise_id:exercise.id}
   });
   if(requestError||!data?.ok||!data.reply)throw new Error('Anielka jest chwilowo niedostępna. Możesz nadal ćwiczyć i poprawiać odpowiedź.');
   setHint(data.reply);
  }catch(e:any){setHintError(String(e?.message||'Nie udało się pobrać wskazówki.'))}
  finally{hintLock.current=false;setHintBusy(false);}
 }
 async function check(){
  if(lock.current)return;
  const result=checkExercise(exercise,answer);
  setFeedback(result);setSaved(false);setSaveError('');
  if(!result.valid)return;
  lock.current=true;setSaving(true);
  try{
   const write=await supabase.from('ta_accounting_core_answers_v3').upsert(
    {user_id:userId,topic_no:topicNo,exercise_id:exercise.id,answer,updated_at:new Date().toISOString()},
    {onConflict:'user_id,topic_no,exercise_id'}
   ).select('updated_at').single();
   if(write.error)throw write.error;
   setSaved(true);
   onSaved(exercise.id,answer);
  }catch{setSaveError('Odpowiedź została sprawdzona lokalnie, ale nie zapisała się na koncie. Spróbuj ponownie.');}
  finally{lock.current=false;setSaving(false);}
 }
 return <View style={s.task}>
  <Text style={s.body}>{exercise.prompt}</Text>
  {exercise.type==='choice'?(exercise.choices||[]).map((option:string,i:number)=><Pressable key={i} accessibilityRole="radio" accessibilityState={{checked:answer===String(i)}} disabled={saving} onPress={()=>change(String(i))} style={[s.option,answer===String(i)&&s.selected]}>
   <Text style={s.body}>{option}</Text>
  </Pressable>):<View style={s.row}>
   <TextInput accessibilityLabel="Odpowiedź liczbowa" editable={!saving} value={answer} onChangeText={change} inputMode="decimal" maxLength={100} placeholder="Wpisz wynik" style={s.input}/>
   <Text style={s.small}>{exercise.unit||''}</Text>
  </View>}
  <View style={s.coachActions}>
   <Pressable accessibilityRole="button" disabled={hintBusy||saving} onPress={()=>void askQuizHint()} style={s.coachButton}>
    <Text style={s.coachButtonText}>{hintBusy?'Anielka wyjaśnia…':'💡 Anielka — wyjaśnij pytanie'}</Text>
   </Pressable>
   <Pressable disabled={saving} accessibilityRole="button" onPress={()=>void check()} style={[s.homeworkButton,s.homeworkButtonPrimary]}>
    <Text style={s.homeworkButtonPrimaryText}>{saving?'Zapisywanie…':'Sprawdź odpowiedź →'}</Text>
   </Pressable>
  </View>
  {!!hint&&<View style={s.coachFeedback}><Text style={s.label}>💬 Anielka podpowiada</Text><Text style={s.bodySmall}>{hint}</Text><Text style={s.small}>Ta wskazówka nie zalicza ćwiczenia.</Text></View>}
  {!!hintError&&<Text accessibilityRole="alert" style={s.warning}>{hintError}</Text>}
  {feedback&&<View accessibilityLiveRegion="polite" style={feedback.valid?s.notice:s.warning}>
   <Text style={s.label}>{!feedback.valid?feedback.message:feedback.correct?'Poprawnie!':'To jeszcze nie jest poprawny wynik.'}</Text>
   {feedback.valid&&<Text style={s.body}>{feedback.explanation}</Text>}
   {feedback.valid&&!feedback.correct&&<Text style={s.bodySmall}>Ta odpowiedź nie zalicza ćwiczenia. Popraw ją albo poproś Anielkę o wskazówkę.</Text>}
  </View>}
  {saved&&<Text style={s.small}>Odpowiedź zapisana na Twoim koncie. Możesz wrócić i zmienić ją później.</Text>}
  {!!saveError&&<Text accessibilityRole="alert" style={s.warning}>{saveError}</Text>}
 </View>;
}
export default function TematKsiegowosci(){
 const params=useLocalSearchParams<{temat?:string}>(),router=useRouter();
 const raw=typeof params.temat==='string'?params.temat:'',topic=/^(?:[1-9]|[1-9][0-9]|100)$/.test(raw)?Number(raw):null;
 const [lesson,setLesson]=useState<Lesson|null>(null);
 const [answers,setAnswers]=useState<Record<string,string>>({});
 const [userId,setUserId]=useState('');
 const [homework,setHomework]=useState<Homework>(null);
 const [homeworkText,setHomeworkText]=useState('');
 const [coachMessage,setCoachMessage]=useState<CoachMessage|null>(null);
 const [coachDraft,setCoachDraft]=useState('');
 const [coachBusy,setCoachBusy]=useState(false),[coachError,setCoachError]=useState('');
 const homeworkTextRef=useRef(''),saveLock=useRef(false),coachLock=useRef(false);
 const [homeworkReady,setHomeworkReady]=useState(false);
 const [homeworkBusy,setHomeworkBusy]=useState(false);
 const [homeworkError,setHomeworkError]=useState('');
 const [homeworkMessage,setHomeworkMessage]=useState('');
 const [busy,setBusy]=useState(true),[error,setError]=useState(''),[warning,setWarning]=useState('');
 const [step,setStep]=useState<LearningStep>('learn');
 const [sectionIndex,setSectionIndex]=useState(0),[exampleIndex,setExampleIndex]=useState(0),[quizIndex,setQuizIndex]=useState(0);
 const [introComplete,setIntroComplete]=useState(false);
 const [showExtraHomework,setShowExtraHomework]=useState(false),[showGlossary,setShowGlossary]=useState(false),[showSources,setShowSources]=useState(false);
 const [workshopIndex,setWorkshopIndex]=useState<number|null>(null);
 const [showFacts,setShowFacts]=useState(false);
 const scroll=useRef<React.ComponentRef<typeof ScrollView>>(null);
 const serial=useRef(0),owner=useRef('');
 const load=useCallback(async()=>{
  const run=++serial.current;setBusy(true);setLesson(null);setError('');setWarning('');setAnswers({});setHomework(null);setHomeworkText('');homeworkTextRef.current='';setHomeworkReady(false);setHomeworkError('');setHomeworkMessage('');
  setCoachMessage(null);setCoachDraft('');setCoachBusy(false);setCoachError('');
  try{
   if(topic===null)throw new Error('Nieprawidłowy numer tematu.');
   const u=await supabase.auth.getUser();
   if(run!==serial.current)return;
   if(u.error||!u.data.user){router.replace('/konto');return;}
   owner.current=u.data.user.id;setUserId(owner.current);
   const overview=await supabase.rpc('ta_accounting_overview');
   if(run!==serial.current)return;
   if(overview.error)throw new Error('Ten temat wymaga dostępu do kursu lub uprawnień właściciela.');
   const r=await supabase.from('ta_accounting_core_materials_v3')
     .select('topic_no,title_pl,learning_goal,editorial_status,legal_as_of,material,body_text').eq('topic_no',topic).maybeSingle();
   if(run!==serial.current)return;
   if(r.error)throw new Error('Nie udało się odczytać opracowania. Spróbuj ponownie.');
   if(!r.data)throw new Error('Ten temat nie ma jeszcze udostępnionej lekcji. Wróć do programu.');
   setLesson(r.data as Lesson);
   const a=await supabase.from('ta_accounting_core_answers_v3').select('exercise_id,answer')
     .eq('user_id',owner.current).eq('topic_no',topic);
   if(run!==serial.current)return;
   if(a.error)throw new Error('Nie udało się odczytać poprzednich odpowiedzi; zapis nowych jest wstrzymany, aby ich nie nadpisać.');
   setAnswers(Object.fromEntries(((a.data||[]) as Answer[]).map(v=>[v.exercise_id,v.answer])));
   const h=await supabase.from('ta_accounting_core_homework_v3')
     .select('response,version,submitted_at,updated_at')
     .eq('user_id',owner.current).eq('topic_no',topic).maybeSingle();
   if(run!==serial.current)return;
   if(h.error)throw new Error('Nie udało się odczytać pracy domowej. Zapis jest zablokowany, aby nie nadpisać wcześniejszej wersji.');
   setHomework((h.data||null) as Homework);
   setHomeworkText(h.data?.response||'');homeworkTextRef.current=h.data?.response||'';
   setHomeworkReady(true);
  }catch(e:any){if(run===serial.current)setError(e?.message||'Błąd odczytu lekcji.');}
  finally{if(run===serial.current)setBusy(false);}
 },[topic,router]);
 useEffect(()=>{setStep('learn');setSectionIndex(0);setExampleIndex(0);setQuizIndex(0);setIntroComplete(false);setShowExtraHomework(false);setShowGlossary(false);setShowSources(false);setShowFacts(false);setWorkshopIndex(null);},[topic]);
 useEffect(()=>{void load();return()=>{++serial.current;};},[load]);
 useEffect(()=>{
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
   if(owner.current && owner.current!==(session?.user?.id||'')){
    ++serial.current;owner.current='';setLesson(null);setAnswers({});setHomework(null);setHomeworkText('');homeworkTextRef.current='';setCoachMessage(null);setCoachDraft('');setCoachError('');setHomeworkReady(false);setUserId('');router.replace('/konto');
   }
  });
  return()=>subscription.unsubscribe();
 },[router]);
 async function askAnielka(mode:'hint'|'review'):Promise<CoachResult|null>{
  const draft=homeworkTextRef.current.trim();
  if(topic===null||!lesson||!userId||owner.current!==userId||coachLock.current)return null;
  const local=draftGuidance(draft);
  if(mode==='review'&&local.kind==='math_error'){
   const result:CoachResult={ok:true,verdict:'needs_revision',reply:local.message,next_step:'Popraw obliczenie, opisz dane i sprawdź ponownie.',agent_online:false,math_error:true};
   setCoachMessage({...result,mode});setCoachDraft(draft);setCoachError('');
   return result;
  }
  if(mode==='review'&&local.kind==='empty'){
   const result:CoachResult={ok:true,verdict:'needs_revision',reply:local.message,next_step:'Wpisz choć jedną próbę rozwiązania.',agent_online:false};
   setCoachMessage({...result,mode});setCoachDraft(draft);setCoachError('');
   return result;
  }
  coachLock.current=true;setCoachBusy(true);setCoachError('');
  const run=serial.current;
  try{
   const {data,error:invokeError}=await supabase.functions.invoke<CoachResult>('ta-accounting-lesson-coach',{
    body:{topic_no:topic,mode,draft:draft.slice(0,3200)}
   });
   if(invokeError||!data?.ok||typeof data.reply!=='string'){
    let code='coach_unavailable';
    try{const context=(invokeError as any)?.context;if(context?.json)code=String((await context.json())?.error||code);}catch{}
    const mapped:Record<string,string>={
     daily_limit:'Anielka ma dziś wykorzystany limit rozmów. Możesz nadal zapisać pracę i skorzystać z przykładów w lekcji.',
     omit_personal_identifiers:'Nie wysyłaj Anielce prawdziwych adresów, e-maili, numerów dokumentów ani danych klientów. Użyj fikcyjnego przykładu.',
     lesson_not_available:'Nie udało się potwierdzić dostępu do tej lekcji. Odśwież stronę po zalogowaniu.',
     retry_request:'Dwa sprawdzenia uruchomiły się równocześnie. Spróbuj ponownie.',
     coach_unavailable:'Anielka jest chwilowo niedostępna. Zapis szkicu i zwykłe ćwiczenia nadal działają.'
    };
    throw new Error(mapped[code]||mapped.coach_unavailable);
   }
   if(run!==serial.current||draft!==homeworkTextRef.current.trim())return null;
   setCoachMessage({...data,mode});setCoachDraft(draft);
   return data;
  }catch(e:any){
   if(run===serial.current)setCoachError(String(e?.message||'Anielka jest chwilowo niedostępna.'));
   return null;
  }finally{coachLock.current=false;if(run===serial.current)setCoachBusy(false);}
 }
 async function saveHomework(submit:boolean){
  if(saveLock.current||homeworkBusy||!homeworkReady||busy||topic===null||!lesson||!userId||owner.current!==userId)return;
  setHomeworkError('');setHomeworkMessage('');
  const local=draftGuidance(homeworkText);
  if(submit&&(!homeworkCanSubmit(homeworkText)||local.blocksSubmit)){
   setHomeworkError(local.message);
   return;
  }
  const run=serial.current,activeUser=userId;
  saveLock.current=true;setHomeworkBusy(true);
  let notReviewed=false;
  try{
   if(submit){
    let currentReview=coachDraft===homeworkText.trim()&&coachMessage?.mode==='review'?coachMessage:null;
    if(!currentReview){
     currentReview=await askAnielka('review') as CoachMessage|null;
     if(!currentReview)notReviewed=true;
    }
    if(run!==serial.current||owner.current!==activeUser)return;
    if(currentReview?.verdict==='needs_revision'){
     setHomeworkError('Anielka wskazała błąd lub brak w pracy. Popraw próbę i sprawdź ją ponownie przed oddaniem.');
     return;
    }
   }
   const answer=await supabase.rpc('ta_accounting_core_homework_save',{
    p_topic_no:topic,p_response:homeworkText,p_submit:submit,
    p_expected_version:homeworkVersion(homework)
   });
   if(run!==serial.current||owner.current!==activeUser)return;
   if(answer.error||!answer.data||answer.data.user_id!==activeUser||answer.data.topic_no!==topic)
    throw new Error(answer.error?.message||'Serwer nie potwierdził zapisu Twojej pracy. Zachowaj tekst przed odświeżeniem.');
   setHomework(answer.data as Homework);
   const note=notReviewed?' Anielka nie mogła sprawdzić treści, dlatego porównaj wynik z przykładem i skontroluj obliczenia.':'';
   setHomeworkMessage(submit?'Praca zapisana jako oddana do samokontroli. Nie jest to ocena ani zaliczenie kursu.'+note:
    'Szkic zapisany na Twoim koncie. '+(local.kind==='math_error'?'Uwaga: '+local.message:'Możesz poprosić Anielkę o wskazówkę.'));
  }catch(err:any){
   if(run===serial.current)setHomeworkError((err?.code==='40001'?
     'Konflikt wersji — ktoś zapisał nowszą pracę w drugim oknie. Skopiuj własny tekst przed odświeżeniem. ':
     'Nie udało się zapisać pracy. Skopiuj tekst przed odświeżeniem. ')+(err?.message||''));
  }finally{saveLock.current=false;if(run===serial.current)setHomeworkBusy(false);}
 }
 function downloadHomeworkWorksheet(){
  if(topic===null||!lesson||!lesson.material?.practice)return;
  if(Platform.OS!=='web'||typeof document==='undefined'||typeof window==='undefined'){
   setHomeworkError('Arkusz CSV pobierzesz po otwarciu kursu w przeglądarce.');
   return;
  }
  try{
   const csv=buildHomeworkCsv(topic,lesson.title_pl,lesson.material.practice);
   const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
   const url=URL.createObjectURL(blob);
   const a=document.createElement('a');
   a.href=url;a.download=homeworkSheetFilename(topic);a.style.display='none';
   document.body.appendChild(a);
   a.click();a.remove();
   window.setTimeout(()=>URL.revokeObjectURL(url),5000);
   setHomeworkError('');
  }catch{
   setHomeworkError('Nie można przygotować arkusza. Skorzystaj z polecenia wyświetlonego w lekcji.');
  }
 }
 const m=lesson?.material||{};
 const extras=React.useMemo(()=>accountingSupplements(lesson?.material),[lesson?.material]);
 const savedRows=topic!==null?Object.entries(answers).map(([exercise_id,answer])=>({topic_no:topic,exercise_id,answer})):[];
 const progress=buildCorePracticeProgress(
  topic!==null&&lesson?[{topic_no:topic,status:lesson.editorial_status}]:[],
  topic!==null&&lesson?[{topic_no:topic,material:m}]:[],
  savedRows,{materialsReady:!!lesson,answersReady:!!userId});
 const sectionProgress=topic!==null?progress.byTopic[topic]:null;
 const hasHomework=homeworkReady&&homeworkSubmitted(homework)&&homeworkText===homework?.response;
 const nextReady=sectionProgress?.passed===true&&hasHomework;
 const draftCheck=draftGuidance(homeworkText);
 const currentCoachMessage=coachDraft===homeworkText.trim()?coachMessage:null;

 const sections=Array.isArray(m.sections)?m.sections:[];
 const currentSection=sections[Math.min(sectionIndex,Math.max(0,sections.length-1))];
 const examples=Array.isArray(m.examples)?m.examples:[];
 const example=examples[exampleIndex];
 const tables=Array.isArray(m.tables)?m.tables:[];
 const currentTable=tables[exampleIndex];
 const exercises=Array.isArray(m.exercises)?m.exercises:[];
 const currentExercise=exercises[Math.min(quizIndex,Math.max(0,exercises.length-1))];
 const guide=topic===null?null:BEGINNER_GUIDES[topic]||null;
 const position=LESSON_STEPS.findIndex(v=>v.id===step);
 function goStep(next:LearningStep){
  setStep(next);
  scroll.current?.scrollTo({y:0,animated:false});
 }
 function changePart(kind:'section'|'example'|'quiz',next:number){
  if(kind==='section')setSectionIndex(next);
  if(kind==='example')setExampleIndex(next);
  if(kind==='quiz')setQuizIndex(next);
  scroll.current?.scrollTo({y:0,animated:false});
 }
 return <ScrollView ref={scroll} style={s.page} contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
  <View style={s.topBar}><Link href="/program-ksiegowosci" style={s.link}>← Program kursu</Link><Text style={s.small}>Temat {topic||'—'} / 100</Text></View>
  {busy&&<ActivityIndicator accessibilityLabel="Odczytywanie lekcji"/>}
  {!!error&&<Text accessibilityRole="alert" style={s.warning}>{error}</Text>}
  {!!warning&&<Text style={s.warning}>{warning}</Text>}
  {!busy&&lesson&&!error&&<View style={s.lessonBody}>
   <View style={s.lessonHero}>
    <Text style={s.heroKicker}>KSIĘGOWOŚĆ · TEMAT {lesson.topic_no}</Text>
    <Text accessibilityRole="header" style={s.lessonTitle}>{lesson.topic_no===1?'Zacznijmy od podstaw: czyj to dokument?':lesson.title_pl}</Text>
    <Text style={s.lessonGoal}>{lesson.topic_no===1?'Na początku wystarczy odróżnić osobę prowadzącą firmę, spółkę i fundację.':lesson.learning_goal}</Text>
   </View>
   <View style={s.stepRail}>
    {LESSON_STEPS.map((item,i)=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label+' — '+item.hint} accessibilityState={{selected:step===item.id}} aria-current={step===item.id?"step":undefined}
     onPress={()=>goStep(item.id)} style={[s.stepTile,step===item.id&&s.stepTileActive]}>
     <Text style={[s.stepTitle,step===item.id&&s.stepTitleActive]}>{i+1}. {item.label}</Text>
    </Pressable>)}
   </View>
   <Text style={s.stepIntroHint}>Krok {position+1} z 5 · {LESSON_STEPS[position]?.hint}</Text>
   {step==='learn'&&<View style={s.stageBody}>
    {!introComplete&&m.document_decision&&<DocumentDecision key={lesson.topic_no} value={m.document_decision}/>}
    {!introComplete&&<View style={s.card}>
     <Text style={s.h2}>Najpierw zrozum, o co chodzi</Text>
     {guide&&<Text style={s.body}>{guide.intro}</Text>}
     {!guide&&<Text style={s.body}>Zaczynamy bez sprawdzianu. Zobacz najważniejsze pojęcia, a następnie poznaj krótkie części tematu.</Text>}
     {guide&&<View style={s.primerList}>{guide.items.map((item,i)=><View key={i} style={s.primerCard}>
      <Text style={s.primerIcon}>{item.icon}</Text>
      <View style={{flex:1,gap:4}}><Text style={s.label}>{item.title}</Text><Text style={s.bodySmall}>{item.description}</Text></View>
     </View>)}</View>}
     {!guide&&(m.glossary||[]).slice(0,3).map((g:any,i:number)=><View key={i} style={s.wordRow}><Text style={s.label}>{g.term}:</Text><Text style={s.bodySmall}>{glossaryExplanation(g)}</Text></View>)}
     {!guide&&<Text style={s.bodySmall}>{m.intro||lesson.body_text}</Text>}
    </View>}
    {!introComplete&&m.walkthrough&&<AccountingWalkthrough key={lesson.topic_no} value={m.walkthrough}/>}
    {introComplete&&currentSection&&<View style={s.card}>
     <Text style={s.eyebrowDark}>CZĘŚĆ {sectionIndex+1} / {sections.length}</Text>
     <Text accessibilityRole="header" style={s.h2}>{String(currentSection.heading||'Poznaj temat').replace(/^\d+\.\s*/,'')}</Text>
     {guide&&sectionIndex===0&&<Text style={s.bodySmall}>{m.intro||lesson.body_text}</Text>}
     {(currentSection.paragraphs||[]).filter((p:string)=>!(currentSection.curiosity?.text&&p.startsWith('Ciekawostka:')&&p.includes(currentSection.curiosity.text))).map((p:string,i:number)=><Text key={i} selectable style={s.body}>{p}</Text>)}
     {typeof currentSection.curiosity?.text==='string'&&!!currentSection.curiosity.text.trim()&&<View style={s.curiosityBox}>
      <Text style={s.curiosityTitle}>💡 Ciekawostka</Text><Text style={s.body}>{currentSection.curiosity.text}</Text>
     </View>}
     <SectionPhoto photo={currentSection.photo}/>
    </View>}
    <View style={s.nextControls}>
     {!introComplete?<Pressable accessibilityRole="button" style={s.primaryButton} onPress={()=>{setIntroComplete(true);scroll.current?.scrollTo({y:0,animated:false});}}><Text style={s.primaryButtonText}>Rozumiem — pokaż pierwszą część →</Text></Pressable>:
      <>
       {sectionIndex===0&&<Pressable accessibilityRole="button" style={s.backButton} onPress={()=>{setIntroComplete(false);scroll.current?.scrollTo({y:0,animated:false});}}><Text style={s.buttonText}>← Podstawy</Text></Pressable>}
       {sectionIndex>0&&<Pressable accessibilityRole="button" style={s.backButton} onPress={()=>changePart('section',sectionIndex-1)}><Text style={s.buttonText}>← Poprzednia część</Text></Pressable>}
       {sectionIndex<sections.length-1?<Pressable accessibilityRole="button" style={s.primaryButton} onPress={()=>changePart('section',sectionIndex+1)}><Text style={s.primaryButtonText}>Następna część →</Text></Pressable>:
        <Pressable accessibilityRole="button" style={s.primaryButton} onPress={()=>goStep('example')}><Text style={s.primaryButtonText}>Zobacz przykład →</Text></Pressable>}
      </>}
    </View>
   </View>}
   {step==='example'&&<View style={s.stageBody}>
    <Text style={s.bodySmall}>Przykłady są już rozwiązane. Najpierw zobacz tok rozumowania — własną odpowiedź wpiszesz dopiero w kroku „Ćwicz”.</Text>
    {example&&<View style={s.card}>
     <Text style={s.eyebrowDark}>PRZYKŁAD {exampleIndex+1} / {examples.length}</Text>
     <Text accessibilityRole="header" style={s.h2}>{example.title}</Text>
     {(example.steps||[]).map((part:string,i:number)=><View key={i} style={s.guidedStep}><Text style={s.guidedNumber}>{i+1}</Text><Text style={[s.body,{flex:1}]}>{part}</Text></View>)}
     <View style={s.resultBox}><Text style={s.label}>Wynik przykładu</Text><Text style={s.body}>{example.result}</Text></View>
    </View>}
    {currentTable&&<View style={s.card}><Text style={s.h2}>Tabela do przykładu</Text><Text style={s.label}>{currentTable.title}</Text>
     <ScrollView horizontal><View><View style={s.tableRow}>{(currentTable.columns||[]).map((v:string,i:number)=><Text key={i} style={[s.cell,s.headCell]}>{v}</Text>)}</View>
      {(currentTable.rows||[]).map((row:any[],i:number)=><View key={i} style={s.tableRow}>{row.map((value:any,j:number)=><Text key={j} style={s.cell}>{String(value)}</Text>)}</View>)}
     </View></ScrollView>
    </View>}
    {extras.workshops.length>0&&<View style={s.card} testID="accounting-workshops">
     <Text accessibilityRole="header" style={s.h2}>Warsztaty krok po kroku</Text>
     {extras.workshops.map((w,i)=><View key={i} style={s.gloss}>
       <Pressable accessibilityRole="button" accessibilityState={{expanded:workshopIndex===i}}
         onPress={()=>setWorkshopIndex(workshopIndex===i?null:i)} style={s.accordionButton}>
         <Text style={[s.label,{flex:1}]}>{w.title}</Text><Text style={s.label}>{workshopIndex===i?'−':'+'}</Text>
       </Pressable>
       {workshopIndex===i&&<View style={{gap:10}}>
         {w.steps.map((line,j)=><View key={j} style={s.guidedStep}><Text style={s.guidedNumber}>{j+1}</Text><Text selectable style={[s.body,{flex:1}]}>{line.replace(/^\d+[.)]\s+/,'')}</Text></View>)}
         {!!w.result&&<View style={s.resultBox}><Text style={s.label}>Wynik warsztatu</Text><Text selectable style={s.body}>{w.result}</Text></View>}
       </View>}
     </View>)}
    </View>}
    <View style={s.nextControls}>
     {exampleIndex>0&&<Pressable accessibilityRole="button" style={s.backButton} onPress={()=>changePart('example',exampleIndex-1)}><Text style={s.buttonText}>← Poprzedni przykład</Text></Pressable>}
     {exampleIndex<Math.max(examples.length,tables.length)-1?<Pressable accessibilityRole="button" style={s.primaryButton} onPress={()=>changePart('example',exampleIndex+1)}><Text style={s.primaryButtonText}>Następny przykład →</Text></Pressable>:
      <Pressable accessibilityRole="button" style={s.primaryButton} onPress={()=>goStep('practice')}><Text style={s.primaryButtonText}>Teraz spróbuj sam →</Text></Pressable>}
    </View>
   </View>}
   {step==='practice'&&<View style={s.stageBody}>
    <View style={s.card}>
     <Text style={s.h2}>Tu rozwiązujesz ćwiczenia</Text>
     <Text style={s.bodySmall}>Wybierz odpowiedź albo wpisz liczbę w pole poniżej. Następnie naciśnij „Sprawdź i zapisz odpowiedź”. Własne próby są zapisywane na Twoim koncie.</Text>
     <Text style={s.eyebrowDark}>ĆWICZENIE {exercises.length?quizIndex+1:0} Z {(m.exercises||[]).length}</Text>
     {currentExercise?<Task key={String(currentExercise.id)} exercise={currentExercise} topicNo={lesson.topic_no} userId={userId} initial={answers[currentExercise.id]||''} onSaved={(id,answer)=>setAnswers(old=>({...old,[id]:answer}))}/>:<Text style={s.body}>W tym temacie nie ma ćwiczeń do zapisania.</Text>}
    </View>
    <View style={s.nextControls}>
     {quizIndex>0&&<Pressable accessibilityRole="button" style={s.backButton} onPress={()=>changePart('quiz',quizIndex-1)}><Text style={s.buttonText}>← Poprzednie ćwiczenie</Text></Pressable>}
     {quizIndex<exercises.length-1?<Pressable accessibilityRole="button" style={s.primaryButton} onPress={()=>changePart('quiz',quizIndex+1)}><Text style={s.primaryButtonText}>Następne ćwiczenie →</Text></Pressable>:
      <Pressable accessibilityRole="button" style={s.primaryButton} onPress={()=>goStep('homework')}><Text style={s.primaryButtonText}>Przejdź do pracy domowej →</Text></Pressable>}
    </View>
   </View>}
   {step==='homework'&&<View style={s.stageBody}>
    <View style={s.guideNotice}><Text style={s.label}>📝 Gdzie wpisać rozwiązanie?</Text><Text style={s.bodySmall}>W polu „Twoje rozwiązanie” poniżej. Możesz wcześniej skorzystać z biura ćwiczeniowego lub pliku CSV, ale zadanie oddajesz właśnie tutaj. „Zapisz szkic” nie oznacza oddania pracy.</Text></View>
   {m.practice&&<View style={s.practice}>
    <Text style={s.eyebrowDark}>SAMODZIELNA PRACA · TEMAT {lesson.topic_no}</Text>
    <Text style={s.h2}>Wykonaj zadanie krok po kroku</Text>
    <Text style={s.small}>Twoja rola: {m.practice.role}</Text>
    <Text style={s.body}>{m.practice.task}</Text>
    <View style={s.guideNotice}><Text style={s.label}>👇 Tu oddajesz rozwiązanie</Text><Text style={s.bodySmall}>Wpisz niżej własne obliczenia i wnioski, a potem wybierz „Zapisz szkic” albo „Oddaj pracę domową”.</Text></View>
    {!homeworkReady?<Text style={s.warning}>Nie potwierdzono jeszcze odczytu Twojej wcześniejszej pracy. Zapis jest wyłączony.</Text>:<>
     <Text style={s.h2}>✍️ Tutaj wpisz swoją pracę</Text>
     <TextInput accessibilityLabel="Rozwiązanie pracy domowej" multiline textAlignVertical="top" maxLength={10000}
      editable={!homeworkBusy} value={homeworkText} onChangeText={value=>{homeworkTextRef.current=value;setHomeworkText(value);setHomeworkMessage('');setHomeworkError('');setCoachMessage(null);setCoachDraft('');setCoachError('');}}
      placeholder="Opisz własnymi słowami: co sprawdziłeś, co obliczyłeś, jaki otrzymałeś wynik i dlaczego."
      style={s.homeworkInput}/>
     <Text style={s.small}>{homeworkText.trim().length} znaków · minimum 120 do oddania. Szkic można zapisać wcześniej.</Text>
     {homeworkText.trim().length>0&&draftCheck.blocksSubmit&&<View accessibilityLiveRegion="polite" style={[s.coachFeedback,draftCheck.kind==='math_error'?s.coachErrorBox:s.coachSoftBox]}>
      <Text style={s.label}>{draftCheck.kind==='math_error'?'⚠️ Błąd w obliczeniu':'📝 Uzupełnij swoją próbę'}</Text>
      <Text style={s.bodySmall}>{draftCheck.message}</Text>
     </View>}
     <View style={s.coachActions}>
      <Pressable accessibilityRole="button" accessibilityLabel="Anielka: daj wskazówkę do zadania" disabled={coachBusy||homeworkBusy} onPress={()=>void askAnielka('hint')} style={s.coachButton}>
       <Text style={s.coachButtonText}>💡 Podpowiedź Anielki</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Anielka: sprawdź moją próbę przed oddaniem" disabled={coachBusy||homeworkBusy} onPress={()=>void askAnielka('review')} style={s.coachButton}>
       <Text style={s.coachButtonText}>{coachBusy?'Anielka sprawdza…':'🔍 Sprawdź z Anielką'}</Text>
      </Pressable>
     </View>
     {coachBusy&&<View style={s.coachWaiting}><ActivityIndicator color="#A87929"/><Text style={s.bodySmall}>Anielka czyta polecenie i Twoją próbę…</Text></View>}
     {!!currentCoachMessage&&<View accessibilityLiveRegion="polite" style={[s.coachFeedback,currentCoachMessage.verdict==='needs_revision'&&currentCoachMessage.mode==='review'?s.coachErrorBox:s.coachSoftBox]}>
      <Text style={s.label}>💬 Anielka: {currentCoachMessage.mode==='hint'?'wskazówka':currentCoachMessage.verdict==='needs_revision'?'co poprawić':'informacja zwrotna'}</Text>
      <Text style={s.bodySmall}>{currentCoachMessage.reply}</Text>
      {!!currentCoachMessage.next_step&&<Text style={s.coachNext}>Następny krok: {currentCoachMessage.next_step}</Text>}
      <Text style={s.small}>To pomoc w nauce, nie ocena egzaminu ani potwierdzenie poprawności.</Text>
     </View>}
     {!!coachError&&<Text accessibilityRole="alert" style={s.warning}>{coachError}</Text>}
     <View style={s.homeworkButtons}>
      <Pressable accessibilityRole="button" disabled={homeworkBusy||busy} onPress={()=>void saveHomework(false)} style={[s.homeworkButton,s.homeworkButtonSoft]}>
       <Text style={s.buttonText}>{homeworkBusy?'Zapisywanie…':'💾 Zapisz szkic'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button"
       disabled={homeworkBusy||busy||!homeworkCanSubmit(homeworkText)||draftCheck.blocksSubmit||(currentCoachMessage?.mode==='review'&&currentCoachMessage?.verdict==='needs_revision')}
       onPress={()=>void saveHomework(true)} style={[s.homeworkButton,s.homeworkButtonPrimary]}>
       <Text style={s.homeworkButtonPrimaryText}>{homeworkBusy?'Sprawdzanie…':'Oddaj pracę →'}</Text>
      </Pressable>
     </View>
     {homeworkMessage!==''&&<Text style={s.notice}>{homeworkMessage}</Text>}
     {homeworkError!==''&&<Text accessibilityRole="alert" style={s.warning}>{homeworkError}</Text>}
     {hasHomework?<Text style={s.notice}>Praca oddana do własnego przeglądu. Zapis na koncie potwierdzony. Nie jest to automatyczna ocena ani dyplom.</Text>:
       <Text style={s.small}>Praca jeszcze nieoddana. Samo zapisanie szkicu nie odblokowuje następnego tematu.</Text>}
     {hasHomework&&typeof m.practice.expected_output==='string'&&
       <View style={s.notice}><Text style={s.label}>Porównaj swój wynik z przykładowym kluczem</Text>
        <Text style={s.body}>{m.practice.expected_output}</Text>
        <Text style={s.small}>Klucz służy do samokontroli. Jeśli wynik się różni, popraw swoją pracę i oddaj ponownie. Rzeczywiste przepisy sprawdzaj w aktualnych źródłach.</Text>
       </View>}
    </>}

    {extras.homework.length>0&&
     <View style={s.card}>
      <Pressable accessibilityRole="button" accessibilityState={{expanded:showExtraHomework}} onPress={()=>setShowExtraHomework(v=>!v)} style={s.accordionButton}>
       <Text style={s.h2}>Dodatkowe polecenia</Text><Text style={s.label}>{showExtraHomework?'−':'+'}</Text>
      </Pressable>
      {showExtraHomework&&<>
      {extras.homework.map((h,i)=><View key={i} style={s.gloss}>
        <Text style={s.label}>Zadanie {i+1}{h.title?' · '+h.title:''}</Text>
        {h.paragraphs.map((line,j)=><Text key={j} selectable style={s.body}>{line}</Text>)}
        {!!h.deliverable&&<Text style={s.small}>Co przygotować: {h.deliverable}</Text>}
        {hasHomework&&!!h.answer&&<Text selectable style={s.small}>Klucz do samokontroli: {h.answer}</Text>}
       </View>)}
      </>}
     </View>}
    <Link href={{pathname:'/biuro-ksiegowe',params:{tab:recommendedLabTab(topic)}}} style={s.link}>
     Otwórz ćwiczenie: {LAB_TAB_NAMES[recommendedLabTab(topic)]}
    </Link>
    {[54,55,98].includes(lesson.topic_no)&&<Link href="/majatek-ksiegowy" style={s.link}>Otwórz kartotekę środków trwałych</Link>}
    {[24,47,48].includes(lesson.topic_no)&&<Link href="/formularze-ksiegowego" style={s.link}>Otwórz ćwiczenia z formularzami</Link>}
    <Text style={s.label}>Opcjonalnie: arkusz Excel</Text>
    <Text style={s.bodySmall}>Możesz pobrać arkusz, wykonać w nim obliczenia, a potem wpisać swoje wnioski do pola „Twoje rozwiązanie” na tej stronie.</Text>
    {Platform.OS==='web'&&<Pressable accessibilityRole="button" onPress={downloadHomeworkWorksheet} style={s.button}>
     <Text style={s.buttonText}>Pobierz arkusz pracy domowej (Excel / CSV)</Text>
    </Pressable>}
    <Text style={s.small}>Plik jest tylko szablonem. Nie wysyła danych na serwer. Pracuj na danych fikcyjnych.</Text>
   </View>}

    {!m.practice&&<Text style={s.body}>W tej lekcji nie przewidziano pisemnej pracy domowej.</Text>}
    <Pressable accessibilityRole="button" style={s.primaryButton} onPress={()=>goStep('summary')}><Text style={s.primaryButtonText}>Przejdź do podsumowania →</Text></Pressable>
   </View>}
   {step==='summary'&&<View style={s.stageBody}>
    {extras.facts.length>0&&<View style={s.card} testID="accounting-additional-facts">
     <Pressable accessibilityRole="button" accessibilityState={{expanded:showFacts}} onPress={()=>setShowFacts(!showFacts)} style={s.accordionButton}>
      <Text style={s.h2}>Ciekawostki do tematu</Text><Text style={s.label}>{showFacts?'−':'+'}</Text>
     </Pressable>
     {showFacts&&extras.facts.map((f,i)=>{const url=sourceURL(f.source);return <View key={i} style={s.gloss}>
       {!!f.title&&<Text style={s.label}>{f.title}</Text>}<Text selectable style={s.body}>{f.text}</Text>
       {url&&<Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(url).catch(()=>setWarning('Nie udało się otworzyć źródła.'))}>
        <Text style={s.link}>{f.sourceTitle||'Źródło'}{f.checked?' · '+f.checked:''}</Text></Pressable>}
     </View>;})}
    </View>}
    <View style={s.card}><Text style={s.h2}>Co zapamiętać?</Text>
     {(m.takeaways||[]).map((v:string,i:number)=><View key={i} style={s.takeawayRow}><Text style={s.checkIcon}>✓</Text><Text style={[s.body,{flex:1}]}>{v}</Text></View>)}
     {!(m.takeaways||[]).length&&<Text style={s.body}>{lesson.learning_goal}</Text>}
    </View>
    {(m.glossary||[]).length>0&&<View style={s.card}>
     <Pressable accessibilityRole="button" accessibilityState={{expanded:showGlossary}} onPress={()=>setShowGlossary(v=>!v)} style={s.accordionButton}><Text style={s.label}>📖 Słownik pojęć ({(m.glossary||[]).length})</Text><Text style={s.label}>{showGlossary?'−':'+'}</Text></Pressable>
     {showGlossary&&(m.glossary||[]).map((g:any,i:number)=><View key={i} style={s.wordRow}><Text style={s.label}>{g.term}</Text><Text style={s.bodySmall}>{glossaryExplanation(g)}</Text></View>)}
    </View>}
    <View style={s.card}>
     <Pressable accessibilityRole="button" accessibilityState={{expanded:showSources}} onPress={()=>setShowSources(v=>!v)} style={s.accordionButton}><Text style={s.label}>🔎 Źródła i aktualność przepisów</Text><Text style={s.label}>{showSources?'−':'+'}</Text></Pressable>
     {showSources&&<View style={{gap:8}}><Text style={s.bodySmall}>Data odniesienia: {lesson.legal_as_of||'nie podano'}. Sama data nie potwierdza weryfikacji prawnej ani aktualności odnośników. Przed rzeczywistymi rozliczeniami sprawdź obowiązujące przepisy.</Text>
      {(m.sources||[]).map((v:any,i:number)=>{const url=sourceURL(v.url);return <View key={i} style={s.gloss}><Text style={s.label}>{v.title}</Text>{v.scope&&<Text style={s.small}>{v.scope}</Text>}{url&&<Pressable accessibilityRole="button" style={s.button} onPress={()=>void Linking.openURL(url).catch(()=>setWarning('Nie udało się otworzyć źródła.'))}><Text style={s.buttonText}>Otwórz źródło</Text></Pressable>}</View>;})}
     </View>}
    </View>
   <View style={s.card}>
    <Text accessibilityRole="header" style={s.h2}>Dokończ ten temat i przejdź dalej</Text>
    <View style={s.progressChecklist}>
     <Text style={s.label}>{sectionProgress?.passed===true?'✅':'◻️'} Ćwiczenia: {sectionProgress?sectionProgress.correct+'/'+sectionProgress.total+' poprawnych':'nie udało się potwierdzić wyniku'}</Text>
     <Text style={s.label}>{hasHomework?'✅':'◻️'} Praca domowa: {hasHomework?'oddana do samokontroli':homeworkReady?(homeworkText.trim()?'zapisz i oddaj swoją próbę':'jeszcze nieoddana'):'oczekiwanie na odczyt'}</Text>
    </View>
    {!nextReady&&<View style={s.guideNotice}>
     <Text style={s.label}>Co zrobić, aby przejść dalej?</Text>
     {sectionProgress?.passed!==true&&<Pressable accessibilityRole="button" onPress={()=>goStep('practice')} style={s.coachButton}><Text style={s.coachButtonText}>✍️ Wróć i popraw ćwiczenia →</Text></Pressable>}
     {!hasHomework&&<Pressable accessibilityRole="button" onPress={()=>goStep('homework')} style={s.coachButton}><Text style={s.coachButtonText}>🧰 Otwórz pracę domową →</Text></Pressable>}
     <Text style={s.small}>Następny temat odblokuje się po poprawnym zapisaniu wymaganych ćwiczeń i oddaniu pracy. Sama rozmowa z Anielką nie zalicza tematu.</Text>
    </View>}
    {nextReady&&topic!==null&&topic<100&&
     <Link href={{pathname:'/temat-ksiegowosci',params:{temat:String(topic+1)}}} style={s.link}>Przejdź do tematu {topic+1} z 100</Link>}
    {nextReady&&topic===100&&<>
     <Text style={s.small}>Ostatni temat — teraz wykonaj końcowe ćwiczenia na fikcyjnej firmie. To jeszcze nie oznacza wydania dyplomu.</Text>
     <Link href="/biuro-ksiegowe" style={s.link}>Otwórz biuro — Zestawienia i sprawdzian końcowy</Link>
    </>}
    <Link href="/program-ksiegowosci" style={s.link}>Wróć do programu i swoich wyników</Link>
   </View>

   </View>}
   <View style={s.bottomNav}>
    {position>0&&<Pressable accessibilityRole="button" onPress={()=>goStep(LESSON_STEPS[position-1].id)} style={s.backButton}><Text style={s.buttonText}>← {LESSON_STEPS[position-1].label}</Text></Pressable>}

   </View>
   <Text style={s.legalLine}>Ćwiczenia służą nauce i wykorzystują fikcyjne dane. Nie zastępują porady księgowej ani podatkowej.</Text>
  </View>}
 </ScrollView>;
}

const s=StyleSheet.create({
 progressChecklist:{backgroundColor:'#F1F5F9',borderRadius:12,padding:13,gap:9,borderWidth:1,borderColor:'#DDE5EF'},
 coachActions:{flexDirection:'row',flexWrap:'wrap',gap:9,marginTop:5},
 coachButton:{minHeight:47,flexGrow:1,justifyContent:'center',paddingHorizontal:13,paddingVertical:11,borderRadius:12,borderWidth:1,borderColor:'#b7d5b4',backgroundColor:'#F8F6F1'},
 coachButtonText:{fontWeight:'800',fontSize:13,color:'#9B7026',textAlign:'center'},
 coachFeedback:{borderWidth:1,borderRadius:13,padding:12,gap:8,marginVertical:4},
 coachErrorBox:{borderColor:'#e5b99b',backgroundColor:'#fff4eb'},
 coachSoftBox:{borderColor:'#d2e4cc',backgroundColor:'#F1F5F9'},
 coachNext:{fontSize:14,fontWeight:'700',lineHeight:22,color:'#9B7026'},
 coachWaiting:{flexDirection:'row',alignItems:'center',gap:9,padding:6},
 homeworkButtons:{flexDirection:'row',flexWrap:'wrap',gap:10,alignItems:'stretch'},
 homeworkButton:{minHeight:50,borderRadius:12,padding:12,flexGrow:1,alignItems:'center',justifyContent:'center'},
 homeworkButtonSoft:{backgroundColor:'#dcebd5'},
 homeworkButtonPrimary:{backgroundColor:'#21485D'},
 homeworkButtonPrimaryText:{color:'white',fontSize:14,fontWeight:'900'},

 lessonBody:{gap:10},
 topBar:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,paddingVertical:3},
 lessonHero:{padding:20,backgroundColor:'#17344A',borderRadius:16,gap:7},
 heroKicker:{fontSize:11,letterSpacing:1.2,color:'#F4CD8B',fontWeight:'800'},lessonTitle:{fontSize:24,lineHeight:31,fontWeight:'900',color:'#FFFFFF'},
 lessonGoal:{fontSize:15,lineHeight:23,color:'#DFEAF2'},
 stepRail:{flexDirection:'row',gap:6,flexWrap:'wrap'},
 stepTile:{flexGrow:1,flexBasis:90,alignItems:'center',justifyContent:'center',minHeight:44,paddingHorizontal:4,paddingVertical:9,borderWidth:1,borderColor:'#C9D4DD',borderRadius:9,backgroundColor:'#fff'},
 stepTileActive:{backgroundColor:'#21485D',borderColor:'#21485D'},
 stepTitle:{fontSize:13,fontWeight:'700',color:'#324D60'},stepTitleActive:{color:'#fff'},stepIntroHint:{fontSize:13,fontWeight:'600',color:'#415C6C'},
 stageBody:{gap:10},
 primerList:{gap:9,marginTop:4},primerCard:{backgroundColor:'#EFF3F4',borderRadius:12,padding:11,flexDirection:'row',gap:11,alignItems:'flex-start'},
 primerIcon:{fontSize:25},bodySmall:{fontSize:14,lineHeight:22,color:'#425969'},
 wordRow:{paddingVertical:9,borderTopWidth:1,borderTopColor:'#e2ebdb',gap:4},
 nextControls:{flexDirection:'row',justifyContent:'space-between',gap:9,flexWrap:'wrap'},
 primaryButton:{backgroundColor:'#21485D',padding:14,minHeight:49,borderRadius:12,alignSelf:'flex-start',justifyContent:'center'},
 primaryButtonText:{fontSize:14,fontWeight:'900',color:'#fff'},
 backButton:{backgroundColor:'#E8EFF2',padding:12,minHeight:45,borderRadius:12,justifyContent:'center'},
 guidedStep:{flexDirection:'row',gap:12,paddingVertical:9,borderTopWidth:1,borderTopColor:'#e8eee3'},
 guidedNumber:{backgroundColor:'#dcedca',width:28,height:28,borderRadius:9,textAlign:'center',textAlignVertical:'center',fontWeight:'900',color:'#245b39',fontSize:13,overflow:'hidden'},
 resultBox:{backgroundColor:'#e8f4e3',padding:13,borderRadius:13,gap:6},
 guideNotice:{backgroundColor:'#edf6e7',borderRadius:13,padding:14,gap:7,borderWidth:1,borderColor:'#d4e4cd'},
 takeawayRow:{flexDirection:'row',gap:10,paddingTop:8},
 checkIcon:{fontSize:20,fontWeight:'900',color:'#3b884a'},
 accordionButton:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12,minHeight:44},
 bottomNav:{flexDirection:'row',justifyContent:'space-between',flexWrap:'wrap',gap:10,marginTop:12},
 nextMini:{backgroundColor:'#e8f2e2',padding:12,minHeight:45,borderRadius:12,justifyContent:'center'},
 legalLine:{fontSize:11,lineHeight:18,color:'#77887b',marginTop:12},

 page:{flex:1,backgroundColor:'#F8F6F1'},wrap:{width:'100%',maxWidth:940,alignSelf:'center',padding:18,paddingBottom:65,gap:14},
 row:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:12,marginBottom:12},
 link:{fontSize:14,fontWeight:'800',color:'#255c3b',paddingVertical:6},
 header:{borderRadius:20,backgroundColor:'#14263B',padding:25,gap:11,marginBottom:14},
 eyebrow:{fontSize:11,fontWeight:'800',letterSpacing:1,color:'#d4e6c8'},eyebrowDark:{fontSize:11,letterSpacing:.8,fontWeight:'800',color:'#486173'},
 h1:{fontSize:29,lineHeight:38,fontWeight:'900',color:'white'},heroBody:{fontSize:16,lineHeight:25,color:'#e0ebdd'},
 h2:{fontSize:20,lineHeight:28,fontWeight:'800',color:'#14263B'},
 body:{fontSize:16,lineHeight:26,color:'#334960'},small:{fontSize:12,lineHeight:20,color:'#56715b'},
 label:{fontSize:14,fontWeight:'800',color:'#1e422d'},
 card:{borderRadius:15,borderWidth:1,borderColor:'#D4DDE1',padding:18,backgroundColor:'white',gap:13,marginBottom:14},
 curiosityBox:{backgroundColor:'#FFF4DC',borderRadius:12,padding:14,gap:5,marginVertical:12,borderLeftWidth:4,borderLeftColor:'#B77722'},
 curiosityTitle:{fontWeight:'800',color:'#724914',fontSize:13,letterSpacing:0.8},
 curiositySource:{color:'#36523b',fontSize:12,fontWeight:'600'},
 sectionPhoto:{width:'100%',aspectRatio:16/9,borderRadius:12,backgroundColor:'#F1F5F9'},
 practice:{padding:20,borderRadius:15,backgroundColor:'#F1F4F8',gap:12,marginBottom:14},
 result:{fontSize:16,lineHeight:26,fontWeight:'800',color:'#1b5332',backgroundColor:'#ebf4e3',padding:13,borderRadius:10},
 tableRow:{flexDirection:'row'},cell:{width:210,padding:12,borderBottomWidth:1,borderBottomColor:'#dee8d9',fontSize:14,lineHeight:22,color:'#334960'},
 headCell:{fontWeight:'800',backgroundColor:'#F1F5F9'},
 task:{gap:12,borderTopWidth:1,borderColor:'#e1e9dc',paddingVertical:18},
 option:{borderWidth:1,borderColor:'#cbdcc4',borderRadius:10,padding:12},
 selected:{backgroundColor:'#F1F4F8',borderColor:'#567e45'},
 button:{alignSelf:'flex-start',paddingHorizontal:15,paddingVertical:12,borderRadius:10,backgroundColor:'#e4efdb'},
 buttonText:{fontWeight:'800',color:'#214b30'},
 input:{fontSize:16,padding:12,minWidth:160,borderColor:'#becdb6',borderWidth:1,borderRadius:10,color:'#14263B'},
 homeworkInput:{fontSize:16,lineHeight:24,minHeight:220,padding:14,borderWidth:1,borderRadius:12,borderColor:'#b7c9b3',backgroundColor:'#fff',color:'#14263B'},
 notice:{padding:13,borderRadius:9,backgroundColor:'#ecf4e6',gap:7},
 warning:{backgroundColor:'#fff0e5',padding:13,borderRadius:10,color:'#813d25',fontSize:14,lineHeight:22,marginBottom:12},
 gloss:{gap:6,borderTopWidth:1,borderColor:'#e0e8dc',paddingTop:9},
});