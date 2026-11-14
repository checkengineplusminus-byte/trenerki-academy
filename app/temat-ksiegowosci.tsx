import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Linking,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {Link,useLocalSearchParams,useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
// @ts-ignore — walidatory czytnika są wspólne z wcześniejszymi lekcjami.
import {checkExercise,sourceURL} from '../src/accounting/reader-core.js';

type Lesson={topic_no:number;title_pl:string;learning_goal:string;editorial_status:string;legal_as_of:string|null;material:any;body_text:string};
type Answer={exercise_id:string;answer:string};
function Task({exercise,topicNo,userId,initial}:{exercise:any;topicNo:number;userId:string;initial:string}){
 const [answer,setAnswer]=useState(initial),[feedback,setFeedback]=useState<any>(null);
 const [saving,setSaving]=useState(false),[saved,setSaved]=useState(false),[saveError,setSaveError]=useState('');
 const lock=useRef(false);
 const change=(v:string)=>{setAnswer(v);setFeedback(null);setSaved(false);setSaveError('');};
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
  <Pressable disabled={saving} accessibilityRole="button" onPress={()=>void check()} style={s.button}>
   <Text style={s.buttonText}>{saving?'Zapisywanie…':'Sprawdź i zapisz odpowiedź'}</Text>
  </Pressable>
  {feedback&&<View accessibilityLiveRegion="polite" style={feedback.valid?s.notice:s.warning}>
   <Text style={s.label}>{!feedback.valid?feedback.message:feedback.correct?'Poprawnie!':'To jeszcze nie jest poprawny wynik.'}</Text>
   {feedback.valid&&<Text style={s.body}>{feedback.explanation}</Text>}
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
 const [busy,setBusy]=useState(true),[error,setError]=useState(''),[warning,setWarning]=useState('');
 const serial=useRef(0),owner=useRef('');
 const load=useCallback(async()=>{
  const run=++serial.current;setBusy(true);setLesson(null);setError('');setWarning('');setAnswers({});
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
  }catch(e:any){if(run===serial.current)setError(e?.message||'Błąd odczytu lekcji.');}
  finally{if(run===serial.current)setBusy(false);}
 },[topic,router]);
 useEffect(()=>{void load();return()=>{++serial.current;};},[load]);
 useEffect(()=>{
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
   if(owner.current && owner.current!==(session?.user?.id||'')){
    ++serial.current;owner.current='';setLesson(null);setAnswers({});setUserId('');router.replace('/konto');
   }
  });
  return()=>subscription.unsubscribe();
 },[router]);
 const m=lesson?.material||{};
 return <ScrollView style={s.page} contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
  <View style={s.row}><Link href="/program-ksiegowosci" style={s.link}>← Wróć do 100 tematów</Link><Link href="/ksiegowosc" style={s.link}>Encyklopedia</Link></View>
  {busy&&<ActivityIndicator accessibilityLabel="Odczytywanie lekcji"/>}
  {!!error&&<Text accessibilityRole="alert" style={s.warning}>{error}</Text>}
  {!!warning&&<Text style={s.warning}>{warning}</Text>}
  {!busy&&lesson&&!error&&<View>
   <View style={s.header}>
    <Text style={s.eyebrow}>TEMAT {lesson.topic_no} Z 100</Text>
    <Text accessibilityRole="header" style={s.h1}>{lesson.title_pl}</Text>
    <Text style={s.heroBody}>{lesson.learning_goal}</Text>
   </View>
   {lesson.editorial_status!=='approved'&&<Text style={s.warning}>To wersja do recenzji, dostępna wyłącznie w uprawnionym podglądzie. Nie jest jeszcze zatwierdzoną lekcją dla kursantów.</Text>}
   <View style={s.card}><Text style={s.body}>{m.intro||lesson.body_text}</Text></View>
   {(m.sections||[]).map((section:any,i:number)=><View key={i} style={s.card}>
    <Text accessibilityRole="header" style={s.h2}>{section.heading}</Text>
    {(section.paragraphs||[]).map((p:string,j:number)=><Text key={j} selectable style={s.body}>{p}</Text>)}
   </View>)}
   {(m.tables||[]).map((table:any,i:number)=><View key={i} style={s.card}>
    <Text accessibilityRole="header" style={s.h2}>{table.title}</Text>
    <ScrollView horizontal><View>
     <View style={s.tableRow}>{(table.columns||[]).map((c:string,j:number)=><Text key={j} style={[s.cell,s.headCell]}>{c}</Text>)}</View>
     {(table.rows||[]).map((r:any[],j:number)=><View key={j} style={s.tableRow}>{r.map((v:any,k:number)=><Text key={k} style={s.cell}>{String(v)}</Text>)}</View>)}
    </View></ScrollView>
   </View>)}
   {(m.examples||[]).map((example:any,i:number)=><View key={i} style={s.card}>
    <Text style={s.eyebrowDark}>PRZYKŁAD {i+1} – ROZWIĄZANIE</Text><Text accessibilityRole="header" style={s.h2}>{example.title}</Text>
    {(example.steps||[]).map((step:string,j:number)=><Text key={j} style={s.body}>{j+1}. {step}</Text>)}
    <Text style={s.result}>{example.result}</Text>
   </View>)}
   {m.practice&&<View style={s.practice}>
    <Text style={s.eyebrowDark}>TERAZ TY – PRAKTYKA</Text><Text style={s.h2}>{m.practice.role}</Text>
    <Text style={s.body}>{m.practice.task}</Text>
    <Link href="/biuro-ksiegowe" style={s.link}>Otwórz biuro ćwiczeniowe</Link>
    <Text style={s.small}>Przeniesienie do biura nie wykonuje zadania automatycznie. Wysyłki do urzędów nie są wykonywane.</Text>
   </View>}
   <View style={s.card}><Text accessibilityRole="header" style={s.h2}>Sprawdź samodzielnie</Text>
    <Text style={s.small}>Liczba zadań w tym temacie: {(m.exercises||[]).length}. Klucz pojawia się po własnej próbie; nie jest to egzamin certyfikujący.</Text>
    {(m.exercises||[]).map((e:any)=><Task key={e.id} exercise={e} topicNo={lesson.topic_no} userId={userId} initial={answers[e.id]||''}/>)}
   </View>
   {(m.glossary||[]).length>0&&<View style={s.card}><Text accessibilityRole="header" style={s.h2}>Słowniczek od zera</Text>
    {m.glossary.map((g:any,i:number)=><View key={i} style={s.gloss}><Text style={s.label}>{g.term}</Text><Text style={s.body}>{g.meaning}</Text></View>)}
   </View>}
   {(m.takeaways||[]).length>0&&<View style={s.card}><Text style={s.h2}>Najważniejsze do zapamiętania</Text>
    {m.takeaways.map((v:string,i:number)=><Text key={i} style={s.body}>{i+1}. {v}</Text>)}
   </View>}
   <View style={s.card}><Text style={s.h2}>Źródła i zakres</Text>
    <Text style={s.small}>Data odniesienia materiału: {lesson.legal_as_of||'nie podano'}. Sama data nie potwierdza weryfikacji prawnej ani aktualności odnośników; sprawdź źródła i przepisy właściwe dla konkretnej sytuacji.</Text>
    {(m.sources||[]).map((v:any,i:number)=>{
     const url=sourceURL(v.url);
     return <View key={i} style={s.gloss}><Text style={s.label}>{v.title}</Text><Text style={s.small}>{v.scope}</Text>
      {url&&<Pressable accessibilityRole="button" style={s.button} onPress={()=>void Linking.openURL(url).catch(()=>setWarning('Nie udało się otworzyć źródła.'))}><Text style={s.buttonText}>Otwórz wskazane źródło</Text></Pressable>}
     </View>;
    })}
   </View>
  </View>}
 </ScrollView>;
}
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:'#f6f8f0'},wrap:{width:'100%',maxWidth:940,alignSelf:'center',padding:18,paddingBottom:65,gap:14},
 row:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:12,marginBottom:12},
 link:{fontSize:14,fontWeight:'800',color:'#255c3b',paddingVertical:6},
 header:{borderRadius:20,backgroundColor:'#183c2b',padding:25,gap:11,marginBottom:14},
 eyebrow:{fontSize:11,fontWeight:'800',letterSpacing:1,color:'#d4e6c8'},eyebrowDark:{fontSize:11,letterSpacing:.8,fontWeight:'800',color:'#567c4b'},
 h1:{fontSize:29,lineHeight:38,fontWeight:'900',color:'white'},heroBody:{fontSize:16,lineHeight:25,color:'#e0ebdd'},
 h2:{fontSize:20,lineHeight:28,fontWeight:'800',color:'#183c2b'},
 body:{fontSize:16,lineHeight:26,color:'#274734'},small:{fontSize:12,lineHeight:20,color:'#56715b'},
 label:{fontSize:14,fontWeight:'800',color:'#1e422d'},
 card:{borderRadius:15,borderWidth:1,borderColor:'#dbe7d2',padding:18,backgroundColor:'white',gap:13,marginBottom:14},
 practice:{padding:20,borderRadius:15,backgroundColor:'#e8f2df',gap:12,marginBottom:14},
 result:{fontSize:16,lineHeight:26,fontWeight:'800',color:'#1b5332',backgroundColor:'#ebf4e3',padding:13,borderRadius:10},
 tableRow:{flexDirection:'row'},cell:{width:210,padding:12,borderBottomWidth:1,borderBottomColor:'#dee8d9',fontSize:14,lineHeight:22,color:'#274734'},
 headCell:{fontWeight:'800',backgroundColor:'#edf3e8'},
 task:{gap:12,borderTopWidth:1,borderColor:'#e1e9dc',paddingVertical:18},
 option:{borderWidth:1,borderColor:'#cbdcc4',borderRadius:10,padding:12},
 selected:{backgroundColor:'#e8f2df',borderColor:'#567e45'},
 button:{alignSelf:'flex-start',paddingHorizontal:15,paddingVertical:12,borderRadius:10,backgroundColor:'#e4efdb'},
 buttonText:{fontWeight:'800',color:'#214b30'},
 input:{fontSize:16,padding:12,minWidth:160,borderColor:'#becdb6',borderWidth:1,borderRadius:10,color:'#1b3e2b'},
 notice:{padding:13,borderRadius:9,backgroundColor:'#ecf4e6',gap:7},
 warning:{backgroundColor:'#fff0e5',padding:13,borderRadius:10,color:'#813d25',fontSize:14,lineHeight:22,marginBottom:12},
 gloss:{gap:6,borderTopWidth:1,borderColor:'#e0e8dc',paddingTop:9},
});