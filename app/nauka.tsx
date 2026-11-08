import React,{useEffect,useState} from 'react';
import {ScrollView,View,Text,TextInput,Pressable,ActivityIndicator} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
import KeyboardLesson,{type KeyboardShortcut,type KeyboardReference} from '../src/KeyboardLesson';
import ConstructionLesson,{type ConstructionMaterial} from '../src/ConstructionLesson';
import CaseLesson,{type LearningCase} from '../src/CaseLesson';
import GuidedDialogue from '../src/GuidedDialogue';
import CourseIntro from '../src/CourseIntro';
import ConceptAtlas from '../src/ConceptAtlas';
import EcoAtlas from '../src/EcoAtlas';
import FinalExam from '../src/FinalExam';
import LessonIllustratedSections,{type LearningSection} from '../src/LessonIllustratedSections';
import SoftwareOrientation,{hasSoftwareOrientation} from '../src/SoftwareOrientation';
import {isLogisticsCourse,LogisticsAtlas,LogisticsWorkshop} from '../src/LogisticsWorkshop';
type Lesson={
 lesson_no:number,title_pl:string,
 material:{raw?:string[],sections?:LearningSection[],illustration?:string,construction?:ConstructionMaterial,learning?:LearningCase,shortcuts?:KeyboardShortcut[],quickTips?:string[],exercise?:string,references?:KeyboardReference[],editorial_status?:string}
};
type NoteState=Record<string,string>;
const ink='#183c2b',secondary='#526f5c',line='#dfeada';
export default function Learning(){
 const {course}=useLocalSearchParams<{course?:string}>(),slug=typeof course==='string'?course:'',router=useRouter();
 const scrollRef=React.useRef<ScrollView>(null);
 const [items,setItems]=useState<Lesson[]>([]),[done,setDone]=useState<number[]>([]),
 [notes,setNotes]=useState<NoteState>({}),[module,setModule]=useState(0),
 [userId,setUserId]=useState(''),[error,setError]=useState(''),[msg,setMsg]=useState(''),
 [busy,setBusy]=useState(true),[showProgram,setShowProgram]=useState(false),[saving,setSaving]=useState(false),[verified,setVerified]=useState(false),[verifiedKeyboard,setVerifiedKeyboard]=useState(false),[courseInfo,setCourseInfo]=useState({title:'',description:''}),[practice,setPractice]=useState({attempts:0,correct:0}),[review,setReview]=useState<Record<string,{correct:number,incorrect:number}>>({});
 useEffect(()=>{let active=true;(async()=>{
  setBusy(true);setError('');
  try{
   if(!slug)throw new Error('Wybierz kurs z listy.');
   const {data:{user:u},error:ue}=await supabase.auth.getUser();
   if(ue||!u){router.replace('/konto');return;}
   const {data:en,error:ee}=await supabase.from('ta_enrollments').select('id').eq('user_id',u.id).eq('course_slug',slug).in('status',['active','demo']).gt('expires_at',new Date().toISOString()).limit(1);
   if(ee)throw ee;
   if(!en?.length)throw new Error('Nie masz obecnie dostępu do tego kursu. Wróć do swoich kursów.');
   const [lessons,draft,progress,details,attempts]=await Promise.all([
    supabase.from('ta_lessons').select('lesson_no,title_pl,material').eq('course_slug',slug).order('lesson_no',{ascending:true}),
    supabase.from('ta_drafts').select('last_module,notes').eq('user_id',u.id).eq('course_slug',slug).maybeSingle(),
    supabase.from('ta_learning_progress').select('lesson_no').eq('user_id',u.id).eq('course_slug',slug),
    supabase.from('ta_courses').select('title_pl,description_pl').eq('slug',slug).maybeSingle(),
    supabase.from('ta_learning_attempts').select('lesson_no,correct').eq('user_id',u.id).eq('course_slug',slug)
   ]);
   if(lessons.error||draft.error||progress.error||details.error)throw lessons.error||draft.error||progress.error||details.error;
   const all=(lessons.data||[]) as Lesson[],completed=(progress.data||[]).map(v=>v.lesson_no);
   if(active){
    setUserId(u.id);setItems(all);setDone(completed);setCourseInfo({title:details.data?.title_pl||slug,description:details.data?.description_pl||''});
    setPractice({attempts:attempts.data?.length||0,correct:(attempts.data||[]).filter(x=>x.correct).length});
    const perLesson:Record<string,{correct:number,incorrect:number}>={};
    for(const attempt of attempts.data||[]){
     const k=String(attempt.lesson_no);if(!perLesson[k])perLesson[k]={correct:0,incorrect:0};
     if(attempt.correct)perLesson[k].correct++;else perLesson[k].incorrect++;
    }
    setReview(perLesson);
    const state=draft.data?.notes||{};
    setNotes(state.byLesson||{[String(draft.data?.last_module||0)]:String(state.text||'')});
    const resume=draft.data?.last_module;
    const next=all.find(v=>!completed.includes(v.lesson_no))?.lesson_no??all[all.length-1]?.lesson_no??0; // resume always at earliest unfinished stage
    setModule(next);
   }
  }catch(e:any){if(active)setError(e?.message||'Nie udało się otworzyć kursu.');}
  finally{if(active)setBusy(false);}
 })();return()=>{active=false};},[slug]);
 const lesson=items.find(x=>x.lesson_no===module),index=items.findIndex(x=>x.lesson_no===module);
 const completed=items.filter(x=>done.includes(x.lesson_no)).length;
 const progress=items.length?Math.round(completed/items.length*100):0;
 const next=index>=0?items[index+1]?.lesson_no:undefined,previous=index>0?items[index-1]?.lesson_no:undefined;
 const currentNotes=notes[String(module)]||'';
 async function recordAttempt(mode:'case'|'construction'|'keyboard',answerIndex:number,_localCorrect:boolean,activeCombo?:string,selectedCombo?:string){
  if(!userId)return;
  try{
   const {data,error:e}=await supabase.functions.invoke<{ok?:boolean;correct?:boolean;error?:string}>('ta-lesson-guide',{
    body:{action:'attempt',course_slug:slug,lesson_no:module,mode,selected_index:answerIndex,
     ...(mode==='keyboard'?{active_combo:activeCombo,selected_combo:selectedCombo}:{})}
   });
   if(e||!data?.ok)throw new Error(data?.error||e?.message||'Brak odpowiedzi serwera');
   const correct=!!data.correct;
   setPractice(v=>({attempts:v.attempts+1,correct:v.correct+(correct?1:0)}));
   setReview(v=>{
    const k=String(module),t=v[k]||{correct:0,incorrect:0};
    return {...v,[k]:{correct:t.correct+(correct?1:0),incorrect:t.incorrect+(correct?0:1)}};
   });
  }catch(e:any){setMsg('Serwer nie mógł zweryfikować odpowiedzi. '+String(e?.message||'').slice(0,150));}
 }
 function changeModule(number:number){
  const firstPending=items.find(v=>!done.includes(v.lesson_no));
  if(!items.some(v=>v.lesson_no===number))return;
  if(firstPending&&number>firstPending.lesson_no){setMsg('Najpierw ukończ poprzednie lekcje i ich ćwiczenia.');return;}
  setModule(number);setVerified(false);setVerifiedKeyboard(false);setMsg('');scrollRef.current?.scrollTo({y:0,animated:true});
 }
 const firstPending=items.find(v=>!done.includes(v.lesson_no));
 const unlockedNo=firstPending?.lesson_no??Infinity;
 const hasExercise=!!(lesson?.material?.learning||lesson?.material?.construction||lesson?.material?.shortcuts?.length);
 const canFinish=done.includes(module)||(
   (!lesson?.material?.learning&&!lesson?.material?.construction||verified)&&
   (!lesson?.material?.shortcuts?.length||verifiedKeyboard)
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
  if(!canFinish){setMsg('Wykonaj poprawnie ćwiczenie. Rozmowa z Anielką jest zawsze opcjonalna.');return;}
  setSaving(true);setMsg('');
  try{
   if(!done.includes(module)){
    // Server verifies the two-way dialogue, quiz attempts and chronological ordering.
    const {data:result,error:pe}=await supabase.functions.invoke<{ok?:boolean;completed?:boolean;error?:string}>('ta-lesson-guide',{
      body:{action:'complete',course_slug:slug,lesson_no:module}
    });
    if(pe||!result?.completed){
      const msg=result?.error==='exercise_required'?'Wykonaj poprawnie ćwiczenie praktyczne, a potem spróbuj ponownie.':
       result?.error==='previous_lessons_required'?'Najpierw ukończ poprzednie lekcje.':
       'Nie udało się potwierdzić zaliczenia na serwerze. Spróbuj ponownie.';
      throw new Error(msg);
    }
    setDone(prev=>prev.includes(module)?prev:[...prev,module]);
   }
   const target=next??module;
   try{await persistDraft(target,notes);}
   catch{setMsg('Lekcja ukończona. Notatki nie zostały zapisane — możesz spróbować ponownie.');}
   if(next!==undefined){setModule(next);setVerified(false);setVerifiedKeyboard(false);setMsg(prev=>prev||'Lekcja zaliczona. Oto następny etap.');scrollRef.current?.scrollTo({y:0,animated:true});}
   else setMsg('Brawo! Ukończono wszystkie lekcje. Poniżej dostępny jest egzamin końcowy Anielki — postęp 100% to jeszcze nie zaliczenie kursu.');
  }catch(e:any){setMsg('Postęp nie został zapisany: '+(e?.message||'błąd sieci')+'. Spróbuj jeszcze raz.');}
  finally{setSaving(false);}
 }
 return <ScrollView ref={scrollRef} style={{backgroundColor:'#fbfcf7',flex:1}} contentContainerStyle={{paddingHorizontal:18,paddingTop:25,paddingBottom:65,maxWidth:860,alignSelf:'center',width:'100%'}}>
  <Pressable onPress={()=>router.push('/moje-kursy')} accessibilityRole="button"><Text style={{color:'#376143',fontWeight:'800'}}>← Moje kursy</Text></Pressable>
  <Text style={{fontSize:31,fontWeight:'900',color:ink,marginTop:15,marginBottom:9}}>Moja nauka</Text>
  {busy&&<ActivityIndicator size="large"/>}
  {!!error&&<Text style={{color:'#ac382a',backgroundColor:'#fff2e8',padding:17,borderRadius:12}}>{error}</Text>}
  {!!items.length&&<>
   <View style={{backgroundColor:'#eaf3e4',padding:17,borderRadius:15,marginTop:12,marginBottom:18}}>
    <View style={{flexDirection:'row',justifyContent:'space-between',gap:10,alignItems:'center'}}>
     <Text style={{color:ink,fontWeight:'900'}}>Twój postęp</Text>
     <Text style={{fontSize:19,fontWeight:'900',color:ink}}>{progress}%</Text>
    </View>
    <View style={{height:9,backgroundColor:'#cfddca',borderRadius:9,marginTop:10,overflow:'hidden'}}>
     <View style={{height:9,width:progress+'%',backgroundColor:'#7cae6e'}}/>
    </View>
    <Text style={{fontSize:12,color:secondary,marginTop:9}}>Ukończono {completed} z {items.length} lekcji. Nowe etapy otwierają się wyłącznie po zaliczeniu poprzedniego.</Text>
    {practice.attempts>0&&<Text style={{fontSize:12,color:secondary,marginTop:7}}>Sprawdziany: {practice.correct} poprawnych odpowiedzi z {practice.attempts} prób. Błędy pomagają rozpoznać, co trzeba powtórzyć.</Text>}
   </View>
   {items.some(x=>(review[String(x.lesson_no)]?.incorrect||0)>0&&(review[String(x.lesson_no)]?.correct||0)===0)&&<View style={{backgroundColor:'#fff5e5',borderRadius:14,padding:16,marginBottom:15,gap:9}}>
    <Text style={{color:'#604722',fontWeight:'900',fontSize:16}}>Warto powtórzyć</Text>
    <Text style={{color:'#7d663d',fontSize:12,lineHeight:20}}>W tych lekcjach pojawiły się trudności. Możesz wrócić do przykładu i przećwiczyć zadanie jeszcze raz.</Text>
    {items.filter(x=>(review[String(x.lesson_no)]?.incorrect||0)>0&&(review[String(x.lesson_no)]?.correct||0)===0).slice(0,3).map(x=><Pressable key={x.lesson_no} onPress={()=>changeModule(x.lesson_no)} style={{backgroundColor:'white',padding:12,borderRadius:10}}>
      <Text style={{fontWeight:'800',color:ink}}>{x.title_pl}</Text>
      <Text style={{fontSize:11,color:'#7b6548'}}>Powtórz ćwiczenie, aby sprawdzić zrozumienie.</Text>
    </Pressable>)}
   </View>}
   <Pressable onPress={()=>setShowProgram(v=>!v)} accessibilityRole="button"
    style={{backgroundColor:'#eef6e9',padding:17,borderRadius:13,marginBottom:13,borderWidth:1,borderColor:'#d6e7d0',gap:7}}>
     <Text style={{color:ink,fontWeight:'900',fontSize:18}}>{showProgram?'Zwiń plan kursu':'Plan kursu — zobacz wszystkie lekcje →'}</Text>
     <Text style={{color:secondary,fontSize:13}}>Aktualnie: {items.length===30?'dział '+(Math.floor(index/10)+1)+' z 3 · ':''}lekcja {index+1} z {items.length}</Text>
     <Text style={{color:ink,fontSize:15,fontWeight:'800'}}>{lesson?.title_pl}</Text>
   </Pressable>
   {showProgram&&(items.length===30?[
     {name:'DZIAŁ I · PODSTAWY',about:'Lekcje 1–10 · poznaj pojęcia, interfejs i pierwsze kroki',list:items.slice(0,10)},
     {name:'DZIAŁ II · PRAKTYKA',about:'Lekcje 11–20 · ćwiczenia, scenariusze i kontrola wyniku',list:items.slice(10,20)},
     {name:'DZIAŁ III · EXPERT',about:'Lekcje 21–30 · samodzielne zadania i decyzje',list:items.slice(20,30)}
   ]:[{name:'DOSTĘPNE LEKCJE',about:'Program w trakcie rozbudowy',list:items}]).map((part,i)=><View key={part.name} style={{marginBottom:13,backgroundColor:'white',borderWidth:1,borderColor:'#dfe9dc',borderRadius:13,padding:13,gap:9}}>
     <Text style={{color:ink,fontWeight:'900',fontSize:13}}>{part.name}</Text>
     <Text style={{color:secondary,fontSize:12,lineHeight:19}}>{part.about}</Text>
     <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{part.list.map(v=><Pressable key={v.lesson_no} disabled={v.lesson_no>unlockedNo} onPress={()=>changeModule(v.lesson_no)} accessibilityLabel={'Lekcja '+(v.lesson_no+1)+': '+v.title_pl+(v.lesson_no>unlockedNo?' — zablokowana':'')} style={{minWidth:40,paddingVertical:10,paddingHorizontal:11,opacity:v.lesson_no>unlockedNo?0.38:1,backgroundColor:v.lesson_no===module?ink:done.includes(v.lesson_no)?'#def0d4':'#f8faf6',borderRadius:10,borderWidth:1,borderColor:v.lesson_no===module?ink:line}}>
      <Text style={{fontWeight:'900',color:v.lesson_no===module?'white':ink,textAlign:'center'}}>{done.includes(v.lesson_no)?'✓ ':v.lesson_no>unlockedNo?'🔒 ':''}{v.lesson_no+1}</Text>
     </Pressable>)}</View>
   </View>)}
   {progress===100&&<View style={{padding:17,backgroundColor:'#e5f2de',borderRadius:12,marginBottom:15}}>
    <Text style={{fontWeight:'900',color:ink,fontSize:18}}>Wszystkie lekcje ukończone! 🎉</Text>
    <Text style={{color:secondary,marginTop:6}}>Masz komplet lekcji. Teraz czeka Cię osobny egzamin Anielki. Dopiero jego zaliczenie umożliwia wystawienie autorskiego dyplomu.</Text>
   </View>}
  </>}
  {progress===100&&<FinalExam courseSlug={slug}/>}
  {!!lesson&&<>
   {index===0&&!hasSoftwareOrientation(slug)&&!isLogisticsCourse(slug)&&<CourseIntro slug={slug} title={courseInfo.title} description={courseInfo.description} first={true}/>}
   {index===0&&hasSoftwareOrientation(slug)&&<SoftwareOrientation slug={slug}/>}
   {(index===0||(items.length===30&&index%10===0))&&(slug==='jestem-eko'?<EcoAtlas/>:isLogisticsCourse(slug)?<LogisticsAtlas slug={slug}/>:hasSoftwareOrientation(slug)?null:<ConceptAtlas slug={slug}/>)}
   {items.length===30&&<View style={{borderLeftWidth:4,borderColor:index<10?'#b0d9aa':index<20?'#679c72':'#305c45',paddingHorizontal:13,paddingVertical:9,backgroundColor:'#edf3e9',marginBottom:12}}>
     <Text style={{fontWeight:'900',color:ink}}>{index<10?'DZIAŁ I · PODSTAWY — OD ZERA':index<20?'DZIAŁ II · PRAKTYKA':'DZIAŁ III · EXPERT'}</Text>
   </View>}
   <Text style={{color:'#638068',fontWeight:'700'}}>Lekcja {index+1} z {items.length}{done.includes(module)?' · Ukończona ✓':''}</Text>
   <Text style={{color:ink,fontSize:26,fontWeight:'900',marginTop:11,marginBottom:17,lineHeight:33}}>{lesson.title_pl}</Text>
   {(!!lesson.material?.sections?.length||!!lesson.material?.illustration)&&
    <LessonIllustratedSections
     courseSlug={slug} lessonNo={module} title={lesson.title_pl}
     sections={index===0&&hasSoftwareOrientation(slug)?lesson.material?.sections?.slice(1):lesson.material?.sections} illustration={lesson.material?.illustration}
     situation={lesson.material?.learning?.situation} example={lesson.material?.learning?.example}
    />}
   {!lesson.material?.sections?.length&&!!lesson.material?.learning&&!!lesson.material?.raw?.length&&<View style={{backgroundColor:'#fff',borderRadius:17,padding:21,borderWidth:1,borderColor:line,gap:13,marginBottom:16}}>
     <Text style={{color:'#3d7650',fontWeight:'900',fontSize:12}}>WYJAŚNIENIA I PRZYKŁADY Z ŻYCIA</Text>
     {lesson.material.raw.slice(1).filter(paragraph=>typeof paragraph==='string'&&!/^(Źródło|Status nauczania w Polsce|Wersja edukacyjna|Materiał wstępny|Do sprawdzenia)/i.test(paragraph)&&!paragraph.includes(lesson.material?.learning?.situation||'____NO_MATCH____')&&!paragraph.includes(lesson.material?.learning?.task||'____NO_MATCH____')).slice(0,5).map((paragraph,i)=><Text key={i} style={{color:'#365344',lineHeight:25,fontSize:15}}>{paragraph}</Text>)}
   </View>}
   {lesson.material?.construction?
     <ConstructionLesson identity={slug+'-'+String(module)} lesson={lesson.material.construction} onPassed={setVerified} onAttempt={(index,correct)=>recordAttempt('construction',index,correct)}/>:
     <>
      {lesson.material?.learning&&<CaseLesson data={lesson.material.learning} identity={slug+'-'+String(module)} onPassed={setVerified} hideSituation={!!lesson.material?.sections?.length||!!lesson.material?.raw?.some(p=>p.includes(lesson.material?.learning?.situation||'____NO_MATCH____'))} onAttempt={(index,correct)=>recordAttempt('case',index,correct)}/>}
      {!lesson.material?.learning&&!lesson.material?.shortcuts?.length&&<View style={{backgroundColor:'white',borderRadius:17,padding:22,borderWidth:1,borderColor:line,gap:12}}>
       {(lesson.material?.raw||[]).filter((line,i)=>i>0&&!/https?:\/\/|^Źródło|^Do sprawdzenia|^Status nauczania|^Wersja edukacyjna|^Materiał wstępny|^Zastanów się, jak temat|^Ćwiczenie: przygotuj krótką listę|^Status: zarys dydaktyczny/i.test(line)).map((line,i)=><Text key={i} style={{color:'#394d41',fontSize:16,lineHeight:26}}>{line}</Text>)}
      </View>}
      {!lesson.material?.sections?.length&&!!lesson.material?.shortcuts?.length&&!!lesson.material?.raw?.[1]&&<View style={{backgroundColor:'#ecf4e9',borderColor:'#dce9d8',borderWidth:1,padding:17,borderRadius:14,marginBottom:15,gap:8}}>
       <Text style={{color:'#28563c',fontWeight:'900',fontSize:13}}>CEL TEJ LEKCJI</Text>
       <Text style={{color:'#244a36',fontSize:16,lineHeight:25}}>{lesson.material.raw[1]}</Text>
      </View>}
      <KeyboardLesson identity={slug+'-'+String(module)} shortcuts={lesson.material?.shortcuts} tips={lesson.material?.quickTips} exercise={lesson.material?.exercise} references={lesson.material?.references} onPracticed={setVerifiedKeyboard} onAttempt={(index,correct,activeCombo,selectedCombo)=>recordAttempt('keyboard',index,correct,activeCombo,selectedCombo)}/>
     </>
   }
   {isLogisticsCourse(slug)&&[9,19,29].includes(index)&&<LogisticsWorkshop key={slug+'-'+module} slug={slug} lessonNo={module}/>}

   <Pressable disabled={saving} onPress={finishLesson} style={{backgroundColor:ink,padding:18,borderRadius:14,marginTop:18,opacity:saving?0.55:1}}>
    <Text style={{color:'white',fontWeight:'900',textAlign:'center',fontSize:16}}>{saving?'Zapisuję…':!canFinish?'Rozwiąż zadanie, aby przejść dalej':next!==undefined?'Zalicz lekcję i przejdź dalej →':'Zakończ lekcje i przejdź do egzaminu →'}</Text>
   </Pressable>
   {!canFinish&&<Text style={{fontSize:13,color:'#647565',lineHeight:21,marginTop:10}}>Wybierz poprawną odpowiedź w ćwiczeniu. Kolejne lekcje otwierają się po kolei.</Text>}
   <GuidedDialogue key={slug+'-'+module} courseSlug={slug} lessonNo={module}/>
   {next!==undefined&&<View style={{padding:13,marginTop:10,backgroundColor:'#f0f5ed',borderRadius:11}}>
     <Text style={{color:'#648067',fontWeight:'800',fontSize:12}}>NASTĘPNA LEKCJA · {index+2}/{items.length}</Text>
     <Text style={{color:ink,fontWeight:'800',fontSize:15,marginTop:5}}>{items[index+1]?.title_pl}</Text>
    </View>}
   <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:19,gap:12}}>
    <Pressable disabled={previous===undefined} onPress={()=>previous!==undefined&&changeModule(previous)} style={{padding:11,opacity:previous===undefined?0.4:1}}>
     <Text style={{fontWeight:'800',color:ink}}>← Poprzednia</Text>
    </Pressable>
   </View>
  </>}
  {!!msg&&<View style={{marginTop:15,padding:15,borderRadius:12,backgroundColor:'#eaf2e0'}}><Text style={{color:ink,fontWeight:'700',lineHeight:22}}>{msg}</Text></View>}
 </ScrollView>;
}
