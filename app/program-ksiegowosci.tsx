import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {Link,useRouter} from 'expo-router';
import {supabase} from '../src/supabase';

type Topic={
 topic_no:number;
 section_no:number;
 topic_in_section:number;
 title_pl:string;
 status:'planned'|'in_progress'|'review_needed'|'blocked'|'complete';
 lesson_no:number|null;
};
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
const statusLabels:Record<Topic['status'],string>={
 planned:'Treść w przygotowaniu',
 in_progress:'W opracowaniu',
 review_needed:'Wymaga recenzji',
 blocked:'Czeka na weryfikację',
 complete:'Ukończony i sprawdzony',
};
export default function ProgramKsiegowosci(){
 const router=useRouter();
 const [topics,setTopics]=useState<Topic[]>([]);
 const [expanded,setExpanded]=useState<number|null>(1);
 const [busy,setBusy]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  (async()=>{
   try{
    const session=await supabase.auth.getUser();
    if(!active)return;
    if(session.error||!session.data.user){router.replace('/konto');return;}
    const access=await supabase.rpc('ta_accounting_overview');
    if(!active)return;
    if(access.error)throw new Error('Program wymaga dostępu do kursu lub podglądu właściciela.');
    const result=await supabase.from('ta_accounting_core_topics_v3')
      .select('topic_no,section_no,topic_in_section,title_pl,status,lesson_no').order('topic_no');
    if(result.error)throw new Error('Nie udało się odczytać nowego programu. Spróbuj ponownie.');
    if(active)setTopics((result.data||[]) as Topic[]);
   }catch(e:any){if(active)setError(e?.message||'Nie udało się wczytać programu.');}
   finally{if(active)setBusy(false);}
  })();
  return()=>{active=false;};
 },[router]);
 const reviewed=topics.filter(x=>x.status==='complete').length;
 return <ScrollView style={s.page} contentContainerStyle={s.wrap}>
  <View style={s.nav}><Link href="/ksiegowosc" style={s.link}>← Encyklopedia</Link><Link href="/biuro-ksiegowe" style={s.link}>Biuro ćwiczeniowe</Link></View>
  <Text style={s.eyebrow}>TRENERKI · NOWY PROGRAM PODSTAWOWY</Text>
  <Text accessibilityRole="header" style={s.h1}>Księgowość w 100 konkretnych tematach</Text>
  <Text style={s.body}>Dziesięć działów prowadzi od pierwszego dokumentu do ksiąg, podatków, płac, rozliczeń i praktycznego biura. Każdy temat będzie uznany za ukończony dopiero po opracowaniu i sprawdzeniu treści, obliczeń oraz ćwiczeń.</Text>
  <View style={s.notice}>
   <Text style={s.label}>Stan nowego programu: {topics.length ? `${reviewed}/${topics.length} tematów z potwierdzonym odbiorem` : 'oczekiwanie na odczyt'}.</Text>
   <Text style={s.small}>To mapa nauki, a nie lista już dostępnych lekcji. Starsze opracowania i Twoje zapisane postępy pozostają zachowane w encyklopedii. Sama recenzja redakcyjna starszej lekcji nie zalicza nowego tematu.</Text>
  </View>
  {busy&&<ActivityIndicator accessibilityLabel="Odczyt programu"/>}
  {!!error&&<Text accessibilityRole="alert" style={s.warning}>{error}</Text>}
  {!busy&&!error&&sections.map((name,index)=>{
   const sectionNo=index+1,rows=topics.filter(t=>t.section_no===sectionNo),done=rows.filter(t=>t.status==='complete').length,open=expanded===sectionNo;
   return <View key={sectionNo} style={s.card}>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:open}} onPress={()=>setExpanded(open?null:sectionNo)} style={s.heading}>
     <Text style={s.step}>DZIAŁ {sectionNo} · {done}/{rows.length} ukończonych</Text>
     <Text style={s.h2}>{name}</Text><Text style={s.small}>{open?'Zwiń':'Pokaż tematy'}</Text>
    </Pressable>
    {open&&rows.map(topic=><View key={topic.topic_no} style={s.topic}>
     <Text style={s.body}>{topic.topic_no}. {topic.title_pl}</Text>
     <Text style={s.small}>{statusLabels[topic.status]||'Status nieznany'}</Text>
     {topic.status==='complete'&&topic.lesson_no!==null&&
      <Link href={{pathname:'/ksiegowosc',params:{lesson:String(topic.lesson_no)}}} style={s.link}>Otwórz sprawdzoną lekcję</Link>}
    </View>)}
   </View>;
  })}
  {!busy&&!error&&topics.length!==100&&<Text style={s.warning}>Mapa jest niekompletna w aktualnym odczycie. Nie traktuj jej jako pełnego programu.</Text>}
  <Text style={s.small}>Przykłady służą wyłącznie nauce na danych fikcyjnych. Materiały w trakcie opracowania nie zastępują porady księgowego ani zgłoszenia do urzędu.</Text>
 </ScrollView>;
}
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:'#f6f8f0'},
 wrap:{width:'100%',maxWidth:900,alignSelf:'center',padding:20,paddingBottom:65,gap:14},
 nav:{flexDirection:'row',flexWrap:'wrap',gap:18},
 link:{color:'#225b39',fontSize:14,fontWeight:'800',paddingVertical:5},
 eyebrow:{fontSize:12,letterSpacing:1,fontWeight:'800',color:'#507452'},
 h1:{fontSize:31,lineHeight:39,fontWeight:'900',color:'#183c2b'},
 h2:{fontSize:19,fontWeight:'800',color:'#183c2b',lineHeight:26},
 body:{fontSize:15,lineHeight:24,color:'#294735'},
 label:{fontSize:14,lineHeight:22,fontWeight:'800',color:'#21492f'},
 small:{fontSize:12,lineHeight:20,color:'#526e59'},
 notice:{padding:17,borderRadius:14,backgroundColor:'#e7f0dd',gap:8},
 card:{backgroundColor:'white',borderWidth:1,borderColor:'#d8e6ce',padding:17,borderRadius:14,gap:10},
 heading:{gap:5},
 step:{fontSize:11,fontWeight:'800',letterSpacing:.8,color:'#547d4d'},
 topic:{paddingTop:12,borderTopWidth:1,borderColor:'#e5ede0',gap:4},
 warning:{backgroundColor:'#fff0e5',padding:14,color:'#893a26',borderRadius:10,fontSize:14},
});
