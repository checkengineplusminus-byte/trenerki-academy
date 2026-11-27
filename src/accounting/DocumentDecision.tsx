import React, {useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View} from 'react-native';

type Entry = {label:string; value:string};
type Decision = {
  title:string; scene:string; document:string; rows:Entry[]; question:string;
  options:string[]; feedback:string[]; correct:number; clue:number; curiosity:string;
};

function valid(value:unknown): value is Decision {
  if (!value || typeof value!=='object') return false;
  const v=value as Decision;
  return [v.title,v.scene,v.document,v.question,v.curiosity].every(x=>typeof x==='string'&&x.length>0)
    && Array.isArray(v.rows) && v.rows.length>1 && v.rows.every(r=>r && typeof r.label==='string' && typeof r.value==='string')
    && [v.options,v.feedback].every(a=>Array.isArray(a)&&a.length===2&&a.every(x=>typeof x==='string'&&x.length>0))
    && [0,1].includes(v.correct) && Number.isInteger(v.clue) && v.clue>=0 && v.clue<v.rows.length;
}

export function DocumentDecision({value}:{value:unknown}) {
  const [choice,setChoice]=useState<number|null>(null);
  const [reduced,setReduced]=useState(true);
  const fade=useRef(new Animated.Value(1)).current;
  useEffect(()=>{
    let alive=true,updated=false;
    const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',flag=>{updated=true;setReduced(flag);});
    AccessibilityInfo.isReduceMotionEnabled().then(flag=>{if(alive&&!updated)setReduced(flag);}).catch(()=>{});
    return ()=>{alive=false;sub.remove();};
  },[]);
  useEffect(()=>{
    if(choice===null||reduced){fade.setValue(1);return;}
    fade.setValue(0);
    const animation=Animated.timing(fade,{toValue:1,duration:260,useNativeDriver:false});
    animation.start();
    return ()=>animation.stop();
  },[choice,reduced,fade]);
  if(!valid(value))return null;
  const solved=choice===value.correct;
  return <View style={s.panel}>
    <Text style={s.kicker}>SYTUACJA Z PRAKTYKI</Text>
    <Text accessibilityRole="header" style={s.title}>{value.title}</Text>
    <Text style={s.body}>{value.scene}</Text>
    <View style={s.paper}>
      <Text style={s.docTitle}>{value.document}</Text>
      {value.rows.map((row,i)=>{
        const highlighted=choice!==null&&i===value.clue;
        return <View key={i} style={[s.line,highlighted&&s.clue]}>
          <Text style={s.field}>{row.label}</Text><Text style={s.amount}>{row.value}</Text>
          {highlighted&&<Text style={s.marker}>Wskazówka do decyzji</Text>}
        </View>;
      })}
    </View>
    <Text style={s.question}>{value.question}</Text>
    {value.options.map((option,i)=><Pressable key={i} accessibilityRole="button" accessibilityState={{selected:choice===i}} aria-pressed={choice===i}
      onPress={()=>setChoice(i)} style={[s.option,choice===i&&s.selected]}>
      <Text style={[s.optionText,choice===i&&s.selectedText]}>{option}</Text></Pressable>)}
    {choice!==null&&<Animated.View accessibilityLiveRegion="polite" style={[s.feedback,{opacity:fade,transform:[{translateY:fade.interpolate({inputRange:[0,1],outputRange:[5,0]})}]}]}>
      <Text style={s.question}>{solved?'Trafna decyzja':'Spójrz na zaznaczony wiersz'}</Text>
      <Text style={s.body}>{value.feedback[choice]}</Text>
      {solved&&<Text style={s.fact}><Text style={s.question}>Ciekawostka. </Text>{value.curiosity}</Text>}
    </Animated.View>}
  </View>;
}

const s=StyleSheet.create({
  panel:{backgroundColor:'#FFFFFF',borderColor:'#CAD5DB',borderWidth:1,borderRadius:16,padding:17,gap:10},
  kicker:{fontSize:11,fontWeight:'800',letterSpacing:1.2,color:'#765116'},
  title:{fontSize:22,lineHeight:28,fontWeight:'800',color:'#17344A'},body:{color:'#364E5C',fontSize:16,lineHeight:24},
  paper:{backgroundColor:'#FBF8EF',padding:14,borderRadius:6,borderLeftWidth:4,borderColor:'#C49A52',marginVertical:3},
  docTitle:{fontWeight:'800',fontSize:15,color:'#3F3C34',marginBottom:7},
  line:{flexDirection:'row',alignItems:'baseline',flexWrap:'wrap',gap:5,paddingVertical:8,paddingHorizontal:5,borderTopWidth:1,borderColor:'#DCD6C8'},
  field:{flexGrow:1,color:'#5E584B',fontSize:14},amount:{fontWeight:'700',fontSize:15,color:'#322F29',flexShrink:1},
  clue:{backgroundColor:'#F9E7B8'},marker:{width:'100%',fontWeight:'700',fontSize:12,color:'#634510'},
  question:{fontSize:16,lineHeight:24,fontWeight:'800',color:'#17344A'},
  option:{borderWidth:1,borderColor:'#9DB2BD',borderRadius:9,padding:12,minHeight:46,justifyContent:'center'},
  selected:{backgroundColor:'#21485D',borderColor:'#21485D'},optionText:{fontSize:15,lineHeight:21,fontWeight:'600',color:'#1F4558'},
  selectedText:{color:'#FFFFFF'},feedback:{gap:5,padding:13,backgroundColor:'#F0F5F6',borderRadius:9},
  fact:{marginTop:7,color:'#344D5B',fontSize:15,lineHeight:23}
});
