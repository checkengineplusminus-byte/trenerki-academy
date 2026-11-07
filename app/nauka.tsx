import React,{useEffect,useState} from 'react';
import {ScrollView,View,Text,TextInput,Pressable,ActivityIndicator} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
type Lesson={lesson_no:number,title_pl:string,material:{raw?:string[]}};
export default function Learning(){
 const {course}=useLocalSearchParams<{course:string}>(),slug=typeof course==='string'?course:'',router=useRouter();
 const [items,setItems]=useState<Lesson[]>([]),[done,setDone]=useState<number[]>([]),[notes,setNotes]=useState(''),[module,setModule]=useState(0),[user,setUser]=useState(''),[error,setError]=useState(''),[msg,setMsg]=useState(''),[busy,setBusy]=useState(true);
 useEffect(()=>{void (async()=>{
  try{
   const {data:{user:u}}=await supabase.auth.getUser();
   if(!u){router.replace('/konto');return;}
   setUser(u.id);
   const {data:e}=await supabase.from('ta_enrollments').select('id').eq('user_id',u.id).eq('course_slug',slug).eq('status','active').gt('expires_at',new Date().toISOString()).limit(1);
   if(!e?.length){setError('Nie masz aktywnego dostępu do tego kursu.');return;}
   const [{data:l,error:le},{data:d},{data:p}]=await Promise.all([
    supabase.from('ta_lessons').select('lesson_no,title_pl,material').eq('course_slug',slug).order('lesson_no'),
    supabase.from('ta_drafts').select('last_module,notes').eq('user_id',u.id).eq('course_slug',slug).maybeSingle(),
    supabase.from('ta_learning_progress').select('lesson_no').eq('user_id',u.id).eq('course_slug',slug)]);
   if(le)throw le;
   setItems(l||[]);setDone((p||[]).map(v=>v.lesson_no));
   if(d){setModule(d.last_module);setNotes(String(d.notes?.text||''));}
  }catch(e:any){setError(e.message||'Nie udało się pobrać materiałów.');}
  finally{setBusy(false);}
 })()},[slug]);
 async function save(mark=false){
  try{
   if(!user)return;
   const {error:e}=await supabase.from('ta_drafts').upsert({user_id:user,course_slug:slug,last_module:module,notes:{text:notes},updated_at:new Date().toISOString()},{onConflict:'user_id,course_slug'});
   if(e)throw e;
   if(mark){
    const {error:pe}=await supabase.from('ta_learning_progress').upsert({user_id:user,course_slug:slug,lesson_no:module},{onConflict:'user_id,course_slug,lesson_no'});
    if(pe)throw pe;
    setDone(prev=>Array.from(new Set([...prev,module])));
   }
   setMsg(mark?'Lekcja ukończona — zapisano postęp.':'Notatki zapisane.');
  }catch(e:any){setMsg(e.message||'Nie udało się zapisać.');}
 }
 const lesson=items.find(l=>l.lesson_no===module),progress=items.length?Math.round(done.length/items.length*100):0;
 return <ScrollView style={{backgroundColor:'#fbfcf7',flex:1}} contentContainerStyle={{padding:22,maxWidth:850,alignSelf:'center',width:'100%'}}>
  <Pressable onPress={()=>router.push('/moje-kursy')}><Text style={{color:'#376143',fontWeight:'800'}}>← Moje kursy</Text></Pressable>
  <Text style={{fontSize:31,fontWeight:'900',color:'#173d30',marginVertical:16}}>Moja nauka</Text>
  {busy&&<ActivityIndicator/>}{!!error&&<Text style={{color:'#a12626',marginBottom:15}}>{error}</Text>}
  {!!lesson&&<>
    <Text style={{color:'#53765b'}}>Lekcja {module+1} z {items.length} · Ukończono {done.length}/{items.length} ({progress}%)</Text>
    <View style={{height:8,backgroundColor:'#e1e9dc',borderRadius:10,overflow:'hidden',marginTop:12}}><View style={{height:8,width:progress+'%',backgroundColor:'#83b978'}}/></View>
    <Text style={{color:'#173d30',fontSize:26,fontWeight:'800',marginVertical:25}}>{lesson.title_pl}</Text>
    <View style={{backgroundColor:'white',borderRadius:18,padding:23,borderWidth:1,borderColor:'#dde9d7'}}>{(lesson.material?.raw||[]).map((line,i)=><Text key={i} style={{color:'#394d41',fontSize:16,lineHeight:26,marginBottom:15}}>{line}</Text>)}</View>
    <Text style={{marginTop:25,fontWeight:'800',color:'#173d30'}}>Twoje notatki</Text>
    <TextInput multiline placeholder="Zapisz swoje przemyślenia…" value={notes} onChangeText={setNotes} style={{backgroundColor:'white',borderColor:'#dde9d7',borderWidth:1,borderRadius:12,padding:15,minHeight:120,marginTop:8,textAlignVertical:'top'}}/>
    <View style={{flexDirection:'row',gap:10,flexWrap:'wrap',marginTop:15}}>
     <Pressable onPress={()=>save(false)} style={{padding:15,borderRadius:12,backgroundColor:'#e3ecd9'}}><Text style={{color:'#173d30',fontWeight:'800'}}>Zapisz notatki</Text></Pressable>
     <Pressable onPress={()=>save(true)} style={{padding:15,borderRadius:12,backgroundColor:'#173d30'}}><Text style={{color:'white',fontWeight:'800'}}>Oznacz jako ukończoną</Text></Pressable>
    </View>
    <View style={{flexDirection:'row',justifyContent:'space-between',marginVertical:24}}>
     <Pressable disabled={module===0} onPress={()=>{setModule(m=>m-1);setMsg('')}}><Text style={{fontWeight:'800',color:module===0?'#a0aba2':'#173d30'}}>← Poprzednia</Text></Pressable>
     <Pressable disabled={module>=items.length-1} onPress={()=>{setModule(m=>m+1);setMsg('')}}><Text style={{fontWeight:'800',color:module>=items.length-1?'#a0aba2':'#173d30'}}>Następna →</Text></Pressable>
    </View>
   </>}
  {!!msg&&<Text style={{color:'#35613c',marginBottom:20}}>{msg}</Text>}
 </ScrollView>;
}