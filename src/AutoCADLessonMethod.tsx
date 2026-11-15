import React from 'react';
import {Text,View} from 'react-native';
import course from '../content/autocad-methodology-v2.json';

type Props={lessonNo:number;title:string;raw?:string[]};
const ink='#193c2d',body='#365445';
const guide=course.lessons;

export default function AutoCADLessonMethod({lessonNo,title,raw}:Props){
 const lesson=guide[lessonNo];
 if(!lesson||lesson.lesson_no!==lessonNo)return null;
 const explanation=typeof raw?.[1]==='string'?raw[1]:'';
 const expected=typeof raw?.[3]==='string'?raw[3]:'';
 const pitfall=typeof raw?.[4]==='string'?raw[4]:'';
 return <View testID="autocad-lesson-method" style={{gap:15,marginBottom:18}}>
  <View style={{backgroundColor:'white',borderWidth:1,borderColor:'#dce7d9',borderRadius:15,padding:18,gap:12}}>
   <Text style={{fontSize:11,color:'#4a8057',fontWeight:'900'}}>LEKCJA {lessonNo+1} · ZROZUM ZASADĘ</Text>
   <Text style={{fontSize:19,fontWeight:'900',lineHeight:26,color:ink}}>{lesson.heading}</Text>
   {!!explanation&&<Text style={{fontSize:15,lineHeight:25,color:body}}>{explanation}</Text>}
   <View style={{borderTopWidth:1,borderColor:'#edf1e9',paddingTop:12,gap:7}}>
    <Text style={{color:ink,fontSize:15,fontWeight:'900'}}>Dlaczego to ma znaczenie w praktyce?</Text>
    <Text style={{fontSize:15,lineHeight:25,color:body}}>{lesson.concept}</Text>
   </View>
  </View>
  <View style={{backgroundColor:'#eef6eb',borderRadius:15,padding:18,gap:12}}>
   <Text style={{color:'#42754d',fontWeight:'900',fontSize:12}}>ĆWICZENIE W PRAWDZIWYM AUTOCAD-ZIE</Text>
   <Text style={{color:ink,fontWeight:'900',fontSize:18}}>Wykonaj po kolei</Text>
   {lesson.steps.map((step,i)=><View key={i} style={{flexDirection:'row',gap:12,alignItems:'flex-start',paddingVertical:5}}>
    <View style={{width:29,height:29,borderRadius:9,backgroundColor:'#cfe7c8',justifyContent:'center',alignItems:'center'}}>
     <Text style={{color:ink,fontWeight:'900'}}>{i+1}</Text>
    </View>
    <Text style={{color:body,fontSize:15,lineHeight:24,flex:1}}>{step}</Text>
   </View>)}
   <Text style={{fontSize:12,lineHeight:19,color:'#557260'}}>Instrukcje dotyczą Autodesk AutoCAD/AutoCAD LT. Pracuj na kopiach ćwiczebnych, nie na dokumentacji produkcyjnej.</Text>
  </View>
  {!!expected&&<View testID="autocad-result-check" style={{padding:16,backgroundColor:'white',borderWidth:1,borderColor:'#dbe7d6',borderRadius:12,gap:6}}>
   <Text style={{color:'#315f42',fontWeight:'900',fontSize:15}}>Sprawdź wynik — nie tylko wygląd</Text>
   <Text style={{color:body,fontSize:15,lineHeight:24}}>{expected}</Text>
  </View>}
  {!!pitfall&&<View style={{padding:15,borderLeftWidth:4,borderColor:'#c7a468',backgroundColor:'#fff7e9',borderRadius:10,gap:7}}>
   <Text style={{color:'#795b29',fontWeight:'900'}}>Typowy błąd i jak go uniknąć</Text>
   <Text style={{color:'#69512c',fontSize:14,lineHeight:23}}>{pitfall}</Text>
  </View>}
  <View style={{padding:15,borderRadius:10,gap:6,backgroundColor:'#f3f6f0'}}>
   <Text style={{color:ink,fontSize:14,fontWeight:'900'}}>Sprawdź, czy naprawdę rozumiesz</Text>
   <Text style={{color:body,fontSize:14,lineHeight:23}}>{lesson.question}</Text>
   <Text style={{color:'#617867',fontSize:12,lineHeight:18}}>Odpowiedz sobie przed pytaniem kontrolnym poniżej. To ćwiczenie do namysłu, nie dodatkowa blokada przejścia.</Text>
  </View>
 </View>;
}
