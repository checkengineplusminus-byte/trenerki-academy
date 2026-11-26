import React,{useState} from 'react';
import {Pressable,Text,View} from 'react-native';

type Signal={label:string;before:string;after:string};
type Answer={label:string;feedback:string;correct:boolean};
export type Experiment={title:string;prompt:string;signals:Signal[];answers:Answer[];explanation:string};

const ink='#142F48',muted='#43596C';
export default function LessonExperiment({experiment}:{experiment:Experiment}){
 const [answer,setAnswer]=useState<number|null>(null);
 const [after,setAfter]=useState(false);
 if(!experiment?.signals?.length||!experiment?.answers?.length)return null;
 return <View testID="lesson-experiment" style={{gap:12,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#BDCCD8',borderRadius:14,padding:18,marginBottom:16}}>
  <Text accessibilityRole="header" style={{color:ink,fontSize:21,fontWeight:'800'}}>{experiment.title}</Text>
  <Text style={{color:muted,fontSize:16,lineHeight:24}}>{experiment.prompt}</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
   {experiment.signals.map(signal=>{
    const changed=after&&signal.after!==signal.before;
    return <View key={signal.label} style={{minWidth:85,flexBasis:110,flexGrow:1,gap:4,padding:10,borderRadius:8,borderWidth:1,borderColor:changed?'#AA781E':'#CBDAE4',backgroundColor:changed?'#FFF4D4':'#F2F6F9'}}>
     <Text style={{color:muted,fontSize:13,fontWeight:'700'}}>{signal.label}</Text>
     <Text key={String(after)} testID={changed?'experiment-changed-value':undefined} style={{color:ink,fontSize:19,fontWeight:'800'}}>{after?signal.after:signal.before}</Text>
    </View>;
   })}
  </View>
  {experiment.answers.map((choice,i)=><Pressable key={i} accessibilityRole="button" accessibilityState={{selected:answer===i}} onPress={()=>{setAnswer(i);setAfter(true);}}
   style={{minHeight:44,paddingVertical:10,paddingHorizontal:14,justifyContent:'center',borderRadius:8,borderWidth:1,borderColor:answer===i?ink:'#BDCCD8',backgroundColor:answer===i?'#EAF1F6':'white'}}>
    <Text style={{color:ink,fontSize:15,fontWeight:'700'}}>{choice.label}</Text>
  </Pressable>)}
  {answer!==null&&<>
   <View accessibilityLiveRegion="polite" style={{gap:6,borderLeftWidth:3,borderLeftColor:'#B48027',paddingLeft:12}}>
    <Text style={{fontSize:15,color:ink,fontWeight:'800'}}>{experiment.answers[answer].correct?'Trafione.':'Sprawdź różnicę.'} {experiment.answers[answer].feedback}</Text>
    <Text style={{color:muted,fontSize:15,lineHeight:23}}>{experiment.explanation}</Text>
   </View>
   <Pressable accessibilityRole="button" onPress={()=>setAfter(v=>!v)} style={{minHeight:44,justifyContent:'center',alignSelf:'flex-start',paddingHorizontal:8}}>
    <Text style={{color:ink,fontWeight:'800'}}>{after?'Pokaż stan początkowy':'Powtórz zmianę'}</Text>
   </Pressable>
  </>}
 </View>;
}
