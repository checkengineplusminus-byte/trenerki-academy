import React,{useEffect,useState} from 'react';
import {View,Text,Pressable} from 'react-native';

/** Extra practice; does not replace the server-verified mandatory checkpoint. */
export type RedTeamQuiz={
 question:string;options:string[];correct:number;feedback:string[];
 root_cause:string;evidence:string;reviewer_profile:string;severity?:string;
 review_version?:string;distinct_from_required_quiz?:boolean;
};
type Props={courseSlug:string;lessonNo:number;test:RedTeamQuiz};
const ink='#1c3e2c',secondary='#526d59';

export default function AdversarialLessonTest({courseSlug,lessonNo,test}:Props){
 const [selected,setSelected]=useState<number|null>(null);
 const [mistakes,setMistakes]=useState(0);
 const [passed,setPassed]=useState(false);
 const [revealed,setRevealed]=useState(false);
 useEffect(()=>{setSelected(null);setMistakes(0);setPassed(false);setRevealed(false);},[courseSlug,lessonNo]);
 const valid=!!test&&Array.isArray(test.options)&&test.options.length===4&&
 Number.isInteger(test.correct)&&test.correct>=0&&test.correct<4;
 if(!valid)return null;
 const choices=test.options;
 function choose(i:number){
  if(selected!==null||revealed)return;
  setSelected(i);
  const isRight=i===test.correct;
  setPassed(isRight);
  if(!isRight)setMistakes(n=>n+1);
 }
 const failure=selected!==null&&!passed;
 return <View testID="adversarial-lesson-test" style={{borderRadius:16,borderWidth:1,borderColor:'#c7dbcb',backgroundColor:'#fffdf7',padding:18,marginVertical:15,gap:13}}>
  <Text style={{fontSize:20,lineHeight:27,fontWeight:'900',color:ink}}>Dodatkowy test krytycznego myślenia</Text>
  <Text style={{fontSize:13,lineHeight:20,color:secondary}}>Tym razem błędne odpowiedzi mogą brzmieć wiarygodnie. Najpierw sam podejmij decyzję, a potem sprawdź nie tylko wynik, ale także dowód. Ten trening nie zmienia oceny obowiązkowego quizu ani dyplomu.</Text>
  <Text testID="adversarial-question" style={{fontSize:16,lineHeight:25,fontWeight:'800',color:ink}}>{test.question}</Text>
  <View style={{gap:9}}>
   {choices.map((option,i)=>{
    const active=selected===i;
    const showRight=(passed||revealed)&&i===test.correct;
    const disabled=selected!==null||revealed;
    return <Pressable key={i} testID={'adversarial-option-'+i} accessibilityRole="button"
     accessibilityLabel={'Odpowiedź '+String.fromCharCode(65+i)+': '+option}
     onPress={()=>choose(i)} disabled={disabled}
     style={{borderWidth:1.5,borderColor:showRight?'#47875b':active?'#ab735c':'#d6e4d5',borderRadius:12,
      backgroundColor:showRight?'#e6f5e8':active?'#f7ece7':'#fff',padding:13,minHeight:51,flexDirection:'row',alignItems:'flex-start',gap:10}}>
     <Text style={{width:22,fontWeight:'900',color:ink}}>{String.fromCharCode(65+i)}.</Text>
     <Text style={{flex:1,fontSize:14,lineHeight:23,color:ink}}>{option}</Text>
    </Pressable>;
   })}
  </View>
  {selected!==null&&<View testID="adversarial-feedback" style={{borderRadius:11,backgroundColor:passed?'#e8f5e8':'#f8efe6',padding:13,gap:7}}>
   <Text style={{fontWeight:'900',fontSize:15,color:ink}}>{passed?'✓ Trafna decyzja':'Jeszcze nie — znalazłeś pułapkę'}</Text>
   <Text style={{fontSize:14,lineHeight:23,color:secondary}}>{passed?test.feedback[test.correct]:'Wadliwe założenie: '+test.root_cause}</Text>
  </View>}
  {failure&&!revealed&&<View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>
   <Pressable testID="adversarial-retry" accessibilityRole="button" onPress={()=>setSelected(null)}
    style={{borderRadius:10,paddingHorizontal:15,paddingVertical:12,minHeight:44,justifyContent:'center',backgroundColor:'#e4f0e2'}}>
    <Text style={{fontWeight:'900',color:ink}}>Spróbuj ponownie</Text>
   </Pressable>
   {mistakes>=2&&<Pressable testID="adversarial-reveal" accessibilityRole="button" onPress={()=>setRevealed(true)}
    style={{borderRadius:10,paddingHorizontal:15,paddingVertical:12,minHeight:44,justifyContent:'center',borderWidth:1,borderColor:'#b9cbb8'}}>
    <Text style={{fontWeight:'800',color:ink}}>Pokaż uzasadnione rozwiązanie</Text>
   </Pressable>}
  </View>}
  {(passed||revealed)&&<View testID="adversarial-solution" style={{borderTopWidth:1,borderTopColor:'#dce7d9',paddingTop:13,gap:7}}>
   <Text style={{fontWeight:'900',fontSize:14,color:ink}}>Rozwiązanie i dowód</Text>
   <Text style={{fontSize:14,lineHeight:24,color:secondary}}>{choices[test.correct]}</Text>
   <Text style={{fontSize:14,lineHeight:23,color:secondary}}>Co trzeba potwierdzić: {test.evidence}</Text>
   {revealed&&!passed&&<Text style={{fontSize:13,lineHeight:21,color:'#8a533a'}}>To rozwiązanie pokazano po trudnościach. Porównaj je ze swoją próbą i wróć do materiału.</Text>}
  </View>}
  <Text style={{fontSize:12,lineHeight:19,color:'#728574'}}>Samodzielna próba — nie jest dodatkowym warunkiem ukończenia lekcji. Swoje uzasadnienie możesz zachować w zeszycie zadania domowego poniżej.</Text>
 </View>;
}
