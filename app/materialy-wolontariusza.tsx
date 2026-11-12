import React,{useEffect,useRef,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ActivityIndicator,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
import {HelpLink} from '../src/support/links';

const course='zaufany-wolontariusz';
const sections=[
 {id:'karty',label:'Karty pracy'},
 {id:'test-zbiorek',label:'Test zabezpieczenia zbiórki'},
 {id:'sprawdzian',label:'Sprawdzian sytuacyjny'},
 {id:'zrodla',label:'Źródła'}
] as const;
type Section=(typeof sections)[number]['id'];
type Card={id:string;title:string;intro:string;fields:string[];tip:string};
type Question={question:string;options:string[];answer:number;why:string;critical:boolean;lesson:number};
type Source={id:string;group:string;title:string;url:string;description:string};
type Workbook={cards:Card[];collectionQuiz:Question[];finalExam:Question[];sources:Source[]};
type Access={status:'loading'}|{status:'error';message:string}|{status:'ready';userId:string;workbook:Workbook};

function validQuestions(value:unknown,count:number):value is Question[]{
 return Array.isArray(value)&&value.length===count&&value.every(item=>item&&typeof item.question==='string'
  &&Array.isArray(item.options)&&item.options.length===3&&item.options.every((option:unknown)=>typeof option==='string')
  &&Number.isInteger(item.answer)&&item.answer>=0&&item.answer<item.options.length
  &&typeof item.why==='string'&&typeof item.critical==='boolean'&&Number.isInteger(item.lesson)
  &&item.lesson>=1&&item.lesson<=40);
}
function validWorkbook(value:unknown):value is Workbook{
 if(!value||typeof value!=='object')return false;
 const data=value as Partial<Workbook>;
 return Array.isArray(data.cards)&&data.cards.length>0&&data.cards.every(card=>card&&typeof card.id==='string'
   &&typeof card.title==='string'&&typeof card.intro==='string'&&typeof card.tip==='string'
   &&Array.isArray(card.fields)&&card.fields.every(field=>typeof field==='string'))
  &&validQuestions(data.collectionQuiz,8)&&validQuestions(data.finalExam,12)
  &&Array.isArray(data.sources)&&data.sources.every(source=>source&&typeof source.id==='string'
   &&typeof source.group==='string'&&typeof source.title==='string'&&typeof source.url==='string'
   &&typeof source.description==='string');
}

export default function VolunteerMaterials(){
 const router=useRouter();
 const {sekcja}=useLocalSearchParams<{sekcja?:string}>();
 const section=sections.find(item=>item.id===sekcja)?.id??'karty';
 const [access,setAccess]=useState<Access>({status:'loading'});
 const [retry,setRetry]=useState(0);
 const scrollRef=useRef<React.ComponentRef<typeof ScrollView>>(null);

 useEffect(()=>{
  let active=true;
  let checkedUserId:string|undefined;
  const login=()=>router.replace({pathname:'/konto',params:{course,next:'kup'}});
  setAccess({status:'loading'});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
   if(!active)return;
   if(event==='SIGNED_OUT'){
    active=false;
    setAccess({status:'loading'});
    login();
   }else if(event==='SIGNED_IN'&&checkedUserId&&session?.user.id!==checkedUserId){
    active=false;
    setAccess({status:'loading'});
    setRetry(value=>value+1);
   }
  });
  void (async()=>{
   try{
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(!active)return;
    if(authError||!user){login();return;}
    checkedUserId=user.id;
    const enrollment=await supabase.from('ta_enrollments').select('id')
     .eq('user_id',user.id).eq('course_slug',course).eq('status','active')
     .gt('expires_at',new Date().toISOString()).limit(1);
    if(!active)return;
    if(enrollment.error)throw enrollment.error;
    if(!enrollment.data?.length){router.replace({pathname:'/kup',params:{course}});return;}

    // The database applies the same enrollment-based policy as the learning route.
    const {data,error}=await supabase.from('ta_lessons').select('material')
     .eq('course_slug',course).eq('lesson_no',0).maybeSingle();
    if(!active)return;
    if(error)throw error;
    const workbook:unknown=data?.material?.volunteer_workbook;
    if(!validWorkbook(workbook)){
     setAccess({status:'error',message:'Materiały do tego kursu są chwilowo niedostępne.'});
     return;
    }
    setAccess({status:'ready',userId:user.id,workbook});
   }catch{
    if(active)setAccess({status:'error',message:'Nie udało się wczytać materiałów. Spróbuj ponownie.'});
   }
  })();
  return ()=>{active=false;subscription.unsubscribe();};
 },[router,retry]);

 function selectSection(id:Section){
  router.setParams({sekcja:id});
  scrollRef.current?.scrollTo({y:0,animated:false});
  if(Platform.OS==='web'&&typeof window!=='undefined')window.scrollTo(0,0);
 }
 function openLesson(lesson?:number){
  router.push({pathname:'/nauka',params:{course,...(lesson===undefined?{}:{lesson:String(lesson)})}});
 }

 return <ScrollView ref={scrollRef} style={styles.page} contentContainerStyle={styles.content}>
  <Pressable accessibilityRole="link" onPress={()=>openLesson()} style={styles.back}>
   <Text style={styles.link}>← Wróć do lekcji</Text>
  </Pressable>
  <Text accessibilityRole="header" style={styles.title}>Materiały kursu</Text>
  {access.status==='loading'&&<View style={styles.panel}>
   <ActivityIndicator color={ink}/>
   <Text accessibilityLiveRegion="polite" style={styles.body}>Sprawdzam dostęp do kursu.</Text>
  </View>}
  {access.status==='error'&&<View style={styles.panel}>
   <Text accessibilityLiveRegion="polite" style={styles.body}>{access.message}</Text>
   <Pressable accessibilityRole="button" onPress={()=>setRetry(value=>value+1)} style={styles.primary}>
    <Text style={styles.primaryText}>Spróbuj ponownie</Text>
   </Pressable>
  </View>}
  {access.status==='ready'&&<>
   <View style={styles.tabs}>
    {sections.map(item=><Pressable key={item.id} accessibilityRole="button"
     accessibilityState={{selected:section===item.id}} onPress={()=>selectSection(item.id)}
     style={[styles.tab,section===item.id&&styles.selectedTab]}>
     <Text style={[styles.tabText,section===item.id&&styles.selectedTabText]}>{item.label}</Text>
    </Pressable>)}
   </View>
   {section==='karty'&&<Cards key={access.userId} userId={access.userId} cards={access.workbook.cards}/>}
   {section==='test-zbiorek'&&<Quiz key={access.userId+section} title="Test zabezpieczenia zbiórki"
    questions={access.workbook.collectionQuiz} minimum={6} openLesson={openLesson}/>}
   {section==='sprawdzian'&&<Quiz key={access.userId+section} title="Sprawdzian sytuacyjny"
    questions={access.workbook.finalExam} minimum={9} openLesson={openLesson}/>}
   {section==='zrodla'&&<Sources sources={access.workbook.sources}/>}
  </>}
 </ScrollView>;
}

