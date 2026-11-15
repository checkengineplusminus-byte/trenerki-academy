import React,{useEffect,useState} from 'react';
import {View,Text,Pressable,ScrollView,TextInput,ImageBackground,useWindowDimensions} from 'react-native';
import ExplorerWorkspace from './ExplorerWorkspace';

type App='files'|'notes'|'settings'|'calculator';
type Position='normal'|'left'|'right'|'max';
type WindowState={app:App;position:Position;minimized:boolean};
type Desktop={id:number;name:string;windows:WindowState[];focused:App|null};
const labels:Record<App,string>={files:'Eksplorator plików',notes:'Notatnik',settings:'Ustawienia',calculator:'Kalkulator'};
const icons:Record<App,string>={files:'📁',notes:'📝',settings:'⚙️',calculator:'▦'};
const initial:Desktop[]=[
 {id:1,name:'Pulpit 1',windows:[{app:'files',position:'normal',minimized:false},{app:'notes',position:'right',minimized:false}],focused:'files'},
 {id:2,name:'Pulpit 2',windows:[],focused:null}
];
const supported=['Win+Ctrl+←','Win+Ctrl+→','Win+Ctrl+D','Win+Tab','Win+←','Win+→','Win+↑','Win+↓','Win+D','Alt+Tab','Win+E','Win+I'];
const instructions:Record<string,string>={
 'WIN+CTRL+←':'Utwórz dwa pulpity przez Win + Tab → Nowy pulpit. Przejdź na Pulpit 2. Przytrzymaj Windows oraz Ctrl i naciśnij strzałkę w lewo. Powinien pokazać się Pulpit 1.',
 'WIN+CTRL+→':'Utwórz dwa pulpity przez Win + Tab. Na Pulpicie 1 przytrzymaj Windows oraz Ctrl i naciśnij strzałkę w prawo. Zobaczysz Pulpit 2.',
 'WIN+CTRL+D':'Naciśnij Windows + Ctrl + D. System utworzy nowy wirtualny pulpit i przejdzie na niego.',
 'WIN+TAB':'Naciśnij Windows + Tab. Otworzy się Widok zadań z miniaturami okien i pulpitów. Wybierz pulpit myszą.',
 'WIN+←':'Otwórz Eksplorator przez Windows + E i kliknij jego okno. Naciśnij Windows + strzałka w lewo: aktywne okno zostanie przypięte do lewej części ekranu, ale pulpit się nie zmieni.',
 'WIN+→':'Otwórz okno, kliknij je i naciśnij Windows + strzałka w prawo. Okno zostanie przypięte do prawej strony ekranu.',
 'WIN+↑':'Wybierz okno i naciśnij Windows + strzałka w górę, aby je zmaksymalizować.',
 'WIN+↓':'Wybierz zmaksymalizowane okno. Windows + strzałka w dół przywróci jego rozmiar; kolejne naciśnięcie może je zminimalizować.',
 'WIN+D':'Otwórz okna i naciśnij Windows + D, aby pokazać pulpit. Naciśnij ponownie, żeby wrócić do okien.',
 'ALT+TAB':'Otwórz dwa okna. Przytrzymaj Alt, naciśnij Tab i wybierz okno. Nie zamyka to aplikacji.',
 'WIN+E':'Naciśnij Windows + E. Otworzy się Eksplorator plików.',
 'WIN+I':'Naciśnij Windows + I. Otworzą się Ustawienia.',
 'WIN+M':'Naciśnij Windows + M, aby zminimalizować wszystkie okna. Windows + Shift + M zwykle je przywraca.',
 'WIN+SHIFT+M':'Zminimalizuj okna kombinacją Windows + M, następnie naciśnij Windows + Shift + M, aby je przywrócić.',
 'ALT+F4':'Najpierw zapisz pracę. Kliknij okno programu, naciśnij Alt + F4 i obserwuj, czy program się zamyka lub prosi o zapis.',
 'WIN+S':'Naciśnij Windows + S, aby otworzyć wyszukiwanie systemu.',
 'WIN+CTRL+F4':'Na dodatkowym pulpicie naciśnij Windows + Ctrl + F4. Pulpit zostanie zamknięty, ale jego aplikacje nie zostaną zamknięte.',
 'WIN+V':'Naciśnij Windows + V. Jeśli historia schowka nie jest włączona, system może poprosić o jej aktywowanie.'
};
const clean=(value:string)=>value.toUpperCase().replace(/\s/g,'').replace(/ARROWLEFT/g,'←').replace(/ARROWRIGHT/g,'→').replace(/ARROWUP/g,'↑').replace(/ARROWDOWN/g,'↓');
const actionStyle={backgroundColor:'#fff',borderWidth:1,borderColor:'#cfdeec',borderRadius:11,paddingVertical:10,paddingHorizontal:12,minHeight:44,justifyContent:'center' as const};
const actionText={fontSize:13,fontWeight:'800' as const,color:'#234364'};
function KeyCombo({value}:{value:string}){
 return <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:4}}>
  {value.split('+').map((key,i)=><React.Fragment key={i}>{i>0&&<Text style={{color:'#73839b'}}>+</Text>}<Text style={{borderWidth:1,borderBottomWidth:3,borderColor:'#b9c7d7',borderRadius:7,paddingHorizontal:8,paddingVertical:5,color:'#244364',backgroundColor:'white',fontWeight:'900'}}>{key}</Text></React.Fragment>)}
 </View>;
}
function WinLogo(){return <Text style={{fontSize:21,fontWeight:'900',color:'#087cc5'}}>⊞</Text>;}
export default function WindowsDesktopLab({shortcut,runId}:{shortcut?:string;runId:number}){
 const {width}=useWindowDimensions();
 const compact=width<620;
 const [desktops,setDesktops]=useState<Desktop[]>(initial);
 const [index,setIndex]=useState(1);
 const [start,setStart]=useState(false),[taskView,setTaskView]=useState(false);
 const [showDesktop,setShowDesktop]=useState(false),[showExplorer,setShowExplorer]=useState(false);
 const [query,setQuery]=useState(''),[note,setNote]=useState('Plan dnia\n1. Porównaj oferty\n2. Uporządkuj pliki\n3. Przejdź na drugi pulpit');
 const [activeShortcut,setActiveShortcut]=useState('Win+Ctrl+←');
 const [status,setStatus]=useState('Jesteś na Pulpicie 2. Kliknij Win+Ctrl+←, aby przejść na Pulpit 1. Efekt dotyczy tylko symulacji.');
 const [showReal,setShowReal]=useState(false);
 const desktop=desktops[index]||desktops[0];
 const active=desktop?.focused;
 const visible=(desktop?.windows||[]).filter(w=>!w.minimized&&!showDesktop);
 function updateDesktop(modify:(d:Desktop)=>Desktop){
  setDesktops(old=>old.map((d,i)=>i===index?modify(d):d));
 }
 function openApp(app:App){
  updateDesktop(d=>({
   ...d,focused:app,windows:d.windows.some(w=>w.app===app)?
    d.windows.map(w=>w.app===app?{...w,minimized:false}:w):
    [...d.windows,{app,position:'normal',minimized:false}]
  }));
  setShowDesktop(false);setStart(false);setTaskView(false);setStatus('Otwarto '+labels[app]+' na '+desktop.name+'.');
 }
 function focus(app:App){
  updateDesktop(d=>({...d,focused:app,windows:d.windows.map(w=>w.app===app?{...w,minimized:false}:w)}));
 }
 function moveWindow(position:Position){
  if(!active){setStatus('Najpierw otwórz okno, np. Eksplorator plików.');return;}
  updateDesktop(d=>({...d,windows:d.windows.map(w=>w.app===active?{...w,position,minimized:false}:w)}));
  setShowDesktop(false);
  setStatus(position==='left'?'Aktywne okno przypięto do lewej połowy. Pulpit nie zmienił się.':position==='right'?'Aktywne okno przypięto do prawej połowy. Pulpit nie zmienił się.':'Zmieniono rozmiar aktywnego okna.');
 }
 function simulate(combo:string){
  const k=clean(combo);
  setActiveShortcut(combo);setShowReal(false);
  if(k==='WIN+CTRL+←'||k==='WIN+CTRL+→'){
   const next=index+(k.endsWith('←')?-1:1);
   if(next<0||next>=desktops.length){setStatus('Brak pulpitu w tym kierunku. Kliknij „+ Nowy pulpit” w Widoku zadań.');setTaskView(true);}
   else{setIndex(next);setShowDesktop(false);setStart(false);setTaskView(false);setStatus('Przełączono na '+desktops[next].name+'. To inny pulpit, nie przesunięcie okna.');}
   return;
  }
  switch(k){
   case 'WIN+CTRL+D':{
    const id=Math.max(...desktops.map(d=>d.id))+1;
    setDesktops(old=>[...old,{id,name:'Pulpit '+id,windows:[],focused:null}]);setIndex(desktops.length);
    setStart(false);setTaskView(false);setShowDesktop(false);setStatus('Utworzono Pulpit '+id+'. Aplikacje z poprzednich pulpitów pozostały otwarte.');break;
   }
   case 'WIN+TAB':setTaskView(v=>!v);setStart(false);setStatus('Widok zadań: wybierz pulpit albo utwórz następny.');break;
   case 'WIN+←':moveWindow('left');break;
   case 'WIN+→':moveWindow('right');break;
   case 'WIN+↑':moveWindow('max');break;
   case 'WIN+↓':moveWindow('normal');break;
   case 'WIN+D':setShowDesktop(v=>!v);setStart(false);setTaskView(false);setStatus(showDesktop?'Przywrócono okna.':'Pokazano pulpit, okna nadal są otwarte.');break;
   case 'WIN+M':updateDesktop(d=>({...d,windows:d.windows.map(w=>({...w,minimized:true}))}));setStatus('Wszystkie okna zminimalizowane — aplikacje nie zostały zamknięte.');break;
   case 'WIN+SHIFT+M':updateDesktop(d=>({...d,windows:d.windows.map(w=>({...w,minimized:false}))}));setShowDesktop(false);setStatus('Przywrócono zminimalizowane okna.');break;
   case 'ALT+TAB':{
    const options=desktop.windows.filter(w=>!w.minimized);
    if(!options.length){setStatus('Nie ma okna do przełączenia. Otwórz najpierw dwie aplikacje.');break;}
    const next=options[(options.findIndex(w=>w.app===active)+1)%options.length];
    focus(next.app);setStatus('Przełączono aktywne okno na '+labels[next.app]+'.');break;
   }
   case 'ALT+F4':
    if(!active){setStatus('Nie wybrano otwartego okna.');break;}
    updateDesktop(d=>({...d,windows:d.windows.filter(w=>w.app!==active),focused:d.windows.find(w=>w.app!==active)?.app||null}));
    setStatus('Zamknięto okno demonstracyjne: '+labels[active]+'.');break;
   case 'WIN+E':openApp('files');break;
   case 'WIN+I':openApp('settings');break;
   case 'WIN+S':setStart(true);setStatus('Otworzono wyszukiwanie w demonstracyjnym menu Start.');break;
   case 'WIN+CTRL+F4':
    if(desktops.length===1){setStatus('Nie można zamknąć ostatniego pulpitu.');break;}
    setDesktops(old=>old.filter((_,i)=>i!==index));
    setIndex(Math.max(0,index-1));setTaskView(false);setStatus('Zamknięto pulpit ćwiczebny; to nie zamyka aplikacji w Twoim Windows.');break;
   default:setStatus('Ten skrót nie jest modelowany w tej demonstracji. Użyj instrukcji „Sprawdź na swoim komputerze” poniżej.');
  }
 }
 useEffect(()=>{if(runId>0&&shortcut)simulate(shortcut);},[runId]);
 function createDesktop(){
  const id=Math.max(...desktops.map(d=>d.id))+1;
  setDesktops(old=>[...old,{id,name:'Pulpit '+id,windows:[],focused:null}]);
  setIndex(desktops.length);setShowDesktop(false);setTaskView(false);setStatus('Utworzono Pulpit '+id+'.');
 }
 function renderWindow(w:WindowState){
  const left=w.position==='right'?'51%':w.position==='normal'?'12%':'1%';
  const width=w.position==='max'?'98%':w.position==='normal'?'77%':'48%';
  const height=w.position==='normal'?'79%':'94%';
  return <View key={w.app} testID={'win11-window-'+w.app} style={{position:'absolute',left: left as any,top:w.position==='normal'?24:3,width:width as any,height:height as any,zIndex:w.app===active?5:3,backgroundColor:'#f8fbff',borderWidth:1,borderColor:w.app===active?'#74b6ef':'#b7ccde',borderRadius:9,overflow:'hidden',shadowColor:'#0a2751',shadowOpacity:.19,shadowRadius:13,elevation:3}}>
   <Pressable onPress={()=>focus(w.app)} style={{minHeight:31,flexDirection:'row',alignItems:'center',paddingHorizontal:9,gap:7,backgroundColor:'#eef3fb'}}>
    <Text style={{fontSize:12}}>{icons[w.app]}</Text><Text numberOfLines={1} style={{fontSize:11,color:'#263e59',fontWeight:'800',flex:1}}>{labels[w.app]}</Text>
    <Pressable accessibilityLabel={'Minimalizuj '+labels[w.app]} onPress={()=>updateDesktop(d=>({...d,windows:d.windows.map(p=>p.app===w.app?{...p,minimized:true}:p)}))} style={{paddingHorizontal:7,paddingVertical:4}}><Text style={{color:'#355577'}}>—</Text></Pressable>
    <Pressable accessibilityLabel={'Zamknij '+labels[w.app]} onPress={()=>updateDesktop(d=>({...d,windows:d.windows.filter(p=>p.app!==w.app),focused:d.focused===w.app?(d.windows.find(p=>p.app!==w.app)?.app||null):d.focused}))} style={{paddingHorizontal:7,paddingVertical:4}}><Text style={{color:'#a43343',fontWeight:'900'}}>×</Text></Pressable>
   </Pressable>
   {w.app==='files'?<View style={{flex:1,padding:compact?6:10,backgroundColor:'#fff'}}>
      <Text numberOfLines={1} style={{fontSize:compact?9:11,color:'#536d86',marginBottom:8}}>←  →  ↑     Strona główna › {desktop.name} › Dokumenty</Text>
      <Text style={{fontSize:compact?11:13,fontWeight:'800',color:'#284a6a',marginBottom:7}}>Szybki dostęp</Text>
      <Text style={{fontSize:compact?10:12,color:'#345775',marginVertical:5}}>📁 Dokumenty</Text>
      <Text style={{fontSize:compact?10:12,color:'#345775',marginVertical:5}}>📁 Pobrane</Text>
      <Text style={{fontSize:compact?10:12,color:'#345775',marginVertical:5}}>📁 Obrazy</Text>
      <Text style={{fontSize:compact?10:12,color:'#345775',marginVertical:5}}>📄 Oferta.docx</Text>
     </View>:w.app==='notes'?<TextInput multiline accessibilityLabel="Notatnik — pole ćwiczebne" value={note} onChangeText={setNote} style={{flex:1,padding:9,textAlignVertical:'top',fontSize:compact?10:12,color:'#294359',backgroundColor:'#fff'}}/>:
     w.app==='settings'?<View style={{padding:10,gap:9}}><Text style={{fontWeight:'800',color:'#31577a',fontSize:12}}>System</Text><Text style={{color:'#456783',fontSize:11}}>Ekran • Dźwięk • Powiadomienia</Text><Text style={{color:'#456783',fontSize:11}}>Personalizacja • Konta</Text></View>:
     <View style={{padding:10}}><Text style={{fontSize:17,fontWeight:'800',textAlign:'right',color:'#31577a'}}>24 + 18 = 42</Text></View>}
  </View>;
 }
 return <View testID="windows-desktop-lab" style={{borderWidth:1,borderColor:'#c7d7e9',borderRadius:18,backgroundColor:'#eef5fc',padding:compact?10:17,gap:13,marginVertical:12}}>
  <Text style={{fontSize:19,fontWeight:'900',color:'#143e6c'}}>Windows 11 — interaktywny pulpit ćwiczebny</Text>
  <Text style={{fontSize:13,lineHeight:20,color:'#3d6080'}}>To demonstracja wewnątrz Trenerki, a nie zdalne sterowanie Twoim komputerem. Możesz tu bezpiecznie klikać w Start, okna i wirtualne pulpity.</Text>
  <View style={{borderWidth:1,borderColor:'#abc0d9',borderRadius:14,overflow:'hidden',backgroundColor:'#d3e8fa'}}>
   <ImageBackground source={{uri:'/academy/assets/windows-bloom.svg'}} resizeMode="stretch" style={{height:compact?305:395,width:'100%',justifyContent:'flex-end'}} imageStyle={{backgroundColor:'#bdddf5'}}>
    <View style={{flex:1,flexDirection:'row',paddingTop:9}}>
     <View style={{width:compact?59:86,gap:13,paddingLeft:7}}>
      {(['files','notes'] as App[]).map(a=><Pressable key={a} onPress={()=>openApp(a)} accessibilityRole="button" accessibilityLabel={'Otwórz '+labels[a]} style={{alignItems:'center',minHeight:48}}>
       <Text style={{fontSize:compact?22:27}}>{icons[a]}</Text><Text style={{color:'#103b64',fontSize:compact?8:10,textAlign:'center',fontWeight:'700'}}>{labels[a]}</Text>
      </Pressable>)}
      <Pressable onPress={()=>setShowExplorer(true)} accessibilityRole="button" accessibilityLabel="Otwórz ćwiczenie folderów"><Text style={{fontSize:compact?22:26,textAlign:'center'}}>🗑️</Text><Text style={{fontSize:compact?9:10,color:'#103b64',textAlign:'center',fontWeight:'700'}}>Kosz</Text></Pressable>
     </View>
     <View style={{flex:1,marginRight:6,marginBottom:6}}>
      {visible.map(renderWindow)}
      {taskView&&<View testID="windows-task-view" style={{position:'absolute',top:8,left:3,right:4,bottom:9,backgroundColor:'rgba(244,249,255,0.95)',borderRadius:12,padding:12,zIndex:20,gap:10}}>
       <Text style={{fontWeight:'900',fontSize:compact?12:15,color:'#224a71'}}>Widok zadań — wybierz pulpit</Text>
       <ScrollView horizontal contentContainerStyle={{gap:9}}>
       {desktops.map((d,i)=><Pressable key={d.id} accessibilityRole="button" accessibilityLabel={'Przejdź na '+d.name} onPress={()=>{setIndex(i);setTaskView(false);setShowDesktop(false);setStatus('Wybrano '+d.name+' w Widoku zadań.');}} style={{width:compact?86:120,height:80,borderRadius:10,borderWidth:i===index?2:1,borderColor:i===index?'#147dcc':'#c1d1e0',backgroundColor:i===index?'#d9eeff':'white',padding:8}}>
        <Text style={{fontSize:compact?10:12,fontWeight:'800',color:'#225b86'}}>{d.name}</Text><Text style={{fontSize:10,color:'#486b85',marginTop:6}}>{d.windows.length} okna</Text>
       </Pressable>)}
       <Pressable onPress={createDesktop} accessibilityRole="button" accessibilityLabel="Utwórz nowy pulpit" style={{width:compact?82:110,height:80,borderWidth:1,borderColor:'#b0c5d7',borderStyle:'dashed',borderRadius:10,backgroundColor:'#fff',justifyContent:'center',alignItems:'center'}}><Text style={{color:'#235a83',fontWeight:'800',fontSize:compact?10:12}}>＋ Nowy pulpit</Text></Pressable>
       </ScrollView>
      </View>}
     </View>
    </View>
    {start&&<View testID="windows-start-menu" style={{position:'absolute',bottom:compact?43:51,alignSelf:'center',width:compact?'84%':'60%',maxWidth:400,maxHeight:250,borderRadius:15,backgroundColor:'rgba(251,253,255,0.97)',borderWidth:1,borderColor:'#d5e2ef',padding:13,zIndex:30,gap:9}}>
      <TextInput accessibilityLabel="Wyszukaj aplikację w menu Start" value={query} onChangeText={setQuery} placeholder="Wyszukaj aplikacje, ustawienia…" style={{backgroundColor:'#eff4fa',borderWidth:1,borderColor:'#ccdeed',padding:8,borderRadius:9,color:'#284868',fontSize:12}}/>
      <Text style={{fontWeight:'800',fontSize:12,color:'#244b70'}}>Przypięte aplikacje</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:9}}>{(['files','notes','settings','calculator'] as App[]).filter(a=>labels[a].toLocaleLowerCase('pl').includes(query.toLocaleLowerCase('pl'))).map(a=><Pressable key={a} onPress={()=>openApp(a)} accessibilityLabel={'Uruchom '+labels[a]} style={{width:compact?65:75,alignItems:'center',gap:2}}><Text style={{fontSize:23}}>{icons[a]}</Text><Text numberOfLines={2} style={{fontSize:9,color:'#28496b',textAlign:'center'}}>{labels[a]}</Text></Pressable>)}</View>
    </View>}
    <View style={{height:compact?42:50,backgroundColor:'rgba(237,245,254,0.94)',borderTopWidth:1,borderColor:'#b9d4e9',flexDirection:'row',alignItems:'center',justifyContent:'center',gap:compact?12:22,paddingHorizontal:8}}>
      <Pressable onPress={()=>{setStart(v=>!v);setTaskView(false);}} accessibilityRole="button" accessibilityLabel="Otwórz menu Start"><WinLogo/></Pressable>
      <Pressable onPress={()=>{setTaskView(v=>!v);setStart(false);}} accessibilityRole="button" accessibilityLabel="Otwórz widok zadań"><Text style={{color:'#246ba3',fontSize:23}}>▣</Text></Pressable>
      <Pressable onPress={()=>openApp('files')} accessibilityRole="button" accessibilityLabel="Eksplorator na pasku zadań"><Text style={{fontSize:22}}>📁</Text></Pressable>
      <Pressable onPress={()=>openApp('notes')} accessibilityRole="button" accessibilityLabel="Notatnik na pasku zadań"><Text style={{fontSize:22}}>📝</Text></Pressable>
      <Text style={{fontSize:compact?9:11,color:'#325578',marginLeft:'auto',fontWeight:'700'}}>◉  Wi-Fi{'\n'}12:00</Text>
    </View>
   </ImageBackground>
  </View>
  <View accessibilityLiveRegion="polite" style={{backgroundColor:'#fff',borderLeftWidth:4,borderColor:'#3289bf',borderRadius:10,padding:12,gap:5}}>
   <Text style={{fontWeight:'900',color:'#16476d'}}>Efekt symulacji · {desktop.name}</Text>
   <Text style={{fontSize:13,lineHeight:20,color:'#345a76'}}>{status}</Text>
  </View>
  <Text style={{fontSize:15,fontWeight:'900',color:'#204765'}}>Wybierz skrót i zobacz, co się zmienia</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
   {supported.map(combo=><Pressable key={combo} testID={'simulate-'+clean(combo)} accessibilityRole="button" accessibilityLabel={'Symuluj '+combo} onPress={()=>simulate(combo)} style={[actionStyle,{backgroundColor:clean(activeShortcut)===clean(combo)?'#d5e9ff':'white',borderColor:clean(activeShortcut)===clean(combo)?'#54a2da':'#cfdeec'}]}>
    <Text style={actionText}>{combo}</Text>
   </Pressable>)}
  </View>
  <View style={{backgroundColor:'#fff',borderWidth:1,borderColor:'#cbddec',borderRadius:13,padding:13,gap:10}}>
   <Text style={{fontWeight:'900',color:'#1d476e',fontSize:15}}>Dwa sposoby nauki — oba dostępne</Text>
   <Pressable onPress={()=>simulate(activeShortcut)} accessibilityRole="button" style={[actionStyle,{backgroundColor:'#e6f2ff'}]}><Text style={actionText}>① Zasymuluj {activeShortcut} w Trenerki</Text></Pressable>
   <Pressable onPress={()=>setShowReal(v=>!v)} accessibilityRole="button" accessibilityState={{expanded:showReal}} style={[actionStyle,{backgroundColor:'#e8f6e9',borderColor:'#b6dac0'}]}><Text style={{...actionText,color:'#255d3c'}}>② Sprawdź {activeShortcut} na swoim komputerze {showReal?'▴':'▾'}</Text></Pressable>
   {showReal&&<View style={{padding:12,borderRadius:9,backgroundColor:'#f3faf4',gap:8}}>
    <KeyCombo value={activeShortcut}/>
    <Text style={{fontSize:13,lineHeight:21,color:'#254d38'}}>{instructions[clean(activeShortcut)]||'Wróć do opisu skrótu w lekcji. Wykonaj go w swoim Windows na próbnym pliku lub pustym oknie. Nie wykonuj nieznanych poleceń ani operacji na ważnych danych.'}</Text>
    <Text style={{fontSize:12,lineHeight:19,color:'#496a54'}}>Uwaga: naciśnięcie klawiszy na prawdziwym komputerze zadziała w Windows, a nie w tej stronie. Trenerki nie wykrywa wyniku. W przypadku skrótów pulpitu sprawdź, czy masz utworzone co najmniej dwa pulpity.</Text>
   </View>}
  </View>
  <Pressable accessibilityRole="button" accessibilityState={{expanded:showExplorer}} onPress={()=>setShowExplorer(v=>!v)} style={[actionStyle,{backgroundColor:'#f9fcff'}]}><Text style={actionText}>{showExplorer?'Ukryj ćwiczenia plików ▴':'Otwórz dodatkową pracownię Eksploratora plików ▾'}</Text></Pressable>
  {showExplorer&&<ExplorerWorkspace shortcut={shortcut} runId={runId}/>}
  <Text style={{fontSize:11,lineHeight:17,color:'#5b748e'}}>Autorska symulacja Windows 11, nie oryginalny system ani zrzut ekranu. Rzeczywisty wygląd może zależeć od wersji Windows i personalizacji. Skrótów systemowych celowo nie przechwytujemy w przeglądarce.</Text>
 </View>;
}