import React,{useEffect,useMemo,useState} from 'react';
import {Linking,Platform,Pressable,ScrollView,Text,TextInput,View,useWindowDimensions} from 'react-native';
import fixtures from '../content/excel-analyst-data.json';
import {parseExcelResponseNumber} from './excelMissionAnswers';
import {auditImport,findInvoice,lineMargin,lineRevenue,pivot,plNumber,round2,safeDataset,scenario,sumIfs,total,type GroupBy,type Measure,type Sale,type SourceRow} from './excelAdvancedMath';

type Mode='filter'|'sumifs'|'lookup'|'pivot'|'chart'|'model'|'scenario'|'audit';
const modes:{id:Mode;label:string}[]=[
 {id:'filter',label:'Filtr danych'},{id:'sumifs',label:'SUMA.WARUNKÓW'},{id:'lookup',label:'X.WYSZUKAJ'},
 {id:'pivot',label:'Tabela przestawna'},{id:'chart',label:'Wykres danych'},{id:'model',label:'Przychód i marża'},{id:'scenario',label:'Scenariusze'},{id:'audit',label:'Audyt CSV'}
];
const source=fixtures.rows as Sale[],broken=fixtures.dirty as SourceRow[];
const initialMode=(lessonNo:number):Mode=>lessonNo===24?'lookup':lessonNo===17?'chart':lessonNo===20?'model':lessonNo===25||lessonNo===23?'pivot':lessonNo===26?'scenario':lessonNo===21||lessonNo===22||lessonNo>=28?'audit':'sumifs';
const ink='#1c4331',muted='#4d6756';
const money=(v:number)=>v.toLocaleString('pl-PL',{minimumFractionDigits:2,maximumFractionDigits:2})+' zł';
const headingStyle={fontSize:14,color:ink,fontWeight:'900' as const};
const button={minHeight:44,borderWidth:1,borderColor:'#cadbce',borderRadius:9,paddingHorizontal:11,paddingVertical:8,justifyContent:'center' as const};
function Choice({label,selected,onPress}:{label:string;selected?:boolean;onPress:()=>void}){
 return <Pressable accessibilityRole="button" accessibilityState={{selected:!!selected}} accessibilityLabel={label} onPress={onPress}
  style={[button,{backgroundColor:selected?'#d9eee0':'white',borderColor:selected?'#4c9970':'#cadbce'}]}>
  <Text style={{color:ink,fontWeight:selected?'900':'700',fontSize:13}}>{label}</Text>
 </Pressable>;
}
const compare=(a:string,n:number)=>{const value=parseExcelResponseNumber(a);return value!==null&&Math.abs(value-n)<0.005;};
export default function ExcelAnalystWorkbench({lessonNo}:{lessonNo:number}){
 const {width}=useWindowDimensions(),compact=width<650;
 const [rows,setRows]=useState<Sale[]>(()=>source.map(x=>({...x})));
 const [mode,setMode]=useState<Mode>(initialMode(lessonNo));
 const [region,setRegion]=useState('Północ'),[category,setCategory]=useState('Materiały');
 const [invoice,setInvoice]=useState('FV-014'),[group,setGroup]=useState<GroupBy>(lessonNo===25?'month':'region'),[metric,setMetric]=useState<Measure>('revenue');
 const [groupItem,setGroupItem]=useState(lessonNo===25?'Razem':'Północ'),[pivotSnapshot,setPivotSnapshot]=useState<Sale[]|null>(null);
 const [revision,setRevision]=useState(0),[pivotRevision,setPivotRevision]=useState(-1);
 const [increase,setIncrease]=useState('15'),[quantity,setQuantity]=useState('12');
 const [answer,setAnswer]=useState(''),[feedback,setFeedback]=useState<'idle'|'right'|'wrong'>('idle');
 const [status,setStatus]=useState(''),[guesses,setGuesses]=useState<Record<number,string>>({}),[showCsv,setShowCsv]=useState(false);
 const [showWorkedSolution,setShowWorkedSolution]=useState(false);
 const good=useMemo(()=>safeDataset(rows),[rows]);
 const filtered=useMemo(()=>rows.filter(x=>(!region||x.region===region)&&(!category||x.category===category)),[rows,region,category]);
 const matching=useMemo(()=>findInvoice(rows,invoice),[rows,invoice]);
 const pivotRows=useMemo(()=>pivot(pivotSnapshot??[],group,metric),[pivotSnapshot,group,metric]);
 const chartRows=useMemo(()=>pivot(rows,'region','revenue'),[rows]);
 const chartBest=chartRows.reduce((a,b)=>!a||b.value>a.value?b:a,null as null|{key:string;value:number;count:number});
 const issues=useMemo(()=>auditImport(rows,broken),[rows]);
 const increaseNumber=parseExcelResponseNumber(increase,true);
 const impact=useMemo(()=>increaseNumber===null?null:(()=>{try{return scenario(rows,increaseNumber);}catch{return null;}})(),[rows,increaseNumber]);
 const expectedValue=mode==='filter'?filtered.length:mode==='sumifs'?sumIfs(rows,region,category):
  mode==='lookup'?matching.kind==='found'?matching.amount:NaN:
  mode==='model'?total(rows,'margin'):
  mode==='chart'?NaN:
  mode==='pivot'?groupItem==='Razem'?pivotRows.reduce((sum,row)=>sum+row.value,0):pivotRows.find(x=>x.key===groupItem)?.value??NaN:
  mode==='scenario'?impact?.marginDelta??NaN:issues.length;
 const expectedLabel=mode==='lookup'&&matching.kind==='missing'?'BRAK':mode==='lookup'&&matching.kind==='duplicate'?'DUPLIKAT':mode==='chart'?chartBest?.key||'BRAK':String(expectedValue);
 const dirtyLine=rows.find(x=>x.invoice==='FV-001')!;
 function changeMode(value:Mode){
  setMode(value);setAnswer('');setFeedback('idle');setStatus('');setShowWorkedSolution(false);
 }
 function setControl(fn:()=>void){fn();setAnswer('');setFeedback('idle');setShowWorkedSolution(false);}
 function validateAnswer(){
  if(mode==='pivot'&&!pivotSnapshot){setStatus('Najpierw naciśnij „Odśwież podsumowanie”, aby policzyć dane.');setFeedback('wrong');return;}
  if(mode==='pivot'&&pivotRevision!==revision){setStatus('Najpierw odśwież tabelę przestawną po zmianie danych — stary wynik jest nieaktualny.');setFeedback('wrong');return;}
  if(mode==='scenario'&&!impact){setStatus('Podaj zmianę kosztu od −50 do +200 procent.');setFeedback('wrong');return;}
  if(mode==='audit'){
   const accepted=broken.every((_,i)=>guesses[i]===issues.find(x=>x.rowIndex===i)?.kind);
   setFeedback(accepted?'right':'wrong');
   setStatus(accepted?'Wykryto wszystkie cztery anomalie — nie zostały dopisane do poprawnych rekordów.':'Nie wszystkie źródłowe wiersze są prawidłowo oznaczone. Duplikat, zła ilość, pusty kontrahent i pusta cena wymagają różnych działań.');
   return;
  }
  const accepted=Number.isFinite(expectedValue)?compare(answer,expectedValue):answer.trim().toLocaleUpperCase('pl-PL')===expectedLabel.toLocaleUpperCase('pl-PL');
  setFeedback(accepted?'right':'wrong');
  setStatus(accepted?'Wynik uzgodniony niezależnie z danymi źródłowymi.':'Wynik różni się od danych źródłowych — sprawdź zakres, kryteria, duplikaty lub jednostki.');
 }
 function applyQuantity(){
  const next=plNumber(quantity);
  if(next===null||!Number.isInteger(next)||next<=0||next>100000){
   setStatus('Ilość musi być dodatnią liczbą całkowitą.');return;
  }
  setRows(old=>old.map(row=>row.invoice==='FV-001'?{...row,quantity:next}:row));
  setRevision(n=>n+1);setFeedback('idle');setAnswer('');
  setStatus('Zmieniono ilość FV-001 na '+next+'. Przelicz SUMA.WARUNKÓW i odśwież tabelę przestawną.');
 }
 function restore(){
  setRows(source.map(x=>({...x})));setQuantity('12');setRevision(n=>n+1);
  setPivotSnapshot(null);setPivotRevision(-1);setFeedback('idle');setAnswer('');setStatus('Przywrócono oryginalne dane.');setShowWorkedSolution(false);
 }
 function refreshPivot(){
  setPivotSnapshot(rows.map(x=>({...x})));setPivotRevision(revision);
  setStatus('Odświeżono agregację z aktualnej tabeli. Suma kontrolna wynosi '+money(total(rows))+'.');
  setFeedback('idle');setAnswer('');
 }
 useEffect(()=>{changeMode(initialMode(lessonNo));},[lessonNo]);
 const groups=(group==='region'?['Północ','Centrum','Południe']:group==='category'?['Materiały','Usługi','Transport']:group==='month'?['2026-01','2026-02','2026-03']:['Firma Alfa','Firma Beta','Firma Gamma','Firma Delta','Firma Epsilon']);
 const formulas:Record<Mode,string>={
  filter:'=FILTR(A2:K19;(D2:D19="'+region+'")*(E2:E19="'+category+'");"Brak rekordów")',
  sumifs:'=SUMA.WARUNKÓW(J2:J19;D2:D19;"'+region+'";E2:E19;"'+category+'")',
  lookup:'=X.WYSZUKAJ("'+invoice+'";A2:A19;J2:J19;"Brak";0)',
  pivot:'Wstaw → Tabela przestawna → Wiersze: '+group+' → Wartości: '+metric+' → Odśwież',
  chart:'Wstaw → Wykres kolumnowy → Kategorie: Region → Oś Y: Suma Wartości netto (PLN). Zweryfikuj oś od 0.',
  model:'Przychód = SUMA(ilość * cena_netto); Koszty = SUMA(ilość * koszt_jednostkowy); Marża = Przychód − Koszty.',
  scenario:'Koszt materiałów = koszt_bazowy*(1+'+increase+'%) ; marża = przychód − suma kosztów',
  audit:'Dane → Z tekstu/CSV → typy danych → kontrola duplikatów, pustych pól i błędów'
 };
 return <View testID="excel-analyst-workbench" style={{borderWidth:1,borderColor:'#b9d4c3',borderRadius:16,backgroundColor:'#f2f8f4',padding:compact?11:17,gap:13,marginVertical:10}}>
  <View style={{gap:5}}>
   <Text style={{color:'#246343',fontSize:11,fontWeight:'900'}}>PRACOWNIA EKSPERCKA · FAKTYCZNE OPERACJE NA DANYCH</Text>
   <Text style={{color:ink,fontSize:compact?18:21,fontWeight:'900'}}>Excel: rejestr sprzedaży, model i audyt</Text>
   <Text style={{color:muted,fontSize:13,lineHeight:20}}>18 fikcyjnych faktur, 3 regiony, 3 miesiące i 4 świadomie błędne rekordy. Wyniki są liczone z danych na ekranie — można zmienić ilość, ponownie obliczyć sumy i znaleźć rozbieżność.</Text>
   <Text style={{color:'#496357',fontSize:12,lineHeight:19}}>To autorska symulacja obliczeń i etapów pracy, nie pełna aplikacja Microsoft Excel. Własny plik CSV możesz pobrać i przeanalizować w prawdziwym Excelu.</Text>
  </View>
  {Platform.OS==='web'?<a href="/academy/assets/excel-practice-sales.csv" download="excel-practice-sales.csv" style={{color:'#256b4c',fontSize:13,fontWeight:800,textDecoration:'underline',minHeight:44,display:'flex',alignItems:'center'}}>
   Pobierz prawdziwy plik danych CSV (18 faktur)
  </a>:<Pressable accessibilityRole="link" onPress={()=>void Linking.openURL('https://trenerki.com/academy/assets/excel-practice-sales.csv')} style={{minHeight:44,justifyContent:'center'}}>
   <Text style={{color:'#256b4c',fontSize:13,fontWeight:'800'}}>Pobierz dane CSV (18 faktur)</Text>
  </Pressable>}
  <View style={{borderLeftWidth:3,borderColor:'#609975',padding:10,backgroundColor:'#fff',borderRadius:8,gap:7}}>
   <Text style={{fontSize:13,fontWeight:'900',color:ink}}>Rzeczywiste ćwiczenie w Microsoft Excel</Text>
   <Text style={{fontSize:13,lineHeight:21,color:muted}}>CSV zawiera 18 faktur oraz wartości kontrolne w kolumnach J (Wartość netto) i K (Marża netto). Są to wartości zapisane, a nie formuły. Aby arkusz reagował na zmianę ilości, wpisz w J2 formułę =G2*H2, w K2 formułę =G2*(H2-I2), następnie wypełnij je w dół do wiersza 19. Zanim udostępnisz raport, uzgodnij sumy: 28 245 zł przychodu i 9 109 zł marży.</Text>
   <Text style={{fontSize:12,lineHeight:19,color:muted}}>Plik używa średnika jako separatora i polskich nagłówków. Importuj przez Dane → Z tekstu/CSV, ustaw UTF-8 i sprawdź rozpoznane typy liczb. To ważny etap pracy eksperckiej.</Text>
   {Platform.OS==='web'?<a href="/academy/assets/excel-practice-errors.csv" download="excel-practice-errors.csv"
     style={{fontSize:13,fontWeight:800,color:'#245e87',textDecoration:'underline',minHeight:44,display:'flex',alignItems:'center'}}>Pobierz błędne rekordy CSV do audytu Power Query (4 wiersze)</a>:
    <Pressable accessibilityRole="link" onPress={()=>void Linking.openURL('https://trenerki.com/academy/assets/excel-practice-errors.csv')} style={{minHeight:44,justifyContent:'center'}}>
     <Text style={{fontSize:13,fontWeight:'900',color:'#245e87'}}>Pobierz błędne CSV do audytu (4 wiersze)</Text>
    </Pressable>}
  </View>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{modes.map(x=><Choice key={x.id} label={x.label} selected={mode===x.id} onPress={()=>changeMode(x.id)}/>)}</View>
  <View style={{borderWidth:1,borderColor:'#dce9de',backgroundColor:'#fff',borderRadius:11,padding:12,gap:11}}>
   <Text style={headingStyle}>{mode==='filter'?'Odfiltruj rekordy, nie kasuj ich':mode==='sumifs'?'SUMA.WARUNKÓW — dwa kryteria':mode==='lookup'?'X.WYSZUKAJ — dokładny identyfikator':mode==='pivot'?'Tabela przestawna — przelicz i odśwież':mode==='chart'?'Wykres wartości netto w trzech regionach':mode==='model'?'Model przychodu, kosztów i marży':mode==='scenario'?'Model wrażliwości marży':'Power Query — znajdź błędy przed importem'}</Text>
   {(mode==='filter'||mode==='sumifs')&&<>
    <Text style={{fontSize:13,color:muted}}>Wybierz region i kategorię. Wynik powinien odpowiadać dokładnie obu warunkom.</Text>
    <Text style={{fontWeight:'800',fontSize:12,color:ink}}>Region</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{['Północ','Centrum','Południe'].map(x=><Choice key={x} label={x} selected={region===x} onPress={()=>setControl(()=>setRegion(x))}/>)}</View>
    <Text style={{fontWeight:'800',fontSize:12,color:ink}}>Kategoria</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{['Materiały','Usługi','Transport'].map(x=><Choice key={x} label={x} selected={category===x} onPress={()=>setControl(()=>setCategory(x))}/>)}</View>
   </>}
   {mode==='lookup'&&<>
    <Text style={{fontSize:13,color:muted}}>Podaj numer faktury, np. FV-014. Brak wyniku musi pozostać brakiem, a nie fałszywą kwotą zero.</Text>
    <TextInput accessibilityLabel="Numer faktury do dokładnego wyszukiwania" value={invoice} onChangeText={v=>setControl(()=>setInvoice(v))}
     autoCapitalize="characters" placeholder="FV-014" style={{backgroundColor:'#fff',color:ink,padding:12,borderWidth:1,borderColor:'#bfcfc2',borderRadius:9,fontSize:15}}/>
    <Text style={{fontSize:12,color:muted}}>Liczba dopasowań: {matching.kind==='found'?1:matching.matches}. {matching.kind==='found'?'Kontrahent: '+matching.row.client:matching.kind==='missing'?'Brak numeru w danych':'Duplikat numeru — wymaga audytu'}</Text>
   </>}
   {mode==='pivot'&&<>
    <Text style={{fontSize:13,color:muted}}>Wybierz pole grupowania, miarę i odświeżenie. Po edycji rekordu tabela wymaga kolejnego odświeżenia.</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{(['region','category','month','client'] as GroupBy[]).map(x=><Choice key={x} label={x==='region'?'Region':x==='category'?'Kategoria':x==='month'?'Miesiąc':'Kontrahent'} selected={group===x} onPress={()=>setControl(()=>{setGroup(x);setGroupItem(x==='region'?'Północ':x==='category'?'Materiały':x==='month'?'2026-01':'Firma Alfa');})}/>)}</View>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{(['revenue','margin','count'] as Measure[]).map(x=><Choice key={x} label={x==='revenue'?'Suma netto':x==='margin'?'Marża':'Liczba'} selected={metric===x} onPress={()=>setControl(()=>setMetric(x))}/>)}</View>
    <Pressable accessibilityRole="button" accessibilityLabel="Odśwież tabelę przestawną" onPress={refreshPivot}
     style={[button,{backgroundColor:'#e0f1e5',alignSelf:'flex-start'}]}><Text style={{color:ink,fontSize:13,fontWeight:'900'}}>↻ Odśwież podsumowanie</Text></Pressable>
    {pivotSnapshot&&<View style={{gap:5}}>
      <Text testID="excel-pivot-stale" style={{fontSize:12,color:pivotRevision===revision?'#387e50':'#a36429',fontWeight:'800'}}>{pivotRevision===revision?'Podsumowanie aktualne':'Uwaga: zmieniły się dane — wymagane odświeżenie'}</Text>
      {pivotRows.map(x=><View key={x.key} style={{flexDirection:'row',justifyContent:'space-between',padding:6,borderBottomWidth:.5,borderColor:'#d4e6d8',gap:9}}>
       <Pressable accessibilityRole="button" accessibilityLabel={'Wybierz grupę '+x.key} onPress={()=>setControl(()=>setGroupItem(x.key))} style={{minHeight:37,justifyContent:'center',flex:1}}>
        <Text style={{fontWeight:groupItem===x.key?'900':'600',fontSize:13,color:ink}}>{x.key}</Text>
       </Pressable>
       <Text style={{color:ink,fontWeight:'800',fontSize:13,textAlign:'right',alignSelf:'center'}}>{metric==='count'?x.value:money(x.value)}</Text>
      </View>)}
      <Text style={{fontSize:12,color:muted}}>Suma grup: {metric==='count'?pivotRows.reduce((s,r)=>s+r.value,0):money(pivotRows.reduce((s,r)=>s+r.value,0))}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Wybierz grupę Razem" onPress={()=>setControl(()=>setGroupItem('Razem'))}
       style={{minHeight:44,backgroundColor:groupItem==='Razem'?'#ddf0e0':'#f7fbf7',borderWidth:1,borderColor:'#d4e6d8',borderRadius:8,padding:8,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
       <Text style={{fontSize:13,color:ink,fontWeight:'900'}}>RAZEM · wszystkie grupy</Text>
       <Text style={{fontSize:13,color:ink,fontWeight:'900'}}>{metric==='count'?pivotRows.reduce((s,r)=>s+r.value,0):money(pivotRows.reduce((s,r)=>s+r.value,0))}</Text>
      </Pressable>
     </View>}
   </>}
   {mode==='chart'&&<View testID="excel-advanced-chart" style={{gap:10}}>
    <Text style={{fontSize:13,color:muted}}>Źródło: 18 rekordów. Słupki pokazują sumę wartości netto w regionach; dane aktualizują się po zmianie faktury. Oś zaczyna się od zera.</Text>
    {chartRows.map(r=><View key={r.key} style={{gap:4}}>
     <View style={{flexDirection:'row',justifyContent:'space-between',gap:10}}><Text style={{fontSize:12,fontWeight:'900',color:ink}}>{r.key}</Text><Text style={{fontSize:12,color:ink}}>{money(r.value)}</Text></View>
     <View style={{height:24,backgroundColor:'#edf4ee',borderRadius:5,overflow:'hidden'}}>
      <View accessibilityLabel={r.key+' — '+money(r.value)} style={{height:'100%',width:(100*r.value/(chartRows.reduce((a,b)=>Math.max(a,b.value),0)||1))+'%',backgroundColor:'#34825d',borderRadius:5}}/>
     </View>
    </View>)}
    <Text style={{fontSize:11,color:muted}}>Wykres ćwiczebny: Wartość netto w PLN, skala od 0 do największej wartości.</Text>
   </View>}
   {mode==='model'&&<View testID="excel-advanced-model" style={{gap:8}}>
    <Text style={{fontSize:13,lineHeight:21,color:muted}}>Rozdziel wartość sprzedaży od kosztów zakupu. Każdy rekord ma ilość, cenę netto i koszt jednostkowy — policz trzy niezależne sumy i uzgodnij bilans.</Text>
    <Text style={{fontSize:13,color:ink}}>Wiersze źródłowe: {rows.length}</Text>
    <Text style={{fontSize:13,color:ink}}>Przychód netto: {money(total(rows))}</Text>
    <Text style={{fontSize:13,color:ink}}>Koszty łącznie: {money(round2(total(rows)-total(rows,'margin')))}</Text>
    <Text style={{fontSize:13,color:ink,fontWeight:'900'}}>Marża netto: oblicz i wpisz poniżej (nie utożsamiaj jej z przychodem)</Text>
    <Text style={{fontSize:12,color:muted}}>Kontrola: suma marż ze wszystkich wierszy powinna odpowiadać różnicy Przychód − Koszty.</Text>
   </View>}
   {mode==='scenario'&&<>
    <Text style={{fontSize:13,color:muted}}>Zmienia się koszt jednostkowy materiałów, ale ceny sprzedaży pozostają stałe. Sprawdź wpływ na marżę zamiast mylić go z przychodem.</Text>
    <View style={{flexDirection:'row',alignItems:'center',gap:9}}>
     <TextInput testID="excel-scenario-percent" accessibilityLabel="Wzrost kosztu materiałów w procentach" value={increase} onChangeText={v=>setControl(()=>setIncrease(v))}
      keyboardType="decimal-pad" style={{width:115,padding:12,borderWidth:1,borderColor:'#bdcec1',borderRadius:9,color:ink,backgroundColor:'#fff'}}/>
     <Text style={{fontWeight:'800',color:ink}}>% kosztu</Text>
    </View>
    {!!impact?<Text style={{fontSize:13,lineHeight:21,color:muted}}>Bazowy przychód: {money(impact.baselineRevenue)} · Bazowa marża: {money(impact.baselineMargin)}</Text>
     :<Text style={{color:'#a05c35',fontSize:13}}>Dozwolony zakres: −50% do +200%.</Text>}
   </>}
   {mode==='audit'&&<>
    <Text style={{fontSize:13,color:muted}}>Nie zakładamy, że dane CSV są poprawne. Wybierz, co jest nie tak z każdym z czterech rekordów. Do tej próby nie importujemy błędnych pozycji.</Text>
    {broken.map((r,i)=><View key={r.invoice+'-'+i} style={{padding:10,borderWidth:1,borderColor:'#d6e3d8',borderRadius:9,gap:7,backgroundColor:'#fbfcfc'}}>
     <Text style={{fontSize:12,fontWeight:'900',color:ink}}>{r.invoice} · {r.client||'(pusty kontrahent)'} · ilość {r.quantity||'(pusta)'} · cena {r.netPrice||'(pusta)'}</Text>
     <View style={{flexDirection:'row',gap:5,flexWrap:'wrap'}}>{[
      ['duplicate','Duplikat'],['quantity','Zła ilość'],['client','Brak kontrahenta'],['price','Brak ceny']
     ].map(([key,label])=><Choice key={key} label={label} selected={guesses[i]===key} onPress={()=>setControl(()=>setGuesses(old=>({...old,[i]:key})))}/>)}</View>
    </View>)}
   </>}
   {mode!=='audit'&&<View style={{gap:9}}>
    <Text style={{fontSize:13,color:ink,fontWeight:'900'}}>{mode==='filter'?'Ile wierszy spełnia obydwa kryteria?':mode==='sumifs'?'Jaka jest suma wartości netto w PLN?':mode==='lookup'?'Jaka jest wartość netto tej faktury?':mode==='pivot'?'Jaka jest wartość zaznaczonej grupy '+groupItem+'?':mode==='chart'?'Który region ma najwyższą sprzedaż?':mode==='model'?'Jaka jest MARŻA NETTO ze wszystkich 18 faktur?':'O ile PLN zmieni się marża? (wpisz kwotę ze znakiem)'}</Text>
    <Text testID="excel-advanced-answer-instruction" style={{fontSize:12,color:muted,lineHeight:20}}>{mode==='lookup'||mode==='chart'?'Wpisz odpowiednią nazwę lub kod z danych. Nie wpisuj formuły.':'Wpisz końcowy wynik jako liczbę; możesz dopisać zł. Wzór wykonaj w arkuszu, ale w tym polu podaj wynik.'}</Text>
    <TextInput testID="excel-advanced-answer" accessibilityLabel="Wynik obliczeń zaawansowanych" value={answer} onChangeText={v=>{setAnswer(v);setFeedback('idle');}}
     autoCapitalize="characters" placeholder="Oblicz i wpisz wynik" placeholderTextColor="#849a88"
     style={{borderWidth:1,borderColor:'#bfcec2',backgroundColor:'#fff',color:ink,borderRadius:9,minHeight:48,padding:12,fontSize:15}}/>
   </View>}
   <Pressable accessibilityRole="button" accessibilityLabel="Sprawdź analizę ekspercką" onPress={validateAnswer}
    style={{backgroundColor:'#255b40',alignSelf:'flex-start',minHeight:48,justifyContent:'center',paddingHorizontal:16,borderRadius:9}}>
    <Text style={{color:'#fff',fontWeight:'900',fontSize:14}}>Sprawdź analizę</Text>
   </Pressable>
   {!!status&&<Text accessibilityLiveRegion="polite" testID="excel-advanced-status" style={{color:feedback==='right'?'#216540':feedback==='wrong'?'#9a4a2e':'#395b45',fontSize:13,fontWeight:feedback==='idle'?'600':'800',lineHeight:22}}>{status}</Text>}
   {feedback==='right'&&<Text testID="excel-advanced-correct" style={{fontSize:13,color:'#2e5c43',lineHeight:21}}>✓ Sprawdzone obliczenie. Dane pozostają fikcyjne, a wynik uzyskano z aktualnego zestawu rekordów.</Text>}
   <Pressable accessibilityRole="button" accessibilityState={{expanded:showWorkedSolution}} onPress={()=>setShowWorkedSolution(v=>!v)}
    style={{minHeight:44,justifyContent:'center',alignSelf:'flex-start'}}><Text style={{fontSize:12,color:'#256882',fontWeight:'800'}}>Jak wygląda formuła w Excelu? {showWorkedSolution?'▴':'▾'}</Text></Pressable>
   {showWorkedSolution&&<Text selectable style={{padding:11,fontSize:12,lineHeight:22,color:'#28503e',backgroundColor:'#eef5ee',borderRadius:9}}>{formulas[mode]}</Text>}
  </View>
  <View style={{backgroundColor:'#fff',borderWidth:1,borderColor:'#d6e3d8',borderRadius:12,padding:12,gap:11}}>
   <Text style={headingStyle}>Eksperyment kontrolowany: zmień jeden rekord</Text>
   <Text style={{color:muted,fontSize:12,lineHeight:20}}>FV-001 · obecna ilość {dirtyLine.quantity} × {money(dirtyLine.netPrice)}. Zmień ilość i sprawdź, co stanie się z SUMA.WARUNKÓW, wyszukiwaniem i podsumowaniem przestawnym.</Text>
   <View style={{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'}}>
    <TextInput testID="excel-advanced-quantity" accessibilityLabel="Nowa ilość w FV-001" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad"
     style={{width:105,minHeight:45,backgroundColor:'#fff',borderWidth:1,borderColor:'#cbd9cf',borderRadius:9,padding:11,color:ink}}/>
    <Pressable accessibilityRole="button" accessibilityLabel="Zastosuj zmianę ilości FV-001" onPress={applyQuantity}
     style={[button,{backgroundColor:'#e3f2e7'}]}><Text style={{color:ink,fontWeight:'900',fontSize:12}}>Zastosuj zmianę</Text></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Przywróć dane ćwiczebne" onPress={restore}
     style={[button,{backgroundColor:'#fff'}]}><Text style={{color:ink,fontWeight:'800',fontSize:12}}>Przywróć dane</Text></Pressable>
   </View>
   <Text testID="excel-advanced-total" style={{color:ink,fontSize:13,fontWeight:'900'}}>Suma kontrolna 18 prawidłowych faktur: {money(total(rows))}</Text>
   <Pressable accessibilityRole="button" accessibilityState={{expanded:showCsv}} onPress={()=>setShowCsv(v=>!v)}
    style={{minHeight:44,justifyContent:'center',alignSelf:'flex-start'}}>
    <Text style={{color:'#246882',fontWeight:'900',fontSize:13}}>{showCsv?'Ukryj tabelę źródłową ▴':'Pokaż tabelę źródłową (18 faktur) ▾'}</Text>
   </Pressable>
   {showCsv&&<ScrollView horizontal style={{borderRadius:8,borderWidth:1,borderColor:'#d6e4d8'}}>
    <View style={{minWidth:720}}>
     <View style={{flexDirection:'row',backgroundColor:'#e4f1e7',paddingVertical:8}}>
      {['Nr faktury','Region','Kategoria','Kontrahent','Ilość','Cena netto','Wartość'].map((x,i)=><Text key={i} style={{width:i===3?120:i===2?110:i===0?85:90,paddingHorizontal:5,color:ink,fontSize:11,fontWeight:'900'}}>{x}</Text>)}
     </View>
     <ScrollView style={{maxHeight:235}}>
      {(mode==='filter'?filtered:rows).map(r=><View key={r.invoice} style={{flexDirection:'row',paddingVertical:8,borderBottomWidth:.5,borderColor:'#e2e9e2'}}>
       {[r.invoice,r.region,r.category,r.client,String(r.quantity),String(r.netPrice),String(lineRevenue(r))].map((x,i)=><Text key={i} numberOfLines={1}
        style={{width:i===3?120:i===2?110:i===0?85:90,paddingHorizontal:5,fontSize:11,color:ink}}>{x}</Text>)}
      </View>)}
     </ScrollView>
    </View>
   </ScrollView>}
  </View>
  <Text style={{fontSize:11,lineHeight:19,color:'#617465'}}>Nie przechwytujemy rzeczywistych skrótów systemowych. W tej pracowni działają opisane operacje obliczeniowe, filtry, grupowania, audyt i zmiany danych. Wysyłanie danych, prawdziwe połączenia Power Query, makra VBA i pełne formatowanie XLSX wymagają zainstalowanego Microsoft Excel — nie udajemy ich tutaj.</Text>
 </View>;
}