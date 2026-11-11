import React,{useEffect,useState} from 'react';
import {ScrollView,View,Text,Pressable,ActivityIndicator,Platform} from 'react-native';
import {useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
import {downloadDiploma,type Diploma} from '../src/diplomaApi';

const ink='#183628',muted='#647967';
type StoredDiploma=Diploma&{course_slug:string;revoked_at?:string|null};
export default function MyDiplomas(){
 const router=useRouter();
 const [items,setItems]=useState<StoredDiploma[]>([]);
 const [busy,setBusy]=useState(true),[error,setError]=useState(''),[downloading,setDownloading]=useState<string|null>(null);
 useEffect(()=>{let active=true;(async()=>{
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser();
   if(authError||!user){router.replace('/konto');return;}
   const {data,error:dbError}=await supabase.from('ta_certificates')
    .select('id,course_slug,certificate_no,holder_name,title_pl,title_en,issued_at,is_demo,revoked_at')
    .eq('user_id',user.id).eq('is_demo',false).is('revoked_at',null)
    .order('issued_at',{ascending:false}).limit(250);
   if(dbError)throw dbError;
   if(active)setItems((data||[]) as StoredDiploma[]);
  }catch(e:any){if(active)setError(e.message||'Nie można pobrać dyplomów.');}
  finally{if(active)setBusy(false);}
 })();return()=>{active=false};},[]);
 async function getFile(d:StoredDiploma,lang:'pl'|'en'){
  if(downloading)return;
  setDownloading(d.id+lang);setError('');
  try{await downloadDiploma(d.id,lang);}catch(e:any){setError(e.message||'Nie można pobrać PDF.');}
  finally{setDownloading(null);}
 }
 return <ScrollView style={{flex:1,backgroundColor:'#fcfcf7'}} contentContainerStyle={{padding:20,paddingBottom:80,maxWidth:950,alignSelf:'center',width:'100%',gap:15}}>
  <Pressable onPress={()=>router.push('/moje-kursy')} accessibilityRole="button">
   <Text style={{color:'#356e4e',fontWeight:'800'}}>← Mój profil</Text>
  </Pressable>
  <Text style={{fontSize:31,fontWeight:'900',color:ink}}>Moje dyplomy</Text>
  {busy&&<ActivityIndicator color={ink}/>}
  {!!error&&<Text style={{backgroundColor:'#fff1e7',color:'#9b4430',padding:12,borderRadius:9}}>{error}</Text>}
  {!busy&&!items.length&&<View style={{backgroundColor:'white',borderWidth:1,borderColor:'#e2e9dc',borderRadius:14,padding:23,gap:11}}>
   <Text style={{fontSize:19,fontWeight:'800',color:ink}}>Nie masz jeszcze dyplomów</Text>
   <Text style={{color:muted,lineHeight:22}}>Po ukończeniu kursu i zaliczeniu egzaminu dyplom pojawi się tutaj w dwóch wersjach językowych.</Text>
   <Pressable onPress={()=>router.push('/moje-kursy')} style={{backgroundColor:'#eaf3e2',padding:12,borderRadius:10}}>
    <Text style={{color:ink,fontWeight:'800',textAlign:'center'}}>Wróć do moich kursów</Text>
   </Pressable>
  </View>}
  {items.map(item=><View key={item.id} style={{backgroundColor:'white',borderWidth:1,borderColor:'#dfebdc',borderRadius:14,padding:17,gap:9}}>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:8,flexWrap:'wrap'}}>
    <Text style={{fontSize:19,fontWeight:'900',color:ink,flexShrink:1}}>{item.title_pl}</Text>
    <Text style={{fontWeight:'800',fontSize:11,color:'#8e7039'}}>{item.certificate_no}</Text>
   </View>
   <Text style={{color:muted,fontSize:13}}>{new Date(item.issued_at).toLocaleDateString('pl-PL',{timeZone:'Europe/Warsaw'})} · {item.holder_name}</Text>
   <Text style={{fontSize:13,color:muted}}>{item.title_en}</Text>
   <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
    <Pressable onPress={()=>router.push({pathname:'/dyplom',params:{course:item.course_slug}})} style={{backgroundColor:ink,borderRadius:10,padding:11}}>
     <Text style={{color:'white',fontWeight:'800'}}>Zobacz dyplom</Text>
    </Pressable>
    {Platform.OS==='web'&&(['pl','en'] as const).map(lang=><Pressable key={lang} disabled={!!downloading} accessibilityRole="button"
      onPress={()=>void getFile(item,lang)} style={{backgroundColor:'#edf5e5',borderRadius:10,padding:11,opacity:!!downloading?.6:1}}>
      <Text style={{color:ink,fontWeight:'800'}}>{downloading===item.id+lang?'Przygotowuję…':'PDF '+lang.toUpperCase()}</Text>
    </Pressable>)}
   </View>
  </View>)}
 </ScrollView>;
}
