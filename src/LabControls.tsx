import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';

export const labInk='#14263B';
export const labStyles=StyleSheet.create({
 panel:{backgroundColor:'white',borderWidth:1,borderColor:'#DCE4ED',borderRadius:14,padding:13,gap:12},
 ribbon:{backgroundColor:'#EFF3F8',borderRadius:9,padding:9,gap:8},
 row:{flexDirection:'row',flexWrap:'wrap',gap:6,alignItems:'center'},
 eyebrow:{color:'#43596F',fontSize:12,fontWeight:'800'},
 heading:{color:labInk,fontSize:18,fontWeight:'900'},
 body:{color:'#43596F',fontSize:14,lineHeight:21},
 input:{backgroundColor:'#fff',borderColor:'#91ae9a',borderWidth:1,borderRadius:7,color:labInk,minHeight:44,paddingHorizontal:10,paddingVertical:8,fontSize:16},
 status:{backgroundColor:'#EFF3F8',borderRadius:8,padding:10,color:labInk,lineHeight:21},
});

export function LabButton({label,onPress,selected,disabled,testID}:{label:string;onPress:()=>void;selected?:boolean;disabled?:boolean;testID?:string}){
 return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected,disabled}} disabled={disabled}
  onPress={onPress} testID={testID} style={{borderWidth:1,borderColor:selected?labInk:'#DCE4ED',backgroundColor:selected?labInk:'white',paddingHorizontal:10,paddingVertical:7,minHeight:44,justifyContent:'center',borderRadius:7,opacity:disabled?0.45:1}}>
  <Text style={{fontSize:13,fontWeight:'800',color:selected?'white':labInk}}>{label}</Text>
 </Pressable>;
}

export function LabGroup({label,children}:{label:string;children:React.ReactNode}){
 return <View style={{gap:4}}>
  <Text style={labStyles.eyebrow}>{label}</Text>
  <View style={labStyles.row}>{children}</View>
 </View>;
}
