import React,{useMemo,useState} from 'react';
import {Platform,Pressable,Text,TextInput,View,useWindowDimensions} from 'react-native';

type Track='dom'|'sklep';
type Item={label:string;amount:string;price:number};
const examples:Record<Track,{label:string;title:string;context:string;items:Item[];file:string}>={
 dom:{
  label:'Budżet domowy',title:'Pierwsza lista zakupów',
  context:'Zapisujesz domowe wydatki i chcesz zobaczyć, jak zmiana ilości wpływa na łączny koszt.',
  items:[{label:'Zakupy spożywcze',amount:'2',price:45},{label:'Środki czystości',amount:'3',price:12},{label:'Bilety',amount:'1',price:28}],
  file:'/academy/assets/excel-firstday-home.csv'
 },
 sklep:{
  label:'Mały sklep',title:'Pierwsze zamówienie produktów',
  context:'Wyobraź sobie mały sklep, który zamawia trzy produkty. Wszystkie ceny są fikcyjne i proste do policzenia.',
  items:[{label:'Długopisy',amount:'2',price:8},{label:'Zeszyty',amount:'3',price:12},{label:'Torby',amount:'1',price:6}],
  file:'/academy/assets/excel-firstday-shop.csv'
 }
};
const ink='#183e2d',muted='#4a6756',border='#c9ddce';
const count=(text:string):number|null=>{
 const s=text.trim();
 if(!/^\d+$/.test(s))return null;
 const n=Number(s);return Number.isSafeInteger(n)&&n>0&&n<=10000?n:null;
};
// Accept values entered like 2 010,00 zł, 2010, 24.00 and 24,00.
const parseMoney=(text:string):number|null=>{
 const value=text.trim().toLocaleLowerCase('pl-PL').replace(/zł\.?$/,'').replace(/[\s\u00a0\u202f]/g,'').replace(',','.');
 if(!/^-?\d+(?:\.\d{1,2})?$/.test(value))return null;
 const result=Number(value);return Number.isFinite(result)?result:null;
};
const money=(n:number)=>n.toLocaleString('pl-PL',{maximumFractionDigits:2})+' zł';
const tap={minHeight:46,paddingHorizontal:12,paddingVertical:10,borderRadius:10,justifyContent:'center' as const};
const guide=[
 {name:'Wiersz 2: wskaż pierwszy produkt',instruction:'W Excelu wiersze biegną poziomo. „1” to nagłówki, a „2” to pierwszy produkt. Znajdź cyfrę 2 po lewej stronie i naciśnij „Wybierz” pod pierwszym produktem.',error:'W tabeli odszukaj wiersz numer 2 i naciśnij „Wybierz”. Nie trzeba wpisywać żadnej liczby.',hint:'Wiersz 2 jest tuż pod zielonym paskiem nagłówków. Pierwszy produkt to ten najwyżej na liście.'},
 {name:'Zmień ilość pierwszego produktu',instruction:'Przy pierwszym produkcie znajdź pole B · Ilość. Wpisz tam 3 zamiast 2. Cena C nie zmienia się; wynik D przeliczy się automatycznie.',error:'W wierszu 2, w polu Ilość, wpisz 3 zamiast 2. Nie zmieniaj ceny.',hint:'Najpierw dotknij liczby 2 w polu Ilość obok pierwszego produktu. Zaznacz ją, wpisz cyfrę 3.'},
 {name:'Ile kosztuje pierwszy produkt?',instruction:'Oblicz 3 × cena jednej sztuki z kolumny C. Odczytaj kwotę przy pierwszym produkcie w kolumnie D i wpisz ją w pole odpowiedzi.',error:'Pomnóż ilość pierwszego produktu przez jego cenę i sprawdź kolumnę D w wierszu 2.',hint:'Jeśli cena wynosi 8 zł, trzy sztuki kosztują 24 zł. Możesz przepisać wynik z kolumny D.'},
 {name:'Dodaj trzy kwoty',instruction:'Zsumuj wyniki z kolumny D w wierszach 2, 3 i 4. Wpisz otrzymaną kwotę. W Microsoft Excel można użyć formuły =SUMA(D2:D4).',error:'Dodaj wyniki D2, D3 i D4, nie same ceny z kolumny C.',hint:'Porównaj swoje działanie z polem RAZEM na końcu tabeli.'},
 {name:'Zmień ilość drugiego produktu',instruction:'Przejdź do wiersza 3, czyli drugiego produktu. Zwiększ jego ilość o jedną sztukę. Obserwuj, jak D3 i RAZEM aktualizują się same.',error:'Zwiększ o 1 ilość produktu z wiersza 3. Pierwszy produkt pozostaw z ilością 3.',hint:'Wiersz numer 3 to środkowy produkt. Edytuj tylko jego pole B · Ilość.'},
 {name:'Odczytaj nową sumę',instruction:'Po ostatniej zmianie wpisz aktualną kwotę RAZEM. Zauważ, że zmieniła się automatycznie, bez ręcznego poprawiania innych wierszy.',error:'Sprawdź jeszcze raz RAZEM — poprzednia suma jest już nieaktualna.',hint:'Wpisz kwotę pokazaną obok RAZEM po zmianie ilości drugiego produktu.'}
] as const;

