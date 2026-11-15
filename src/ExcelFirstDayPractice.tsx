import React,{useMemo,useState} from 'react';
import {Platform,Pressable,Text,TextInput,View,useWindowDimensions} from 'react-native';

type Track='dom'|'parafia';
type Item={label:string;amount:string;price:number};
const examples:Record<Track,{label:string;title:string;context:string;items:Item[];file:string}>={
 dom:{
  label:'Budżet domowy',title:'Policz trzy codzienne wydatki',
  context:'Masz listę zakupów i chcesz sprawdzić, ile razem wydasz. Nie musisz znać żadnych skrótów.',
  items:[{label:'Zakupy spożywcze',amount:'2',price:45},{label:'Środki czystości',amount:'3',price:12},{label:'Bilety',amount:'1',price:28}],
  file:'/academy/assets/excel-firstday-home.csv'
 },
 parafia:{
  label:'Wydatki parafii',title:'Przygotuj proste zestawienie wydatków',
  context:'Porządkujesz trzy fikcyjne wydatki organizacyjne. Chcesz zobaczyć, co się stanie po zmianie ilości. Bez danych rzeczywistych.',
  items:[{label:'Ogrzewanie sali',amount:'2',price:180},{label:'Świece',amount:'4',price:15},{label:'Transport',amount:'1',price:75}],
  file:'/academy/assets/excel-firstday-parish.csv'
 }
};
const ink='#183e2d',muted='#4a6756';
const count=(text:string):number|null=>{
 if(!/^\d+$/.test(text.trim()))return null;
 const v=Number(text.trim());return Number.isSafeInteger(v)&&v>0&&v<=10000?v:null;
};
const money=(n:number)=>n.toLocaleString('pl-PL',{maximumFractionDigits:2})+' zł';
const touch={minHeight:48,paddingHorizontal:12,paddingVertical:10,borderRadius:10,justifyContent:'center' as const};
const guides=[
 {name:'Najpierw znajdź właściwy wiersz',instruction:'W tabeli poniżej znajdź pierwszą pozycję z listy i dotknij przycisku „Wybierz” obok niej. To dopiero wybór pola — nic jeszcze nie liczysz.',error:'Wybierz pierwszy wiersz przyciskiem „Wybierz”. Nie trzeba wpisywać liczb.'},
 {name:'Zmień jedną ilość',instruction:'W pierwszym wierszu zmień ilość na 3. Nie ruszaj ceny. Na telefonie dotknij pola „Ilość”, skasuj starą liczbę i wpisz 3.',error:'Zmień ilość pierwszej pozycji z 2 na 3. Cena ma pozostać bez zmian.'},
 {name:'Sprawdź wartość pierwszego wiersza',instruction:'Teraz oblicz wartość pierwszej pozycji: ilość × cena. Wpisz poniżej wynik. W prawdziwym Excelu robi to formuła =B2*C2.',error:'To nie jest prawidłowa wartość pierwszego wiersza. Pomnóż liczbę sztuk przez cenę jednej sztuki.'},
 {name:'Zsumuj wszystkie trzy pozycje',instruction:'Dodaj kwoty z kolumny Wartość: pierwszy, drugi i trzeci wiersz. Odpowiedź wpisz samodzielnie, bez naciskania „Dalej” na ślepo.',error:'Dodaj wartości wszystkich trzech wierszy, a nie same ceny. W Excelu formuła wygląda tak: =SUMA(D2:D4).'},
 {name:'Sprawdź reakcję na następną zmianę',instruction:'W drugim wierszu zwiększ ilość dokładnie o jedną sztukę. W kolumnie Wartość powinieneś zobaczyć nowe obliczenie.',error:'W drugim wierszu zwiększ ilość o jedną sztukę. Pierwszy wiersz pozostaw z ilością 3.'},
 {name:'Samodzielnie sprawdź nową sumę',instruction:'Oblicz sumę jeszcze raz po zmianie drugiego wiersza. Jeśli się różni od poprzedniej, to znaczy, że arkusz zareagował na nowe dane.',error:'Sprawdź ponownie wszystkie trzy wartości po ostatniej zmianie. Nie wpisuj starej sumy.'}
] as const;
export default function ExcelFirstDayPractice(){
 const {width}=useWindowDimensions(),mobile=width<640;
 const [track,setTrack]=useState<Track>('dom'),[rows,setRows]=useState<Item[]>(()=>examples.dom.items.map(x=>({...x})));
 const [step,setStep]=useState(0),[selected,setSelected]=useState(-1),[input,setInput]=useState(''),[warning,setWarning]=useState('');
 const values=useMemo(()=>rows.map(row=>{const n=count(row.amount);return n===null?null:n*row.price;}),[rows]);
 const total=values.every(v=>v!==null)?values.reduce<number>((sum,n)=>sum+(n??0),0):null;
 const done=step===guides.length;
 const base=examples[track];
 function selectTrack(next:Track){
  setTrack(next);setRows(examples[next].items.map(x=>({...x})));
  setStep(0);setSelected(-1);setInput('');setWarning('');
 }
 function verify(){
  if(done)return;
  const correct=step===0?selected===0:
   step===1?count(rows[0].amount)===3:
   step===2?count(rows[0].amount)===3&&count(input)!==null&&count(input)===values[0]:
   step===3?total!==null&&count(input)===total:
   step===4?count(rows[0].amount)===3&&count(rows[1].amount)===(count(base.items[1].amount)! + 1):
   total!==null&&count(input)===total&&count(rows[1].amount)===(count(base.items[1].amount)! + 1);
  if(!correct){setWarning(guides[step].error);return;}
  setStep(s=>s+1);setInput('');setWarning('');
 }
 return <View testID="excel-first-day" style={{backgroundColor:'#f6fbf5',borderRadius:17,borderWidth:1,borderColor:'#bdd8c5',overflow:'hidden',marginVertical:13}}>
  <View style={{backgroundColor:'#e2f1e5',padding:mobile?14:18,gap:7}}>
   <Text style={{fontSize:11,color:'#3d7351',fontWeight:'900'}}>EXCEL · PIERWSZY KONTAKT Z KOMPUTEROWYM ARKUSZEM</Text>
   <Text style={{fontSize:mobile?19:23,color:ink,fontWeight:'900'}}>Zacznij od znanej sytuacji — bez żargonu</Text>
   <Text style={{fontSize:13,lineHeight:21,color:muted}}>Wybierz przykład, który jest Ci bliższy. Przejdziesz sześć krótkich czynności; każda wymaga faktycznego kliknięcia, zmiany danych albo obliczenia wyniku.</Text>
  </View>
  <View style={{padding:mobile?12:17,gap:13}}>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
    {(['dom','parafia'] as Track[]).map(x=><Pressable key={x} testID={'excel-first-choice-'+x} accessibilityRole="button"
     accessibilityLabel={'Wybierz przykład: '+examples[x].label} accessibilityState={{selected:x===track}} onPress={()=>selectTrack(x)}
     style={[touch,{backgroundColor:x===track?'#245c3e':'#fff',borderWidth:1,borderColor:x===track?'#245c3e':'#b7d0be'}]}>
     <Text style={{color:x===track?'#fff':ink,fontSize:14,fontWeight:'800'}}>{examples[x].label}</Text>
    </Pressable>)}
   </View>
   <Text style={{fontSize:17,fontWeight:'900',color:ink}}>{base.title}</Text>
   <Text style={{fontSize:13,lineHeight:22,color:muted}}>{base.context}</Text>
   <View style={{padding:11,borderRadius:10,backgroundColor:'#fff',borderWidth:1,borderColor:'#d5e4d8',gap:5}}>
    <Text style={{fontSize:13,lineHeight:21,color:ink}}>A to nazwa pozycji, B to liczba sztuk, C to cena jednej sztuki, D to wartość całego wiersza.</Text>
    <Text style={{fontSize:12,lineHeight:20,color:muted}}>Wartość powstaje z mnożenia: Ilość × Cena. Zmieniasz ilość — wynik w kolumnie D przelicza się sam.</Text>
   </View>
   <View style={{borderWidth:1,borderColor:'#c8ddcd',borderRadius:10,backgroundColor:'#fff',overflow:'hidden'}}>
    <View style={{flexDirection:'row',backgroundColor:'#e4f0e5',paddingHorizontal:8,paddingVertical:8,alignItems:'center'}}>
     <Text style={{flex:1.4,fontSize:11.5,fontWeight:'900',color:ink}}>A · Pozycja</Text>
     <Text style={{flex:.7,fontSize:11.5,textAlign:'center',fontWeight:'900',color:ink}}>B · Ilość</Text>
     <Text style={{flex:.8,fontSize:11.5,textAlign:'center',fontWeight:'900',color:ink}}>C · Cena</Text>
     <Text style={{flex:.85,fontSize:11.5,textAlign:'right',fontWeight:'900',color:ink}}>D · Wartość</Text>
    </View>
    {rows.map((row,i)=><View key={i} style={{padding:7,flexDirection:'row',alignItems:'center',borderTopWidth:1,borderColor:'#e4eee4',gap:3,backgroundColor:selected===i?'#eef8ef':'#fff'}}>
     <View style={{flex:1.4,gap:4}}>
      <Text style={{fontSize:11.5,color:ink,fontWeight:'700'}}>{row.label}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{selected:selected===i}} accessibilityLabel={'Wybierz pozycję '+row.label}
       onPress={()=>setSelected(i)} style={{alignSelf:'flex-start',paddingHorizontal:8,paddingVertical:8,minHeight:44,justifyContent:'center',borderRadius:8,backgroundColor:selected===i?'#cae8d4':'#edf4ed'}}>
       <Text style={{fontSize:12,color:'#285f43',fontWeight:'900'}}>{selected===i?'✓ Wybrane':'Wybierz'}</Text>
      </Pressable>
     </View>
     <View style={{flex:.7}}>
      <TextInput testID={'excel-first-quantity-'+i} accessibilityLabel={'Ilość: '+row.label}
       selectTextOnFocus={true} keyboardType="number-pad" value={row.amount}
       onChangeText={value=>{setRows(previous=>previous.map((item,j)=>j===i?{...item,amount:value}:item));setWarning('');}}
       style={{borderWidth:1,borderColor:'#aecab7',borderRadius:7,color:ink,backgroundColor:'#fff',textAlign:'center',fontSize:15,minHeight:44,paddingHorizontal:2,paddingVertical:6}}/>
     </View>
     <Text style={{flex:.8,fontSize:12,textAlign:'center',color:ink}}>{money(row.price)}</Text>
     <Text testID={'excel-first-value-'+i} style={{flex:.85,fontSize:12,textAlign:'right',color:ink,fontWeight:'900'}}>{values[i]===null?'—':money(values[i]!)}</Text>
    </View>)}
    <View style={{padding:10,backgroundColor:'#edf6ec',borderTopWidth:1,borderColor:'#cadfcd',flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8}}>
     <Text style={{fontSize:13,fontWeight:'900',color:ink}}>RAZEM</Text>
     <Text testID="excel-first-total" style={{fontSize:17,fontWeight:'900',color:ink}}>{total===null?'Popraw ilości':money(total)}</Text>
    </View>
   </View>
   {done?<View testID="excel-first-success" style={{padding:12,borderRadius:11,backgroundColor:'#def1e3',gap:9}}>
    <Text style={{color:'#205e3d',fontSize:15,fontWeight:'900'}}>✓ Ukończono sześć czynności na prawdziwie przeliczanych danych ćwiczebnych.</Text>
    <Text style={{fontSize:13,lineHeight:22,color:ink}}>Wiesz już, że komórka przechowuje dane, formuła przelicza wynik i po zmianie ilości nowa suma powstaje bez ręcznego poprawiania innych komórek. Teraz możesz przejść do normalnej pracowni Excel.</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Powtórz ćwiczenie od początku" onPress={()=>selectTrack(track)}
     style={[touch,{backgroundColor:'#fff',borderWidth:1,borderColor:'#b3d2bb',alignSelf:'flex-start'}]}><Text style={{color:ink,fontWeight:'900'}}>Powtórz ćwiczenie od początku</Text></Pressable>
   </View>:<View style={{padding:13,backgroundColor:'#fff',borderWidth:1,borderColor:'#cee2d2',borderRadius:12,gap:11}}>
    <Text style={{color:'#3a7753',fontSize:12,fontWeight:'900'}}>KROK {step+1} / {guides.length}</Text>
    <Text testID="excel-first-step" style={{color:ink,fontSize:16,fontWeight:'900'}}>{guides[step].name}</Text>
    <Text style={{color:muted,fontSize:13.5,lineHeight:22}}>{guides[step].instruction}</Text>
    {[2,3,5].includes(step)&&<TextInput testID="excel-first-answer" accessibilityLabel="Twoja obliczona odpowiedź"
     value={input} onChangeText={setInput} placeholder="Wpisz wynik w zł, np. 135" placeholderTextColor="#7b9582"
     keyboardType="decimal-pad" style={{minHeight:48,padding:12,fontSize:15,color:ink,borderColor:'#b5d4bf',borderWidth:1,borderRadius:9}}/>}
    <Pressable accessibilityRole="button" accessibilityLabel="Sprawdź wykonanie zadania od zera" onPress={verify}
     style={[touch,{backgroundColor:'#245c3e',alignSelf:'flex-start'}]}><Text style={{color:'#fff',fontSize:14,fontWeight:'900'}}>Sprawdź wykonanie</Text></Pressable>
    {!!warning&&<Text testID="excel-first-error" accessibilityLiveRegion="polite" style={{color:'#995533',fontSize:13,lineHeight:21}}>{warning}</Text>}
   </View>}
   <Text style={{fontSize:12,lineHeight:20,color:muted}}>W Excelu na komputerze: wpisz nazwy w A2:A4, ilości w B2:B4, ceny w C2:C4, a w D2 wpisz <Text style={{fontWeight:'900'}}>=B2*C2</Text>. Skopiuj wzór do D3 i D4. W D5 wpisz <Text style={{fontWeight:'900'}}>=SUMA(D2:D4)</Text>. Zapisz swój plik jako XLSX i otwórz go ponownie.</Text>
   {Platform.OS==='web'?<a href={base.file} download style={{minHeight:44,display:'inline-flex',alignItems:'center',fontWeight:800,color:'#216e51',fontSize:13,textDecoration:'underline'}}>
    Pobierz listę ćwiczebną CSV do prawdziwego Excela
   </a>:<Text style={{fontSize:12,color:muted}}>Dane ćwiczenia można również przepisać do własnego Excela na komputerze.</Text>}
   <Text style={{fontSize:11,lineHeight:19,color:'#6c8070'}}>To anonimowy symulator w przeglądarce. Wpisy tutaj nie zapisują się na Twoim dysku i nie stanowią potwierdzenia pracy w rzeczywistym Excelu. Weryfikacja sześciu kroków nie zastępuje egzaminu kursowego.</Text>
 </View>
 </View>;
}
