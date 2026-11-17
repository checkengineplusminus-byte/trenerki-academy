import React,{useEffect,useMemo,useState} from 'react';
import {View,Text,TextInput,Pressable,Platform} from 'react-native';

export type NorwegianWord={norwegian:string;polish:string;example:string;translation:string;note?:string};
export type NorwegianBridgeData={title?:string;words:NorwegianWord[];traps?:NorwegianWord[];review_sources?:string[]};
type Props={data:NorwegianBridgeData;lessonNo:number};
const ink='#183b2b',muted='#536c59';

export default function NorwegianWordBridge({data,lessonNo}:Props){
 const [open,setOpen]=useState(false),[search,setSearch]=useState(''),[showPolish,setShowPolish]=useState(true);
 const [showTraps,setShowTraps]=useState(false),[audioMessage,setAudioMessage]=useState('');
 useEffect(()=>{setOpen(false);setSearch('');setShowPolish(true);setShowTraps(false);setAudioMessage('')},[lessonNo]);
 const words=Array.isArray(data?.words)?data.words:[];
 const matches=useMemo(()=>words.filter(w=>{
  const q=search.toLocaleLowerCase('pl').trim();
  return !q||[w.norwegian,w.polish,w.example,w.translation].some(t=>String(t).toLocaleLowerCase('pl').includes(q));
 }),[words,search]);
 const visible=open||search.trim()?matches:matches.slice(0,6);
 const traps=Array.isArray(data?.traps)?data.traps:[];
 function say(t:string){
  if(Platform.OS!=='web'){setAudioMessage('Odsłuch jest dostępny w przeglądarce z norweskim głosem.');return;}
  try{
   const g=globalThis as any,synth=g.speechSynthesis;
   if(!synth||!g.SpeechSynthesisUtterance){setAudioMessage('Przeglądarka nie oferuje odsłuchu. Powtarzaj zapisany przykład.');return;}
   const voices=synth.getVoices?.()||[];
   const voice=voices.find((v:any)=>/^(nb|no|nn)(-|$)/i.test(String(v.lang||'')));
   if(voices.length&&!voice){setAudioMessage('Na urządzeniu nie ma głosu norweskiego. Spróbuj przycisków odsłuchu zdań w lekcji.');return;}
   synth.cancel();const utterance=new g.SpeechSynthesisUtterance(t);
   utterance.lang='nb-NO';utterance.rate=.82;if(voice)utterance.voice=voice;
   utterance.onerror=()=>setAudioMessage('Odsłuch nie zadziałał w tej przeglądarce. Korzystaj z przykładu tekstowego.');
   synth.speak(utterance);setAudioMessage('');
  }catch{setAudioMessage('Odsłuch chwilowo niedostępny. Zobacz zapis i tłumaczenie.');}
 }
 return <View testID="norwegian-word-bridge" style={{backgroundColor:'#fff',borderColor:'#d9e7d4',borderWidth:1,borderRadius:16,padding:17,gap:11,marginBottom:16}}>
  <Text style={{fontSize:20,fontWeight:'900',color:ink}}>Słowa podobne do polskich</Text>
  <Text style={{fontSize:14,lineHeight:22,color:muted}}>Masz tu {words.length} skojarzeń norwesko-polskich. To pomoc pamięciowa, nie gwarancja identycznego znaczenia ani wymowy. Kliknij „Posłuchaj”, powtórz całe zdanie i sprawdź przekład.</Text>
  <TextInput testID="norwegian-word-search" accessibilityLabel="Szukaj podobnego słowa"
   placeholder="Szukaj: kollega, akkurat, problem…" placeholderTextColor="#809185"
   value={search} onChangeText={setSearch}
   style={{backgroundColor:'#f6faf4',borderRadius:10,borderWidth:1,borderColor:'#c5d7c1',paddingHorizontal:13,paddingVertical:12,fontSize:15,color:ink,minHeight:46}}/>
  <Pressable accessibilityRole="button" onPress={()=>setShowPolish(v=>!v)} style={{alignSelf:'flex-start',paddingVertical:9,paddingHorizontal:12,borderRadius:9,borderWidth:1,borderColor:'#ccdccc'}}>
   <Text style={{fontWeight:'800',color:ink}}>{showPolish?'Zakryj polskie znaczenia — sprawdź się':'Pokaż polskie znaczenia'}</Text>
  </Pressable>
  {visible.map((w,i)=><View testID="norwegian-word-row" key={w.norwegian} style={{paddingVertical:11,borderTopWidth:1,borderTopColor:'#e8efe4',gap:6}}>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
    <Text style={{fontSize:17,fontWeight:'900',color:ink,flex:1}}>{w.norwegian}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={'Posłuchaj słowa '+w.norwegian} onPress={()=>say(w.example||w.norwegian)}
     style={{paddingVertical:8,paddingHorizontal:10,borderRadius:9,backgroundColor:'#e8f3e3'}}>
     <Text style={{fontSize:12,fontWeight:'800',color:ink}}>▶ Posłuchaj</Text>
    </Pressable>
   </View>
   {showPolish&&<Text style={{fontSize:15,fontWeight:'800',color:'#3c6948'}}>{w.polish}</Text>}
   <Text style={{fontSize:14,lineHeight:21,color:'#3b5040'}}>{w.example}</Text>
   {showPolish&&<Text style={{fontSize:13,lineHeight:20,color:muted}}>PL: {w.translation}</Text>}
   {!!w.note&&<Text style={{fontSize:13,lineHeight:20,color:'#76563f'}}>{w.note}</Text>}
  </View>)}
  {matches.length===0&&<Text style={{color:muted}}>Nie znaleziono słowa. Spróbuj innego początku.</Text>}
  {!search.trim()&&words.length>6&&<Pressable accessibilityRole="button" onPress={()=>setOpen(v=>!v)} style={{padding:12,borderRadius:11,backgroundColor:'#e8f2e4',alignItems:'center'}}>
   <Text style={{fontWeight:'900',color:ink}}>{open?'Zwiń listę słów':'Pokaż całą listę: '+words.length+' słów'}</Text>
  </Pressable>}
  {!!traps.length&&<View testID="norwegian-false-friends" style={{borderTopWidth:1,borderTopColor:'#dfebd7',paddingTop:13,gap:9}}>
   <Text style={{fontSize:18,fontWeight:'900',color:ink}}>Pułapki — podobnie brzmi, inaczej znaczy</Text>
   {(showTraps?traps:traps.slice(0,3)).map(t=><View key={t.norwegian} style={{gap:3,backgroundColor:'#f9f4eb',borderRadius:9,padding:11}}>
    <Text style={{fontWeight:'900',color:ink,fontSize:15}}>{t.norwegian} — {t.polish}</Text>
    <Text style={{fontSize:13,color:muted,lineHeight:20}}>{t.example} · {t.translation}</Text>
    {!!t.note&&<Text style={{color:'#815d42',fontSize:13,lineHeight:21}}>{t.note}</Text>}
   </View>)}
   {traps.length>3&&<Pressable accessibilityRole="button" onPress={()=>setShowTraps(v=>!v)} style={{alignSelf:'flex-start',paddingVertical:9,paddingHorizontal:12}}>
    <Text style={{fontWeight:'900',color:ink}}>{showTraps?'Zwiń pułapki':'Pokaż wszystkie '+traps.length+' pułapek'}</Text>
   </Pressable>}
  </View>}
  {!!audioMessage&&<Text accessibilityLiveRegion="polite" style={{fontSize:13,color:'#845f36'}}>{audioMessage}</Text>}
 </View>;
}
