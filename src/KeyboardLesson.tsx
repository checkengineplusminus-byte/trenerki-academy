import React,{useEffect,useMemo,useState} from 'react';
import {View,Text,Pressable,Linking,TextInput,Platform} from 'react-native';

export type KeyboardShortcut={
 combo:string;keys:string[];kind:'alias'|'hotkey';label:string;
 before:string;after:string;tip:string;platform?:string;
};
export type KeyboardReference={label:string;url:string};
const ink='#17382a',secondary='#526c5b',soft='#e6f3db';
function Keycap({value}:{value:string}){
 return <View accessibilityLabel={'Klawisz '+value} style={{borderRadius:8,borderWidth:1,borderBottomWidth:4,borderColor:'#b9cbbb',backgroundColor:'white',paddingHorizontal:10,paddingVertical:9,minWidth:36,alignItems:'center',justifyContent:'center'}}>
  <Text style={{color:ink,fontWeight:'900',fontSize:15}}>{value}</Text>
 </View>;
}
function CommandCanvas({item}:{item:KeyboardShortcut|null}){
 const alias=item?.kind==='alias',c=item?.combo?.toUpperCase()||'';
 const isLine=['L','PL','A','SPL'].includes(c);
 const isCircle=['C','CIRCLE'].includes(c),isRect=['REC','RECTANG'].includes(c);
 const hasGraphic=alias&&(isLine||isCircle||isRect||['M','CP','RO','SC','MI'].includes(c));
 const formatBold=c==='CTRL+B',italic=c==='CTRL+I',underline=c==='CTRL+U',alignCenter=c==='CTRL+E',alignRight=c==='CTRL+R';
 const isBlank=c==='CTRL+N';
 const sample=isBlank?'':'Dziś uczę się nowej umiejętności. Każdy skrót pomaga mi pracować szybciej.';
 return <View style={{backgroundColor:'#fff',borderWidth:1,borderColor:'#d5e5d4',borderRadius:14,padding:16,minHeight:175,gap:10}}>
  <Text style={{fontSize:11,fontWeight:'900',color:'#6b8670'}}>MINI SYMULATOR · {alias?'RYSUNEK':'DOKUMENT / EKRAN'}</Text>
  {hasGraphic?
   <View style={{height:112,backgroundColor:'#1c3630',borderRadius:10,overflow:'hidden',justifyContent:'center',alignItems:'center'}}>
    <View style={{position:'absolute',left:8,right:8,top:53,height:1,backgroundColor:'#305b4e'}}/>
    <View style={{position:'absolute',top:8,bottom:8,left:'50%',width:1,backgroundColor:'#305b4e'}}/>
    {isCircle?<View style={{width:95,height:95,borderWidth:3,borderColor:'#f7e3a1',borderRadius:100}}/>:
     isRect?<View style={{width:135,height:70,borderWidth:3,borderColor:'#f7e3a1'}}/>:
     <View style={{width:132,height:3,backgroundColor:'#f7e3a1',transform:[{rotate:isLine?'24deg':c==='RO'?'48deg':'0deg'}]}}/>}
    {c==='CP'&&<View style={{position:'absolute',top:15,right:'20%',width:50,height:40,borderWidth:2,borderColor:'#a9dca6'}}/>}
   </View>:
   <View style={{minHeight:105,backgroundColor:'#fcfcf7',borderWidth:1,borderColor:'#ebeee6',borderRadius:9,padding:14}}>
    <Text style={{color:ink,fontSize:16,lineHeight:25,fontWeight:formatBold?'900':'400',fontStyle:italic?'italic':'normal',textDecorationLine:underline?'underline':'none',textAlign:alignCenter?'center':alignRight?'right':'left'}}>{sample||'Nowy pusty dokument'}</Text>
   </View>}
  <Text style={{color:'#376b42',fontWeight:'900',fontSize:14}}>{item?'Po '+item.combo+': '+item.after:'Wybierz dowolną komendę poniżej, żeby zobaczyć efekt.'}</Text>
  <Text style={{color:'#6c8170',fontSize:11}}>To bezpieczna symulacja. Nie zmienia Twoich dokumentów ani rysunków na komputerze.</Text>
 </View>;
}
function ShortcutCard({item,index,onRun,active}:{item:KeyboardShortcut,index:number,onRun:(s:KeyboardShortcut)=>void,active:boolean}){
 const alias=item.kind==='alias';
 return <View style={{backgroundColor:'white',borderWidth:active?2:1,borderColor:active?'#8ab987':'#dce8dc',borderRadius:16,padding:17,gap:12}}>
  <View style={{flexDirection:'row',justifyContent:'space-between',gap:7,alignItems:'center'}}>
   <Text style={{fontSize:11,color:'#6a836b',fontWeight:'900'}}>SKRÓT {index+1}</Text>
   <Text style={{fontWeight:'800',color:ink,fontSize:11}}>{alias?'KOMENDA + ENTER':'JEDNOCZEŚNIE'}</Text>
  </View>
  <Text style={{fontSize:18,color:ink,fontWeight:'900',lineHeight:26}}>{item.label}</Text>
  <View style={{backgroundColor:'#f3f7f0',padding:12,borderRadius:12,gap:9}}>
   <View style={{flexDirection:'row',alignItems:'center',gap:5,flexWrap:'wrap'}}>
    {item.keys.map((key,i)=><React.Fragment key={i}>{i>0&&<Text style={{color:'#658366',fontWeight:'900'}}>{alias?'→':'+'}</Text>}<Keycap value={key}/></React.Fragment>)}
   </View>
   <Text style={{fontSize:11,color:'#66806c'}}>{item.platform||'Klawiatura Windows'}</Text>
  </View>
  <View style={{flexDirection:'row',gap:9}}>
   <View style={{flex:1,backgroundColor:'#f6f6f2',borderRadius:10,padding:12}}>
    <Text style={{fontSize:10,color:'#879088',fontWeight:'900'}}>PRZED</Text><Text style={{fontSize:13,color:'#506153',lineHeight:20,marginTop:4}}>{item.before}</Text>
   </View>
   <View style={{flex:1,backgroundColor:'#e7f4df',borderRadius:10,padding:12}}>
    <Text style={{fontSize:10,color:'#548047',fontWeight:'900'}}>PO</Text><Text style={{fontSize:13,color:ink,fontWeight:'700',lineHeight:20,marginTop:4}}>{item.after}</Text>
   </View>
  </View>
  <Text style={{color:'#6d582d',lineHeight:21,fontSize:13}}>💡 {item.tip}</Text>
  <Pressable onPress={()=>onRun(item)} style={{backgroundColor:active?'#447e58':ink,padding:13,borderRadius:11}}>
   <Text style={{color:'white',textAlign:'center',fontWeight:'900'}}>{active?'✓ Wykonano w symulatorze':'▶ Wykonaj w symulatorze'}</Text>
  </Pressable>
 </View>;
}
export default function KeyboardLesson({shortcuts,tips,exercise,references}:{
 shortcuts?:KeyboardShortcut[];tips?:string[];exercise?:string;references?:KeyboardReference[];
}){
 const valid=useMemo(()=>Array.isArray(shortcuts)?shortcuts.filter(s=>s.keys?.length>0&&s.label&&s.before&&s.after):[],[shortcuts]);
 const [active,setActive]=useState<KeyboardShortcut|null>(null);
 const [command,setCommand]=useState(''),[feedback,setFeedback]=useState(''),[listening,setListening]=useState(false);
 useEffect(()=>{setActive(null);setCommand('');setFeedback('');setListening(false)},[shortcuts]);
 function run(item:KeyboardShortcut){setActive(item);setFeedback('Wykonano '+item.combo+' w symulatorze.');}
 function runCommand(){
  const found=valid.find(s=>s.kind==='alias'&&s.combo.toUpperCase()===command.trim().toUpperCase());
  if(found){run(found);setCommand('');}
  else setFeedback('Nie ma takiej komendy w bieżącej lekcji. Spróbuj jednej z pokazanych niżej.');
 }
 useEffect(()=>{
  if(!listening||Platform.OS!=='web')return;
  const host=globalThis as any;
  if(!host.addEventListener)return;
  const listener=(event:any)=>{
   if(event.target?.tagName==='INPUT'||event.target?.tagName==='TEXTAREA')return;
   const key=String(event.key||'').toLowerCase();
   const aliases:Record<string,string>={arrowleft:'Left',arrowright:'Right',arrowup:'Up',arrowdown:'Down',' ':'Space',escape:'Esc'};
   const normalized=(aliases[key]||((key.length===1)?key.toUpperCase():event.key||''));
   const combo=[event.ctrlKey?'Ctrl':null,event.altKey?'Alt':null,event.shiftKey?'Shift':null,normalized].filter(Boolean).join('+').toUpperCase();
   const match=valid.find(s=>s.kind==='hotkey'&&s.keys.join('+').toUpperCase()===combo);
   if(match){event.preventDefault();run(match);}
  };
  host.addEventListener('keydown',listener);
  return()=>host.removeEventListener('keydown',listener);
 },[listening,valid]);
 if(!valid.length)return null;
 const aliases=valid.some(s=>s.kind==='alias');
 return <View style={{gap:16,marginTop:19}}>
  <View style={{backgroundColor:'#e1efcf',borderRadius:15,padding:18,gap:8}}>
   <Text style={{color:ink,fontSize:23,fontWeight:'900'}}>Sprawdź to samodzielnie ⌨️</Text>
   <Text style={{color:secondary,lineHeight:22}}>Wybierz skrót, zobacz jak zmienia się przykładowy dokument albo rysunek i powtórz to w swoim programie. Tutaj ćwiczysz bez ryzyka dla prawdziwych plików.</Text>
  </View>
  <CommandCanvas item={active}/>
  {aliases&&<View style={{backgroundColor:'#f5f8f1',padding:16,borderRadius:13,gap:8}}>
   <Text style={{color:ink,fontWeight:'900',fontSize:17}}>Wpisz polecenie AutoCAD i naciśnij Enter</Text>
   <TextInput value={command} autoCapitalize="characters" onChangeText={setCommand} onSubmitEditing={runCommand} returnKeyType="done" placeholder="Np. L, C, REC, PL…" style={{borderWidth:1,borderColor:'#bdcfba',borderRadius:10,padding:13,backgroundColor:'white',color:ink,fontWeight:'800'}}/>
   <Pressable onPress={runCommand} style={{padding:13,backgroundColor:ink,borderRadius:10}}><Text style={{color:'white',fontWeight:'800',textAlign:'center'}}>Enter ↵ · Wykonaj komendę</Text></Pressable>
  </View>}
  <Pressable onPress={()=>setListening(v=>!v)} style={{backgroundColor:listening?'#e1f3d7':'#f0f2eb',padding:14,borderRadius:12,borderWidth:1,borderColor:listening?'#78b271':'#d8e3d4'}}>
   <Text style={{color:ink,fontWeight:'900'}}>{listening?'● Nasłuchiwanie skrótów aktywne — wyłącz':'⌨ Włącz wykrywanie skrótów z klawiatury'}</Text>
   <Text style={{color:secondary,fontSize:12,marginTop:6}}>Działa w przeglądarce, jeśli system lub przeglądarka nie przechwyci kombinacji. Przycisk „Wykonaj” działa niezależnie.</Text>
  </Pressable>
  {!!feedback&&<Text style={{backgroundColor:'#eaf5e2',padding:11,borderRadius:9,color:ink}}>{feedback}</Text>}
  {valid.map((item,i)=><ShortcutCard key={item.combo+'-'+i} item={item} index={i} onRun={run} active={active===item}/>)}
  {!!tips?.length&&<View style={{backgroundColor:'#edf5e9',borderRadius:15,padding:18,gap:8}}>
   <Text style={{color:ink,fontSize:19,fontWeight:'900'}}>Małe triki</Text>
   {tips.map((t,i)=><Text key={i} style={{color:secondary,lineHeight:22}}>• {t}</Text>)}
  </View>}
  {!!exercise&&<View style={{backgroundColor:ink,borderRadius:15,padding:19}}>
   <Text style={{color:'#d8efb9',fontWeight:'900',fontSize:12}}>TWOJE ĆWICZENIE</Text>
   <Text style={{color:'white',marginTop:8,lineHeight:24,fontWeight:'700'}}>{exercise}</Text>
  </View>}
  {!!references?.length&&<View style={{gap:6,padding:5}}>
   <Text style={{color:ink,fontWeight:'800'}}>Sprawdź działanie w instrukcji programu</Text>
   {references.filter(x=>/^https:\/\//.test(x.url)).map((x,i)=><Pressable key={i} onPress={()=>Linking.openURL(x.url)}><Text style={{color:'#376c4a',textDecorationLine:'underline'}}>{x.label} ↗</Text></Pressable>)}
  </View>}
 </View>;
}
