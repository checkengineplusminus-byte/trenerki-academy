import React,{useEffect,useMemo,useState} from 'react';
import {Pressable,Text,TextInput,View,useWindowDimensions} from 'react-native';

type Group='region'|'month'|'category';
type Metric='revenue'|'quantity'|'count';
type ChartKind='columns'|'bars';
type SourceRow={id:string;product:string;category:string;region:string;month:string;qty:string;price:string};
type SummaryRow={key:string;value:number;count:number};
const initial:SourceRow[]=[
 {id:'01',product:'Farba',category:'Materiały',region:'Północ',month:'Styczeń',qty:'2',price:'40'},
 {id:'02',product:'Pędzle',category:'Materiały',region:'Północ',month:'Luty',qty:'3',price:'20'},
 {id:'03',product:'Szkło',category:'Materiały',region:'Południe',month:'Luty',qty:'4',price:'75'},
 {id:'04',product:'Transport',category:'Usługi',region:'Centrum',month:'Marzec',qty:'1',price:'120'},
 {id:'05',product:'Kleje',category:'Materiały',region:'Południe',month:'Marzec',qty:'6',price:'25'},
 {id:'06',product:'Montaż',category:'Usługi',region:'Centrum',month:'Styczeń',qty:'2',price:'60'}
];
const ink='#1b3e2b',muted='#486958',edge='#bed4c4';
const number=(s:string)=>/^\d+(?:[,.]\d{1,2})?$/.test(s.trim())?Number(s.replace(',','.')):NaN;
const format=(n:number)=>n.toLocaleString('pl-PL',{minimumFractionDigits:0,maximumFractionDigits:2});
const metricLabel:{[k in Metric]:string}={revenue:'Wartość sprzedaży (zł)',quantity:'Ilość (szt.)',count:'Liczba rekordów'};
const groupLabel:{[k in Group]:string}={region:'Region',month:'Miesiąc',category:'Kategoria'};
function aggregate(rows:SourceRow[],group:Group,metric:Metric):SummaryRow[]{
 const map=new Map<string,SummaryRow>();
 for(const row of rows){
  const q=number(row.qty),p=number(row.price);
  if(!Number.isFinite(q)||!Number.isFinite(p)||q<0||p<0)continue;
  const key=row[group];
  const entry=map.get(key)||{key,value:0,count:0};
  entry.value+=metric==='revenue'?q*p:metric==='quantity'?q:1;
  entry.count++;
  map.set(key,entry);
 }
 const priority=group==='month'?['Styczeń','Luty','Marzec']:group==='region'?['Północ','Centrum','Południe']:['Materiały','Usługi'];
 return [...map.values()].sort((a,b)=>priority.indexOf(a.key)-priority.indexOf(b.key));
}
const btn=(active=false)=>({backgroundColor:active?'#d0ebd5':'white',borderColor:active?'#508f66':edge,
 borderWidth:1,borderRadius:9,paddingHorizontal:10,paddingVertical:9,minHeight:43,justifyContent:'center' as const});

