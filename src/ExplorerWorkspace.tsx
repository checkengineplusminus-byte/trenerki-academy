import React,{useEffect,useRef,useState} from 'react';
import {Pressable,Text,TextInput,View} from 'react-native';
import {LabButton,LabGroup,labInk,labStyles} from './LabControls';
import useLabKeys from './useLabKeys';

type Entry={id:number;parent:number;name:string;type:'folder'|'file';content?:string};
const root=0;
const initial:Entry[]=[
 {id:1,parent:root,name:'Projekty',type:'folder'},
 {id:2,parent:root,name:'Notatka.txt',type:'file',content:'Potwierdź termin i zapisz kopię dokumentu w folderze Projekty.'},
 {id:3,parent:1,name:'Plan.txt',type:'file',content:'1. Ustal zakres.\n2. Sprawdź datę.\n3. Przekaż aktualną wersję.'},
];
const displayName=(entry:Entry,showExtensions:boolean)=>!showExtensions&&entry.type==='file'?entry.name.replace(/\.[^.]+$/,''):entry.name;
const lower=(name:string)=>name.toLocaleLowerCase('pl-PL');

export default function ExplorerWorkspace({shortcut,runId}:{shortcut?:string;runId:number}){
 const [entries,setEntries]=useState(initial),[history,setHistory]=useState<Entry[][]>([]);
 const [navigation,setNavigation]=useState({visits:[root],index:0}),[selected,setSelected]=useState<number>();
 const [clipboard,setClipboard]=useState<{id:number;cut:boolean}>();
 const [address,setAddress]=useState('Dokumenty'),[showExtensions,setShowExtensions]=useState(true),[viewMenu,setViewMenu]=useState(false);
 const [form,setForm]=useState<{kind:'new'|'rename';name:string}>(),[preview,setPreview]=useState<Entry>();
 const [status,setStatus]=useState('Utwórz folder, skopiuj Notatka.txt i wklej ją do środka.');
 const sequence=useRef(4),pathInput=useRef<React.ComponentRef<typeof TextInput>>(null);
 const current=navigation.visits[navigation.index];
 const children=entries.filter(item=>item.parent===current).sort((a,b)=>a.type===b.type?a.name.localeCompare(b.name,'pl'):a.type==='folder'?-1:1);
 const currentEntry=entries.find(item=>item.id===current),picked=children.find(item=>item.id===selected);

 function chain(id:number){
  const parts:Entry[]=[];
  for(let item=entries.find(e=>e.id===id);item;item=entries.find(e=>e.id===item!.parent))parts.unshift(item);
  return parts;
 }
 function path(id:number){return ['Dokumenty',...chain(id).map(item=>item.name)].join('\\');}
 function leave(id:number){
  setSelected(undefined);setForm(undefined);setPreview(undefined);setAddress(path(id));setStatus('Otwarty folder: '+path(id)+'.');
 }
 function visit(id:number){
  if(id!==current)setNavigation({visits:[...navigation.visits.slice(0,navigation.index+1),id],index:navigation.index+1});
  leave(id);
 }
 function step(delta:number){
  let index=navigation.index+delta;
  while(index>=0&&index<navigation.visits.length){
   const id=navigation.visits[index];
   if(id===root||entries.some(item=>item.id===id)){
    setNavigation({...navigation,index});leave(id);return;
   }
   index+=delta;
  }
 }
 function open(){
  if(!picked)return;
  if(picked.type==='folder')visit(picked.id);
  else{setPreview(picked);setStatus('Otwarty plik: '+picked.name+'.');}
 }
 function go(){
  const input=address.trim().replace(/[\\/]+$/,'');
  const folder=entries.find(item=>item.type==='folder'&&lower(path(item.id))===lower(input));
  if(lower(input)==='dokumenty')visit(root);
  else if(folder)visit(folder.id);
  else setStatus('Nie znaleziono folderu. Wpisz np. Dokumenty\\Projekty.');
 }
 function update(next:Entry[]){
  setHistory(old=>[...old.slice(-39),entries]);setEntries(next);
 }
 function undo(){
  const previous=history.at(-1);
  if(!previous)return;
  setEntries(previous);setHistory(history.slice(0,-1));setPreview(undefined);setSelected(undefined);
  if(current!==root&&!previous.some(item=>item.id===current)){
   setNavigation({visits:[root],index:0});setAddress('Dokumenty');
  }
  setStatus('Cofnięto ostatnią zmianę w Eksploratorze.');
 }
 function newFolder(){setForm({kind:'new',name:''});setPreview(undefined);}
 function rename(){if(picked)setForm({kind:'rename',name:picked.name});}
 function saveName(){
  if(!form)return;
  const name=form.name.trim(),renaming=form.kind==='rename';
  if(!name||name==='.'||/[\\/:*?"<>|]/.test(name)||name.endsWith('.')){
   setStatus('Wpisz nazwę bez znaków specjalnych i bez kropki na końcu.');return;
  }
  if(children.some(item=>(!renaming||item.id!==selected)&&lower(item.name)===lower(name))){
   setStatus('W tym folderze istnieje już element o tej nazwie.');return;
  }
  if(renaming){
   if(!picked)return;
   if(picked.name!==name)update(entries.map(item=>item.id===selected?{...item,name}:item));
   setStatus('Zmieniono nazwę na '+name+'.');
  }else{
   const id=sequence.current++;
   update([...entries,{id,parent:current,name,type:'folder'}]);setSelected(id);setStatus('Utworzono folder '+name+'.');
  }
  setForm(undefined);
 }
 function copy(cut:boolean){
  if(!picked)return;
  setClipboard({id:picked.id,cut});setStatus((cut?'Wycięto ':'Skopiowano ')+picked.name+' do schowka ćwiczenia.');
 }
 function paste(){
  const source=entries.find(item=>item.id===clipboard?.id);
  if(!source)return;
  if(source.id===current||chain(current).some(item=>item.id===source.id)){
   setStatus('Wybierz folder poza źródłowym folderem i jego podfolderami.');return;
  }
  if(clipboard?.cut&&source.parent===current){setStatus('Element jest już w tym folderze.');return;}
  let name=source.name;
  if(children.some(item=>lower(item.name)===lower(name))){
   const extension=source.type==='file'?/\.[^.]+$/.exec(name)?.[0]??'':'';
   const base=extension?name.slice(0,-extension.length):name;
   let copyNo=1;
   do{name=base+' — kopia'+(copyNo===1?'':' '+copyNo)+extension;copyNo++;}while(children.some(item=>lower(item.name)===lower(name)));
  }
  if(clipboard?.cut){
   update(entries.map(item=>item.id===source.id?{...item,parent:current,name}:item));setSelected(source.id);setClipboard(undefined);
  }else{
   const additions:Entry[]=[];
   function clone(item:Entry,parent:number,label=item.name){
    const id=sequence.current++;
    additions.push({...item,id,parent,name:label});
    entries.filter(child=>child.parent===item.id).forEach(child=>clone(child,id));
    return id;
   }
   const id=clone(source,current,name);
   update([...entries,...additions]);setSelected(id);
  }
  setStatus('Wklejono '+name+' w '+path(current)+'.');
 }
 function remove(){
  if(!picked)return;
  update(entries.filter(item=>item.id!==picked.id&&!chain(item.id).some(parent=>parent.id===picked.id)));
  setSelected(undefined);setPreview(undefined);setStatus('Usunięto '+picked.name+'. Możesz użyć Cofnij.');
 }
 function action(combo:string){
  switch(combo.toUpperCase().replace(/\s/g,'')){
   case 'CTRL+SHIFT+N':newFolder();break;
   case 'F2':rename();break;
   case 'CTRL+C':copy(false);break;
   case 'CTRL+X':copy(true);break;
   case 'CTRL+V':paste();break;
   case 'CTRL+Z':undo();break;
   case 'DELETE':remove();break;
   case 'ALT+LEFT':case 'ALT+ARROWLEFT':step(-1);break;
   case 'ALT+RIGHT':case 'ALT+ARROWRIGHT':step(1);break;
   case 'ALT+UP':case 'ALT+ARROWUP':if(currentEntry)visit(currentEntry.parent);break;
   case 'CTRL+L':case 'ALT+D':pathInput.current?.focus();break;
   case 'ENTER':open();break;
   default:return false;
  }
  return true;
 }
 useEffect(()=>{if(shortcut&&runId&&!action(shortcut))setStatus('Ten skrót omówiono w lekcji. Tutaj ćwiczysz operacje na plikach i folderach w Eksploratorze.');},[runId]);
 useLabKeys('explorer-workspace',event=>{
  if((event.target as HTMLElement).tagName==='INPUT'||event.metaKey)return false;
  const combo=[event.ctrlKey?'CTRL':null,event.altKey?'ALT':null,event.shiftKey?'SHIFT':null,event.key.toUpperCase()].filter(Boolean).join('+');
  return action(combo);
 });

 return <View style={labStyles.panel} testID="explorer-workspace">
  <Text style={labStyles.heading}>Windows 11 · Eksplorator plików</Text>
  <Text style={labStyles.body}>Utwórz folder Odbiory. Skopiuj Notatka.txt, otwórz nowy folder i wklej plik. Wróć strzałką Wstecz i odszukaj oryginał.</Text>
  <View style={labStyles.ribbon}>
   <LabGroup label="Pasek poleceń / Command bar">
    <LabButton label="Nowy → Folder" onPress={newFolder}/>
    <LabButton label="Wytnij" disabled={!picked} onPress={()=>copy(true)}/>
    <LabButton label="Kopiuj" disabled={!picked} onPress={()=>copy(false)}/>
    <LabButton label="Wklej" disabled={!entries.some(item=>item.id===clipboard?.id)} onPress={paste}/>
    <LabButton label="Zmień nazwę · F2" disabled={!picked} onPress={rename}/>
    <LabButton label="Usuń" disabled={!picked} onPress={remove}/>
    <LabButton label="Widok" selected={viewMenu} onPress={()=>setViewMenu(v=>!v)}/>
   </LabGroup>
   {viewMenu&&<LabGroup label="Widok → Pokaż">
    <LabButton label="Rozszerzenia nazw plików" selected={showExtensions} onPress={()=>setShowExtensions(v=>!v)}/>
   </LabGroup>}
  </View>
  <View style={labStyles.row}>
   <LabButton label="← Wstecz" disabled={navigation.index<=0} onPress={()=>step(-1)}/>
   <LabButton label="Dalej →" disabled={navigation.index>=navigation.visits.length-1} onPress={()=>step(1)}/>
   <LabButton label="↑ W górę" disabled={current===root} onPress={()=>{if(currentEntry)visit(currentEntry.parent);}}/>
   <LabButton label="Cofnij zmianę · Ctrl+Z" disabled={!history.length} onPress={undo}/>
  </View>
  <View style={labStyles.row}>
   <TextInput ref={pathInput} accessibilityLabel="Pasek adresu Eksploratora" style={[labStyles.input,{flex:1,minWidth:125}]}
    autoCorrect={false} autoCapitalize="none" value={address} onChangeText={setAddress} onSubmitEditing={go}/>
   <LabButton label="Przejdź" onPress={go}/>
  </View>
  {form&&<View style={labStyles.row}>
   <TextInput accessibilityLabel={form.kind==='new'?'Nazwa nowego folderu':'Nowa nazwa elementu'} autoFocus
    value={form.name} onChangeText={name=>setForm({...form,name})} onSubmitEditing={saveName} placeholder="Nazwa"
    style={[labStyles.input,{flex:1,minWidth:125}]}/>
   <LabButton label="Zapisz nazwę" onPress={saveName}/>
   <LabButton label="Anuluj zmianę nazwy" onPress={()=>setForm(undefined)}/>
  </View>}
  <View style={{borderWidth:1,borderColor:'#c4d6c8',borderRadius:8,overflow:'hidden'}}>
   <Text style={{backgroundColor:'#e3eee6',padding:9,color:labInk,fontWeight:'800'}}>Nazwa i typ · {path(current)}</Text>
   {children.length?children.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={(item.type==='folder'?'Folder ':'Plik ')+displayName(item,showExtensions)}
    accessibilityState={{selected:item.id===selected}} onPress={()=>{setSelected(item.id);setPreview(undefined);setForm(undefined);}}
    style={{padding:10,minHeight:44,justifyContent:'center',borderTopWidth:1,borderColor:'#e3e9e2',backgroundColor:item.id===selected?'#dcefdc':'white'}}>
    <Text style={{color:labInk,fontSize:14}}>{item.type==='folder'?'📁':'▤'}  {displayName(item,showExtensions)}</Text>
   </Pressable>):<Text style={{padding:12,color:'#496757'}}>Ten folder jest pusty.</Text>}
  </View>
  <View style={labStyles.row}><LabButton label="Otwórz wybrany element" disabled={!picked} onPress={open}/></View>
  {preview&&<View style={labStyles.ribbon}>
   <Text style={labStyles.eyebrow}>Podgląd · {preview.name}</Text>
   <Text style={labStyles.body}>{preview.content}</Text>
  </View>}
  <Text accessibilityLiveRegion="polite" style={labStyles.status}>{status}</Text>
 </View>;
}
