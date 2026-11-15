import React,{useMemo,useState} from 'react';
import {Linking,Pressable,Text,TextInput,View,useWindowDimensions} from 'react-native';
import reference from '../content/excel-function-index-2026.json';
import syllabus from '../content/excel-master-syllabus.json';

type Tab='plan'|'functions'|'print';
type FunctionEntry={code:string;name:string;category:string;url:string;what:string;example?:string};
type Chapter={id:number;level:string;title:string;explanation:string;steps:string[];example:string;pitfall:string;assignment:string};
const allFunctions=reference.functions as FunctionEntry[];
const chapters=syllabus.chapters as Chapter[];
const levels=['Wszystkie','Podstawy','Praktyka','Zaawansowane'];
const categories=['Wszystkie',...new Set(allFunctions.map(item=>item.category))];
const normalize=(text:string)=>text.toLocaleLowerCase('pl-PL').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l');
const ink='#193d2c',muted='#4c6756',outline='#cbded0';
const link=(url:string)=>void Linking.openURL(url);

export default function ExcelMasterGuide(){
 const {width}=useWindowDimensions(),mobile=width<650;
 const [tab,setTab]=useState<Tab>('plan');
 const [level,setLevel]=useState('Wszystkie'),[openChapter,setOpenChapter]=useState<number|null>(1);
 const [query,setQuery]=useState(''),[category,setCategory]=useState('Wszystkie'),[limit,setLimit]=useState(25);
 const [answer,setAnswer]=useState(''),[quiz,setQuiz]=useState<'idle'|'correct'|'wrong'>('idle');
 const visibleChapters=chapters.filter(c=>level==='Wszystkie'||c.level===level);
 const results=useMemo(()=>allFunctions.filter(item=>
  (category==='Wszystkie'||item.category===category)&&
  (!query.trim()||normalize(item.code+' '+item.name+' '+item.category).includes(normalize(query.trim())))
 ),[category,query]);
 const chosen=chapters.find(c=>c.id===openChapter);
 const pill=(selected:boolean)=>({minHeight:40,paddingHorizontal:11,paddingVertical:8,borderRadius:9,borderWidth:1,
  borderColor:selected?'#559671':outline,backgroundColor:selected?'#d9ecdd':'white'} as const);
 const sectionHeading={color:ink,fontSize:mobile?17:19,fontWeight:'900' as const};
 return <View testID="excel-master-guide" style={{borderWidth:1,borderColor:'#bfd6c7',borderRadius:17,backgroundColor:'#f3f8f3',marginVertical:14,overflow:'hidden'}}>
  <View style={{padding:mobile?13:19,backgroundColor:'#e2f0e2',gap:8}}>
   <Text style={{fontSize:11,fontWeight:'900',color:'#427657'}}>TRENERKI · DODATKOWA ENCYKLOPEDIA EXCEL</Text>
   <Text style={{fontSize:mobile?20:23,fontWeight:'900',color:ink}}>Excel krok po kroku — od pierwszej komórki do raportu PDF</Text>
   <Text style={{fontSize:13,lineHeight:21,color:muted}}>39 szczegółowych rozdziałów uzupełniających i katalog 514 funkcji. Podstawy uczymy powoli, z przykładem i ostrzeżeniem o typowych błędach; później przechodzimy do analizy, tabel przestawnych, Power Query i finansów. Dotychczasowe 30 zaliczanych lekcji i postępy pozostają bez zmian.</Text>
   <Text style={{fontSize:12,lineHeight:19,color:muted}}>To niezależny kurs TRENERKI, a nie oficjalne szkolenie ani certyfikacja Microsoft. Część operacji wykonujesz w prawdziwym Excelu; szkoleniowy symulator odtwarza tylko wybrane funkcje.</Text>
  </View>
  <View style={{padding:mobile?12:17,gap:14}}>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
    {([{id:'plan',name:'39 rozdziałów krok po kroku'},{id:'functions',name:'514 funkcji A–Z'},{id:'print',name:'PDF, druk i liczba stron'}] as {id:Tab;name:string}[]).map(x=>
     <Pressable key={x.id} accessibilityRole="button" accessibilityState={{selected:tab===x.id}} onPress={()=>setTab(x.id)} style={pill(tab===x.id)}>
      <Text style={{fontSize:13,fontWeight:'900',color:ink}}>{x.name}</Text>
     </Pressable>)}
   </View>
   {tab==='plan'&&<View style={{gap:12}}>
    <Text style={sectionHeading}>Program uzupełniający — najpierw rozumiesz, potem wykonujesz</Text>
    <Text style={{fontSize:13,lineHeight:21,color:muted}}>Wybierz rozdział, przeczytaj wyjaśnienie, wykonaj każdy krok w Microsoft Excel, porównaj wynik i sprawdź pułapkę. Są to dodatkowe instrukcje, a nie automatyczne zaliczenie ćwiczeń.</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{levels.map(x=>
     <Pressable key={x} accessibilityRole="button" accessibilityState={{selected:level===x}} onPress={()=>{setLevel(x);setOpenChapter(null)}} style={pill(level===x)}>
      <Text style={{fontSize:12,fontWeight:'800',color:ink}}>{x}</Text>
     </Pressable>)}</View>
    <Text style={{fontSize:12,fontWeight:'700',color:muted}}>Widocznych rozdziałów: {visibleChapters.length} z {chapters.length}</Text>
    <View style={{gap:7}}>{visibleChapters.map(c=>
     <Pressable key={c.id} accessibilityRole="button" accessibilityState={{expanded:openChapter===c.id}}
      onPress={()=>setOpenChapter(prev=>prev===c.id?null:c.id)}
      style={{padding:12,minHeight:44,borderWidth:1,borderColor:openChapter===c.id?'#5f9c72':outline,borderRadius:10,backgroundColor:openChapter===c.id?'#e4f1e5':'white'}}>
      <Text style={{fontSize:13,fontWeight:'900',color:ink}}>{c.id}. {c.title} {openChapter===c.id?'▴':'▾'}</Text>
      <Text style={{fontSize:11,color:muted,marginTop:3}}>{c.level}</Text>
     </Pressable>)}</View>
    {chosen&&visibleChapters.some(c=>c.id===chosen.id)&&<View testID="excel-master-chapter" style={{backgroundColor:'white',borderWidth:1,borderColor:outline,borderRadius:12,padding:mobile?13:17,gap:11}}>
     <Text style={sectionHeading}>{chosen.id}. {chosen.title}</Text>
     <Text style={{fontSize:14,lineHeight:24,color:muted}}>{chosen.explanation}</Text>
     <Text style={{fontSize:13,fontWeight:'900',color:'#235a38'}}>Wykonaj krok po kroku</Text>
     {chosen.steps.map((step,i)=><Text key={i} style={{fontSize:13,lineHeight:22,color:ink}}>{i+1}. {step}</Text>)}
     <View style={{backgroundColor:'#f0f7ee',padding:11,borderRadius:8,gap:5}}>
      <Text style={{fontSize:12,fontWeight:'900',color:ink}}>Przykład z oczekiwanym wynikiem</Text>
      <Text style={{fontSize:13,lineHeight:21,color:muted}}>{chosen.example}</Text>
     </View>
     <View style={{backgroundColor:'#fff7e7',padding:11,borderRadius:8,gap:5}}>
      <Text style={{fontSize:12,fontWeight:'900',color:'#785e31'}}>Uważaj na ten błąd</Text>
      <Text style={{fontSize:13,lineHeight:21,color:'#705631'}}>{chosen.pitfall}</Text>
     </View>
     <Text style={{fontSize:13,lineHeight:22,color:ink}}><Text style={{fontWeight:'900'}}>Twoje samodzielne zadanie: </Text>{chosen.assignment}</Text>
    </View>}
   </View>}
   {tab==='functions'&&<View style={{gap:11}}>
    <Text style={sectionHeading}>Encyklopedia {allFunctions.length} funkcji — źródła producenta</Text>
    <Text style={{fontSize:13,lineHeight:21,color:muted}}>Katalog zawiera 514 krótkich wyjaśnień, 43 wzory przykładowe, nazwy polskie i angielskie oraz odnośniki do pełnych instrukcji Microsoft. To nie jest deklaracja, że wszystkie te funkcje działają w małym arkuszu symulacyjnym. Nazwy i dostępność mogą zależeć od wersji, platformy i języka Excela.</Text>
    <TextInput accessibilityLabel="Szukaj funkcji Excel A do Z" testID="excel-master-function-search"
     placeholder="Szukaj SUMA, JEŻELI, XLOOKUP, MOD, PMT..." placeholderTextColor="#6a8671"
     value={query} onChangeText={v=>{setQuery(v);setLimit(25)}} autoCorrect={false} style={{padding:13,borderWidth:1,borderColor:outline,backgroundColor:'white',borderRadius:10,color:ink,fontSize:14}}/>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{categories.map(x=>
     <Pressable key={x} accessibilityRole="button" accessibilityState={{selected:category===x}}
      onPress={()=>{setCategory(x);setLimit(25)}} style={pill(category===x)}>
      <Text style={{fontSize:11,color:ink,fontWeight:'700'}}>{x}</Text>
     </Pressable>)}</View>
    <Text style={{fontSize:12,fontWeight:'800',color:muted}}>Znaleziono: {results.length}; pokazano {Math.min(results.length,limit)}</Text>
    {results.slice(0,limit).map(f=><View key={f.code} style={{borderWidth:1,borderColor:'#dbe7dd',borderRadius:9,backgroundColor:'white',padding:11,gap:5}}>
      <Text style={{fontSize:14,color:ink,fontWeight:'900'}}>{f.name===f.code?f.code:f.name+' · '+f.code}</Text>
      <Text style={{fontSize:11,color:muted}}>{f.category}</Text>
      <Text style={{fontSize:13,color:ink,lineHeight:20}}>{f.what}</Text>
      {!!f.example&&<View style={{backgroundColor:'#f0f6ed',padding:9,borderRadius:7}}>
       <Text style={{fontSize:11,color:muted,fontWeight:'900'}}>Przykładowa formuła</Text>
       <Text selectable style={{fontSize:12,fontWeight:'700',color:'#285c3d'}}>{f.example}</Text>
      </View>}
      <Pressable accessibilityRole="link" accessibilityLabel={'Dokumentacja Microsoft funkcji '+f.code} onPress={()=>link(f.url)} style={{minHeight:37,justifyContent:'center'}}>
       <Text style={{fontSize:12,fontWeight:'800',color:'#226485',textDecorationLine:'underline'}}>Opis, składnia i przykłady — Microsoft Support ↗</Text>
      </Pressable>
     </View>)}
    {results.length>limit&&<Pressable accessibilityRole="button" onPress={()=>setLimit(n=>n+25)} style={{minHeight:46,padding:13,alignItems:'center',backgroundColor:'#e1efe0',borderRadius:9}}>
     <Text style={{fontSize:13,color:ink,fontWeight:'900'}}>Pokaż następne 25 funkcji</Text>
    </Pressable>}
    {!results.length&&<Text style={{color:muted}}>Brak dopasowania. Spróbuj nazwy angielskiej, polskiej lub kategorii.</Text>}
   </View>}
   {tab==='print'&&<View style={{gap:12}}>
    <Text style={sectionHeading}>Jak uzyskać czytelny PDF — od A do Z</Text>
    {[
      ['1. Przygotuj dane','Zaznacz wyłącznie raport do wydruku. Wpisz nagłówki kolumn, popraw błędne typy liczb i sprawdź sumę.'],
      ['2. Ustaw obszar wydruku','Układ strony → Obszar wydruku → Ustaw obszar wydruku. Bez tego Excel może uwzględnić dodatkowe puste lub techniczne kolumny.'],
      ['3. Wybierz papier i orientację','Układ strony → Rozmiar (np. A4), Orientacja (pionowa/pozioma) i Marginesy. Obejrzyj czytelność kolumn.'],
      ['4. Licz strony, nie wiersze','Plik → Drukuj pokaże rzeczywistą liczbę stron po uwzględnieniu skali i marginesów. Excel może mieć 1 048 576 wierszy × 16 384 kolumn, ale nie drukuje ich automatycznie.'],
      ['5. Kontroluj szerokość stron','Układ strony → Dopasuj do: szerokość 1 strona, wysokość automatycznie — szerokie kolumny zmieszczą się w jednym pasie, a duża liczba wierszy przejdzie na kolejne strony.'],
      ['6. Powtarzaj nagłówek tabeli','Układ strony → Tytuły wydruku → U góry powtarzaj wiersze: $1:$1. Nagłówek wiersza 1 będzie widoczny także na kolejnych stronach wydruku.'],
      ['7. Sprawdź podziały','Widok → Podgląd podziału stron pokazuje granice stron. Nie zmniejszaj wszystkiego do jednej strony kosztem czytelności.'],
      ['8. Dodaj numerację','Wstawianie → Nagłówek i stopka. Umieść numer strony, nazwę raportu albo datę. Przejrzyj stronę 1, 2 i ostatnią.'],
      ['9. Zapisz PDF','Plik → Zapisz jako (lub Zapisz kopię) → typ PDF (*.pdf). W Opcjach wybierz właściwe arkusze/obszar i jakość.'],
      ['10. Zweryfikuj plik','Otwórz zapisany PDF poza Excelem. Policz strony, sprawdź sumy, podpisy, cięcie tabeli, nagłówki i rozmiar tekstu. Zachowaj także źródłowy XLSX.']
     ].map(([h,d])=><View key={h} style={{padding:12,borderWidth:1,borderColor:outline,borderRadius:9,backgroundColor:'white',gap:4}}>
      <Text style={{fontSize:13,color:ink,fontWeight:'900'}}>{h}</Text>
      <Text style={{fontSize:13,color:muted,lineHeight:21}}>{d}</Text>
     </View>)}
    <Text style={sectionHeading}>Mini-test — co zapisuje obliczenia?</Text>
    <Text style={{fontSize:13,color:muted}}>Wpisz nazwę formatu, który zachowuje edytowalny skoroszyt z formułami: XLSX czy PDF?</Text>
    <TextInput testID="excel-pdf-check" value={answer} onChangeText={v=>{setAnswer(v);setQuiz('idle')}} placeholder="XLSX lub PDF" accessibilityLabel="Odpowiedź XLSX lub PDF" style={{borderWidth:1,borderColor:outline,borderRadius:8,padding:12,color:ink,backgroundColor:'white'}}/>
    <Pressable accessibilityRole="button" onPress={()=>setQuiz(answer.trim().toUpperCase()==='XLSX'?'correct':'wrong')} style={{padding:12,minHeight:44,backgroundColor:'#deeee1',borderRadius:8}}>
      <Text style={{color:ink,fontWeight:'900',textAlign:'center'}}>Sprawdź odpowiedź</Text>
    </Pressable>
    {quiz!=='idle'&&<Text accessibilityLiveRegion="polite" style={{fontSize:13,color:quiz==='correct'?'#296a3b':'#926329',fontWeight:'700'}}>{quiz==='correct'?'✓ Tak. XLSX zachowuje edytowalne komórki, formuły i wiele arkuszy.':'Spróbuj ponownie: PDF służy głównie do publikacji, a skoroszyt do edycji.'}</Text>}
    <View style={{gap:9}}>
     <Text style={{fontSize:12,color:muted,fontWeight:'800'}}>Dokumentacja producenta — porównaj polecenia w swojej wersji</Text>
     {[
      ['Microsoft: zapis do PDF','https://support.microsoft.com/pl-pl/office/collab-files/save-or-convert-to-pdf-or-xps-in-office-desktop-apps'],
      ['Microsoft: ustawienia strony','https://support.microsoft.com/pl-pl/excel/page-setup'],
      ['Microsoft: powtarzanie nagłówków','https://support.microsoft.com/pl-pl/excel/print-the-top-row-on-every-page'],
      ['Microsoft: limity wierszy i kolumn','https://support.microsoft.com/pl-pl/excel/excel-specifications-and-limits']
     ].map(([h,url])=><Pressable key={h} accessibilityRole="link" onPress={()=>link(url)} style={{minHeight:40,justifyContent:'center'}}>
      <Text style={{color:'#236a86',fontWeight:'800',textDecorationLine:'underline',fontSize:12}}>{h} ↗</Text>
     </Pressable>)}
    </View>
   </View>}
  </View>
 </View>;
