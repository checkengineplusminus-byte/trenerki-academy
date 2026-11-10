import React,{useState} from 'react';
import {View,Text,TextInput} from 'react-native';
import {LabButton,labStyles} from './LabControls';
import {calculateCarpentry,examples,explainCarpentry,formatCarpentry,readCarpentryNumber,sampleValues} from './CarpentryCalculations';

export {hasCarpentryLab} from './CarpentryCalculations';

export default function CarpentryPracticeLab({lessonNo,onPassed,alreadyPassed}:{lessonNo:number;onPassed?:()=>void;alreadyPassed?:boolean}){
 const problem=examples[lessonNo];
 const [mode,setMode]=useState<'calculator'|'exercise'>('calculator');
 const [inputs,setInputs]=useState(()=>problem?sampleValues(problem):{});
 const [answer,setAnswer]=useState(''),[message,setMessage]=useState(''),[showSolution,setShowSolution]=useState(false);
 if(!problem)return null;
 const sample=sampleValues(problem);
 const current=calculateCarpentry(problem,mode==='calculator'?inputs:sample);

 function check(){
  if(current.value===undefined)return;
  const entered=readCarpentryNumber(answer);
  if(!Number.isFinite(entered)){setMessage('Wpisz samą liczbę z przecinkiem albo kropką.');return;}
  const tolerance=Math.max(0.00001,Math.abs(current.value)*0.0005);
  if(Math.abs(current.value-entered)<=tolerance){
   setMessage('Zgadza się. '+explainCarpentry(lessonNo,current.values,current.value));onPassed?.();
  }else setMessage('Sprawdź przeliczenie jednostek i kolejność działań. Możesz podejrzeć wzór.');
 }

 return <View testID="carpentry-lab" style={[labStyles.panel,{marginBottom:16}]}>
  <Text style={labStyles.heading}>{problem.title}</Text>
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
   <Text style={labStyles.body}>Oblicz wynik dla danych z lekcji. Po sprawdzeniu możesz wrócić do własnych obliczeń w kalkulatorze.</Text>
   <Text style={labStyles.body}>{problem.fields.map(field=>field.label+' '+field.initial+' '+field.unit).join(' · ')}</Text>
   <Text style={labStyles.eyebrow}>Twój wynik · {problem.expectedLabel} ({problem.unit})</Text>
   <TextInput accessibilityLabel="Wpisz obliczony wynik" keyboardType="decimal-pad" value={answer}
    onChangeText={value=>{setAnswer(value);setMessage('');}} onSubmitEditing={check} style={labStyles.input}/>
   <View style={labStyles.row}>
    <LabButton label="Sprawdź mój wynik" onPress={check}/>
    <LabButton label={showSolution?'Ukryj wzór':'Pokaż wzór i rozwiązanie'} selected={showSolution} onPress={()=>setShowSolution(v=>!v)}/>
   </View>
   {!!message&&<Text accessibilityLiveRegion="polite" style={labStyles.status}>{message}</Text>}
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
