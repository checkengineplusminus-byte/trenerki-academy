import React from 'react';
import {View,Text,Pressable,Linking} from 'react-native';

export type KeyboardShortcut={
  combo:string;keys:string[];kind:'alias'|'hotkey';label:string;
  before:string;after:string;tip:string;platform?:string;
};
export type KeyboardReference={label:string;url:string};
const ink='#17382a',secondary='#526c5b',green='#d9edc8';
const strong={color:ink,fontWeight:'800' as const};
function Keycap({value}:{value:string}){
  return <View accessibilityLabel={'Klawisz '+value}
   style={{borderRadius:8,borderWidth:1,borderBottomWidth:4,borderColor:'#b9cbbb',
    backgroundColor:'white',paddingHorizontal:Math.max(8,value.length>5?10:12),paddingVertical:10,
    minWidth:value.length>5?62:40,alignItems:'center',justifyContent:'center'}}>
   <Text style={{color:ink,fontWeight:'900',fontSize:value.length>5?13:15}}>{value}</Text>
  </View>;
}
function ShortcutCard({item,index}:{item:KeyboardShortcut,index:number}){
 const isAlias=item.kind==='alias';
 return <View style={{backgroundColor:'white',borderWidth:1,borderColor:'#dce8dc',borderRadius:18,padding:18,gap:13}}>
  <View style={{flexDirection:'row',justifyContent:'space-between',gap:8,alignItems:'center'}}>
   <Text style={{fontSize:12,color:'#6a836b',fontWeight:'800'}}>SKRÓT {index+1}</Text>
   <View style={{backgroundColor:isAlias?'#e6ecfb':'#e7f2df',borderRadius:99,paddingHorizontal:11,paddingVertical:5}}>
    <Text style={{color:ink,fontSize:11,fontWeight:'800'}}>{isAlias?'WPISZ POLECENIE':'NACIŚNIJ RAZEM'}</Text>
   </View>
  </View>
  <Text style={{fontSize:19,color:ink,fontWeight:'900',lineHeight:26}}>{item.label}</Text>
  <View style={{backgroundColor:'#f3f7f0',padding:14,borderRadius:13,gap:10}}>
   <Text style={{color:secondary,fontWeight:'700',fontSize:12}}>{isAlias?'Wpisz litery, potem zatwierdź Enterem':'Przytrzymaj modyfikatory i naciśnij klawisz'}</Text>
   <View style={{flexDirection:'row',alignItems:'center',gap:5,flexWrap:'wrap'}}>
    {item.keys.map((key,i)=><React.Fragment key={i}>
      {i>0&&<Text style={{color:'#658366',fontWeight:'900',marginHorizontal:3}}>{isAlias?'→':'+'}</Text>}
      <Keycap value={key}/>
    </React.Fragment>)}
   </View>
   <Text style={{fontSize:12,color:'#66806c'}}>{item.platform||'Klawiatura dla Windows'}</Text>
  </View>
  <Text style={{color:ink,fontWeight:'900',fontSize:14}}>Co się zmieni?</Text>
  <View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>
   <View style={{flex:1,minWidth:128,backgroundColor:'#f4f4f0',borderColor:'#e6e7df',borderWidth:1,borderRadius:11,padding:13,gap:7}}>
    <Text style={{fontSize:11,fontWeight:'800',color:'#818a80'}}>PRZED</Text>
    <Text style={{color:'#44554b',lineHeight:21,fontSize:14}}>{item.before}</Text>
   </View>
   <View style={{flex:1,minWidth:128,backgroundColor:'#e8f5df',borderColor:'#cfe7c2',borderWidth:1,borderRadius:11,padding:13,gap:7}}>
    <Text style={{fontSize:11,fontWeight:'900',color:'#43763a'}}>PO</Text>
    <Text style={{color:ink,fontWeight:'700',lineHeight:21,fontSize:14}}>{item.after}</Text>
   </View>
  </View>
  <View style={{flexDirection:'row',gap:10,alignItems:'flex-start',backgroundColor:'#fff8e9',padding:12,borderRadius:10}}>
   <Text style={{fontSize:17}}>💡</Text>
   <Text style={{color:'#695330',lineHeight:21,fontSize:13,flex:1}}><Text style={{fontWeight:'900'}}>Tip: </Text>{item.tip}</Text>
  </View>
 </View>;
}
export default function KeyboardLesson({shortcuts,tips,exercise,references}:{
 shortcuts?:KeyboardShortcut[];tips?:string[];exercise?:string;references?:KeyboardReference[];
}){
 if(!shortcuts?.length)return null;
 const valid=shortcuts.filter(s=>Array.isArray(s.keys)&&s.keys.length>0&&s.label&&s.before&&s.after);
 return <View style={{gap:15,marginTop:17}}>
  <View style={{backgroundColor:'#dfeecd',padding:18,borderRadius:15}}>
   <Text style={{color:ink,fontSize:23,fontWeight:'900'}}>Klawiatura w praktyce ⌨️</Text>
   <Text style={{color:secondary,marginTop:7,lineHeight:22}}>Zobacz klawisze, porównaj efekt PRZED i PO, a potem spróbuj samodzielnie. Ilustracje klawiatury są schematyczne — działanie możesz sprawdzić bezpośrednio w programie.</Text>
  </View>
  {valid.map((s,i)=><ShortcutCard item={s} index={i} key={s.combo+'-'+i}/>)}
  {!!tips?.length&&<View style={{backgroundColor:'#edf5e9',borderRadius:15,padding:18,gap:11}}>
   <Text style={{color:ink,fontSize:20,fontWeight:'900'}}>Jeszcze kilka przydatnych wskazówek</Text>
   {tips.map((tip,i)=><Text key={i} style={{color:secondary,lineHeight:22}}>• {tip}</Text>)}
  </View>}
  {!!exercise&&<View style={{backgroundColor:ink,borderRadius:16,padding:20,gap:10}}>
   <Text style={{color:'#d5f3b5',fontSize:12,fontWeight:'800'}}>ZADANIE PRAKTYCZNE</Text>
   <Text style={{color:'white',fontSize:17,lineHeight:25,fontWeight:'700'}}>{exercise}</Text>
  </View>}
  {!!references?.length&&<View style={{padding:10,gap:10}}>
   <Text style={{...strong,fontSize:13}}>Źródła dokumentacji producentów</Text>
   {references.filter(x=>/^https:\/\//.test(x.url)).map((link,i)=>
    <Pressable key={i} onPress={()=>Linking.openURL(link.url)} accessibilityRole="link" style={{paddingVertical:5}}>
     <Text style={{color:'#346549',fontSize:13,textDecorationLine:'underline'}}>{link.label} ↗</Text>
    </Pressable>)}
  </View>}
 </View>;
}
