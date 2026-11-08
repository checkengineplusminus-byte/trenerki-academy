import React,{useEffect,useState} from 'react';
import {ScrollView,View,Text,Pressable,ActivityIndicator} from 'react-native';
import {useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
type Enrollment={course_slug:string,expires_at:string,status:string,ta_courses:{title_pl:string}|null};
export default function MyCourses(){
 const router=useRouter(),[items,setItems]=useState<(Enrollment&{progress:number})[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(true);
 useEffect(()=>{void load()},[]);
 async function load(){
  setBusy(true);
  try{
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){router.replace('/konto');return;}
   const [{data:rows,error:e},{data:passed,error:p}]=await Promise.all([
     supabase.from('ta_enrollments').select('course_slug,expires_at,status,ta_courses(title_pl)').eq('user_id',user.id),
     supabase.from('ta_learning_progress').select('course_slug,lesson_no').eq('user_id',user.id)]);
   if(e||p)throw e||p;
   const done=new Map<string,Set<number>>();for(const row of passed||[]){if(!done.has(row.course_slug))done.set(row.course_slug,new Set());done.get(row.course_slug)!.add(row.lesson_no);}
   setItems(((rows||[]) as unknown as Enrollment[]).map(row=>({...row,progress:Math.min(100,Math.round((done.get(row.course_slug)?.size||0)*12.5))})));
  }catch(e:any){setError(e.message||'Nie udało się wczytać kursów.');}finally{setBusy(false);}
 }
 return <ScrollView style={{flex:1,backgroundColor:'#fcfcf7'}} contentContainerStyle={{padding:25,maxWidth:900,alignSelf:'center',width:'100%'}}>
  <Pressable onPress={()=>router.push('/')}><Text style={{color:'#376143',fontWeight:'800',marginBottom:18}}>← Katalog kursów</Text></Pressable>
  <Text style={{fontSize:32,fontWeight:'900',color:'#173228',marginBottom:10}}>Moje kursy</Text>
  <Text style={{color:'#5c7460',marginBottom:21}}>Twoje kursy, postęp i notatki są przypisane do konta. W przyszłości zakupy będą widoczne od razu po potwierdzeniu płatności.</Text>
  {busy&&<ActivityIndicator/>}{!!error&&<Text style={{color:'#a52626'}}>{error}</Text>}
  {!busy&&!items.length&&<Text>Konto jest gotowe. Wybierz interesujący Cię kurs z katalogu, kliknij „Kup kurs” lub odbierz darmowy kurs Świętego Mikołaja.</Text>}
  {items.map((row,i)=>{const active=row.status==='active'&&new Date(row.expires_at)>new Date();return <View key={row.course_slug+String(i)} style={{backgroundColor:'white',padding:20,marginBottom:13,borderRadius:15,borderWidth:1,borderColor:'#d8e9d6'}}>
    <Text style={{fontSize:20,fontWeight:'800',color:'#183d2c'}}>{row.ta_courses?.title_pl||row.course_slug}</Text>
    <Text style={{marginTop:9,color:'#526f5b'}}>Postęp: {row.progress}% · Dostęp do: {new Date(row.expires_at).toLocaleDateString('pl-PL')} · {active?'aktywny':'zakończony'}</Text>
    <View style={{backgroundColor:'#eaf1e6',height:8,borderRadius:8,overflow:'hidden',marginTop:12}}><View style={{backgroundColor:'#79a87d',width:row.progress+'%',height:8}}/></View>
    <Pressable disabled={!active} onPress={()=>router.push({pathname:'/nauka',params:{course:row.course_slug}})} style={{alignSelf:'flex-start',backgroundColor:'#1e5234',padding:13,marginTop:14,borderRadius:10,opacity:active?1:.5}}><Text style={{color:'white',fontWeight:'800'}}>Kontynuuj naukę →</Text></Pressable>
   </View>})}
  <Pressable onPress={()=>router.replace('/')} style={{backgroundColor:'#e8f3dc',padding:14,marginTop:18,borderRadius:12,alignItems:'center'}}><Text style={{color:'#173228',fontWeight:'800'}}>Przeglądaj wszystkie kursy →</Text></Pressable>
  <Pressable onPress={async()=>{await supabase.auth.signOut();router.replace('/konto')}} style={{padding:13,marginTop:12}}><Text style={{color:'#476d50',fontWeight:'700'}}>Wyloguj się</Text></Pressable>
 </ScrollView>;
}