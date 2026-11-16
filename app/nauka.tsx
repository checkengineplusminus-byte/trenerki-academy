import {LessonHelp} from '../src/support/links';
import React,{useEffect,useState} from 'react';
import {ScrollView,View,Text,TextInput,Pressable,ActivityIndicator,Platform,useWindowDimensions} from 'react-native';
import {Link,useLocalSearchParams,useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
// @ts-ignore — jednolita, testowana nawigacja starych i nowych odnośników.
import {courseDestination} from '../src/accounting/course-entry.js';
import KeyboardLesson,{type KeyboardShortcut} from '../src/KeyboardLesson';
import ConstructionLesson,{type ConstructionMaterial} from '../src/ConstructionLesson';
import CaseLesson,{type LearningCase} from '../src/CaseLesson';
import GuidedDialogue from '../src/GuidedDialogue';
import LessonClarification from '../src/LessonClarification';
import CarpentryPracticeLab,{CarpentryCalculatorDirectory,hasCarpentryLab} from '../src/CarpentryPracticeLab';
import CourseIntro from '../src/CourseIntro';
import ExcelFirstDayPractice from '../src/ExcelFirstDayPractice';
import {ExcelAcademyLibrary} from '../src/ExcelAcademyLibrary';
import ExcelMasterGuide from '../src/ExcelMasterGuide';
import ExcelVisualPractices from '../src/ExcelVisualPractices';
import CourseIntroPhoto from '../src/CourseIntroPhoto';
import CourseStudyPlan,{type StudyProject} from '../src/CourseStudyPlan';
import ConceptAtlas from '../src/ConceptAtlas';
import EcoAtlas from '../src/EcoAtlas';
import FinalExam from '../src/FinalExam';
import LessonIllustratedSections,{type LearningSection,type LessonVisual} from '../src/LessonIllustratedSections';
import SoftwareOrientation,{hasSoftwareOrientation} from '../src/SoftwareOrientation';
import AutoCADPracticeFiles from '../src/AutoCADPracticeFiles';
import AutoCADLessonMethod from '../src/AutoCADLessonMethod';
import AutoCADHomework from '../src/AutoCADHomework';
import AutoCADReferenceGuide from '../src/AutoCADReferenceGuide';
import CadWorkspace from '../src/CadWorkspace';
import SoftwareMenuLab,{hasSoftwareMenuLab} from '../src/SoftwareMenuLab';
import CampaignWorkshop,{hasCampaignLab} from '../src/CampaignWorkshop';
import {isLogisticsCourse,LogisticsAtlas,LogisticsWorkshop} from '../src/LogisticsWorkshop';
type Lesson={
 lesson_no:number,title_pl:string,
 material:{study_project?:StudyProject,practice?:{diagram?:string[],visual?:LessonVisual},raw?:string[],curiosity?:string,sections?:LearningSection[],illustration?:string,construction?:ConstructionMaterial,learning?:LearningCase,shortcuts?:KeyboardShortcut[],quickTips?:string[],exercise?:string,editorial_status?:string}
};
type NoteState=Record<string,string>;
type AttemptMode='case'|'construction'|'keyboard'|'carpentry';
type Checks=Partial<Record<AttemptMode|'carpentry',boolean>>;
const ink='#183c2b',secondary='#526f5c',line='#dfeada';
const cadWorkshopLessons=new Set([0,4,5,6,9,10,11,12,13,15,16,17,18,19,20,22,23,24,26,27,28,29]);
export default function Learning(){
 const {course,lesson:lessonParam,review:reviewParam}=useLocalSearchParams<{course?:string;lesson?:string;review?:string}>(),slug=typeof course==='string'?course:'',router=useRouter();
 const {width:screenWidth}=useWindowDimensions(),mobile=screenWidth<640;
 const scrollRef=React.useRef<React.ComponentRef<typeof ScrollView>>(null),exerciseYRef=React.useRef(0),carpentryYRef=React.useRef(0),workshopYRef=React.useRef(0);
 const pendingWorkshopRef=React.useRef(false);
 const pendingExcelHomeworkRef=React.useRef(false);
 function scrollToTop(){
  scrollRef.current?.scrollTo({y:0,animated:false});
  if(Platform.OS==='web'&&typeof window!=='undefined')window.scrollTo(0,0);
 }
 function returnToExercise(){
  setMsg(requirementMessage);
  const y=Math.max(0,exerciseYRef.current-24);
  scrollRef.current?.scrollTo({y,animated:true});
  if(Platform.OS==='web'&&typeof window!=='undefined'&&y===0)window.scrollTo(0,0);
 }
 function scrollToExcelGrid():boolean{
  if(slug!=='excel-skroty'||Platform.OS!=='web'||typeof document==='undefined')return false;
  // The button must land on the actual spreadsheet, not the shortcut quiz above it.
  const grid=document.querySelector('[data-testid="excel-workspace"]');
  if(!grid)return false;
  grid.scrollIntoView?.({behavior:'smooth',block:'start'});
  return true;
 }
 function scrollToExcelHomework():boolean{
  if(slug!=='excel-skroty'||Platform.OS!=='web'||typeof document==='undefined')return false;
  const block=document.querySelector('[data-testid="excel-real-homework-'+module+'"]');
  if(!block)return false;
  const control=block.querySelector('[data-testid="excel-homework-toggle"]');
  // React Native Web may omit aria-expanded on a Pressable despite its internal state.
  // Fall back to the visible label; do not close homework already expanded.
  const expanded=control?.getAttribute('aria-expanded')==='true'||control?.textContent?.includes('Zwiń zadanie');
  if(control instanceof HTMLElement&&!expanded)control.click();
  block.scrollIntoView?.({behavior:'smooth',block:'start'});
  return true;
 }
 function openExcelHomework(){
  if(slug!=='excel-skroty')return;
  if(index===0&&!introRead){pendingExcelHomeworkRef.current=true;setIntroRead(true);return;}
  if(!scrollToExcelHomework()){pendingExcelHomeworkRef.current=true;setIntroRead(true);}
 }
 function openWorkshop(){
  if(!introRead){pendingWorkshopRef.current=true;setIntroRead(true);return;}
  if(scrollToExcelGrid())return;
  scrollRef.current?.scrollTo({y:Math.max(0,workshopYRef.current-18),animated:true});
 }
 function openCarpentry(){scrollRef.current?.scrollTo({y:Math.max(0,carpentryYRef.current-18),animated:true});}
 const [introRead,setIntroRead]=useState(false);
 const [reviewMode,setReviewMode]=useState(reviewParam==='1');
 const [coachOpen,setCoachOpen]=useState(false);
 useEffect(()=>{setIntroRead(false);pendingWorkshopRef.current=false;},[slug]);
 useEffect(()=>{
  if(pendingWorkshopRef.current&&introRead&&scrollToExcelGrid())pendingWorkshopRef.current=false;
 },[introRead,slug]);
 useEffect(()=>{setReviewMode(reviewParam==='1');},[slug,reviewParam]);
 const [checks,setChecks]=useState<Record<number,Checks>>({});
 const [items,setItems]=useState<Lesson[]>([]),[done,setDone]=useState<number[]>([]),
 [notes,setNotes]=useState<NoteState>({}),[module,setModule]=useState(0),
 [userId,setUserId]=useState(''),[error,setError]=useState(''),[msg,setMsg]=useState(''),
 [busy,setBusy]=useState(true),[showProgram,setShowProgram]=useState(false),[saving,setSaving]=useState(false),[courseInfo,setCourseInfo]=useState({slug:'',title:'',description:''}),[review,setReview]=useState<Record<string,{correct:number,incorrect:number}>>({});
 useEffect(()=>{setCoachOpen(false);},[slug,module]);
 useEffect(()=>{
  if(slug==='excel-skroty'&&pendingExcelHomeworkRef.current&&introRead&&scrollToExcelHomework())
   pendingExcelHomeworkRef.current=false;
 },[slug,module,introRead,items.length]);
 React.useLayoutEffect(()=>{
  if(Platform.OS==='web'){
   scrollToTop();
   return;
  }
  const afterLayout=setTimeout(scrollToTop,100);
  return ()=>clearTimeout(afterLayout);
 },[slug,module,items.length]);

 useEffect(()=>{let active=true;(async()=>{
  setBusy(true);setError('');setItems([]);setDone([]);setChecks({});setMsg('');setShowProgram(false);
  try{
   if(!slug)throw new Error('Wybierz kurs z listy.');
   if(slug==='ksiegowosc-od-podstaw'){router.replace(courseDestination(slug,lessonParam));return;}
   const {data:{user:u},error:ue}=await supabase.auth.getUser();
   if(ue||!u){router.replace('/konto');return;}
   const {data:en,error:ee}=await supabase.from('ta_enrollments').select('id').eq('user_id',u.id).eq('course_slug',slug).eq('status','active').gt('expires_at',new Date().toISOString()).limit(1);
   if(ee)throw ee;
   if(!en?.length)throw new Error('Nie masz obecnie dostępu do tego kursu. Wróć do swoich kursów.');
   const [lessons,draft,progress,details,attempts]=await Promise.all([
    supabase.from('ta_lessons').select('lesson_no,title_pl,material').eq('course_slug',slug).order('lesson_no',{ascending:true}),
    supabase.from('ta_drafts').select('last_module,notes').eq('user_id',u.id).eq('course_slug',slug).maybeSingle(),
    supabase.from('ta_learning_progress').select('lesson_no').eq('user_id',u.id).eq('course_slug',slug),
    supabase.from('ta_courses').select('title_pl,description_pl').eq('slug',slug).maybeSingle(),
    supabase.from('ta_learning_attempts').select('lesson_no,mode,correct').eq('user_id',u.id).eq('course_slug',slug)
   ]);
   if(lessons.error||draft.error||progress.error||details.error||attempts.error)throw lessons.error||draft.error||progress.error||details.error||attempts.error;
   const all=(lessons.data||[]) as Lesson[],completed=(progress.data||[]).map(v=>v.lesson_no);
   if(active){
    setUserId(u.id);setItems(all);setDone(completed);setCourseInfo({slug,title:details.data?.title_pl||slug,description:details.data?.description_pl||''});
    const passed:Record<number,Checks>={};
    const perLesson:Record<string,{correct:number,incorrect:number}>={};
    for(const attempt of attempts.data||[]){
     const k=String(attempt.lesson_no);if(!perLesson[k])perLesson[k]={correct:0,incorrect:0};
     if(attempt.correct){
      perLesson[k].correct++;
      if(['case','construction','keyboard','carpentry'].includes(attempt.mode)){
       const mode=attempt.mode as AttemptMode;
       passed[attempt.lesson_no]={...passed[attempt.lesson_no],[mode]:true};
      }
     }else perLesson[k].incorrect++;
    }
    setReview(perLesson);setChecks(passed);
    const state=draft.data?.notes||{};
    setNotes(state.byLesson||{[String(draft.data?.last_module||0)]:String(state.text||'')});
    const next=all.find(v=>!completed.includes(v.lesson_no))?.lesson_no??all.at(-1)?.lesson_no??0;
    const requested=Number(lessonParam)-1;
    setModule(all.some(v=>v.lesson_no===requested)&&(requested<=next||completed.includes(requested))?requested:next);
   }
  }catch(e:any){if(active)setError(e?.message||'Nie udało się otworzyć kursu.');}
  finally{if(active)setBusy(false);}
 })();return()=>{active=false};},[slug]);
 const study=items[0]?.material.study_project;
 const lesson=items.find(x=>x.lesson_no===module),index=items.findIndex(x=>x.lesson_no===module);
 const learning=lesson?.material.learning;
 const sections=lesson?.material.sections??[];
 const completed=items.filter(x=>done.includes(x.lesson_no)).length;
 const progress=items.length?Math.round(completed/items.length*100):0;
 const next=index>=0?items[index+1]?.lesson_no:undefined,previous=index>0?items[index-1]?.lesson_no:undefined;
 async function recordAttempt(mode:AttemptMode,answerIndex:number,_localCorrect:boolean,activeCombo?:string,selectedCombo?:string,numericAnswer?:string):Promise<boolean>{
  if(!userId)return false;
  try{
   const {data,error:e}=await supabase.functions.invoke<{ok?:boolean;correct?:boolean;error?:string}>('ta-lesson-guide',{
    body:{action:'attempt',course_slug:slug,lesson_no:module,mode,selected_index:answerIndex,
     ...(mode==='keyboard'?{active_combo:activeCombo,selected_combo:selectedCombo}:{}),
     ...(mode==='carpentry'?{numeric_answer:numericAnswer}:{})}
   });
   if(e||!data?.ok)throw new Error(data?.error||e?.message||'Brak odpowiedzi serwera');
   const correct=!!data.correct;
   if(correct)markPassed(module,mode);
   setReview(v=>{
    const k=String(module),t=v[k]||{correct:0,incorrect:0};
    return {...v,[k]:{correct:t.correct+(correct?1:0),incorrect:t.incorrect+(correct?0:1)}};
   });
   return correct;
  }catch(e:any){
   setMsg('Nie udało się teraz potwierdzić odpowiedzi. Kliknij ją ponownie. '+String(e?.message||'').slice(0,100));
   return false;
  }
 }
 function markPassed(number:number,mode:keyof Checks){
  setChecks(current=>({...current,[number]:{...current[number],[mode]:true}}));
 }
 const firstPending=items.find(v=>!done.includes(v.lesson_no));
 const unlockedNo=firstPending?.lesson_no??Infinity;
 const canVisit=(number:number)=>number<=unlockedNo||done.includes(number);
 function startFromBeginning(){
  if(saving||!items.length)return;
  setReviewMode(true);setIntroRead(false);setCoachOpen(false);setShowProgram(false);
  setMsg('Powtórka od pierwszej lekcji. Zapisany postęp i otrzymany dyplom pozostają bez zmian.');
  setModule(items[0].lesson_no);
  router.setParams({lesson:String(items[0].lesson_no+1),review:'1'});
  scrollToTop();
 }
 function openModule(number:number){
  setModule(number);router.setParams({lesson:String(number+1)});scrollToTop();
 }
 function changeModule(number:number){
  if(saving||!items.some(v=>v.lesson_no===number)||!canVisit(number))return;
  setMsg('');openModule(number);
 }
 const passed=checks[module]||{};
 const objective=lesson?.material?.construction?'construction':lesson?.material?.learning?'case':undefined;
 const carpentry=slug==='ciesla-przygotowanie-czeladnicze'&&hasCarpentryLab(module);
 const passedCount=(objective&&passed[objective]?1:0)+(lesson?.material?.shortcuts?.length&&passed.keyboard?1:0)+(carpentry&&passed.carpentry?1:0);
 const requirements=[
  ...(objective?[{key:objective,label:objective==='construction'?'Zadanie z rysunku lub obliczeń':'Pytanie do przeczytanej lekcji',passed:!!passed[objective]}]:[]),
  ...(lesson?.material?.shortcuts?.length?[{key:'keyboard',label:'Pytanie o skrót: wybierz skrót, potem odpowiedź',passed:!!passed.keyboard}]:[]),
  ...(carpentry?[{key:'carpentry',label:'Ćwiczenie praktyczne z ciesielstwa',passed:!!passed.carpentry}]:[])
 ];
 const missingRequirements=requirements.filter(item=>!item.passed);
 const requirementMessage='Aby przejść dalej, dokończ: '+missingRequirements.map(item=>item.label.toLocaleLowerCase('pl')).join('; ')+'.';
 const canFinish=done.includes(module)||(
   (!objective||passed[objective])&&
   (!lesson?.material?.shortcuts?.length||passed.keyboard)&&
   (!carpentry||passed.carpentry)
 );
 async function persistDraft(target:number,noteState:NoteState){
  if(!userId)return;
  const {error:e}=await supabase.from('ta_drafts').upsert({
   user_id:userId,course_slug:slug,last_module:target,notes:{byLesson:noteState},
   updated_at:new Date().toISOString()
  },{onConflict:'user_id,course_slug'});
  if(e)throw e;
 }
 async function finishLesson(){
  if(saving||!userId||!lesson)return;
  if(!canFinish){setMsg(requirementMessage);return;}
  setSaving(true);setMsg('');
  try{
   if(!done.includes(module)){
    // Server verifies objective attempts and chronological ordering.
    const {data:result,error:pe}=await supabase.functions.invoke<{ok?:boolean;completed?:boolean;error?:string}>('ta-lesson-guide',{
      body:{action:'complete',course_slug:slug,lesson_no:module,require_carpentry:carpentry}
    });
    if(pe||!result?.completed){
      const msg=result?.error==='exercise_required'?'Zalicz wymagane zadanie, a potem spróbuj ponownie.':
       result?.error==='previous_lessons_required'?'Najpierw ukończ poprzednie lekcje.':
       'Nie udało się potwierdzić zaliczenia na serwerze. Spróbuj ponownie.';
      throw new Error(msg);
    }
    setDone(prev=>prev.includes(module)?prev:[...prev,module]);
   }
   const target=done.includes(module)&&firstPending&&(next===undefined||!canVisit(next))?unlockedNo:next??module;
   try{await persistDraft(target,notes);}
   catch{setMsg('Lekcja ukończona. Notatki nie zostały zapisane — możesz spróbować ponownie.');}
   if(target!==module){openModule(target);setMsg(prev=>prev||'Otworzono następną lekcję.');}
   else if(reviewMode){setReviewMode(false);router.setParams({review:'0'});setMsg('Powtórka ukończona. Możesz wrócić do dowolnej lekcji lub zobaczyć dyplom.');scrollToTop();}
   else {setMsg('Wszystkie lekcje ukończone. Egzamin jest poniżej ostatniej lekcji.');scrollToTop();}
  }catch(e:any){setMsg('Postęp nie został zapisany: '+(e?.message||'błąd sieci')+'. Spróbuj jeszcze raz.');}
  finally{setSaving(false);}
 }
 function lessonNavigation(position:'top'|'bottom'){
  const hasNext=next!==undefined&&canVisit(next);
  return <View testID={'lesson-nav-'+position} style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:10}}>
   <Pressable accessibilityRole="button" accessibilityLabel="Poprzednia lekcja" disabled={saving||previous===undefined}
    onPress={()=>{if(previous!==undefined)changeModule(previous);}} style={{minHeight:44,justifyContent:'center',paddingHorizontal:12,borderRadius:9,backgroundColor:'#edf4e9',opacity:previous===undefined?0.48:1}}>
    <Text style={{color:ink,fontWeight:'800'}}>← Poprzednia lekcja</Text>
   </Pressable>
   {firstPending&&module!==unlockedNo&&<Pressable accessibilityRole="button" disabled={saving} onPress={()=>changeModule(unlockedNo)}
    style={{minHeight:44,justifyContent:'center',paddingHorizontal:12,borderRadius:9,backgroundColor:'#dfeeda'}}>
    <Text style={{color:ink,fontWeight:'800'}}>Wróć do miejsca nauki</Text>
   </Pressable>}
   {hasNext&&<Pressable accessibilityRole="button" accessibilityLabel="Następna dostępna lekcja" disabled={saving} onPress={()=>changeModule(next)}
    style={{minHeight:44,justifyContent:'center',paddingHorizontal:12,borderRadius:9,backgroundColor:'#edf4e9'}}>
    <Text style={{color:ink,fontWeight:'800'}}>Następna lekcja →</Text>
   </Pressable>}
  </View>;
 }
 return <ScrollView ref={scrollRef} style={{backgroundColor:'#fbfcf7',flex:1}} contentContainerStyle={{paddingHorizontal:mobile?12:22,paddingTop:mobile?15:25,paddingBottom:90,maxWidth:860,alignSelf:'center',width:'100%'}}>
  <Pressable onPress={()=>router.push('/moje-kursy')} accessibilityRole="button"><Text style={{color:'#376143',fontWeight:'800'}}>← Moje kursy</Text></Pressable>
  <Text style={{fontSize:mobile?24:31,fontWeight:'900',color:ink,marginTop:12,marginBottom:9}}>{!busy&&courseInfo.slug===slug&&index===0?courseInfo.title:'Moja nauka'}</Text>
  {busy&&<ActivityIndicator size="large"/>}
  {!!error&&<Text style={{color:'#ac382a',backgroundColor:'#fff2e8',padding:17,borderRadius:12}}>{error}</Text>}
  {!!items.length&&<>
   {!busy&&courseInfo.slug===slug&&index===0&&slug!=='autocad-skroty'&&<CourseIntroPhoto key={slug} slug={slug} title={courseInfo.title}/>}
   <View style={{backgroundColor:'#eaf3e4',padding:mobile?12:16,borderRadius:14,marginTop:10,marginBottom:10}}>
    <View style={{flexDirection:'row',justifyContent:'space-between',gap:10,alignItems:'center'}}>
     <Text style={{color:ink,fontWeight:'900',fontSize:14}}>{reviewMode?'Powtórka kursu · lekcja '+(index+1)+'/'+items.length:'Postęp · '+completed+'/'+items.length+' lekcji'}</Text>
     <Text style={{fontSize:reviewMode?12:17,fontWeight:'900',color:ink}}>{reviewMode?'Dyplom zachowany':progress+'%'}</Text>
    </View>
    {!reviewMode&&<View style={{height:8,backgroundColor:'#cfddca',borderRadius:9,marginTop:9,overflow:'hidden'}}>
     <View style={{height:8,width:progress+'%',backgroundColor:'#7cae6e'}}/>
    </View>}
    <Pressable testID="start-course-from-beginning" accessibilityRole="button" disabled={saving} onPress={startFromBeginning}
      style={{marginTop:12,paddingVertical:11,paddingHorizontal:13,backgroundColor:'white',borderRadius:9,alignSelf:'flex-start',borderWidth:1,borderColor:'#bad4b6'}}>
      <Text style={{fontWeight:'900',color:ink}}>↺ Zacznij od początku</Text>
    </Pressable>
    {reviewMode&&<Text style={{fontSize:12,lineHeight:19,color:'#49684c',marginTop:5}}>Powtarzasz materiały. Postęp i dyplom nie są kasowane.</Text>}
   </View>
   {lessonNavigation('top')}
   {slug==='autocad-skroty'&&<AutoCADReferenceGuide/>}
   {slug==='zaufany-wolontariusz'&&<View style={{flexDirection:'row',flexWrap:'wrap',gap:14,marginBottom:14}}>
    <Link href={{pathname:'/materialy-wolontariusza',params:{sekcja:'karty'}}} style={{color:ink,fontWeight:'700',textDecorationLine:'underline'}}>Karty pracy</Link>
    <Link href={{pathname:'/materialy-wolontariusza',params:{sekcja:'test-zbiorek'}}} style={{color:ink,fontWeight:'700',textDecorationLine:'underline'}}>Test zabezpieczenia zbiórki</Link>
    <Link href={{pathname:'/materialy-wolontariusza',params:{sekcja:'sprawdzian'}}} style={{color:ink,fontWeight:'700',textDecorationLine:'underline'}}>Sprawdzian sytuacyjny</Link>
   </View>}
   {slug==='ciesla-przygotowanie-czeladnicze'&&<CarpentryCalculatorDirectory/>}
   {items.some(x=>(review[String(x.lesson_no)]?.incorrect||0)>0&&(review[String(x.lesson_no)]?.correct||0)===0)&&<View style={{backgroundColor:'#fff5e5',borderRadius:14,padding:16,marginBottom:15,gap:9}}>
    <Text style={{color:'#604722',fontWeight:'900',fontSize:16}}>Warto powtórzyć</Text>
    <Text style={{color:'#7d663d',fontSize:12,lineHeight:20}}>W tych lekcjach pojawiły się trudności. Możesz wrócić do przykładu i przećwiczyć zadanie jeszcze raz.</Text>
    {items.filter(x=>(review[String(x.lesson_no)]?.incorrect||0)>0&&(review[String(x.lesson_no)]?.correct||0)===0).slice(0,3).map(x=><Pressable key={x.lesson_no} onPress={()=>changeModule(x.lesson_no)} style={{backgroundColor:'white',padding:12,borderRadius:10}}>
      <Text style={{fontWeight:'800',color:ink}}>{x.title_pl}</Text>
      <Text style={{fontSize:11,color:'#7b6548'}}>Powtórz ćwiczenie, aby sprawdzić zrozumienie.</Text>
    </Pressable>)}
   </View>}
   {slug==='kowal-tradycja'&&items.length===30&&<View style={{gap:7,marginBottom:14}}>
    {[
     {name:'I · WARSZTAT I PODSTAWY',description:'BHP, stal, rysunek, narzędzia i konserwacja',start:0},
     {name:'II · TECHNIKI KUCIA',description:'Kształtowanie, przebijanie, łączenie, obróbka cieplna',start:10},
     {name:'III · PROJEKTY I NAPRAWY',description:'Wyroby, bryczki, podkuwnictwo i projekt końcowy',start:20}
    ].map(part=>{
     const n=items.filter(x=>x.lesson_no>=part.start&&x.lesson_no<part.start+10&&done.includes(x.lesson_no)).length;
     const current=module>=part.start&&module<part.start+10;
     return <View key={part.start} style={{backgroundColor:current?'#e5f2e0':'#f7faf4',borderWidth:1,borderColor:current?'#9bc39a':'#dae8d6',paddingVertical:10,paddingHorizontal:13,borderRadius:12}}>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:7}}>
       <Text style={{color:ink,fontSize:13,fontWeight:'900',flex:1}}>{part.name}</Text>
       <Text style={{color:'#446b4f',fontSize:12,fontWeight:'900'}}>{n}/10</Text>
      </View>
      <Text style={{color:secondary,fontSize:12,lineHeight:19,marginTop:4}}>{part.description}</Text>
     </View>;
    })}
   </View>}
   {index===0&&!!study&&<CourseStudyPlan key={slug} project={study}/>}
   <Pressable onPress={()=>setShowProgram(v=>!v)} accessibilityRole="button"
    style={{backgroundColor:'#f1f6ed',paddingVertical:12,paddingHorizontal:15,borderRadius:12,marginBottom:12,borderWidth:1,borderColor:'#d6e7d0',flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,minHeight:48}}>
     <Text style={{color:ink,fontWeight:'900',fontSize:14}}>{showProgram?'Zwiń plan lekcji ↑':'Plan lekcji ↓'}</Text>
     <Text style={{color:secondary,fontSize:12}}>Lekcja {index+1}/{items.length}</Text>
   </Pressable>
   {showProgram&&((slug==='ciesla-przygotowanie-czeladnicze')?[
      {name:'I · TECHNOLOGIA CIESIELSKA',about:'Lekcje 1–10 · tarcica, suszenie, więźby, złącza, pomiary',list:items.slice(0,10)},
      {name:'II · MASZYNOZNAWSTWO',about:'Lekcje 11–20 · piły, obrabiarki, napędy, konserwacja',list:items.slice(10,20)},
      {name:'III · MATERIAŁOZNAWSTWO',about:'Lekcje 21–30 · anatomia drewna, wilgotność, wady, kleje',list:items.slice(20,30)},
      {name:'IV · TECHNOLOGIE I NARZĘDZIA',about:'Lekcje 31–42 · szachulec, hydrotermia, lignoston, przekładnie i narzędzia',list:items.slice(30,42)},
      {name:'V · ANATOMIA I DETALE KONSTRUKCJI',about:'Lekcje 43–50 · budowa drewna, podwalina, krokwie i połączenia',list:items.slice(42,50)},
      {name:'VI · WARSZTAT I IZOLACJE',about:'Lekcje 51–56 · trasowanie, napędy, powierzchnie i izolacje',list:items.slice(50,56)},
      {name:'VII · PRZYGOTOWANIE DO EGZAMINU PISEMNEGO',about:'Lekcje 57–63 · rachunkowość, dokumenty, rysunek, BHP, środowisko i prawo',list:items.slice(56,63)}
    ]:items.length===30?[
     {name:slug==='kowal-tradycja'?'DZIAŁ I · WARSZTAT I PODSTAWY':'DZIAŁ I · PODSTAWY',about:slug==='kowal-tradycja'?'Lekcje 1–10 · BHP, stal, rysunek techniczny, pomiary i narzędzia':'Lekcje 1–10 · poznaj pojęcia, interfejs i pierwsze kroki',list:items.slice(0,10)},
     {name:slug==='kowal-tradycja'?'DZIAŁ II · TECHNIKI KUCIA':'DZIAŁ II · PRAKTYKA',about:slug==='kowal-tradycja'?'Lekcje 11–20 · wydłużanie, spęcznianie, gięcie, przebijanie, łączenie i obróbka cieplna':'Lekcje 11–20 · ćwiczenia, scenariusze i kontrola wyniku',list:items.slice(10,20)},
     {name:slug==='kowal-tradycja'?'DZIAŁ III · PROJEKTY I NAPRAWY':'DZIAŁ III · ZAAWANSOWANE',about:slug==='kowal-tradycja'?'Lekcje 21–30 · wyroby, bryczki, podkuwnictwo i projekt końcowy':'Lekcje 21–30 · samodzielne zadania i decyzje',list:items.slice(20,30)}
   ]:[{name:'DOSTĘPNE LEKCJE',about:`${items.length} lekcji i ćwiczenia praktyczne`,list:items}]).map((part,i)=><View key={part.name} style={{marginBottom:13,backgroundColor:'white',borderWidth:1,borderColor:'#dfe9dc',borderRadius:13,padding:13,gap:9}}>
     <Text style={{color:ink,fontWeight:'900',fontSize:13}}>{part.name}</Text>
     <Text style={{color:secondary,fontSize:12,lineHeight:19}}>{part.about}</Text>
     <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{part.list.map(v=><Pressable key={v.lesson_no} disabled={saving||!canVisit(v.lesson_no)} onPress={()=>changeModule(v.lesson_no)} accessibilityLabel={'Lekcja '+(v.lesson_no+1)+': '+v.title_pl+(!canVisit(v.lesson_no)?' — zablokowana':'')} style={{minWidth:40,paddingVertical:10,paddingHorizontal:11,opacity:!canVisit(v.lesson_no)?0.38:1,backgroundColor:v.lesson_no===module?ink:done.includes(v.lesson_no)?'#def0d4':'#f8faf6',borderRadius:10,borderWidth:1,borderColor:v.lesson_no===module?ink:line}}>
      <Text style={{fontWeight:'900',color:v.lesson_no===module?'white':ink,textAlign:'center'}}>{done.includes(v.lesson_no)?'✓ ':!canVisit(v.lesson_no)?'🔒 ':''}{v.lesson_no+1}</Text>
     </Pressable>)}</View>
   </View>)}
   {progress===100&&index===items.length-1&&!reviewMode&&<View testID="course-completed-last-page-only" style={{padding:17,backgroundColor:'#e5f2de',borderRadius:12,marginBottom:15}}>
    <Text style={{fontWeight:'900',color:ink,fontSize:18}}>Wszystkie lekcje ukończone! 🎉</Text>
    <Text style={{color:secondary,marginTop:6}}>Masz komplet lekcji. Teraz czeka Cię osobny egzamin Anielki. Dopiero jego zaliczenie umożliwia wystawienie autorskiego dyplomu.</Text>
   </View>}
  </>}
  {progress===100&&index===items.length-1&&!reviewMode&&<FinalExam courseSlug={slug}/>}
  {!!lesson&&<>
   {slug==='excel-skroty'&&Platform.OS==='web'&&
    <Pressable testID="excel-homework-quick-access" accessibilityRole="button"
     accessibilityLabel="Otwórz pracę domową w prawdziwym Excelu i pobierz pliki CSV"
     onPress={openExcelHomework}
     style={{minHeight:58,padding:14,backgroundColor:'#dceee0',borderWidth:2,borderColor:'#8ab99a',borderRadius:12,marginBottom:12,gap:5}}>
     <Text style={{fontWeight:'900',fontSize:16,color:'#1d5839'}}>📗 Praca domowa w prawdziwym Excelu — pobierz plik CSV ↓</Text>
     <Text style={{fontSize:12,lineHeight:20,color:'#37674a'}}>Każda lekcja ma własne ćwiczenie i wynik kontrolny. Kliknij, aby przejść do zadania i rozwinąć instrukcję.</Text>
    </Pressable>}
   {index===0&&(slug!=='autocad-skroty'||!introRead)&&<CourseIntro slug={slug} title={courseInfo.title} description={courseInfo.description} first={slug!=='autocad-skroty'}/>}
   {index===0&&slug==='excel-skroty'&&<ExcelAcademyLibrary key={'excel-start-'+module} lessonNo={module}/>}
   {index===0&&slug==='excel-skroty'&&<ExcelMasterGuide lessonNo={module}/>}
   {index===0&&(slug!=='autocad-skroty'||!introRead)&&hasSoftwareOrientation(slug)&&<SoftwareOrientation slug={slug} openPractice={openWorkshop}/>}
   {index===0&&!introRead&&<View testID="course-reading-introduction" style={{padding:20,backgroundColor:'white',borderRadius:16,gap:14,marginBottom:20}}>
    <Text style={{fontSize:20,fontWeight:'900',color:ink}}>Jak będziemy się uczyć?</Text>
    <Text style={{fontSize:16,lineHeight:27,color:secondary}}>Najpierw przeczytaj wprowadzenie. Dalej poznasz wyjaśnienia i przykłady, a dopiero potem zadania. Możesz wracać do przeczytanych lekcji. Błędna odpowiedź to okazja do powtórki — nie tracisz przez nią dostępu do kursu.</Text>
    <Text style={{fontSize:18,fontWeight:'800',color:ink}}>Przed nami</Text>
    {items.slice(0,8).map((item,i)=><Text key={item.lesson_no} style={{fontSize:15,lineHeight:24,color:secondary}}>{i+1}. {item.title_pl}</Text>)}
    <Pressable accessibilityRole="button" onPress={()=>{setIntroRead(true);scrollToTop();}} style={{backgroundColor:ink,padding:16,borderRadius:12}}>
     <Text style={{color:'white',fontWeight:'900',textAlign:'center'}}>Przejdź do wyjaśnień pierwszej lekcji →</Text>
    </Pressable>
   </View>}
   {(index!==0||introRead)&&<>
   {index===0&&slug==='excel-skroty'&&<ExcelFirstDayPractice/>}
   {index>=0&&index<=2&&hasSoftwareMenuLab(slug)&&<SoftwareMenuLab slug={slug}/>}
    {hasCampaignLab(slug)&&index>=0&&[0,2,4,5,7,10,11].includes(index)&&<CampaignWorkshop slug={slug} lessonNo={module}/>}
   {slug!=='ciesla-przygotowanie-czeladnicze'&&(index===0||(items.length===30&&index%10===0))&&(slug==='jestem-eko'?<EcoAtlas/>:isLogisticsCourse(slug)?<LogisticsAtlas slug={slug}/>:hasSoftwareOrientation(slug)?null:<ConceptAtlas slug={slug}/>)}
   {(items.length===30||slug==='ciesla-przygotowanie-czeladnicze')&&<View style={{borderLeftWidth:4,borderColor:index<10?'#b0d9aa':index<20?'#679c72':'#305c45',paddingHorizontal:13,paddingVertical:9,backgroundColor:'#edf3e9',marginBottom:12}}>
     <Text style={{fontWeight:'900',color:ink}}>{slug==='ciesla-przygotowanie-czeladnicze'?(index<10?'I · TECHNOLOGIA':index<20?'II · MASZYNOZNAWSTWO':index<30?'III · MATERIAŁOZNAWSTWO':index<42?'IV · TECHNOLOGIE':index<50?'V · DETALE':index<56?'VI · WARSZTAT':'VII · EGZAMIN PISEMNY'):(index<10?'DZIAŁ I · PODSTAWY — OD ZERA':index<20?'DZIAŁ II · PRAKTYKA':'DZIAŁ III · ZAAWANSOWANE')}</Text>
   </View>}
   <Text style={{color:'#638068',fontWeight:'700'}}>Lekcja {index+1} z {items.length}{!reviewMode&&progress<100&&done.includes(module)?' · Zaliczone ćwiczenia ✓':''}</Text>
   <Text testID="lesson-heading" accessibilityRole="header" style={{color:ink,fontSize:mobile?23:26,fontWeight:'900',marginTop:10,marginBottom:12,lineHeight:mobile?30:33}}>{lesson.title_pl}</Text>
   {slug==='excel-skroty'&&index>0&&<ExcelMasterGuide key={'excel-master-'+module} lessonNo={module}/>}
   {carpentry&&<View testID="carpentry-checklist" accessibilityLiveRegion="polite" style={{backgroundColor:canFinish?'#e5f4e1':'#fff7e6',borderRadius:15,borderWidth:1,borderColor:canFinish?'#a8cda4':'#e7d3a7',padding:16,marginBottom:16,gap:9}}>
    <Text style={{fontSize:17,fontWeight:'900',color:ink}}>{canFinish?'✓ Obydwa zadania zaliczone — możesz przejść dalej':'Aby przejść dalej, zalicz 2 zadania'}</Text>
    <Text style={{fontSize:14,fontWeight:'800',color:'#4c634d'}}>Twój wynik: {done.includes(module)?2:passedCount}/2</Text>
    <Pressable accessibilityRole="button" onPress={returnToExercise} style={{paddingVertical:10,paddingHorizontal:12,backgroundColor:'white',borderRadius:9,minHeight:44}}>
     <Text style={{fontWeight:'800',color:ink}}>{done.includes(module)||passed[objective||'case']?'✓':'○'} 1. Pytanie kontrolne — {done.includes(module)||passed[objective||'case']?'zaliczone':'do rozwiązania'} ↗</Text>
    </Pressable>
    <Pressable accessibilityRole="button" onPress={openCarpentry} style={{paddingVertical:10,paddingHorizontal:12,backgroundColor:'white',borderRadius:9,minHeight:44}}>
     <Text style={{fontWeight:'800',color:ink}}>{done.includes(module)||passed.carpentry?'✓':'○'} 2. Zadanie z obliczeń — {done.includes(module)||passed.carpentry?'zaliczone':'do rozwiązania'} ↗</Text>
    </Pressable>
    <Text style={{fontSize:12,lineHeight:19,color:'#626e59'}}>Kalkulator na własnych danych służy do ćwiczeń. Aby zaliczyć zadanie 2, wybierz „Zadanie z lekcji”, wpisz wynik i naciśnij „Sprawdź mój wynik”. Oba zaliczenia zostaną zachowane.</Text>
   </View>}
   {!!lesson.material?.curiosity&&<View style={{paddingVertical:11,paddingHorizontal:15,marginBottom:12,backgroundColor:'#eff5e9',borderLeftWidth:3,borderLeftColor:'#87af73',borderRadius:9,gap:4}}>
    <Text style={{fontSize:12,color:'#3b6a46',fontWeight:'900'}}>WARTO WIEDZIEĆ</Text>
    <Text style={{fontSize:15,color:'#2b4b35',lineHeight:23}}>{lesson.material.curiosity}</Text>
   </View>}
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginBottom:16,alignItems:'center'}}>
    <Text style={{color:'#366846',fontWeight:'900',fontSize:12,backgroundColor:'#e1efda',paddingHorizontal:11,paddingVertical:8,borderRadius:10}}>1 · POZNAJ</Text>
    <Text style={{color:'#526b57',fontSize:12,fontWeight:'900',backgroundColor:'#eef2ea',paddingHorizontal:11,paddingVertical:8,borderRadius:10}}>2 · SPRÓBUJ</Text>
    <Text style={{color:'#526b57',fontSize:12,fontWeight:'900',backgroundColor:'#eef2ea',paddingHorizontal:11,paddingVertical:8,borderRadius:10}}>3 · DALEJ</Text>
   </View>
   {slug==='autocad-skroty'&&<AutoCADLessonMethod lessonNo={module} title={lesson.title_pl} raw={lesson.material?.raw}/>}
   {slug==='autocad-skroty'&&<CadWorkspace key={'autocad-workshop-'+module} storageKey={userId} lessonNo={module} shortcut={undefined} runId={0}/>}
   {slug==='autocad-skroty'&&<AutoCADHomework key={'autocad-homework-'+module} lessonNo={module} userId={userId}/>}
   {(!!lesson.material?.sections?.length||!!lesson.material?.illustration)&&
    <LessonIllustratedSections
     courseSlug={slug} lessonNo={module} title={lesson.title_pl}
     sections={lesson.material?.sections} illustration={lesson.material?.illustration}
     diagram={lesson.material.practice?.diagram} visual={lesson.material.practice?.visual}
    />}
   {slug==='excel-skroty'&&[9,15,17,18,20,25,26,29].includes(module)&&<ExcelVisualPractices key={'excel-visual-'+module} lessonNo={module}/>}
   {slug==='autocad-skroty'&&<AutoCADPracticeFiles lessonNo={module}/>}
   <LessonClarification key={slug+'-'+module} courseSlug={slug} lessonNo={module}/>
   {!lesson.material?.sections?.length&&!!lesson.material?.learning&&!!lesson.material?.raw?.length&&<View style={{backgroundColor:'#fff',borderRadius:17,padding:21,borderWidth:1,borderColor:line,gap:13,marginBottom:16}}>
     <Text style={{color:'#3d7650',fontWeight:'900',fontSize:12}}>WYJAŚNIENIA I PRZYKŁADY Z ŻYCIA</Text>
     {lesson.material.raw.slice(1).filter(paragraph=>typeof paragraph==='string'&&!/^(Źródło|Status nauczania w Polsce|Wersja edukacyjna|Materiał wstępny|Do sprawdzenia)/i.test(paragraph)&&!paragraph.includes(lesson.material?.learning?.situation||'____NO_MATCH____')&&!paragraph.includes(lesson.material?.learning?.task||'____NO_MATCH____')).slice(0,5).map((paragraph,i)=><Text key={i} style={{color:'#365344',lineHeight:25,fontSize:15}}>{paragraph}</Text>)}
   </View>}
   {!carpentry&&requirements.length>0&&<View testID="lesson-requirements" accessibilityLiveRegion="polite" style={{backgroundColor:'#edf5e7',padding:17,borderRadius:12,gap:9,marginVertical:12}}>
    <Text style={{fontWeight:'900',color:ink,fontSize:17}}>Do ukończenia tej lekcji: {requirements.length===1?'1 zadanie':requirements.length+' zadania'}</Text>
    {requirements.map((item,i)=><Text key={item.key} style={{color:ink,lineHeight:24}}>{item.passed?'✓':'○'} {i+1}. {item.label}{item.passed?' — zaliczone':' — do wykonania'}</Text>)}
    <Text style={{color:secondary,lineHeight:22}}>W pytaniu wybierz jedną odpowiedź. Rozmowa z Anielką jest opcjonalna.</Text>
   </View>}
   {carpentry&&<View onLayout={event=>{carpentryYRef.current=event.nativeEvent.layout.y}}>
    <CarpentryPracticeLab key={module} lessonNo={module} alreadyPassed={passed.carpentry}
     onPassed={()=>markPassed(module,'carpentry')}
     onVerify={(answer)=>recordAttempt('carpentry',0,true,undefined,undefined,answer)}/>
   </View>}
    <View onLayout={(event)=>{exerciseYRef.current=event.nativeEvent.layout.y}}>
   {!!objective&&!!passed[objective]&&<Text style={{color:ink,marginVertical:8,fontWeight:'800'}}>✓ Odpowiedź do zadania zapisana</Text>}
   {lesson.material?.construction?
     <ConstructionLesson identity={slug+'-'+String(module)} lesson={lesson.material.construction} onAttempt={(index,correct)=>recordAttempt('construction',index,correct)}/>:
     <>
      {learning&&<CaseLesson data={learning} identity={slug+'-'+String(module)}
       hideSituation={!!learning.situation&&sections.some(section=>section?.text?.includes(learning.situation!))}
       hideTask={slug==='autocad-skroty'||!!learning.task&&sections.some(section=>section?.text?.includes(learning.task!))}
       onAttempt={(index,correct)=>recordAttempt('case',index,correct)}/>}
      {!lesson.material?.learning&&!lesson.material?.shortcuts?.length&&<View style={{backgroundColor:'white',borderRadius:17,padding:22,borderWidth:1,borderColor:line,gap:12}}>
       {(lesson.material?.raw||[]).filter((line,i)=>i>0&&!/https?:\/\/|^Źródło|^Do sprawdzenia|^Status nauczania|^Wersja edukacyjna|^Materiał wstępny|^Zastanów się, jak temat|^Ćwiczenie: przygotuj krótką listę|^Status: zarys dydaktyczny/i.test(line)).map((line,i)=><Text key={i} style={{color:'#394d41',fontSize:16,lineHeight:26}}>{line}</Text>)}
      </View>}
      {!lesson.material?.sections?.length&&!!lesson.material?.shortcuts?.length&&!!lesson.material?.raw?.[1]&&<View style={{backgroundColor:'#ecf4e9',borderColor:'#dce9d8',borderWidth:1,padding:17,borderRadius:14,marginBottom:15,gap:8}}>
       <Text style={{color:'#28563c',fontWeight:'900',fontSize:13}}>CEL TEJ LEKCJI</Text>
       <Text style={{color:'#244a36',fontSize:16,lineHeight:25}}>{lesson.material.raw[1]}</Text>
      </View>}
      <View onLayout={event=>{
       workshopYRef.current=exerciseYRef.current+event.nativeEvent.layout.y;
       if(pendingWorkshopRef.current){
        if(scrollToExcelGrid())pendingWorkshopRef.current=false;
        else if(slug!=='excel-skroty'||Platform.OS!=='web'){
         pendingWorkshopRef.current=false;
         scrollRef.current?.scrollTo({y:Math.max(0,workshopYRef.current-18),animated:true});
        }
       }
      }}>
       <KeyboardLesson key={slug+'-'+module} slug={slug} shortcuts={lesson.material?.shortcuts} tips={lesson.material?.quickTips} exercise={lesson.material?.exercise}
        alreadyVerified={passed.keyboard} onAttempt={(index,correct,activeCombo,selectedCombo)=>recordAttempt('keyboard',index,correct,activeCombo,selectedCombo)}/>
      </View>
     </>
   }
   </View>
   {isLogisticsCourse(slug)&&[9,19,29].includes(index)&&<LogisticsWorkshop key={slug+'-'+module} slug={slug} lessonNo={module}/>}

   <LessonHelp slug={slug} title={lesson.title_pl}/>
   <Pressable testID="anielka-help-toggle" accessibilityRole="button" accessibilityState={{expanded:coachOpen}}
     onPress={()=>setCoachOpen(v=>!v)} style={{marginTop:14,padding:15,backgroundColor:'#edf5e8',borderRadius:12}}>
    <Text style={{color:ink,fontWeight:'900'}}>{coachOpen?'Zwiń rozmowę z Anielką ↑':'Nie rozumiesz? Zapytaj Anielkę ↓'}</Text>
   </Pressable>
   {coachOpen&&<GuidedDialogue key={slug+'-'+module} courseSlug={slug} lessonNo={module}/>}
   <Pressable accessibilityRole="button" disabled={saving}
    onPress={()=>{if(canFinish)void finishLesson();else if(carpentry&&(!objective||passed[objective])&&!passed.carpentry)openCarpentry();else returnToExercise()}}
    style={{backgroundColor:canFinish?ink:'#e0e9db',paddingVertical:19,paddingHorizontal:15,borderRadius:15,marginTop:14,opacity:saving?0.6:1}}>
    <Text style={{color:canFinish?'white':ink,fontWeight:'900',textAlign:'center',fontSize:17,lineHeight:25}}>
     {saving?'Zapisuję…':!canFinish?(carpentry?'Zaliczone '+passedCount+'/2 · dokończ zadanie ↑':'↑ Pozostało zadań: '+missingRequirements.length):next!==undefined?'Dalej · lekcja '+(index+2)+' →':reviewMode?'Zakończ powtórkę →':'Przejdź do egzaminu →'}
    </Text>
    {canFinish&&next!==undefined&&<Text style={{color:'#d5e9d4',textAlign:'center',fontSize:12,marginTop:4}} numberOfLines={1}>{items[index+1]?.title_pl}</Text>}
   </Pressable>
   {!canFinish&&<Text style={{fontSize:12,color:'#647565',lineHeight:19,marginTop:7,textAlign:'center'}}>{requirementMessage}</Text>}
   {lessonNavigation('bottom')}
   </>}
  </>}
  {!!msg&&<View style={{marginTop:15,padding:15,borderRadius:12,backgroundColor:'#eaf2e0'}}><Text style={{color:ink,fontWeight:'700',lineHeight:22}}>{msg}</Text></View>}
 </ScrollView>;
}
