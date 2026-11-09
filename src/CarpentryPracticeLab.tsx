import React,{useEffect,useState} from 'react';
import {View,Text,TextInput,Pressable,useWindowDimensions} from 'react-native';

type Field={key:string;label:string;initial:string;unit:string};
type Problem={
 title:string;goal:string;fields:Field[];unit:string;
 calculate:(v:Record<string,number>)=>number;solution:string;
 tip:string;expectedLabel:string;
};
const examples:Record<number,Problem>={
 1:{title:'Oblicz objętość tarcicy',goal:'Oblicz m³ dla zadanej liczby desek. Najpierw zamień wszystkie milimetry na metry.',
  fields:[{key:'thickness',label:'Grubość',initial:'40',unit:'mm'},{key:'width',label:'Szerokość',initial:'200',unit:'mm'},{key:'length',label:'Długość',initial:'4000',unit:'mm'},{key:'count',label:'Liczba sztuk',initial:'6',unit:'szt.'}],
  unit:'m³',calculate:v=>v.thickness*v.width*v.length*v.count/1e9,
  solution:'(40 ÷ 1000) × (200 ÷ 1000) × (4000 ÷ 1000) × 6 = 0,192 m³.',
  tip:'Pamiętaj, że mnożysz trzy wielkości długości wyrażone w metrach, a potem liczbę sztuk.',
  expectedLabel:'Objętość łączna'},
 8:{title:'Sprawdź przekątną ramy',goal:'Na podstawie dwóch prostopadłych boków oblicz przekątną zgodnie z Pitagorasem.',
  fields:[{key:'a',label:'Bok A',initial:'2,4',unit:'m'},{key:'b',label:'Bok B',initial:'3,2',unit:'m'}],
  unit:'m',calculate:v=>Math.hypot(v.a,v.b),
  solution:'√(2,4² + 3,2²) = √(5,76 + 10,24) = 4 m.',
  tip:'To nie jest suma boków. Szukasz pierwiastka z sumy kwadratów.',
  expectedLabel:'Przekątna ramy'},
 18:{title:'Oblicz przełożenie kół pasowych',goal:'Oblicz średnicę koła na wale obrabiarki dla podanych obrotów. To model teoretyczny bez poślizgu.',
  fields:[{key:'rpmMotor',label:'Obroty silnika',initial:'1200',unit:'obr./min'},{key:'diamMotor',label:'Koło silnika',initial:'10',unit:'cm'},{key:'rpmMachine',label:'Obroty wału',initial:'2400',unit:'obr./min'}],
  unit:'cm',calculate:v=>v.rpmMotor*v.diamMotor/v.rpmMachine,
  solution:'n₁ × d₁ = n₂ × d₂, więc d₂ = (1200 × 10) ÷ 2400 = 5 cm.',
  tip:'Jeżeli wał ma obracać się dwa razy szybciej od silnika, idealne koło napędzane musi być dwa razy mniejsze.',
  expectedLabel:'Średnica koła na wale'},
 23:{title:'Policz wilgotność metodą wagową',goal:'Wilgotność drewna odnosi się do masy suchej próbki, a nie do jej masy mokrej.',
  fields:[{key:'wet',label:'Masa przed suszeniem',initial:'12,4',unit:'kg'},{key:'dry',label:'Masa całkiem sucha',initial:'10',unit:'kg'}],
  unit:'%',calculate:v=>(v.wet-v.dry)/v.dry*100,
  solution:'(12,4 − 10,0) ÷ 10,0 × 100% = 24%.',
  tip:'Odejmij masę suchą, aby uzyskać masę wody; następnie podziel przez masę suchą.',
  expectedLabel:'Wilgotność'},
 30:{title:'Oblicz cenę z dodatkiem procentowym',goal:'Procent dodatku liczymy od ceny bazowej, a następnie dodajemy do niej otrzymaną kwotę.',
  fields:[{key:'base',label:'Cena bazowa',initial:'35',unit:'zł'},{key:'surcharge',label:'Dodatek',initial:'18',unit:'%'}],
  unit:'zł',calculate:v=>v.base*(1+v.surcharge/100),
  solution:'35 × 18% = 6,30 zł. Razem 35 + 6,30 = 41,30 zł.',
  tip:'18% oznacza 0,18 ceny bazowej, nie stałe 18 zł.',
  expectedLabel:'Cena łączna'},
 37:{title:'Sprawdź geometrię projektu końcowego',goal:'Oblicz przekątną ramy w projekcie teoretycznym. To podstawa kontroli kąta prostego.',
  fields:[{key:'a',label:'Długość A',initial:'3',unit:'m'},{key:'b',label:'Długość B',initial:'4',unit:'m'}],
  unit:'m',calculate:v=>Math.hypot(v.a,v.b),
  solution:'√(3² + 4²) = √25 = 5 m.',
  tip:'Podstaw kwadraty dwóch boków i wyciągnij pierwiastek z ich sumy.',
  expectedLabel:'Przekątna'}
};
export const hasCarpentryLab=(lessonNo:number)=>Object.prototype.hasOwnProperty.call(examples,lessonNo);

