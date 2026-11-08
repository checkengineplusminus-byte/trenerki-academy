import React,{useEffect,useState} from 'react';
import {View,Text,Image,Pressable,Linking,Platform} from 'react-native';

type Phrase={target:string;polish:string;approx?:string;tip?:string};
type Sound={symbol:string;how:string;example:string};
type Gloss={term:string;meaning:string};
type NumberItem={digit:string;word:string;approx?:string};
type Official={title:string;url:string;note?:string};
type Quiz={question:string;options:string[];correct:number;why:string};
export type ConstructionMaterial={
 country:string;locale:string;level:string;scene:string;story:string;
 steps:string[];phrases:Phrase[];sounds?:Sound[];glossary?:Gloss[];numbers?:NumberItem[];
 roleplay:Quiz;rights?:{label:string;value:string}[];rateDate?:string|null;official?:Official[];
 takeaway?:string;
};
const ink='#193b2d',secondary='#556d5a',light='#edf5e7',cream='#fcfcf7';
const sec={backgroundColor:'#fff',borderColor:'#e0eadc',borderWidth:1,borderRadius:17,padding:20,gap:12} as const;
const front=(t:string)=>String(t).trim();
function Speaker({text,locale}:{text:string;locale:string}){
 const [message,setMessage]=useState('');
 function play(){
  if(Platform.OS!=='web'){setMessage('Dźwięk dostępny w przeglądarce.');return;}
  try{
   const g=globalThis as any;
   if(!g.speechSynthesis||!g.SpeechSynthesisUtterance){setMessage('Ta przeglądarka nie obsługuje czytania na głos.');return;}
   g.speechSynthesis.cancel();
   const utterance=new g.SpeechSynthesisUtterance(text);
   utterance.lang=locale;utterance.rate=0.83;utterance.pitch=1.0;
   const voices=g.speechSynthesis.getVoices()||[];
   const voice=voices.find((v:any)=>v.lang?.toLowerCase()===locale.toLowerCase())||
     voices.find((v:any)=>v.lang?.toLowerCase().startsWith(locale.slice(0,2).toLowerCase()));
   if(voice)utterance.voice=voice;
   utterance.onstart=()=>setMessage('');
   utterance.onerror=(event:any)=>{
    const reason=String(event?.error||'');
    if(reason==='canceled'||reason==='interrupted')return;
    if(['voice-unavailable','language-unavailable','synthesis-unavailable'].includes(reason)){
      setMessage('Brak głosu '+locale+' na tym urządzeniu. Wymowa i podpowiedzi tekstowe pozostają dostępne.');
    }else if(reason==='audio-hardware'||reason==='audio-busy'){
      setMessage('Urządzenie nie może teraz odtwarzać głosu. Sprawdź dźwięk i spróbuj ponownie.');
    }else setMessage('Odsłuch nie działa w tej przeglądarce. Możesz skorzystać z zapisu wymowy obok zwrotu.');
   };
   setMessage('');
   // Przeglądarki ładują głosy asynchronicznie. Nie wybieramy głosu innego języka.
   if(!voices.length&&g.speechSynthesis.addEventListener){
    g.speechSynthesis.addEventListener('voiceschanged',()=>{}, {once:true});
   }
   g.speechSynthesis.resume();g.speechSynthesis.speak(utterance);
  }catch{setMessage('Nie udało się odtworzyć. Spróbuj innej przeglądarki.');}
 }
 return <View style={{alignItems:'flex-end',gap:4}}>
  <Pressable onPress={play} accessibilityLabel={'Odsłuchaj: '+text} style={{borderWidth:1,borderColor:'#b7d4b6',backgroundColor:'#e5f3de',paddingHorizontal:12,paddingVertical:9,borderRadius:10}}>
   <Text style={{fontWeight:'800',color:ink}}>▶ Posłuchaj</Text>
  </Pressable>
  {!!message&&<Text style={{color:'#ad6633',fontSize:10,maxWidth:185,textAlign:'right'}}>{message}</Text>}
 </View>;
}
export default function ConstructionLesson({lesson,identity,onPassed}:{lesson?:ConstructionMaterial,identity?:string,onPassed?:(passed:boolean)=>void}){
 const [selected,setSelected]=useState<number|null>(null);
 useEffect(()=>{setSelected(null);onPassed?.(false)},[identity]);
 if(!lesson)return null;
 const quiz=lesson.roleplay;
 const lessonIndex=Number((identity||'0').split('-').slice(-1)[0])||0;
 const shift=quiz?.options?.length?lessonIndex%quiz.options.length:0;
 const shuffled=(quiz?.options||[]).map((_,i)=>({answer:quiz.options[(i+shift)%quiz.options.length],original:(i+shift)%quiz.options.length}));
 const choiceCorrect=selected!==null&&shuffled[selected]?.original===quiz.correct;
 const picture='/academy/illustrations/'+(['wejscie','bezpieczenstwo','narzedzia','placa','zgloszenie','koniec'].includes(lesson.scene)?lesson.scene:'wejscie')+'.svg';
 return <View style={{gap:17}}>
  <View style={{backgroundColor:'#e9f2e2',borderRadius:18,overflow:'hidden',borderWidth:1,borderColor:'#d5e8ce'}}>
   <Image accessibilityLabel={'Autorska ilustracja placu budowy — '+lesson.scene} source={{uri:picture}} resizeMode="contain" style={{width:'100%',height:230}}/>
   <View style={{paddingHorizontal:20,paddingVertical:16,gap:7}}>
    <Text style={{fontWeight:'900',color:'#57745c',letterSpacing:1.2,fontSize:11}}>{front(lesson.country).toUpperCase()} · OD ZERA</Text>
    <Text style={{fontSize:17,fontWeight:'800',color:ink,lineHeight:26}}>{lesson.story}</Text>
   </View>
  </View>
  {!!lesson.sounds?.length&&<View style={sec}>
   <Text style={{fontWeight:'900',fontSize:22,color:ink}}>Jak czytać te litery?</Text>
   <Text style={{color:secondary,lineHeight:21}}>To proste wskazówki, nie idealny zapis wymowy. Posłuchaj prawdziwego brzmienia, potem powtórz.</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:9}}>
   {lesson.sounds.map((s,i)=><View key={String(i)} style={{minWidth:130,flexGrow:1,flexBasis:'41%',backgroundColor:'#f0f5eb',borderRadius:12,padding:14,gap:7}}>
    <Text style={{fontSize:23,fontWeight:'900',color:ink}}>{s.symbol}</Text>
    <Text style={{color:ink,fontWeight:'700'}}>{s.how}</Text>
    <Text style={{fontSize:12,color:'#557461'}}>{s.example}</Text>
   </View>)}
   </View>
  </View>}
  {!!lesson.numbers?.length&&<View style={sec}>
    <Text style={{fontWeight:'900',fontSize:21,color:ink}}>Liczby na budowie</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
    {lesson.numbers.map((n,i)=><View key={i} style={{backgroundColor:light,borderRadius:12,padding:12,minWidth:86,flexGrow:1,flexBasis:'20%'}}>
     <Text style={{fontSize:20,color:ink,fontWeight:'900'}}>{n.digit}</Text><Text style={{fontSize:13,color:secondary}}>{n.word}</Text><Speaker locale={lesson.locale} text={n.word}/>
    </View>)}
    </View>
  </View>}
  <View style={sec}>
   <Text style={{fontWeight:'900',fontSize:23,color:ink}}>Powiedz to naprawdę na budowie</Text>
   <Text style={{color:secondary,lineHeight:22}}>Naciśnij „Posłuchaj”, powiedz zdanie na głos i sprawdź polskie znaczenie. Nie zaczynamy od technicznego żargonu.</Text>
   {lesson.phrases.map((ph,i)=><View key={i} style={{borderBottomWidth:i===lesson.phrases.length-1?0:1,borderColor:'#e8eee6',paddingVertical:12,gap:6}}>
    <View style={{flexDirection:'row',gap:9,alignItems:'center',justifyContent:'space-between'}}>
     <Text style={{fontSize:18,fontWeight:'900',color:ink,flex:1,lineHeight:27}}>{ph.target}</Text>
     <Speaker text={ph.target} locale={lesson.locale}/>
    </View>
    <Text style={{fontSize:15,color:'#47644c'}}>{ph.polish}</Text>
    {!!ph.approx&&<Text style={{fontSize:12,color:'#688471'}}>W przybliżeniu: {ph.approx}</Text>}
   </View>)}
  </View>
  {!!lesson.glossary?.length&&<View style={sec}>
   <Text style={{fontWeight:'900',fontSize:22,color:ink}}>Co oznaczają te słowa?</Text>
   {lesson.glossary.map((g,i)=><View key={i} style={{borderBottomWidth:i===lesson.glossary!.length-1?0:1,borderColor:'#e4ece3',paddingVertical:9,gap:5}}>
    <Text style={{fontWeight:'900',fontSize:17,color:ink}}>{g.term}</Text>
    <Text style={{color:secondary,lineHeight:23}}>{g.meaning}</Text>
   </View>)}
  </View>}
  {!!lesson.rights?.length&&<View style={{...sec,backgroundColor:'#eaf4e6'}}>
   <Text style={{fontSize:22,fontWeight:'900',color:ink}}>Pieniądze i prawa pracownika</Text>
   {lesson.rights.map((r,i)=><View key={i} style={{paddingVertical:8,borderBottomWidth:i===lesson.rights!.length-1?0:1,borderColor:'#d0e0cd',flexDirection:'row',gap:10,justifyContent:'space-between',alignItems:'center'}}>
    <Text style={{color:ink,flex:1,fontSize:14}}>{r.label}</Text>
    <Text style={{fontWeight:'900',color:ink,fontSize:16}}>{r.value}</Text>
   </View>)}
   {!!lesson.rateDate&&<Text style={{fontSize:12,color:'#657762',lineHeight:21}}>{lesson.rateDate}</Text>}
  </View>}
  {!!lesson.steps?.length&&<View style={sec}>
   <Text style={{fontWeight:'900',fontSize:21,color:ink}}>Spróbuj krok po kroku</Text>
   {lesson.steps.map((s,i)=><View key={i} style={{flexDirection:'row',gap:12,alignItems:'flex-start',paddingVertical:5}}>
    <View style={{height:31,width:31,borderRadius:16,backgroundColor:'#daf0d3',alignItems:'center',justifyContent:'center'}}><Text style={{fontWeight:'900',color:ink}}>{i+1}</Text></View>
    <Text style={{fontSize:15,color:secondary,lineHeight:23,flex:1}}>{s}</Text>
   </View>)}
  </View>}
  {!!quiz&&<View style={{backgroundColor:'#193b2d',padding:20,borderRadius:18,gap:12}}>
   <Text style={{fontSize:12,color:'#bfe6b0',fontWeight:'900',letterSpacing:1}}>Z ŻYCIA BUDOWY · MAŁA SYMULACJA</Text>
   <Text style={{fontSize:20,color:'white',fontWeight:'900',lineHeight:28}}>{quiz.question}</Text>
   {shuffled.map(({answer,original},i)=><Pressable key={i} onPress={()=>{setSelected(i);onPassed?.(original===quiz.correct)}} style={{padding:14,borderRadius:12,backgroundColor:selected===i?(original===quiz.correct?'#d5edc8':'#fff0d8'):'#f1f6ee',borderWidth:selected===i?2:0,borderColor:selected===i?(original===quiz.correct?'#80b177':'#bd8643'):'transparent'}}>
    <Text style={{color:ink,fontWeight:'800',lineHeight:21}}>{String.fromCharCode(65+i)}. {answer}</Text>
   </Pressable>)}
   {selected!==null&&<View style={{backgroundColor:choiceCorrect?'#d4ead2':'#fff0d9',padding:13,borderRadius:11}}>
    <Text style={{color:ink,fontWeight:'900'}}>{choiceCorrect?'Świetnie — to bezpieczna odpowiedź.':'Spróbuj jeszcze raz. To ważne.'}</Text>
    <Text style={{color:'#4e5f4d',marginTop:5,lineHeight:21}}>{quiz.why}</Text>
   </View>}
  </View>}
  {!!lesson.official?.length&&<View style={{...sec,backgroundColor:cream}}>
   <Text style={{fontWeight:'900',fontSize:21,color:ink}}>Gdzie sprawdzić to w urzędzie?</Text>
   <Text style={{fontSize:13,color:secondary}}>Otworzysz oficjalną stronę danego kraju. Stawki i przepisy mogą się zmienić.</Text>
   {lesson.official.filter(x=>/^https:\/\//.test(x.url)).map((o,i)=><Pressable key={i} onPress={()=>Linking.openURL(o.url)} accessibilityRole="link" style={{borderWidth:1,borderColor:'#d5e4d0',borderRadius:12,padding:14,gap:5,backgroundColor:'white'}}>
    <Text style={{fontWeight:'900',color:'#285c42'}}>{o.title} ↗</Text>
    {!!o.note&&<Text style={{fontSize:13,color:secondary,lineHeight:21}}>{o.note}</Text>}
   </Pressable>)}
  </View>}
  {!!lesson.takeaway&&<Text style={{fontSize:14,color:secondary,fontWeight:'700',lineHeight:22,padding:9}}>{lesson.takeaway}</Text>}
 </View>;
}
