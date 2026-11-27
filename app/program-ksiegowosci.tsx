import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Image,Pressable,ScrollView,StyleSheet,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {Link,useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
// @ts-ignore — niezależnie testowany pomocnik rozróżnia stan bazy i widoczność RLS.
import {materialCoverageKnown,materialCount} from '../src/accounting/program-visibility.js';
// @ts-ignore — read-only per-exercise progress, checked against visible materials and private answers.
import {buildCorePracticeProgress} from '../src/accounting/core-progress.js';
// @ts-ignore — private homework counts are calculated from visible topics, not hidden drafts.
import {homeworkProgress,firstUnfinishedPracticeTopic} from '../src/accounting/homework-core.js';

type Status='planned'|'in_progress'|'review_needed'|'blocked'|'complete';
type Filter='all'|'draft'|'review'|'missing';
type Topic={
 topic_no:number;section_no:number;topic_in_section:number;
 title_pl:string;status:Status;lesson_no:number|null;
};
type MaterialStats={sections:number;examples:number;exercises:number;tables:number;glossary:number;editorial_status:string};

const sections=[
 'Podstawy rachunkowości i matematyka',
 'Dokumenty, faktury, KSeF i rozrachunki',
 'Podatki krajowe VAT, PIT, CIT i PCC',
 'Rozliczenia unijne i międzynarodowe',
 'Kadry, płace i ZUS',
 'Pełne księgi, majątek i sprawozdawczość',
 'Formy prawne, rejestry i zmiany własności',
 'Branżowe zastosowania księgowości',
 'Twórcy internetowi i finansowanie',
 'Excel, analiza i symulator firmy',
];
const statusLabels:Record<Status,string>={
 planned:'Zaplanowany',in_progress:'W opracowaniu',
 review_needed:'Do recenzji',blocked:'Zablokowany',
 complete:'Odebrany po testach',
};
const filters:{key:Filter;label:string}[]=[
 {key:'all',label:'Wszystkie'},
 {key:'draft',label:'Z nową treścią'},
 {key:'review',label:'Do recenzji'},
 {key:'missing',label:'Bez nowej treści'},
];
const count=(v:unknown)=>Array.isArray(v)?v.length:0;

export default function ProgramKsiegowosci(){
 const router=useRouter();
 const {width}=useWindowDimensions();
 const mobile=width<720;
 const [topics,setTopics]=useState<Topic[]>([]);
 const [materialStats,setMaterialStats]=useState<Record<number,MaterialStats>>({});
 const [practiceMaterials,setPracticeMaterials]=useState<any[]>([]);
 const [savedAnswers,setSavedAnswers]=useState<any[]>([]);
 const [submittedHomeworks,setSubmittedHomeworks]=useState<any[]>([]);
 const [homeworksReady,setHomeworksReady]=useState(false);
 const [homeworksError,setHomeworksError]=useState('');
 const [answersReady,setAnswersReady]=useState(false);
 const [answersError,setAnswersError]=useState('');
 const [materialsReady,setMaterialsReady]=useState(false);
 const [isEditor,setIsEditor]=useState(false);
 const [overviewAuthored,setOverviewAuthored]=useState<number|null>(null);
 const [materialError,setMaterialError]=useState('');
 const [expanded,setExpanded]=useState<number|null>(null);
 const [showProgress,setShowProgress]=useState(false);
 const [showEditorial,setShowEditorial]=useState(false);
 const [filter,setFilter]=useState<Filter>('all');
 const [search,setSearch]=useState('');
 const [reload,setReload]=useState(0);
 const [busy,setBusy]=useState(true);
 const [error,setError]=useState('');

 useEffect(()=>{
  let active=true;
  (async()=>{
   setBusy(true);setError('');setMaterialError('');setMaterialsReady(false);setIsEditor(false);setOverviewAuthored(null);setAnswersError('');setAnswersReady(false);setSavedAnswers([]);setPracticeMaterials([]);setSubmittedHomeworks([]);setHomeworksReady(false);setHomeworksError('');
   try{
    const session=await supabase.auth.getUser();
    if(!active)return;
    if(session.error||!session.data.user){router.replace('/konto');return;}
    const access=await supabase.rpc('ta_accounting_overview');
    if(!active)return;
    if(access.error)throw new Error('Program wymaga dostępu do kursu lub podglądu właściciela.');
    const editor=access.data?.is_editor===true;
    setIsEditor(editor);
    const activeProgram=access.data?.active_program;
    const authored=activeProgram?.authored_topics;
    setOverviewAuthored(activeProgram?.topics===100&&Number.isSafeInteger(authored)&&authored>=0?authored:null);
    const result=await supabase.from('ta_accounting_core_topics_v3')
     .select('topic_no,section_no,topic_in_section,title_pl,status,lesson_no')
     .order('topic_no');
    if(!active)return;
    if(result.error)throw new Error('Nie udało się odczytać programu. Spróbuj ponownie.');
    setTopics((result.data||[]) as Topic[]);

    // Liczniki są liczone wyłącznie z zapisanej nowej treści, nigdy z linków do starszych lekcji.
    const material=await supabase.from('ta_accounting_core_materials_v3')
     .select('topic_no,editorial_status,material').order('topic_no');
    if(!active)return;
    if(material.error){
     setMaterialError('Nie udało się pobrać liczników opracowań. Ich stan jest nieznany, nie wynosi zero.');
    }else{
     setPracticeMaterials(material.data||[]);
     const stats:Record<number,MaterialStats>={};
     for(const row of material.data||[]){
      const m=(row as any).material||{};
      stats[(row as any).topic_no]={
       sections:count(m.sections),examples:count(m.examples),
       exercises:count(m.exercises),tables:count(m.tables),
       glossary:count(m.glossary),
       editorial_status:String((row as any).editorial_status||'nieznany'),
      };
     }
     setMaterialStats(stats);
     setMaterialsReady(true);
    }
    // Private learner answers are read only under the logged-in user ID AND RLS.
    // If the read fails, the progress is unknown, never zero or completed.
    const saved=await supabase.from('ta_accounting_core_answers_v3')
     .select('topic_no,exercise_id,answer').eq('user_id',session.data.user.id);
    if(!active)return;
    if(saved.error)setAnswersError('Nie udało się odczytać Twoich ćwiczeń. Postęp jest nieznany — nie nadpisano odpowiedzi.');
    else{setSavedAnswers(saved.data||[]);setAnswersReady(true);}
    const homework=await supabase.from('ta_accounting_core_homework_v3')
     .select('topic_no,response,version,submitted_at').eq('user_id',session.data.user.id);
    if(!active)return;
    if(homework.error)setHomeworksError('Nie udało się pobrać prac domowych. Licznik jest nieznany, żadne zadanie nie zostało usunięte.');
    else{setSubmittedHomeworks(homework.data||[]);setHomeworksReady(true);}

   }catch(e:any){if(active)setError(e?.message||'Nie udało się wczytać programu.');}
   finally{if(active)setBusy(false);}
  })();
  return()=>{active=false;};
 },[router,reload]);

 const practice=buildCorePracticeProgress(topics,practiceMaterials,savedAnswers,{materialsReady,answersReady});
 const homeworks=homeworksReady&&practice.known?
  homeworkProgress(submittedHomeworks,Object.keys(practice.byTopic).map(Number)):null;
 const nextActual=firstUnfinishedPracticeTopic(practice,homeworks);
 const total=topics.length;
 const finished=topics.filter(t=>t.status==='complete').length;
 const toReview=topics.filter(t=>t.status==='review_needed').length;
 const planned=topics.filter(t=>t.status==='planned').length;
 const draftCount=Object.keys(materialStats).length;
 const coverageKnown=materialCoverageKnown(isEditor,materialsReady);
 const authoredCount=materialCount(isEditor,materialsReady,draftCount,overviewAuthored);
 const olderOnly=topics.filter(t=>t.lesson_no!==null&&!materialStats[t.topic_no]).length;
 const assets=Object.values(materialStats).reduce((v,m)=>({
  sections:v.sections+m.sections,examples:v.examples+m.examples,
  exercises:v.exercises+m.exercises,tables:v.tables+m.tables,
  glossary:v.glossary+m.glossary,
 }),{sections:0,examples:0,exercises:0,tables:0,glossary:0});
 const term=search.trim().toLocaleLowerCase('pl');
 const visible=topics.filter(topic=>{
  if(filter==='missing'&&!coverageKnown)return false;
  if(filter==='draft'&&!materialStats[topic.topic_no])return false;
  if(filter==='review'&&topic.status!=='review_needed')return false;
  if(filter==='missing'&&materialStats[topic.topic_no])return false;
  return !term||String(topic.topic_no).includes(term)||topic.title_pl.toLocaleLowerCase('pl').includes(term);
 });
 const filtering=filter!=='all'||term.length>0;
 const firstAvailable=topics.find(t=>!!materialStats[t.topic_no])?.topic_no??null;
 const nextLesson=nextActual??firstAvailable;
 const hasStarted=savedAnswers.length>0||submittedHomeworks.some((r:any)=>!!r.submitted_at);

 function renderTopic(topic:Topic){
      const stats=materialStats[topic.topic_no];
      const exercise=practice.known?practice.byTopic[topic.topic_no]:null;
      return <View key={topic.topic_no} style={s.lessonTile}>
       <View style={s.lessonBadge}><Text style={s.lessonBadgeText}>{String(topic.topic_no).padStart(2,'0')}</Text></View>
       <View style={{flex:1,gap:7,minWidth:0}}>
        <Text style={s.lessonTitle}>{topic.title_pl}</Text>
        {exercise&&<Text style={s.small}>Ćwiczenia: {exercise.correct}/{exercise.total} poprawnych</Text>}
        {stats
         ?<Link href={{pathname:'/temat-ksiegowosci',params:{temat:String(topic.topic_no)}}} accessibilityLabel={'Otwórz lekcję '+topic.topic_no+': '+topic.title_pl} style={s.lessonLink}>Otwórz lekcję →</Link>
         :<Text style={s.lessonUnavailable}>Materiał obecnie niedostępny</Text>}
        {isEditor&&showEditorial&&<Text style={s.small}>Redakcja: {statusLabels[topic.status]} · {stats?stats.sections+' części opracowania':'brak odczytu materiału'}</Text>}
       </View>
      </View>;
 }
 return <ScrollView style={s.page} contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
  <View style={s.nav}><Link href="/moje-kursy" style={s.link}>← Moje kursy</Link></View>

  <Text accessibilityRole="header" style={s.h1}>Księgowość</Text>

  {isEditor&&showEditorial&&<Pressable accessibilityRole="button" onPress={()=>setReload(x=>x+1)} style={s.refresh}><Text style={s.link}>Odśwież stan z bazy</Text></Pressable>}
  {busy&&<ActivityIndicator accessibilityLabel="Odczytywanie programu i stanu opracowań"/>}
  {!!error&&<Text accessibilityRole="alert" style={s.warning}>{error}</Text>}
  {!!materialError&&<Text accessibilityRole="alert" style={s.warning}>{materialError}</Text>}
  {!!answersError&&<Text accessibilityRole="alert" style={s.warning}>{answersError}</Text>}
  {!!homeworksError&&<Text accessibilityRole="alert" style={s.warning}>{homeworksError}</Text>}
  {!busy&&!error&&<>
   <View style={[s.startCard,{flexDirection:mobile?'column':'row-reverse'}]}>
    <Image accessible={false} resizeMode="cover" source={require('../assets/accounting/generated/accounting-workshop-cover.webp')} style={mobile?{width:'100%',height:104}:{width:'38%',alignSelf:'stretch'}}/>
    <View style={s.startCopy}>
     <Text style={s.startKicker}>{hasStarted?'TWOJA NAUKA':'PIERWSZA LEKCJA'}</Text>
     <Text accessibilityRole="header" style={s.startTitle}>{topics.find(t=>t.topic_no===nextLesson)?.title_pl||'Program kursu'}</Text>
     <Text style={s.startBody}>W lekcji poznasz pojęcia, zobaczysz przykład i samodzielnie rozwiążesz zadanie.</Text>
     {nextLesson!==null&&<Link href={{pathname:'/temat-ksiegowosci',params:{temat:String(nextLesson)}}} style={s.startLink}>{hasStarted?'Kontynuuj naukę':'Rozpocznij od zera'} · temat {nextLesson} →</Link>}
    </View>
   </View>
   <Pressable accessibilityRole="button" accessibilityState={{expanded:showProgress}} aria-expanded={showProgress} onPress={()=>setShowProgress(v=>!v)} style={s.progressToggle}><Text style={s.link}>{showProgress?'Ukryj postęp':'Mój postęp'}</Text></Pressable>
   {showProgress&&<View style={s.card}>
    <Text style={s.label}>Twoje ćwiczenia i prace domowe — zapisane na koncie</Text>
    {practice.known?
      practice.availableTopics>0?<>
       <Text style={s.body}>{practice.correctAnswers}/{practice.totalQuestions} poprawnych odpowiedzi · {practice.passedTopics}/{practice.availableTopics} tematów z poprawnym kompletem odpowiedzi.</Text>
       <Text style={s.small}>Odpowiedzi zapisane: {practice.attemptedAnswers}. Wynik pochodzi z Twoich odpowiedzi do obecnie dostępnej wersji zadań, nie ze starego licznika przeczytanych stron.</Text>
       {homeworks?<Text style={s.body}>Oddane prace domowe: {homeworks.submitted}/{homeworks.total} dostępnych tematów.</Text>:
        <Text style={s.small}>Licznik prac domowych jest nieznany. Nie oznaczamy go jako 0.</Text>}
       {nextActual!==null&&<Link href={{pathname:'/temat-ksiegowosci',params:{temat:String(nextActual)}}} style={s.link}>
        Kontynuuj naukę i pracę domową — temat {nextActual}
       </Link>}
       <Text style={s.small}>Postęp pokazuje wykonane ćwiczenia i prace domowe. Do ukończenia nauki potrzebne jest przejście przez wszystkie wymagane etapy.</Text>
      </>:<Text style={s.small}>Na tym koncie nie ma jeszcze dostępnych zadań do policzenia. Materiały ukryte przez RLS nie są uznawane za brakujące ani zaliczone.</Text>
    :<Text style={s.warning}>Postęp nie został ustalony, ponieważ odczyt odpowiedzi lub materiałów jest niekompletny. Niczego nie wyzerowano.</Text>}
   </View>}

   <View style={s.searchCard}>
    <TextInput value={search} onChangeText={setSearch} placeholder="Szukaj, np. faktura lub numer lekcji" autoCorrect={false} accessibilityLabel="Szukaj tematu" style={s.input}/>
    {(!!term||showEditorial)&&<View style={s.filters}>
     {filters.filter(f=>(isEditor&&showEditorial)||f.key==='all'||f.key==='draft').map(f=><Pressable key={f.key} accessibilityRole="button" accessibilityState={{selected:filter===f.key}}
       onPress={()=>setFilter(f.key)} style={[s.pill,filter===f.key&&s.pillActive]}>
      <Text style={[s.pillText,filter===f.key&&s.pillTextActive]}>{!isEditor&&f.key==='draft'?'Udostępnione lekcje':f.label}</Text>
     </Pressable>)}
    </View>}
    {!!term&&<Text style={s.small}>Znaleziono {visible.length} tematów.</Text>}
   </View>
   {isEditor&&showEditorial&&<View style={s.grid}>
    <View style={s.metric}><Text style={s.metricNumber}>{finished}/{total}</Text><Text style={s.small}>Ukończone i odebrane</Text></View>
    <View style={s.metric}><Text style={s.metricNumber}>{authoredCount===null?'—':authoredCount}</Text><Text style={s.small}>Zapisane opracowania w bazie (także nieudostępnione)</Text></View>
    <View style={s.metric}><Text style={s.metricNumber}>{toReview}</Text><Text style={s.small}>Status: do recenzji</Text></View>
    <View style={s.metric}><Text style={s.metricNumber}>{planned}</Text><Text style={s.small}>Status: planowane</Text></View>
    <View style={s.metric}><Text style={s.metricNumber}>{coverageKnown?total-draftCount:'—'}</Text><Text style={s.small}>Bez nowego opracowania (potwierdzone)</Text></View>
    <View style={s.metric}><Text style={s.metricNumber}>{coverageKnown?olderOnly:'—'}</Text><Text style={s.small}>Tylko odnośnik do starszej lekcji</Text></View>
   </View>}
   {isEditor&&showEditorial&&materialsReady&&<View style={s.notice}>
    <Text style={s.label}>Zawartość zapisanych nowych opracowań</Text>
    <Text style={s.body}>{assets.sections} części · {assets.examples} przykładów · {assets.exercises} zadań · {assets.tables} tabel · {assets.glossary} haseł słownika.</Text>
    <Text style={s.small}>To liczba zapisanych elementów, nie wynik końcowego odbioru. Osobno pozostają testy zalogowanego użytkownika, praktyka, zgodność prawa i kontrola jakości.</Text>
   </View>}
   {filtering?<View style={s.activeChapter}>
    <View style={s.dashboardHeading}><Text accessibilityRole="header" style={s.h2}>Znalezione tematy</Text>
     <Pressable accessibilityRole="button" onPress={()=>{setSearch('');setFilter('all');}} style={s.progressToggle}><Text style={s.link}>Wyczyść</Text></Pressable></View>
    {filter==='missing'&&!coverageKnown?<Text style={s.small}>Nie można obecnie potwierdzić dostępności materiałów.</Text>:
     visible.length?visible.map(renderTopic):<Text style={s.body}>Brak wyników. Spróbuj krótszej nazwy, np. „bank”.</Text>}
   </View>:<>
    <Text accessibilityRole="header" style={s.h2}>Wybierz dział</Text>
    {sections.map((name,index)=>{
     const no=index+1,open=expanded===no,items=topics.filter(t=>t.section_no===no);
     return <View key={no} style={[s.chapter,open&&s.chapterOpen]}>
      <Pressable accessibilityRole="button" accessibilityLabel={'Otwórz dział '+no+': '+name} accessibilityState={{expanded:open}} aria-expanded={open}
       onPress={()=>setExpanded(open?null:no)} style={s.chapterControl}>
       <Text style={s.chapterNumber}>{String(no).padStart(2,'0')}</Text>
       <Text style={s.chapterName}>{name}</Text><Text style={s.chapterSign}>{open?'−':'+'}</Text>
      </Pressable>
      {open&&<View style={s.lessonList}>{items.map(renderTopic)}</View>}
     </View>;
    })}
   </>}
   {topics.length!==100&&<Text style={s.warning}>Niepełny odczyt mapy programu. Ten wynik nie dowodzi kompletności kursu.</Text>}
   {isEditor&&<Pressable accessibilityRole="button" onPress={()=>{setShowEditorial(v=>!v);setFilter('all');setExpanded(null);}} style={s.editorToggle}><Text style={s.small}>{showEditorial?'Ukryj panel redakcyjny':'Panel redakcyjny'}</Text></Pressable>}
   <Text style={s.small}>Ćwiczenia korzystają z fikcyjnych danych i nie zastępują porady księgowej ani podatkowej.</Text>
   <Link href="/biuro-ksiegowe" style={s.link}>🧰 Otwórz biuro ćwiczeniowe</Link>
  </>}
 </ScrollView>;
}
const s=StyleSheet.create({
 dashboardHeading:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,marginTop:7},
 chapterCount:{color:'#60758B',fontSize:12,fontWeight:'800',backgroundColor:'#EFF3F8',borderRadius:20,paddingHorizontal:10,paddingVertical:7,overflow:'hidden'},
 chapter:{borderWidth:1,borderColor:'#D4DCE2',borderRadius:14,backgroundColor:'white',overflow:'hidden'},
 chapterOpen:{borderColor:'#486D81'},chapterControl:{flexDirection:'row',alignItems:'center',gap:13,padding:15,minHeight:60},
 chapterNumber:{fontSize:13,color:'#53667A',fontWeight:'700'},chapterName:{flex:1,fontSize:16,color:'#17344A',fontWeight:'700'},chapterSign:{fontSize:23,color:'#36576F'},
 lessonList:{paddingHorizontal:16},startCopy:{flexGrow:1,minWidth:0,flexShrink:1,padding:20,gap:10},
 startTitle:{color:'white',fontSize:23,lineHeight:29,fontWeight:'800'},startKicker:{color:'#F5CE8D',fontWeight:'800',fontSize:11,letterSpacing:1.3},startBody:{color:'#DCE8F1',lineHeight:21,fontSize:14},
 activeChapter:{backgroundColor:'#fff',borderWidth:1,borderColor:'#d5e4cf',borderRadius:18,padding:14,gap:8,marginBottom:15,shadowColor:'#244b36',shadowOpacity:0.06,shadowRadius:8,elevation:2},
 closeChapter:{width:42,height:42,borderRadius:13,backgroundColor:'#ecf3e6',alignItems:'center',justifyContent:'center'},
 lessonTile:{borderTopWidth:1,borderColor:'#e7eee1',paddingVertical:15,flexDirection:'row',gap:12,alignItems:'flex-start'},
 lessonBadge:{width:38,height:38,backgroundColor:'#E6EFF1',borderRadius:12,alignItems:'center',justifyContent:'center'},
 lessonBadgeText:{fontWeight:'900',color:'#24546B',fontSize:13},
 lessonTitle:{fontSize:15,color:'#17344A',fontWeight:'800',lineHeight:22},
 lessonLink:{fontSize:14,color:'#24546B',fontWeight:'900',paddingVertical:6},
 lessonUnavailable:{fontSize:12,color:'#718676'},

 page:{flex:1,backgroundColor:'#F8F6F1'},
 wrap:{width:'100%',maxWidth:1050,alignSelf:'center',padding:16,paddingBottom:40,gap:12},
 nav:{flexDirection:'row',flexWrap:'wrap',gap:18},
 link:{color:'#956818',fontSize:14,fontWeight:'800',paddingVertical:5},
 eyebrow:{fontSize:12,letterSpacing:1,fontWeight:'800',color:'#53677D'},
 h1:{fontSize:28,lineHeight:35,fontWeight:'900',color:'#14263B'},
 h2:{fontSize:19,fontWeight:'800',color:'#14263B',lineHeight:26},
 body:{fontSize:15,lineHeight:24,color:'#43596F'},
 label:{fontSize:14,lineHeight:22,fontWeight:'800',color:'#14263B'},
 small:{fontSize:12,lineHeight:20,color:'#53677D'},
 todo:{fontSize:13,lineHeight:21,color:'#43596F'},
 topicTitle:{fontSize:15,lineHeight:23,fontWeight:'800',color:'#14263B'},
 notice:{padding:17,borderRadius:14,backgroundColor:'#EFF3F8',gap:8},
 card:{backgroundColor:'white',borderWidth:1,borderColor:'#DDE4EC',padding:14,borderRadius:14,gap:8},
 startCard:{backgroundColor:'#17344A',borderRadius:18,overflow:'hidden'},
 searchCard:{backgroundColor:'white',padding:9,borderRadius:14,borderWidth:1,borderColor:'#DDE4EC',gap:5},
 startLink:{alignSelf:'flex-start',backgroundColor:'#F4CD8B',color:'#192E3F',fontWeight:'900',fontSize:15,padding:12,borderRadius:12,overflow:'hidden'},
 progressToggle:{alignSelf:'flex-start',minHeight:34,justifyContent:'center',paddingHorizontal:5},
 editorToggle:{alignSelf:'flex-end',padding:10},
 heading:{gap:5},step:{fontSize:11,fontWeight:'800',letterSpacing:.8,color:'#53677D'},
 topic:{paddingTop:12,borderTopWidth:1,borderColor:'#DCE4ED',gap:5},
 warning:{backgroundColor:'#fff0e5',padding:14,color:'#893a26',borderRadius:10,fontSize:14},
 grid:{flexDirection:'row',flexWrap:'wrap',gap:9},
 metric:{minWidth:136,flexGrow:1,flexBasis:'30%',backgroundColor:'white',borderRadius:13,borderColor:'#DDE4EC',borderWidth:1,padding:14,gap:4},
 metricNumber:{fontSize:25,fontWeight:'900',color:'#14263B'},
 input:{borderWidth:1,borderColor:'#c9dcc6',borderRadius:10,padding:12,color:'#14263B',fontSize:15},
 filters:{flexDirection:'row',flexWrap:'wrap',gap:7},
 pill:{paddingVertical:8,paddingHorizontal:12,borderColor:'#ccdcc8',borderWidth:1,borderRadius:22,backgroundColor:'#F8F6F1'},
 pillActive:{backgroundColor:'#956818',borderColor:'#956818'},
 pillText:{fontSize:12,fontWeight:'700',color:'#275538'},
 pillTextActive:{color:'white'},
 refresh:{alignSelf:'flex-start',paddingHorizontal:12,borderRadius:10,borderWidth:1,borderColor:'#bbd4bd',backgroundColor:'#F8F6F1'},
});
