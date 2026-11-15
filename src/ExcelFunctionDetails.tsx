import React from 'react';
import {Text,View} from 'react-native';
import deepGuide from '../content/excel-function-deep-guide.json';

export type ExcelDeepEntry={
 code:string;name:string;lessonNo:number;syntax:string;example:string;result:string;
 argumentsExplanation:string;walkthrough:string;pitfall:string;guidedSteps:string[];
 exercise:string;source:string;
};
export const excelDeepDetails=Object.fromEntries(
 (deepGuide.lessons as ExcelDeepEntry[]).map(x=>[x.code,x])
) as Record<string,ExcelDeepEntry>;

export default function ExcelFunctionDetails({code}:{code:string}){
 const detail=excelDeepDetails[code];
 if(!detail)return <Text style={{fontSize:12,lineHeight:20,color:'#64776a'}}>
  To hasło znajduje się w katalogu, ale nie ma jeszcze kompletnej autorskiej lekcji.
  Otwórz oficjalną dokumentację Microsoft poniżej, żeby zobaczyć pełne argumenty i ograniczenia.
  Nie przedstawiamy krótkiego opisu jako wystarczającego szkolenia.
 </Text>;
 return <View testID={'excel-function-detail-'+code}
  style={{padding:12,borderWidth:1,borderColor:'#bad7c1',borderRadius:10,backgroundColor:'#f7fbf4',gap:9}}>
  <Text style={{fontSize:12,fontWeight:'900',color:'#23623e'}}>WYJAŚNIENIE FUNKCJI KROK PO KROKU</Text>
  <Text style={{fontSize:13,fontWeight:'900',color:'#183e2a'}}>Składnia — co wpiszesz w Excelu?</Text>
  <Text selectable style={{fontSize:13,fontWeight:'800',color:'#275f44',lineHeight:22}}>{detail.syntax}</Text>
  <Text style={{fontSize:13,lineHeight:22,color:'#456450'}}>{detail.argumentsExplanation}</Text>
  <Text style={{fontSize:13,fontWeight:'900',color:'#183e2a'}}>Przykład z danymi:</Text>
  <Text selectable testID={'excel-function-example-'+code}
   style={{fontSize:13,fontWeight:'900',color:'#245a3f',lineHeight:23}}>{detail.example}</Text>
  <Text style={{fontSize:13,fontWeight:'900',color:'#183e2a'}}>Oczekiwany wynik: {detail.result}</Text>
  <Text style={{fontSize:13,lineHeight:23,color:'#456450'}}>{detail.walkthrough}</Text>
  {detail.guidedSteps.map((line,i)=><Text key={i} style={{fontSize:12,lineHeight:20,color:'#183e2a'}}>{i+1}. {line}</Text>)}
  <View style={{backgroundColor:'#fff6e8',padding:10,borderRadius:8,gap:5}}>
   <Text style={{fontSize:12,fontWeight:'900',color:'#76562a'}}>Typowy błąd</Text>
   <Text style={{fontSize:12,lineHeight:20,color:'#76562a'}}>{detail.pitfall}</Text>
  </View>
  <Text style={{fontSize:13,lineHeight:22,color:'#183e2a'}}>
   <Text style={{fontWeight:'900'}}>Twoje zadanie: </Text>{detail.exercise}
  </Text>
  <Text style={{fontSize:11,lineHeight:19,color:'#5c7864'}}>
   Test wykonaj w prawdziwym Excelu. Pracownia TRENERKI nie emuluje wszystkich funkcji Microsoft.
  </Text>
 </View>;
}
