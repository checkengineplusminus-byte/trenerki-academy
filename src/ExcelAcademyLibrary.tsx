import React,{useEffect,useMemo,useState} from 'react';
import {Linking,Pressable,Text,TextInput,View,useWindowDimensions} from 'react-native';
import encyclopedia from '../content/excel-encyclopedia-glossary.json';
import bonus from '../content/excel-bonus-chapters.json';
import deep from '../content/excel-deep-lessons.json';

const ink='#193b2b',muted='#4e6958',border='#d3e2d3';
const normalize=(value:string)=>value.toLocaleLowerCase('pl-PL').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').replace(/\s+/g,' ').trim();
const glossary=encyclopedia.terms;
type Tab='historia'|'start'|'slownik'|'rozdzialy';
type Chapter=(typeof bonus.chapters)[number];
const sourceStyle={fontSize:12,fontWeight:'800' as const,color:'#246b79',textDecorationLine:'underline' as const};
function Source({url,label}:{url:string;label:string}){
 return <Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(url)}
  style={{minHeight:44,alignSelf:'flex-start',justifyContent:'center',paddingVertical:5}}>
  <Text style={sourceStyle}>{label}</Text>
 </Pressable>;
}
const chipStyle={minHeight:44,paddingHorizontal:12,paddingVertical:9,borderRadius:10,borderWidth:1,justifyContent:'center' as const};
export function ExcelAcademyLibrary({lessonNo}:{lessonNo:number}){
 const {width}=useWindowDimensions(),compact=width<650;
 const [expanded,setExpanded]=useState(lessonNo===0),[tab,setTab]=useState<Tab>('historia');
 const [search,setSearch]=useState(''),[category,setCategory]=useState('Wszystkie'),[limit,setLimit]=useState(18);
 const [chosen,setChosen]=useState(''),[chapterId,setChapterId]=useState('historia-arkuszy');
 const [chapterLevel,setChapterLevel]=useState('Wszystkie');
 const [answer,setAnswer]=useState(''),[feedback,setFeedback]=useState<'idle'|'wrong'|'right'>('idle'),[finished,setFinished]=useState<string[]>([]);
 useEffect(()=>{setExpanded(lessonNo===0);setTab(lessonNo===0?'historia':'slownik');setSearch('');setCategory('Wszystkie');setChosen('');setLimit(18);},[lessonNo]);
 useEffect(()=>{
  if(!expanded||tab!=='slownik'||!chosen||typeof document==='undefined')return;
  // Place the definition in the learner's viewport after choosing an entry.
  const selectedNode=document.querySelector('[data-testid="excel-glossary-definition"]');
  selectedNode?.scrollIntoView?.({block:'nearest',behavior:'smooth'});
 },[expanded,tab,chosen]);
 const categories=['Wszystkie',...new Set(glossary.map(t=>t.category))];
 const matches=useMemo(()=>glossary.filter(term=>
  (category==='Wszystkie'||term.category===category)&&
  (!search.trim()||normalize(term.term+' '+term.definition+' '+term.example+' '+term.category).includes(normalize(search)))
 ),[search,category]);
 const selected=glossary.find(t=>t.id===chosen);
 const chapter:Chapter|undefined=bonus.chapters.find(c=>c.id===chapterId);
 const availableChapters=bonus.chapters.map((chapter,i)=>({...chapter,number:i+1})).filter(x=>
  chapterLevel==='Wszystkie'||
  (chapterLevel==='Od zera'&&['Historia','Od zera','Fundamenty'].includes(x.level))||
  chapterLevel===x.level
 );
 function chooseTab(next:Tab){setTab(next);setAnswer('');setFeedback('idle');}
 function chooseChapter(id:string){setChapterId(id);setAnswer('');setFeedback('idle');}
 function checkChapter(){
  if(!chapter)return;
  const right=normalize(answer.replace(/[.,!?;:]+$/,'')).replace(/\s+/g,'')===normalize(chapter.answer).replace(/\s+/g,'');
  setFeedback(right?'right':'wrong');
  if(right)setFinished(old=>old.includes(chapter.id)?old:[...old,chapter.id]);
 }
 return <View testID="excel-encyclopedia" style={{borderWidth:1,borderColor:'#c9dccb',borderRadius:16,backgroundColor:'#f7faf5',overflow:'hidden',marginVertical:10}}>
  <Pressable accessibilityRole="button" accessibilityState={{expanded}} accessibilityLabel="Biblioteka Excel: historia, wstęp, słownik i dodatkowe rozdziały"
   onPress={()=>setExpanded(v=>!v)} style={{padding:compact?13:17,backgroundColor:'#e7f1e6',gap:5,minHeight:64}}>
   <Text style={{fontSize:12,fontWeight:'900',color:'#4b7758'}}>BIBLIOTEKA WIEDZY · OD ZERA DO EKSPERTA</Text>
   <Text style={{fontSize:compact?17:20,color:ink,fontWeight:'900'}}>Historia, wstęp, {glossary.length} pojęć i {bonus.chapters.length} rozdziałów dodatkowych {expanded?'▴':'▾'}</Text>
   <Text style={{fontSize:12,color:muted}}>Otwórz dowolny temat w dowolnym momencie. Materiały uzupełniają 30 zaliczanych lekcji.</Text>
  </Pressable>
  {expanded&&<View style={{gap:14,padding:compact?12:17}}>
   <View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>
    {([
     ['historia','Historia Excela'],['start','Od czego zacząć'],['slownik','Słownik A–Z'],['rozdzialy','12 rozdziałów']
    ] as [Tab,string][]).map(([id,label])=><Pressable key={id} accessibilityRole="button" accessibilityState={{selected:tab===id}}
     accessibilityLabel={'Biblioteka — '+label} onPress={()=>chooseTab(id)}
     style={[chipStyle,{backgroundColor:tab===id?'#204b34':'#fff',borderColor:tab===id?'#204b34':'#cbdccf'}]}>
     <Text style={{fontSize:13,fontWeight:'900',color:tab===id?'#fff':ink}}>{label}</Text>
    </Pressable>)}
   </View>
   {tab==='historia'&&<View testID="excel-history" style={{gap:13}}>
    <Text style={{fontSize:18,color:ink,fontWeight:'900'}}>Dlaczego Excel w ogóle powstał?</Text>
    <Text style={{fontSize:14,lineHeight:23,color:muted}}>Przed arkuszami komputerowymi trzeba było ponownie liczyć całe kolumny kosztów po zmianie jednej ceny. Elektroniczny arkusz sprawił, że dane, formuły i raporty zaczęły pozostawać ze sobą powiązane. To historia o eliminowaniu żmudnego liczenia i uwalnianiu czasu na podejmowanie decyzji.</Text>
    {bonus.timeline.map((entry,i)=><View key={entry.year} style={{flexDirection:'row',gap:12}}>
     <View style={{width:61,alignItems:'center',gap:4}}>
      <Text style={{fontSize:14,color:'#326b4c',fontWeight:'900'}}>{entry.year}</Text>
      <View style={{width:2,height:52,backgroundColor:i===bonus.timeline.length-1?'transparent':'#b5d0bb'}}/>
     </View>
     <View style={{flex:1,borderLeftWidth:2,borderColor:'#a5c4af',paddingLeft:13,paddingBottom:12,gap:5}}>
      <Text style={{fontSize:15,color:ink,fontWeight:'900'}}>{entry.title}</Text>
      <Text style={{fontSize:13,lineHeight:21,color:muted}}>{entry.description}</Text>
     </View>
    </View>)}
    <Text style={{color:ink,fontWeight:'900',fontSize:14}}>Ciekawostka: Excel ma ponad 40 lat, ale główny pomysł nie zmienił się od początku — zmieniasz liczbę, a arkusz może przeliczyć zależne wyniki.</Text>
    <Source url="https://learn.microsoft.com/pl-pl/shows/history/history-of-microsoft-1985" label="Źródło: kalendarium historii Microsoft — 1985"/>
   </View>}
   {tab==='start'&&<View testID="excel-onboarding" style={{gap:12}}>
    <Text style={{fontSize:18,color:ink,fontWeight:'900'}}>Twój pierwszy dzień z Excelem</Text>
    <Text style={{fontSize:14,lineHeight:23,color:muted}}>Nie musisz znać terminów „komórka”, „pasek formuły” ani „skoroszyt”. Wyobraź sobie prostą listę zakupów. Lewa kolumna opisuje przedmiot, środkowa ilość, następna cenę, a ostatnia ma policzyć koszt. Zaczynamy od konkretnego zadania, a nie od pamięciowego uczenia się skrótów.</Text>
    {[
     ['1','Znajdź kratkę','Kliknij pole C2. Litera C jest nazwą kolumny, 2 oznacza wiersz.'],
     ['2','Wpisz dane','W C2 wpisz ilość, w D2 cenę. Naciśnij Enter, aby zatwierdzić.'],
     ['3','Dodaj formułę','W E2 wpisz =C2*D2. Gwiazdka jest znakiem mnożenia.'],
     ['4','Zmień tylko jedno wejście','Popraw ilość w C2 i zobacz, czy E2 zmieniło się samo.'],
     ['5','Zapisz i odzyskaj','Zapisz XLSX, zamknij go i otwórz ponownie. Sprawdź, czy wzór nadal działa.']
    ].map(([num,title,description])=><View key={num} style={{backgroundColor:'#fff',borderWidth:1,borderColor:'#dce9df',borderRadius:11,padding:12,flexDirection:'row',gap:11}}>
     <Text style={{width:26,color:'#46815a',fontSize:18,fontWeight:'900'}}>{num}</Text>
     <View style={{flex:1,gap:4}}><Text style={{fontWeight:'900',color:ink,fontSize:14}}>{title}</Text><Text style={{color:muted,fontSize:13,lineHeight:20}}>{description}</Text></View>
    </View>)}
    <Text style={{fontSize:13,lineHeight:22,color:muted}}>W lekcji 1 poniżej znajdziesz działającą pracownię „Rozpocznij Excel od zera”, która sprawdza sześć czynności. Możesz poćwiczyć w symulatorze bez instalowania programu, a później powtórzyć je w prawdziwym Excelu.</Text>
    <Source url="https://support.microsoft.com/en-us/excel/excel-glossary" label="Słownik terminów Microsoft Excel"/>
   </View>}
   {tab==='slownik'&&<View testID="excel-glossary" style={{gap:11}}>
    <Text style={{fontSize:18,color:ink,fontWeight:'900'}}>Słownik: od „Komórki” do „Power Query”</Text>
    <Text style={{fontSize:13,color:muted,lineHeight:21}}>Wyszukuj po nazwie albo opisie; wyniki wyświetlają się bez opuszczania lekcji. Każde hasło ma wyjaśnienie, przykład z pracy i ostrzeżenie przed typową pomyłką.</Text>
    <TextInput accessibilityLabel="Szukaj w słowniku Excel" placeholder="Szukaj: komórka, procent, tabela przestawna..." value={search}
     onChangeText={value=>{setSearch(value);setLimit(18);setChosen('');}}
     placeholderTextColor="#809183" autoCorrect={false} style={{minHeight:48,backgroundColor:'#fff',borderWidth:1,borderColor:'#bfd3c2',borderRadius:11,padding:12,color:ink,fontSize:14}}/>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
     {categories.map(x=><Pressable key={x} accessibilityRole="button" accessibilityState={{selected:category===x}} accessibilityLabel={'Kategoria słownika: '+x}
      onPress={()=>{setCategory(x);setLimit(18);setChosen('');}} style={[chipStyle,{backgroundColor:category===x?'#d9ebdf':'#fff',borderColor:category===x?'#75a785':border}]}>
      <Text style={{fontWeight:category===x?'900':'700',fontSize:12,color:ink}}>{x}</Text>
     </Pressable>)}
    </View>
    <Text style={{fontSize:12,color:muted}}>Znaleziono: {matches.length} z {glossary.length} haseł.</Text>
    {selected&&<View testID="excel-glossary-definition" style={{padding:13,borderRadius:12,backgroundColor:'#fff',borderWidth:1,borderColor:'#aecdb9',gap:8}}>
     <Text style={{fontWeight:'900',fontSize:16,color:ink}}>{selected.term}</Text>
     <Text style={{color:muted,fontSize:14,lineHeight:22}}>{selected.definition}</Text>
     <Text style={{color:'#276343',fontSize:13,lineHeight:21}}><Text style={{fontWeight:'900'}}>Przykład: </Text>{selected.example}</Text>
     <Text style={{color:'#895735',fontSize:13,lineHeight:21}}><Text style={{fontWeight:'900'}}>Uważaj: </Text>{selected.pitfall}</Text>
     <Source url={selected.reference} label="Sprawdź pojęcia w dokumentacji Microsoft"/>
    </View>}
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{matches.slice(0,limit).map(term=><Pressable key={term.id}
     accessibilityRole="button" accessibilityLabel={'Wyjaśnij pojęcie '+term.term} accessibilityState={{selected:chosen===term.id}}
     onPress={()=>setChosen(term.id)} style={[chipStyle,{backgroundColor:chosen===term.id?'#d3eadc':'#fff',borderColor:chosen===term.id?'#599773':border}]}>
     <Text style={{fontSize:13,fontWeight:chosen===term.id?'900':'700',color:ink}}>{term.term}</Text>
    </Pressable>)}</View>
    {matches.length===0&&<Text style={{fontSize:13,color:muted}}>Brak hasła. Spróbuj krótszego słowa albo innej kategorii.</Text>}
    {matches.length>limit&&<Pressable accessibilityRole="button" accessibilityLabel="Pokaż kolejne pojęcia w słowniku" onPress={()=>setLimit(x=>x+24)}
     style={[chipStyle,{alignSelf:'flex-start',backgroundColor:'#e6f2e6',borderColor:'#9ebfa6'}]}>
     <Text style={{color:ink,fontWeight:'900',fontSize:13}}>Pokaż następne hasła ({matches.length-limit} pozostało)</Text>
    </Pressable>}
   </View>}
   {tab==='rozdzialy'&&<View testID="excel-bonus-chapters" style={{gap:12}}>
    <Text style={{fontSize:18,color:ink,fontWeight:'900'}}>Dodatkowe rozdziały — pogłębiaj wiedzę</Text>
    <Text style={{fontSize:13,color:muted,lineHeight:21}}>To {bonus.chapters.length} dodatkowych rozdziałów czytania i samokontroli poza 30 zaliczanymi lekcjami. Nie zmieniają Twojego postępu ani warunków dyplomu. Wybierz temat — od historii i pierwszego dnia po DAX i automatyzację.</Text>
    <Text style={{color:'#356a49',fontWeight:'900',fontSize:12}}>Samokontrola tej sesji: {finished.length}/{bonus.chapters.length}</Text>
    <Text style={{color:ink,fontWeight:'900',fontSize:14}}>Wybierz etap dodatkowej nauki</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
     {['Wszystkie','Od zera','Praktyka','Ekspert'].map(level=><Pressable key={level}
      accessibilityRole="button" accessibilityLabel={'Poziom rozdziałów dodatkowych: '+level} accessibilityState={{selected:chapterLevel===level}}
      onPress={()=>{setChapterLevel(level);setAnswer('');setFeedback('idle');}}
      style={[chipStyle,{backgroundColor:chapterLevel===level?'#23553a':'#fff',borderColor:chapterLevel===level?'#23553a':border}]}>
      <Text style={{color:chapterLevel===level?'#fff':ink,fontWeight:'800',fontSize:13}}>{level}</Text>
     </Pressable>)}
    </View>
    <Text style={{color:muted,fontSize:12}}>Wyświetlasz {availableChapters.length} z {bonus.chapters.length} dodatkowych rozdziałów.</Text>
    <View style={{gap:7}}>{availableChapters.map((item)=><Pressable key={item.id} accessibilityRole="button"
     accessibilityLabel={'Otwórz rozdział dodatkowy '+item.title} accessibilityState={{selected:chapterId===item.id}}
     onPress={()=>chooseChapter(item.id)} style={{minHeight:50,backgroundColor:chapterId===item.id?'#d7eadb':'#fff',borderRadius:9,borderWidth:1,borderColor:chapterId===item.id?'#7fb193':border,padding:11,gap:3}}>
     <Text style={{fontWeight:'900',color:ink,fontSize:13}}>{finished.includes(item.id)?'✓ ':''}{String(item.number).padStart(2,'0')}. {item.title}</Text>
     <Text style={{color:'#55725c',fontSize:11}}>{item.level}</Text>
    </Pressable>)}</View>
    {chapter&&<View testID="excel-bonus-chapter-detail" style={{padding:compact?11:15,borderWidth:1,borderColor:'#b4d3bb',backgroundColor:'#fff',borderRadius:12,gap:12}}>
     <Text style={{fontSize:17,color:ink,fontWeight:'900'}}>{chapter.title}</Text>
     <Text style={{fontSize:14,lineHeight:23,color:muted}}>{chapter.lead}</Text>
     {chapter.sections.map((section,i)=><View key={i} style={{gap:5}}>
      <Text style={{fontWeight:'900',color:ink,fontSize:14}}>{i+1}. {section.heading}</Text>
      <Text style={{color:muted,fontSize:14,lineHeight:23}}>{section.text}</Text>
     </View>)}
     <View style={{backgroundColor:'#f0f7ee',padding:12,borderRadius:10,gap:8}}>
      <Text style={{color:ink,fontWeight:'900',fontSize:14}}>Sprawdź, czy naprawdę rozumiesz</Text>
      <Text style={{color:muted,fontSize:13,lineHeight:21}}>{chapter.task}</Text>
      <TextInput accessibilityLabel="Odpowiedź w dodatkowym rozdziale Excel" value={answer}
       onChangeText={v=>{setAnswer(v);setFeedback('idle');}} placeholder="Wpisz krótką odpowiedź..."
       placeholderTextColor="#718a75" style={{borderWidth:1,borderColor:'#c0d3c3',padding:11,minHeight:46,backgroundColor:'#fff',color:ink,borderRadius:9}}/>
      <Pressable accessibilityRole="button" accessibilityLabel="Sprawdź dodatkowy rozdział" onPress={checkChapter}
       style={[chipStyle,{alignSelf:'flex-start',backgroundColor:'#275a3a',borderColor:'#275a3a'}]}><Text style={{color:'#fff',fontWeight:'900',fontSize:13}}>Sprawdź odpowiedź</Text></Pressable>
      {feedback==='wrong'&&<Text testID="excel-bonus-wrong" accessibilityLiveRegion="polite" style={{fontSize:13,color:'#95542c',lineHeight:21}}>Sprawdź jeszcze raz. {chapter.tip}</Text>}
      {feedback==='right'&&<Text testID="excel-bonus-correct" accessibilityLiveRegion="polite" style={{fontSize:13,color:'#24643e',fontWeight:'900'}}>✓ Poprawnie! Rozumiesz zasadę — spróbuj zastosować ją na własnym przykładzie.</Text>}
     </View>
     <Source url={chapter.source} label="Dowiedz się więcej w dokumentacji źródłowej"/>
    </View>}
   </View>}
  </View>}
 </View>;
}