export default function ExcelFirstDayPractice(){
 const {width}=useWindowDimensions(),mobile=width<640;
 const [track,setTrack]=useState<Track>('dom');
 const [rows,setRows]=useState<Item[]>(()=>examples.dom.items.map(item=>({...item})));
 const [step,setStep]=useState(0),[selected,setSelected]=useState(-1),[answer,setAnswer]=useState('');
 const [warning,setWarning]=useState(''),[showHint,setShowHint]=useState(false);
 const values=useMemo(()=>rows.map(r=>{const n=count(r.amount);return n===null?null:n*r.price;}),[rows]);
 const total=values.every(n=>n!==null)?values.reduce<number>((sum,n)=>sum+(n??0),0):null;
 const done=step===guide.length,example=examples[track];
 function reset(next:Track){
  setTrack(next);setRows(examples[next].items.map(item=>({...item})));
  setStep(0);setSelected(-1);setAnswer('');setWarning('');setShowHint(false);
 }
 function verify(){
  if(done)return;
  const correct=step===0?selected===0:
   step===1?count(rows[0].amount)===3:
   step===2?count(rows[0].amount)===3&&parseMoney(answer)===values[0]:
   step===3?total!==null&&parseMoney(answer)===total:
   step===4?count(rows[0].amount)===3&&count(rows[1].amount)===(count(example.items[1].amount)!+1):
   total!==null&&count(rows[1].amount)===(count(example.items[1].amount)!+1)&&parseMoney(answer)===total;
  if(!correct){setWarning(guide[step].error);return;}
  setStep(n=>n+1);setAnswer('');setWarning('');setShowHint(false);
 }
 return <View testID="excel-first-day" style={{borderWidth:1,borderColor:'#bdd8c5',borderRadius:17,backgroundColor:'#f6fbf5',overflow:'hidden',marginVertical:13}}>
  <View style={{padding:mobile?14:19,backgroundColor:'#e2f1e5',gap:8}}>
   <Text style={{color:'#3d7351',fontSize:11,fontWeight:'900'}}>MICROSOFT EXCEL · LEKCJA PIERWSZA · BEZ POŚPIECHU</Text>
   <Text style={{fontSize:mobile?20:24,fontWeight:'900',color:ink}}>Zanim zaczniesz liczyć, poznaj wiersze i kolumny</Text>
   <Text style={{fontSize:14,lineHeight:23,color:muted}}>Nie musisz znać żadnych skrótów. To sześć małych czynności na przykładowej liście. Każdy krok mówi, gdzie nacisnąć, a jeśli utkniesz, pokaże podpowiedź.</Text>
  </View>
  <View style={{padding:mobile?12:18,gap:13}}>
   <View style={{backgroundColor:'white',padding:14,borderRadius:12,borderWidth:1,borderColor:border,gap:7}}>
    <Text style={{fontSize:16,fontWeight:'900',color:ink}}>Ściąga: jak czytać arkusz?</Text>
    <Text style={{fontSize:14,color:ink,lineHeight:23}}>Kolumny są pionowe i mają litery: A, B, C, D. Wiersze są poziome i mają numery: 1, 2, 3, 4.</Text>
    <Text style={{fontSize:14,color:ink,lineHeight:23}}>Komórka B2 oznacza przecięcie kolumny B i wiersza 2. W tej przykładowej tabeli B to ilość, C to cena, a D to wynik mnożenia.</Text>
    <Text style={{fontSize:12,lineHeight:20,color:muted}}>To ćwiczebny symulator, a nie pełna aplikacja Microsoft Excel. Powyżej możesz zobaczyć autorski schemat rzeczywistego interfejsu programu.</Text>
   </View>
   <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
    {(['dom','sklep'] as Track[]).map(id=><Pressable key={id} testID={'excel-first-choice-'+id}
     accessibilityRole="button" accessibilityLabel={'Wybierz przykład: '+examples[id].label} accessibilityState={{selected:track===id}}
     onPress={()=>reset(id)} style={[tap,{borderWidth:1,borderColor:track===id?'#245c3e':'#b7d0be',backgroundColor:track===id?'#245c3e':'white'}]}>
      <Text style={{color:track===id?'white':ink,fontWeight:'900',fontSize:13}}>{examples[id].label}</Text>
    </Pressable>)}
   </View>
   <View style={{gap:5}}>
    <Text style={{color:ink,fontSize:17,fontWeight:'900'}}>{example.title}</Text>
    <Text style={{color:muted,fontSize:13,lineHeight:21}}>{example.context}</Text>
   </View>
   <View style={{borderColor:border,borderWidth:1,borderRadius:12,overflow:'hidden',backgroundColor:'white'}}>
    {!mobile&&<View style={{padding:9,flexDirection:'row',backgroundColor:'#e7f1e7',gap:5,alignItems:'center'}}>
     <Text style={{width:54,color:ink,fontSize:12,fontWeight:'900'}}>Wiersz</Text>
     <Text style={{flex:1.4,color:ink,fontWeight:'900',fontSize:12}}>A · Produkt</Text>
     <Text style={{flex:.7,textAlign:'center',color:ink,fontWeight:'900',fontSize:12}}>B · Ilość</Text>
     <Text style={{flex:.8,textAlign:'center',color:ink,fontWeight:'900',fontSize:12}}>C · Cena</Text>
     <Text style={{flex:.8,textAlign:'right',color:ink,fontWeight:'900',fontSize:12}}>D · Wartość</Text>
    </View>}
    {rows.map((row,i)=><View key={i} style={{padding:mobile?12:8,flexDirection:mobile?'column':'row',gap:mobile?8:5,
     alignItems:mobile?'stretch':'center',borderTopWidth:1,borderColor:'#e2eee4',backgroundColor:selected===i?'#edf7ec':'white'}}>
     <Text testID={'excel-first-row-number-'+i} style={{width:mobile?'100%':54,fontSize:12,color:'#386549',fontWeight:'900'}}>{'Wiersz '+(i+2)}</Text>
     <View style={{flex:mobile?undefined:1.4,gap:4}}>
      <Text style={{fontSize:13,color:ink,fontWeight:'800'}}>{(mobile?'A · Produkt: ':'')+row.label}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{selected:selected===i}} accessibilityLabel={'Wybierz pozycję '+row.label}
       onPress={()=>{setSelected(i);setWarning('');}} style={[tap,{alignSelf:'flex-start',paddingVertical:5,minHeight:42,backgroundColor:selected===i?'#c9e5cf':'#eaf2e9'}]}>
       <Text style={{color:'#265d41',fontWeight:'900',fontSize:13}}>{selected===i?'✓ Wybrany':'Wybierz'}</Text>
      </Pressable>
     </View>
     <View style={{flex:mobile?undefined:.7,gap:4}}>
      {mobile&&<Text style={{fontSize:12,color:muted}}>B · Ilość</Text>}
      <TextInput testID={'excel-first-quantity-'+i} accessibilityLabel={'Ilość: '+row.label}
       selectTextOnFocus keyboardType="number-pad" value={row.amount}
       onChangeText={amount=>{setRows(old=>old.map((v,j)=>i===j?{...v,amount}:v));setWarning('');}}
       style={{minHeight:44,paddingHorizontal:5,paddingVertical:7,borderWidth:1,borderColor:'#abcdb4',borderRadius:8,textAlign:'center',fontSize:15,color:ink,backgroundColor:'white'}}/>
     </View>
     <Text style={{flex:mobile?undefined:.8,textAlign:mobile?'left':'center',fontSize:13,color:ink}}>{(mobile?'C · Cena: ':'')+money(row.price)}</Text>
     <Text testID={'excel-first-value-'+i} style={{flex:mobile?undefined:.8,textAlign:mobile?'left':'right',fontSize:13,color:ink,fontWeight:'900'}}>{mobile?'D · Wartość: ':''}{values[i]===null?'—':money(values[i]!)}</Text>
    </View>)}
    <View style={{padding:11,backgroundColor:'#edf6ec',borderTopWidth:1,borderColor:border,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:9}}>
     <Text style={{fontSize:13,color:ink,fontWeight:'900'}}>RAZEM</Text>
     <Text testID="excel-first-total" style={{fontSize:18,color:ink,fontWeight:'900'}}>{total===null?'Popraw ilości':money(total)}</Text>
    </View>
   </View>
   {done?<View testID="excel-first-success" style={{padding:14,borderRadius:12,backgroundColor:'#dff2e3',gap:9}}>
    <Text style={{fontWeight:'900',fontSize:16,color:'#205e3d'}}>✓ Dobrze! Rozumiesz sześć podstawowych czynności.</Text>
    <Text style={{fontSize:13,lineHeight:22,color:ink}}>Teraz spróbuj wykonać te same kroki w Microsoft Excel. Tutaj wynik przeliczał symulator; w Excelu tworzy go formuła wpisana do komórki.</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Powtórz ćwiczenie od początku" onPress={()=>reset(track)}
     style={[tap,{alignSelf:'flex-start',backgroundColor:'white',borderWidth:1,borderColor:border}]}><Text style={{fontWeight:'900',color:ink}}>Powtórz od początku</Text></Pressable>
   </View>:<View style={{backgroundColor:'white',padding:mobile?13:17,borderWidth:1,borderColor:border,borderRadius:13,gap:10}}>
    <Text style={{fontWeight:'900',color:'#34704a',fontSize:12}}>{'KROK '+(step+1)+' / '+guide.length}</Text>
    <Text testID="excel-first-step" style={{color:ink,fontSize:17,fontWeight:'900'}}>{guide[step].name}</Text>
    <Text style={{fontSize:14,lineHeight:24,color:muted}}>{guide[step].instruction}</Text>
    {[2,3,5].includes(step)&&<TextInput testID="excel-first-answer" accessibilityLabel="Twoja obliczona odpowiedź" value={answer} onChangeText={v=>{setAnswer(v);setWarning('');}}
     placeholder="Wpisz wynik, np. 135 albo 135,00 zł" placeholderTextColor="#7b9582" keyboardType="decimal-pad"
     style={{minHeight:48,borderWidth:1,borderColor:'#b5d4bf',borderRadius:9,padding:12,fontSize:15,color:ink}}/>}
    <Pressable accessibilityRole="button" accessibilityLabel="Sprawdź wykonanie zadania od zera" onPress={verify} style={[tap,{alignSelf:'flex-start',backgroundColor:'#245c3e'}]}>
     <Text style={{fontWeight:'900',color:'white',fontSize:14}}>Sprawdź wykonanie</Text>
    </Pressable>
    {!!warning&&<Text testID="excel-first-error" accessibilityLiveRegion="polite"
     style={{color:'#7c4c2b',padding:11,borderRadius:9,backgroundColor:'#fff6e8',fontSize:13,lineHeight:21}}>{warning}</Text>}
    <Pressable accessibilityRole="button" accessibilityLabel="Pokaż podpowiedź do kroku" onPress={()=>setShowHint(h=>!h)}
     style={{minHeight:44,justifyContent:'center',alignSelf:'flex-start'}}><Text style={{color:'#206a4b',fontWeight:'900',fontSize:13}}>{showHint?'Ukryj podpowiedź':'Potrzebujesz pomocy? Pokaż podpowiedź'}</Text></Pressable>
    {showHint&&<Text testID="excel-first-hint" style={{fontSize:13,lineHeight:22,color:ink,backgroundColor:'#edf5e9',borderRadius:8,padding:11}}>{guide[step].hint}</Text>}
   </View>}
   <View style={{backgroundColor:'white',padding:12,borderRadius:10,gap:6,borderWidth:1,borderColor:border}}>
    <Text style={{fontSize:14,color:ink,fontWeight:'900'}}>Jak to zrobić w prawdziwym Microsoft Excel?</Text>
    <Text style={{color:muted,fontSize:13,lineHeight:22}}>Wpisz nazwy do A2:A4, ilości do B2:B4 i ceny do C2:C4. W D2 wpisz =B2*C2, potem skopiuj formułę do D3 i D4. W D5 wpisz =SUMA(D2:D4). Zapisz plik jako XLSX.</Text>
    {Platform.OS==='web'?<a href={example.file} download style={{minHeight:44,display:'inline-flex',alignItems:'center',fontWeight:800,color:'#216e51',fontSize:13,textDecoration:'underline'}}>Pobierz listę ćwiczebną CSV do prawdziwego Excela</a>:
     <Text style={{color:muted,fontSize:12}}>Na komputerze możesz przepisać te przykładowe dane do Microsoft Excel.</Text>}
   </View>
   <Text style={{fontSize:11,color:'#647c6a',lineHeight:18}}>To anonimowy symulator. Twoje wpisy tutaj nie zapisują się na Twoim dysku ani nie są prawdziwym plikiem Excela. Możesz bez ograniczeń powtarzać ćwiczenia.</Text>
  </View>
 </View>;
}
