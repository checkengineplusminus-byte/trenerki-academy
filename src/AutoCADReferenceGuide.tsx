import React,{useMemo,useState} from 'react';
import {Linking,Pressable,Text,TextInput,View} from 'react-native';
import ref from '../content/autocad-reference-2026.json';
import supplement from '../content/autocad-source-aliases-2026.json';

type Tab='steps'|'menu'|'commands'|'aliases'|'keys';
type RecordItem={command:string;alias?:string;category:string;label:string;purpose:string;lab:boolean;sourceDescription?:string;note?:string};
const ink='#14263B',muted='#53677D';
const tabs:{id:Tab;label:string}[]=[
 {id:'steps',label:'Ćwicz krok po kroku'},
 {id:'menu',label:'Całe menu'},
 {id:'commands',label:'Polecenia'},
 {id:'aliases',label:'Aliasy A–Z'},
 {id:'keys',label:'Skróty klawiaturowe'},
];
const added=supplement.entries.filter(item=>!item.inOriginalAtlas).filter((value,index,all)=>all.findIndex(x=>x.command===value.command)===index);
const allCommands:RecordItem[]=[
 ...ref.commands.map(cmd=>({...cmd})),
 ...added.map(item=>({command:item.command,alias:item.alias,category:item.category,label:item.label,
  purpose:item.explanationPL,lab:false,sourceDescription:item.sourceDescription,note:item.note})),
];
const old=new Set(ref.shortcuts.map(row=>row.keys.toUpperCase().replace(/\s/g,'')));
const allKeys=[
 ...ref.shortcuts.map(row=>({...row,description:row.purpose,source:'atlas'})),
 ...supplement.keyboard.filter(row=>!old.has(row.keys.toUpperCase().replace(/\s/g,''))).map(row=>({keys:row.keys,purpose:row.explanationPL,
  description:row.explanationPL,source:'lista',sourceDescription:row.sourceDescription,note:row.note})),
];
const detailFor=(item:RecordItem)=>{
 const name=item.command,kind=item.category.toLocaleLowerCase('pl');
 if(/wymiary|opis|annotate|table|style|tekst|leader/.test(kind))return {
  start:'Wpisz '+name+' w wierszu poleceń, a następnie przeczytaj opcje na ekranie. Ustaw styl, punkt wstawienia i właściwości opisu przed zatwierdzeniem.',
  check:'Otwórz Properties i Layout. Sprawdź, czy tekst, wysokość, jednostki i forma wymiaru są czytelne po wyeksportowaniu PDF.',
  warning:'Nie wpisuj „ładnego” wymiaru na oko. Przekonaj się niezależnym pomiarem, że opis odpowiada geometrii.'};
 if(/rysowanie|geometria|modelowanie/.test(kind))return {
  start:'Uruchom '+name+' w Model Space na kopii pliku. Wskazuj punkty i parametry dokładnie w kolejności żądanej przez AutoCAD.',
  check:'Wybierz obiekt po zakończeniu polecenia. Porównaj współrzędne, rozmiar i typ geometrii z oczekiwanym wynikiem.',
  warning:'Nie myl zaznaczenia obiektu z aktywną komendą. W środowisku 3D upewnij się również, że pracujesz na właściwym UCS.'};
 if(/modyfikuj|edycja|modify|zmień/.test(kind))return {
  start:'Najpierw zaznacz obiekt lub grupę, potem wpisz '+name+'. Przeczytaj pytanie o punkt bazowy, cel lub opcję. Zatwierdź dopiero po sprawdzeniu podglądu.',
  check:'Użyj DIST lub Properties, żeby potwierdzić, czy polecenie zmieniło położenie, kształt czy rozmiar.',
  warning:'Przy błędnym zaznaczeniu przesuniesz lub zmienisz tylko część rysunku. Przed operacją sprawdź licznik obiektów.'};
 if(/pliki|wydruk|file|output/.test(kind))return {
  start:'Wykonaj '+name+' na kopii rysunku z nazwą i numerem rewizji. Zwróć uwagę na lokalizację zapisu i wymagany format pliku.',
  check:'Zamknij lub odłącz wynik, a potem otwórz go ponownie, by upewnić się, że plik jest kompletny i czytelny.',
  warning:'Prawidłowo zakończony eksport nie gwarantuje poprawnej skali ani kompletności XREF i czcionek.'};
 return {
  start:'Wpisz '+name+' w prawdziwym AutoCAD i przeczytaj dostępne opcje. Przed zmianą ustawienia zachowaj kopię roboczą i zanotuj jego wcześniejszą wartość.',
  check:'Po zastosowaniu komendy sprawdź konkretny rezultat: wygląd widoku, aktywną warstwę, właściwość albo stan wskazanej palety.',
  warning:'Dostępność tego polecenia może zależeć od edycji programu, zainstalowanych modułów i profilu. Nie traktuj symulatora TRENERKI jako pełnego AutoCAD.'};
};
const action=(label:string,onPress:()=>void,selected=false)=><Pressable key={label} accessibilityRole="button" accessibilityState={{selected}}
  onPress={onPress} style={{paddingHorizontal:12,paddingVertical:10,minHeight:43,borderRadius:9,justifyContent:'center',
  backgroundColor:selected?ink:'#EFF3F8',borderWidth:1,borderColor:selected?ink:'#DCE4ED'}}>
 <Text style={{fontWeight:'800',fontSize:13,color:selected?'white':ink}}>{label}</Text>