export default function CarpentryPracticeLab({lessonNo,onPassed}:{lessonNo:number;onPassed:(passed:boolean)=>void}){
 const {width}=useWindowDimensions();
 const [inputs,setInputs]=useState<Record<string,string>>({});
 const [answer,setAnswer]=useState('');
 const [message,setMessage]=useState('');
 const [passed,setPassed]=useState(false);
 const [showSolution,setShowSolution]=useState(false);
 const problem=examples[lessonNo];
 useEffect(()=>{
  if(!problem)return;
  setInputs(Object.fromEntries(problem.fields.map(x=>[x.key,x.initial])));
  setAnswer('');setMessage('');setPassed(false);setShowSolution(false);onPassed(false);
 },[lessonNo]);
 if(!problem)return null;
 const readNumber=(s:string):number=>{
  const cleaned=String(s||'').trim().replace(/\s|\u00a0/g,'').replace(',','.');
  return cleaned!==''&&/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(cleaned)?Number(cleaned):NaN;
 };
 const format=(n:number)=>n.toLocaleString('pl-PL',{maximumFractionDigits:5});
 function currentValues():Record<string,number>|null{
  const values:Record<string,number>={};
  for(const field of problem.fields){
   const n=readNumber(inputs[field.key]||'');
   if(!Number.isFinite(n)||n<=0)return null;
   values[field.key]=n;
  }
  if(lessonNo===1&&!Number.isInteger(values.count))return null;
  if(lessonNo===23&&values.wet<values.dry)return null;
  return values;
 }
 function explain(values:Record<string,number>,expected:number):string{
  const v=values, f=format, result=f(expected)+' '+problem.unit;
  if(lessonNo===1)return '('+f(v.thickness)+' ÷ 1000) × ('+f(v.width)+' ÷ 1000) × ('+f(v.length)+' ÷ 1000) × '+f(v.count)+' = '+result;
  if(lessonNo===8||lessonNo===37)return '√('+f(v.a)+'² + '+f(v.b)+'²) = '+result;
  if(lessonNo===18)return '('+f(v.rpmMotor)+' × '+f(v.diamMotor)+') ÷ '+f(v.rpmMachine)+' = '+result;
  if(lessonNo===23)return '('+f(v.wet)+' − '+f(v.dry)+') ÷ '+f(v.dry)+' × 100 = '+result;
  if(lessonNo===30)return f(v.base)+' × (1 + '+f(v.surcharge)+' ÷ 100) = '+result;
  return result;
 }
 function reveal(){
  const values=currentValues();
  if(!values){setMessage('Sprawdź dane: wszystkie wartości muszą być dodatnie, liczba sztuk całkowita, a masa mokra nie mniejsza niż sucha.');return;}
  const expected=problem.calculate(values);
  if(!Number.isFinite(expected)){setMessage('Wartości są zbyt duże do obliczenia.');return;}
  setShowSolution(true);
  setMessage('Obliczyłem wynik z aktualnie wpisanych wartości. Możesz teraz przećwiczyć wzór i samodzielnie wpisać odpowiedź.');
 }
 function check(){
  const values=currentValues();
  if(!values){setMessage('Sprawdź dane: podaj dodatnie liczby. Dla liczby sztuk użyj liczby całkowitej, a masa mokra nie może być mniejsza niż sucha.');return;}
  if(!answer.trim()){setMessage('Wpisz obliczony wynik w polu poniżej albo wybierz „Pokaż wynik i wzór”.');return;}
  const entered=readNumber(answer);
  if(!Number.isFinite(entered)){setMessage('Wpisz samą liczbę, np. 2,56. Jednostka jest podana obok pola.');return;}
  const expected=problem.calculate(values);
  if(!Number.isFinite(expected)){setMessage('Wartości są zbyt duże do obliczenia.');return;}
  const tolerance=Math.max(0.00001,Math.abs(expected)*0.0005);
  if(Math.abs(expected-entered)<=tolerance){setMessage('Zgadza się! '+explain(values,expected));setPassed(true);onPassed(true);}
  else{setMessage('To jeszcze nie ten wynik. Sprawdź kolejność działań i jednostki; możesz odsłonić obliczenie dla swoich wartości.');setPassed(false);onPassed(false);}
 }
 return <View style={{backgroundColor:'#eef6eb',borderRadius:15,padding:14,borderWidth:1,borderColor:'#d0e4cf',gap:11,marginBottom:15}}>
  <Text style={{fontSize:17,fontWeight:'900',color:'#224d35'}}>{problem.title}</Text>
  <Text style={{fontSize:14,lineHeight:22,color:'#456750'}}>{problem.goal}</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
   {problem.fields.map(x=><View key={x.key} style={{width:width<520?'47%':'30%',minWidth:125,gap:5}}>
    <Text style={{color:'#345a41',fontSize:12,fontWeight:'800'}}>{x.label} ({x.unit})</Text>
    <TextInput accessibilityLabel={x.label} keyboardType="decimal-pad" value={inputs[x.key]||''}
     onChangeText={val=>{setInputs(prev=>({...prev,[x.key]:val}));setAnswer('');setShowSolution(false);setMessage('');setPassed(false);onPassed(false);}}
     style={{backgroundColor:'white',borderWidth:1,borderColor:'#a8c7aa',borderRadius:9,padding:10,fontSize:16,color:'#1c4830',minHeight:48}}/>
   </View>)}
  </View>
  <Text style={{color:'#31593e',fontSize:13,fontWeight:'900'}}>Twój wynik: {problem.expectedLabel} ({problem.unit})</Text>
  <TextInput accessibilityLabel="Wpisz obliczony wynik" keyboardType="decimal-pad" placeholder="Wpisz swój wynik (np. 2,56)" value={answer}
   onChangeText={v=>{setAnswer(v);setMessage('');setPassed(false);onPassed(false);}}
   style={{backgroundColor:'white',borderWidth:1,borderColor:'#a8c7aa',borderRadius:9,padding:13,fontSize:18,color:'#1c4830',minHeight:50}}/>
  <Pressable accessibilityRole="button" onPress={check} style={{backgroundColor:'#1c5037',padding:14,borderRadius:10,minHeight:48,justifyContent:'center'}}>
   <Text style={{color:'white',fontSize:15,textAlign:'center',fontWeight:'900'}}>Sprawdź mój wynik</Text>
  </Pressable>
  <Pressable accessibilityRole="button" onPress={reveal} style={{backgroundColor:'#fff',borderWidth:1,borderColor:'#a8c7aa',padding:13,borderRadius:10,minHeight:48,justifyContent:'center'}}>
   <Text style={{color:'#24563b',fontSize:14,textAlign:'center',fontWeight:'800'}}>Pokaż wynik i wzór dla tych danych</Text>
  </Pressable>
  {!!message&&<Text accessibilityRole="text" style={{color:passed?'#1c7349':'#86592e',lineHeight:21,fontSize:14,fontWeight:'700'}}>{message}</Text>}
  {showSolution&&<View style={{backgroundColor:'white',padding:12,borderRadius:9,gap:7}}>
   <Text style={{fontSize:13,lineHeight:20,color:'#395841'}}>{problem.tip}</Text>
   {currentValues()&&<Text selectable style={{fontSize:14,lineHeight:24,fontWeight:'800',color:'#31523e'}}>{explain(currentValues()!,problem.calculate(currentValues()!))}</Text>}
   <Text style={{fontSize:12,lineHeight:18,color:'#627766'}}>Ten wzór liczy na podstawie wartości, które masz teraz w polach — nie na podstawie przykładu z lekcji.</Text>
  </View>}
 </View>;
}
