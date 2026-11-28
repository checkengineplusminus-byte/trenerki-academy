import React,{useEffect,useRef,useState} from 'react';
import {View,Text,TextInput,Pressable} from 'react-native';

type Homework={title?:string;instructions:string;self_check?:string};
type Props={lessonNo:number;task:Homework;value:string;onChange:(s:string)=>void;onSave:(draft:string)=>Promise<void>};
const ink='#14263B';
export default function NorwegianNotebook({lessonNo,task,value,onChange,onSave}:Props){
 const [saving,setSaving]=useState(false),[feedback,setFeedback]=useState('');
 const lock=useRef(false),latest=useRef(value);latest.current=value;
 useEffect(()=>{setSaving(false);setFeedback('')},[lessonNo]);
 async function save(){
  if(lock.current)return;
  if(value.trim().length<10){setFeedback('Wpisz przynajmniej jedno pełne zdanie lub kilka kroków rozwiązania.');return;}
  const snapshot=value;lock.current=true;setFeedback('');setSaving(true);
  try{await onSave(snapshot);setFeedback(latest.current===snapshot?'✓ Zadanie zapisano w Twoim zeszycie. Możesz je później poprawić.':'Zapisano wysłaną wersję. Masz nowszy szkic — zapisz go ponownie.');}
  catch{setFeedback('Nie udało się zapisać. Nie zamykaj strony — spróbuj ponownie.');}
  finally{lock.current=false;setSaving(false);}
 }
 return <View testID="norwegian-homework" style={{backgroundColor:'#fffaf0',borderColor:'#e1e5d1',borderWidth:1,borderRadius:16,padding:18,gap:12,marginBottom:15}}>
  <Text style={{fontSize:21,fontWeight:'900',color:ink}}>Mój zeszyt norweskiego · zadanie domowe</Text>
  <Text style={{fontSize:15,lineHeight:24,color:'#43596F'}}>{task.instructions}</Text>
  <Text style={{fontSize:13,lineHeight:21,color:'#53677D'}}>Wpisz własne zdania po norwesku, polskie tłumaczenia i wnioski. Nie musisz pracować na prawdziwej budowie — możesz bezpiecznie odegrać scenkę. To ćwiczenie praktyczne; obowiązkowy quiz jest oceniany osobno.</Text>
  <TextInput testID="norwegian-homework-note" accessibilityLabel="Odpowiedź na zadanie domowe z norweskiego"
   value={value} onChangeText={s=>{latest.current=s;onChange(s);setFeedback('')}} multiline textAlignVertical="top"
   placeholder="NO: ... / PL: ... / co sprawdziłem i co poprawię..." placeholderTextColor="#7a8878"
   style={{backgroundColor:'#fff',borderWidth:1.5,borderColor:'#DCE4ED',borderRadius:12,padding:14,minHeight:144,fontSize:15,lineHeight:24,color:ink}}/>
  <Pressable accessibilityRole="button" onPress={()=>void save()} disabled={saving} style={{backgroundColor:saving?'#748DA2':ink,borderRadius:10,minHeight:44,paddingHorizontal:18,paddingVertical:13,alignSelf:'flex-start'}}>
   <Text style={{fontWeight:'900',color:'#fff'}}>{saving?'Zapisuję…':'Zapisz zadanie domowe'}</Text>
  </Pressable>
  {!!feedback&&<Text accessibilityLiveRegion="polite" style={{color:ink,fontSize:13,fontWeight:'800'}}>{feedback}</Text>}
  {!!task.self_check&&<Text style={{fontSize:13,lineHeight:21,color:'#53677D'}}>Sprawdź samodzielnie: {task.self_check}</Text>}
 </View>;
}
