import React,{useMemo,useState} from 'react';
import {Platform,Pressable,Text,TextInput,View,useWindowDimensions} from 'react-native';
import {beginnerCount,checkFirstDayAnswer,pln} from './excelFirstDayAnswers';

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
const count=beginnerCount;
const money=(n:number)=>n.toLocaleString('pl-PL',{maximumFractionDigits:2})+' zł';
const tap={minHeight:46,paddingHorizontal:12,paddingVertical:10,borderRadius:10,justifyContent:'center' as const};
const guide=[
 {name:'Znajdź pierwszy wiersz danych',instruction:'Spójrz na tabelę powyżej. Litery A, B, C, D opisują kolumny. Pierwszy produkt znajduje się w WIERSZU 2. Kliknij „Wybierz” przy jego nazwie. Teraz niczego nie liczysz.',error:'Znajdź napis „Wiersz 2” i kliknij „Wybierz” przy pierwszym produkcie.',hint:'Wiersz 1 zawiera nazwy kolumn. Wiersz 2 jest pierwszym wierszem z produktem. Kliknij przy nim przycisk „Wybierz”.'},
 {name:'Zmień liczbę sztuk w B2',instruction:'Kolumna B to ILOŚĆ. Znajdź pole B2 obok pierwszego produktu. Na początku jest tam 2. Zmień tę liczbę na 3 i sprawdź, jak zmienia się wartość po prawej stronie.',error:'W pierwszym wierszu produktu znajdź B · Ilość. Zamiast 2 wpisz 3. Nie zmieniaj ceny.',hint:'B2 to liczba sztuk pierwszego produktu. Kliknij pole z liczbą 2, usuń ją i wpisz 3. Potwierdź przyciskiem „Sprawdź wykonanie”.'},
 {name:'Policz wartość pierwszego produktu — D2',instruction:'Teraz zrobimy to razem. B2 to ilość, C2 to cena jednej sztuki, D2 to łączna wartość. Możesz wpisać SAM WYNIK albo FORMUŁĘ =B2*C2. Obie odpowiedzi są poprawne.',error:'Wybierz jeden sposób: liczba albo formuła =B2*C2. Znak * oznacza mnożenie.',hint:'Zobacz liczby B2 i C2 w tabeli. Pomnóż je. W Excelu do komórki D2 wpisuje się =B2*C2, a po Enter program pokazuje obliczony wynik.'},
 {name:'Dodaj wartości trzech produktów',instruction:'Mamy trzy wartości w komórkach D2, D3 i D4. Chcemy je dodać. Możesz podać widoczną liczbę RAZEM albo formułę =SUMA(D2:D4). Dwukropek znaczy „od D2 do D4”.',error:'Dodaj kwoty z D2, D3 i D4. Poprawna formuła to =SUMA(D2:D4).',hint:'Zapis =SUMA(D2:D4) oznacza: dodaj D2 + D3 + D4. Możesz też odczytać gotową kwotę RAZEM spod tabeli.'},
 {name:'Zmień ilość drugiego produktu w B3',instruction:'Wróć do tabeli. Drugi produkt jest w WIERSZU 3. W polu B3 (Ilość) zwiększ liczbę o 1. Cena C3 pozostanie taka sama, ale wynik D3 oraz RAZEM zmienią się automatycznie.',error:'Znajdź B · Ilość przy drugim produkcie (wiersz 3) i dodaj jedną sztukę.',hint:'Nie zmieniaj pierwszego produktu. Wiersz 3 = drugi produkt. W polu B · Ilość wpisz o 1 więcej niż wcześniej.'},
 {name:'Sprawdź nową sumę — po zmianie B3',instruction:'Po zmianie ilości drugiego produktu suma RAZEM też się zmieniła. Podaj nowy wynik albo ponownie wpisz =SUMA(D2:D4). To jest najważniejsza zaleta Excela: wyniki aktualizują się po zmianie danych.',error:'Sprawdź nową sumę po zmianie drugiego produktu. Możesz użyć =SUMA(D2:D4).',hint:'Spójrz na aktualne kwoty D2, D3 i D4. Dodaj je lub wpisz formułę =SUMA(D2:D4).'}
] as const;

