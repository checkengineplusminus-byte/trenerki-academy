import React,{useEffect,useRef,useState} from 'react';
import {Platform,Text,TextInput,View} from 'react-native';
import WordDocument,{type WordEditorHandle} from './WordDocument';
import {LabButton,LabGroup,labStyles} from './LabControls';
import useLabKeys from './useLabKeys';

const tabs=[['home','Narzędzia główne / Home'],['insert','Wstawianie / Insert'],['layout','Układ / Layout'],['review','Recenzja / Review']] as const;
const actions:Record<string,string>={
 'CTRL+B':'bold','CTRL+I':'italic','CTRL+U':'underline','CTRL+ALT+1':'heading1','CTRL+ALT+2':'heading2',
 'CTRL+E':'center','CTRL+L':'left','CTRL+R':'right','CTRL+J':'justify','CTRL+ENTER':'page',
 'CTRL+Z':'undo','CTRL+Y':'redo','CTRL+A':'selectAll',
};
const labels:Record<string,string>={
 bold:'Pogrub · Ctrl+B',italic:'Kursywa · Ctrl+I',underline:'Podkreśl · Ctrl+U',heading1:'Nagłówek 1 · Ctrl+Alt+1',
 heading2:'Nagłówek 2 · Ctrl+Alt+2',normal:'Normalny',left:'Do lewej',center:'Wyśrodkuj · Ctrl+E',right:'Do prawej',
 justify:'Wyjustuj',page:'Podział strony · Ctrl+Enter',table:'Tabela 2 × 2',undo:'Cofnij · Ctrl+Z',redo:'Ponów · Ctrl+Y',
};

export default function WordWorkspace({shortcut,runId}:{shortcut?:string;runId:number}){
 const [tab,setTab]=useState<(typeof tabs)[number][0]>('home'),[wide,setWide]=useState(false);
 const [status,setStatus]=useState('Kliknij w dokument i wpisz własną treść.');
 const [comment,setComment]=useState<{quote:string;text:string}>(),[comments,setComments]=useState<{quote:string;text:string}[]>([]);
 const editor=useRef<WordEditorHandle>(null);
 function apply(action:string){
  if(editor.current?.apply(action))setStatus((labels[action]??'Zaznacz wszystko')+' · użyto w dokumencie.');
  else setStatus('Kliknij w dokument i wybierz fragment lub akapit, na którym chcesz pracować.');
 }
 function run(combo:string){
  const action=actions[combo.toUpperCase().replace(/\s/g,'')];
  if(action){apply(action);return true;}
  return false;
 }
 useEffect(()=>{if(shortcut&&runId&&!run(shortcut))setStatus('Ten skrót opisano w lekcji. W warsztacie możesz edytować dokument i używać dostępnych przycisków.');},[runId]);
 useLabKeys('word-workspace',event=>{
  const target=event.target as HTMLElement;
  if(!target.closest('[data-testid="word-document"]')||!event.ctrlKey||event.metaKey)return false;
  const combo=['CTRL',event.altKey?'ALT':null,event.shiftKey?'SHIFT':null,event.key.toUpperCase()].filter(Boolean).join('+');
  return run(combo);
 });
 const buttons=(keys:string[])=>keys.map(key=><LabButton key={key} label={labels[key]} onPress={()=>apply(key)}/>);

 return <View style={labStyles.panel} testID="word-workspace">
  <Text style={labStyles.heading}>Word · edytor pisma</Text>
  <Text style={labStyles.body}>{Platform.OS==='web'?'Wpisz termin w dokumencie, zaznacz go i użyj Pogrub. Kliknij w tytuł i nadaj mu styl Nagłówek 1.':'Wpisz termin, kliknij właściwy akapit i użyj Pogrub. Na tym urządzeniu formatowanie obejmuje aktywny akapit.'}</Text>
  <View style={labStyles.ribbon}>
   <View style={labStyles.row}>{tabs.map(([id,label])=><LabButton key={id} label={label} selected={tab===id} onPress={()=>setTab(id)}/>)}</View>
   {tab==='home'&&<>
    <LabGroup label="Czcionka / Font">{buttons(['bold','italic','underline'])}</LabGroup>
    <LabGroup label="Style / Styles">{buttons(['normal','heading1','heading2'])}</LabGroup>
    <LabGroup label="Akapit / Paragraph">{buttons(['left','center','right','justify'])}</LabGroup>
   </>}
   {tab==='insert'&&<>
    <LabGroup label="Tabele / Tables">{buttons(['table'])}</LabGroup>
    <LabGroup label="Strony / Pages">{buttons(['page'])}</LabGroup>
   </>}
   {tab==='layout'&&<LabGroup label="Ustawienia strony / Page Setup · Orientacja">
    <LabButton label="Pionowa" selected={!wide} onPress={()=>setWide(false)}/>
    <LabButton label="Pozioma" selected={wide} onPress={()=>setWide(true)}/>
   </LabGroup>}
   {tab==='review'&&<LabGroup label="Komentarze / Comments">
    <LabButton label="Nowy komentarz" onPress={()=>setComment({quote:editor.current?.selection()||'',text:''})}/>
   </LabGroup>}
  </View>
  <View style={labStyles.row}>{buttons(Platform.OS==='web'?['undo','redo']:['undo'])}</View>
  <View style={{backgroundColor:'#eef2ef',padding:8,borderRadius:8,alignItems:'center'}}>
   <View style={{width:wide?'100%':'88%',maxWidth:wide?820:570}}>
    <WordDocument ref={editor}/>
   </View>
  </View>
  {comment&&<View style={{gap:7}}>
   <Text style={labStyles.eyebrow}>{comment.quote?'Do fragmentu „'+comment.quote+'”':'Komentarz do dokumentu'}</Text>
   <TextInput accessibilityLabel="Treść komentarza" value={comment.text} onChangeText={text=>setComment({...comment,text})} style={labStyles.input}/>
   <View style={labStyles.row}>
    <LabButton label="Zapisz komentarz" disabled={!comment.text.trim()} onPress={()=>{setComments([...comments,{...comment,text:comment.text.trim()}]);setComment(undefined);}}/>
    <LabButton label="Anuluj komentarz" onPress={()=>setComment(undefined)}/>
   </View>
  </View>}
  {comments.map((item,i)=><Text key={i} style={labStyles.status}>{item.quote?'„'+item.quote+'” · ':''}{item.text}</Text>)}
  <Text accessibilityLiveRegion="polite" style={labStyles.status}>{status}</Text>
 </View>;
}
