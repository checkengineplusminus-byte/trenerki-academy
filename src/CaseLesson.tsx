import React,{useEffect,useMemo,useState} from 'react';
import {View,Text,Pressable} from 'react-native';
import {optionOrder} from './quizOrder';

export type LearningCase={
 intro?:string;situation?:string;example:string;question:string;
 options:string[];correct:number;explanation:string;feedback?:string[];task?:string;topic_kind?:string;
};
const ink='#183e2d',gray='#536858';
export default function CaseLesson({data,identity,onPassed,onAttempt,hideSituation=false,hideTask=false}:{data?:LearningCase;identity:string;onPassed?:(ok:boolean)=>void;onAttempt?:(index:number,correct:boolean)=>Promise<boolean>|boolean;hideSituation?:boolean;hideTask?:boolean}){
 const [chosen,setChosen]=useState<number|null>(null);
 const [tries,setTries]=useState(0);
 const [hint,setHint]=useState(false);
 const [methodOpen,setMethodOpen]=useState(false);
 const [accepted,setAccepted]=useState(false),[verifying,setVerifying]=useState(false),[verifyError,setVerifyError]=useState('');
 useEffect(()=>{setChosen(null);setTries(0);setHint(false);setMethodOpen(false);setAccepted(false);setVerifying(false);setVerifyError('');onPassed?.(false)},[identity]);
 const optionCount=data?.options?.length??0;
 const order=useMemo(()=>optionOrder(optionCount),[identity,optionCount]);
 if(!data?.question?.trim()||!data.options?.length)return null;
 const passed=chosen===data.correct&&accepted;
 const feedbackForChoice=(index:number|null)=>index===null?'':data.feedback?.[index]?.trim()||'';
 const enabled=Array.isArray(data.options)&&data.correct>=0&&data.correct<data.options.length;
 const correctAnswer=data.correct;
 if(!enabled)return null;
 async function choose(index:number){
  if(verifying||passed)return;
  setChosen(index);setTries(n=>n+1);setVerifyError('');setAccepted(false);onPassed?.(false);setVerifying(true);
  try{
   const localCorrect=index===correctAnswer;
   const approved=onAttempt?await onAttempt(index,localCorrect):localCorrect;
   const confirmed=localCorrect&&!!approved;
   setAccepted(confirmed);onPassed?.(confirmed);
   if(localCorrect&&!confirmed)setVerifyError('Odpowiedź jest poprawna, ale zapis się nie powiódł. Kliknij tę samą odpowiedź ponownie.');
  }catch{
   setAccepted(false);onPassed?.(false);setVerifyError('Nie udało się zapisać wyniku. Spróbuj nacisnąć odpowiedź ponownie.');
  }finally{setVerifying(false)}
 }
 return <View style={{gap:14,marginTop:12}}>
  {!hideSituation&&!!data.situation&&<View style={{backgroundColor:'#e6f1df',borderRadius:18,padding:21,gap:12}}>
   <Text style={{fontSize:12,color:'#55745c',fontWeight:'900'}}>PRZYKŁAD Z ŻYCIA</Text>
   <Text style={{fontSize:17,color:ink,lineHeight:27}}>{data.situation}</Text>
  </View>}
  <View testID="case-checkpoint" style={{backgroundColor:'#19392b',borderRadius:17,padding:20,gap:13}}>
   <Text style={{fontSize:11,fontWeight:'900',color:'#d2eaba',letterSpacing:1}}>SPRAWDŹ SWOJE ROZUMIENIE</Text>
   <Text style={{fontSize:21,fontWeight:'900',color:'white',lineHeight:29}}>{data.question}</Text>
   <Pressable accessibilityRole="button" accessibilityState={{expanded:methodOpen}} onPress={()=>setMethodOpen(v=>!v)} style={{alignSelf:'flex-start',paddingVertical:7,paddingHorizontal:10,borderRadius:9,backgroundColor:'#2a5540'}}>
    <Text style={{fontSize:12,fontWeight:'800',color:'#e3f2e2'}}>{methodOpen?'Ukryj metodę ↑':'Jak przeanalizować zadanie? ↓'}</Text>
   </Pressable>
   {methodOpen&&<View style={{backgroundColor:'#e8f2e3',padding:14,borderRadius:11,gap:7}}>
    <Text style={{fontWeight:'900',color:ink,fontSize:13}}>Metoda: fakt → wybór → skutek → kontrola</Text>
    <Text style={{color:ink,fontSize:13,lineHeight:20}}>1. Wskaż konkretne dane z opisu. Co wiadomo, a czego jeszcze nie sprawdzono?</Text>
    <Text style={{color:ink,fontSize:13,lineHeight:20}}>2. Porównaj dwie realne decyzje. Która spełnia wymagania i uwzględnia ograniczenia?</Text>
    <Text style={{color:ink,fontSize:13,lineHeight:20}}>3. Przewidź skutek błędnego wyboru. Nie utożsamiaj szybkiego działania z poprawnym wynikiem.</Text>
    <Text style={{color:ink,fontSize:13,lineHeight:20}}>4. Wybierz odpowiedź, którą da się sprawdzić na podstawie faktów.</Text>
   </View>}
   {order.map((original,position)=><Pressable key={position} accessibilityRole="button" onPress={()=>void choose(original)} disabled={passed||verifying}
    style={{borderRadius:11,padding:14,backgroundColor:chosen===original?(passed?'#d9f0c9':'#fff0db'):'#f7faf4',borderWidth:chosen===original?2:1,borderColor:chosen===original?(passed?'#6aa365':'#c8a06c'):'#d9e3d6'}}>
    <Text style={{fontSize:15,color:ink,fontWeight:'700',lineHeight:23}}>{String.fromCharCode(65+position)}. {data.options[original]}</Text>
   </Pressable>)}
   {chosen!==null&&<View style={{backgroundColor:passed?'#cfe8c7':'#ffefd8',borderRadius:11,padding:14,gap:7}}>
    <Text style={{fontWeight:'900',color:ink,fontSize:16}}>{passed?'✓ Poprawna odpowiedź. Zapisano wynik.':verifying?'Sprawdzam odpowiedź…':chosen===data.correct?'Poprawna odpowiedź, trwa potwierdzanie.':'Jeszcze nie. Spróbuj raz jeszcze.'}</Text>
    {!passed&&chosen!==data.correct&&<Text style={{color:ink,lineHeight:22,fontSize:14}}>{feedbackForChoice(chosen)||'Sprawdź, które kryterium w materiale decyduje o poprawnym rozwiązaniu.'}</Text>}
    {!!verifyError&&<Text style={{fontSize:13,color:'#95512f',fontWeight:'800'}}>{verifyError}</Text>}
    {!passed&&tries>=2&&!hint&&<Pressable accessibilityRole="button" onPress={()=>setHint(true)} style={{paddingVertical:6}}>
     <Text style={{color:'#4b674b',fontWeight:'900'}}>Potrzebuję podpowiedzi →</Text>
    </Pressable>}
    {hint&&!passed&&<Text style={{fontWeight:'700',color:ink,lineHeight:22}}>Wróć do przykładu: {data.intro||data.explanation||'porównaj warunki zadania z wymaganym rezultatem.'}</Text>}
    {passed&&!!(feedbackForChoice(chosen)||data.explanation)&&
     <Text style={{color:ink,fontSize:14,lineHeight:22}}>{feedbackForChoice(chosen)||data.explanation}</Text>}
   </View>}
  </View>
  {!hideTask&&!!data.task&&!/^(W tym scenariuszu:|Zastosuj zasadę|Przygotuj własny plan|Powiedz Anielce)/i.test(data.task)&&
   <View style={{backgroundColor:'#f0f5ec',borderRadius:13,padding:14,gap:6}}>
    <Text style={{fontWeight:'900',fontSize:14,color:ink}}>Chcesz spróbować więcej?</Text>
    <Text style={{color:gray,fontSize:14,lineHeight:22}}>{data.task}</Text>
   </View>}
 </View>;
}
