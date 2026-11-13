import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {Link,useRouter} from 'expo-router';
import {supabase} from '../src/supabase';

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
 const [topics,setTopics]=useState<Topic[]>([]);
 const [materialStats,setMaterialStats]=useState<Record<number,MaterialStats>>({});
 const [materialsReady,setMaterialsReady]=useState(false);
 const [materialError,setMaterialError]=useState('');
 const [expanded,setExpanded]=useState<number|null>(1);
 const [filter,setFilter]=useState<Filter>('all');
 const [search,setSearch]=useState('');
 const [reload,setReload]=useState(0);
 const [busy,setBusy]=useState(true);
 const [error,setError]=useState('');

 useEffect(()=>{
  let active=true;
  (async()=>{
   setBusy(true);setError('');setMaterialError('');setMaterialsReady(false);
   try{
    const session=await supabase.auth.getUser();
    if(!active)return;
    if(session.error||!session.data.user){router.replace('/konto');return;}
    const access=await supabase.rpc('ta_accounting_overview');
    if(!active)return;
    if(access.error)throw new Error('Program wymaga dostępu do kursu lub podglądu właściciela.');
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
   }catch(e:any){if(active)setError(e?.message||'Nie udało się wczytać programu.');}
   finally{if(active)setBusy(false);}
  })();
  return()=>{active=false;};
 },[router,reload]);

 const total=topics.length;
 const finished=topics.filter(t=>t.status==='complete').length;
 const toReview=topics.filter(t=>t.status==='review_needed').length;
 const planned=topics.filter(t=>t.status==='planned').length;
 const draftCount=Object.keys(materialStats).length;
 const olderOnly=topics.filter(t=>t.lesson_no!==null&&!materialStats[t.topic_no]).length;
 const assets=Object.values(materialStats).reduce((v,m)=>({
  sections:v.sections+m.sections,examples:v.examples+m.examples,
  exercises:v.exercises+m.exercises,tables:v.tables+m.tables,
  glossary:v.glossary+m.glossary,
 }),{sections:0,examples:0,exercises:0,tables:0,glossary:0});
 const term=search.trim().toLocaleLowerCase('pl');
 const visible=topics.filter(topic=>{
  if(filter==='draft'&&!materialStats[topic.topic_no])return false;
  if(filter==='review'&&topic.status!=='review_needed')return false;
  if(filter==='missing'&&materialStats[topic.topic_no])return false;
  return !term||String(topic.topic_no).includes(term)||topic.title_pl.toLocaleLowerCase('pl').includes(term);
 });
 const filtering=filter!=='all'||term.length>0;

 return <ScrollView style={s.page} contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
  <View style={s.nav}>
   <Link href="/ksiegowosc" style={s.link}>← Encyklopedia</Link>
   <Link href="/biuro-ksiegowe" style={s.link}>Biuro ćwiczeniowe</Link>
  </View>
  <Text style={s.eyebrow}>TRENERKI · PROGRAM I STAN REALIZACJI</Text>
  <Text accessibilityRole="header" style={s.h1}>100 tematów księgowości</Text>
  <Text style={s.body}>Zobacz, które tematy mają już odrębne opracowania, które korzystają tylko ze starszych materiałów, a które nadal wymagają treści i testów. Samo napisanie materiału nie oznacza zaliczenia tematu.</Text>
  <Pressable accessibilityRole="button" onPress={()=>setReload(x=>x+1)} style={s.refresh}>
   <Text style={s.link}>Odśwież stan z bazy</Text>
  </Pressable>
  {busy&&<ActivityIndicator accessibilityLabel="Odczytywanie programu i stanu opracowań"/>}
  {!!error&&<Text accessibilityRole="alert" style={s.warning}>{error}</Text>}
  {!!materialError&&<Text accessibilityRole="alert" style={s.warning}>{materialError}</Text>}
  {!busy&&!error&&<>
   <View style={s.grid}>
    <View style={s.metric}><Text style={s.metricNumber}>{finished}/{total}</Text><Text style={s.small}>Ukończone i odebrane</Text></View>
    <View style={s.metric}><Text style={s.metricNumber}>{materialsReady?draftCount:'—'}</Text><Text style={s.small}>Nowe opracowania w bazie</Text></View>
    <View style={s.metric}><Text style={s.metricNumber}>{toReview}</Text><Text style={s.small}>Status: do recenzji</Text></View>
    <View style={s.metric}><Text style={s.metricNumber}>{planned}</Text><Text style={s.small}>Status: planowane</Text></View>
    <View style={s.metric}><Text style={s.metricNumber}>{materialsReady?total-draftCount:'—'}</Text><Text style={s.small}>Bez nowego opracowania</Text></View>
    <View style={s.metric}><Text style={s.metricNumber}>{materialsReady?olderOnly:'—'}</Text><Text style={s.small}>Tylko odnośnik do starszej lekcji</Text></View>
   </View>
   {materialsReady&&<View style={s.notice}>
    <Text style={s.label}>Zawartość zapisanych nowych opracowań</Text>
    <Text style={s.body}>{assets.sections} części · {assets.examples} przykładów · {assets.exercises} zadań · {assets.tables} tabel · {assets.glossary} haseł słownika.</Text>
    <Text style={s.small}>To liczba zapisanych elementów, nie wynik końcowego odbioru. Osobno pozostają testy zalogowanego użytkownika, praktyka, zgodność prawa i kontrola jakości.</Text>
   </View>}
   <View style={s.card}>
    <Text style={s.label}>Wyszukaj i filtruj program</Text>
    <TextInput value={search} onChangeText={setSearch} placeholder="Numer lub słowo z tematu" autoCorrect={false} accessibilityLabel="Szukaj tematu" style={s.input}/>
    <View style={s.filters}>
     {filters.map(f=><Pressable key={f.key} accessibilityRole="button" accessibilityState={{selected:filter===f.key}}
       onPress={()=>setFilter(f.key)} style={[s.pill,filter===f.key&&s.pillActive]}>
      <Text style={[s.pillText,filter===f.key&&s.pillTextActive]}>{f.label}</Text>
     </Pressable>)}
    </View>
    <Text style={s.small}>Widocznych tematów: {visible.length} z {total}. {filter==='missing'&&!materialsReady?'Nie udało się ustalić brakujących opracowań.':''}</Text>
   </View>
   {filter==='missing'&&!materialsReady&&<Text style={s.warning}>Filtr „Bez nowej treści” jest niedostępny, dopóki odczyt opracowań nie powiedzie się.</Text>}
   {!(filter==='missing'&&!materialsReady)&&sections.map((name,index)=>{
    const sectionNo=index+1;
    const rows=visible.filter(t=>t.section_no===sectionNo);
    if(filtering&&rows.length===0)return null;
    const all=topics.filter(t=>t.section_no===sectionNo);
    const done=all.filter(t=>t.status==='complete').length;
    const drafts=all.filter(t=>!!materialStats[t.topic_no]).length;
    const open=filtering||expanded===sectionNo;
    return <View key={sectionNo} style={s.card}>
     <Pressable accessibilityRole="button" accessibilityState={{expanded:open}} onPress={()=>setExpanded(open?null:sectionNo)} style={s.heading}>
      <Text style={s.step}>DZIAŁ {sectionNo} · {done}/{all.length} odebranych{materialsReady?' · '+drafts+' opracowań':''}</Text>
      <Text style={s.h2}>{name}</Text>
      {!filtering&&<Text style={s.small}>{open?'Zwiń listę':'Pokaż tematy'}</Text>}
     </Pressable>
     {open&&rows.map(topic=>{
      const stats=materialStats[topic.topic_no],legacy=topic.lesson_no!==null;
      const next=topic.status==='complete'?
       'Odbiór potwierdzony w rejestrze.' :
       stats?
        'Pozostało: recenzja, sprawdzenie praktyki i test działania na zalogowanym koncie.' :
        legacy?
         'Pozostało: rozbudować starszy materiał do osobnego nowego opracowania oraz przetestować.' :
         'Pozostało: stworzyć teorię, przykłady, zadania, praktykę, źródła i przejść kontrole.';
      return <View key={topic.topic_no} style={s.topic}>
       <Text style={s.topicTitle}>{topic.topic_no}. {topic.title_pl}</Text>
       <Text style={s.small}>Status: {statusLabels[topic.status]||'Nieznany'}</Text>
       {materialsReady&&<Text style={s.small}>{stats?
        'Nowa treść: '+stats.sections+' części, '+stats.examples+' przykładów, '+stats.exercises+' zadań, '+stats.tables+' tabel, '+stats.glossary+' pojęć. Redakcja: '+stats.editorial_status:
        legacy?'Brak nowego opracowania; starsza lekcja nr '+topic.lesson_no+' to kandydat do wykorzystania.':
        'Brak nowego opracowania i brak wskazanej starszej lekcji.'}</Text>}
       <Text style={s.todo}>{next}</Text>
       {!!stats&&<Link href={{pathname:'/temat-ksiegowosci',params:{temat:String(topic.topic_no)}}} style={s.link}>Otwórz zapisany materiał</Link>}
      </View>;
     })}
    </View>;
   })}
   {visible.length===0&&<Text style={s.warning}>Brak tematów odpowiadających filtrom. Zmień wyszukiwanie lub wybierz „Wszystkie”.</Text>}
   {topics.length!==100&&<Text style={s.warning}>Niepełny odczyt mapy programu. Ten wynik nie dowodzi kompletności kursu.</Text>}
   <Text style={s.small}>Dane aktualizują się po odświeżeniu strony. Opracowania do recenzji nie są potwierdzonymi kompetencjami. Wszelkie przykłady i ćwiczenia wykorzystują fikcyjne dane.</Text>
  </>}
 </ScrollView>;
}
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:'#f6f8f0'},
 wrap:{width:'100%',maxWidth:960,alignSelf:'center',padding:20,paddingBottom:65,gap:14},
 nav:{flexDirection:'row',flexWrap:'wrap',gap:18},
 link:{color:'#225b39',fontSize:14,fontWeight:'800',paddingVertical:5},
 eyebrow:{fontSize:12,letterSpacing:1,fontWeight:'800',color:'#507452'},
 h1:{fontSize:31,lineHeight:39,fontWeight:'900',color:'#183c2b'},
 h2:{fontSize:19,fontWeight:'800',color:'#183c2b',lineHeight:26},
 body:{fontSize:15,lineHeight:24,color:'#294735'},
 label:{fontSize:14,lineHeight:22,fontWeight:'800',color:'#21492f'},
 small:{fontSize:12,lineHeight:20,color:'#526e59'},
 todo:{fontSize:13,lineHeight:21,color:'#44554a'},
 topicTitle:{fontSize:15,lineHeight:23,fontWeight:'800',color:'#183c2b'},
 notice:{padding:17,borderRadius:14,backgroundColor:'#e7f0dd',gap:8},
 card:{backgroundColor:'white',borderWidth:1,borderColor:'#d8e6ce',padding:17,borderRadius:14,gap:10},
 heading:{gap:5},step:{fontSize:11,fontWeight:'800',letterSpacing:.8,color:'#547d4d'},
 topic:{paddingTop:12,borderTopWidth:1,borderColor:'#e5ede0',gap:5},
 warning:{backgroundColor:'#fff0e5',padding:14,color:'#893a26',borderRadius:10,fontSize:14},
 grid:{flexDirection:'row',flexWrap:'wrap',gap:9},
 metric:{minWidth:136,flexGrow:1,flexBasis:'30%',backgroundColor:'white',borderRadius:13,borderColor:'#d8e6ce',borderWidth:1,padding:14,gap:4},
 metricNumber:{fontSize:25,fontWeight:'900',color:'#19422c'},
 input:{borderWidth:1,borderColor:'#c9dcc6',borderRadius:10,padding:12,color:'#183c2b',fontSize:15},
 filters:{flexDirection:'row',flexWrap:'wrap',gap:7},
 pill:{paddingVertical:8,paddingHorizontal:12,borderColor:'#ccdcc8',borderWidth:1,borderRadius:22,backgroundColor:'#f7faf4'},
 pillActive:{backgroundColor:'#225b39',borderColor:'#225b39'},
 pillText:{fontSize:12,fontWeight:'700',color:'#275538'},
 pillTextActive:{color:'white'},
 refresh:{alignSelf:'flex-start',paddingHorizontal:12,borderRadius:10,borderWidth:1,borderColor:'#bbd4bd',backgroundColor:'#f7faf4'},
});