function Cards({userId,cards}:{userId:string;cards:Card[]}){
 const [expanded,setExpanded]=useState<string>();
 const [notes,setNotes]=useState<Record<string,string>>({});
 const [notesReady,setNotesReady]=useState(false);
 const storageKey='trenerki-volunteer-workbook-v1:'+userId;
 useEffect(()=>{
  let active=true;
  void AsyncStorage.getItem(storageKey).then(raw=>{
   if(!active||!raw)return;
   const parsed:unknown=JSON.parse(raw);
   if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed)){
    setNotes(Object.fromEntries(Object.entries(parsed).filter(([,value])=>typeof value==='string')));
   }
  }).catch(()=>{}).finally(()=>{if(active)setNotesReady(true);});
  return ()=>{active=false;};
 },[storageKey]);
 function saveNotes(){
  if(notesReady)void AsyncStorage.setItem(storageKey,JSON.stringify(notes)).catch(()=>{});
 }

 return <View style={styles.stack}>
  <Text accessibilityRole="header" style={styles.heading}>Karty pracy</Text>
  <Text style={styles.body}>Wpisuj wyłącznie fikcyjne dane do ćwiczeń. Notatki zapisują się na tym urządzeniu.</Text>
  {cards.map(card=><View key={card.id} style={styles.panel}>
   <Pressable accessibilityRole="button" accessibilityState={{expanded:expanded===card.id}}
    onPress={()=>setExpanded(value=>value===card.id?undefined:card.id)} style={styles.cardToggle}>
    <Text style={styles.subheading}>{card.title}</Text>
    <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.link}>
     {expanded===card.id?'Zwiń ↑':'Rozwiń ↓'}
    </Text>
   </Pressable>
   {expanded===card.id&&<>
    <Text style={styles.body}>{card.intro}</Text>
    {card.fields.map((field,index)=>{
     const id=card.id+':'+index;
     return <View key={id} style={styles.field}>
      <Text style={styles.fieldLabel}>{field}</Text>
      <TextInput accessibilityLabel={field} multiline maxLength={1200} editable={notesReady}
       placeholder="Notatka ćwiczeniowa" value={notes[id]??''}
       onChangeText={value=>setNotes(previous=>({...previous,[id]:value}))} onBlur={saveNotes}
       style={styles.input}/>
     </View>;
    })}
    <Text style={styles.muted}>{card.tip}</Text>
   </>}
  </View>)}
 </View>;
}

