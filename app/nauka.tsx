import React,{useEffect,useState} from 'react';
import {ScrollView,View,Text,TextInput,Pressable,ActivityIndicator} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
import KeyboardLesson,{type KeyboardShortcut,type KeyboardReference} from '../src/KeyboardLesson';
import ConstructionLesson,{type ConstructionMaterial} from '../src/ConstructionLesson';
import CaseLesson,{type LearningCase} from '../src/CaseLesson';
import AiTutor from '../src/AiTutor';
import CourseIntro from '../src/CourseIntro';
type Lesson={
 lesson_no:number,title_pl:string,
 material:{raw?:string[],construction?:ConstructionMaterial,learning?:LearningCase,shortcuts?:KeyboardShortcut[],quickTips?:string[],exercise?:string,references?:KeyboardReference[],editorial_status?:string}
};
type NoteState=Record<string,string>;
const ink='#183c2b',secondary='#526f5c',line='#dfeada';
export default function Learning(){
 const {course}=useLocalSearchParams<{course?:string}>(),slug=typeof course==='string'?course:'',router=useRouter();
 const [items,setItems]=useState<Lesson[]>([]),[done,setDone]=useState<number[]>([]),
 [notes,setNotes]=useState<NoteState>({}),[module,setModule]=useState(0),
 [userId,setUserId]=useState(''),[error,setError]=useState(''),[msg,setMsg]=useState(''),
 [busy,setBusy]=useState(true),[saving,setSaving]=useState(false),[verified,setVerified]=useState(false),[courseInfo,setCourseInfo]=useState({title:'',description:''}),[practice,setPractice]=useState({attempts:0,correct:0});
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
    supabase.from('ta_learning_attempts').select('correct').eq('user_id',u.id).eq('course_slug',slug)
   ]);
   if(lessons.error||draft.error||progress.error||details.error)throw lessons.error||draft.error||progress.error||details.error;
   const all=(lessons.data||[]) as Lesson[],completed=(progress.data||[]).map(v=>v.lesson_no);
   if(active){
    setUserId(u.id);setItems(all);setDone(completed);setCourseInfo({title:details.data?.title_pl||slug,description:details.data?.description_pl||''});
    setPractice({attempts:attempts.data?.length||0,correct:(attempts.data||[]).filter(x=>x.correct).length});
    const state=draft.data?.notes||{};
    setNotes(state.byLesson||{[String(draft.data?.last_module||0)]:String(state.text||'')});
    const resume=draft.data?.last_module;
    const next=all.some(v=>v.lesson_no===resume&&!completed.includes(v.lesson_no))?resume:all.find(v=>!completed.includes(v.lesson_no))?.lesson_no??all[0]?.lesson_no??0;
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
 async function recordAttempt(mode:'case'|'construction'|'keyboard',answerIndex:number,correct:boolean){
  if(!userId)return;
  try{
   const {error:e}=await supabase.from('ta_learning_attempts').insert({
    user_id:userId,course_slug:slug,lesson_no:module,mode,selected_index:answerIndex,correct
   });
   if(e)throw e;
   setPractice(v=>({attempts:v.attempts+1,correct:v.correct+(correct?1:0)}));
  }catch(e:any){setMsg('Odpowiedź sprawdzona, ale historia próby nie została zapisana. '+String(e?.message||'').slice(0,110));}
 }
 function changeModule(number:number){if(items.some(v=>v.lesson_no===number)){setModule(number);setVerified(false);setMsg('');}}
 const hasExercise=!!(lesson?.material?.learning||lesson?.material?.construction||lesson?.material?.shortcuts?.length);
 const canFinish=done.includes(module)||!hasExercise||verified;
 async function persistDraft(target:number,noteState:NoteState){
  if(!userId)return;
  const {error:e}=await supabase.from('ta_drafts').upsert({
   user_id:userId,course_slug:slug,last_module:target,notes:{byLesson:noteState},
   updated_at:new Date().toISOString()
  },{onConflict:'user_id,course_slug'});
  if(e)throw e;
 }
 async function saveNotes(){
  if(saving||!userId)return;setSaving(true);setMsg('');
  try{await persistDraft(module,notes);setMsg('Notatki zapisane.');}
  catch(e:any){setMsg('Nie udało się zapisać notatek: '+(e?.message||'błąd sieci'));}
  finally{setSaving(false);}
 }
 async function finishLesson(){
  if(saving||!userId||!lesson)return;
  if(!canFinish){setMsg('Najpierw rozwiąż krótkie ćwiczenie i sprawdź odpowiedź. Potem możesz przejść dalej.');return;}
  setSaving(true);setMsg('');
  try{
   if(!done.includes(module)){
    // Postęp zapisujemy NAJPIERW. Brak zapisu notatek nie może odebrać ukończenia lekcji.
    const {error:pe}=await supabase.from('ta_learning_progress').upsert({
     user_id:userId,course_slug:slug,lesson_no:module
    },{onConflict:'user_id,course_slug,lesson_no'});
    if(pe)throw pe;
    setDone(prev=>prev.includes(module)?prev:[...prev,module]);
   }
   const target=next??module;
   try{await persistDraft(target,notes);}
   catch{setMsg('Lekcja ukończona. Notatki nie zostały zapisane — możesz spróbować ponownie.');}
   if(next!==undefined){setModule(next);setVerified(false);setMsg(prev=>prev||'Dobrze! Następna lekcja jest gotowa.');}
   else setMsg('Brawo! Ukończono ostatnią lekcję tego kursu. Możesz wrócić do dowolnego tematu.');
  }catch(e:any){setMsg('Postęp nie został zapisany: '+(e?.message||'błąd sieci')+'. Spróbuj jeszcze raz.');}
  finally{setSaving(false);}
 }
 return <ScrollView style={{backgroundColor:'#fbfcf7',flex:1}} contentContainerStyle={{paddingHorizontal:18,paddingTop:25,paddingBottom:65,maxWidth:860,alignSelf:'center',width:'100%'}}>
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
    <Text style={{fontSize:12,color:secondary,marginTop:9}}>Ukończono {completed} z {items.length} lekcji. Możesz wrócić do każdej lekcji.</Text>
    {practice.attempts>0&&<Text style={{fontSize:12,color:secondary,marginTop:7}}>Sprawdziany: {practice.correct} poprawnych odpowiedzi z {practice.attempts} prób. Błędy pomagają rozpoznać, co trzeba powtórzyć.</Text>}
   </View>
   <Text style={{fontWeight:'900',fontSize:16,color:ink,marginBottom:10}}>Wybierz lekcję</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:18}}>
    {items.map((v,i)=><Pressable key={v.lesson_no} onPress={()=>changeModule(v.lesson_no)} style={{minWidth:38,paddingVertical:10,paddingHorizontal:11,backgroundColor:v.lesson_no===module?ink:done.includes(v.lesson_no)?'#def0d4':'#fff',borderRadius:10,borderWidth:1,borderColor:v.lesson_no===module?ink:line}}>
     <Text style={{fontWeight:'900',color:v.lesson_no===module?'white':ink,textAlign:'center'}}>{done.includes(v.lesson_no)?'✓ ':''}{i+1}</Text>
    </Pressable>)}
   </View>
   {progress===100&&<View style={{padding:17,backgroundColor:'#e5f2de',borderRadius:12,marginBottom:15}}>
    <Text style={{fontWeight:'900',color:ink,fontSize:18}}>Wszystkie lekcje ukończone! 🎉</Text>
    <Text style={{color:secondary,marginTop:6}}>Możesz wrócić do materiałów albo kontynuować z innym kursem.</Text>
   </View>}
  </>}
  {!!lesson&&<>
   <CourseIntro slug={slug} title={courseInfo.title} description={courseInfo.description} first={index===0}/>
   <Text style={{color:'#638068',fontWeight:'700'}}>Lekcja {index+1} z {items.length}{done.includes(module)?' · Ukończona ✓':''}</Text>
   <Text style={{color:ink,fontSize:26,fontWeight:'900',marginTop:11,marginBottom:17,lineHeight:33}}>{lesson.title_pl}</Text>
   {lesson.material?.construction?
     <ConstructionLesson identity={slug+'-'+String(module)} lesson={lesson.material.construction} onPassed={setVerified} onAttempt={(index,correct)=>recordAttempt('construction',index,correct)}/>:
     <>
      {lesson.material?.learning&&<CaseLesson data={lesson.material.learning} identity={slug+'-'+String(module)} onPassed={setVerified} onAttempt={(index,correct)=>recordAttempt('case',index,correct)}/>}
      {!lesson.material?.learning&&<View style={{backgroundColor:'white',borderRadius:17,padding:22,borderWidth:1,borderColor:line,gap:12}}>
       {(lesson.material?.raw||[]).filter((line,i)=>i>0&&!/https?:\/\/|^Źródło|^Do sprawdzenia|^Status nauczania|^Wersja edukacyjna|^Materiał wstępny|^Zastanów się, jak temat|^Ćwiczenie: przygotuj krótką listę|^Status: zarys dydaktyczny/i.test(line)).map((line,i)=><Text key={i} style={{color:'#394d41',fontSize:16,lineHeight:26}}>{line}</Text>)}
      </View>}
      <KeyboardLesson shortcuts={lesson.material?.shortcuts} tips={lesson.material?.quickTips} exercise={lesson.material?.exercise} references={lesson.material?.references} onPracticed={setVerified} onAttempt={(index,correct)=>recordAttempt('keyboard',index,correct)}/>
     </>
   }
   <AiTutor courseSlug={slug} lessonNo={module}/>
   <View style={{marginTop:23,gap:9}}>
    <Text style={{fontWeight:'900',color:ink,fontSize:17}}>Moje notatki do tej lekcji</Text>
    <TextInput multiline value={currentNotes} onChangeText={text=>setNotes(prev=>({...prev,[String(module)]:text}))} placeholder="Co zapamiętasz? Zapisz własny przykład…" style={{backgroundColor:'white',borderColor:line,borderWidth:1,borderRadius:13,padding:15,minHeight:95,textAlignVertical:'top'}}/>
    <Pressable disabled={saving} onPress={saveNotes} style={{padding:13,backgroundColor:'#e2eddc',borderRadius:11,alignItems:'center',opacity:saving?0.55:1}}>
     <Text style={{color:ink,fontWeight:'800'}}>Zapisz notatki</Text>
    </Pressable>
   </View>
   <Pressable disabled={saving} onPress={finishLesson} style={{backgroundColor:ink,padding:18,borderRadius:14,marginTop:18,opacity:saving?0.55:1}}>
    <Text style={{color:'white',fontWeight:'900',textAlign:'center',fontSize:16}}>{saving?'Zapisuję…':!canFinish?'Najpierw rozwiąż ćwiczenie':next!==undefined?'Ukończ i przejdź do następnej lekcji':'Zakończ kurs'}</Text>
   </Pressable>
   {hasExercise&&!canFinish&&<Text style={{fontSize:13,color:'#647565',lineHeight:21,marginTop:10}}>Aby zaliczyć tę lekcję, wykonaj symulację lub wybierz poprawną odpowiedź w zadaniu.</Text>}
   <View style={{flexDirection:'row',justifyContent:'space-between',marginTop:19,gap:12}}>
    <Pressable disabled={previous===undefined} onPress={()=>previous!==undefined&&changeModule(previous)} style={{padding:11,opacity:previous===undefined?0.4:1}}>
     <Text style={{fontWeight:'800',color:ink}}>← Poprzednia</Text>
    </Pressable>
    <Pressable disabled={next===undefined} onPress={()=>next!==undefined&&changeModule(next)} style={{padding:11,opacity:next===undefined?0.4:1}}>
     <Text style={{fontWeight:'800',color:ink}}>Pomiń na razie →</Text>
    </Pressable>
   </View>
  </>}
  {!!msg&&<View style={{marginTop:15,padding:15,borderRadius:12,backgroundColor:'#eaf2e0'}}><Text style={{color:ink,fontWeight:'700',lineHeight:22}}>{msg}</Text></View>}
 </ScrollView>;
}
