import React,{useEffect,useState} from 'react';
import {View,Text,Image,Platform,Pressable} from 'react-native';
export type LearningSection={heading:string;text:string};
const ink='#173e2d',body='#3e5c48';
type Props={courseSlug:string;lessonNo:number;title:string;sections?:LearningSection[];illustration?:string;
            situation?:string;example?:string;source?:{label:string;url:string}[]};
const imageNames=new Set(['eko-hierarchy','eko-sort','eko-cycle','eko-hazard','eko-textiles','eko-food','eko-home','eko-community','windows-history','windows-folders','windows-security','windows-desktop','windows-explorer','excel-interface','word-interface','autocad-interface','word-document','word-structure','word-review','excel-addresses','excel-formulas','excel-chart','autocad-coordinates','autocad-layers','autocad-filetypes','autocad-commands','craft-bednarz','craft-garncarz-tradycja','craft-gontarz','craft-introligator-tradycja','craft-kaletnik-tradycja','craft-kolodziej','craft-kowal-tradycja','kowal-stanowisko','kowal-narzedzia','kowal-rysunek','kowal-operacje','kowal-kopyto','craft-ludwisarz','craft-mlynarz-tradycyjny','craft-plecionkarz','craft-powroznik','craft-rymarz','craft-sitarz','craft-snycerz','craft-szewc-tradycja','craft-tkacz-reczny','craft-woznica','craft-zdun-tradycja','craft-zecer','craft-zegarmistrz-tradycja']);
function FallbackDiagram({title,sections,example}:{title:string;sections:LearningSection[];example?:string}){
 const blocks=sections.length>=3?
  sections.slice(0,3).map(s=>({label:s.heading,info:s.text.slice(0,90)})):
  [{label:'Zrozum temat',info:title},{label:'Sytuacja',info:sections[0]?.text||''},{label:'Rozwiązanie',info:example||''}];
 return <View accessibilityLabel={'Schemat edukacyjny: '+title} style={{backgroundColor:'#eaf3e4',padding:14,borderRadius:13,gap:9}}>
  <Text style={{fontWeight:'900',color:ink,fontSize:12}}>SCHEMAT UCZENIA — OD PRZYCZYNY DO ROZWIĄZANIA</Text>
  <View style={{flexDirection:'row',gap:6,flexWrap:'wrap'}}>
   {blocks.map((b,i)=><View key={i} style={{flex:1,minWidth:125,backgroundColor:'white',padding:10,borderRadius:9,borderWidth:1,borderColor:'#cfdfc9',gap:7}}>
    <View style={{backgroundColor:i===0?'#d5e6d0':i===1?'#dceadc':'#e6edcb',alignSelf:'flex-start',width:28,height:28,borderRadius:10,alignItems:'center',justifyContent:'center'}}>
     <Text style={{color:ink,fontWeight:'900'}}>{i+1}</Text></View>
    <Text style={{fontWeight:'900',color:ink,fontSize:12}}>{b.label}</Text>
    <Text style={{color:body,fontSize:11,lineHeight:16}}>{b.info}</Text>
   </View>)}
  </View>}
 </View>;
}
export default function LessonIllustratedSections({courseSlug,lessonNo,title,sections,illustration,situation,example}:Props){
 const [failed,setFailed]=useState(false);
 useEffect(()=>{setFailed(false)},[courseSlug,lessonNo]);
 const named=Array.isArray(sections)&&sections.length>0?sections.filter(x=>x?.heading&&x?.text):[];
 const validIllustration=typeof illustration==='string'&&imageNames.has(illustration),showImage=validIllustration&&Platform.OS==='web'&&!failed;
 if(!named.length&&!validIllustration)return <FallbackDiagram title={title} sections={situation?[{heading:'Zadanie z lekcji',text:situation}]:[]} example={example}/>;
 return <View style={{marginBottom:18,gap:14}}>
  {validIllustration&&<View style={{backgroundColor:'#f1f8ed',padding:9,borderWidth:1,borderColor:'#d9e7d5',borderRadius:16,gap:7}}>
   {showImage?<Image
    accessibilityLabel={'Autorska ilustracja kursu '+courseSlug+': '+title}
    source={{uri:'https://trenerki-academy.expo.app/academy/assets/'+illustration+'.svg'}}
    onError={()=>setFailed(true)}
    resizeMode="contain"
    style={{width:'100%',height:Math.max(210,Math.min(395,typeof window==='undefined'?280:window.innerWidth*.45)),borderRadius:10}}
   />:<FallbackDiagram title={title} sections={named} example={example}/>}
   <Text style={{fontSize:11,color:'#65816d',paddingHorizontal:6,paddingBottom:4}}>Autorska ilustracja TRENERKI Academy · schemat dydaktyczny, nie zrzut ekranu producenta</Text>
  </View>}
  {!validIllustration&&named.length>0&&<FallbackDiagram title={title} sections={named} example={example}/>}
  {!!named.length&&<View style={{backgroundColor:'#fff',borderWidth:1,borderColor:'#dce9d8',borderRadius:16,overflow:'hidden'}}>
   <View style={{backgroundColor:'#e8f3e3',padding:15}}>
    <Text style={{color:ink,fontWeight:'900',fontSize:18}}>Wyjaśnienie krok po kroku</Text>
   </View>
   <View style={{padding:15,gap:18}}>
    {named.map((section,i)=><View key={i} style={{gap:9}}>
     <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
      <Text style={{width:29,height:29,lineHeight:29,textAlign:'center',backgroundColor:'#dfedd9',color:ink,borderRadius:9,overflow:'hidden',fontWeight:'900'}}>{i+1}</Text>
      <Text style={{color:ink,fontWeight:'900',fontSize:16,flex:1}}>{section.heading}</Text>
     </View>
     <Text style={{color:body,fontSize:15.5,lineHeight:27}}>{section.text}</Text>
    </View>)}
   </View>}
  </View>}
 </View>;
}
