import React,{useState} from 'react';
import {Pressable,Text,View,useWindowDimensions} from 'react-native';

type Props={
 onType:(character:string)=>void;
 onBackspace:()=>void;
 onEnter:()=>void;
 onEscape:()=>void;
 onDelete:()=>void;
 onUndo:()=>void;
 onCommand:(command:string)=>void;
};

const rows=['1234567890','QWERTYUIOP','ASDFGHJKL','ZXCVBNM'];
const ink='#244958',accent='#d9ecf4';
export default function CadVirtualKeyboard({onType,onBackspace,onEnter,onEscape,onDelete,onUndo,onCommand}:Props){
 const {width}=useWindowDimensions();
 const [expanded,setExpanded]=useState(width<720);
 function key(label:string,run:()=>void,primary=false,flex=1){
  return <Pressable key={label} testID={'cad-key-'+(label==='↵'?'enter':label)}
   accessibilityRole="button" accessibilityLabel={'Klawiatura CAD: '+label}
   onPress={run} style={{flex,minWidth:0,minHeight:41,borderRadius:6,alignItems:'center',justifyContent:'center',backgroundColor:primary?'#326b80':'#f7fafc',
    borderWidth:1,borderColor:primary?'#326b80':'#bfd0d8',paddingHorizontal:2}}>
   <Text style={{fontSize:label.length>4?10:width<420?12:14,fontWeight:'800',color:primary?'#fff':ink}}>{label}</Text>
  </Pressable>;
 }
 return <View testID="cad-virtual-keyboard" style={{gap:6,marginTop:9}}>
  <Pressable accessibilityRole="button" testID="cad-keyboard-toggle" onPress={()=>setExpanded(value=>!value)}
   style={{backgroundColor:accent,borderRadius:9,paddingHorizontal:13,paddingVertical:11,alignSelf:'flex-start'}}>
   <Text style={{fontWeight:'900',color:ink}}>{expanded?'⌨ Ukryj klawiaturę CAD':'⌨ Otwórz klawiaturę CAD'}</Text>
  </Pressable>
  {expanded&&<View style={{backgroundColor:'#e9f0f4',borderRadius:11,borderWidth:1,borderColor:'#c3d2d9',padding:7,gap:5}}>
   <Text style={{fontSize:12,color:'#456576',marginBottom:3}}>Wpisuj komendy i współrzędne. Potwierdź ↵ — tak jak Enter w AutoCAD.</Text>
   {rows.map((row,i)=><View key={i} style={{flexDirection:'row',gap:3}}>
    {row.split('').map(char=>key(char,()=>onType(char)))}
   </View>)}
   <View style={{flexDirection:'row',gap:3}}>
    {key('@',()=>onType('@'))}{key(',',()=>onType(','))}{key('.',()=>onType('.'))}{key('-',()=>onType('-'))}
    {key('Spacja',()=>onType(' '),false,2)}{key('⌫',onBackspace,false,1.5)}{key('↵',onEnter,true,1.5)}
   </View>
   <View style={{flexDirection:'row',gap:3,flexWrap:'wrap'}}>
    {['LINE','MOVE','COPY','ERASE','RECTANG','CIRCLE'].map(command=>
     <Pressable key={command} onPress={()=>onCommand(command)} accessibilityRole="button"
      testID={'cad-command-'+command} style={{backgroundColor:'#fff',borderWidth:1,borderColor:'#9ab5c2',borderRadius:7,padding:9}}>
      <Text style={{fontSize:11,fontWeight:'800',color:ink}}>{command}</Text>
     </Pressable>)}
   </View>
   <View style={{flexDirection:'row',gap:3}}>
    {key('ESC',onEscape)}{key('DEL',onDelete)}{key('Ctrl+Z',onUndo,false,1.6)}
    {key('F3',()=>onCommand('F3'))}{key('F7',()=>onCommand('F7'))}{key('F8',()=>onCommand('F8'))}
   </View>
  </View>}
 </View>;
}