function Quiz({title,questions,minimum,openLesson}:{title:string;questions:Question[];minimum:number;openLesson:(lesson:number)=>void}){
 const [answers,setAnswers]=useState<Record<number,number>>({});
 const [submitted,setSubmitted]=useState(false);
 const criticalCount=questions.filter(question=>question.critical).length;
 const score=questions.filter((question,index)=>answers[index]===question.answer).length;
 const missed=questions.filter((question,index)=>question.critical&&answers[index]!==question.answer).length;
 const passed=score>=minimum&&missed===0;
 const complete=Object.keys(answers).length===questions.length;

 return <View style={styles.stack}>
  <Text accessibilityRole="header" style={styles.heading}>{title}</Text>
  <Text style={styles.body}>Do zaliczenia potrzebujesz co najmniej {minimum} z {questions.length} punktów i poprawnych odpowiedzi we wszystkich {criticalCount} sytuacjach krytycznych.</Text>
  {questions.map((question,index)=>{
   const correct=answers[index]===question.answer;
   return <View key={index} style={styles.panel}>
    <Text style={styles.subheading}>{index+1}. {question.question}</Text>
    {question.options.map((option,optionIndex)=>{
     const selected=answers[index]===optionIndex;
     return <Pressable key={optionIndex} accessibilityRole="radio" accessibilityState={{checked:selected}}
      onPress={()=>{setAnswers(value=>({...value,[index]:optionIndex}));setSubmitted(false);}}
      style={[styles.choice,selected&&styles.selectedChoice]}>
      <Text style={styles.choiceText}>{String.fromCharCode(65+optionIndex)}. {option}</Text>
     </Pressable>;
    })}
    {submitted&&<View style={[styles.feedback,!correct&&styles.warning]}>
     <Text style={styles.body}>{correct?'Dobra decyzja. ':'Wróć do tej sytuacji. '}{question.why}</Text>
     <Pressable accessibilityRole="link" onPress={()=>openLesson(question.lesson)}>
      <Text style={styles.link}>Wróć do lekcji {question.lesson}</Text>
     </Pressable>
    </View>}
   </View>;
  })}
  <View style={styles.actions}>
   <Pressable accessibilityRole="button" accessibilityState={{disabled:!complete}} disabled={!complete}
    onPress={()=>setSubmitted(true)} style={[styles.primary,!complete&&styles.disabled]}>
    <Text style={styles.primaryText}>Sprawdź wynik</Text>
   </Pressable>
   <Pressable accessibilityRole="button" onPress={()=>{setAnswers({});setSubmitted(false);}} style={styles.tab}>
    <Text style={styles.tabText}>Zacznij od nowa</Text>
   </Pressable>
  </View>
  {submitted&&<View style={[styles.feedback,!passed&&styles.warning]}>
   <Text accessibilityLiveRegion="polite" style={styles.subheading}>
    Wynik: {score}/{questions.length}. {passed?'Sprawdzian zaliczony.':'Sprawdzian do poprawy.'}
    {missed>0?' Decyzje krytyczne do poprawy: '+missed+'.':''}
   </Text>
  </View>}
 </View>;
}

