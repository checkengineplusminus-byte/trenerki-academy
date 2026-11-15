import React,{useState} from 'react';
import {View,Text,TextInput} from 'react-native';
import {LabButton,labStyles} from './LabControls';
import {calculateCarpentry,examples,explainCarpentry,explainCarpentryWrongAnswer,formatCarpentry,readCarpentryNumber,sampleValues} from './CarpentryCalculations';

export {hasCarpentryLab} from './CarpentryCalculations';

export default function CarpentryPracticeLab({lessonNo,onPassed,alreadyPassed,onVerify}:{lessonNo:number;onPassed?:()=>void;alreadyPassed?:boolean;onVerify?:(answer:string)=>Promise<boolean>|boolean}){
 const problem=examples[lessonNo];
 const [mode,setMode]=useState<'calculator'|'exercise'>(onPassed?'exercise':'calculator');
 const [inputs,setInputs]=useState(()=>problem?sampleValues(problem):{});
 const [answer,setAnswer]=useState(''),[message,setMessage]=useState(''),[showSolution,setShowSolution]=useState(false),[verifying,setVerifying]=useState(false),[feedbackKind,setFeedbackKind]=useState<'none'|'incorrect'|'correct'|'error'>('none');
 if(!problem)return null;
 const sample=sampleValues(problem);
 const current=calculateCarpentry(problem,mode==='calculator'?inputs:sample);

 async function check(){
  if(verifying||current.value===undefined)return;
  const entered=readCarpentryNumber(answer);
  if(!Number.isFinite(entered)){setFeedbackKind('error');setMessage('Wpisz samą liczbę, na przykład 0,192. Nie wpisuj jednostki „m³” ani innych znaków.');return;}
  const tolerance=Math.max(0.00001,Math.abs(current.value)*0.0005);
  if(Math.abs(current.value-entered)>tolerance){
   setFeedbackKind('incorrect');
   setMessage(explainCarpentryWrongAnswer(lessonNo,entered,current.values,current.value));return;
  }
  if(onVerify){
   setVerifying(true);setFeedbackKind('none');setMessage('Sprawdzam i zapisuję zaliczenie…');
   try{
    const confirmed=await onVerify(answer);
    if(!confirmed){setFeedbackKind('error');setMessage('Wynik jest poprawny, ale nie udało się zapisać zaliczenia. Kliknij „Sprawdź mój wynik” ponownie.');return;}
   }catch{setFeedbackKind('error');setMessage('Nie udało się zapisać wyniku. Sprawdź połączenie i spróbuj ponownie.');return;}
   finally{setVerifying(false);}
  }
  setFeedbackKind('correct');setMessage('✓ Poprawnie! Zadanie 2 zaliczone i zapisane. '+explainCarpentry(lessonNo,current.values,current.value)+' Wróć do przycisku „Dalej”, aby otworzyć kolejną lekcję.');onPassed?.();
 }

 return <View testID="carpentry-lab" style={[labStyles.panel,{marginBottom:16}]}>
  <Text style={labStyles.heading}>{onPassed?'Zadanie 2 · obliczenia: ':''}{problem.title}</Text>
  <Text style={labStyles.body}>{problem.goal}</Text>
  {onPassed&&<View style={labStyles.row}>
   <LabButton label="Kalkulator · własne dane" selected={mode==='calculator'} onPress={()=>setMode('calculator')}/>
   <LabButton label="Zadanie z lekcji" selected={mode==='exercise'} onPress={()=>setMode('exercise')}/>
  </View>}
  {mode==='calculator'?<>
   <Text style={labStyles.body}>Wpisz swoje dane. Wynik i wzór przeliczają się na bieżąco. Możesz użyć przecinka lub kropki.</Text>
   <View style={labStyles.row}>
    {problem.fields.map(field=><View key={field.key} style={{flexGrow:1,flexBasis:128,minWidth:112,gap:4}}>
     <Text style={labStyles.eyebrow}>{field.label} ({field.unit})</Text>
     <TextInput accessibilityLabel={field.label} keyboardType={field.key==='count'?'number-pad':'decimal-pad'}
      value={inputs[field.key]??''} onChangeText={value=>setInputs(old=>({...old,[field.key]:value}))} style={labStyles.input}/>
    </View>)}
   </View>
   <View style={labStyles.row}>
    <LabButton label="Wyczyść pola" onPress={()=>setInputs({})}/>
    <LabButton label="Wczytaj przykład" onPress={()=>setInputs(sample)}/>
   </View>
   <View accessibilityLiveRegion="polite" style={labStyles.ribbon}>
    <Text testID="carpentry-result" style={labStyles.heading}>{current.value===undefined?problem.expectedLabel:problem.expectedLabel+' · '+formatCarpentry(current.value)+' '+problem.unit}</Text>
    <Text selectable style={labStyles.body}>{current.value===undefined?current.error:explainCarpentry(lessonNo,current.values,current.value)}</Text>
   </View>
  </>:<>
   <Text style={labStyles.body}>{onPassed?'To obowiązkowe drugie zadanie tej lekcji. Oblicz wynik, wpisz go poniżej i kliknij przycisk sprawdzania. Po zaliczeniu wróć do przycisku „Dalej”.':'Oblicz wynik dla danych z lekcji. Po sprawdzeniu możesz wrócić do własnych obliczeń w kalkulatorze.'}</Text>
   <Text style={labStyles.body}>{problem.fields.map(field=>field.label+' '+field.initial+' '+field.unit).join(' · ')}</Text>
   {lessonNo===1&&<View style={{padding:13,backgroundColor:'#edf5e7',borderRadius:10,gap:5}}>
    <Text style={{color:'#24472f',fontWeight:'900'}}>Jak obliczyć objętość? Zacznij od jednostek</Text>
    <Text style={{color:'#375942',lineHeight:23}}>40 mm to 0,04 m, 200 mm to 0,20 m, a 4000 mm to 4 m. Objętość jednej deski otrzymasz, mnożąc te trzy wymiary. Następnie pomnóż przez 6 sztuk. Odpowiedź podaj w m³.</Text>
   </View>}
   <Text style={labStyles.eyebrow}>Twój wynik · {problem.expectedLabel} ({problem.unit})</Text>
   <TextInput accessibilityLabel="Wpisz obliczony wynik" keyboardType="decimal-pad" value={answer}
    onChangeText={value=>{setAnswer(value);setMessage('');setFeedbackKind('none');}} onSubmitEditing={()=>void check()} style={labStyles.input}/>
   <View style={labStyles.row}>
    <LabButton label={verifying?'Zapisuję wynik…':'Sprawdź mój wynik'} onPress={()=>void check()}/>
    <LabButton label={showSolution?'Ukryj wzór':'Pokaż wzór i rozwiązanie'} selected={showSolution} onPress={()=>setShowSolution(v=>!v)}/>
   </View>
   {!!message&&<View testID="carpentry-answer-feedback" accessibilityLiveRegion="polite" style={{borderRadius:11,padding:14,borderWidth:1,borderColor:feedbackKind==='incorrect'?'#d3a76b':feedbackKind==='error'?'#d89f91':'#acd0a3',backgroundColor:feedbackKind==='incorrect'?'#fff2db':feedbackKind==='error'?'#fff0eb':'#eaf4e7'}}>
    <Text selectable style={{fontSize:15,lineHeight:25,color:'#233e2c'}}>{message}</Text>
   </View>}
   {showSolution&&current.value!==undefined&&<Text selectable style={labStyles.status}>{explainCarpentry(lessonNo,current.values,current.value)}</Text>}
  </>}
  <Text style={labStyles.body}>{problem.tip}</Text>
  {alreadyPassed&&<Text style={labStyles.status}>✓ Ćwiczenie z obliczeń zaliczone.</Text>}
 </View>;
}

export function CarpentryCalculatorDirectory(){
 const [selected,setSelected]=useState<number>();
 return <View style={{gap:8,marginVertical:10}}>
  <View style={labStyles.row}>
   <LabButton label={selected===undefined?'Kalkulatory cieśli ↓':'Zwiń kalkulatory cieśli ↑'} onPress={()=>setSelected(selected===undefined?1:undefined)}/>
  </View>
  {selected!==undefined&&<>
   <View style={labStyles.row}>
    {Object.entries(examples).map(([lesson,problem])=><LabButton key={lesson} label={problem.expectedLabel} selected={selected===Number(lesson)} onPress={()=>setSelected(Number(lesson))}/>)}
   </View>
   <CarpentryPracticeLab key={selected} lessonNo={selected}/>
  </>}
 </View>;
}
