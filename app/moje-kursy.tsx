import React,{useEffect,useState} from 'react';
import {ScrollView,View,Text,Pressable,ActivityIndicator} from 'react-native';
import {useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
import {academyAction} from '../src/academyApi';
type Enrollment={course_slug:string,expires_at:string,status:string,ta_courses:{title_pl:string}|null};
type Diploma={course_slug:string;certificate_no:string;is_demo:boolean;issued_at:string};
export default function MyCourses(){
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
     .select('course_slug,certificate_no,is_demo,issued_at').eq('user_id',user.id).is('revoked_at',null).order('is_demo',{ascending:false});
   if(de)throw de;
   setCertificates(Object.fromEntries((diplomas||[]).map(d=>[d.course_slug,d as Diploma])));
   setItems(enrolled.map(row=>{
    const lessonCount=counts.get(row.course_slug)||8;
    const completedCount=Math.min(lessonCount,done.get(row.course_slug)?.size||0);
    return {...row,lessonCount,completedCount,progress:Math.round(completedCount/lessonCount*100)};
   }));
  }catch(e:any){setError(e.message||'Nie udało się wczytać kursów.');}finally{setBusy(false);}
 }
 return <ScrollView style={{flex:1,backgroundColor:'#fcfcf7'}} contentContainerStyle={{padding:25,maxWidth:900,alignSelf:'center',width:'100%'}}>
  <Pressable onPress={()=>router.push('/')}><Text style={{color:'#376143',fontWeight:'800',marginBottom:18}}>← Katalog kursów</Text></Pressable>
  <Text style={{fontSize:32,fontWeight:'900',color:'#173228',marginBottom:10}}>Moje kursy</Text>
  <Text style={{color:'#5c7460',marginBottom:21}}>Twoje kursy i wyniki nauki w jednym miejscu. Możesz wracać do ukończonych lekcji i sprawdzać postępy.</Text>
  {busy&&<ActivityIndicator/>}{!!error&&<Text style={{color:'#a52626'}}>{error}</Text>}
  {!busy&&!items.length&&<View style={{backgroundColor:'#eaf4e5',padding:24,borderRadius:17,borderColor:'#cfdfc7',borderWidth:1,gap:13}}>
   <Text style={{fontSize:22,color:'#183d2c',fontWeight:'900'}}>Czysty start — wybierz pierwszy kurs</Text>
   <Text style={{fontSize:15,lineHeight:25,color:'#4b6852'}}>Na Twoim koncie nie ma obecnie zapisanych kursów. Gdy rozpoczniesz nowy, pojawi się tutaj wraz z postępem od pierwszej lekcji.</Text>
   <Pressable accessibilityRole="button" onPress={()=>router.push('/')} style={{backgroundColor:'#193d2b',borderRadius:11,padding:15}}>
    <Text style={{color:'white',fontWeight:'900',textAlign:'center'}}>Odkryj kursy i rozpocznij naukę →</Text>
   </Pressable>
  </View>}
  {items.map((row,i)=>{const active=row.status==='active'&&new Date(row.expires_at)>new Date();return <View key={row.course_slug+String(i)} style={{backgroundColor:'white',padding:20,marginBottom:13,borderRadius:15,borderWidth:1,borderColor:'#d8e9d6'}}>
    <Text style={{fontSize:20,fontWeight:'800',color:'#183d2c'}}>{row.ta_courses?.title_pl||row.course_slug}</Text>
    {row.status==='demo'&&<Text style={{fontWeight:'800',fontSize:12,color:'#886129',backgroundColor:'#fff3d5',padding:10,borderRadius:10,marginTop:10}}>DOSTĘP TESTOWY • 0 zł zapłacone • bez faktury</Text>}
    <Text style={{marginTop:9,color:'#526f5b'}}>Postęp: {row.progress}% ({row.completedCount}/{row.lessonCount} lekcji) · Dostęp do: {new Date(row.expires_at).toLocaleDateString('pl-PL')} · {active?'aktywny':'zakończony'}</Text>
    <View style={{backgroundColor:'#eaf1e6',height:8,borderRadius:8,overflow:'hidden',marginTop:12}}><View style={{backgroundColor:'#79a87d',width:row.progress+'%',height:8}}/></View>
    <Pressable disabled={!active} onPress={()=>router.push({pathname:'/nauka',params:{course:row.course_slug}})} style={{alignSelf:'flex-start',backgroundColor:'#1e5234',padding:13,marginTop:14,borderRadius:10,opacity:active?1:.5}}><Text style={{color:'white',fontWeight:'800'}}>Kontynuuj naukę →</Text></Pressable>
    {certificates[row.course_slug]?
     <Pressable onPress={()=>router.push({pathname:'/dyplom',params:{course:row.course_slug}})} style={{alignSelf:'flex-start',backgroundColor:'#e8f3dc',padding:13,marginTop:10,borderRadius:10,borderWidth:1,borderColor:'#b7d9b0'}}>
      <Text style={{color:'#235e3b',fontWeight:'900'}}>{certificates[row.course_slug].is_demo?'Zobacz wzór dyplomu testowego →':'Zobacz autorski dyplom →'}</Text>
     </Pressable>:
     <View style={{gap:8,marginTop:9}}>
      {row.progress===100&&<Text style={{fontSize:12,color:'#5d765e'}}>Lekcje ukończone. Otwórz kurs, aby zdać końcowy egzamin Anielki i wystawić właściwy dyplom.</Text>}
      <Pressable onPress={()=>router.push({pathname:'/dyplom',params:{course:row.course_slug,preview:'1'}})}
       style={{alignSelf:'flex-start',backgroundColor:'#f2f5ef',padding:12,borderWidth:1,borderColor:'#d1dfc9',borderRadius:9}}>
       <Text style={{fontWeight:'800',color:'#4a6850'}}>Zobacz przykład dyplomu — tylko wzór testowy →</Text>
      </Pressable>
     </View>}

   </View>})}
  {isAdmin&&<Pressable onPress={()=>router.push('/admin')} style={{backgroundColor:'#173228',padding:15,marginTop:15,borderRadius:12,alignItems:'center'}}><Text style={{color:'white',fontWeight:'900'}}>Panel administratora TRENERKI →</Text></Pressable>}
  <Pressable onPress={()=>router.push('/prezent')} style={{backgroundColor:'#e8f3dc',padding:14,marginTop:18,borderRadius:12,alignItems:'center'}}><Text style={{color:'#173228',fontWeight:'800'}}>🎁 Wyślij lub odbierz prezent →</Text></Pressable>
  <Pressable onPress={()=>router.replace('/')} style={{backgroundColor:'#e8f3dc',padding:14,marginTop:18,borderRadius:12,alignItems:'center'}}><Text style={{color:'#173228',fontWeight:'800'}}>Przeglądaj wszystkie kursy →</Text></Pressable>
  <Pressable onPress={async()=>{await supabase.auth.signOut();router.replace('/konto')}} style={{padding:13,marginTop:12}}><Text style={{color:'#476d50',fontWeight:'700'}}>Wyloguj się</Text></Pressable>
 </ScrollView>;
}