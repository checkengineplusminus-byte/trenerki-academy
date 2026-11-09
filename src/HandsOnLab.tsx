import React,{useEffect,useMemo,useState} from 'react';
import {View,Text,Pressable,TextInput,useWindowDimensions} from 'react-native';
import type {KeyboardShortcut} from './KeyboardLesson';
import {evaluateCell,parseSpreadsheetNumber} from './SpreadsheetFormula';

/* Autorski, bezpieczny warsztat w przeglądarce. Nie uruchamia Excela/AutoCAD-a. */
const ink='#173c2e', green='#e6f3df';
type LabMode='excel'|'cad';
type Shape={id:number;kind:'line'|'poly'|'circle'|'rect'|'arc'|'text';x:number;y:number;size:number;rotation:number;layer:number};
const initialRows=[
 ['Lp.','Usługa','Ilość','Cena','Wartość'],
 ['1','Malowanie','2','350','=C2*D2'],
 ['2','Materiały','3','120','=C3*D3'],
 ['3','Transport','1','150','=C4*D4'],
 ['','','','Razem','=SUM(E2:E4)'],
 ['','','','VAT 23%','=E5*0.23']
];
const initialDrawing:Shape[]=[{id:1,kind:'rect',x:82,y:62,size:1,rotation:0,layer:1}];
function pos(cell:string){const m=/^([A-E])(\d+)$/.exec(cell);return m?{r:Math.max(0,Math.min(5,Number(m[2])-1)),c:m[1].charCodeAt(0)-65}:{r:1,c:1}}
function evaluate(rows:string[][],cell:string):string {return evaluateCell(rows,cell)}

