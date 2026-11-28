import React,{useEffect,useRef,useState} from 'react';
import {View,Text,TextInput,Pressable} from 'react-native';

// Common workbook for existing courses. The student's answer is stored in
// ta_drafts.notes.byLesson, protected by course ownership and user_id RLS.
// This adds practical learning without modifying server-validated quizzes.
export type CourseHomework={title?:string;instructions:string;self_check?:string;review_status?:string};
type Props={lessonNo:number;title:string;tips?:string[];homework:CourseHomework;
 value:string;onChange:(next:string)=>void;onSave:(draft:string)=>Promise<void>};
const ink='#14263B',secondary='#53677D';
export default function CourseLessonExtras({lessonNo,title,tips,homework,value,onChange,onSave}:Props){
 const [saving,setSaving]=useState(false),[message,setMessage]=useState('');
 const lock=useRef(false),latest=useRef(value);latest.current=value;
 useEffect(()=>{setSaving(false);setMessage('');},[lessonNo,title]);
 async function save(){
  if(lock.current)return;
  const draft=value;
  if(draft.trim().length<10){setMessage('Zapisz przynajmniej jedno pełne zdanie, działanie lub obliczenie.');return;}
  lock.current=true;setSaving(true);setMessage('');
  try{await onSave(draft);setMessage(latest.current===draft?'✓ Zapisano zadanie w prywatnym zeszycie. Możesz wrócić i je poprawić.':'Zapisano wysłaną wersję. Masz nowszy szkic — zapisz go ponownie.');}
  catch{setMessage('Nie udało się zapisać. Sprawdź połączenie i spróbuj ponownie.');}
  finally{lock.current=false;setSaving(false);}
 }
 const visibleTips=(tips||[]).filter(t=>typeof t==='string'&&t.trim().length>20).slice(0,4);
 return <View testID="general-lesson-extras" style={{gap:15,marginVertical:12}}>
  {!!visibleTips.length&&<View testID="general-lesson-tips" style={{padding:17,borderRadius:16,borderWidth:1,borderColor:'#DCE4ED',backgroundColor:'#EFF3F8',gap:10}}>
   <Text style={{fontSize:20,fontWeight:'900',color:ink}}>Wskazówki do tej lekcji</Text>
   {visibleTips.map((tip,i)=><View key={i} style={{flexDirection:'row',gap:11,alignItems:'flex-start'}}>
    <View style={{width:27,height:27,borderRadius:14,backgroundColor:'#EFF3F8',alignItems:'center',justifyContent:'center'}}>
     <Text style={{fontSize:13,fontWeight:'900',color:ink}}>{i+1}</Text>
    </View>
    <Text style={{flex:1,fontSize:14,lineHeight:23,color:secondary}}>{tip.replace(/^\s*\d{1,3}[.)–-]\s*/u,'')}</Text>
   </View>)}
  </View>}
  <View testID="general-lesson-homework" style={{padding:18,borderRadius:16,borderWidth:1,borderColor:'#e3e1cb',backgroundColor:'#fffaf0',gap:12}}>
   <Text style={{fontSize:21,lineHeight:28,fontWeight:'900',color:ink}}>Zadanie domowe — mój zeszyt</Text>
   <Text style={{fontSize:15,lineHeight:24,color:'#43596F'}}>{homework.instructions}</Text>
   <Text style={{fontSize:13,lineHeight:21,color:secondary}}>Zapisz swoje rozwiązanie, obliczenia lub wnioski. Możesz użyć bezpiecznej symulacji. Zeszyt jest prywatny. Pytanie kontrolne w lekcji jest sprawdzane osobno.</Text>
   <TextInput testID="general-lesson-homework-note" accessibilityLabel="Moje rozwiązanie zadania domowego"
    placeholder="Moje dane, rozwiązanie, sprawdzenie i wnioski..." placeholderTextColor="#49647A"
    value={value} onChangeText={text=>{latest.current=text;onChange(text);setMessage('');}}
    multiline textAlignVertical="top" style={{minHeight:143,backgroundColor:'white',color:ink,borderColor:'#DCE4ED',borderWidth:1.5,borderRadius:11,padding:13,fontSize:15,lineHeight:23}}/>
   <Pressable testID="general-lesson-homework-save" accessibilityRole="button" disabled={saving}
    onPress={()=>void save()} style={{backgroundColor:saving?'#748DA2':ink,borderRadius:10,minHeight:46,paddingVertical:13,paddingHorizontal:18,alignSelf:'flex-start',justifyContent:'center'}}>
    <Text style={{fontWeight:'900',fontSize:15,color:'white'}}>{saving?'Zapisuję…':'Zapisz zadanie domowe'}</Text>
   </Pressable>
   {!!message&&<Text accessibilityLiveRegion="polite" style={{fontSize:13,lineHeight:20,fontWeight:'800',color:ink}}>{message}</Text>}
   {!!homework.self_check&&<View style={{padding:12,backgroundColor:'#EFF3F8',borderRadius:10,gap:4}}>
    <Text style={{fontSize:13,fontWeight:'900',color:ink}}>Samokontrola po wykonaniu</Text>
    <Text style={{fontSize:13,lineHeight:22,color:secondary}}>{homework.self_check}</Text>
   </View>}
  </View>
 </View>;
}
