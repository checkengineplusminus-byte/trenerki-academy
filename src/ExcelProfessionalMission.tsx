import React,{useEffect,useState} from 'react';
import {Linking,Pressable,Text,TextInput,View,useWindowDimensions} from 'react-native';
import workbook from '../content/excel-professional-missions.json';
import {checkExcelMissionAnswer,excelResponsePresentation} from './excelMissionAnswers';
const ink='#1e4131';
type Mission=(typeof workbook.missions)[number];
export default function ExcelProfessionalMission({lessonNo}:{lessonNo:number}){
 const mission:Mission|undefined=workbook.missions.find(x=>x.lesson_no===lessonNo);
 const {width}=useWindowDimensions(),small=width<650;
 const [answer,setAnswer]=useState(''),[result,setResult]=useState<'untried'|'wrong'|'right'>('untried');
 const [feedbackText,setFeedbackText]=useState('');
 const [showHelp,setShowHelp]=useState(false),[showReal,setShowReal]=useState(false);
 const [completed,setCompleted]=useState<number[]>([]);
 useEffect(()=>{setAnswer('');setResult('untried');setFeedbackText('');setShowHelp(false);setShowReal(false);setCompleted([]);},[lessonNo]);
 if(!mission)return null;
 const presentation=excelResponsePresentation(mission);
 function check(){
  const result=checkExcelMissionAnswer(mission,answer);
  setResult(result.correct?'right':'wrong');
  setFeedbackText(result.message);
 }
 const level=mission.track==='fundamenty'?'01 · OD ZERA':mission.track==='praktyka'?'02 · PRAKTYKA':'03 · EKSPERT';
 return <View testID={'excel-mission-'+lessonNo} style={{borderWidth:1,borderColor:'#cbded0',borderRadius:16,backgroundColor:'#f5faf5',overflow:'hidden',marginVertical:12}}>
  <View style={{backgroundColor:'#e5f1e6',padding:small?13:17,gap:6}}>
   <Text style={{fontSize:11,fontWeight:'900',color:'#3f7652'}}>EXCEL · {level} · ROZDZIAŁ {lessonNo+1}/30</Text>
   <Text style={{fontWeight:'900',fontSize:small?18:21,color:ink}}>{mission.goal}</Text>
   <Text style={{fontSize:12,color:'#527260'}}>{mission.role}</Text>
  </View>
  <View style={{padding:small?12:17,gap:14}}>
   {lessonNo===0&&<View testID="excel-novice-guidance" style={{borderLeftWidth:4,borderColor:'#78a684',backgroundColor:'#fff',borderRadius:9,padding:12,gap:5}}>
    <Text style={{color:ink,fontSize:15,fontWeight:'900'}}>Nie znasz Excela? Zaczynamy bez skrótów.</Text>
    <Text style={{color:'#3b5b45',fontSize:13,lineHeight:21}}>Arkusz to kratkowana powierzchnia. Litery A, B, C są nazwami kolumn, a liczby 1, 2, 3 — wierszami. Kratka na przecięciu kolumny D i wiersza 2 nazywa się D2. W ćwiczebnym arkuszu poniżej kliknij wskazaną kratkę, potem wykonaj zadanie.</Text>
   </View>}
   <View style={{backgroundColor:'#fff',padding:13,borderRadius:12,gap:7,borderWidth:1,borderColor:'#e1e9df'}}>
    <Text style={{color:'#2d7851',fontSize:12,fontWeight:'900'}}>SYTUACJA Z PRACY</Text>
    <Text style={{color:ink,fontSize:14,lineHeight:22}}>{mission.scenario}</Text>
    <Text style={{color:'#506559',fontSize:13,lineHeight:20}}><Text style={{fontWeight:'900'}}>Dane:</Text> {mission.sourceData}</Text>
   </View>
   <Text style={{fontSize:15,fontWeight:'900',color:ink}}>Wykonaj zadanie, nie zgaduj</Text>
   <View style={{gap:7}}>
    {mission.steps.map((step,i)=><Pressable key={i} accessibilityRole="checkbox" accessibilityState={{checked:completed.includes(i)}} aria-checked={completed.includes(i)}
     accessibilityLabel={'Krok '+(i+1)+': '+step}
     onPress={()=>setCompleted(old=>old.includes(i)?old.filter(x=>x!==i):[...old,i])}
     onKeyDown={(e:any)=>{if((e.key||e.nativeEvent?.key)===' '){e.preventDefault?.();e.stopPropagation?.();setCompleted(old=>old.includes(i)?old.filter(x=>x!==i):[...old,i]);}}}
     style={{flexDirection:'row',gap:9,padding:11,borderWidth:1,borderColor:completed.includes(i)?'#a2ccb2':'#e2e9e2',borderRadius:9,backgroundColor:completed.includes(i)?'#eaf4ed':'#fff',minHeight:46}}>
      <Text style={{fontSize:19,color:completed.includes(i)?'#2c8152':'#728777',fontWeight:'900'}}>{completed.includes(i)?'☑':'□'}</Text>
      <Text style={{flex:1,fontSize:13.5,lineHeight:21,color:ink}}>{step}</Text>
     </Pressable>)}
   </View>
   <View style={{backgroundColor:'#fff',borderRadius:12,borderWidth:1,borderColor:'#d0dfd3',padding:13,gap:9}}>
    <Text testID="excel-mission-answer-label" style={{fontWeight:'900',color:ink,fontSize:15}}>{presentation.title}</Text>
    <Text testID="excel-mission-answer-instruction" style={{fontSize:13,color:'#456655',lineHeight:22}}>{presentation.instruction}</Text>
    <TextInput testID="excel-mission-answer" accessibilityLabel="Twoja odpowiedź na zadanie Excel" value={answer} onChangeText={v=>{setAnswer(v);setResult('untried');setFeedbackText('');}}
     placeholder={presentation.placeholder} keyboardType={presentation.keyboard}
     placeholderTextColor="#82988a" autoCapitalize="none" autoCorrect={false}
     style={{borderWidth:1,borderColor:'#bfcdc0',borderRadius:9,backgroundColor:'#fff',padding:12,minHeight:49,fontSize:15,color:ink}}/>
    <Pressable onPress={check} accessibilityRole="button" accessibilityLabel="Sprawdź wynik zadania Excel"
     style={{minHeight:46,backgroundColor:'#255a3d',borderRadius:9,alignItems:'center',justifyContent:'center',paddingHorizontal:12}}>
     <Text style={{color:'#fff',fontWeight:'900',fontSize:14}}>Sprawdź wynik zadania</Text>
    </Pressable>
    {result==='wrong'&&<View testID="excel-mission-wrong" accessibilityLiveRegion="polite" style={{gap:7}}>
     <Text style={{color:'#8c4e29',fontWeight:'900',fontSize:13}}>Jeszcze nie — sprawdź rodzaj odpowiedzi i obliczenia.</Text>
     <Text testID="excel-mission-answer-feedback" style={{color:'#825e47',fontSize:13,lineHeight:21}}>{feedbackText}</Text>
     <Text style={{color:'#825e47',fontSize:13,lineHeight:21}}><Text style={{fontWeight:'900'}}>Podpowiedź do zadania: </Text>{mission.hint}</Text>
    </View>
    {result==='right'&&<View testID="excel-mission-correct" accessibilityLiveRegion="polite" style={{backgroundColor:'#eef8ee',padding:11,borderRadius:9,gap:7}}>
     <Text style={{color:'#236244',fontSize:14,fontWeight:'900'}}>✓ Odpowiedź pasuje do wyniku kontrolnego.</Text>
     <Text style={{color:'#2d5540',fontSize:13,lineHeight:21}}>{feedbackText}</Text>
     <Text style={{color:'#2d5540',fontSize:13,lineHeight:21}}>{mission.explanation}</Text>
     <Text style={{color:'#735632',fontSize:12,lineHeight:18}}>Błąd, którego unikaj: {mission.mistake}</Text>
    </View>}
   </View>
   <Pressable accessibilityRole="button" accessibilityState={{expanded:showHelp}} onPress={()=>setShowHelp(v=>!v)}
    style={{minHeight:44,alignSelf:'flex-start',justifyContent:'center'}}>
    <Text style={{color:'#265d83',fontWeight:'900',fontSize:13}}>Nie rozumiem? {showHelp?'Ukryj wskazówkę ▴':'Pokaż wskazówkę ▾'}</Text>
   </Pressable>
   {showHelp&&<Text style={{fontSize:14,lineHeight:23,color:'#355848',backgroundColor:'#eaf3ef',padding:12,borderRadius:9}}>{mission.hint}</Text>}
   <Pressable accessibilityRole="button" accessibilityState={{expanded:showReal}} onPress={()=>setShowReal(v=>!v)}
    style={{minHeight:44,alignSelf:'flex-start',justifyContent:'center'}}>
    <Text style={{color:'#265d83',fontWeight:'900',fontSize:13}}>Na prawdziwym Excelu {showReal?'▴':'▾'}</Text>
   </Pressable>
   {showReal&&<View style={{gap:8,padding:13,borderRadius:9,backgroundColor:'#fff',borderWidth:1,borderColor:'#d8e4df'}}>
    <Text style={{color:ink,fontSize:13,lineHeight:22}}>{mission.realExcel}</Text>
    <Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(mission.reference)} style={{minHeight:44,justifyContent:'center'}}>
     <Text style={{color:'#24638a',fontWeight:'800',fontSize:12,textDecorationLine:'underline'}}>Dokumentacja funkcji Microsoft Excel ↗</Text>
    </Pressable>
   </View>}
   <Text style={{color:'#587162',fontSize:11,lineHeight:18}}>To samokontrola: sprawdzamy poprawność wpisanej odpowiedzi, nie obserwujemy faktycznego pliku w Excelu. Zaznaczenie kroków oznacza wykonanie ich według Twojej deklaracji, nie jest automatyczną weryfikacją. Ćwiczenie nie zastępuje egzaminu kursowego ani licencjonowanego Excela.</Text>
  </View>
 </View>;
}