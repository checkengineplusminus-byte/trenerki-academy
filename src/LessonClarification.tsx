import React,{useEffect,useState} from 'react';
import {View,Text,Pressable} from 'react-native';
import {supabase} from './supabase';

// Explanations are optional, read-only supplements to the paid lesson.
// RLS checks enrollment and that this note was checked against the CURRENT
// original lesson revision. Grades, exams and course progress are unchanged.
export default function LessonClarification({courseSlug,lessonNo}:{
 courseSlug:string;lessonNo:number
}){
 const [note,setNote]=useState('');
 const [open,setOpen]=useState(true);
 useEffect(()=>{
  let active=true;setNote('');setOpen(true);
  void supabase.from('ta_lesson_clarifications').select('note')
   .eq('course_slug',courseSlug).eq('lesson_no',lessonNo).eq('status','active')
   .maybeSingle().then(({data,error})=>{
    if(active&&!error&&data?.note&&typeof data.note==='string')
     setNote(data.note.slice(0,750));
   });
  return ()=>{active=false};
 },[courseSlug,lessonNo]);
 if(!note)return null;
 return <View testID="anielka-auto-clarification" style={{
  borderLeftWidth:4,borderLeftColor:'#75ac85',borderRadius:12,
  backgroundColor:'#EFF3F8',padding:15,marginVertical:12,gap:8
 }}>
  <Pressable accessibilityRole="button" accessibilityState={{expanded:open}}
   onPress={()=>setOpen(v=>!v)}>
   <Text style={{color:'#2C587B',fontWeight:'900',fontSize:15}}>
    Anielka wyjaśnia jeszcze prościej {open?'↑':'↓'}
   </Text>
  </Pressable>
  {open&&<Text style={{color:'#2C587B',fontSize:15,lineHeight:24}}>{note}</Text>}
  {open&&<Text style={{color:'#53677D',fontSize:11,lineHeight:18}}>
   Dodatkowa podpowiedź SI oparta na materiale tej lekcji. Jeśli coś nadal jest niejasne, napisz do Anielki poniżej.
  </Text>}
 </View>;
}