export default function ExcelVisualPractices({lessonNo}:{lessonNo:number}){
 const {width}=useWindowDimensions(),compact=width<650;
 const [rows,setRows]=useState<SourceRow[]>(()=>initial.map(x=>({...x})));
 const [group,setGroup]=useState<Group>(lessonNo===17?'month':lessonNo===25?'region':'category');
 const [metric,setMetric]=useState<Metric>('revenue');
 const [chart,setChart]=useState<ChartKind>(lessonNo===17?'columns':'bars');
 const [filter,setFilter]=useState('Wszystkie');
 const [sort,setSort]=useState<'original'|'high'|'low'>('original');
 const [revision,setRevision]=useState(0);
 const [pivot,setPivot]=useState<SummaryRow[]|null>(null);
 const [pivotVersion,setPivotVersion]=useState(-1);
 const [selected,setSelected]=useState('');
 const [answer,setAnswer]=useState(''),[feedback,setFeedback]=useState('');
 const [showSolution,setShowSolution]=useState(false);
 const sourceValid=rows.every(r=>Number.isFinite(number(r.qty))&&Number.isFinite(number(r.price))&&number(r.qty)>=0&&number(r.price)>=0);
 const displayed=useMemo(()=>{
  const filtered=rows.filter(r=>filter==='Wszystkie'||r.category===filter);
  return [...filtered].sort((a,b)=>sort==='original'?a.id.localeCompare(b.id):sort==='high'?
   number(b.qty)*number(b.price)-number(a.qty)*number(a.price):number(a.qty)*number(a.price)-number(b.qty)*number(b.price));
 },[rows,filter,sort]);
 const total=displayed.reduce((v,r)=>v+(Number.isFinite(number(r.qty)*number(r.price))?number(r.qty)*number(r.price):0),0);
 const currentGroups=aggregate(displayed,group,metric);
 const pivotMode=lessonNo===25;
 const chartRows=pivotMode?(pivot||[]):currentGroups;
 const max=Math.max(1,...chartRows.map(x=>x.value));
 const unit=metric==='revenue'?' zł':metric==='quantity'?' szt.':' rekordów';
 const outcome=selected||chartRows[0]?.key||'';
 const expected=chartRows.find(x=>x.key===outcome)?.value;
 const editing=(id:string,field:'qty'|'price',value:string)=>{
  setRows(prev=>prev.map(x=>x.id===id?{...x,[field]:value}:x));
  setRevision(x=>x+1);setFeedback('');setAnswer('');
 };
 function restore(){
  setRows(initial.map(x=>({...x})));setRevision(n=>n+1);setPivot(null);setPivotVersion(-1);
  setFilter('Wszystkie');setSort('original');setAnswer('');setFeedback('');setSelected('');
 }
 function verify(){
  if(!sourceValid){setFeedback('Najpierw popraw nieprawidłową ilość lub cenę. Liczby muszą być nieujemne.');return;}
  if(pivotMode&&(pivot===null||revision!==pivotVersion)){
   setFeedback('Najpierw kliknij „Odśwież tabelę przestawną”. W programie Excel tabela przestawna nie zawsze aktualizuje się sama po edycji źródła.');return;
  }
  if(expected===undefined){setFeedback('Wybierz jedną kategorię, region lub miesiąc.');return;}
  const n=number(answer);
  setFeedback(Number.isFinite(n)&&Math.abs(n-expected)<0.01?'✓ Zgadza się. '+outcome+' = '+format(expected)+unit+'. Wynik wynika z danych, nie ze zgadywania.':
   'To nie jest wynik dla '+outcome+'. Dodaj wartości z właściwych wierszy. W razie potrzeby rozwiń sposób obliczenia.');
 }
 const picker=<View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
  {(['category','region','month'] as Group[]).map(x=><Pressable key={x} accessibilityRole="button" accessibilityState={{selected:group===x}}
   onPress={()=>{setGroup(x);setSelected('');setFeedback('');setAnswer('');if(pivotMode){setPivot(null);setPivotVersion(-1)}} style={btn(group===x)}>
   <Text style={{fontSize:12,color:ink,fontWeight:'800'}}>{groupLabel[x]}</Text>
  </Pressable>)}
 </View>;
 return <View testID="excel-visual-practice" style={{borderWidth:1,borderColor:edge,borderRadius:16,backgroundColor:'#f3f8f3',padding:compact?11:17,marginVertical:12,gap:12}}>
  <Text style={{color:'#477656',fontWeight:'900',fontSize:11}}>TRENERKI · PRAWDZIWE OBLICZENIA NA DANYCH ĆWICZEBNYCH</Text>
  <Text style={{color:ink,fontSize:compact?19:22,fontWeight:'900'}}>Tabela i wykres, które reagują na Twoje zmiany</Text>
  <Text style={{color:muted,fontSize:13,lineHeight:22}}>Zobacz sześć przykładowych operacji sprzedaży. W każdej pozycji wartość = ilość × cena. Zmieniaj liczby w tabeli — suma i wykres przeliczą się. Kiedy przejdziesz do tabeli przestawnej, samodzielnie ją odświeżysz.</Text>
  <View style={{padding:12,backgroundColor:'white',borderRadius:10,borderWidth:1,borderColor:edge,gap:7}}>
   <Text style={{color:ink,fontWeight:'900'}}>Najpierw przykład, bez sprawdzianu</Text>
   <Text style={{fontSize:13,lineHeight:21,color:muted}}>Farba: 2 sztuki × 40 zł = 80 zł. Pędzle: 3 sztuki × 20 zł = 60 zł. Wartość obu pozycji to 140 zł. Taką samą zasadę stosujemy w pozostałych wierszach i na wykresie.</Text>
   <Text style={{fontSize:12,lineHeight:20,color:muted}}>Ciekawostka: tabela przestawna nie zmienia danych źródłowych — tylko układa i sumuje je według wybranych pól.</Text>
  </View>
  <Text style={{color:ink,fontWeight:'900',fontSize:15}}>1. Pracuj na tabeli źródłowej</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
   {['Wszystkie','Materiały','Usługi'].map(x=><Pressable key={x} onPress={()=>{setFilter(x);setSelected('');setFeedback('')}} accessibilityRole="button" accessibilityState={{selected:filter===x}} style={btn(filter===x)}>
    <Text style={{color:ink,fontSize:12,fontWeight:'700'}}>{x}</Text>
   </Pressable>)}
   {(['original','high','low'] as const).map(x=><Pressable key={x} accessibilityRole="button" accessibilityState={{selected:sort===x}} onPress={()=>setSort(x)} style={btn(sort===x)}>
    <Text style={{color:ink,fontSize:12,fontWeight:'700'}}>{x==='original'?'Kolejność źródłowa':x==='high'?'Wartości malejąco':'Wartości rosnąco'}</Text>
   </Pressable>)}
  </View>
  <View testID="excel-visual-source-table" style={{borderWidth:1,borderColor:edge,borderRadius:10,backgroundColor:'white',gap:0,overflow:'hidden'}}>
   {displayed.map((row,i)=>{const quantity=number(row.qty),price=number(row.price),valid=Number.isFinite(quantity)&&Number.isFinite(price)&&quantity>=0&&price>=0;return <View key={row.id} testID={'excel-visual-row-'+row.id} style={{padding:10,borderBottomWidth:i===displayed.length-1?0:1,borderColor:'#dfebe0',gap:5}}>
    <Text style={{color:ink,fontSize:13,fontWeight:'900'}}>{row.product} · {row.region} · {row.month}</Text>
    <Text style={{fontSize:11,color:muted}}>{row.category} · Wartość = ilość × cena</Text>
    <View style={{flexDirection:'row',gap:8,alignItems:'center',flexWrap:'wrap'}}>
     <View style={{gap:3,width:compact?90:110}}>
      <Text style={{fontSize:11,color:muted}}>Ilość (szt.)</Text>
      <TextInput testID={'excel-visual-qty-'+row.id} accessibilityLabel={'Ilość dla '+row.product} value={row.qty} keyboardType="decimal-pad"
       onChangeText={v=>editing(row.id,'qty',v)} style={{backgroundColor:'white',borderColor:edge,borderWidth:1,padding:8,borderRadius:8,minHeight:42,color:ink}}/>
     </View>
     <View style={{gap:3,width:compact?90:110}}>
      <Text style={{fontSize:11,color:muted}}>Cena (zł)</Text>
      <TextInput accessibilityLabel={'Cena dla '+row.product} value={row.price} keyboardType="decimal-pad"
       onChangeText={v=>editing(row.id,'price',v)} style={{backgroundColor:'white',borderColor:edge,borderWidth:1,padding:8,borderRadius:8,minHeight:42,color:ink}}/>
     </View>
     <View style={{gap:3,flex:1,minWidth:95}}>
      <Text style={{fontSize:11,color:muted}}>Wartość (zł)</Text>
      <Text testID={'excel-visual-value-'+row.id} style={{fontSize:15,color:ink,fontWeight:'900',minHeight:42,paddingVertical:10}}>{valid?format(quantity*price)+' zł':'Niepoprawna liczba'}</Text>
     </View>
    </View>
   </View>})}
   <View style={{backgroundColor:'#e5f2e6',padding:12,flexDirection:'row',justifyContent:'space-between',gap:8}}>
    <Text style={{color:ink,fontWeight:'900'}}>RAZEM</Text><Text testID="excel-visual-total" style={{color:ink,fontWeight:'900',fontSize:16}}>{sourceValid?format(total)+' zł':'Popraw dane'}</Text>
   </View>
  </View>
  {!sourceValid&&<Text accessibilityLiveRegion="polite" style={{color:'#8f492e',fontSize:13}}>Dane źródłowe wymagają poprawy. Wpisz liczby bez dopisku „zł”, następnie nadaj format walutowy przy wyświetlaniu.</Text>}
  <Text style={{color:ink,fontWeight:'900',fontSize:15}}>2. Wybierz pola i sposób prezentacji</Text>
  <Text style={{fontSize:13,color:muted}}>Pole „Wiersze” tabeli przestawnej określa, czy grupujemy po kategorii, regionie czy miesiącu. „Wartości” wskazuje, co sumujemy lub liczymy.</Text>
  {picker}
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
   {(['revenue','quantity','count'] as Metric[]).map(x=><Pressable key={x} accessibilityRole="button" accessibilityState={{selected:metric===x}} onPress={()=>{setMetric(x);setSelected('');setFeedback('');setAnswer('');if(pivotMode){setPivot(null);setPivotVersion(-1)}} style={btn(metric===x)}>
    <Text style={{fontSize:12,color:ink,fontWeight:'800'}}>{x==='revenue'?'Suma wartości':x==='quantity'?'Suma ilości':'Liczba rekordów'}</Text>
   </Pressable>)}
  </View>
  {pivotMode&&<View style={{backgroundColor:'white',borderRadius:10,padding:12,gap:9}}>
   <Text style={{fontSize:13,color:ink,fontWeight:'900'}}>Tabela przestawna: Wiersze = {groupLabel[group]}, Wartości = {metricLabel[metric]}</Text>
   <Text style={{fontSize:12,lineHeight:20,color:muted}}>Po zmianie danych źródłowych tabela przestawna wymaga kliknięcia „Odśwież”. Nie udajemy, że została odświeżona bez Twojej czynności.</Text>
   <Pressable accessibilityRole="button" onPress={()=>{if(!sourceValid){setFeedback('Popraw liczby w tabeli przed odświeżeniem.');return}setPivot(currentGroups.map(x=>({...x})));setPivotVersion(revision);setSelected('');setAnswer('');setFeedback('Tabela przestawna przeliczyła się z aktualnych danych.')}} style={[btn(true),{alignSelf:'flex-start'}]}>
    <Text style={{fontWeight:'900',color:ink}}>Odśwież tabelę przestawną</Text>
   </Pressable>
   <Text testID="excel-visual-pivot-stale" accessibilityLiveRegion="polite" style={{fontSize:12,color:pivot&&revision===pivotVersion?'#276840':'#a36c27',fontWeight:'700'}}>{pivot&&revision===pivotVersion?'Tabela przestawna jest aktualna':'Tabela przestawna wymaga odświeżenia'}</Text>
  </View>}
  <Text style={{color:ink,fontWeight:'900',fontSize:15}}>3. Obejrzyj {pivotMode?'wynik tabeli przestawnej i wykresu':'wykres obliczony z tabeli'}</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
   {(['columns','bars'] as ChartKind[]).map(x=><Pressable key={x} accessibilityRole="button" accessibilityState={{selected:chart===x}} onPress={()=>setChart(x)} style={btn(chart===x)}>
    <Text style={{fontSize:12,color:ink,fontWeight:'800'}}>{x==='columns'?'Wykres kolumnowy':'Wykres słupkowy'}</Text>
   </Pressable>)}
  </View>
  <View testID="excel-visual-chart" style={{backgroundColor:'white',borderWidth:1,borderColor:edge,borderRadius:10,padding:12,gap:11}}>
   <Text style={{fontWeight:'900',color:ink,fontSize:14}}>{metricLabel[metric]} według pola: {groupLabel[group]}</Text>
   {chartRows.length===0?<Text style={{fontSize:13,color:muted}}>Wybierz poprawne dane{pivotMode?' i odśwież tabelę przestawną':''}, aby zobaczyć wykres.</Text>:chart==='bars'?
    chartRows.map(x=><Pressable key={x.key} accessibilityRole="button" accessibilityLabel={'Wybierz '+x.key+' '+format(x.value)+unit} onPress={()=>setSelected(x.key)} style={{gap:4}}>
     <View style={{flexDirection:'row',justifyContent:'space-between',gap:8}}><Text style={{fontSize:12,color:ink,fontWeight:'800'}}>{x.key}</Text><Text style={{fontSize:12,color:ink}}>{format(x.value)+unit}</Text></View>
     <View style={{height:25,backgroundColor:'#edf4ee',borderRadius:6,overflow:'hidden'}}><View style={{height:'100%',width:(100*x.value/max)+'%',minWidth:0,backgroundColor:'#3f9166',borderRadius:6}}/></View>
    </Pressable>):
    <View style={{flexDirection:'row',gap:10,justifyContent:'space-around',alignItems:'flex-end',minHeight:200}}>
     {chartRows.map(x=><Pressable key={x.key} accessibilityRole="button" onPress={()=>setSelected(x.key)}
      accessibilityLabel={'Wybierz '+x.key+' '+format(x.value)+unit} style={{flex:1,alignItems:'center',gap:5,justifyContent:'flex-end'}}>
      <Text style={{color:ink,fontSize:11,fontWeight:'900',textAlign:'center'}}>{format(x.value)}</Text>
      <View style={{backgroundColor:'#eaf3ec',width:'100%',height:150,justifyContent:'flex-end',borderRadius:6,overflow:'hidden'}}>
       <View style={{height:(100*x.value/max)+'%',backgroundColor:'#3f9166',borderRadius:4}}/>
      </View>
      <Text style={{fontSize:11,color:ink,fontWeight:'700',textAlign:'center'}}>{x.key}</Text>
     </Pressable>)}
    </View>}
   <Text style={{color:muted,fontSize:11,lineHeight:19}}>Wykres posiada podpisane wartości i kategorię. Skala rozpoczyna się od zera. Nie jest to zrzut ekranu Excela — to interaktywne ćwiczenie na prawdziwych obliczeniach.</Text>
  </View>
  {chartRows.length>0&&<View style={{borderColor:edge,borderWidth:1,borderRadius:10,backgroundColor:'white',padding:12,gap:8}}>
   <Text style={{color:ink,fontWeight:'900',fontSize:14}}>Tabela wyników {pivotMode?'przestawnych':'grupowania'}</Text>
   {chartRows.map(x=><Pressable key={x.key} accessibilityRole="button" onPress={()=>setSelected(x.key)} style={{flexDirection:'row',justifyContent:'space-between',borderBottomWidth:1,borderColor:'#e7efe8',minHeight:38,paddingVertical:8,gap:8}}>
    <Text style={{fontSize:13,color:ink}}>{x.key}</Text><Text style={{fontSize:13,color:ink,fontWeight:'900'}}>{format(x.value)+unit}</Text>
   </Pressable>)}
   <View style={{flexDirection:'row',justifyContent:'space-between',gap:8}}>
    <Text style={{fontWeight:'900',color:ink}}>RAZEM GRUPY</Text><Text style={{fontWeight:'900',color:ink}}>{format(chartRows.reduce((s,x)=>s+x.value,0))+unit}</Text>
   </View>
  </View>}
  <View style={{backgroundColor:'#e7f2e7',borderRadius:10,padding:12,gap:9}}>
   <Text style={{color:ink,fontSize:15,fontWeight:'900'}}>4. Zadanie — odczytaj i sprawdź wynik</Text>
   <Text style={{fontSize:13,color:muted,lineHeight:21}}>Kliknij jedną kategorię na wykresie albo w tabeli wyników. Wpisz jej wartość poniżej. Jeśli zmieniłeś ilości i ćwiczysz tabelę przestawną, najpierw użyj „Odśwież”.</Text>
   <Text style={{fontSize:13,color:ink,fontWeight:'800'}}>Wybrana grupa: {outcome||'brak'}</Text>
   <TextInput testID="excel-visual-answer" accessibilityLabel="Odpowiedź do wykresu lub tabeli przestawnej" value={answer} onChangeText={v=>{setAnswer(v);setFeedback('')}} keyboardType="decimal-pad" placeholder="Wpisz obliczoną liczbę" style={{minHeight:46,backgroundColor:'white',borderColor:edge,borderWidth:1,borderRadius:8,padding:11,color:ink}}/>
   <Pressable accessibilityRole="button" onPress={verify} style={{padding:12,minHeight:43,backgroundColor:'#245e40',borderRadius:9,alignSelf:'flex-start'}}><Text style={{fontSize:13,color:'white',fontWeight:'900'}}>Sprawdź moją analizę</Text></Pressable>
   {!!feedback&&<Text testID="excel-visual-feedback" accessibilityLiveRegion="polite" style={{fontSize:13,lineHeight:21,color:ink}}>{feedback}</Text>}
   <Pressable accessibilityRole="button" accessibilityState={{expanded:showSolution}} onPress={()=>setShowSolution(v=>!v)} style={{minHeight:38,justifyContent:'center',alignSelf:'flex-start'}}>
    <Text style={{color:'#226c4a',fontWeight:'800',fontSize:12}}>{showSolution?'Ukryj wyjaśnienie':'Nie rozumiem — pokaż sposób obliczenia'}</Text>
   </Pressable>
   {showSolution&&<Text style={{color:ink,fontSize:12,lineHeight:20}}>W każdym wierszu oblicz ilość × cenę, a następnie dodaj wartości w grupie {outcome||groupLabel[group]}. W tabeli przestawnej ustaw pole „Wiersze” i „Wartości”, potem kliknij Odśwież po zmianie źródła. Nie sumuj jednocześnie danych źródłowych oraz wiersza RAZEM.</Text>}
  </View>
  <Pressable accessibilityRole="button" onPress={restore} style={[btn(),{alignSelf:'flex-start'}]}><Text style={{fontSize:12,fontWeight:'800',color:ink}}>Przywróć przykładowe dane i zacznij ponownie</Text></Pressable>
 </View>;
}
