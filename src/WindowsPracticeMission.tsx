import React,{useEffect,useState} from 'react';
import {Linking,Pressable,Text,TextInput,View,useWindowDimensions} from 'react-native';
import workbook from '../content/windows-practice-missions.json';

type Mission=(typeof workbook.lessons)[number];
const ink='#173e2d',gray='#52685c',line='#d6e3d9';
const initialNote='';
function Step({index,label,done,onPress}:{index:number;label:string;done:boolean;onPress:()=>void}){
 return <Pressable onPress={onPress} onKeyDown={(event:any)=>{if((event.key||event.nativeEvent?.key)===' '){event.preventDefault?.();event.stopPropagation?.();onPress();}}} accessibilityRole="checkbox" accessibilityState={{checked:done}} aria-checked={done}
  accessibilityLabel={'Krok '+(index+1)+': '+label}
  style={{flexDirection:'row',gap:11,alignItems:'flex-start',borderWidth:1,borderColor:done?'#a6d2b1':'#e0e9e3',backgroundColor:done?'#eff9ef':'#fff',padding:11,borderRadius:10,minHeight:48}}>
   <Text style={{fontSize:18,color:done?'#1c7942':'#668072',fontWeight:'900'}}>{done?'☑':'□'}</Text>
   <View style={{flex:1,gap:3}}>
    <Text style={{fontWeight:'800',color:ink,fontSize:14}}>Krok {index+1}</Text>
    <Text style={{fontSize:14,color:'#325443',lineHeight:21}}>{label}</Text>
   </View>
 </Pressable>;
}
export default function WindowsPracticeMission({lessonNo}:{lessonNo:number}){
 const {width}=useWindowDimensions(),compact=width<640;
 const mission:Mission|undefined=workbook.lessons.find(item=>item.lesson_no===lessonNo);
 const [expanded,setExpanded]=useState(true),[mode,setMode]=useState<'workshop'|'computer'>('workshop');
 const [checked,setChecked]=useState<number[]>([]),[note,setNote]=useState(initialNote),[showCriterion,setShowCriterion]=useState(false);
 const [message,setMessage]=useState('');
 useEffect(()=>{setChecked([]);setNote('');setShowCriterion(false);setExpanded(true);setMode('workshop');setMessage('');},[lessonNo]);
 if(!mission)return null;
 function checkStep(i:number){setChecked(prev=>prev.includes(i)?prev.filter(v=>v!==i):[...prev,i]);setShowCriterion(false);setMessage('');}
 function compare(){
  if(note.trim().length<15){setMessage('Najpierw opisz własnymi słowami efekt zadania (minimum 15 znaków). Nie wpisuj danych osobowych.');return;}
  setShowCriterion(true);
  setMessage(checked.length===mission.steps.length
   ?'Porównaj swój opis z kryterium. Jest to samokontrola, nie automatyczne zaliczenie.'
   :'Możesz porównać odpowiedź, ale część kroków nadal pozostaje do przećwiczenia.');
 }
 return <View testID={'windows-mission-'+lessonNo} style={{borderWidth:1,borderColor:'#bed7c7',backgroundColor:'#f4faf5',borderRadius:17,overflow:'hidden',gap:0,marginTop:7}}>
  <Pressable onPress={()=>setExpanded(v=>!v)} accessibilityRole="button" accessibilityState={{expanded}} accessibilityLabel={'Otwórz zadanie praktyczne lekcji '+(lessonNo+1)}
   style={{padding:15,backgroundColor:'#e4f2e8',gap:6,minHeight:62}}>
   <Text style={{fontSize:11,fontWeight:'900',color:'#326e49'}}>PRAKTYKA ZAWODOWA · LEKCJA {lessonNo+1}/30 · {checked.length}/{mission.steps.length} KROKI</Text>
   <Text style={{fontSize:compact?17:19,fontWeight:'900',color:ink}}>{mission.goal} {expanded?'▴':'▾'}</Text>
   <Text style={{fontSize:12,color:'#4d725c'}}>{mission.persona}</Text>
  </Pressable>
  {expanded&&<View style={{padding:compact?12:17,gap:14}}>
   {lessonNo===0&&<View testID="windows-start-from-zero-hint" style={{borderLeftWidth:4,borderColor:'#6b9776',backgroundColor:'#fffef6',borderRadius:8,padding:12,gap:4}}>
    <Text style={{fontSize:14,color:ink,fontWeight:'900'}}>Pierwszy raz w życiu przy komputerze?</Text>
    <Text style={{fontSize:13,lineHeight:21,color:'#425b47'}}>Nie musisz znać słowa „Start” ani umieć korzystać z myszy. W pracowni Windows poniżej wybierz „Rozpocznij naukę od zera”. Przejdziemy przez każde kliknięcie, a na końcu odnajdziesz samodzielnie zapisany dokument.</Text>
   </View>}
   <View style={{backgroundColor:'#fff',borderRadius:12,padding:13,gap:7,borderWidth:1,borderColor:line}}>
    <Text style={{fontSize:12,color:'#43845b',fontWeight:'900'}}>SYTUACJA Z PRAWDZIWEJ PRACY</Text>
    <Text style={{fontSize:15,lineHeight:23,fontWeight:'700',color:ink}}>{mission.scenario}</Text>
   </View>
   <View style={{flexDirection:'row',gap:9,flexWrap:'wrap'}}>
    <Pressable accessibilityRole="button" accessibilityState={{selected:mode==='workshop'}} onPress={()=>setMode('workshop')}
      style={{flex:1,minWidth:145,padding:11,minHeight:46,borderRadius:10,backgroundColor:mode==='workshop'?'#245f3c':'#fff',borderWidth:1,borderColor:mode==='workshop'?'#245f3c':'#bad3c2'}}>
     <Text style={{fontSize:13,fontWeight:'900',textAlign:'center',color:mode==='workshop'?'#fff':ink}}>① Nauka i symulacja</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityState={{selected:mode==='computer'}} onPress={()=>setMode('computer')}
      style={{flex:1,minWidth:145,padding:11,minHeight:46,borderRadius:10,backgroundColor:mode==='computer'?'#245f3c':'#fff',borderWidth:1,borderColor:mode==='computer'?'#245f3c':'#bad3c2'}}>
     <Text style={{fontSize:13,fontWeight:'900',textAlign:'center',color:mode==='computer'?'#fff':ink}}>② Na moim komputerze</Text>
    </Pressable>
   </View>
   <View style={{backgroundColor:'#ecf5ff',padding:12,borderRadius:9,gap:5}}>
    <Text style={{fontSize:13,color:'#245176',fontWeight:'900'}}>{mode==='workshop'?'Ćwicz bezpiecznie w Trenerki':'Wykonaj to rzeczywiście w Windows'}</Text>
    <Text style={{fontSize:13,lineHeight:20,color:'#335b78'}}>
     {mode==='workshop'
       ?'Przejdź przez kroki, korzystając z instrukcji i ćwiczebnego pulpitu/eksploratora na tej stronie, jeśli odtwarza daną funkcję. Funkcje bezpieczeństwa, chmury i systemu sprawdzaj opisowo; nie są tu prawdziwie wykonywane.'
       :mission.real_pc}
    </Text>
   </View>
   <Text style={{fontSize:15,color:ink,fontWeight:'900'}}>Wykonaj i sprawdź kolejne kroki</Text>
   <View style={{gap:8}}>{mission.steps.map((step,i)=><Step key={i} index={i} label={step} done={checked.includes(i)} onPress={()=>checkStep(i)}/>)}</View>
   <View style={{gap:8}}>
    <Text style={{fontWeight:'900',fontSize:14,color:ink}}>Co faktycznie zobaczyłeś lub uzyskałeś?</Text>
    <TextInput testID={'windows-mission-note-'+lessonNo} accessibilityLabel="Moja odpowiedź po ćwiczeniu"
      value={note} onChangeText={value=>{setNote(value);setShowCriterion(false);setMessage('');}} multiline
      placeholder="Opisz wynik własnymi słowami, bez nazwisk, haseł ani dokumentów klientów…"
      placeholderTextColor="#788e80" style={{borderWidth:1,borderColor:'#bed4c4',borderRadius:10,minHeight:95,backgroundColor:'#fff',color:ink,padding:12,fontSize:14,textAlignVertical:'top'}}/>
    <Pressable onPress={compare} accessibilityRole="button" accessibilityLabel="Porównaj moje rozwiązanie z kryterium"
      style={{backgroundColor:'#275b3a',padding:14,borderRadius:11,alignItems:'center',minHeight:46,justifyContent:'center'}}>
     <Text style={{fontSize:14,fontWeight:'900',color:'#fff'}}>Porównaj rozwiązanie z kryterium</Text>
    </Pressable>
   </View>
   {!!message&&<Text testID="windows-mission-feedback" accessibilityLiveRegion="polite" style={{fontSize:13,lineHeight:20,color:ink}}>{message}</Text>}
   {showCriterion&&<View testID="windows-mission-criterion" style={{padding:13,borderWidth:1,borderColor:'#b6d7c0',borderRadius:11,backgroundColor:'#fff',gap:8}}>
    <Text style={{fontWeight:'900',color:'#226442',fontSize:14}}>Oczekiwany wynik — porównaj, nie zgaduj</Text>
    <Text style={{color:ink,fontSize:14,lineHeight:23}}>{mission.evidence}</Text>
    <Text style={{fontWeight:'900',color:'#8b5d2f',fontSize:13}}>Błąd, którego musisz uniknąć</Text>
    <Text style={{color:'#6d512f',fontSize:13,lineHeight:21}}>{mission.pitfall}</Text>
    <Text style={{color:gray,fontSize:11,lineHeight:18}}>To samokontrola. Trenerki nie może stwierdzić, czy czynność została wykonana na Twoim komputerze. Wynik egzaminu jest weryfikowany oddzielnie.</Text>
   </View>}
   <Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(mission.source)}
     style={{minHeight:44,justifyContent:'center',alignSelf:'flex-start',paddingVertical:6}}>
     <Text style={{fontSize:12,fontWeight:'800',color:'#245f8e',textDecorationLine:'underline'}}>Sprawdź odpowiednie wskazówki w dokumentacji Microsoft ↗</Text>
   </Pressable>
   <Text style={{fontSize:11,color:'#597365',lineHeight:18}}>Pracuj na danych testowych. Twoja odpowiedź w tym polu nie jest wysyłana ani zapisywana jako zaliczenie; skopiuj ją do notatnika kursu, jeśli chcesz ją zachować.</Text>
  </View>}
 </View>;
}
