import React,{useMemo,useState} from 'react';
import {View,Text,Pressable,TextInput} from 'react-native';
import type {KeyboardShortcut} from './KeyboardLesson';

const ink='#16392b',muted='#627366';
const headings={excel:'Arkusz kosztów remontu',word:'Pismo do klienta',cad:'Szkic techniczny',windows:'Pulpit Windows'};
export default function SoftwarePlayground({mode,active}:{mode:'excel'|'word'|'cad'|'windows';active:KeyboardShortcut|null}){
 const [cell,setCell]=useState('B2'),[text,setText]=useState('Szanowni Państwo,\n\nProszę o potwierdzenie terminu wykonania prac.\n\nZ poważaniem,\nAnna');
 const cmd=(active?.combo||'').toUpperCase(),isCad=mode==='cad',isWord=mode==='word',isExcel=mode==='excel';
 const selected=isExcel?cmd==='CTRL+HOME'?'A1':cmd==='CTRL+END'?'E6':cmd==='CTRL+RIGHT'?'E2':cmd==='CTRL+DOWN'?'B6':cmd==='CTRL+G'?'D4':cell:'A1';
 const names=['','A','B','C','D','E'],cols=5,lines=[
 ['Lp.','Usługa','Ilość','Cena','Wartość'],
 ['1','Malowanie ścian','2','350','700'],
 ['2','Materiały','3','120','360'],
 ['3','Transport','1','150','150'],
 ['','', '', 'Suma','1210'],
 ['', '', '', 'VAT 23%','278,30'],
 ];
 const autos=cmd==='C'||cmd==='CIRCLE',rect=cmd==='REC'||cmd==='RECTANG',
 line=['L','PL','LINE','PLINE'].includes(cmd),copy=cmd==='CP'||cmd==='COPY',rotate=cmd==='RO'||cmd==='ROTATE',
 move=cmd==='M'||cmd==='MOVE',mirror=cmd==='MI',scale=cmd==='SC';
 const renderDrawing=()=>{
  const shapes=rect?['rect']:autos?['circle']:line?['line']:copy?['rect','copy']:mirror?['rect','mirror']:['rect'];
  return <View style={{height:240,borderRadius:12,backgroundColor:'#112d2b',overflow:'hidden',alignItems:'center',justifyContent:'center'}}>
   {Array.from({length:9},(_,i)=><View key={'h'+i} style={{position:'absolute',height:1,backgroundColor:'#28473e',left:0,right:0,top:24*i}}/>)}
   {Array.from({length:13},(_,i)=><View key={'v'+i} style={{position:'absolute',width:1,backgroundColor:'#28473e',top:0,bottom:0,left:27*i}}/>)}
   {shapes.map((shape,i)=>shape==='circle'?
    <View key={i} style={{width:103,height:103,borderRadius:60,borderWidth:3,borderColor:'#d5e89c'}}/>:
    shape==='line'?<View key={i} style={{width:145,height:3,backgroundColor:'#d5e89c',transform:[{rotate:'-29deg'}]}}/>:
    <View key={i} style={{position:'absolute',width:scale?180:114,height:scale?112:80,borderWidth:3,borderColor:shape==='copy'?'#c0e9ed':'#d5e89c',left:shape==='copy'?'57%':move?'43%':mirror?'22%':'31%',top:shape==='copy'?112:67,transform:[{rotate:rotate?'35deg':'0deg'}]}}/>)}
   {mirror&&<View style={{height:155,width:1,position:'absolute',left:'50%',top:35,backgroundColor:'#d8b677'}}/>}
   <View style={{position:'absolute',left:11,bottom:10,backgroundColor:'#173b32',padding:7,borderRadius:5}}>
    <Text style={{color:'#dcf2c3',fontSize:12,fontWeight:'700'}}>Polecenie: {active?.combo||'Wybierz komendę'} {active?.kind==='alias'?'↵':''}</Text>
   </View>
  </View>;
 };
 const bold=cmd==='CTRL+B',italic=cmd==='CTRL+I',under=cmd==='CTRL+U',
 center=cmd==='CTRL+E',right=cmd==='CTRL+R',justify=cmd==='CTRL+J';
 const pageText=cmd==='CTRL+N'?'':text;
 return <View style={{borderRadius:16,backgroundColor:'#fff',borderWidth:1,borderColor:'#d8e5d7',padding:17,gap:12}}>
  <Text style={{fontSize:12,color:'#68846a',fontWeight:'900'}}>ĆWICZ W WIRTUALNYM {isCad?'AUTOCAD-ZIE':isExcel?'EXCELU':isWord?'WORDZIE':'WINDOWSIE'}</Text>
  <Text style={{fontWeight:'900',fontSize:20,color:ink}}>{headings[mode]}</Text>
  {isCad&&renderDrawing()}
  {isExcel&&<View style={{borderWidth:1,borderColor:'#b7c7b5',borderRadius:10,overflow:'hidden'}}>
   <View style={{flexDirection:'row',backgroundColor:'#e7f1e5',height:33}}>
    <View style={{width:27,borderRightWidth:1,borderColor:'#c5d7c3'}}/>
    {names.slice(1).map((name,i)=><View key={i} style={{flex:1,justifyContent:'center',alignItems:'center',borderRightWidth:1,borderColor:'#cad7c8'}}><Text style={{fontWeight:'800',color:ink}}>{name}</Text></View>)}
   </View>
   {lines.map((row,ri)=><View key={ri} style={{flexDirection:'row',minHeight:37,backgroundColor:ri===0?'#e1ecdc':'white'}}>
    <View style={{width:27,justifyContent:'center',alignItems:'center',backgroundColor:'#f1f5ed',borderBottomWidth:1,borderColor:'#dce6d9'}}><Text style={{fontSize:11,color:'#6a826b'}}>{ri+1}</Text></View>
    {row.map((value,ci)=>{
     const coord=names[ci+1]+(ri+1),chosen=coord===selected;
     return <Pressable key={ci} onPress={()=>setCell(coord)} style={{flex:1,padding:4,minHeight:37,borderWidth:chosen?2:0.5,borderColor:chosen?'#2f7f58':'#dce6d9',backgroundColor:chosen?'#e3f4d9':'transparent',justifyContent:'center'}}>
      <Text numberOfLines={2} style={{fontSize:ci===1?9:10,color:ink,fontWeight:ri===0?'900':'500',textAlign:ci>=2?'right':'left'}}>{value}</Text>
     </Pressable>;
    })}
   </View>)}
   <View style={{backgroundColor:'#e8f3e5',padding:9,flexDirection:'row',justifyContent:'space-between'}}>
    <Text style={{color:ink,fontWeight:'900',fontSize:12}}>Aktywna komórka: {selected}</Text><Text style={{color:muted,fontSize:12}}>{active?.label||'Kliknij komórkę lub wybierz skrót'}</Text>
   </View>
  </View>}
  {isWord&&<View style={{backgroundColor:'#fffefb',borderWidth:1,borderColor:'#e6e8e1',borderRadius:7,minHeight:236,padding:20,alignSelf:'stretch'}}>
   <Text style={{color:'#718471',fontSize:10,marginBottom:12}}>Dokument1 · przykładowy dokument</Text>
   <Text style={{fontWeight:'900',color:ink,fontSize:19,marginBottom:10,textAlign:'center'}}>Potwierdzenie terminu</Text>
   <TextInput value={pageText} multiline onChangeText={setText} style={{minHeight:134,fontSize:15,lineHeight:24,color:ink,fontWeight:bold?'900':'400',fontStyle:italic?'italic':'normal',textDecorationLine:under?'underline':'none',textAlign:center?'center':right?'right':justify?'justify':'left'}}/>
   <Text style={{fontSize:11,color:muted,marginTop:8}}>{cmd==='CTRL+S'?'Zapisano w symulacji':cmd==='CTRL+P'?'Tryb podglądu wydruku':cmd==='CTRL+N'?'Nowy pusty dokument':'Wpisz własne zdanie w edytorze, potem zastosuj skrót.'}</Text>
  </View>}
  {mode==='windows'&&<View style={{minHeight:180,borderRadius:10,backgroundColor:'#dfeafd',padding:15,gap:12}}>
   <View style={{flexDirection:'row',gap:7}}>{['Pliki','Notatnik','Ustawienia'].map((s,i)=><View key={i} style={{flex:1,backgroundColor:'#fff',borderRadius:10,padding:14,minHeight:60}}><Text style={{fontSize:12,fontWeight:'800',color:ink}}>{s}</Text></View>)}</View>
   <View style={{backgroundColor:cmd==='WIN+D'?'#d1f3da':'#fff',padding:16,borderRadius:9,alignItems:'center'}}>
    <Text style={{color:ink,fontWeight:'900'}}>{active?active.after:'Wybierz polecenie, żeby zobaczyć działanie.'}</Text>
   </View>
  </View>}
  <View style={{backgroundColor:'#e8f5e0',padding:14,borderRadius:10,gap:5}}>
   <Text style={{fontSize:13,fontWeight:'900',color:ink}}>{active?'Wynik po '+active.combo:'Wybierz polecenie poniżej'}</Text>
   <Text style={{fontSize:14,color:ink,lineHeight:23}}>{active?.after||'Rysunek, dokument lub arkusz zmieni się na przykładzie w tej lekcji.'}</Text>
  </View>
  <Text style={{fontSize:11,color:'#738473',lineHeight:18}}>Ćwiczenie działa tylko w przeglądarce TRENERKI; nie modyfikuje oryginalnych plików.</Text>
 </View>;
}
