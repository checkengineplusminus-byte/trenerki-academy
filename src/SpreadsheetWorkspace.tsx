import React,{useEffect,useRef,useState} from 'react';
import {Pressable,Text,TextInput,View} from 'react-native';
import {LabButton,LabGroup,labInk,labStyles} from './LabControls';
import {cellAddress,cycleCellReference,evaluateCell,parseSpreadsheetNumber,refPosition,shiftFormula} from './SpreadsheetFormula';
import useLabKeys from './useLabKeys';

const sample=()=>[
 ['Lp.','Usługa','Ilość','Cena','Wartość'],
 ['1','Malowanie','2','350','=C2*D2'],
 ['2','Materiały','3','120','=C3*D3'],
 ['3','Transport','1','150','=C4*D4'],
 ['','','','Razem','=SUMA(E2:E4)'],
 ['','','','VAT 23%','=E5*0,23']
];
type Cell=NonNullable<ReturnType<typeof refPosition>>;
type Format={bold?:boolean;underlined?:boolean;percent?:boolean};
const interval=(a:Cell,b:Cell)=>({top:Math.min(a.row,b.row),bottom:Math.max(a.row,b.row),left:Math.min(a.column,b.column),right:Math.max(a.column,b.column)});

export default function SpreadsheetWorkspace({shortcut,runId}:{shortcut?:string;runId:number}){
 const [rows,setRows]=useState(sample),[history,setHistory]=useState<string[][][]>([]);
 const [active,setActive]=useState('C2'),[anchor,setAnchor]=useState('C2'),[selecting,setSelecting]=useState(false);
 const [address,setAddress]=useState('C2'),[draft,setDraft]=useState<string|null>(null);
 const [format,setFormat]=useState<Record<string,Format>>({}),[ribbon,setRibbon]=useState('home'),[showFormulas,setShowFormulas]=useState(false);
 const [clipboard,setClipboard]=useState<{source:Cell;value:string}>();
 const [status,setStatus]=useState('Kliknij komórkę, wpisz własne dane w pasku fx i zatwierdź Enterem albo przyciskiem ✓.');
 const [beginner,setBeginner]=useState(false),[beginnerStep,setBeginnerStep]=useState(0),[beginnerError,setBeginnerError]=useState('');
 const [didFillDown,setDidFillDown]=useState(false);
 const addressRef=useRef<React.ComponentRef<typeof TextInput>>(null),formulaRef=useRef<React.ComponentRef<typeof TextInput>>(null),caret=useRef(0);
 const activeCell=refPosition(active)!,anchorCell=refPosition(anchor)!,range=interval(anchorCell,activeCell);
 const ranged=active!==anchor;
 const raw=rows[activeCell.row][activeCell.column];
 const displayedRange=ranged?cellAddress(range.top,range.left)+':'+cellAddress(range.bottom,range.right):active;

 function select(first:string,last=first){
  setAnchor(first);setActive(last);setDraft(null);setSelecting(false);
  const box=interval(refPosition(first)!,refPosition(last)!);
  setAddress(first===last?last:cellAddress(box.top,box.left)+':'+cellAddress(box.bottom,box.right));
 }
 function selectAddress(){
  const parts=address.trim().toUpperCase().replace(/\$/g,'').split(':');
  if(parts.length>2||parts.some(p=>!refPosition(p))){setStatus('Podaj adres od A1 do E6 lub zakres, np. E2:E4.');return;}
  select(parts[0],parts[1]);setStatus('Zaznaczono '+parts.join(':')+'.');
 }
 function update(next:string[][]){
  if(next.every((row,i)=>row.every((value,j)=>value===rows[i][j])))return;
  setHistory(old=>[...old.slice(-39),rows]);setRows(next);
 }
 function write(value:string,cell:Cell=activeCell){
  const next=rows.map(row=>[...row]);next[cell.row][cell.column]=value;
  update(next);
 }
 function commit(){
  if(draft===null)return;
  write(draft);setDraft(null);setStatus('Zapisano '+active+'. Formuły przeliczono.');
 }
 function fill(direction:'down'|'right'){
  const down=direction==='down';
  if(down?range.top===range.bottom:range.left===range.right){
   setStatus(down?'Zaznacz co najmniej dwa wiersze, np. E2:E4.':'Zaznacz co najmniej dwie kolumny, np. C5:E5.');return;
  }
  const next=rows.map(row=>[...row]);
  for(let r=range.top;r<=range.bottom;r++)for(let c=range.left;c<=range.right;c++){
   const sourceRow=down?range.top:r,sourceCol=down?c:range.left;
   next[r][c]=shiftFormula(rows[sourceRow][sourceCol],r-sourceRow,c-sourceCol);
  }
  update(next);setDraft(null);
  if(down&&displayedRange==='E2:E4')setDidFillDown(true);
  setStatus((down?'Wypełniono w dół ':'Wypełniono w prawo ')+displayedRange+'. Adresy zablokowane przez $ pozostały stałe.');
 }
 function sum(){
  let source=ranged?range.top:activeCell.row-1;
  const col=activeCell.column,end=ranged?range.bottom:source,output=ranged?end+1:activeCell.row;
  if(!ranged)while(source>0&&rows[source-1][col].trim()&&Number.isFinite(parseSpreadsheetNumber(evaluateCell(rows,cellAddress(source-1,col)))))source--;
  if(range.left!==range.right||source<0||output>=rows.length||!rows[end]?.[col]?.trim()||!Number.isFinite(parseSpreadsheetNumber(evaluateCell(rows,cellAddress(end,col))))){
   setStatus('Zaznacz liczby w jednej kolumnie i zostaw pod nimi wolną komórkę albo wybierz komórkę pod liczbami.');return;
  }
  write('=SUMA('+cellAddress(source,col)+':'+cellAddress(end,col)+')',{row:output,column:col});
  select(cellAddress(output,col));setStatus('Wstawiono SUMA dla zakresu '+cellAddress(source,col)+':'+cellAddress(end,col)+'.');
 }
 function undo(){
  const previous=history.at(-1);
  if(previous){setRows(previous);setHistory(history.slice(0,-1));setDraft(null);setStatus('Cofnięto ostatnią zmianę danych.');}
 }
 function toggleFormat(key:keyof Format){
  setFormat(old=>({...old,[active]:{...old[active],[key]:!old[active]?.[key]}}));
 }
 function paste(){
  if(!clipboard){setStatus('Najpierw skopiuj wybraną komórkę.');return;}
  write(shiftFormula(clipboard.value,activeCell.row-clipboard.source.row,activeCell.column-clipboard.source.column));
  setStatus('Wklejono do '+active+'.');
 }
 function edit(){formulaRef.current?.focus();}
 function lock(){
  const value=cycleCellReference(draft??raw,caret.current);
  if(value===raw&&draft===null){setStatus('Wpisz formułę z adresem, np. =C2*D2.');return;}
  setDraft(value);formulaRef.current?.focus();setStatus('Zmieniono blokadę adresu znakiem $. Zatwierdź formułę.');
 }
 function action(combo:string):boolean{
  switch(combo.toUpperCase().replace(/\s/g,'')){
   case 'CTRL+D':fill('down');break;
   case 'CTRL+R':fill('right');break;
   case 'CTRL+C':setClipboard({source:activeCell,value:raw});setStatus('Skopiowano '+active+' do schowka warsztatu.');break;
   case 'CTRL+V':paste();break;
   case 'CTRL+Z':undo();break;
   case 'CTRL+B':toggleFormat('bold');break;
   case 'CTRL+U':toggleFormat('underlined');break;
   case 'CTRL+SHIFT+5':toggleFormat('percent');break;
   case 'CTRL+G':addressRef.current?.focus();break;
   case 'CTRL+HOME':select('A1');break;
   case 'CTRL+END':select('E6');break;
   case 'F2':edit();break;
   case 'F4':lock();break;
   case 'ALT+=':sum();break;
   default:return false;
  }
  return true;
 }
 useEffect(()=>{if(shortcut&&runId&&!action(shortcut))setStatus('Ten skrót opisano w lekcji. Funkcje warsztatu znajdziesz na kartach Narzędzia główne i Formuły.');},[runId]);
 useLabKeys('excel-workspace',event=>{
  const key=event.code==='Digit5'?'5':event.key.toUpperCase(),isEditing=(event.target as HTMLElement).tagName==='INPUT';
  if(isEditing)return key==='F4'&&(event.target as HTMLElement).dataset.testid==='excel-formula'&&action('F4');
  const combo=[event.ctrlKey?'CTRL':null,event.altKey?'ALT':null,event.shiftKey?'SHIFT':null,key].filter(Boolean).join('+');
  if(action(combo))return true;
  const isCell=(event.target as HTMLElement).dataset.testid?.startsWith('excel-cell-');
  if(!isCell)return false;
  const delta:Record<string,[number,number]>={ARROWLEFT:[0,-1],ARROWRIGHT:[0,1],ARROWUP:[-1,0],ARROWDOWN:[1,0]};
  if(!event.ctrlKey&&!event.altKey&&Object.hasOwn(delta,key)){
   const [dr,dc]=delta[key],next=cellAddress(Math.max(0,Math.min(5,activeCell.row+dr)),Math.max(0,Math.min(4,activeCell.column+dc)));
   select(event.shiftKey?anchor:next,next);
   return true;
  }
  if(key==='DELETE'){write('');return true;}
  if(!event.ctrlKey&&!event.altKey&&!event.metaKey&&event.key.length===1){setDraft(event.key);edit();return true;}
  return false;
 });
 const beginnerLessons=[
  {title:'Wskaż pierwszą ilość',instructions:'A, B, C, D, E to kolumny. 1, 2, 3 to wiersze. Kliknij komórkę C2 — kolumna C, drugi wiersz. Jest tam liczba 2.',
   help:'Kliknij kratkę na przecięciu kolumny C i wiersza 2, nie wpisuj jeszcze liczby.'},
  {title:'Zmień dane wejściowe',instructions:'W polu fx (pasek nad kratkami) wpisz 4,5. Kliknij „Zapisz komórkę ✓” albo naciśnij Enter. Przecinek oznacza część dziesiętną.',
   help:'Upewnij się, że aktywne C2 ma teraz 4,5; naciśnij Zapisz komórkę.'},
  {title:'Odczytaj przeliczony wynik',instructions:'Kliknij E2 — piąta kolumna, drugi wiersz. Zobaczysz 1575. W pasku fx znajdziesz =C2*D2 — znak * oznacza mnożenie.',
   help:'Otwórz E2 i sprawdź, czy wynik to 1575. Jeśli nie, wróć do C2 i popraw liczbę.'},
  {title:'Wskaż zakres kilku komórek',instructions:'W lewym polu na pasku arkusza wpisz E2:E4, a następnie kliknij „Idź do zakresu”. Dwukropek oznacza zakres od E2 do E4.',
   help:'Wpisz dokładnie E2:E4 w pole „Adres lub zakres komórek” i wybierz Idź do zakresu.'},
  {title:'Przećwicz wypełnianie w dół',instructions:'Kliknij „Wypełnij w dół · Ctrl+D” w narzędziach. Formuła z E2 zostanie skopiowana do E3 i E4, a względne numery wierszy zmienią się automatycznie.',
   help:'Najpierw zaznacz E2:E4, a następnie kliknij Wypełnij w dół. Samo przeczytanie instrukcji nie zalicza kroku.'},
  {title:'Sprawdź sumę końcową',instructions:'Kliknij E5, w którym znajduje się formuła =SUMA(E2:E4). Zobacz 2085. Porównaj: 1575 + 360 + 150 = 2085.',
   help:'Kliknij E5 i sprawdź wynik. Jeśli jest inny, odtwórz poprzednie kroki na danych ćwiczebnych.'}
 ] as const;
 function startBeginner(){
  setRows(sample());setHistory([]);setActive('A1');setAnchor('A1');setAddress('A1');setDraft(null);
  setDidFillDown(false);setBeginner(true);setBeginnerStep(0);setBeginnerError('');
  setStatus('Ćwiczenie od zera: klikaj w komórki w prawdziwie działającym arkuszu szkoleniowym.');
 }
 function verifyBeginner(){
  if(beginnerStep>=beginnerLessons.length)return;
  const tests=[
   active==='C2',
   parseSpreadsheetNumber(rows[1][2])===4.5,
   active==='E2'&&evaluateCell(rows,'E2')==='1575',
   displayedRange==='E2:E4',
   didFillDown&&rows[2][4]==='=C3*D3'&&rows[3][4]==='=C4*D4',
   active==='E5'&&evaluateCell(rows,'E5')==='2085'
  ];
  if(!tests[beginnerStep]){setBeginnerError(beginnerLessons[beginnerStep].help);return;}
  setBeginnerStep(old=>old+1);setBeginnerError('');
 }
 function display(value:string,id:string){
  if(showFormulas&&value.startsWith('='))return value;
  const result=evaluateCell(rows,id);
  const numeric=parseSpreadsheetNumber(result);
  if(format[id]?.percent&&result.trim()&&Number.isFinite(numeric))return (numeric*100).toLocaleString('pl-PL',{maximumFractionDigits:3})+'%';
  return result;
 }

 return <View style={labStyles.panel} testID="excel-workspace">
  <Text style={labStyles.heading}>Excel · arkusz kosztorysu</Text>
  <View testID="excel-zero-experience-guide" style={{borderWidth:1,borderColor:'#b8d2c3',padding:12,borderRadius:12,backgroundColor:'#f5f9f3',gap:9}}>
   <Text style={{fontSize:16,fontWeight:'900',color:labInk}}>Nigdy nie korzystałem z Excela</Text>
   {!beginner?<><Text style={{fontSize:13,lineHeight:21,color:'#416049'}}>Zaczniemy od zera — gdzie kliknąć, jak zapisać komórkę, czym jest formuła i jak skopiować ją do kilku wierszy. Każdy krok sprawdzamy w działającym arkuszu, bez znajomości skrótów.</Text>
    <LabButton label="Rozpocznij Excel od zera" onPress={startBeginner}/></>:
    beginnerStep<beginnerLessons.length?<View style={{gap:9}}>
     <Text style={{fontSize:11,fontWeight:'900',color:'#497b5c'}}>KROK {beginnerStep+1}/6</Text>
     <Text testID="excel-beginner-title" style={{fontSize:15,fontWeight:'900',color:labInk}}>{beginnerLessons[beginnerStep].title}</Text>
     <Text style={{fontSize:13,lineHeight:22,color:'#305744'}}>{beginnerLessons[beginnerStep].instructions}</Text>
     <LabButton label="Sprawdź wykonanie kroku Excel" onPress={verifyBeginner}/>
     {!!beginnerError&&<Text testID="excel-beginner-error" accessibilityLiveRegion="polite" style={{fontSize:13,lineHeight:21,color:'#99512f'}}>{beginnerError}</Text>}
    </View>:<View style={{gap:6}}>
     <Text testID="excel-beginner-success" style={{fontWeight:'900',fontSize:15,color:'#276940'}}>✓ Potrafisz samodzielnie edytować, liczyć, kopiować formuły i kontrolować wynik.</Text>
     <Text style={{fontSize:13,lineHeight:20,color:'#305744'}}>To symulator szkoleniowy; ćwiczenia w rzeczywistym Microsoft Excel wykonujesz osobno.</Text>
     <LabButton label="Powtórz Excel od zera" onPress={startBeginner}/>
    </View>}
  </View>
  <Text style={labStyles.body}>Zmień C2 na 4,5 i sprawdź E2. Potem zaznacz E2:E4 i użyj Wypełnij w dół. W pasku fx porównaj formuły z wynikami.</Text>
  <View style={labStyles.ribbon}>
   <View style={labStyles.row}>
    <LabButton label="Narzędzia główne / Home" selected={ribbon==='home'} onPress={()=>setRibbon('home')}/>
    <LabButton label="Formuły / Formulas" selected={ribbon==='formulas'} onPress={()=>setRibbon('formulas')}/>
   </View>
   {ribbon==='home'?<>
    <LabGroup label="Edycja / Editing → Wypełnij / Fill">
     <LabButton label="Wypełnij w dół · Ctrl+D" onPress={()=>fill('down')}/>
     <LabButton label="Wypełnij w prawo · Ctrl+R" onPress={()=>fill('right')}/>
     <LabButton label="Autosumowanie · Alt+=" onPress={sum}/>
    </LabGroup>
    <LabGroup label="Schowek / Clipboard oraz format">
     <LabButton label="Kopiuj · Ctrl+C" onPress={()=>action('CTRL+C')}/>
     <LabButton label="Wklej · Ctrl+V" disabled={!clipboard} onPress={paste}/>
     <LabButton label="Cofnij · Ctrl+Z" disabled={!history.length} onPress={undo}/>
     <LabButton label="Pogrubienie" selected={format[active]?.bold} onPress={()=>toggleFormat('bold')}/>
     <LabButton label="Format %" selected={format[active]?.percent} onPress={()=>toggleFormat('percent')}/>
    </LabGroup>
   </>:<LabGroup label="Biblioteka funkcji i inspekcja formuł">
    <LabButton label="Autosumowanie · Alt+=" onPress={sum}/>
    <LabButton label="Pokaż formuły" selected={showFormulas} onPress={()=>setShowFormulas(v=>!v)}/>
    <LabButton label="Blokuj adres · F4" onPress={lock}/>
   </LabGroup>}
  </View>
  <View style={labStyles.row}>
   <TextInput ref={addressRef} accessibilityLabel="Adres lub zakres komórek" value={address} onChangeText={setAddress} onSubmitEditing={selectAddress}
    autoCorrect={false} autoCapitalize="characters" style={[labStyles.input,{width:92}]}/>
   <LabButton label="Idź do zakresu" onPress={selectAddress}/>
   <LabButton label={selecting?'Wskaż koniec zakresu':'Zaznacz zakres'} selected={selecting} onPress={()=>{if(!selecting)select(active);setSelecting(!selecting);}}/>
  </View>
  <View style={labStyles.row}>
   <Text style={labStyles.eyebrow}>fx</Text>
   <TextInput ref={formulaRef} testID="excel-formula" accessibilityLabel="Formuła lub wartość wybranej komórki" value={draft??raw} onChangeText={setDraft}
    onSelectionChange={event=>{caret.current=event.nativeEvent.selection.start;}} onBlur={commit} onSubmitEditing={commit}
    autoCorrect={false} autoCapitalize="none" style={[labStyles.input,{flex:1,minWidth:110}]}/>
   <LabButton label="Zapisz komórkę ✓" onPress={commit}/>
   <LabButton label="Edytuj · F2" onPress={edit}/>
  </View>
  <View style={{borderWidth:1,borderColor:'#c1d5c6',borderRadius:8,overflow:'hidden'}}>
   <View style={{flexDirection:'row',backgroundColor:'#dcebdd'}}>
    <View style={{width:22}}/>{['A','B','C','D','E'].map(letter=><Text key={letter} style={{flex:1,textAlign:'center',paddingVertical:8,color:labInk,fontWeight:'900'}}>{letter}</Text>)}
   </View>
   {rows.map((row,i)=><View key={i} style={{flexDirection:'row'}}>
    <Text style={{width:22,textAlign:'center',color:'#496b53',paddingTop:12,fontSize:12,backgroundColor:'#edf4eb'}}>{i+1}</Text>
    {row.map((value,j)=>{
     const id=cellAddress(i,j),chosen=id===active,inside=i>=range.top&&i<=range.bottom&&j>=range.left&&j<=range.right;
     const shown=display(value,id);
     return <Pressable key={id} testID={'excel-cell-'+id} accessibilityRole="button" accessibilityLabel={id+(shown?' '+shown:' pusta')}
      accessibilityState={{selected:inside}} onPress={()=>{if(selecting)select(anchor,id);else if(chosen)edit();else select(id);}}
      style={{flex:1,minHeight:42,borderWidth:chosen?2:0.5,borderColor:chosen?'#237346':'#c7ddcd',backgroundColor:inside?'#dff0dc':'white',justifyContent:'center',padding:3}}>
      <Text numberOfLines={2} style={{fontSize:12,color:labInk,fontWeight:format[id]?.bold||i===0?'900':'500',textDecorationLine:format[id]?.underlined?'underline':'none'}}>{shown}</Text>
     </Pressable>;
    })}
   </View>)}
  </View>
  <Text style={labStyles.eyebrow}>Arkusz 1 · Zaznaczenie {displayedRange} · Wynik {active}: {evaluateCell(rows,active)||'pusta komórka'}</Text>
  <Text accessibilityLiveRegion="polite" style={labStyles.status}>{status}</Text>
 </View>;
}
