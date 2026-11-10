import React,{useImperativeHandle,useRef,useState} from 'react';
import {Text,TextInput,View} from 'react-native';
import {labStyles} from './LabControls';

export type WordEditorHandle={apply:(action:string)=>boolean;selection:()=>string};
const initial=['Potwierdzenie terminu','Szanowni Państwo,','Proszę o potwierdzenie daty rozpoczęcia prac.','Z poważaniem,\nAnna'];
type Paragraph={text:string;bold?:boolean;italic?:boolean;underline?:boolean;heading?:number;align?:'left'|'center'|'right'|'justify'};
type Block=Paragraph|{table:string[]}|{page:true};
const WordDocument=React.forwardRef<WordEditorHandle>(function WordDocument(_,ref){
 const [blocks,setBlocks]=useState<Block[]>(()=>initial.map((text,i)=>({text,heading:i===0?1:0})));
 const [history,setHistory]=useState<Block[][]>([]);
 const [active,setActive]=useState(0),selection=useRef({start:0,end:0});
 function update(next:Block[]){
  setHistory(old=>[...old.slice(-39),blocks]);setBlocks(next);
 }
 useImperativeHandle(ref,()=>({
  apply(action){
   const block=blocks[active];
   if(action==='undo'){
    const previous=history.at(-1);
    if(!previous)return false;
    setBlocks(previous);setHistory(history.slice(0,-1));setActive(Math.min(active,previous.length-1));return true;
   }
   if(action==='page'||action==='table'){
    update([...blocks.slice(0,active+1),action==='table'?{table:['Element','Termin','','']}:{page:true},{text:''},...blocks.slice(active+1)]);
    return true;
   }
   if(!block||!('text' in block))return false;
   let next:Paragraph={...block};
   if(action==='bold'||action==='italic'||action==='underline')next[action]=!block[action];
   else if(action==='heading1'||action==='heading2'||action==='normal')next.heading=action==='normal'?0:action==='heading1'?1:2;
   else if(action==='left'||action==='right'||action==='center'||action==='justify')next.align=action;
   else return false;
   update(blocks.map((item,i)=>i===active?next:item));return true;
  },
  selection(){
   const block=blocks[active];
   return block&&'text' in block?block.text.slice(selection.current.start,selection.current.end):'';
  }
 }));
 return <View style={{borderWidth:1,borderColor:'#b6c8bd',padding:13,borderRadius:6,gap:6}}>
  {blocks.map((b,i)=>'table' in b?<View key={i} style={{flexDirection:'row',flexWrap:'wrap',gap:5}}>
   {b.table.map((value,j)=><TextInput key={j} accessibilityLabel={'Komórka tabeli '+(j+1)} value={value}
    onChangeText={text=>update(blocks.map((item,k)=>k===i?{table:b.table.map((v,l)=>j===l?text:v)}:item))} style={[labStyles.input,{width:'48%'}]}/>)}
  </View>:'page' in b?<Text key={i} style={labStyles.eyebrow}>──────── Podział strony ────────</Text>:
   <TextInput key={i} multiline accessibilityLabel={'Akapit dokumentu '+(i+1)} value={b.text} onFocus={()=>setActive(i)}
    onSelectionChange={event=>{selection.current=event.nativeEvent.selection;}}
    onChangeText={text=>update(blocks.map((item,j)=>i===j?{...b,text}:item))}
    style={[labStyles.input,{borderColor:i===active?'#629775':'#e7eee9',fontSize:b.heading===1?24:b.heading===2?20:16,
     fontWeight:b.bold||b.heading?'900':'400',fontStyle:b.italic?'italic':'normal',textDecorationLine:b.underline?'underline':'none',textAlign:b.align}]}/>)}
 </View>;
});
export default WordDocument;