export default function ExcelFirstDayPractice(){
 const {width}=useWindowDimensions(),mobile=width<640;
 const [track,setTrack]=useState<Track>('dom');
 const [rows,setRows]=useState<Item[]>(()=>examples.dom.items.map(item=>({...item})));
 const [step,setStep]=useState(0),[selected,setSelected]=useState(-1),[answer,setAnswer]=useState('');
 const [warning,setWarning]=useState(''),[showHint,setShowHint]=useState(false),[notice,setNotice]=useState(''),[showReal,setShowReal]=useState(false);
 const values=useMemo(()=>rows.map(r=>{const n=count(r.amount);return n===null?null:n*r.price;}),[rows]);
 const total=values.every(n=>n!==null)?values.reduce<number>((sum,n)=>sum+(n??0),0):null;
 const done=step===guide.length,example=examples[track];
 function reset(next:Track){
  setTrack(next);setRows(examples[next].items.map(item=>({...item})));
  setStep(0);setSelected(-1);setAnswer('');setWarning('');setShowHint(false);setNotice('');setShowReal(false);
 }
 function verify(){
  if(done)return;
  const isAnswer=[2,3,5].includes(step);
  const oldSecond=count(example.items[1].amount);
  if(isAnswer){
   if(count(rows[0].amount)!==3){
    setWarning('Najpierw wykonaj krok 2: w komórce B2 ma być 3. Sprawdź ilość pierwszego produktu.');return;
   }
   if(step===5&&count(rows[1].amount)!==((oldSecond??0)+1)){
    setWarning('Najpierw zwiększ o jedną sztukę ilość drugiego produktu w B3.');return;
   }
   const result=checkFirstDayAnswer(answer,step as 2|3|5,rows);
   if(!result.correct){setWarning(result.message);setNotice('');return;}
   setNotice(result.message);
  }else{
   const correct=step===0?selected===0:
    step===1?count(rows[0].amount)===3:
    count(rows[0].amount)===3&&count(rows[1].amount)===(count(example.items[1].amount)!+1);
   if(!correct){setWarning(guide[step].error);setNotice('');return;}
   setNotice(step===0?'Świetnie! To pierwszy produkt w wierszu 2. W następnym kroku zmienisz jego ilość w B2.':
    step===1?'Dobrze! B2 = 3. Teraz dowiesz się, dlaczego D2 zmieniło swoją wartość.':
    'Super! Po zmianie B3 wartość D3 i suma RAZEM przeliczyły się automatycznie.');
  }
  setStep(n=>n+1);setAnswer('');setWarning('');setShowHint(false);
 }
 const previewAmount=count(rows[0].amount);
 const baselineAmount=count(example.items[0].amount)??2;
 const baselinePrice=example.items[0].price;
 const stepExplanation=step===0?'Wiersz = pozioma linia. Kolumna = pionowy słupek. Znak B2 wskazuje miejsce, w którym te dwa oznaczenia się przecinają.':
  step===1?'B2 to ILOŚĆ pierwszego produktu. Zmiana B2 nie zmienia ceny w C2, ale wpływa na wartość w D2.':
  step===2?'B2 = '+String(previewAmount??'błędna ilość')+' szt.; C2 = '+money(rows[0].price)+'. D2 otrzymujemy przez mnożenie: B2 × C2. Zapis =B2*C2 to polecenie dla Excela, a '+(values[0]===null?'—':money(values[0]))+' to jego wynik.':
  step===3?'D2 = '+(values[0]===null?'—':money(values[0]))+', D3 = '+(values[1]===null?'—':money(values[1]))+', D4 = '+(values[2]===null?'—':money(values[2]))+'. Formuła =SUMA(D2:D4) dodaje te trzy komórki.':
  step===4?'Zmieniamy ilość w B3, czyli przy drugim produkcie. Po zmianie Excel przelicza zarówno D3, jak i RAZEM.':
  'B3 zmieniono, więc nowa wartość D3 = '+(values[1]===null?'—':money(values[1]))+'. Wzór =SUMA(D2:D4) nadal jest taki sam, ale jego wynik się aktualizuje.';
 const formulaForStep=step===2?'=B2*C2':'=SUMA(D2:D4)';
 const answerStep=[2,3,5].includes(step);

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
    <Text testID="excel-first-column-shift" style={{color:'#325e42',fontSize:12,lineHeight:21}}>Uwaga: w kolejnym, większym warsztacie dołożymy kolumnę „JM” (jednostka miary). Wtedy Ilość będzie w C, Cena w D, a Wartość w E. Z tego powodu poprawny wzór w E2 będzie miał postać =C2*D2. Zawsze kieruj się nagłówkami tabeli, nie ucz się adresów na pamięć.</Text>
    {Platform.OS==='web'?<a href={example.file} download style={{minHeight:44,display:'inline-flex',alignItems:'center',fontWeight:800,color:'#216e51',fontSize:13,textDecoration:'underline'}}>Pobierz listę ćwiczebną CSV do prawdziwego Excela</a>:
     <Text style={{color:muted,fontSize:12}}>Na komputerze możesz przepisać te przykładowe dane do Microsoft Excel.</Text>}
   </View>
   <Text style={{fontSize:11,color:'#647c6a',lineHeight:18}}>To anonimowy symulator. Twoje wpisy tutaj nie zapisują się na Twoim dysku ani nie są prawdziwym plikiem Excela. Możesz bez ograniczeń powtarzać ćwiczenia.</Text>
  </View>
 </View>;
}
