import React,{useMemo,useState} from 'react';
import {Linking,Pressable,Text,TextInput,View} from 'react-native';
import reference from '../content/autocad-reference-2026.json';

type Tab='steps'|'menu'|'commands'|'keys';
const ink='#183e2b',muted='#4d6754';
const tabs:({id:Tab;label:string})[]=[
 {id:'steps',label:'Ćwicz krok po kroku'},
 {id:'menu',label:'Całe menu'},
 {id:'commands',label:'Polecenia'},
 {id:'keys',label:'Skróty'},
];
export default function AutoCADReferenceGuide(){
 const [open,setOpen]=useState(false),[tab,setTab]=useState<Tab>('steps');
 const [guideId,setGuideId]=useState('select'),[menu,setMenu]=useState(0);
 const [query,setQuery]=useState(''),[category,setCategory]=useState('Wszystkie'),[visible,setVisible]=useState(24);
 const categories=useMemo(()=>['Wszystkie',...new Set(reference.commands.map(cmd=>cmd.category))],[]);
 const found=useMemo(()=>{
  const q=query.trim().toLocaleLowerCase('pl');
  return reference.commands.filter(cmd=>(category==='Wszystkie'||category===cmd.category)&&
   (!q||[cmd.command,cmd.alias,cmd.label,cmd.purpose,cmd.category].some(value=>value.toLocaleLowerCase('pl').includes(q))));
 },[category,query]);
 const guide=reference.walkthroughs.find(item=>item.id===guideId)||reference.walkthroughs[0];
 const info=reference.tabs[menu];
 const external=(url:string)=>void Linking.openURL(url);
 const button=(label:string,onPress:()=>void,active=false)=><Pressable key={label} accessibilityRole="button" accessibilityState={{selected:active}} onPress={onPress}
  style={{paddingHorizontal:12,paddingVertical:10,minHeight:42,justifyContent:'center',borderRadius:10,backgroundColor:active?ink:'#e8f2e5',borderWidth:1,borderColor:active?ink:'#d0dfcc'}}>
  <Text style={{fontSize:13,fontWeight:'800',color:active?'white':ink}}>{label}</Text>
 </Pressable>;
 return <View testID="autocad-reference-guide" style={{borderColor:'#c8dcc6',borderWidth:1,borderRadius:15,backgroundColor:'#f5f9f2',marginVertical:12,overflow:'hidden'}}>
  <Pressable accessibilityRole="button" accessibilityState={{expanded:open}} onPress={()=>setOpen(v=>!v)}
   style={{padding:17,gap:6,backgroundColor:'#e9f4e5'}}>
   <Text style={{fontSize:17,fontWeight:'900',color:ink}}>{open?'Zwiń bibliotekę AutoCAD ↑':'Biblioteka AutoCAD: menu, skala, czcionki, OSNAP, skróty ↓'}</Text>
   <Text style={{fontSize:12,lineHeight:19,color:muted}}>180 wpisów z 12 obszarów programu, 40 skrótów klawiaturowych i 8 prowadzonych ćwiczeń. Dostępne z każdej lekcji bez powtarzania całych opisów.</Text>
  </Pressable>
  {open&&<View style={{padding:15,gap:14}}>
   <Text style={{fontSize:12,lineHeight:19,color:muted}}>Opracowanie edukacyjne na podstawie Autodesk AutoCAD 2026 na komputer. To nie jest sam program Autodesk: tylko wpisy oznaczone „Działa w pracowni” są ćwiczone w naszym warsztacie. Pełna dokumentacja obejmuje dodatkowe funkcje i wersje.</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
    {tabs.map(entry=>button(entry.label,()=>setTab(entry.id),entry.id===tab))}
   </View>
   {tab==='steps'&&<View style={{gap:13}}>
    <Text style={{fontSize:17,fontWeight:'900',color:ink}}>Prawdziwa kolejność pracy w AutoCAD</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
     {reference.walkthroughs.map(entry=>button(entry.name,()=>setGuideId(entry.id),entry.id===guide.id))}
    </View>
    <View testID="autocad-tutorial" style={{padding:15,backgroundColor:'white',borderRadius:12,gap:13}}>
     <Text style={{fontSize:18,color:ink,fontWeight:'900'}}>{guide.name}</Text>
     {guide.steps.map((step,i)=><View key={i} style={{flexDirection:'row',gap:11}}>
      <View style={{width:28,height:28,borderRadius:9,backgroundColor:'#d5e7cf',alignItems:'center',justifyContent:'center'}}>
       <Text style={{color:ink,fontWeight:'900'}}>{i+1}</Text>
      </View>
      <Text style={{flex:1,fontSize:14,lineHeight:23,color:'#355343'}}>{step}</Text>
     </View>)}
     <Text style={{fontWeight:'900',color:'#315d40'}}>Oczekiwany wynik</Text>
     <Text style={{color:muted,lineHeight:22}}>{guide.result}</Text>
     <Text style={{fontWeight:'900',color:'#7a622c'}}>Typowa pomyłka</Text>
     <Text style={{color:'#6a5531',lineHeight:22}}>{guide.mistake}</Text>
     <Pressable accessibilityRole="link" onPress={()=>external(guide.docs)} style={{padding:10,alignSelf:'flex-start'}}>
      <Text style={{color:'#216b45',fontWeight:'900'}}>Sprawdź instrukcję Autodesk ↗</Text>
     </Pressable>
    </View>
   </View>}
   {tab==='menu'&&<View style={{gap:13}}>
    <Text style={{fontSize:17,fontWeight:'900',color:ink}}>Mapa wstążki, paneli i pasków</Text>
    <Text style={{fontSize:13,lineHeight:22,color:muted}}>Układ kart różni się między środowiskami roboczymi, AutoCAD i AutoCAD LT. Kliknij kartę, aby zobaczyć jej sekcje i przykład działania.</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
     {reference.tabs.map((entry,i)=>button(entry.name,()=>setMenu(i),menu===i))}
    </View>
    <View testID="autocad-menu-detail" style={{backgroundColor:'white',padding:16,borderRadius:12,gap:10}}>
     <Text style={{fontSize:18,fontWeight:'900',color:ink}}>{info.name}</Text>
     <Text style={{fontSize:14,lineHeight:23,color:muted}}>{info.purpose}</Text>
     <Text style={{fontWeight:'900',color:ink}}>Panele / elementy</Text>
     <Text style={{color:muted,lineHeight:23}}>{info.panels}</Text>
     <Text style={{fontWeight:'900',color:ink}}>Przykład ćwiczenia</Text>
     <Text style={{color:muted,lineHeight:23}}>{info.exercise}</Text>
    </View>
   </View>}
   {tab==='commands'&&<View style={{gap:13}}>
    <Text style={{fontSize:17,fontWeight:'900',color:ink}}>Alfabetyczny katalog funkcji i poleceń</Text>
    <Text style={{fontSize:13,lineHeight:21,color:muted}}>Polecenia są pogrupowane według zastosowania. Aliasy mogą się różnić, jeśli ktoś zmienił acad.pgp. Znajdziesz tu również funkcje niedostępne w naszej pracowni.</Text>
    <TextInput accessibilityLabel="Szukaj komendy AutoCAD" value={query} onChangeText={v=>{setQuery(v);setVisible(24);}}
     placeholder="Szukaj, np. MTEXT, skala, warstwy, J, wymiar" placeholderTextColor="#789080"
     style={{backgroundColor:'white',borderWidth:1,borderColor:'#bfd3bb',padding:13,borderRadius:10,fontSize:15,color:ink}}/>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
     {categories.map(entry=>button(entry,()=>{setCategory(entry);setVisible(24);},category===entry))}
    </View>
    <Text style={{color:muted,fontWeight:'800'}}>Znaleziono: {found.length} / {reference.commands.length}</Text>
    {found.slice(0,visible).map(cmd=><View key={cmd.command} style={{backgroundColor:'white',padding:12,borderRadius:10,gap:4}}>
     <Text style={{color:ink,fontWeight:'900',fontSize:14}}>{cmd.command}{cmd.alias?' · '+cmd.alias:''} — {cmd.label}</Text>
     <Text style={{fontSize:13,lineHeight:20,color:muted}}>{cmd.purpose}</Text>
     <Text style={{fontSize:11,color:cmd.lab?'#326f48':'#68776b',fontWeight:'800'}}>{cmd.lab?'Działa w pracowni TRENERKI':'Ćwicz w oryginalnym AutoCAD'}</Text>
    </View>)}
    {found.length>visible&&button('Pokaż kolejne '+Math.min(24,found.length-visible),()=>setVisible(n=>n+24))}
    <Pressable accessibilityRole="link" onPress={()=>external(reference.links.commands)} style={{padding:11}}>
     <Text style={{color:'#216b45',fontWeight:'900'}}>Pełna dokumentacja poleceń Autodesk AutoCAD 2026 ↗</Text>
    </Pressable>
   </View>}
   {tab==='keys'&&<View style={{gap:12}}>
    <Text style={{fontSize:17,fontWeight:'900',color:ink}}>Skróty klawiaturowe i klawisze funkcyjne</Text>
    <Text style={{fontSize:13,color:muted,lineHeight:22}}>Skrót klawiaturowy (Ctrl+1) i alias wpisywany w wierszu (L, M, SC) to nie to samo. W AutoCAD można zmienić przypisania w CUI/CUIx, a aliasy w acad.pgp.</Text>
    {reference.shortcuts.map(entry=><View key={entry.keys} style={{flexDirection:'row',gap:11,padding:10,backgroundColor:'white',borderRadius:8}}>
     <Text style={{fontSize:13,color:ink,fontWeight:'900',minWidth:115}}>{entry.keys}</Text>
     <Text style={{fontSize:13,color:muted,lineHeight:20,flex:1}}>{entry.purpose}</Text>
    </View>)}
    <Pressable accessibilityRole="link" onPress={()=>external(reference.links.keys)} style={{padding:12}}>
     <Text style={{color:'#216b45',fontWeight:'900'}}>Pełny spis domyślnych klawiszy Autodesk ↗</Text>
    </Pressable>
    <Pressable accessibilityRole="link" onPress={()=>external(reference.links.aliases)} style={{padding:12}}>
     <Text style={{color:'#216b45',fontWeight:'900'}}>Instrukcja aliasów acad.pgp i dostosowywania skrótów ↗</Text>
    </Pressable>
   </View>}
  </View>}
 </View>;
}