export function ExcelDeepLesson({lessonNo}:{lessonNo:number}){
 const record=deep.lessons.find(x=>x.lesson_no===lessonNo);
 const [chosen,setChosen]=useState('');
 const {width}=useWindowDimensions(),compact=width<650;
 useEffect(()=>setChosen(''),[lessonNo]);
 if(!record)return null;
 const related=record.glossary.map(word=>glossary.find(g=>normalize(g.term)===normalize(word))).filter(Boolean) as typeof glossary;
 const chosenDefinition=related.find(x=>x.id===chosen);
 return <View testID={'excel-deep-lesson-'+lessonNo} style={{borderWidth:1,borderColor:'#d4e4d6',borderRadius:16,padding:compact?13:18,backgroundColor:'#fff',gap:15,marginVertical:12}}>
  <View style={{gap:6}}>
   <Text style={{fontSize:11,fontWeight:'900',color:'#4d805b'}}>EXCEL · WPROWADZENIE I WYJAŚNIENIA</Text>
   <Text style={{color:ink,fontSize:compact?18:21,fontWeight:'900'}}>Zrozum temat, zanim zaczniesz liczyć</Text>
   <Text style={{fontSize:13,color:muted,lineHeight:21}}>Nie musisz zapamiętywać zdań. Przeczytaj, prześledź przykład, znajdź typową pułapkę i dopiero potem sprawdź wynik w praktyce.</Text>
  </View>
  {record.sections.map((section,i)=><View key={i} style={{gap:7}}>
   <View style={{flexDirection:'row',gap:9,alignItems:'center'}}>
    <Text style={{width:27,height:27,lineHeight:27,textAlign:'center',backgroundColor:'#e5f0e3',borderRadius:8,overflow:'hidden',color:'#34714c',fontWeight:'900'}}>{i+1}</Text>
    <Text style={{color:ink,flex:1,fontSize:15,fontWeight:'900'}}>{section.heading}</Text>
   </View>
   <Text style={{fontSize:14.5,lineHeight:24,color:muted}}>{section.text}</Text>
  </View>)}
  {!!related.length&&<View style={{gap:8,backgroundColor:'#f6faf6',padding:12,borderRadius:10}}>
   <Text style={{fontWeight:'900',color:ink,fontSize:13}}>Ważne pojęcia z tej lekcji — kliknij, aby zrozumieć</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
    {related.map(term=><Pressable key={term.id} accessibilityRole="button" accessibilityState={{selected:chosen===term.id}}
     accessibilityLabel={'Wyjaśnij hasło '+term.term} onPress={()=>setChosen(x=>x===term.id?'':term.id)}
     style={[chipStyle,{backgroundColor:chosen===term.id?'#d7ebda':'#fff',borderColor:chosen===term.id?'#7bae86':border}]}>
     <Text style={{color:ink,fontSize:12.5,fontWeight:'800'}}>{term.term}</Text>
    </Pressable>)}
   </View>
   {chosenDefinition&&<View testID="excel-deep-definition" style={{backgroundColor:'#fff',borderWidth:1,borderColor:'#d3e1d7',borderRadius:9,padding:11,gap:7}}>
    <Text style={{fontWeight:'900',color:ink,fontSize:14}}>{chosenDefinition.term}</Text>
    <Text style={{color:muted,fontSize:13,lineHeight:21}}>{chosenDefinition.definition}</Text>
    <Text style={{color:'#2e7050',fontSize:12,lineHeight:20}}>Przykład: {chosenDefinition.example}</Text>
   </View>}
  </View>}
  <Text style={{fontSize:12,lineHeight:20,color:'#58705f'}}>{record.reminder}</Text>
 </View>;
}
