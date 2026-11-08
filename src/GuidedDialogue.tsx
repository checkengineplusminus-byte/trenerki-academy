import React,{useEffect,useState} from 'react';
import {View,Text,TextInput,Pressable,ActivityIndicator} from 'react-native';
import {supabase} from './supabase';

type Line={role:'student'|'anielka';text:string;created_at?:string};
type Session={ok?:boolean;error?:string;history?:Line[];opening?:string;first_name?:string;reply?:string;cooldown_until?:string|null};
type Props={courseSlug:string;lessonNo:number};
const ink='#183d2c',muted='#4d6c56';
const humanError=(code:string)=>({
 previous_lessons_required:'Wróć do bieżącego etapu kursu.',
 course_not_owned:'Nie masz aktywnego dostępu do tej lekcji.',
 daily_limit:'Dziś wykorzystano limit wiadomości. Nadal możesz kontynuować naukę.',
 cooldown_active:'Zróbmy krótką przerwę od rozmowy. Nadal możesz wykonywać ćwiczenia.',
 message_too_short:'Napisz nieco więcej, żebym mogła Ci pomóc.',
 dialogue_conflict_retry:'Rozmowa zmieniła się w innym oknie. Otwórz ją ponownie.',
 retry_request:'Spróbuj wysłać wiadomość jeszcze raz.',
 ai_unavailable:'Teraz nie udało się odpowiedzieć. Możesz uczyć się dalej.',
 dialogue_unavailable:'Historia rozmowy jest chwilowo niedostępna.',
} as Record<string,string>)[code]||'Nie udało się pobrać odpowiedzi. Spróbuj ponownie, a nauka pozostaje dostępna.';

export default function GuidedDialogue({courseSlug,lessonNo}:Props){
 const [open,setOpen]=useState(false),[loading,setLoading]=useState(false),[sending,setSending]=useState(false);
 const [history,setHistory]=useState<Line[]>([]),[opening,setOpening]=useState(''),[input,setInput]=useState('');
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[cooldown,setCooldown]=useState<string|null>(null);
 const call=async(action:'status'|'dialogue',message?:string):Promise<Session>=>{
  const {data,error:invokeError}=await supabase.functions.invoke<Session>('ta-lesson-guide',{
   body:{action,course_slug:courseSlug,lesson_no:lessonNo,...(message?{message}:{})}
  });
  if(invokeError||data?.error||!data)throw new Error(humanError(String(data?.error||'connection_error')));
  return data;
 };
 function apply(data:Session){
  if(data.history)setHistory(data.history);
  if(data.opening)setOpening(data.opening);
  if(data.cooldown_until!==undefined)setCooldown(data.cooldown_until);
 }
 async function refresh(){
  setLoading(true);setError('');
  try{apply(await call('status'))}
  catch(e:any){setError(e?.message||'Nie udało się załadować rozmowy.')}
  finally{setLoading(false)}
 }
 useEffect(()=>{setOpen(false);setInput('');setHistory([]);setError('');setNotice('');setOpening('');setCooldown(null)},[courseSlug,lessonNo]);
 function toggle(){if(!open){void refresh()}setOpen(v=>!v)}
 async function send(){
  if(sending||input.trim().length<3)return;
  setSending(true);setNotice('');setError('');
  try{
   const data=await call('dialogue',input.trim());
   apply(data);setInput('');
   if(data.cooldown_until)setNotice('Zróbmy przerwę w rozmowie. Wróć, gdy będziesz gotowy. Pozostałe ćwiczenia są nadal dostępne.');
  }catch(e:any){setError(e?.message||'Nie udało się wysłać wiadomości.')}
  finally{setSending(false)}
 }
 const stalled=!!cooldown&&new Date(cooldown).getTime()>Date.now();
 return <View style={{borderColor:'#c9ddc5',borderWidth:1,backgroundColor:'#e9f4e6',borderRadius:16,marginTop:20,overflow:'hidden'}}>
  <Pressable accessibilityRole="button" accessibilityState={{expanded:open}} onPress={toggle} style={{padding:17,flexDirection:'row',justifyContent:'space-between',gap:10,alignItems:'center'}}>
   <View style={{flex:1,gap:5}}>
    <Text style={{color:'#407851',fontSize:11,fontWeight:'900'}}>ANIELKA · TWOJA POMOC W NAUCE</Text>
    <Text style={{color:ink,fontWeight:'900',fontSize:19}}>Masz pytanie? Porozmawiajmy.</Text>
   </View>
   <Text style={{fontWeight:'900',color:ink}}>{open?'Zwiń ↑':'Otwórz ↓'}</Text>
  </Pressable>
  {open&&<View style={{paddingHorizontal:16,paddingBottom:18,gap:11}}>
   {loading&&<ActivityIndicator color={ink}/>}
   {!loading&&!history.length&&!!opening&&<View style={{alignSelf:'flex-start',backgroundColor:'white',padding:15,borderRadius:12,maxWidth:'94%'}}>
    <Text style={{color:'#36734d',fontWeight:'900',fontSize:12,marginBottom:5}}>Anielka</Text>
    <Text style={{color:ink,lineHeight:23,fontSize:15}}>{opening}</Text>
   </View>}
   {history.map((m,i)=><View key={i} style={{alignSelf:m.role==='student'?'flex-end':'flex-start',backgroundColor:m.role==='student'?'#cce5c7':'white',padding:14,borderRadius:12,maxWidth:'94%',gap:5}}>
    <Text style={{color:'#36734d',fontWeight:'900',fontSize:12}}>{m.role==='student'?'Ty':'Anielka'}</Text>
    <Text style={{color:ink,fontSize:15,lineHeight:23}}>{m.text}</Text>
   </View>)}
   {!loading&&!stalled&&<>
    <TextInput multiline value={input} onChangeText={setInput} maxLength={1000} placeholder="Napisz, co chcesz wyjaśnić lub przećwiczyć…" textAlignVertical="top"
     style={{backgroundColor:'white',borderColor:'#bdd6b9',borderWidth:1,borderRadius:11,minHeight:95,padding:14,color:ink,fontSize:15}}/>
    <Pressable onPress={send} disabled={sending||input.trim().length<3}
     style={{backgroundColor:ink,padding:15,borderRadius:11,opacity:sending||input.trim().length<3?.5:1}}>
     <Text style={{textAlign:'center',fontWeight:'900',color:'white'}}>{sending?'Anielka odpowiada…':'Wyślij wiadomość'}</Text>
    </Pressable>
   </>}
   {!!notice&&<Text style={{color:muted,lineHeight:21}}>{notice}</Text>}
   {!!error&&<View style={{backgroundColor:'white',padding:12,borderRadius:10,gap:8}}>
    <Text style={{color:'#985b39',lineHeight:21}}>{error}</Text>
    <Pressable onPress={()=>void refresh()}><Text style={{fontWeight:'900',color:ink}}>Odśwież rozmowę</Text></Pressable>
   </View>}
   <Text style={{color:muted,fontSize:12,lineHeight:19}}>Nie podawaj haseł ani cudzych danych osobowych. Rozmowa jest dodatkową pomocą — możesz uczyć się bez niej.</Text>
  </View>}
 </View>;
}
