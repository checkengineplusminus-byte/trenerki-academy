import React,{useEffect,useState} from 'react';
import {View,Text,Pressable} from 'react-native';

export type LearningCase={
 intro?:string;situation:string;example:string;question:string;
 options:string[];correct:number;explanation:string;task?:string;topic_kind?:string;
};
const ink='#183e2d',gray='#536858';
export default function CaseLesson({data,identity,onPassed}:{data?:LearningCase;identity:string;onPassed:(ok:boolean)=>void}){
 const [chosen,setChosen]=useState<number|null>(null);
 const [tries,setTries]=useState(0);
 const [hint,setHint]=useState(false);
 useEffect(()=>{setChosen(null);setTries(0);setHint(false);onPassed(false)},[identity]);
 if(!data?.situation||!data?.options?.length)return null;
 const passed=chosen===data.correct;
 const correctText=data.options[data.correct];
 const enabled=Array.isArray(data.options)&&data.correct>=0&&data.correct<data.options.length;
 if(!enabled)return null;
 const order=data.options.map((value,i)=>({value,original:i})).sort((a,b)=>((a.original+identity.length*7)%3)-((b.original+identity.length*7)%3));
 function choose(index:number){
  setChosen(index);setTries(n=>n+1);
  onPassed(index===data.correct);
 }
 return <View style={{gap:14,marginTop:12}}>
  <View style={{backgroundColor:'#e6f1df',borderRadius:18,padding:21,gap:12}}>
   <Text style={{fontSize:12,color:'#55745c',fontWeight:'900'}}>NAUKA NA PRZYKŁADZIE</Text>
   <Text style={{fontSize:20,fontWeight:'900',color:ink,lineHeight:29}}>Wyobraź sobie tę sytuację</Text>
   <Text style={{fontSize:17,color:ink,lineHeight:27}}>{data.situation}</Text>
  </View>
  <View style={{backgroundColor:'#fff',borderRadius:17,borderWidth:1,borderColor:'#dfe8db',padding:19,gap:12}}>
   <Text style={{fontSize:12,fontWeight:'900',color:'#587b5c'}}>JAK POSTĘPUJE DOŚWIADCZONA OSOBA</Text>
   <Text style={{fontSize:16,fontWeight:'800',color:ink,lineHeight:26}}>{data.example}</Text>
   <Text style={{fontSize:14,color:gray,lineHeight:24}}>{data.explanation}</Text>
  </View>
  <View style={{backgroundColor:'#19392b',borderRadius:17,padding:20,gap:13}}>
   <Text style={{fontSize:11,fontWeight:'900',color:'#d2eaba',letterSpacing:1}}>SPRAWDŹ SWOJE ROZUMIENIE</Text>
   <Text style={{fontSize:21,fontWeight:'900',color:'white',lineHeight:29}}>{data.question}</Text>
   {order.map(({value,original},position)=><Pressable key={position} accessibilityRole="button" onPress={()=>choose(original)} disabled={passed}
    style={{borderRadius:11,padding:14,backgroundColor:chosen===original?(passed?'#d9f0c9':'#fff0db'):'#f7faf4',borderWidth:chosen===original?2:1,borderColor:chosen===original?(passed?'#6aa365':'#c8a06c'):'#d9e3d6'}}>
    <Text style={{fontSize:15,color:ink,fontWeight:'700',lineHeight:23}}>{String.fromCharCode(65+position)}. {value}</Text>
   </Pressable>)}
   {chosen!==null&&<View style={{backgroundColor:passed?'#cfe8c7':'#ffefd8',borderRadius:11,padding:15,gap:7}}>
    <Text style={{fontWeight:'900',color:ink,fontSize:16}}>{passed?'Dobrze. Rozumiesz najważniejszy krok.':'To nie rozwiązuje opisanego problemu.'}</Text>
    <Text style={{color:ink,lineHeight:23,fontSize:14}}>{passed?data.explanation:'Wróć do opisanego przykładu i znajdź działanie, które odpowiada dokładnie na ten problem.'}</Text>
    {!passed&&tries>=2&&<Pressable onPress={()=>setHint(true)}><Text style={{color:'#4b674b',fontWeight:'800'}}>Pokaż podpowiedź →</Text></Pressable>}
    {hint&&!passed&&<Text style={{fontWeight:'700',color:ink}}>Zwróć uwagę na: {correctText}</Text>}
   </View>}
  </View>
  {!!data.task&&<View style={{backgroundColor:'#f0f5ec',borderRadius:15,padding:19,gap:10}}>
   <Text style={{fontWeight:'900',fontSize:17,color:ink}}>Ćwiczenie po lekcji</Text>
   <Text style={{color:gray,fontSize:15,lineHeight:24}}>{data.task}</Text>
   <Text style={{color:'#68806b',fontSize:12}}>Notatka jest opcjonalna. Weryfikację zrozumienia zapewnia pytanie powyżej.</Text>
  </View>}
 </View>;
}
