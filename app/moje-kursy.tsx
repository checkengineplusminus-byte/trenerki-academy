import React,{useEffect,useState} from 'react';
import {ScrollView,View,Text,Pressable,ActivityIndicator,useWindowDimensions} from 'react-native';
import {useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
import {academyAction} from '../src/academyApi';
type Enrollment={course_slug:string,expires_at:string,status:string,ta_courses:{title_pl:string}|null};
type Diploma={course_slug:string;certificate_no:string;is_demo:boolean;issued_at:string};
export default function MyCourses(){
 const {width}=useWindowDimensions(),columns=width>=1080?4:width>=730?3:2,availableWidth=Math.min(width,1150)-40,cardWidth=Math.max(130,Math.floor((availableWidth-(columns-1)*12)/columns));
 const [visibleSections,setVisibleSections]=useState<Record<string,number>>({});
 const router=useRouter(),[certificates,setCertificates]=useState<Record<string,Diploma>>({}),[items,setItems]=useState<(Enrollment&{progress:number,completedCount:number,lessonCount:number})[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(true),[isAdmin,setAdmin]=useState(false);
 useEffect(()=>{void load()},[]);
 async function load(){
  setBusy(true);
  try{
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){router.replace('/konto');return;}
   void academyAction('whoami').then(info=>setAdmin(!!info.is_admin)).catch(()=>setAdmin(false));
   const [{data:rows,error:e},{data:passed,error:p}]=await Promise.all([
     supabase.from('ta_enrollments').select('course_slug,expires_at,status,ta_courses(title_pl)').eq('user_id',user.id),
     supabase.from('ta_learning_progress').select('course_slug,lesson_no').eq('user_id',user.id)]);
   if(e||p)throw e||p;
   const done=new Map<string,Set<number>>();for(const row of passed||[]){if(!done.has(row.course_slug))done.set(row.course_slug,new Set());done.get(row.course_slug)!.add(row.lesson_no);}
   const enrolled=(rows||[]) as unknown as Enrollment[];
   const slugs=[...new Set(enrolled.map(r=>r.course_slug))];
   let counts=new Map<string,number>();
   if(slugs.length){
    // Jedynie lekcje kursów użytkownika: RLS nadal blokuje cudze materiały.
    const {data:lessons,error:le}=await supabase.from('ta_lessons').select('course_slug,lesson_no').in('course_slug',slugs);
    if(le)throw le;
    for(const row of lessons||[])counts.set(row.course_slug,(counts.get(row.course_slug)||0)+1);
   }
   const {data:diplomas,error:de}=await supabase.from('ta_certificates')
     .select('course_slug,certificate_no,is_demo,issued_at').eq('user_id',user.id).is('revoked_at',null).order('is_demo',{ascending:true});
   if(de)throw de;
   setCertificates(Object.fromEntries((diplomas||[]).map(d=>[d.course_slug,d as Diploma])));
   setItems(enrolled.map(row=>{
    const lessonCount=counts.get(row.course_slug)||0;
    const completedCount=Math.min(lessonCount,done.get(row.course_slug)?.size||0);
    return {...row,lessonCount,completedCount,progress:lessonCount?Math.round(completedCount/lessonCount*100):0};
   }));
  }catch(e:any){setError(e.message||'Nie udało się wczytać kursów.');}finally{setBusy(false);}
 }

 const valid=(row:typeof items[number])=>row.status==='active'&&new Date(row.expires_at)>new Date();
 const finished=(row:typeof items[number])=>(row.lessonCount>0&&row.completedCount>=row.lessonCount)||!!certificates[row.course_slug]&&!certificates[row.course_slug].is_demo;
 const sections=[
  {title:'W trakcie',description:'Kontynuuj naukę od ostatniej ukończonej lekcji.',rows:items.filter(row=>valid(row)&&!finished(row)&&row.completedCount>0)},
  {title:'Do rozpoczęcia',description:'Kursy czekające na pierwszą lekcję.',rows:items.filter(row=>valid(row)&&!finished(row)&&row.completedCount===0)},
  {title:'Ukończone',description:'Kursy z ukończonymi lekcjami — po egzaminie możesz odebrać dyplom.',rows:items.filter(row=>valid(row)&&finished(row))},
  {title:'Dostęp zakończony',description:'Kursy, do których dostęp wygasł.',rows:items.filter(row=>!valid(row))}
 ];
 const courseCard=(row:typeof items[number])=>{
  const cert=certificates[row.course_slug],hasDiploma=!!cert&&!cert.is_demo,active=valid(row),done=finished(row);
  return <View key={row.course_slug} style={{width:cardWidth,backgroundColor:'white',borderRadius:15,borderWidth:1,borderColor:'#dbe8d9',padding:12,minHeight:210,justifyContent:'space-between',gap:9}}>
   <View style={{gap:7}}>
    <View style={{width:38,height:38,backgroundColor:done?'#dceeca':'#eaf2e7',borderRadius:11,justifyContent:'center',alignItems:'center'}}>
     <Text style={{fontSize:18,fontWeight:'900',color:'#173228'}}>{done?'✓':'T.'}</Text>
    </View>
    <Text style={{fontSize:columns===2?13:15,lineHeight:columns===2?18:21,color:'#173228',fontWeight:'800',minHeight:columns===2?54:44}} numberOfLines={3}>{row.ta_courses?.title_pl||row.course_slug}</Text>
    <Text style={{fontSize:11,color:'#667b68'}}>{row.lessonCount?String(row.completedCount)+' / '+String(row.lessonCount)+' lekcji':'Postęp niedostępny'}</Text>
    <View style={{height:7,borderRadius:8,backgroundColor:'#e9f0e6',overflow:'hidden'}} accessibilityLabel={'Postęp '+row.progress+'%'}>
     <View style={{height:7,backgroundColor:'#76a777',width:row.progress+'%'}}/>
    </View>
    <Text style={{fontSize:11,fontWeight:done?'800':'500',color:done?'#2c7b46':'#667b68'}}>{done?'Lekcje ukończone':row.progress+'% ukończono'}</Text>
   </View>
   <View style={{gap:6}}>
    {active?<Pressable onPress={()=>router.push({pathname:'/nauka',params:{course:row.course_slug}})} accessibilityRole="button"
     style={{backgroundColor:'#173228',paddingVertical:10,paddingHorizontal:5,borderRadius:9}}>
     <Text style={{textAlign:'center',fontSize:12,color:'white',fontWeight:'800'}}>{done?'Otwórz kurs':'Kontynuuj naukę'}</Text>
    </Pressable>:<Text style={{fontSize:12,color:'#956532'}}>Dostęp wygasł</Text>}
    {hasDiploma&&<Pressable onPress={()=>router.push({pathname:'/dyplom',params:{course:row.course_slug}})} accessibilityRole="button"
     style={{backgroundColor:'#e8f3dc',padding:9,borderRadius:9}}>
     <Text style={{textAlign:'center',fontSize:11,color:'#245c3c',fontWeight:'800'}}>Zobacz dyplom</Text>
    </Pressable>}
    {done&&!hasDiploma&&<Text style={{fontSize:10,lineHeight:15,color:'#667b68'}}>Egzamin i dyplom w kursie</Text>}
   </View>
  </View>;
 };
 return <ScrollView style={{flex:1,backgroundColor:'#fcfcf7'}} contentContainerStyle={{padding:20,maxWidth:1150,alignSelf:'center',width:'100%',paddingBottom:55}}>
  <Pressable onPress={()=>router.push('/')}><Text style={{color:'#376143',fontWeight:'800',marginBottom:15}}>← Katalog kursów</Text></Pressable>
  {isAdmin&&<Pressable accessibilityRole="button" onPress={()=>router.push('/admin')} style={{alignSelf:'stretch',backgroundColor:'#183b2c',padding:14,borderRadius:13,marginBottom:15}}>
    <Text style={{color:'white',textAlign:'center',fontWeight:'900'}}>Panel administratora TRENERKI →</Text>
   </Pressable>}
  <Text style={{fontSize:width<500?28:33,fontWeight:'900',color:'#173228',marginBottom:7}}>Moje kursy</Text>
  <Text style={{color:'#5c7460',fontSize:14,lineHeight:21,marginBottom:15}}>Kursy, zapisane postępy i dyplomy w jednym miejscu.</Text>
  {!busy&&<View style={{flexDirection:'row',gap:8,flexWrap:'wrap',marginBottom:18}}>
   <Text style={{backgroundColor:'#edf5e9',borderRadius:9,padding:10,color:'#173228',fontSize:12,fontWeight:'800'}}>Kursy: {items.length}</Text>
   <Text style={{backgroundColor:'#edf5e9',borderRadius:9,padding:10,color:'#173228',fontSize:12,fontWeight:'800'}}>Zaliczone lekcje: {items.reduce((sum,row)=>sum+row.completedCount,0)}</Text>
   <Text style={{backgroundColor:'#edf5e9',borderRadius:9,padding:10,color:'#173228',fontSize:12,fontWeight:'800'}}>Ukończone kursy: {items.filter(row=>valid(row)&&finished(row)).length}</Text>
  </View>}
  {busy&&<ActivityIndicator/>}
  {!!error&&<Text style={{color:'#a52626',marginBottom:14}}>{error}</Text>}
  {!busy&&!items.length&&<View style={{backgroundColor:'#eaf4e5',borderRadius:15,padding:23,gap:12}}>
   <Text style={{fontSize:22,color:'#173228',fontWeight:'900'}}>Zacznij od pierwszego kursu</Text>
   <Text style={{color:'#5c7460'}}>Po zapisaniu się na kurs znajdziesz go tutaj wraz z postępem nauki.</Text>
   <Pressable onPress={()=>router.push('/')} style={{backgroundColor:'#173228',padding:13,borderRadius:10}}><Text style={{color:'white',fontWeight:'800',textAlign:'center'}}>Przeglądaj kursy</Text></Pressable>
  </View>}
  {sections.filter(section=>section.rows.length>0).map(section=>{
   const limit=visibleSections[section.title]||4;
   const subset=section.rows.slice(0,limit),remaining=section.rows.length-subset.length;
   return <View key={section.title} style={{marginVertical:14,gap:11}}>
    <Text style={{fontSize:21,fontWeight:'900',color:'#173228'}}>{section.title} ({section.rows.length})</Text>
    <Text style={{color:'#617866',fontSize:12,lineHeight:19}}>{section.description}</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{subset.map(courseCard)}</View>
    {remaining>0&&<Pressable onPress={()=>setVisibleSections(prev=>({...prev,[section.title]:(prev[section.title]||4)+4}))} accessibilityRole="button"
     style={{alignSelf:'center',backgroundColor:'#e8f3dc',borderRadius:12,paddingHorizontal:18,paddingVertical:11,marginTop:2}}>
     <Text style={{color:'#173228',fontSize:13,fontWeight:'800'}}>Pokaż kolejne {Math.min(4,remaining)} • pozostało {remaining}</Text>
    </Pressable>}
   </View>;
  })}
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:20}}>
   {isAdmin&&<Pressable onPress={()=>router.push('/admin')} style={{backgroundColor:'#173228',padding:13,borderRadius:11}}><Text style={{color:'white',fontWeight:'800'}}>Panel administratora</Text></Pressable>}
   <Pressable onPress={()=>router.push('/prezent')} style={{backgroundColor:'#e8f3dc',padding:13,borderRadius:11}}><Text style={{color:'#173228',fontWeight:'800'}}>🎁 Karty podarunkowe</Text></Pressable>
   <Pressable onPress={()=>router.replace('/')} style={{backgroundColor:'#e8f3dc',padding:13,borderRadius:11}}><Text style={{color:'#173228',fontWeight:'800'}}>Przeglądaj kursy</Text></Pressable>
  </View>
  <Pressable onPress={async()=>{await supabase.auth.signOut();router.replace('/konto')}} style={{alignSelf:'flex-start',padding:13,marginTop:12}}><Text style={{color:'#476d50',fontWeight:'700'}}>Wyloguj się</Text></Pressable>
 </ScrollView>;
}
