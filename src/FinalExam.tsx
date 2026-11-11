import React,{useEffect,useState} from 'react';
import {View,Text,TextInput,Pressable,ActivityIndicator,Linking} from 'react-native';
import {useRouter} from 'expo-router';
import {supabase} from './supabase';

type Cert={id:string;certificate_no:string;holder_name:string;title_pl:string;issued_at:string;is_demo:boolean};
type History={question:string;answer:string;correct:boolean;feedback:string};
type Session={id?:string;phase?:string;step:number;correct:number;wrong:number;question:string;history:History[];holder_name:string;is_demo:boolean;grading_mode?:'oral'|'choice';options?:string[]};
type Api={ok?:boolean;state?:'ready'|'not_ready'|'in_progress'|'passed'|'failed';available?:boolean;
 completed?:number;total?:number;session?:Session|null;certificate?:Cert;
 session_id?:string;step?:number;question?:string;phase?:string;correct?:number;wrong?:number;feedback?:string;
 answer_correct?:boolean;announcement?:string;message?:string;error?:string;grading_mode?:'oral'|'choice';options?:string[];fallback_available?:boolean};
const ink='#173e2d';
const mapError=(code:string)=>({
 course_not_owned:'Nie masz aktualnego dostępu do tego kursu.',
 lessons_incomplete:'Ukończ wymagane lekcje przed egzaminem.',
 ai_not_configured:'Egzamin jest chwilowo niedostępny. Spróbuj ponownie.',
 grader_unavailable:'Nie udało się bezpiecznie ocenić odpowiedzi. Nie zaliczono jej ani nie odjęto próby. Spróbuj ponownie.',
 answer_too_short:'Odpowiedz własnymi zdaniami, opisując działanie i kontrolę wyniku (minimum 20 znaków).',
 invalid_holder_name:'Wpisz prawdziwe imię i nazwisko, które powinno widnieć na dyplomie.',
 exam_daily_limit:'Osiągnięto limit trzech pełnych prób dziennie. Wróć do materiałów i spróbuj później.',
 exam_answer_already_submitted:'Ta odpowiedź została już przetworzona. Odświeżam postęp egzaminu.',
 question_bank_incomplete:'Ten kurs wymaga jeszcze uzupełnienia pytań egzaminacyjnych.',
 certificate_issue_failed:'Egzamin zapisano. Spróbuj odświeżyć stan — serwer ponowi wystawienie dyplomu bez nowego podejścia.',
 invalid_choice:'Wybierz odpowiedź w zadaniu, zanim ją potwierdzisz.',
 exam_switch_failed:'Nie można teraz zmienić trybu egzaminu. Odśwież stronę.'
} as Record<string,string>)[code]||'Nie udało się teraz wykonać operacji egzaminacyjnej. Spróbuj ponownie.';
export default function FinalExam({courseSlug}:{courseSlug:string}){
 const router=useRouter();
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[state,setState]=useState('ready');
 const [attempt,setAttempt]=useState<{id:string;step:number}|null>(null);
 const [available,setAvailable]=useState(false),[name,setName]=useState('');
 const [answer,setAnswer]=useState(''),[question,setQuestion]=useState(''),[phase,setPhase]=useState('practice');
 const [correct,setCorrect]=useState(0),[wrong,setWrong]=useState(0),[history,setHistory]=useState<History[]>([]);
 const [message,setMessage]=useState(''),[error,setError]=useState(''),[cert,setCert]=useState<Cert|null>(null);
 const [gradingMode,setGradingMode]=useState<'oral'|'choice'>('oral'),[options,setOptions]=useState<string[]>([]),[selectedOption,setSelectedOption]=useState<number|null>(null);
 const call=async(action:'status'|'start'|'answer'|'switch_mode',fields:Record<string,unknown>={})=>{
  const {data,error:e}=await supabase.functions.invoke<Api>('ta-exam',{body:{action,course_slug:courseSlug,...fields}});
  if(e||!data){
   let code=data?.error;
   if(!code&&typeof e?.context?.json==='function'){
    try{code=(await e.context.json()).error;}catch{}
   }
   throw new Error(mapError(code||'unavailable'));
  }
  if(data.error)throw new Error(mapError(data.error));
  return data;
 };
 const apply=(r:Api)=>{
  if(r.state)setState(r.state);
  if(r.available!==undefined)setAvailable(r.available);
  if(r.certificate)setCert(r.certificate);
  if(r.session){
   const s=r.session;if(s.id)setAttempt({id:s.id,step:s.step});setQuestion(s.question);setPhase(s.phase||'practice');setCorrect(s.correct);
   setWrong(s.wrong);setHistory(s.history||[]);setName(s.holder_name||'');
   setGradingMode(s.grading_mode||'oral');setOptions(s.options||[]);setSelectedOption(null);
  }else if(r.question){
   if(r.session_id&&r.step!==undefined)setAttempt({id:r.session_id,step:r.step});
   setQuestion(r.question);setPhase(r.phase||'practice');setCorrect(r.correct||0);setWrong(r.wrong||0);
   setGradingMode(r.grading_mode||'oral');setOptions(r.options||[]);setSelectedOption(null);
  }
  if(r.announcement)setMessage(r.announcement);
  else if(r.message)setMessage(r.message);
  else if(r.feedback)setMessage((r.answer_correct?'Dobrze! ':'To jeszcze nie jest prawidłowe rozwiązanie. ')+r.feedback);
 };
 async function refresh(){
  setLoading(true);setError('');
  try{
   const {data:{user}}=await supabase.auth.getUser();
   const full=typeof user?.user_metadata?.full_name==='string'?user.user_metadata.full_name:'';
   if(full)setName(full);
   const result=await call('status');apply(result);
  }catch(e:any){setError(e.message||'Egzamin chwilowo niedostępny.');}
  finally{setLoading(false);}
 }
 useEffect(()=>{void refresh();},[courseSlug]);
 async function start(){
  if(busy||name.trim().length<3)return;
  setBusy(true);setError('');setMessage('');
  try{const r=await call('start',{holder_name:name.trim()});apply(r);}
  catch(e:any){setError(e.message||'Nie udało się rozpocząć egzaminu.');}
  finally{setBusy(false);}
 }
 async function send(){
  if(busy||(gradingMode==='choice'?selectedOption===null:answer.trim().length<20))return;
  setBusy(true);setError('');setMessage('');
  const sent=gradingMode==='choice'?(options[selectedOption??0]||''):answer.trim();
  try{
   const fields=gradingMode==='choice'?{selected_index:selectedOption}:{answer:sent};
   const r=await call('answer',{...fields,...(attempt?{session_id:attempt.id,step:attempt.step}:{})});
   setHistory(old=>[...old,{question,answer:sent,correct:!!r.answer_correct,feedback:r.feedback||''}]);
   setAnswer('');setSelectedOption(null);apply(r);
  }catch(e:any){setError(e.message||'Odpowiedź nie została oceniona.');}
  finally{setBusy(false);}
 }
 async function switchMode(){
  if(busy)return;
  setBusy(true);setError('');
  try{const r=await call('switch_mode');apply(r);setMessage('Teraz odpowiadasz na pytania wyboru, oceniane bezpośrednio na serwerze. Twoje wcześniejsze poprawne odpowiedzi zachowano.');}
  catch(e:any){setError(e.message||'Nie udało się zmienić sposobu oceniania.');}
  finally{setBusy(false);}
 }
 const button=(label:string,onPress:()=>void,disabled=false)=><Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={{padding:15,backgroundColor:ink,borderRadius:11,opacity:disabled?.45:1}}>
  <Text style={{color:'white',textAlign:'center',fontWeight:'900'}}>{label}</Text>
 </Pressable>;
 return <View style={{marginTop:25,padding:20,backgroundColor:'#e7f2e1',borderRadius:19,borderWidth:1,borderColor:'#cde5c6',gap:13}}>
  <Text style={{color:'#668466',fontSize:12,fontWeight:'900'}}>ETAP KOŃCOWY · OSOBNY OD POSTĘPU LEKCJI</Text>
  <Text style={{color:ink,fontWeight:'900',fontSize:24}}>Egzamin z Anielką</Text>
  <Text style={{color:'#516e58',lineHeight:23}}>Sprawdzimy, czego nauczyłeś się podczas kursu. Po pięciu prawidłowych odpowiedziach otrzymasz pytanie finałowe. Jeżeli się pomylisz, dostaniesz jeszcze jedną szansę. Po zaliczeniu otrzymasz autorski dyplom z imieniem, nazwiskiem i datą ukończenia.</Text>
  {loading&&<ActivityIndicator color={ink}/>}
  {!loading&&state==='ready'&&<View style={{gap:12}}>
   {!available?<Text style={{color:'#8b5941',lineHeight:22}}>Egzamin jest chwilowo niedostępny. Twoja dotychczasowa nauka pozostaje zapisana.</Text>:<>
    <Text style={{fontWeight:'900',color:ink}}>Imię i nazwisko na dyplomie</Text>
    <TextInput value={name} maxLength={120} onChangeText={setName} placeholder="Imię i nazwisko" style={{backgroundColor:'white',color:ink,borderColor:'#b8d3b7',borderWidth:1,borderRadius:11,padding:13,fontSize:16}}/>
    <Text style={{fontSize:12,color:'#647b69',lineHeight:20}}>Dane na dokumencie są deklarowane przez użytkownika; nie stanowią potwierdzenia tożsamości.</Text>
    {button('Rozpocznij egzamin',start,busy||name.trim().length<3)}
   </>}
  </View>}
  {!loading&&state==='in_progress'&&<View style={{gap:13}}>
   <Text style={{fontSize:14,fontWeight:'900',color:ink}}>Poprawne odpowiedzi: {correct}/5 · Błędy: {wrong}</Text>
   <Text style={{color:'#4f7455',fontSize:12,fontWeight:'800'}}>{gradingMode==='choice'?'Pytania jednokrotnego wyboru':'Odpowiedzi własnymi słowami'}</Text>
   <View style={{height:9,backgroundColor:'#cadec4',borderRadius:7,overflow:'hidden'}}><View style={{height:9,width:Math.min(100,correct/5*100)+'%',backgroundColor:'#72ae79'}}/></View>
   {phase==='final'&&<Text style={{fontWeight:'900',color:'#316d42'}}>Gratulacje! Pięć poprawnych odpowiedzi — ostatnie pytanie przed zaliczeniem.</Text>}
   {phase==='extra'&&<Text style={{fontWeight:'900',color:'#98682b'}}>To dodatkowa szansa po pytaniu finałowym. Zastanów się dokładnie.</Text>}
   {!!history.length&&<View style={{gap:8}}>
    {history.slice(-2).map((h,i)=><View key={i} style={{padding:11,backgroundColor:'white',borderRadius:10}}>
     <Text style={{fontWeight:'900',color:h.correct?'#337249':'#9f6940'}}>{h.correct?'✓ Dobrze':'✕ Wymaga poprawy'}</Text>
     <Text style={{color:'#526c55',fontSize:12,lineHeight:19}}>{h.feedback}</Text>
    </View>)}
   </View>}
   <View style={{backgroundColor:'white',padding:17,borderRadius:12,gap:9}}>
    <Text style={{color:'#53805c',fontWeight:'900'}}>PYTANIE ANIELKI</Text>
    <Text style={{color:ink,fontWeight:'800',fontSize:17,lineHeight:27}}>{question}</Text>
   </View>
   {gradingMode==='choice'?<View style={{gap:9}}>
    {options.map((option,i)=><Pressable accessibilityRole="button" key={i} onPress={()=>setSelectedOption(i)} style={{padding:15,backgroundColor:selectedOption===i?'#d2ebca':'white',borderWidth:selectedOption===i?2:1,borderColor:selectedOption===i?'#377746':'#c2d7b9',borderRadius:11}}>
     <Text style={{color:ink,fontWeight:selectedOption===i?'900':'700',lineHeight:23}}>{String.fromCharCode(65+i)}. {option}</Text>
    </Pressable>)}
   </View>:<>
   <TextInput value={answer} onChangeText={setAnswer} multiline maxLength={1200} placeholder="Opisz dokładnie, co zrobisz i dlaczego. Podaj, jak sprawdzisz wynik..." style={{backgroundColor:'white',padding:15,minHeight:130,textAlignVertical:'top',borderWidth:1,borderColor:'#bdd4b7',borderRadius:11,fontSize:15,color:ink}}/></>}
   {button(busy?'Sprawdzanie odpowiedzi…':'Zatwierdź odpowiedź',send,busy||(gradingMode==='choice'?selectedOption===null:answer.trim().length<20))}
   {gradingMode==='oral'&&<Pressable accessibilityRole="button" onPress={switchMode} disabled={busy} style={{padding:13,backgroundColor:'#f2f7ec',borderRadius:11,borderWidth:1,borderColor:'#c9ddc4'}}>
    <Text style={{color:ink,fontWeight:'800',textAlign:'center'}}>Wolę pytania jednokrotnego wyboru — zachowaj mój postęp</Text>
   </Pressable>}
  </View>}
  {!loading&&state==='failed'&&<View style={{gap:12}}>
   <Text style={{color:ink,fontWeight:'900',fontSize:18}}>Tym razem nie udało się zaliczyć.</Text>
   <Text style={{color:'#526c55',lineHeight:22}}>Wróć do trudnych tematów i wykonaj nowe podejście. Wynik tej próby został zapisany.</Text>
   {button('Spróbuj jeszcze raz',()=>{setState('ready');setHistory([]);setCorrect(0);setWrong(0);},busy)}
  </View>}
  {!loading&&state==='passed'&&<View style={{gap:12}}>
   <Text style={{color:'#205c35',fontWeight:'900',fontSize:19}}>Gratulacje! Zaliczyłeś egzamin.</Text>
   {!!cert&&<Text style={{color:ink,lineHeight:23}}>Dyplom: {cert.certificate_no}{cert.is_demo?' · WZÓR TESTOWY — NIEWAŻNY':''}</Text>}
   {button('Zobacz autorski dyplom',()=>router.push({pathname:'/dyplom',params:{course:courseSlug}}),!cert)}
  </View>}
  {!!message&&<Text style={{padding:12,borderRadius:10,backgroundColor:'white',color:'#355e3e',lineHeight:22,fontWeight:'700'}}>{message}</Text>}
  {!!error&&<View style={{gap:9,padding:12,backgroundColor:'#fff0e7',borderRadius:11}}>
   <Text style={{color:'#984d34',lineHeight:21}}>{error}</Text>
   <Pressable onPress={()=>void refresh()}><Text style={{fontWeight:'900',color:ink}}>Odśwież stan egzaminu</Text></Pressable>
  </View>}
  <Text style={{color:'#768a75',fontSize:12,lineHeight:19}}>Niezależny dyplom TRENERKI nie jest kwalifikacją zawodową. Ocena automatyczna może zawierać błędy.</Text>
  <Pressable accessibilityRole="link" onPress={()=>Linking.openURL('mailto:trenerki.pl@gmail.com?subject=Weryfikacja%20wyniku%20egzaminu')}>
   <Text style={{color:'#286043',fontSize:13,textDecorationLine:'underline'}}>Poproś o sprawdzenie wyniku przez człowieka</Text>
  </Pressable>
 </View>;
}