function Sources({sources}:{sources:Source[]}){
 const groups=new Map<string,Source[]>();
 for(const source of sources){
  const group=groups.get(source.group);
  if(group)group.push(source);
  else groups.set(source.group,[source]);
 }
 return <View style={styles.stack}>
  <Text accessibilityRole="header" style={styles.heading}>Źródła</Text>
  {[...groups].map(([group,items])=><View key={group} style={styles.panel}>
   <Text style={styles.subheading}>{group}</Text>
   {items.map(source=><View key={source.id} style={styles.field}>
    {source.url.startsWith('https://')?<HelpLink href={source.url}>{source.title}</HelpLink>:<Text style={styles.fieldLabel}>{source.title}</Text>}
    <Text style={styles.body}>{source.description}</Text>
   </View>)}
  </View>)}
 </View>;
}

const ink='#183c2b';
const styles=StyleSheet.create({
 page:{flex:1,backgroundColor:'#f7faf4'},
 content:{width:'100%',maxWidth:880,alignSelf:'center',padding:18,paddingBottom:44,gap:18},
 back:{alignSelf:'flex-start',minHeight:44,justifyContent:'center'},
 title:{color:ink,fontSize:32,fontWeight:'900'},
 heading:{color:ink,fontSize:24,fontWeight:'900'},
 subheading:{color:ink,fontSize:17,fontWeight:'900',lineHeight:24,flexShrink:1},
 body:{color:'#304b3a',fontSize:15,lineHeight:23},
 muted:{color:'#516657',fontSize:14,lineHeight:21},
 link:{color:'#245a3a',fontSize:14,fontWeight:'800',textDecorationLine:'underline'},
 tabs:{flexDirection:'row',flexWrap:'wrap',gap:8},
 tab:{backgroundColor:'#e7f1e2',borderColor:'#cbdcc5',borderWidth:1,borderRadius:10,paddingHorizontal:12,paddingVertical:10,minHeight:44,justifyContent:'center'},
 selectedTab:{backgroundColor:ink,borderColor:ink},
 tabText:{color:ink,fontSize:14,fontWeight:'800'},
 selectedTabText:{color:'#fff'},
 stack:{gap:12},
 panel:{backgroundColor:'#fff',borderColor:'#dce8d6',borderWidth:1,borderRadius:14,padding:15,gap:10},
 cardToggle:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,minHeight:40},
 field:{gap:5},
 fieldLabel:{color:ink,fontSize:14,fontWeight:'800'},
 input:{color:ink,backgroundColor:'#f8faf6',borderColor:'#c9d9c3',borderWidth:1,borderRadius:8,minHeight:72,padding:10,textAlignVertical:'top'},
 choice:{borderColor:'#d6e3d1',borderWidth:1,borderRadius:9,padding:12,minHeight:44,justifyContent:'center'},
 selectedChoice:{backgroundColor:'#e0efd8',borderColor:'#487a53'},
 choiceText:{color:ink,fontSize:15,lineHeight:22},
 actions:{flexDirection:'row',flexWrap:'wrap',gap:8},
 primary:{backgroundColor:ink,borderRadius:10,paddingHorizontal:15,paddingVertical:11,minHeight:44,justifyContent:'center',alignSelf:'flex-start'},
 primaryText:{color:'#fff',fontSize:15,fontWeight:'900'},
 disabled:{opacity:0.55},
 feedback:{backgroundColor:'#e7f3e0',borderRadius:10,padding:12,gap:8},
 warning:{backgroundColor:'#fff0dc'}
});
