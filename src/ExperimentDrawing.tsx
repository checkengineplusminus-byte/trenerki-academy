import React from 'react';
import {Platform, Text, View} from 'react-native';

type Ink = 'outline' | 'accent' | 'light';
type Stroke = {path:string; ink?:Ink; dashed?:boolean};
type Label = {x:number; y:number; text:string; ink?:Ink};
export type DrawingFrame = {description:string; strokes:Stroke[]; labels:Label[]};
export type ExperimentDrawingData = {before:DrawingFrame; after:DrawingFrame};

const palette = {outline:'#193A52', accent:'#855806', light:'#637A8D'};

export default function ExperimentDrawing({frame}:{frame:DrawingFrame}) {
 if (Platform.OS !== 'web') {
  return <Text style={{color:palette.outline, lineHeight:22}}>{frame.description}</Text>;
 }
 return <View style={{backgroundColor:'#F6F8FB',padding:6,borderRadius:10}}>
  <svg role="img" aria-label={frame.description} viewBox="0 0 360 142"
   style={{display:'block',width:'100%',height:'auto',maxHeight:230}}>
   {frame.strokes.map((stroke,index)=><path key={index} d={stroke.path} fill="none"
    stroke={palette[stroke.ink || 'outline']} strokeWidth={2.3} strokeLinejoin="round"
    strokeLinecap="round" strokeDasharray={stroke.dashed?'5 4':undefined}/>)}
   {frame.labels.map((label,index)=><text key={index} x={label.x} y={label.y} fontSize={13}
    fontWeight={600} fontFamily="system-ui, sans-serif" fill={palette[label.ink || 'outline']}>
    {label.text}
   </text>)}
  </svg>
 </View>;
}
