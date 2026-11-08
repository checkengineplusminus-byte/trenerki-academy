import React,{useEffect,useState} from 'react';
import {View,Text,TextInput,Pressable,ActivityIndicator} from 'react-native';
import {supabase} from './supabase';
type Api={ok?:boolean;available?:boolean;answer?:string;error?:string;remaining_today?:number};
const color='#17392a';
export default function AiTutor({courseSlug,lessonNo}:{courseSlug:string;lessonNo:number}){
 const [available,setAvailable]=useState(false),[consent,setConsent]=useState(false);
 const [question,setQuestion]=useState(''),[answer,setAnswer]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[remain,setRemain]=useState<number|null>(null);
 useEffect(()=>{let active=true;setAnswer('');setQuestion('');setError('');setConsent(false);
  (async()=>{
   try{
    const {data,error:e}=await supabase.functions.invoke<Api>('ta-tutor',{body:{action:'status'}});
    if(active)setAvailable(!e&&!!data?.available);
   }catch{if(active)setAvailable(false);}
  })();return()=>{active=false};
 },[courseSlug,lessonNo]);
 if(!available)return null;
 async function ask(){
  if(busy||!consent||question.trim().length<4)return;
  setBusy(true);setError('');setAnswer('');
  try{
   const {data,error:apiError}=await supabase.functions.invoke<Api>('ta-tutor',{
    body:{action:'ask',course_slug:courseSlug,lesson_no:lessonNo,question:question.trim().slice(0,700)}
   });
   if(apiError||data?.error||!data?.answer){
    const code=String(data?.error||'');
    throw new Error(code==='daily_limit'?'Dzienny limit pytań został osiągnięty. Wróć jutro.':
     code==='course_not_owned'?'Brak aktywnego dostępu do kursu.':
     'Nie udało się teraz uzyskać odpowiedzi. Spróbuj później.');
   }
   setAnswer(data.answer);setRemain(data.remaining_today??null);
  }catch(e:any){setError(e?.message||'Asystent jest chwilowo niedostępny.');}
  finally{setBusy(false);}
 }
 return <View style={{marginTop:25,backgroundColor:'#e9f3e3',borderRadius:18,padding:19,gap:12}}>
  <Text style={{color:color,fontWeight:'900',fontSize:21}}>Zapytaj Anielkę — asystent nauki</Text>
  <Text style={{color:'#577260',lineHeight:22,fontSize:14}}>Nie rozumiesz fragmentu lekcji? Zadaj pytanie o konkretną sytuację. Otrzymasz wyjaśnienie i przykład dopasowany do aktualnego tematu.</Text>
  <TextInput multiline maxLength={700} value={question} onChangeText={setQuestion} placeholder="Np. Jak powiedzieć koledze, że nie rozumiem polecenia?" style={{minHeight:94,backgroundColor:'white',borderRadius:12,borderColor:'#c9d9c4',borderWidth:1,padding:14,color:color,textAlignVertical:'top'}}/>
  <Pressable onPress={()=>setConsent(v=>!v)} accessibilityRole="checkbox" accessibilityState={{checked:consent}} style={{flexDirection:'row',alignItems:'flex-start',gap:10}}>
   <View style={{width:22,height:22,borderWidth:1,borderColor:'#7f9c7d',borderRadius:5,backgroundColor:consent?'#b1dda1':'white',alignItems:'center',justifyContent:'center'}}><Text style={{fontWeight:'900',color:color}}>{consent?'✓':''}</Text></View>
   <Text style={{flex:1,color:'#58705d',fontSize:12,lineHeight:19}}>Zgadzam się przesłać treść mojego pytania do dostawcy modelu AI w celu udzielenia odpowiedzi. Nie wpisuję haseł, adresów, danych zdrowotnych ani informacji o innych osobach.</Text>
  </Pressable>
  <Pressable disabled={!consent||busy||question.trim().length<4} onPress={ask} style={{padding:15,borderRadius:11,backgroundColor:color,opacity:!consent||busy||question.trim().length<4?0.45:1}}>
   <Text style={{fontWeight:'900',color:'white',textAlign:'center'}}>{busy?'Szukam dobrego wyjaśnienia…':'Wyjaśnij mi ten temat'}</Text>
  </Pressable>
  {busy&&<ActivityIndicator/>}
  {!!answer&&<View style={{backgroundColor:'white',borderRadius:12,padding:16,gap:7}}>
   <Text style={{fontWeight:'900',fontSize:13,color:'#4e7c4a'}}>ODPOWIEDŹ ANIELKI</Text>
   <Text style={{color:color,fontSize:15,lineHeight:25}}>{answer}</Text>
   {remain!==null&&<Text style={{fontSize:11,color:'#738477'}}>Pozostało pytań dzisiaj: {remain}</Text>}
  </View>}
  {!!error&&<Text style={{color:'#a24836',fontSize:13,lineHeight:21}}>{error}</Text>}
  <Text style={{fontSize:11,color:'#708075',lineHeight:18}}>Odpowiedź AI służy nauce i może zawierać pomyłki. W sprawach bezpieczeństwa pracy, zdrowia i prawa zawsze stosuj odpowiednie procedury.</Text>
 </View>;
}
