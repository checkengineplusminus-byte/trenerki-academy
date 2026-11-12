import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Link,useFocusEffect,useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
// @ts-ignore — czyste funkcje nawigacji mają niezależne testy Node.
import {PATH_LESSON_IDS,STUDY_STAGES,buildStudyPath} from '../src/accounting/study-path.js';

export default function AccountingStudyPath(){
 const router=useRouter(),serial=useRef(0),owner=useRef('');
 const [path,setPath]=useState<any>(null),[busy,setBusy]=useState(true),[error,setError]=useState(''),[warning,setWarning]=useState(''),[expanded,setExpanded]=useState<string|null>('start');
 const load=useCallback(async()=>{
  const run=++serial.current;setBusy(true);setError('');setWarning('');setPath(null);
  try{
   const auth=await supabase.auth.getUser();
   if(run!==serial.current)return;
   if(auth.error||!auth.data.user){router.replace('/konto');return;}
   owner.current=auth.data.user.id;
   const access=await supabase.rpc('ta_accounting_overview');
   if(run!==serial.current)return;
   if(access.error)throw new Error('Ścieżka wymaga aktywnego dostępu do encyklopedii albo podglądu właściciela.');
   const [lessons,progress]=await Promise.all([
    supabase.from('ta_accounting_lessons').select('lesson_no,title_pl,editorial_status').in('lesson_no',PATH_LESSON_IDS).eq('editorial_status','approved').order('lesson_no'),
    supabase.from('ta_accounting_progress').select('lesson_no').eq('user_id',owner.current).in('lesson_no',PATH_LESSON_IDS)
   ]);
   if(run!==serial.current)return;
   if(lessons.error)throw new Error('Nie udało się odczytać dostępnych lekcji. Odśwież widok.');
   const next=buildStudyPath(lessons.data||[],(progress.data||[]).map((r:any)=>r.lesson_no),!progress.error);
   setPath(next);
   if(progress.error)setWarning('Nie udało się odczytać oznaczeń przeczytania. Nie pokazujemy pozornego wyniku zero. Lekcje możesz otwierać, a odczyt ponowić.');
   setExpanded(next.stages.find((s:any)=>s.ids.includes(next.nextLesson||next.blockedAt))?.id||'start');
  }catch(e:any){if(run===serial.current)setError(e.message||'Nie udało się odczytać ścieżki.');}
  finally{if(run===serial.current)setBusy(false);}
 },[router]);
 useEffect(()=>{
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
   if(owner.current&&owner.current!==(session?.user?.id||'')){
    ++serial.current;owner.current='';setPath(null);setBusy(false);router.replace('/konto');
   }
  });
  return()=>{++serial.current;subscription.unsubscribe();};
 },[router]);
 useFocusEffect(useCallback(()=>{void load();return()=>{++serial.current;};},[load]));
 function openLesson(id:number){router.push({pathname:'/ksiegowosc',params:{lesson:String(id)}});}
 return <ScrollView style={s.page} contentContainerStyle={s.wrap}>
  <View style={s.nav}><Link href="/ksiegowosc" style={s.link}>← Encyklopedia i wyszukiwarka</Link><Link href="/moje-kursy" style={s.link}>Moje kursy</Link></View>
  <Text style={s.eyebrow}>KSIĘGOWOŚĆ · ŚCIEŻKA STARTOWA</Text>
  <Text accessibilityRole="header" style={s.h1}>Wiesz, od czego zacząć.</Text>
  <Text style={s.body}>Pierwsze 50 lekcji w dziesięciu krótkich etapach. Najpierw przeczytaj objaśnienie, potem rozwiąż ćwiczenie i opisz własnymi słowami, dlaczego wybrałeś taki zapis.</Text>
  <View style={s.notice}><Text style={s.body}>To mapa obecnych materiałów startowych, nie cały program encyklopedii. „Przeczytane” oznacza Twoje oznaczenie lektury — nie egzamin ani potwierdzenie kompetencji. Pełne procesy kadrowe, majątkowe i zamknięcia w symulatorze pozostają w rozbudowie.</Text></View>
  <Pressable accessibilityRole="button" disabled={busy} onPress={()=>void load()} style={s.button}><Text style={s.buttonText}>{busy?'Odczyt danych…':'Odśwież dostępność i postęp'}</Text></Pressable>
  {busy&&<ActivityIndicator accessibilityLabel="Odczyt ścieżki nauki"/>}
  {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  {!!warning&&<Text accessibilityLiveRegion="polite" style={s.error}>{warning}</Text>}
  {!busy&&path&&<>
   <View style={s.card}><Text style={s.h2}>Twój punkt startu</Text><Text style={s.body}>Dostępne w tej ścieżce: {path.availableCount} z {path.totalPlanned}. {path.progressKnown?`Oznaczone jako przeczytane: ${path.readCount}.`:'Postęp chwilowo niedostępny.'}</Text>
    {path.nextLesson!==null&&<Pressable accessibilityRole="button" onPress={()=>openLesson(path.nextLesson)} style={[s.button,s.primary]}><Text style={s.white}>Otwórz pierwszą nieprzeczytaną lekcję: {path.nextLesson}</Text></Pressable>}
    {path.blockedAt!==null&&<Text style={s.body}>Lekcja {path.blockedAt} nie jest obecnie dostępna na Twoim koncie. Nie przeskakujemy jej po cichu. Możesz wrócić do pozostałych materiałów i zgłosić brak.</Text>}
    {path.pathReadingComplete&&<Text style={s.body}>Wszystkie lekcje tej ścieżki mają oznaczenie przeczytania. Wróć do zadań i sprawdź rozumienie na innych danych. To nie oznacza ukończenia całego kursu.</Text>}
   </View>
   {path.stages.map((stage:any,index:number)=><View key={stage.id} style={s.card}>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:expanded===stage.id}} onPress={()=>setExpanded(expanded===stage.id?null:stage.id)} style={s.stageHeader}>
     <Text style={s.step}>ETAP {index+1}</Text><Text style={s.h2}>{stage.title}</Text><Text style={s.small}>{stage.progressKnown?`Przeczytane ${stage.readCount}/${stage.ids.length}`:'Postęp niedostępny'} · Dostępne {stage.accessible}/{stage.ids.length} · {expanded===stage.id?'Zwiń':'Rozwiń'}</Text>
    </Pressable>
    {expanded===stage.id&&<View style={s.stageBody}><Text style={s.body}>{stage.goal}</Text>
     {stage.progressKnown&&stage.recommendedBefore.length>0&&<Text style={s.small}>Zalecana wcześniejsza lektura: {stage.recommendedBefore.map((id:string)=>STUDY_STAGES.find((p:any)=>p.id===id)?.title).join('; ')}. To wskazówka kolejności, nie blokada dostępu.</Text>}
     {stage.rows.map((lesson:any)=><View key={lesson.lesson_no} style={s.lesson}>
      <Text style={s.body}>{lesson.lesson_no}. {lesson.available?lesson.title_pl:'Lekcja niedostępna w aktualnym odczycie'}</Text>
      <Text style={s.small}>{!lesson.available?'Bez aktywnego odnośnika':!path.progressKnown?'Nie potwierdzono postępu':lesson.read?'Oznaczona jako przeczytana':'Jeszcze nieoznaczona jako przeczytana'}</Text>
      {lesson.available&&<Pressable accessibilityRole="button" onPress={()=>openLesson(lesson.lesson_no)} style={s.button}><Text style={s.buttonText}>Otwórz lekcję {lesson.lesson_no}</Text></Pressable>}
     </View>)}
    </View>}
   </View>)}
   <View style={s.card}><Text style={s.h2}>Szukasz konkretnego zagadnienia?</Text><Text style={s.body}>Ścieżka nie zastępuje biblioteki. Pozostałe opracowane materiały znajdziesz w encyklopedii, słowniku i pracowni formularzy. Nie musisz ponownie czytać wszystkiego, aby wrócić do jednego tematu.</Text><View style={s.nav}><Link href="/ksiegowosc" style={s.link}>Wyszukiwarka lekcji</Link><Link href="/slownik-ksiegowego" style={s.link}>Słownik</Link><Link href="/formularze-ksiegowego" style={s.link}>Formularze</Link></View></View>
  </>}
 </ScrollView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f7f9f2'},wrap:{width:'100%',maxWidth:960,alignSelf:'center',padding:20,paddingBottom:60,gap:16},nav:{flexDirection:'row',flexWrap:'wrap',gap:16},link:{color:'#285b3b',fontWeight:'700'},eyebrow:{fontSize:12,fontWeight:'800',color:'#5a755d',letterSpacing:1},h1:{fontSize:34,fontWeight:'900',color:'#183c2b'},h2:{fontSize:21,fontWeight:'800',color:'#183c2b'},body:{fontSize:16,lineHeight:25,color:'#294735'},small:{fontSize:13,lineHeight:20,color:'#526b57'},notice:{padding:18,borderRadius:14,backgroundColor:'#eaf2df'},card:{padding:18,borderRadius:16,backgroundColor:'white',borderWidth:1,borderColor:'#dce8d4',gap:12},button:{alignSelf:'flex-start',padding:12,borderRadius:10,backgroundColor:'#e6f1da'},buttonText:{color:'#1d4930',fontWeight:'800'},primary:{backgroundColor:'#183c2b'},white:{color:'white',fontWeight:'800'},error:{color:'#9a3526',fontSize:15,lineHeight:23},step:{fontSize:12,fontWeight:'800',color:'#5b7859'},stageHeader:{gap:8},stageBody:{gap:14},lesson:{gap:8,paddingVertical:14,borderTopWidth:1,borderColor:'#e0e9d9'}});
