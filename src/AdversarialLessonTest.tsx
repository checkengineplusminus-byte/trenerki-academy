import React,{useEffect,useState} from 'react';
import {View,Text,Pressable} from 'react-native';

/** Optional red-team practice on legacy courses; server-verified stage assessment on AI Academy. */
export type RedTeamQuiz={
 question:string;options:string[];correct:number;feedback:string[];
 root_cause:string;evidence:string;reviewer_profile:string;severity?:string;
 review_version?:string;distinct_from_required_quiz?:boolean;
};
type Props={
 courseSlug:string;lessonNo:number;test:RedTeamQuiz;
 required?:boolean;alreadyVerified?:boolean;
 onAttempt?:(index:number,correct:boolean)=>Promise<boolean>|boolean;
};
const ink='#1c3e2c',secondary='#526d59';

export default function AdversarialLessonTest({courseSlug,lessonNo,test,required=false,alreadyVerified=false,onAttempt}:Props){
 const [selected,setSelected]=useState<number|null>(null);
 const [mistakes,setMistakes]=useState(0);
 const [passed,setPassed]=useState(false);
 const [revealed,setRevealed]=useState(false);
 const [busy,setBusy]=useState(false);
 const [saveError,setSaveError]=useState('');
 useEffect(()=>{
  setSelected(null);setMistakes(0);setPassed(false);setRevealed(false);setBusy(false);setSaveError('');
 },[courseSlug,lessonNo]);
 const valid=!!test&&Array.isArray(test.options)&&test.options.length===4&&
  Number.isInteger(test.correct)&&test.correct>=0&&test.correct<4;
 if(!valid)return null;
 const choices=test.options;
 const verified=passed||alreadyVerified;
 async function choose(i:number){
  if(selected!==null||revealed||busy||verified)return;
  setSelected(i);setSaveError('');
  const localCorrect=i===test.correct;
  if(!localCorrect)setMistakes(n=>n+1);
  if(required){
   if(!onAttempt){setSaveError('Nie można teraz zapisać sprawdzianu. Wróć do lekcji i spróbuj ponownie.');return;}
   setBusy(true);
   try{
    const accepted=await onAttempt(i,localCorrect);
    setPassed(localCorrect&&!!accepted);
    if(localCorrect&&!accepted)setSaveError('Poprawną odpowiedź trzeba jeszcze potwierdzić na serwerze. Spróbuj ponownie.');
   }catch{
    setSaveError('Nie udało się zapisać wyniku. Po sprawdzeniu połączenia spróbuj ponownie.');
   }finally{setBusy(false);}
  }else setPassed(localCorrect);
 }
 const failure=selected!==null&&!verified&&!busy;
 return <View testID={required?'ai-stage-checkpoint':'adversarial-lesson-test'} style={{borderRadius:16,borderWidth:required?2:1,borderColor:required?'#7fae8b':'#c7dbcb',backgroundColor:'#fffdf7',padding:18,marginVertical:15,gap:13}}>
  <Text style={{fontSize:20,lineHeight:27,fontWeight:'900',color:ink}}>{required?'Sprawdzian etapu · obowiązkowy':'Dodatkowy test krytycznego myślenia'}</Text>
  <Text style={{fontSize:13,lineHeight:20,color:secondary}}>
   {required?'Zaliczenie tego sprawdzianu jest wymagane do przejścia do kolejnego etapu. Wynik zapisujemy na serwerze, osobno od rozmowy z Anielką. Błędną odpowiedź możesz poprawić.':'Błędne odpowiedzi mogą brzmieć wiarygodnie. Ten trening nie zmienia wyniku obowiązkowych sprawdzianów.'}
  </Text>
  {verified&&<Text style={{fontWeight:'900',color:'#2c7748'}}>✓ Sprawdzian zaliczony i zapisany</Text>}
  <Text testID="adversarial-question" style={{fontSize:16,lineHeight:25,fontWeight:'800',color:ink}}>{test.question}</Text>
  <View style={{gap:9}}>
   {choices.map((option,i)=>{
    const active=selected===i;
    const showRight=(verified||revealed)&&i===test.correct;
    return <Pressable key={i} testID={'adversarial-option-'+i} accessibilityRole="button"
     accessibilityLabel={'Odpowiedź '+String.fromCharCode(65+i)+': '+option}
     disabled={selected!==null||revealed||busy||verified}
     onPress={()=>void choose(i)}
     style={{borderWidth:1.5,borderColor:showRight?'#47875b':active?'#ab735c':'#d6e4d5',borderRadius:12,
      backgroundColor:showRight?'#e6f5e8':active?'#f7ece7':'#fff',padding:13,minHeight:51,flexDirection:'row',alignItems:'flex-start',gap:10}}>
     <Text style={{width:22,fontWeight:'900',color:ink}}>{String.fromCharCode(65+i)}.</Text>
     <Text style={{flex:1,fontSize:14,lineHeight:23,color:ink}}>{option}</Text>
    </Pressable>;
   })}
  </View>
  {busy&&<Text accessibilityLiveRegion="polite" style={{fontWeight:'700',color:secondary}}>Zapisuję odpowiedź…</Text>}
  {!!saveError&&<Text accessibilityLiveRegion="polite" style={{color:'#a43b27'}}>{saveError}</Text>}
  {selected!==null&&!busy&&<View testID="adversarial-feedback" style={{borderRadius:11,backgroundColor:verified?'#e8f5e8':'#f8efe6',padding:13,gap:7}}>
   <Text style={{fontWeight:'900',fontSize:15,color:ink}}>{verified?'✓ Trafna decyzja':'Jeszcze nie — sprawdź założenie'}</Text>
   <Text style={{fontSize:14,lineHeight:23,color:secondary}}>{verified?test.feedback[test.correct]:'Wróć do zasady: '+test.root_cause}</Text>
  </View>}
  {failure&&!revealed&&<View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>
   <Pressable testID="adversarial-retry" accessibilityRole="button" onPress={()=>{setSelected(null);setSaveError('');}}
    style={{borderRadius:10,paddingHorizontal:15,paddingVertical:12,minHeight:44,justifyContent:'center',backgroundColor:'#e4f0e2'}}>
    <Text style={{fontWeight:'900',color:ink}}>Spróbuj ponownie</Text>
   </Pressable>
   {!required&&mistakes>=2&&<Pressable testID="adversarial-reveal" accessibilityRole="button" onPress={()=>setRevealed(true)}
    style={{borderRadius:10,paddingHorizontal:15,paddingVertical:12,minHeight:44,justifyContent:'center',borderWidth:1,borderColor:'#b9cbb8'}}>
    <Text style={{fontWeight:'800',color:ink}}>Pokaż uzasadnione rozwiązanie</Text>
   </Pressable>}
  </View>}
  {(verified||revealed)&&<View testID="adversarial-solution" style={{borderTopWidth:1,borderTopColor:'#dce7d9',paddingTop:13,gap:7}}>
   <Text style={{fontWeight:'900',fontSize:14,color:ink}}>Rozwiązanie i kryterium kontroli</Text>
   <Text style={{fontSize:14,lineHeight:24,color:secondary}}>{choices[test.correct]}</Text>
   <Text style={{fontSize:14,lineHeight:23,color:secondary}}>{test.evidence}</Text>
   {revealed&&!verified&&<Text style={{fontSize:13,color:'#8a533a'}}>Pokazanie rozwiązania nie oznacza zaliczenia.</Text>}
  </View>}
  <Text style={{fontSize:12,lineHeight:19,color:'#728574'}}>{required?'Sprawdzian jest obowiązkowy; Anielka może wyjaśniać, ale nie przyznaje zaliczenia.':'Samodzielna próba. Uzasadnienie możesz zachować w zeszycie zadania domowego.'}</Text>
 </View>;
}
