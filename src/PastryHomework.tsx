import React,{useEffect,useState} from 'react';
import {View,Text,TextInput,Pressable} from 'react-native';

// Independent student worksheet: saved inside the already protected ta_drafts.notes.byLesson.
// It does not grade submissions or alter the mandatory server-verified knowledge checkpoint.
type Task={title?:string;instructions:string;self_check?:string};
type Props={lessonNo:number;task:Task;value:string;onChange:(text:string)=>void;onSave:()=>Promise<void>};
const ink='#183e2d';
export default function PastryHomework({lessonNo,task,value,onChange,onSave}:Props){
 const [saving,setSaving]=useState(false),[status,setStatus]=useState('');
 useEffect(()=>{setSaving(false);setStatus('')},[lessonNo]);
 async function save(){
  if(saving)return;
  if(!value.trim()){setStatus('Najpierw wpisz swoje obliczenia, obserwacje lub wnioski.');return;}
  setSaving(true);setStatus('');
  try{await onSave();setStatus('✓ Zapisano odpowiedź w Twoim notatniku kursu.');}
  catch{setStatus('Nie udało się zapisać. Nie opuszczaj strony — spróbuj ponownie.');}
  finally{setSaving(false);}
 }
 return <View testID="pastry-homework-entry" style={{borderRadius:16,borderColor:'#d6e5d0',borderWidth:1,padding:17,gap:11,marginBottom:18,backgroundColor:'#fffaf1'}}>
  <Text style={{fontWeight:'900',color:ink,fontSize:19}}>Mój zeszyt cukiernika · zadanie domowe</Text>
  <Text style={{fontSize:15,lineHeight:24,color:'#455c47'}}>{task.instructions}</Text>
  <Text style={{fontSize:13,lineHeight:20,color:'#546b55'}}>Wpisz własne rozwiązanie, obliczenia albo obserwacje z ćwiczenia. Możesz wrócić i poprawić notatkę. Zadanie domowe służy praktyce; zaliczenie lekcji następuje po obowiązkowym pytaniu sprawdzającym.</Text>
  <TextInput testID="pastry-homework-note" accessibilityLabel="Moja odpowiedź na zadanie domowe"
   value={value} onChangeText={next=>{onChange(next);setStatus('')}} multiline textAlignVertical="top"
   placeholder="Moje dane, kroki, co się udało, co poprawię następnym razem…"
   placeholderTextColor="#798678"
   style={{borderColor:'#a9c4a3',borderWidth:1.5,borderRadius:11,padding:13,minHeight:140,fontSize:15,lineHeight:24,color:ink,backgroundColor:'white'}} />
  <Pressable accessibilityRole="button" disabled={saving} onPress={()=>void save()}
   style={{alignSelf:'flex-start',backgroundColor:saving?'#76977d':ink,borderRadius:10,paddingVertical:13,paddingHorizontal:19,minHeight:44,justifyContent:'center'}}>
   <Text style={{fontWeight:'900',color:'white'}}>{saving?'Zapisuję…':'Zapisz notatkę'}</Text>
  </Pressable>
  {!!status&&<Text accessibilityLiveRegion="polite" style={{color:ink,fontSize:13,fontWeight:'800'}}>{status}</Text>}
  {!!task.self_check&&<Text style={{fontSize:13,lineHeight:20,color:'#526d58'}}>Przy własnej kontroli: {task.self_check}</Text>}
 </View>;
}
