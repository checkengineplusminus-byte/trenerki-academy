import React,{useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import guide from '../content/autocad-complete-lessons-v3.json';
import methods from '../content/autocad-methodology-v2.json';

type Props={lessonNo:number;title:string;raw?:string[]};
const ink='#14263B',body='#43596F',green='#2C587B';
const book=guide.lessonBooks;
const blockTitle=(title:string)=><Text style={{fontSize:18,lineHeight:26,fontWeight:'900',color:ink}}>{title}</Text>;
export default function AutoCADLessonMethod({lessonNo,title}:Props){
 const [showAllCommands,setShowAllCommands]=useState(true);
 const chapter=book[lessonNo],method=methods.lessons[lessonNo];
 if(!chapter||chapter.lesson_no!==lessonNo||!method)return null;
 return <View testID="autocad-lesson-method" style={{gap:17,marginBottom:20}}>
  <View style={{backgroundColor:'#EFF3F8',borderRadius:14,padding:17,gap:8}}>
   <Text style={{color:'#2C587B',fontSize:12,fontWeight:'900'}}>LEKCJA {lessonNo+1}/30 · KOMPLETNY PODRĘCZNIK</Text>
   <Text style={{fontSize:20,lineHeight:28,fontWeight:'900',color:ink}}>{method.heading}</Text>
   <Text style={{fontSize:14,lineHeight:22,color:body}}>Nauka dla osoby od zera: przykład → polecenia → czynności → samodzielne sprawdzenie. Materiał zawiera ponad {chapter.estimatedWords} słów objaśnień i ćwiczeń, nie samą listę skrótów.</Text>
  </View>
  {chapter.sections.filter(x=>x.heading!=='Ciekawostka z praktyki').map((section,index)=><View key={section.heading}
   style={{backgroundColor:index%2?'#EFF3F8':'white',borderRadius:13,borderWidth:1,borderColor:'#DCE4ED',padding:17,gap:12}}>
   {blockTitle(section.heading)}
   {section.paragraphs?.map((paragraph,i)=><Text key={i} style={{fontSize:15,lineHeight:26,color:body}}>{paragraph}</Text>)}
   {section.walk?.map((step,i)=><View key={i} style={{gap:7,padding:12,backgroundColor:'#EFF3F8',borderRadius:10}}>
    <Text style={{fontSize:12,fontWeight:'900',color:green}}>KROK {i+1}</Text>
    <Text style={{fontSize:15,fontWeight:'900',color:green}}>{step.instruction}</Text>
    <Text style={{fontSize:14,lineHeight:23,color:body}}>{step.why}</Text>
    <Text style={{fontSize:13,lineHeight:21,fontWeight:'700',color:'#53677D'}}>{step.check}</Text>
   </View>)}
   {!!section.commands?.length&&<View style={{gap:8}}>
    <Pressable testID="cad-lesson-command-toggle" accessibilityRole="button" accessibilityState={{expanded:showAllCommands}}
      onPress={()=>setShowAllCommands(v=>!v)} style={{alignSelf:'flex-start',padding:10,backgroundColor:'#EFF3F8',borderRadius:8}}>
     <Text style={{color:green,fontWeight:'900'}}>{showAllCommands?'Zwiń':'Rozwiń'} objaśnienia {section.commands.length} poleceń</Text>
    </Pressable>
    {showAllCommands&&section.commands.map(c=><View key={c.command} style={{gap:6,padding:12,borderLeftWidth:3,borderColor:'#D9B76D',backgroundColor:'white',borderRadius:8}}>
     <Text style={{fontWeight:'900',fontSize:15,color:ink}}>{c.command}{c.alias?' · '+c.alias:''} — {c.heading}</Text>
     <Text style={{fontSize:14,lineHeight:23,color:body}}>{c.explanation}</Text>
     <Text style={{fontSize:14,lineHeight:23,color:body}}>{c.procedure}</Text>
     <Text style={{fontSize:13,lineHeight:21,color:'#53677D'}}>{c.case}</Text>
     <Text style={{fontSize:11,lineHeight:18,color:'#53677D',fontWeight:'800'}}>{c.environment}</Text>
    </View>)}
   </View>}
  </View>)}
  <View testID="autocad-result-check" style={{padding:14,backgroundColor:'#EFF3F8',borderRadius:12,gap:7}}>
   <Text style={{fontWeight:'900',fontSize:15,color:ink}}>Przed przejściem dalej</Text>
   <Text style={{fontSize:14,lineHeight:23,color:body}}>Sprawdź wyjaśnienie, przeprowadź zadanie w symulatorze i porównaj wynik z kryteriami z tej lekcji. W przypadku funkcji wymagającej rzeczywistego AutoCAD wykonaj ją w programie producenta, nie przyjmuj, że sam symulator zastępuje to ćwiczenie.</Text>
  </View>
 </View>;
}
