import React,{useEffect,useState} from 'react';
import {View,Text,TextInput,Pressable,ActivityIndicator} from 'react-native';
import {supabase} from './supabase';

type Line={role:'student'|'anielka';text:string;created_at?:string};
type ServerState={
 ok?:boolean;ready?:boolean;already_completed?:boolean;available?:boolean;
 first_name?:string;opening?:string;reply?:string;count?:number;turns?:number;agent_online?:boolean;
 history?:Line[];cooldown_until?:string|null;error?:string;
};
type Props={courseSlug:string;lessonNo:number;onReady:(ready:boolean)=>void};
const ink='#173b2d',muted='#55705d',green='#e8f4e4';
const msg=(code:string)=>({
 previous_lessons_required:'Najpierw ukończ wcześniejsze lekcje. Anielka poprowadzi Cię po kolei.',
 course_not_owned:'Nie masz teraz aktywnego dostępu do tego kursu.',
 ai_not_configured:'Anielka nie jest jeszcze połączona z modelem AI. Nie można zaliczyć etapu bez prawdziwej rozmowy.',
 ai_unavailable:'Anielka nie mogła teraz odpowiedzieć. Twoje wcześniejsze rozmowy są bezpieczne — spróbuj ponownie.',
 dialogue_conflict_retry:'Rozmowa została zaktualizowana w innym oknie. Odświeżymy ją przed kolejną wiadomością.',
 quota_unavailable:'System chwilowo nie może sprawdzić limitu wiadomości.',
 daily_limit:'Osiągnięto dzienny limit rozmów. Dotychczasowy postęp pozostaje zapisany.',
 message_too_short:'Napisz choć kilka słów. Możesz też powiedzieć, czego nie rozumiesz.',
 cooldown_active:'Potrzebna jest przerwa w rozmowie. Wróć później i rozpocznij ten etap jeszcze raz.'
} as Record<string,string>)[code]||'Nie udało się połączyć z Anielką. Spróbuj odświeżyć rozmowę.';
export default function GuidedDialogue({courseSlug,lessonNo,onReady}:Props){
 const [loading,setLoading]=useState(true),[sending,setSending]=useState(false);
 const [history,setHistory]=useState<Line[]>([]),[ready,setReady]=useState(false);
 const [opening,setOpening]=useState(''),[firstName,setFirstName]=useState('');
 const [available,setAvailable]=useState(true),[agentOnline,setAgentOnline]=useState(false),[count,setCount]=useState(0);
 const [cooldown,setCooldown]=useState<string|null>(null);
 const [consent,setConsent]=useState(false),[input,setInput]=useState('');
 const [error,setError]=useState(''),[notice,setNotice]=useState('');
 const call=async(action:'status'|'dialogue',message?:string):Promise<ServerState>=>{
  const {data,error:invokeError}=await supabase.functions.invoke<ServerState>('ta-lesson-guide',{
   body:{action,course_slug:courseSlug,lesson_no:lessonNo,...(message?{message}:{})}
  });
  if(invokeError||data?.error||!data)throw new Error(msg(String(data?.error||'connection_error')));
  return data;
 };
 const apply=(data:ServerState)=>{
  const ok=!!data.ready;setReady(ok);onReady(ok);
  if(data.history)setHistory(data.history);
  if(data.opening)setOpening(data.opening);
  if(data.first_name)setFirstName(data.first_name);
  if(data.count!==undefined)setCount(data.count);
  if(data.available!==undefined)setAvailable(data.available);
  if(data.agent_online!==undefined)setAgentOnline(data.agent_online);
  setCooldown(data.cooldown_until||null);
 };
 async function refresh(){
  setLoading(true);setError('');
  try{apply(await call('status'))}
  catch(e:any){onReady(false);setError(e.message||'Nie udało się otworzyć rozmowy.')}
  finally{setLoading(false)}
 }
 useEffect(()=>{setHistory([]);setInput('');setReady(false);setNotice('');onReady(false);setConsent(false);void refresh()},[courseSlug,lessonNo]);
 async function send(){
  if(sending||ready||!consent||input.trim().length<5)return;
  setSending(true);setError('');setNotice('');
  const outgoing=input.trim();
  try{
   const data=await call('dialogue',outgoing);
   apply(data);setInput('');
   if(data.ready)setNotice((firstName||'')+', możesz przejść do następnego etapu po poprawnym wykonaniu pozostałych ćwiczeń z lekcji.');
   if(data.cooldown_until)setNotice('Przerwa w rozmowie została włączona po poważnym, powtarzającym się naruszeniu granic. Nie usunięto Twoich wcześniej zaliczonych lekcji.');
  }catch(e:any){setError(e.message||'Wiadomość nie została wysłana.')}
  finally{setSending(false)}
 }
 const stalled=!!cooldown&&new Date(cooldown).getTime()>Date.now();
 return <View style={{marginTop:23,borderRadius:19,padding:19,backgroundColor:green,borderWidth:1,borderColor:'#cde3c9',gap:13}}>
  <Text style={{color:'#55755a',fontWeight:'900',fontSize:12}}>ANIELKA · {agentOnline?'OSOBISTY AGENT AI':'INTERAKTYWNY PRZEWODNIK EDUKACYJNY'}</Text>
  <Text style={{color:ink,fontWeight:'900',fontSize:22}}>Porozmawiajmy o tym, czego się uczysz</Text>
  <Text style={{color:muted,lineHeight:22,fontSize:14}}>{agentOnline?
    'Agent AI pamięta, w których tematach miałeś trudności, i odpowie na Twoje własne pytania. Po dwóch wartościowych wypowiedziach oraz ćwiczeniach odblokuje następny etap. Nie karze za pomyłki.':
    'Gdy model AI jest niedostępny, możesz nadal uczyć się z własnego materiału i prowadzić rozmowę z przewodnikiem. W tym trybie odpowiedzi są generowane z treści lekcji według prostych reguł, a zaliczenie sprawdza także osobny quiz. To nie jest ocena AI.'}</Text>
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
   <Text style={{color:ink,fontWeight:'900'}}>Zrozumienie tematu</Text>
   <Text style={{color:ink,fontWeight:'900'}}>{Math.min(count,2)}/2</Text>
  </View>
  <View style={{height:7,backgroundColor:'#c9ddc5',borderRadius:5,overflow:'hidden'}}>
   <View style={{height:7,width:Math.min(100,(count/2)*100)+'%',backgroundColor:'#6caa7a'}}/>
  </View>
  {loading&&<ActivityIndicator color={ink}/>}
  {!loading&&!available&&!ready&&<Text style={{padding:14,backgroundColor:'#fff1e2',borderRadius:10,color:'#935c31',lineHeight:21}}>Anielka wymaga aktywnego połączenia AI. Zapisana nauka nie zniknęła, ale ukończenie nowej lekcji jest niedostępne do czasu przywrócenia rozmowy.</Text>}
  {!loading&&<View style={{gap:10}}>
   {!history.length&&!!opening&&<View style={{alignSelf:'flex-start',maxWidth:'93%',backgroundColor:'white',borderRadius:13,padding:15,gap:5,borderWidth:1,borderColor:'#d8e8d3'}}>
    <Text style={{fontWeight:'900',fontSize:12,color:'#3d7955'}}>Anielka</Text>
    <Text style={{color:ink,lineHeight:24,fontSize:15}}>{opening}</Text>
   </View>}
   {history.map((line,i)=><View key={i} style={{alignSelf:line.role==='student'?'flex-end':'flex-start',maxWidth:'93%',backgroundColor:line.role==='student'?'#d0e6c8':'white',borderRadius:13,padding:15,gap:6,borderWidth:1,borderColor:'#d8e8d3'}}>
    <Text style={{color:line.role==='student'?'#3a6650':'#3d7955',fontWeight:'900',fontSize:12}}>{line.role==='student'?'Ty':'Anielka'}</Text>
    <Text style={{color:ink,fontSize:15,lineHeight:24}}>{line.text}</Text>
   </View>)}
  </View>}
  {ready?<View style={{padding:14,backgroundColor:'#d9efd2',borderRadius:12}}>
   <Text style={{color:ink,lineHeight:23,fontWeight:'800'}}>Dobra robota{firstName?', '+firstName:''}! Anielka potwierdziła zrozumienie tej lekcji. Po wykonaniu ćwiczeń przejdziesz do następnego etapu.</Text>
  </View>:
   !loading&&available&&!stalled&&<View style={{gap:12}}>
    <TextInput multiline maxLength={1000} value={input} onChangeText={setInput} textAlignVertical="top"
     placeholder="Napisz Anielce własną odpowiedź, przykład lub pytanie…"
     style={{backgroundColor:'white',padding:15,minHeight:112,borderWidth:1,borderColor:'#c5dcc2',borderRadius:13,color:ink,fontSize:15}}/>
    <Pressable onPress={()=>setConsent(v=>!v)} accessibilityRole="checkbox" accessibilityState={{checked:consent}} style={{flexDirection:'row',gap:8,alignItems:'flex-start'}}>
     <Text style={{fontSize:20,color:ink}}>{consent?'☑':'☐'}</Text>
     <Text style={{flex:1,fontSize:12,color:'#4f6b55',lineHeight:19}}>Rozumiem, że moja wypowiedź zostanie przesłana do dostawcy AI do indywidualnej odpowiedzi i oceny etapu. Nie wpisuję haseł ani prywatnych danych innych osób.</Text>
    </Pressable>
    <Pressable accessibilityRole="button" onPress={send} disabled={sending||!consent||input.trim().length<5}
     style={{padding:16,backgroundColor:ink,borderRadius:12,opacity:sending||!consent||input.trim().length<5?.45:1}}>
     <Text style={{color:'white',fontWeight:'900',textAlign:'center'}}>{sending?'Anielka czyta i odpowiada…':'Wyślij odpowiedź Anielce'}</Text>
    </Pressable>
   </View>}
  {stalled&&<Text style={{color:'#8d4d39',backgroundColor:'#fff0e8',padding:13,borderRadius:11,lineHeight:21}}>Po poważnym, powtarzającym się obraźliwym zachowaniu rozmowa została wstrzymana. Wróć później i rozpocznij tę lekcję od nowa. Wcześniej ukończone etapy nie są usuwane.</Text>}
  {!!notice&&<Text style={{fontWeight:'800',color:'#355e3e',lineHeight:22}}>{notice}</Text>}
  {!!error&&<View style={{padding:13,backgroundColor:'#fff4e9',borderRadius:12,gap:8}}>
   <Text style={{color:'#9c5632',lineHeight:21}}>{error}</Text>
   <Pressable accessibilityRole="button" onPress={()=>void refresh()}><Text style={{color:ink,fontWeight:'900'}}>Odśwież rozmowę</Text></Pressable>
  </View>}
 </View>;
}
