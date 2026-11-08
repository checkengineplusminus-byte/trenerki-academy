import React,{useEffect,useState} from 'react';
import {View,Text,Pressable} from 'react-native';

export type LearningCase={
 intro?:string;situation:string;example:string;question:string;
 options:string[];correct:number;explanation:string;feedback?:string[];task?:string;topic_kind?:string;
};
const ink='#183e2d',gray='#536858';
export default function CaseLesson({data,identity,onPassed,onAttempt,hideSituation=false}:{data?:LearningCase;identity:string;onPassed:(ok:boolean)=>void;onAttempt?:(index:number,correct:boolean)=>Promise<boolean>|boolean;hideSituation?:boolean}){
 const [chosen,setChosen]=useState<number|null>(null);
 const [tries,setTries]=useState(0);
 const [hint,setHint]=useState(false);
 const [accepted,setAccepted]=useState(false),[verifying,setVerifying]=useState(false),[verifyError,setVerifyError]=useState('');
 useEffect(()=>{setChosen(null);setTries(0);setHint(false);setAccepted(false);setVerifying(false);setVerifyError('');onPassed(false)},[identity]);
 if(!data?.situation||!data?.options?.length)return null;
 const passed=chosen===data.correct&&accepted;
 const correctText=data.options[data.correct];
 const enabled=Array.isArray(data.options)&&data.correct>=0&&data.correct<data.options.length;
 if(!enabled)return null;
 const seed=identity.split('').reduce((n,c)=>n+c.charCodeAt(0),0)%data.options.length;
 const order=data.options.map((_,i)=>({value:data.options[(i+seed)%data.options.length],original:(i+seed)%data.options.length}));
 async function choose(index:number){
  if(verifying||passed)return;
  setChosen(index);setTries(n=>n+1);setVerifyError('');setAccepted(false);onPassed(false);setVerifying(true);
  try{
   const localCorrect=index===data.correct;
   const approved=onAttempt?await onAttempt(index,localCorrect):localCorrect;
   const confirmed=localCorrect&&!!approved;
   setAccepted(confirmed);onPassed(confirmed);
   if(localCorrect&&!confirmed)setVerifyError('Odpowiedź jest poprawna, ale zapis się nie powiódł. Kliknij tę samą odpowiedź ponownie.');
  }catch{
   setAccepted(false);onPassed(false);setVerifyError('Nie udało się zapisać wyniku. Spróbuj nacisnąć odpowiedź ponownie.');
  }finally{setVerifying(false)}
 }
 return <View style={{gap:14,marginTop:12}}>
  {!hideSituation&&<View style={{backgroundColor:'#e6f1df',borderRadius:18,padding:21,gap:12}}>
   <Text style={{fontSize:12,color:'#55745c',fontWeight:'900'}}>PRZYKŁAD Z ŻYCIA</Text>
   <Text style={{fontSize:17,color:ink,lineHeight:27}}>{data.situation}</Text>
  </View>}
  <View style={{backgroundColor:'#19392b',borderRadius:17,padding:20,gap:13}}>
   <Text style={{fontSize:11,fontWeight:'900',color:'#d2eaba',letterSpacing:1}}>SPRAWDŹ SWOJE ROZUMIENIE</Text>
   <Text style={{fontSize:21,fontWeight:'900',color:'white',lineHeight:29}}>{data.question}</Text>
   {order.map(({value,original},position)=><Pressable key={position} accessibilityRole="button" onPress={()=>void choose(original)} disabled={passed||verifying}
    style={{borderRadius:11,padding:14,backgroundColor:chosen===original?(passed?'#d9f0c9':'#fff0db'):'#f7faf4',borderWidth:chosen===original?2:1,borderColor:chosen===original?(passed?'#6aa365':'#c8a06c'):'#d9e3d6'}}>
    <Text style={{fontSize:15,color:ink,fontWeight:'700',lineHeight:23}}>{String.fromCharCode(65+position)}. {value}</Text>
   </Pressable>)}
   {chosen!==null&&<View style={{backgroundColor:chosen===data.correct?'#cfe8c7':'#ffefd8',borderRadius:11,padding:15,gap:7}}>
    <Text style={{fontWeight:'900',color:ink,fontSize:16}}>{passed?'Poprawnie — wynik zapisany.':chosen===data.correct?'Poprawna odpowiedź. '+(verifying?'Zapisuję wynik…':'Sprawdź potwierdzenie zapisu.'):'Zastanów się jeszcze raz nad tym przypadkiem.'}</Text>
    <Text style={{color:ink,lineHeight:23,fontSize:14}}>{data.feedback?.[chosen]|| (passed?data.explanation:'Sprawdź, które działanie odpowiada bezpośrednio na opisany problem. Po odpowiedzi zobaczysz przykład i wyjaśnienie.')}</Text>
    {!!verifyError&&<Text style={{fontSize:13,color:'#95512f',fontWeight:'800'}}>{verifyError}</Text>}
    {!passed&&tries>=2&&<Pressable onPress={()=>setHint(true)}><Text style={{color:'#4b674b',fontWeight:'800'}}>Pokaż podpowiedź →</Text></Pressable>}
    {hint&&!passed&&<Text style={{fontWeight:'700',color:ink}}>Zwróć uwagę na: {correctText}</Text>}
   </View>}
  </View>
  {chosen!==null&&<View style={{backgroundColor:'#fff',borderRadius:17,borderWidth:1,borderColor:'#dfe8db',padding:19,gap:12}}>
   <Text style={{fontSize:12,fontWeight:'900',color:'#587b5c'}}>PRZYKŁADOWE ROZWIĄZANIE</Text>
   <Text style={{fontSize:16,fontWeight:'800',color:ink,lineHeight:26}}>{data.example}</Text>
   <Text style={{fontSize:14,color:gray,lineHeight:24}}>{data.explanation}</Text>
  </View>}
  {!!data.task&&<View style={{backgroundColor:'#f0f5ec',borderRadius:15,padding:19,gap:10}}>
   <Text style={{fontWeight:'900',fontSize:17,color:ink}}>Ćwiczenie po lekcji</Text>
   <Text style={{color:gray,fontSize:15,lineHeight:24}}>{data.task}</Text>
   <Text style={{color:'#68806b',fontSize:12}}>Możesz zapisać własny przykład, ale ważniejsze jest zrozumienie decyzji z zadania.</Text>
  </View>}
 </View>;
}
