import React,{useMemo,useState} from 'react';
import {Linking,Platform,Pressable,Text,TextInput,View,useWindowDimensions} from 'react-native';
import dataset from '../content/excel-pro-case.json';
import {equalIdentifiers,inspectImport,proStats,strictNumber,type ProRow} from './excelProReview';

type Task='audit'|'revenue'|'margin'|'region'|'month'|'discount';
const tasks:{id:Task;label:string;question:string;hint:string;method:string}[]=[
 {id:'audit',label:'Audyt 8 błędów',question:'Wpisz wszystkie osiem numerów wadliwych faktur (oddzielone przecinkami).',
  hint:'Sprawdź duplikaty ID, liczbę całkowitą w Ilości, puste pola, zakresy cen, daty i słownik regionów. Nie kasuj rekordów w ciemno.',
  method:'Power Query: import CSV → jawne typy danych → usuń błędy dopiero po udokumentowaniu → kontroluj duplikaty numerów faktur.'},
 {id:'revenue',label:'Uzgodnij przychód',question:'Ile wynosi cały przychód netto 360 poprawnych transakcji (PLN)?',
  hint:'Dla każdej pozycji: Ilość × Cena jednostkowa × (1 − Rabat). Odrzuć osiem nieprawidłowych rekordów i zsumuj 360 obliczonych wartości.',
  method:'W Excelu: kolumna kwoty = [@quantity]*[@unitPrice]*(1-[@discountPct]); zsumuj kolumnę i porównaj z tabelą przestawną.'},
 {id:'margin',label:'Marża po kosztach',question:'Ile wynosi suma marży netto na 360 poprawnych transakcjach (PLN)?',
  hint:'Marża ≠ przychód. Od wartości po rabacie odejmij Ilość × Koszt jednostkowy. Sprawdź także wynik przez Przychód minus Koszt całkowity.',
  method:'W Excelu: [@quantity]*([@unitPrice]*(1-[@discountPct])-[@unitCost]); podsumuj i zrób niezależną kontrolę.'},
 {id:'region',label:'Region lider',question:'Jaki region ma największy przychód netto (dokładna nazwa)?',
  hint:'Zrób tabelę przestawną region → SUMA kwoty netto; wyklucz niepoprawne wiersze. Nie oceniaj liczby rekordów zamiast wartości sprzedaży.',
  method:'Tabela przestawna: Region do Wierszy, Wartość netto do Wartości (Suma), sortowanie malejąco.'},
 {id:'month',label:'Miesiąc lider',question:'Który miesiąc miał najwyższy przychód netto? Wpisz YYYY-MM, np. 2026-04.',
  hint:'Zgrupuj poprawne rekordy po miesiącu daty dokumentu, nie po alfabecie nazwy miesiąca. Sprawdź wynik z sumą ogólną.',
  method:'Power Query: kolumna Data jako data → początek miesiąca → grupuj po miesiącu i sumuj wartość netto.'},
 {id:'discount',label:'Rabat i częstotliwość',question:'Ile poprawnych transakcji ma rabat większy niż zero?',
  hint:'Wartość rabatu w źródle jest ułamkiem, np. 0.05 = 5%. Policz rekordy, nie sumę procentów.',
  method:'Excel: LICZ.JEŻELI(Tabela1[discountPct];">0") po odfiltrowaniu ośmiu błędnych rekordów.'}
];
const ink='#1b4131',muted='#587263';
const baseButton={minHeight:44,paddingHorizontal:12,paddingVertical:9,borderWidth:1,borderColor:'#c6dccd',borderRadius:9,justifyContent:'center' as const};
const rows=[...(dataset.valid as ProRow[]),...(dataset.untrusted as ProRow[])];
const imported=inspectImport(rows,dataset.allowed.region);
const stats=proStats(imported.valid);
const numbers=(n:number)=>n.toLocaleString('pl-PL',{maximumFractionDigits:2,minimumFractionDigits:2});
export default function ExcelProCaseLab(){
 const {width}=useWindowDimensions(),compact=width<650;
 const [selected,setSelected]=useState<Task>('audit'),[value,setValue]=useState(''),[notice,setNotice]=useState<'none'|'incorrect'|'correct'>('none');
 const [hint,setHint]=useState(false),[method,setMethod]=useState(false);
 const [verified,setVerified]=useState<Task[]>([]);
 const current=tasks.find(t=>t.id===selected)!;
 const expected=useMemo(()=>{
  if(selected==='audit')return imported.defects.map(x=>x.invoice);
  if(selected==='revenue')return stats.revenue;
  if(selected==='margin')return stats.margin;
  if(selected==='region')return Object.entries(stats.regions).sort((a,b)=>b[1]-a[1])[0][0];
  if(selected==='month')return Object.entries(stats.months).sort((a,b)=>b[1]-a[1])[0][0];
  return stats.discounted;
 },[selected]);
 function choose(task:Task){setSelected(task);setValue('');setNotice('none');setHint(false);setMethod(false);}
 function verify(){
  const ok=selected==='audit'?equalIdentifiers(value,expected as string[]):
   typeof expected==='number'?strictNumber(value.replace(/\s/g,'').replace(',','.'))===expected:
   value.trim().toLocaleLowerCase('pl-PL')===String(expected).toLocaleLowerCase('pl-PL');
  setNotice(ok?'correct':'incorrect');
  if(ok)setVerified(old=>old.includes(selected)?old:[...old,selected]);
 }
 const csvLink='/academy/assets/excel-professional-368-import.csv';
 return <View testID="excel-pro-case" style={{backgroundColor:'#f4f8f3',borderRadius:16,borderWidth:1,borderColor:'#c5ddcb',overflow:'hidden',marginTop:12}}>
  <View style={{padding:compact?13:17,gap:6,backgroundColor:'#e0efe2'}}>
   <Text style={{fontSize:11,color:'#35704e',fontWeight:'900'}}>CASE STUDY · EKSPERT · 368 WIERSZY ŹRÓDŁOWYCH</Text>
   <Text style={{fontSize:compact?18:21,color:ink,fontWeight:'900'}}>Audyt danych sprzedażowych — 12 miesięcy</Text>
   <Text style={{fontSize:13,lineHeight:21,color:'#45654e'}}>Niezależny przypadek biznesowy: 360 poprawnych rekordów i 8 celowych błędów w nieoznaczonych wierszach importu. Pracuj na pobranym pliku CSV w prawdziwym Excelu lub Power Query; tutaj sprawdzisz swoje obliczenia.</Text>
  </View>
  <View style={{padding:compact?12:17,gap:13}}>
   {Platform.OS==='web'?<a href={csvLink} download="excel-professional-368-import.csv" style={{fontSize:14,fontWeight:800,color:'#226f4a',display:'inline-flex',alignItems:'center',minHeight:48,textDecoration:'underline'}}>Pobierz 368-wierszowy CSV do Excel / Power Query</a>:
   <Pressable accessibilityRole="link" onPress={()=>void Linking.openURL('https://trenerki.com'+csvLink)} style={{minHeight:48,justifyContent:'center'}}>
    <Text style={{fontSize:14,fontWeight:'800',color:'#226f4a'}}>Pobierz 368-wierszowy CSV</Text>
   </Pressable>}
   <Text style={{fontSize:12,color:muted,lineHeight:20}}>W imporcie wskaż kodowanie UTF-8, separator średnik i jawnie ustaw typy kolumn. Ceny mają separator dziesiętny „.”, a rabat zapisano jako ułamek (0.05 = 5%). Nie importuj bezmyślnie: Excel w polskich ustawieniach może potraktować część liczb jako tekst.</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{tasks.map(task=><Pressable key={task.id} accessibilityRole="button" accessibilityState={{selected:selected===task.id}}
    accessibilityLabel={task.label} onPress={()=>choose(task.id)} style={[baseButton,{backgroundColor:selected===task.id?'#d3eadb':'#fff',borderColor:selected===task.id?'#59a275':'#c6dccd'}]}>
    <Text style={{fontSize:12.5,color:ink,fontWeight:selected===task.id?'900':'700'}}>{verified.includes(task.id)?'✓ ':''}{task.label}</Text>
   </Pressable>)}</View>
   <View style={{backgroundColor:'#fff',borderRadius:12,borderWidth:1,borderColor:'#d8e4d9',padding:13,gap:12}}>
    <Text style={{color:ink,fontWeight:'900',fontSize:15}}>{current.question}</Text>
    <TextInput testID="excel-pro-answer" accessibilityLabel="Wynik profesjonalnego ćwiczenia Excel" value={value}
     onChangeText={text=>{setValue(text);setNotice('none');}} multiline={selected==='audit'} autoCapitalize="none" autoCorrect={false}
     placeholder={selected==='audit'?'PRO-XXXX, PRO-XXXX, ...':selected==='region'?'Nazwa regionu':selected==='month'?'2026-MM':'Wynik z własnego arkusza'}
     placeholderTextColor="#779184"
     style={{backgroundColor:'#fff',color:ink,minHeight:selected==='audit'?84:48,borderWidth:1,borderColor:'#b7d0bd',borderRadius:9,padding:12,fontSize:14,textAlignVertical:selected==='audit'?'top':'center'}}/>
    <Pressable accessibilityRole="button" accessibilityLabel="Sprawdź wynik PRO" onPress={verify}
     style={{minHeight:48,padding:12,backgroundColor:'#245e3d',alignItems:'center',justifyContent:'center',borderRadius:9,alignSelf:'flex-start'}}>
     <Text style={{color:'#fff',fontWeight:'900',fontSize:14}}>Sprawdź moje obliczenie</Text>
    </Pressable>
    {notice==='incorrect'&&<Text testID="excel-pro-incorrect" accessibilityLiveRegion="polite" style={{fontSize:13,color:'#90532c',lineHeight:21}}>To jeszcze nie jest wynik zgodny z danymi źródłowymi. Sprawdź typy, unikatowe identyfikatory, brakujące wartości i rabaty; nie zgaduj.</Text>}
    {notice==='correct'&&<Text testID="excel-pro-correct" accessibilityLiveRegion="polite" style={{fontSize:13,color:'#22603f',lineHeight:21,fontWeight:'800'}}>✓ Poprawnie. Wynik uzgodniono z niezależnym obliczeniem na wyczyszczonych danych ({stats.records} prawidłowych rekordów). To autoweryfikacja, nie oficjalny egzamin.</Text>}
   </View>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:hint}} onPress={()=>setHint(x=>!x)} style={{minHeight:44,justifyContent:'center'}}>
     <Text style={{color:'#26658b',fontSize:13,fontWeight:'800'}}>{hint?'Ukryj wskazówkę ▴':'Podpowiedź bez odpowiedzi ▾'}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:method}} onPress={()=>setMethod(x=>!x)} style={{minHeight:44,justifyContent:'center'}}>
     <Text style={{color:'#26658b',fontSize:13,fontWeight:'800'}}>{method?'Ukryj metodę ▴':'Jak wykonać to w Excelu? ▾'}</Text>
    </Pressable>
   </View>
   {hint&&<Text style={{fontSize:13,lineHeight:22,color:ink,backgroundColor:'#fff',padding:12,borderRadius:9}}>{current.hint}</Text>}
   {method&&<Text style={{fontSize:13,lineHeight:22,color:ink,backgroundColor:'#fff',padding:12,borderRadius:9}}>{current.method}</Text>}
   <Text testID="excel-pro-progress" style={{fontSize:12,fontWeight:'900',color:'#35744f'}}>Samodzielnie sprawdzone: {verified.length}/{tasks.length} zadań eksperckich</Text>
   <Text style={{fontSize:11,color:'#667b6b',lineHeight:19}}>Dane fikcyjne, bez osób rzeczywistych. Pracownia weryfikuje wyłącznie wpisaną odpowiedź; nie widzi pliku na Twoim komputerze ani nie sprawdza, czy sam wykonałeś formuły. Symulacja nie zastępuje Microsoft Excel. Wersje Excel 2016 i 2019 nie obsługują X.WYSZUKAJ.</Text>
  </View>
 </View>;
}
