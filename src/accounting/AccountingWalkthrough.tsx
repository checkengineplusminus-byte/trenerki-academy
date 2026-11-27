import React, {useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View} from 'react-native';

type Frame = {title:string; note:string; amounts:(number|null)[]};
type Demo = {title:string; unit:string; labels:string[]; steps:Frame[]};

function isDemo(value: any): value is Demo {
  if (!value || typeof value.title !== 'string' || typeof value.unit !== 'string' ||
      !Array.isArray(value.labels) || !value.labels.length || !value.labels.every((label:unknown)=>typeof label==='string') ||
      !Array.isArray(value.steps) || value.steps.length < 2) return false;
  return value.steps.every((step:any)=>step && typeof step.title==='string' && typeof step.note==='string' &&
    Array.isArray(step.amounts) && step.amounts.length===value.labels.length &&
    step.amounts.every((n:unknown)=>n===null || (typeof n==='number' && Number.isFinite(n) && n>=0)));
}

const seriesColors=['#2D667F','#AA6E22','#508075'];

function Meter({label, amount, unit, maximum, reduced,color}:{color:string;label:string; amount:number|null; unit:string; maximum:number; reduced:boolean}) {
  const ratio = (amount ?? 0) / maximum;
  const fill = useRef(new Animated.Value(ratio)).current;
  useEffect(()=>{
    if (reduced) { fill.setValue(ratio); return; }
    const transition=Animated.timing(fill,{toValue:ratio,duration:360,useNativeDriver:false});
    transition.start();
    return ()=>transition.stop();
  },[fill,ratio,reduced]);
  return <View style={s.meter}>
    <Text style={s.metric}>{label} · {amount===null?'do obliczenia':amount.toLocaleString('pl-PL')+' '+unit}</Text>
    <View style={s.track}><Animated.View style={[s.fill,{backgroundColor:color,width:fill.interpolate({inputRange:[0,1],outputRange:['0%','100%']})}]}/></View>
  </View>;
}

export function AccountingWalkthrough({value}:{value:unknown}) {
  const [index,setIndex]=useState(0);
  const [reduced,setReduced]=useState(true);
  useEffect(()=>{
    let active=true, changed=false;
    const subscription=AccessibilityInfo.addEventListener('reduceMotionChanged',next=>{changed=true;setReduced(next);});
    AccessibilityInfo.isReduceMotionEnabled().then(next=>{if(active&&!changed)setReduced(next);}).catch(()=>{});
    return ()=>{active=false;subscription.remove();};
  },[]);
  if (!isDemo(value)) return null;
  const maximum=Math.max(1,...value.steps.flatMap(step=>step.amounts.map(amount=>amount??0)));
  const last=value.steps.length-1;
  const step=value.steps[Math.min(index,last)];
  return <View style={s.card}>
    <Text accessibilityRole="header" style={s.heading}>{value.title}</Text>
    <View accessibilityLiveRegion="polite" style={s.block}>
      <Text style={s.caption}>Krok {index+1} z {value.steps.length} · {step.title}</Text>
      <Text style={s.note}>{step.note}</Text>
      {value.labels.map((label,i)=><Meter key={label} color={seriesColors[i%seriesColors.length]} label={label} amount={step.amounts[i]} unit={value.unit} maximum={maximum} reduced={reduced}/>)}
    </View>
    <View style={s.actions}>
      <Pressable accessibilityRole="button" accessibilityState={{disabled:index===0}} disabled={index===0}
        onPress={()=>setIndex(i=>Math.max(0,i-1))} style={[s.back,index===0&&s.disabled]}><Text style={s.backLabel}>Cofnij krok</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={()=>setIndex(i=>i>=last?0:i+1)} style={s.next}>
        <Text style={s.nextLabel}>{index===last?'Powtórz przykład':'Pokaż kolejny krok'}</Text></Pressable>
    </View>
  </View>;
}

const s=StyleSheet.create({
  card:{borderWidth:1,borderColor:'#C8D5DC',backgroundColor:'#F2F6F7',padding:18,borderRadius:16,gap:14},
  heading:{fontSize:20,fontWeight:'700',color:'#17344A'},block:{gap:10},caption:{fontSize:16,fontWeight:'700',color:'#244c3c'},
  note:{fontSize:16,lineHeight:24,color:'#223830'},meter:{gap:4},metric:{fontSize:15,color:'#1b352a',fontWeight:'600'},
  track:{height:8,backgroundColor:'#DCE4E8',borderRadius:4,overflow:'hidden'},fill:{height:8,backgroundColor:'#287253'},
  actions:{flexDirection:'row',flexWrap:'wrap',gap:8},back:{minHeight:44,justifyContent:'center',paddingHorizontal:14,borderRadius:8,borderWidth:1,borderColor:'#9ab5a1'},
  disabled:{opacity:0.5},backLabel:{fontWeight:'600',color:'#204631'},next:{minHeight:44,justifyContent:'center',paddingHorizontal:14,borderRadius:8,backgroundColor:'#21485D'},
  nextLabel:{fontWeight:'700',color:'#fff'}
});