export default function HandsOnLab({mode,active,runId}:{mode:LabMode;active:KeyboardShortcut|null;runId:number}){
 const {width}=useWindowDimensions(),mobile=width<650;
 const [manualLabel,setManualLabel]=useState('');
 const [rows,setRows]=useState<string[][]>(initialRows.map(r=>[...r]));
 const [selected,setSelected]=useState('B2'),[clipboard,setClipboard]=useState(''),[history,setHistory]=useState<string[][]|null>(null);
 const [format,setFormat]=useState({bold:false,underline:false,percent:false,table:false,filter:false});
 const [sheet,setSheet]=useState(1),[rowHighlight,setRowHighlight]=useState(-1),[colHighlight,setColHighlight]=useState(-1),[chart,setChart]=useState(false);
 const [shapes,setShapes]=useState<Shape[]>(initialDrawing),[cadInfo,setCadInfo]=useState('Wybierz polecenie i naciśnij Wykonaj.');
 const [layer,setLayer]=useState(1),[snap,setSnap]=useState(true),[ortho,setOrtho]=useState(false),[grid,setGrid]=useState(true);
 const [status,setStatus]=useState('Kliknij komendę poniżej, aby zobaczyć i sprawdzić jej wynik.');
 const excel=mode==='excel',combo=(active?.combo||'').toUpperCase().replace(/\s/g,'');
 function applyValue(value:string,at=selected){
  const {r,c}=pos(at);setHistory(rows.map(v=>[...v]));
  setRows(old=>old.map((line,i)=>i===r?line.map((v,j)=>j===c?value:v):line));
 }
 useEffect(()=>{
  if(!active||runId===0)return;
  const c=combo;
  setStatus(active.label+': '+active.after);
  if(excel){
   if(c==='CTRL+HOME')setSelected('A1');
   else if(c==='CTRL+END')setSelected('E6');
   else if(c==='CTRL+RIGHT')setSelected('E2');
   else if(c==='CTRL+DOWN')setSelected('B6');
   else if(c==='CTRL+G')setSelected('D4');
   else if(c==='CTRL+C')setClipboard(evaluate(rows,selected));
   else if(c==='CTRL+V'||c==='CTRL+ALT+V'){const target=selected==='B2'?'B4':selected;applyValue(clipboard||'Skopiowane',target);setSelected(target)}
   else if(c==='CTRL+Z'&&history){setRows(history.map(r=>[...r]));setStatus('Cofnięto ostatnią edycję w arkuszu.')}
   else if(c==='SHIFT+SPACE')setRowHighlight(pos(selected).r);
   else if(c==='CTRL+SPACE')setColHighlight(pos(selected).c);
   else if(c==='CTRL+B')setFormat(f=>({...f,bold:!f.bold}));
   else if(c==='CTRL+U')setFormat(f=>({...f,underline:!f.underline}));
   else if(c==='CTRL+SHIFT+5')setFormat(f=>({...f,percent:!f.percent}));
   else if(c==='CTRL+T')setFormat(f=>({...f,table:true}));
   else if(c==='CTRL+SHIFT+L')setFormat(f=>({...f,filter:!f.filter}));
   else if(c==='ALT+='){setSelected('E5');applyValue('=SUM(E2:E4)','E5')}
   else if(c==='F4'){setSelected('E2');applyValue('=$C$2*$D$2','E2')}
   else if(c==='SHIFT+F3'){setSelected('E5');applyValue('=SUM(E2:E4)','E5')}
   else if(c==='CTRL+E'){applyValue('Wypełniono','B4');setSelected('B4')}
   else if(c==='F2'){setStatus('Tryb edycji: wpisz nową wartość w polu poniżej tabeli.')}
   else if(c==='CTRL+PLUS'){setRows(old=>[...old.slice(0,4),['4','Nowa pozycja','1','100','=C5*D5'],...old.slice(4)] .slice(0,6));setStatus('Dodano przykładowy wiersz roboczy.')}
   else if(c==='CTRL+MINUS'){setRows(old=>old.map((r,i)=>i===3?['','','','','']:r));setStatus('Usunięto zawartość demonstracyjnego wiersza 4.')}
   else if(c==='CTRL+9'){setRowHighlight(3);setStatus('Wiersz 4 wskazany jako ukryty w przykładzie.')}
   else if(c==='SHIFT+F11'||c==='CTRL+N'){setSheet(n=>n+1);setRows(initialRows.map(r=>[...r]));setSelected('A1')}
   else if(c==='CTRL+O'){setRows(initialRows.map(r=>[...r]));setSelected('B2')}
   else if(c==='ALT+F1')setChart(true);
   else if(c==='CTRL+F'){setSelected('B4');setStatus('Znaleziono słowo Transport w komórce B4.')}
   else if(c==='CTRL+SHIFT+DOWN'){setRowHighlight(5);setStatus('Zaznaczono zakres od aktywnej komórki do końca danych.')}
   else if(c==='F9')setStatus('Przeliczono przykładowe formuły, w tym sumę kosztów.');
   else if(c==='CTRL+1')setStatus('Otworzono panel formatowania — użyj przycisku Format % poniżej.');
   else if(c==='CTRL+S')setStatus('Zapisano stan ćwiczenia w pamięci tej strony (nie na dysku).');
   else if(c==='CTRL+P')setStatus('Podgląd wydruku ćwiczenia: tabela ma 5 kolumn i nagłówki.');
   else if(c==='F12')setStatus('Zapisz jako — w tej symulacji dane pozostają lokalne do czasu zamknięcia ćwiczenia.');
  }else{
   const aliases:Record<string,Shape['kind']>={L:'line',LINE:'line',PL:'poly',PLINE:'poly',C:'circle',CIRCLE:'circle',REC:'rect',RECTANG:'rect',A:'arc',ARC:'arc',MT:'text'};
   if(aliases[c]){
    setShapes(old=>[...old.slice(-13),{id:runId+100,kind:aliases[c],x:36+((runId*43)%170),y:24+((runId*31)%92),size:1,rotation:0,layer}]);
    setCadInfo('Dodano obiekt do rysunku: '+active.label);
   }else if(c==='CP'||c==='I'){
    setShapes(old=>{const p=old[old.length-1]||initialDrawing[0];return [...old.slice(-13),{...p,id:runId+100,x:Math.min(230,p.x+34),y:Math.min(140,p.y+22)}]});
    setCadInfo('Powstała kopia obiektu w innym miejscu.');
   }else if(['M','RO','SC','MI'].includes(c)){
    setShapes(old=>old.map((s,i)=>i!==old.length-1?s:{...s,x:c==='M'?Math.min(230,s.x+37):s.x,rotation:c==='RO'?s.rotation+30:c==='MI'?-s.rotation:s.rotation,size:c==='SC'?s.size*1.25:s.size}));
    setCadInfo('Zmodyfikowano ostatni obiekt: '+active.label);
   }else if(c==='X'){
    setShapes(old=>old.map(s=>({...s,layer:2})));setCadInfo('Rozdzielono grupę — obiekty mają warstwę 2.');
   }else if(c==='LA'){setLayer(v=>v===1?2:1);setCadInfo('Zmieniono warstwę rysowania (zielona / niebieska).')}
   else if(c==='F3'){setSnap(v=>!v);setCadInfo('Przełączono przyciąganie do obiektów.')}
   else if(c==='F8'){setOrtho(v=>!v);setCadInfo('Przełączono tryb ortogonalny.')}
   else if(c==='F10'||c==='F11'||c==='F12'){setGrid(v=>!v);setCadInfo('Przełączono pomoc rysunkową: '+active.label)}
   else if(c==='Z'||c==='RE'){setGrid(v=>!v);setCadInfo('Odświeżono widok siatki rysunku.')}
   else if(c==='CTRL+Z'){setShapes(old=>old.length>1?old.slice(0,-1):old);setCadInfo('Cofnięto ostatni obiekt.')}
   else if(c==='ESC'){setCadInfo('Anulowano polecenie. Rysunek pozostał bez zmian.')}
   else if(c==='DIM'||c==='D'||c==='DI'){setCadInfo('Pomiar demonstracyjny: szerokość prostokąta = 114 jednostek.')}
   else if(c==='CTRL+S')setCadInfo('Rysunek ćwiczebny zapisano w pamięci bieżącej sesji.');
   else setCadInfo('Aktywne polecenie: '+active.label+'. To uproszczony widok ćwiczenia.');
  }
 },[runId]);
 function tapCommand(command:string){
  if(excel){
   if(command==='SUMA'){setSelected('E5');applyValue('=SUM(E2:E4)','E5');setStatus('SUMA liczy razem wartości z E2, E3 i E4.');}
   else if(command==='FORMULA'){setSelected('E2');applyValue('=C2*D2','E2');setStatus('Mnożenie: ilość C2 razy cena D2.');}
   else if(command==='WYKRES'){setChart(v=>!v);setStatus('Wykres porównuje wartości pozycji kosztorysu.');}
   else if(command==='COFNIJ'){if(history){setRows(history.map(r=>[...r]));setStatus('Cofnięto ostatnią edycję.')}else setStatus('Najpierw zmień wartość w komórce.');}
   else if(command==='RESET'){setRows(initialRows.map(r=>[...r]));setSelected('B2');setChart(false);setStatus('Wrócono do przykładowego kosztorysu.');}
  }else{
   const kinds:Record<string,Shape['kind']>={LINIA:'line',OKRAG:'circle',PROSTOKAT:'rect'};
   if(kinds[command]){
    setShapes(old=>[...old.slice(-13),{id:Math.max(0,...old.map(v=>v.id))+1,kind:kinds[command],
     x:35+(old.length*39)%160,y:25+(old.length*27)%92,size:1,rotation:0,layer}]);
    setCadInfo(command==='LINIA'?'Narysowano linię. Zobacz jej położenie na siatce.':
     command==='OKRAG'?'Dodano okrąg. Pomyśl, jak określa się środek i promień.':
     'Dodano prostokąt. Sprawdź jego cztery krawędzie.');
   }else if(command==='KOPIA'){
    setShapes(old=>{const last=old[old.length-1];return [...old.slice(-13),{...last,id:Math.max(...old.map(v=>v.id))+1,x:Math.min(215,last.x+42),y:Math.min(145,last.y+28)}]});
    setCadInfo('Powstała kopia ostatniego obiektu; oryginał pozostaje na miejscu.');
   }else if(command==='COFNIJ'){setShapes(old=>old.length>1?old.slice(0,-1):old);setCadInfo('Cofnięto ostatni utworzony obiekt.');}
   else if(command==='RESET'){setShapes(initialDrawing);setCadInfo('Rysunek przywrócony do stanu początkowego.');}
   setStatus('Wykonano polecenie przyciskiem ekranowym.');
  }
  setManualLabel(command);
 }
 const touchActions=excel?
  [{code:'FORMULA',title:'Formuła ×'},{code:'SUMA',title:'Suma ∑'},{code:'WYKRES',title:'Wykres ▥'},{code:'COFNIJ',title:'Cofnij ↶'},{code:'RESET',title:'Od nowa'}]:
  [{code:'LINIA',title:'Linia ╱'},{code:'OKRAG',title:'Okrąg ○'},{code:'PROSTOKAT',title:'Prostokąt ▭'},{code:'KOPIA',title:'Kopiuj ⧉'},{code:'COFNIJ',title:'Cofnij ↶'},{code:'RESET',title:'Od nowa'}];
 const selectedValue=evaluate(rows,selected);
 const chartValues=[1,2,3].map(i=>{
  const qty=parseSpreadsheetNumber(rows[i]?.[2]),cost=parseSpreadsheetNumber(rows[i]?.[3]);
  return Number.isFinite(qty*cost)?qty*cost:0;
 });
 return <View style={{backgroundColor:'white',padding:16,borderRadius:16,borderWidth:1,borderColor:'#d5e4d2',gap:13}}>
  <Text style={{color:'#68816a',fontSize:12,fontWeight:'900'}}>WARSZTAT INTERAKTYWNY · {excel?'EXCEL':'AUTOCAD'}</Text>
  <Text style={{fontSize:20,fontWeight:'900',color:ink}}>{excel?'Kosztorys prac — ćwiczenie':'Szkic pomieszczenia — ćwiczenie'}</Text>
  <Text style={{color:'#526a56',lineHeight:21,fontSize:14}}>Wybierz polecenie, sprawdź zmianę na ekranie, a potem wykonaj zadanie.</Text>
  {mobile&&<View style={{backgroundColor:'#edf5e8',padding:11,borderRadius:12,gap:9}}>
   <Text style={{color:ink,fontWeight:'900',fontSize:13}}>Sterowanie dotykiem · bez klawiatury</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
    {touchActions.map(a=><Pressable key={a.code} accessibilityRole="button" onPress={()=>tapCommand(a.code)}
     style={{minHeight:46,justifyContent:'center',paddingVertical:10,paddingHorizontal:12,borderRadius:9,backgroundColor:manualLabel===a.code?ink:'white',borderWidth:1,borderColor:'#c6dbc3'}}>
     <Text style={{color:manualLabel===a.code?'white':ink,fontWeight:'900',fontSize:13}}>{a.title}</Text>
    </Pressable>)}
   </View>
  </View>}
  {excel?<View style={{gap:10}}>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
    <Text style={{fontWeight:'800',color:ink}}>Arkusz {sheet} · {selected}</Text>
    <Pressable onPress={()=>{setRows(initialRows.map(r=>[...r]));setSelected('B2');setChart(false);setStatus('Przywrócono przykładowe dane.')}} style={{padding:8,backgroundColor:green,borderRadius:8}}><Text style={{color:ink,fontWeight:'800'}}>Reset</Text></Pressable>
   </View>
   <View style={{borderRadius:8,borderWidth:1,borderColor:'#cadacb',overflow:'hidden'}}>
    <View style={{flexDirection:'row',backgroundColor:'#d9e7d5'}}>
     <View style={{width:24}}/>{['A','B','C','D','E'].map(x=><Text key={x} style={{flex:1,textAlign:'center',fontWeight:'900',color:ink,padding:7,fontSize:12}}>{x}</Text>)}
    </View>
    {rows.map((line,i)=><View key={i} style={{flexDirection:'row',backgroundColor:rowHighlight===i?'#e3f4d8':'#fff'}}>
     <Text style={{width:24,color:'#536954',fontSize:11,textAlign:'center',paddingTop:9}}>{i+1}</Text>
     {line.slice(0,5).map((value,j)=>{
      const coord=String.fromCharCode(65+j)+(i+1),chosen=coord===selected;
      return <Pressable key={coord} onPress={()=>setSelected(coord)} style={{flex:1,minHeight:37,justifyContent:'center',padding:3,borderColor:chosen?'#278452':'#dce6d9',borderWidth:chosen?2:.5,backgroundColor:chosen?'#e3f4d7':colHighlight===j?'#eff6eb':'transparent'}}>
       <Text numberOfLines={2} style={{color:ink,fontSize:j===1?9:10,fontWeight:format.bold?'900':'400',textDecorationLine:format.underline?'underline':'none',textAlign:j>1?'right':'left'}}>{value.startsWith('=')?evaluate(rows,coord):value}</Text>
      </Pressable>;
     })}
    </View>)}
   </View>
   <Text style={{color:'#56715c',fontSize:12}}>Formuła / wartość komórki {selected} (zmień i zobacz wynik):</Text>
   <TextInput value={rows[pos(selected).r]?.[pos(selected).c]||''} onChangeText={v=>applyValue(v)} style={{borderWidth:1,borderColor:'#9ab69c',padding:12,borderRadius:9,color:ink,fontSize:15}}/>
   <Text style={{color:ink,fontWeight:'700'}}>Wynik: {selectedValue||'pusta komórka'} {format.percent?'· format procentowy':''}</Text>
   {format.table&&<Text style={{color:'#2c704a',fontWeight:'800'}}>Tabela z nagłówkami aktywna {format.filter?'· filtry włączone':''}</Text>}
   {chart&&<View style={{padding:12,backgroundColor:'#f2f7f0',borderRadius:10,gap:7}}>
    <Text style={{fontWeight:'900',color:ink}}>Wykres wartości prac</Text>
    {chartValues.map((v,i)=><View key={i} style={{flexDirection:'row',gap:8,alignItems:'center'}}><Text style={{width:66,color:ink,fontSize:11}}>{rows[i+1]?.[1]}</Text><View style={{backgroundColor:'#6a9e7a',width:Math.max(5,v/10),height:13,borderRadius:3}}/><Text style={{fontSize:11,color:ink}}>{v}</Text></View>)}
   </View>}
   <Pressable onPress={()=>setFormat(f=>({...f,percent:!f.percent}))} style={{padding:10,backgroundColor:green,borderRadius:8,alignSelf:'flex-start'}}><Text style={{color:ink,fontWeight:'800'}}>Format %: {format.percent?'włączony':'wyłączony'}</Text></Pressable>
  </View>:<View style={{gap:10}}>
   <View style={{height:252,backgroundColor:'#102a28',borderRadius:11,overflow:'hidden',position:'relative'}}>
    {grid&&Array.from({length:12},(_,i)=><View key={'v'+i} style={{position:'absolute',left:i*30,top:0,bottom:0,width:1,backgroundColor:'#26483e'}}/>)}
    {grid&&Array.from({length:9},(_,i)=><View key={'h'+i} style={{position:'absolute',top:i*30,left:0,right:0,height:1,backgroundColor:'#26483e'}}/>)}
    {shapes.map(shape=><View key={shape.id} style={{
     position:'absolute',left:shape.x,top:shape.y,
     width:(shape.kind==='line'||shape.kind==='poly'?96:shape.kind==='text'?100:shape.kind==='arc'?74:114)*shape.size,
     height:(shape.kind==='line'||shape.kind==='poly'?3:shape.kind==='text'?24:shape.kind==='arc'?38:76)*shape.size,
     borderWidth:shape.kind==='line'||shape.kind==='poly'||shape.kind==='text'?0:2,
     borderColor:shape.layer===1?'#d4ec9e':'#97d8e4',
     backgroundColor:shape.kind==='line'||shape.kind==='poly'?(shape.layer===1?'#d4ec9e':'#97d8e4'):'transparent',
     borderRadius:shape.kind==='circle'?90:shape.kind==='arc'?90:0,
     borderBottomWidth:shape.kind==='arc'?0:undefined,
     transform:[{rotate:(shape.rotation+(shape.kind==='line'?25:shape.kind==='poly'?50:0))+'deg'}]
    }}>{shape.kind==='text'&&<Text style={{color:'#d4ec9e',fontSize:10}}>WYMIAR 114</Text>}</View>)}
    {ortho&&<View style={{position:'absolute',right:12,top:12,backgroundColor:'#dcf3ae',padding:5,borderRadius:5}}><Text style={{color:'#1e3e30',fontSize:10}}>ORTHO ON</Text></View>}
    <View style={{position:'absolute',left:12,bottom:11,backgroundColor:'#1d4034',borderRadius:6,padding:6}}><Text style={{color:'#e6f2c7',fontSize:11}}>Obiektów: {shapes.length} · Warstwa {layer} · OSNAP {snap?'ON':'OFF'}</Text></View>
   </View>
   <Text style={{color:ink,lineHeight:22,fontWeight:'700'}}>{cadInfo}</Text>
   <Pressable onPress={()=>{setShapes(initialDrawing);setCadInfo('Rysunek przywrócony do stanu początkowego.');setLayer(1)}} style={{alignSelf:'flex-start',padding:10,borderRadius:8,backgroundColor:green}}><Text style={{color:ink,fontWeight:'800'}}>Wyczyść i zacznij od nowa</Text></Pressable>
  </View>}
  <View style={{backgroundColor:'#ebf5e8',padding:13,borderRadius:10,gap:5}}>
   <Text style={{color:ink,fontWeight:'900'}}>{active?'Wykonano: '+active.combo:'Wybierz pierwsze polecenie'}</Text>
   <Text style={{color:ink,fontSize:13,lineHeight:21}}>{status}</Text>
  </View>
  <Text style={{fontSize:11,color:'#718173',lineHeight:18}}>To autorska, uproszczona symulacja szkoleniowa. Nie jest programem Microsoft Excel ani Autodesk AutoCAD. Dane nie trafiają na komputer użytkownika.</Text>
 </View>;
}