</Pressable>;
export default function AutoCADReferenceGuide(){
 const [open,setOpen]=useState(false),[tab,setTab]=useState<Tab>('steps');
 const [guideId,setGuideId]=useState('select'),[menu,setMenu]=useState(0);
 const [query,setQuery]=useState(''),[category,setCategory]=useState('Wszystkie'),[visible,setVisible]=useState(24);
 const [details,setDetails]=useState(''),[shortcutsQuery,setShortcutsQuery]=useState('');
 const categories=useMemo(()=>['Wszystkie',...new Set(allCommands.map(cmd=>cmd.category))],[]);
 const found=useMemo(()=>{const q=query.trim().toLocaleLowerCase('pl');
  return allCommands.filter(cmd=>(category==='Wszystkie'||category===cmd.category)&&
   (!q||[cmd.command,cmd.alias,cmd.label,cmd.purpose,cmd.category].some(v=>String(v||'').toLocaleLowerCase('pl').includes(q))));},[query,category]);
 const aliases=useMemo(()=>{const q=query.trim().toLowerCase();
  return supplement.entries.filter(row=>!q||[row.alias,row.command,row.sourceDescription,row.explanationPL].some(value=>String(value||'').toLowerCase().includes(q)));},[query]);
 const keys=useMemo(()=>{const q=shortcutsQuery.trim().toUpperCase();
  return allKeys.filter(row=>!q||row.keys.toUpperCase().includes(q)||row.purpose.toUpperCase().includes(q));},[shortcutsQuery]);
 const guide=ref.walkthroughs.find(x=>x.id===guideId)||ref.walkthroughs[0],info=ref.tabs[menu];
 const link=(url:string)=>void Linking.openURL(url);
 const detailCard=(item:RecordItem)=>{
  const expanded=details===item.command,ex=detailFor(item);
  return <View key={item.category+'-'+item.command} style={{padding:12,borderRadius:10,backgroundColor:'white',gap:7}}>
   <Pressable accessibilityRole="button" accessibilityState={{expanded}} onPress={()=>setDetails(expanded?'':item.command)} style={{gap:5}}>
    <Text style={{fontWeight:'900',fontSize:15,color:ink}}>{item.command}{item.alias?' · '+item.alias:''} — {item.label} {expanded?'↑':'↓'}</Text>
    <Text style={{color:muted,lineHeight:21,fontSize:13}}>{item.purpose}</Text>
    <Text style={{fontSize:11,color:item.lab?'#2C587B':'#53677D',fontWeight:'800'}}>{item.lab?'Działa w naszym warsztacie 2D':'Ćwicz w Autodesk; zakres symulatora ograniczony'}</Text>
   </Pressable>
   {expanded&&<View testID="autocad-command-detail" style={{gap:10,padding:9,borderLeftWidth:3,borderColor:'#a6c7aa',backgroundColor:'#EFF3F8'}}>
    <Text style={{fontWeight:'900',color:ink}}>Uruchomienie i kolejność</Text><Text style={{color:muted,lineHeight:23}}>{ex.start}</Text>
    <Text style={{fontWeight:'900',color:ink}}>Kontrola wyniku</Text><Text style={{color:muted,lineHeight:23}}>{ex.check}</Text>
    <Text style={{fontWeight:'900',color:ink}}>Najczęstsza pomyłka</Text><Text style={{color:muted,lineHeight:23}}>{ex.warning}</Text>
    {item.note&&<Text style={{color:'#705823',lineHeight:21}}>{item.note}</Text>}
    {item.sourceDescription&&<Text style={{fontSize:12,color:'#748178',lineHeight:19}}>Opis z przesłanego zestawienia (EN): {item.sourceDescription}</Text>}
    <Pressable accessibilityRole="link" onPress={()=>link(supplement.autodeskDocs.commands)} style={{padding:8}}>
     <Text style={{color:'#2C587B',fontWeight:'900'}}>Sprawdź szczegóły polecenia w Autodesk ↗</Text>
    </Pressable>
   </View>}
  </View>;
 };
 return <View testID="autocad-reference-guide" style={{borderColor:'#DCE4ED',borderWidth:1,borderRadius:15,backgroundColor:'#EFF3F8',marginVertical:12,overflow:'hidden'}}>
  <Pressable accessibilityRole="button" accessibilityState={{expanded:open}} onPress={()=>setOpen(x=>!x)} style={{padding:17,gap:6,backgroundColor:'#EFF3F8'}}>
   <Text style={{fontSize:17,fontWeight:'900',color:ink}}>{open?'Zwiń bibliotekę AutoCAD ↑':'Biblioteka AutoCAD: menu, skala, czcionki, OSNAP, skróty ↓'}</Text>
   <Text style={{fontSize:12,lineHeight:19,color:muted}}>{allCommands.length} opisów poleceń, {supplement.entries.length} wierszy aliasów z przesłanej listy, {allKeys.length} skrótów i {ref.tabs.length} kart/pasków. Otwórz wybraną kartę, a następnie szczegóły funkcji.</Text>
  </Pressable>
  {open&&<View style={{padding:15,gap:13}}>
   <Text style={{color:muted,fontSize:12,lineHeight:20}}>Zakres: wersja AutoCAD 2026 Windows jako punkt odniesienia. Pełny Autodesk posiada więcej poleceń i zmiennych niż ten atlas. Oznaczenia „do sprawdzenia” pokazują niepewne/historyczne wpisy źródłowe. Alias (np. L) i skrót klawiaturowy (np. Ctrl+1) to różne mechanizmy.</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{tabs.map(x=>action(x.label,()=>{setTab(x.id);setVisible(24);},tab===x.id))}</View>
   {tab==='steps'&&<View style={{gap:11}}>
    <Text style={{fontSize:17,fontWeight:'900',color:ink}}>Nauka z rzeczywistymi przykładami</Text>
    <View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>{ref.walkthroughs.map(x=>action(x.name,()=>setGuideId(x.id),guideId===x.id))}</View>
    <View testID="autocad-tutorial" style={{padding:15,backgroundColor:'white',gap:12,borderRadius:12}}>
     <Text style={{fontSize:17,fontWeight:'900',color:ink}}>{guide.name}</Text>
     {guide.steps.map((s,i)=><Text key={i} style={{color:muted,lineHeight:24}}>{i+1}. {s}</Text>)}
     <Text style={{color:ink,fontWeight:'900'}}>Rezultat</Text><Text style={{color:muted,lineHeight:22}}>{guide.result}</Text>
     <Text style={{color:ink,fontWeight:'900'}}>Typowy błąd</Text><Text style={{color:muted,lineHeight:22}}>{guide.mistake}</Text>
     <Pressable accessibilityRole="link" onPress={()=>link(guide.docs)} style={{padding:10}}>
      <Text style={{color:'#2C587B',fontWeight:'900'}}>Instrukcja Autodesk ↗</Text>
     </Pressable>
    </View>
   </View>}
   {tab==='menu'&&<View style={{gap:12}}>
    <Text style={{fontSize:17,fontWeight:'900',color:ink}}>Mapa wstążki i menu AutoCAD</Text>
    <View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>{ref.tabs.map((x,i)=>action(x.name,()=>setMenu(i),i===menu))}</View>
    <View testID="autocad-menu-detail" style={{padding:15,backgroundColor:'white',borderRadius:11,gap:9}}>
     <Text style={{color:ink,fontWeight:'900'}}>{info.name}</Text>
     <Text style={{color:muted,lineHeight:22}}>{info.purpose}</Text>
     <Text style={{color:ink,fontWeight:'900'}}>Panele</Text><Text style={{color:muted,lineHeight:22}}>{info.panels}</Text>
     <Text style={{color:ink,fontWeight:'900'}}>Przykład</Text><Text style={{color:muted,lineHeight:22}}>{info.exercise}</Text>
    </View>
   </View>}
   {(tab==='commands'||tab==='aliases')&&<View style={{gap:12}}>
    <TextInput accessibilityLabel="Szukaj komendy AutoCAD" value={query} onChangeText={v=>{setQuery(v);setVisible(24);setDetails('');}}
     placeholder="Znajdź polecenie, alias albo temat" placeholderTextColor="#879988"
     style={{padding:13,minHeight:46,backgroundColor:'white',borderRadius:9,borderWidth:1,borderColor:'#DCE4ED',fontSize:15,color:ink}}/>
    {tab==='commands'&&<View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>{categories.map(x=>action(x,()=>{setCategory(x);setVisible(24);},category===x))}</View>}
    <Text style={{fontSize:13,fontWeight:'800',color:muted}}>Znaleziono: {tab==='commands'?found.length:aliases.length}</Text>
    {tab==='commands'?found.slice(0,visible).map(detailCard):aliases.slice(0,visible).map((x,i)=><View key={x.alias+'-'+x.command+'-'+i} style={{backgroundColor:'white',padding:12,borderRadius:9,gap:5}}>
      <Text style={{fontWeight:'900',fontSize:15,color:ink}}>{x.alias} → {x.command}</Text>
      <Text style={{lineHeight:22,color:muted}}>{x.explanationPL}</Text>
      {x.note&&<Text style={{color:'#84612b',fontSize:12,lineHeight:20}}>{x.note}</Text>}
      <Text style={{color:'#7c887e',fontSize:11,lineHeight:18}}>Oryginalna lista (EN): {x.sourceDescription}</Text>
     </View>)}
    {(tab==='commands'?found.length:aliases.length)>visible&&action('Pokaż kolejne '+Math.min(24,(tab==='commands'?found.length:aliases.length)-visible),()=>setVisible(x=>x+24))}
    <Pressable accessibilityRole="link" onPress={()=>link(ref.links.commands)} style={{padding:10}}>
     <Text style={{color:'#2C587B',fontWeight:'900'}}>Alfabetyczny indeks wszystkich poleceń Autodesk ↗</Text>
    </Pressable>
   </View>}
   {tab==='keys'&&<View style={{gap:10}}>
    <Text style={{fontSize:17,color:ink,fontWeight:'900'}}>Skróty klawiaturowe i funkcyjne</Text>
    <Text style={{fontSize:13,color:muted,lineHeight:21}}>Sprawdzaj przypisania z dokumentacją i plikami CUIx oraz PGP. Przesłana lista zawiera niektóre historyczne opisy; zaznaczyłem różnice z Autodesk 2026.</Text>
    <TextInput accessibilityLabel="Szukaj skrótu klawiaturowego" value={shortcutsQuery} onChangeText={setShortcutsQuery}
     placeholder="Ctrl+W, F3, OSNAP..." placeholderTextColor="#829282"
     style={{backgroundColor:'white',padding:13,borderRadius:9,borderWidth:1,borderColor:'#DCE4ED',color:ink}}/>
    {keys.map(x=><View key={x.keys} style={{flexDirection:'row',gap:12,padding:12,backgroundColor:'white',borderRadius:8}}>
     <Text style={{color:ink,fontWeight:'900',minWidth:112}}>{x.keys}</Text>
     <View style={{flex:1,gap:4}}><Text style={{color:muted,lineHeight:21}}>{x.purpose}</Text>
      {x.note&&<Text style={{color:'#826326',lineHeight:18,fontSize:12}}>{x.note}</Text>}
     </View>
    </View>)}
    <Pressable accessibilityRole="link" onPress={()=>link(supplement.autodeskDocs.keys)} style={{padding:10}}>
     <Text style={{fontWeight:'900',color:'#2C587B'}}>Autodesk 2026 — oficjalna tabela skrótów ↗</Text>
    </Pressable>
   </View>}
  </View>}
 </View>;
}
