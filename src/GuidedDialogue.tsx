import React,{useEffect,useState} from 'react';
import {View,Text,TextInput,Pressable,ActivityIndicator} from 'react-native';
import {supabase} from './supabase';
import {categoryLabel,routeSupport,type SupportResult} from './support/routing';
import {HelpLink} from './support/links';

type Line={role:'student'|'anielka';text:string;created_at?:string};
type Session={support?:SupportResult;ok?:boolean;error?:string;history?:Line[];opening?:string;reply?:string;cooldown_until?:string|null;can_reply?:boolean};
type Props={courseSlug:string;lessonNo:number;canMoveOn?:boolean;onFinish?:()=>void};
const ink='#183c2b', muted='#58705f';
const names:Record<string,string>={
 previous_lessons_required:'Najpierw ukończ wcześniejszą lekcję.',
 course_not_owned:'Ta lekcja nie jest jeszcze dostępna.',
 daily_limit:'Na dziś wykorzystano limit rozmowy. Możesz kontynuować kurs.',
 cooldown_active:'Wróć do rozmowy później; ćwiczenia są nadal dostępne.',
 message_too_short:'Napisz trochę więcej, bym mogła pomóc.',
 dialogue_conflict_retry:'Rozmowa zmieniła się w innym oknie. Spróbuj ponownie.',
 retry_request:'Nie udało się wysłać pytania. Spróbuj ponownie.',
 no_payment_details:'Nie wpisuj numerów kart ani innych danych płatniczych.',
};
export default function GuidedDialogue({courseSlug,lessonNo}:Props){
 const [history,setHistory]=useState<Line[]>([]),[opening,setOpening]=useState(''),[input,setInput]=useState('');
 const [support,setSupport]=useState<SupportResult|null>(null);
 const [loading,setLoading]=useState(true),[sending,setSending]=useState(false),[canReply,setCanReply]=useState(true);
 const [error,setError]=useState(''),[showOlder,setShowOlder]=useState(false),[cooldown,setCooldown]=useState<string|null>(null);
 const request=async(action:'status'|'dialogue',message?:string)=>{
  const {data,error:e}=await supabase.functions.invoke<Session>('ta-lesson-guide',{
   body:{action,course_slug:courseSlug,lesson_no:lessonNo,...(message?{message}:{})}
  });
  if(e||!data||data.error)throw new Error(names[data?.error||'']||'Nie udało się połączyć z Anielką. Spróbuj ponownie.');
  return data;
 };
 const apply=(data:Session)=>{
  if(data.history)setHistory(data.history);
  if(data.opening)setOpening(data.opening);
  if(data.cooldown_until!==undefined)setCooldown(data.cooldown_until);
  if(data.can_reply!==undefined)setCanReply(data.can_reply);
 };
 useEffect(()=>{
  let active=true;
  setHistory([]);setInput('');setSupport(null);setOpening('');setError('');setShowOlder(false);
  setCooldown(null);setCanReply(true);setLoading(true);
  void request('status').then(d=>{if(active)apply(d)})
   .catch(e=>{if(active)setError(String(e?.message||'Połączenie chwilowo niedostępne.'))})
   .finally(()=>{if(active)setLoading(false)});
  return ()=>{active=false};
 },[courseSlug,lessonNo]);
 async function send(){
  const message=input.trim();
  if(sending||message.length<2)return;
  const help=routeSupport(message,support);
  if(help){setSupport(help);setInput('');setError('');return;}
  if(!canReply||message.length<5)return;
  setSending(true);setError('');
  try{const data=await request('dialogue',message);if(data.support)setSupport(data.support);else apply(data);setInput('')}
  catch(e:any){setError(e?.message||'Nie udało się wysłać pytania.')}
  finally{setSending(false)}
 }
 const paused=!!cooldown&&new Date(cooldown).getTime()>Date.now(),allowed=!paused&&canReply;
 const visible=showOlder?history:history.slice(-4);
 return <View style={{backgroundColor:'#edf6e8',borderRadius:15,borderWidth:1,borderColor:'#d4e3d0',padding:15,gap:11,marginTop:16}}>
  <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
   <View style={{width:38,height:38,borderRadius:19,backgroundColor:'#d4ebcd',alignItems:'center',justifyContent:'center'}}>
    <Text style={{fontSize:20}}>💬</Text>
   </View>
   <View style={{flex:1}}>
    <Text style={{color:ink,fontWeight:'900',fontSize:17}}>Anielka wyjaśni Ci to prościej</Text>
    <Text style={{color:muted,fontSize:12}}>Nie rozumiesz? Zapytaj własnymi słowami.</Text>
   </View>
  </View>
  {loading&&<ActivityIndicator color={ink}/>}
  {!loading&&!history.length&&!!opening&&<Text style={{fontSize:14,color:ink,lineHeight:22,backgroundColor:'white',padding:12,borderRadius:10}}>{opening}</Text>}
  {history.length>4&&!showOlder&&<Pressable onPress={()=>setShowOlder(true)} accessibilityRole="button" style={{padding:5}}>
   <Text style={{color:'#386c48',fontWeight:'800',textAlign:'center'}}>Pokaż wcześniejszą rozmowę</Text>
  </Pressable>}
  {showOlder&&history.length>4&&<Pressable onPress={()=>setShowOlder(false)} accessibilityRole="button">
   <Text style={{color:'#386c48',fontWeight:'800',textAlign:'center'}}>Zwiń starsze wiadomości</Text>
  </Pressable>}
  {visible.map((m,i)=><View key={i} style={{alignSelf:m.role==='student'?'flex-end':'flex-start',backgroundColor:m.role==='student'?'#d8edd4':'white',borderRadius:12,padding:12,maxWidth:'97%',gap:4}}>
   <Text style={{color:'#3c7652',fontSize:11,fontWeight:'900'}}>{m.role==='student'?'Ty':'Anielka'}</Text>
   <Text style={{color:ink,fontSize:14,lineHeight:23}}>{m.text}</Text>
  </View>)}
  {!!support&&<View accessibilityLiveRegion="polite" style={{gap:7,backgroundColor:'white',borderRadius:9,padding:12}}>
   <Text style={{color:ink,lineHeight:22}}>{support.text}</Text>
   {(support.urgent||support.atRisk)&&<HelpLink href="tel:112">Zadzwoń pod 112 w nagłym zagrożeniu</HelpLink>}
   {support.categories.map(id=><HelpLink key={id} href={'/pomoc#'+id}>{categoryLabel(id)}</HelpLink>)}
   <HelpLink>Wszystkie bezpłatne kontakty</HelpLink>
  </View>}
  {allowed&&<View style={{gap:8}}>
   <TextInput value={input} onChangeText={setInput} multiline maxLength={1000} placeholder="Np. Nie rozumiem, skąd ta kwota. Wyjaśnij na liczbach."
    placeholderTextColor="#728576" textAlignVertical="top" accessibilityLabel="Twoje pytanie do Anielki"
    style={{backgroundColor:'white',borderColor:'#c4d7c2',borderWidth:1,borderRadius:11,minHeight:74,padding:13,color:ink,fontSize:16}}/>
   <Pressable accessibilityRole="button" onPress={()=>void send()} disabled={sending||input.trim().length<5}
    style={{backgroundColor:ink,borderRadius:11,padding:15,opacity:sending||input.trim().length<5?.5:1}}>
    <Text style={{color:'white',textAlign:'center',fontWeight:'900',fontSize:15}}>{sending?'Odpowiadam…':'Zapytaj Anielkę →'}</Text>
   </Pressable>
  </View>}
  {!allowed&&<Text style={{color:muted,lineHeight:21}}>Możesz teraz przejść dalej z kursem. Do rozmowy wrócisz później.</Text>}
  {!!error&&<Text style={{color:'#a25132',fontSize:13,lineHeight:20}}>{error}</Text>}
 </View>;
}
