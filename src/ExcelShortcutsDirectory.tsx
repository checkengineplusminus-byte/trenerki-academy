import React,{useMemo,useState} from 'react';
import {Linking,Pressable,Text,TextInput,View} from 'react-native';
import source from '../content/excel-shortcuts-encyclopedia.json';

type Shortcut={id:string;combo:string;title:string;lessonNo:number;before:string;after:string;why:string;practice:string;pitfall:string;platform:string};
const items=source.shortcuts as Shortcut[];
const ink='#1a3e2b',muted='#50705c',edge='#c5dcc9';
const normalize=(s:string)=>s.toLocaleLowerCase('pl-PL').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l');
export default function ExcelShortcutsDirectory({lessonNo=0}:{lessonNo?:number}){
 const [onlyLesson,setOnlyLesson]=useState(items.some(s=>s.lessonNo===lessonNo));
 const [term,setTerm]=useState(''),[limit,setLimit]=useState(12),[expanded,setExpanded]=useState('');
 const results=useMemo(()=>items.filter(s=>(!onlyLesson||s.lessonNo===lessonNo)&&
  (!term.trim()||normalize(s.combo+' '+s.title+' '+s.after+' '+s.why).includes(normalize(term.trim())))),[onlyLesson,term,lessonNo]);
 return <View testID="excel-shortcuts-directory" style={{gap:11}}>
  <Text style={{fontSize:18,color:ink,fontWeight:'900'}}>Atlas skrótów Excel — {items.length} poleceń z instrukcjami</Text>
  <Text style={{fontSize:13,color:muted,lineHeight:21}}>Każdy wpis tłumaczy, co oznacza skrót, co musi być zaznaczone, jaki jest efekt, jak wykonać ćwiczenie i jaki błąd można popełnić. Skróty dotyczą przede wszystkim Microsoft Excel na Windows. Przeglądarka i Mac mogą używać innych kombinacji.</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
   {([{scope:true,title:'Skróty z tej lekcji'},{scope:false,title:'Wszystkie skróty A–Z'}]).map(x=>
    <Pressable key={x.title} accessibilityRole="button" accessibilityState={{selected:onlyLesson===x.scope}}
     onPress={()=>{setOnlyLesson(x.scope);setLimit(12);setExpanded('')}} style={{padding:10,minHeight:44,borderWidth:1,borderColor:onlyLesson===x.scope?'#589970':edge,borderRadius:9,backgroundColor:onlyLesson===x.scope?'#d9eadc':'white'}}>
     <Text style={{color:ink,fontSize:12,fontWeight:'800'}}>{x.title}</Text>
    </Pressable>)}
  </View>
  <TextInput testID="excel-shortcuts-search" accessibilityLabel="Szukaj skrótu Excel" placeholder="Szukaj np. Ctrl+T, F4, wykres, wklej"
   placeholderTextColor="#779483" value={term} onChangeText={v=>{setTerm(v);setLimit(12);setExpanded('')}}
   autoCorrect={false} autoCapitalize="none" style={{borderWidth:1,borderColor:edge,borderRadius:9,backgroundColor:'white',padding:12,color:ink,minHeight:47}}/>
  <Text style={{fontSize:12,fontWeight:'800',color:muted}}>Znaleziono: {results.length}. Wyświetlono {Math.min(limit,results.length)} z {items.length} skrótów w atlasie.</Text>
  {!results.length&&<View style={{padding:12,borderRadius:9,backgroundColor:'white',gap:7}}>
   <Text style={{color:muted,fontSize:13,lineHeight:22}}>W tej lekcji nie ma skrótu przypisanego do tego tematu albo wyszukiwany tekst nie pasuje. Zmień filtr na „Wszystkie skróty A–Z”, aby wyświetlić całą bazę.</Text>
   <Pressable accessibilityRole="button" onPress={()=>{setOnlyLesson(false);setTerm('')}} style={{padding:10,borderRadius:8,backgroundColor:'#e1f1e4',alignSelf:'flex-start'}}>
    <Text style={{fontSize:12,color:ink,fontWeight:'900'}}>Pokaż cały atlas</Text>
   </Pressable>
  </View>}
  {results.slice(0,limit).map(item=><View key={item.id} testID={'excel-shortcut-'+item.id}
   style={{backgroundColor:'white',borderWidth:1,borderColor:expanded===item.id?'#65a67c':edge,borderRadius:10,overflow:'hidden'}}>
   <Pressable accessibilityRole="button" accessibilityState={{expanded:expanded===item.id}}
    onPress={()=>setExpanded(x=>x===item.id?'':item.id)} style={{padding:12,minHeight:50,gap:4}}>
    <Text style={{color:ink,fontSize:14,fontWeight:'900'}}>{item.combo} · {item.title} {expanded===item.id?'▴':'▾'}</Text>
    <Text style={{color:muted,fontSize:12,lineHeight:19}}>{item.after}</Text>
   </Pressable>
   {expanded===item.id&&<View style={{padding:12,borderTopWidth:1,borderColor:'#e0ece1',gap:9}}>
    <Text style={{fontSize:12,color:'#2c6344',fontWeight:'900'}}>Co dokładnie robi?</Text>
    <Text style={{fontSize:13,color:ink,lineHeight:22}}>{item.why}</Text>
    <Text style={{fontSize:12,color:'#2c6344',fontWeight:'900'}}>Przed</Text>
    <Text style={{fontSize:13,color:ink,lineHeight:22}}>{item.before}</Text>
    <Text style={{fontSize:12,color:'#2c6344',fontWeight:'900'}}>Po użyciu skrótu</Text>
    <Text style={{fontSize:13,color:ink,lineHeight:22}}>{item.after}</Text>
    <Text style={{fontSize:12,color:'#2c6344',fontWeight:'900'}}>Ćwiczenie w prawdziwym Excelu</Text>
    <Text style={{fontSize:13,color:ink,lineHeight:22}}>{item.practice}</Text>
    <View style={{padding:10,backgroundColor:'#fff7e8',borderRadius:7,gap:5}}>
     <Text style={{fontSize:12,fontWeight:'900',color:'#8e6529'}}>Uwaga i najczęstszy błąd</Text>
     <Text style={{fontSize:12,lineHeight:20,color:'#76562c'}}>{item.pitfall}</Text>
    </View>
    <Text style={{fontSize:11,lineHeight:20,color:muted}}>{item.platform}</Text>
   </View>}
  </View>)}
  {results.length>limit&&<Pressable accessibilityRole="button" onPress={()=>setLimit(v=>v+16)} style={{minHeight:45,borderRadius:9,backgroundColor:'#dcefe0',padding:12,alignItems:'center'}}>
   <Text style={{fontSize:13,color:ink,fontWeight:'900'}}>Pokaż kolejne 16 skrótów</Text>
  </Pressable>}
  <Pressable accessibilityRole="link" onPress={()=>void Linking.openURL('https://support.microsoft.com/pl-pl/accessibility/excel/keyboard-shortcuts-in-excel')}
   style={{minHeight:44,justifyContent:'center'}}>
   <Text style={{fontSize:12,fontWeight:'800',color:'#246787',textDecorationLine:'underline'}}>Pełny wykaz i różnice platform — Microsoft Support ↗</Text>
  </Pressable>
 </View>;
}
