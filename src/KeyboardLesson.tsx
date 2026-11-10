import React,{useMemo,useState} from 'react';
import {View,Text,Pressable} from 'react-native';
import HandsOnLab,{softwareMode} from './HandsOnLab';
import {LabButton,LabGroup,labInk,labStyles} from './LabControls';

export type KeyboardShortcut={
 combo:string;keys:string[];kind:'alias'|'hotkey';label:string;
 before:string;after:string;tip:string;platform?:string;
};
const muted='#526c5b';
function Keycap({value}:{value:string}){
 return <Text style={{borderRadius:7,borderWidth:1,borderBottomWidth:3,borderColor:'#b9cbbb',backgroundColor:'white',paddingHorizontal:8,paddingVertical:6,color:labInk,fontWeight:'900'}}>{value}</Text>;
}

export default function KeyboardLesson({slug,shortcuts,tips,exercise,onAttempt,alreadyVerified}:{
 slug:string;shortcuts?:KeyboardShortcut[];tips?:string[];exercise?:string;alreadyVerified?:boolean;
 onAttempt?:(index:number,correct:boolean,activeCombo:string,selectedCombo:string)=>Promise<boolean>|boolean;
}){
 const valid=useMemo(()=>Array.isArray(shortcuts)?shortcuts.filter(s=>s.keys?.length>0&&s.label&&s.before&&s.after):[],[shortcuts]);
 const [active,setActive]=useState<KeyboardShortcut>(),[runId,setRunId]=useState(0);
 const [answer,setAnswer]=useState<number|null>(null),[verifying,setVerifying]=useState(false),[quizConfirmed,setQuizConfirmed]=useState(false),[error,setError]=useState('');
 const mode=softwareMode(slug);
 if(!mode&&!valid.length)return null;

 function showShortcut(item:KeyboardShortcut){
  setActive(item);setAnswer(null);setQuizConfirmed(false);setError('');
 }
 const options=active?[active,...valid.filter(x=>x.combo!==active.combo).slice(0,2)].sort((a,b)=>a.combo.localeCompare(b.combo)):[];
 async function verify(option:KeyboardShortcut,index:number){
  if(!active||verifying||quizConfirmed)return;
  const correct=option.combo===active.combo;
  setAnswer(index);setError('');setVerifying(true);
  try{
   const accepted=onAttempt?await onAttempt(index,correct,active.combo,option.combo):correct;
   setQuizConfirmed(correct&&!!accepted);
   if(correct&&!accepted)setError('Poprawną odpowiedź trzeba jeszcze zapisać. Kliknij ją ponownie.');
  }catch{setError('Nie udało się zapisać odpowiedzi. Spróbuj ponownie.');}
  finally{setVerifying(false);}
 }

 return <View style={{gap:13,marginVertical:14}}>
  {!!valid.length&&<View style={labStyles.panel}>
   <Text style={labStyles.heading}>Skróty i polecenia z tej lekcji</Text>
   <Text style={labStyles.body}>Wybierz skrót. Sprawdź, co przygotować przed użyciem, jaki efekt zobaczysz i gdzie łatwo o pomyłkę.</Text>
   <LabGroup label="Wybierz skrót">
    {valid.map((item,i)=><LabButton key={item.combo+'-'+i} label={item.combo+' · '+item.label}
     selected={active?.combo===item.combo} disabled={verifying} onPress={()=>showShortcut(item)}/>)}
   </LabGroup>
   {active&&<View style={labStyles.ribbon}>
    <View style={labStyles.row}>
     {active.keys.map((key,i)=><React.Fragment key={i}>{i>0&&<Text style={{color:muted}}>{active.kind==='alias'?'→':'+'}</Text>}<Keycap value={key}/></React.Fragment>)}
    </View>
    <Text style={labStyles.eyebrow}>{active.platform||'Klawiatura Windows'} · {active.kind==='alias'?'Wpisz komendę i zatwierdź Enterem':'Naciśnij klawisze razem'}</Text>
    <Text style={labStyles.body}><Text style={{fontWeight:'900'}}>Przed użyciem </Text>{active.before}</Text>
    <Text style={labStyles.body}><Text style={{fontWeight:'900'}}>Co się zmieni </Text>{active.after}</Text>
    <Text style={labStyles.body}><Text style={{fontWeight:'900'}}>W praktyce </Text>{active.tip}</Text>
    {mode&&<LabButton label="Wypróbuj skrót w warsztacie" onPress={()=>setRunId(n=>n+1)}/>}
   </View>}
  </View>}
  {mode&&<HandsOnLab mode={mode} shortcut={active?.combo} runId={runId}/>}
  {mode&&<Text style={labStyles.eyebrow}>Autorski warsztat szkoleniowy. Pracujesz na danych ćwiczebnych w obrębie Akademii.</Text>}
  {alreadyVerified&&<Text style={labStyles.status}>✓ Zaliczenie skrótów zapisane. Możesz przejść dalej albo poćwiczyć ponownie.</Text>}
  {active&&options.length>=3&&<View style={{backgroundColor:labInk,padding:15,borderRadius:13,gap:10}}>
   <Text style={{fontSize:12,fontWeight:'900',color:'#d1ebbf'}}>SPRAWDŹ WIEDZĘ</Text>
   <Text style={{fontWeight:'900',color:'white',fontSize:17,lineHeight:24}}>Które polecenie daje taki efekt? {active.after}</Text>
   {options.map((option,i)=><Pressable key={option.combo} accessibilityRole="button" disabled={verifying||quizConfirmed}
    onPress={()=>void verify(option,i)} style={{minHeight:44,padding:12,borderRadius:9,backgroundColor:answer===i?(option.combo===active.combo?'#d8efcf':'#fff0d6'):'#f5f8f2'}}>
    <Text style={{color:labInk,fontWeight:'800'}}>{String.fromCharCode(65+i)}. {option.combo} · {option.label}</Text>
   </Pressable>)}
   {!!error&&<Text style={{color:'#ffe2ac',fontWeight:'800'}}>{error}</Text>}
   {answer!==null&&!error&&<Text style={{color:'#def2d8',fontWeight:'700',lineHeight:22}}>{quizConfirmed?'Wynik zapisany.':verifying?'Sprawdzam odpowiedź…':'Porównaj opis działania z wybranym skrótem i spróbuj ponownie.'}</Text>}
  </View>}
  {!!tips?.length&&<View style={labStyles.ribbon}>
   <Text style={labStyles.heading}>Wskazówki do ćwiczenia</Text>
   {tips.map((tip,i)=><Text key={i} style={labStyles.body}>• {tip}</Text>)}
  </View>}
  {!!exercise&&<View style={labStyles.ribbon}>
   <Text style={labStyles.heading}>Przećwicz samodzielnie</Text>
   <Text style={labStyles.body}>{exercise}</Text>
  </View>}
 </View>;
}
