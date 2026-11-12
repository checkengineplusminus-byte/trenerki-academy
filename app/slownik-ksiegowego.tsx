import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Linking,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import {Link,useLocalSearchParams,useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
// @ts-ignore — funkcje testowane oddzielnie, bez dodatkowych zależności.
import {TERM_LABELS,validKey,safeSourceURL,speechText,speechChunks,checkPractice} from '../src/accounting/glossary-core.js';

type Entry={reference_key:string;title_pl:string;summary:string;term?:string;full_name?:string;editorial_status:string;legal_as_of:string;total_count?:number;material?:any};
const pageSize=12;
export default function AccountingGlossary(){
 const params=useLocalSearchParams<{entry?:string;term?:string}>(),router=useRouter();
 const entryKey=typeof params.entry==='string'?params.entry:'';
 const [userId,setUserId]=useState(''),[query,setQuery]=useState(typeof params.term==='string'?params.term:''),[applied,setApplied]=useState(typeof params.term==='string'?params.term:''),[offset,setOffset]=useState(0);
 const [items,setItems]=useState<Entry[]>([]),[total,setTotal]=useState(0),[detail,setDetail]=useState<Entry|null>(null),[saved,setSaved]=useState<Set<string>>(new Set());
 const [loading,setLoading]=useState(true),[opening,setOpening]=useState(false),[error,setError]=useState(''),[detailError,setDetailError]=useState(''),[notice,setNotice]=useState(''),[toggling,setToggling]=useState(false),[choice,setChoice]=useState<number|null>(null);
 const [voice,setVoice]=useState<SpeechSynthesisVoice|null>(null),[speaking,setSpeaking]=useState(false),[audioNotice,setAudioNotice]=useState('');
 const audioId=useRef(0),scroll=useRef<React.ComponentRef<typeof ScrollView>>(null),favoriteBusy=useRef(false),mounted=useRef(true);
 const stopAudio=()=>{audioId.current++;if(Platform.OS==='web'&&typeof window!=='undefined'&&window.speechSynthesis)window.speechSynthesis.cancel();setSpeaking(false);};
 useEffect(()=>{mounted.current=true;let active=true;void (async()=>{
  try{const {data:{user},error:e}=await supabase.auth.getUser();if(e||!user){router.replace('/konto');return;}if(!active)return;setUserId(user.id);
   const r=await supabase.from('ta_accounting_reference_saves').select('reference_key').eq('user_id',user.id).limit(1000);
   if(active&&!r.error)setSaved(new Set((r.data||[]).map(x=>x.reference_key)));else if(active&&r.error)setNotice('Nie udało się odczytać ulubionych. Treść słownika można nadal przeglądać.');
  }catch{if(active){setError('Nie udało się sprawdzić konta. Odśwież stronę.');setLoading(false);}}
 })();return()=>{active=false;mounted.current=false;audioId.current++;if(Platform.OS==='web'&&typeof window!=='undefined'&&window.speechSynthesis)window.speechSynthesis.cancel();};},[]);
 useEffect(()=>{if(!userId)return;let active=true;setLoading(true);setError('');
  void supabase.rpc('ta_accounting_glossary_search',{query_text:applied.trim(),page_size:pageSize,page_offset:offset}).then(({data,error:e})=>{
   if(!active)return;if(e){setItems([]);setTotal(0);setError(e.code==='42501'?'Słownik wymaga aktywnego dostępu do encyklopedii. Właściciel ma dostęp do podglądu.':'Nie udało się pobrać wyników. Spróbuj ponownie.');}
   else{const rows=(data||[]) as Entry[];setItems(rows);setTotal(Number(rows[0]?.total_count||0));}
  }).catch(()=>{if(active)setError('Błąd połączenia podczas wyszukiwania.');}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false};
 },[userId,applied,offset]);
 useEffect(()=>{let active=true;stopAudio();setDetail(null);setChoice(null);setDetailError('');setAudioNotice('');
  if(!entryKey){setOpening(false);return;}
  if(!validKey(entryKey)){setOpening(false);setDetailError('Nieprawidłowy identyfikator hasła. Wybierz wynik z listy.');return;}
  if(!userId)return;
  setOpening(true);
  void supabase.from('ta_accounting_reference').select('reference_key,title_pl,summary,material,editorial_status,legal_as_of').eq('reference_key',entryKey).eq('resource_type','glossary').maybeSingle().then(({data,error:e})=>{
   if(!active)return;if(e||!data)setDetailError('To hasło nie jest obecnie dostępne na Twoim koncie. Sprawdź dostęp lub wybierz inne hasło.');else{setDetail(data);scroll.current?.scrollTo({y:0,animated:false});}
  }).catch(()=>{if(active)setDetailError('Nie udało się otworzyć hasła. Spróbuj ponownie.');}).finally(()=>{if(active)setOpening(false);});
  return()=>{active=false};
 },[entryKey,userId]);
 useEffect(()=>{
  if(Platform.OS!=='web'||typeof window==='undefined'||!window.speechSynthesis)return;
  const engine=window.speechSynthesis,refresh=()=>{const voices=engine.getVoices().filter(v=>/^pl(?:-|_)/i.test(v.lang)||v.lang.toLowerCase()==='pl');setVoice(voices.find(v=>v.localService)||voices[0]||null);};
  refresh();engine.addEventListener('voiceschanged',refresh);return()=>engine.removeEventListener('voiceschanged',refresh);
 },[]);
 function search(){stopAudio();router.setParams({entry:''});setOffset(0);setApplied(query.trim());}
 function openEntry(key:string){stopAudio();setNotice('');router.setParams({entry:key});}
 function speak(){
  if(!detail||!voice||Platform.OS!=='web'||typeof window==='undefined')return;
  stopAudio();const run=++audioId.current,chunks=speechChunks(speechText(detail));let index=0;setAudioNotice('');setSpeaking(true);
  const next=()=>{if(run!==audioId.current||!mounted.current)return;if(index>=chunks.length){setSpeaking(false);return;}
   const utterance=new SpeechSynthesisUtterance(chunks[index++]);utterance.voice=voice;utterance.lang='pl-PL';utterance.rate=.95;
   utterance.onend=next;utterance.onerror=()=>{if(run===audioId.current&&mounted.current){setSpeaking(false);setAudioNotice('Odsłuch został przerwany przez przeglądarkę. Tekst pozostaje dostępny.');}};
   window.speechSynthesis.speak(utterance);
  };next();
 }
 async function toggleSaved(){
  if(!detail||!userId||favoriteBusy.current)return;favoriteBusy.current=true;setToggling(true);setNotice('');const key=detail.reference_key,exists=saved.has(key);
  try{const r=exists?await supabase.from('ta_accounting_reference_saves').delete().eq('user_id',userId).eq('reference_key',key):await supabase.from('ta_accounting_reference_saves').insert({user_id:userId,reference_key:key});if(r.error)throw r.error;
   if(mounted.current){setSaved(old=>{const result=new Set(old);exists?result.delete(key):result.add(key);return result;});setNotice(exists?'Usunięto hasło z ulubionych.':'Hasło zapisano w ulubionych na Twoim koncie.');}
  }catch{if(mounted.current)setNotice('Nie udało się zapisać zmiany ulubionych. Spróbuj ponownie.');}finally{favoriteBusy.current=false;if(mounted.current)setToggling(false);}
 }
 const g=detail?.material?.glossary,practice=g?.exercise,feedback=choice===null?null:checkPractice(practice,choice);
 const cardText=(heading:string,text:string)=>text?<View style={s.card}><Text accessibilityRole="header" style={s.h2}>{heading}</Text><Text style={s.body}>{text}</Text></View>:null;
 return <ScrollView ref={scroll} style={s.page} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled"><View style={s.wrap}>
  <View style={s.row}><Link href="/biuro-ksiegowe" style={s.link}>← Wróć do biura ćwiczeniowego</Link><Link href="/moje-kursy" style={s.link}>Moje kursy</Link></View>
  <View style={s.hero}><Text style={s.eyebrow}>BIBLIOTEKA KSIĘGOWEGO · SŁOWNIK OD PODSTAW</Text><Text accessibilityRole="header" style={s.h1}>Rozumiesz każde pojęcie.</Text><Text style={s.heroText}>Pełna nazwa, znaczenie, pochodzenie i sytuacja z pracy. Nie musisz znać skrótu, żeby zacząć.</Text></View>
  <View style={s.card}><Text style={s.label}>Wyszukaj skrót albo pytanie</Text><View style={s.row}><TextInput value={query} onChangeText={setQuery} onSubmitEditing={search} maxLength={120} placeholder="Np. NIP, rejestr sądowy, numer faktury" accessibilityLabel="Szukaj pojęcia księgowego" style={s.input}/><Pressable onPress={search} accessibilityRole="button" style={s.primary}><Text style={s.white}>Szukaj</Text></Pressable></View><Text style={s.small}>Wyszukiwarka pomija różnice między polskimi znakami a ich zwykłym zapisem. Wyniki są dzielone na strony po 12 haseł.</Text></View>
  {!!notice&&<Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}
  {opening&&<ActivityIndicator accessibilityLabel="Otwieranie hasła" color="#183c2b"/>}
  {!!detailError&&<Text accessibilityRole="alert" style={s.error}>{detailError}</Text>}
  {detail&&g?<View>
   <View style={s.card}><View style={s.row}><Pressable onPress={()=>router.setParams({entry:''})} accessibilityRole="button"><Text style={s.link}>← Lista haseł</Text></Pressable><Text style={s.small}>Sprawdzono źródła: {detail.legal_as_of||'data nieustalona'}</Text></View><Text accessibilityRole="header" style={s.term}>{g.term}</Text><Text style={s.h2}>{g.full_name}</Text><Text style={s.body}>{detail.material.intro||detail.summary}</Text>
    {detail.editorial_status!=='approved'&&<Text style={s.notice}>Podgląd właściciela — materiał roboczy, niepublikowany dla kursantów.</Text>}
    <View style={s.row}><Pressable onPress={toggleSaved} disabled={toggling} accessibilityRole="button" style={s.secondary}><Text style={s.link}>{saved.has(detail.reference_key)?'Usuń z ulubionych':'Zapisz w ulubionych'}</Text></Pressable>
     <Pressable onPress={speaking?stopAudio:speak} disabled={!voice} accessibilityRole="button" style={[s.secondary,!voice&&s.disabled]}><Text style={s.link}>{speaking?'Zatrzymaj odsłuch':'Odsłuchaj objaśnienie'}</Text></Pressable></View>
    <Text style={s.small}>{voice?'Odsłuch korzysta z polskiego głosu dostępnego na urządzeniu. Nie jest nagraniem lektora.':'Nie wykryto polskiego głosu do odsłuchu. Tekst jest dostępny; głos zależy od przeglądarki i ustawień urządzenia.'}</Text>{!!audioNotice&&<Text style={s.notice}>{audioNotice}</Text>}
   </View>
   {cardText('Co to znaczy — prostymi słowami',g.plain)}
   {cardText('Skąd się wzięło i po co istnieje?',g.origin)}
   {cardText('Kto prowadzi rejestr lub nadaje numer?',g.owner)}
   {cardText('Gdzie spotkasz to w swojej pracy?',g.where)}
   {(g.examples||[]).map((example:any,index:number)=><View key={index} style={s.card}><Text style={s.eyebrowDark}>PRZYKŁAD {index+1} · TWOJA PRACA W BIURZE</Text><Text accessibilityRole="header" style={s.h2}>{example.situation}</Text><Text style={s.body}>{example.explanation}</Text></View>)}
   {(detail.material.tables||[]).map((table:any,index:number)=><View key={index} style={s.card}><Text accessibilityRole="header" style={s.h2}>{table.title}</Text><ScrollView horizontal><View><View style={s.tableRow}>{(table.columns||[]).map((column:string,n:number)=><Text key={n} style={[s.cell,s.tableHead]}>{column}</Text>)}</View>{(table.rows||[]).map((row:string[],r:number)=><View key={r} style={s.tableRow}>{row.map((cell:string,c:number)=><Text key={c} style={s.cell}>{cell}</Text>)}</View>)}</View></ScrollView></View>)}
   {(detail.material.checklist||[]).length>0&&<View style={s.card}><Text accessibilityRole="header" style={s.h2}>Lista kontrolna</Text>{detail.material.checklist.map((text:string,n:number)=><Text key={n} style={s.body}>{n+1}. {text}</Text>)}</View>}
   {(detail.material.warnings||[]).length>0&&<View style={s.warning}><Text accessibilityRole="header" style={s.h2}>Czego to nie potwierdza?</Text>{detail.material.warnings.map((text:string,n:number)=><Text key={n} style={s.body}>{text}</Text>)}</View>}
   {practice&&<View style={s.card}><Text accessibilityRole="header" style={s.h2}>Sprawdź, czy rozumiesz</Text><Text style={s.body}>{practice.prompt}</Text>{(practice.choices||[]).map((text:string,n:number)=><Pressable key={n} onPress={()=>setChoice(n)} accessibilityRole="radio" accessibilityState={{checked:choice===n}} style={[s.answer,choice===n&&s.selected]}><Text style={s.body}>{text}</Text></Pressable>)}{feedback&&<View accessibilityLiveRegion="polite" style={s.notice}><Text style={s.h2}>{feedback.correct?'Tak — właściwe rozróżnienie.':'Spójrz jeszcze na wyjaśnienie.'}</Text><Text style={s.body}>{feedback.explanation}</Text></View>}<Text style={s.small}>To ćwiczenie samosprawdzające, nie egzamin. Wyniku nie dopisujemy do zaliczenia kursu.</Text></View>}
   <View style={s.card}><Text accessibilityRole="header" style={s.h2}>Powiązane pojęcia</Text><View style={s.row}>{(g.related_terms||[]).filter(validKey).map((key:string)=><Pressable key={key} onPress={()=>openEntry(key)} accessibilityRole="button" style={s.secondary}><Text style={s.link}>{TERM_LABELS[key]||key.replace('slownik-','')}</Text></Pressable>)}</View></View>
   <View style={s.card}><Text accessibilityRole="header" style={s.h2}>Źródła i zakres objaśnienia</Text><Text style={s.small}>Data sprawdzenia dotyczy opisanego zakresu. Historia powstania systemu nie zastępuje jego obecnych zasad. Hasło nie jest kompletną procedurą rozliczenia konkretnej transakcji.</Text>{(detail.material.sources||[]).map((source:any,n:number)=>{const url=safeSourceURL(source.url);return <View key={n} style={s.source}><Text style={s.body}>{source.title}</Text>{source.scope&&<Text style={s.small}>{source.scope}</Text>}{url&&<Pressable onPress={()=>void Linking.openURL(url).catch(()=>setNotice('Nie udało się otworzyć źródła w przeglądarce.'))} accessibilityRole="link"><Text style={s.link}>Otwórz oficjalne źródło →</Text></Pressable>}</View>;})}</View>
  </View>:!opening&&<View>
   {saved.size>0&&<View style={s.card}><Text accessibilityRole="header" style={s.h2}>Twoje zapisane pojęcia</Text><View style={s.row}>{Array.from(saved).filter(validKey).map(key=><Pressable key={key} onPress={()=>openEntry(key)} accessibilityRole="button" style={s.secondary}><Text style={s.link}>{TERM_LABELS[key]||key.replace('slownik-','')}</Text></Pressable>)}</View></View>}
   {loading?<ActivityIndicator color="#183c2b"/>:
    error?<Text accessibilityRole="alert" style={s.error}>{error}</Text>:<View>
     <Text style={s.label}>{total?`Znaleziono ${total} haseł · strona ${Math.floor(offset/pageSize)+1}`:'Brak pasujących haseł. Spróbuj krótszego określenia.'}</Text>
     {items.map(item=><Pressable key={item.reference_key} onPress={()=>openEntry(item.reference_key)} accessibilityRole="button" style={s.card}><Text style={s.eyebrowDark}>{item.term||'POJĘCIE'}</Text><Text accessibilityRole="header" style={s.h2}>{item.title_pl}</Text><Text style={s.body}>{item.summary}</Text><Text style={s.link}>Zrozum pojęcie →</Text></Pressable>)}
     <View style={s.row}><Pressable disabled={offset===0} onPress={()=>setOffset(Math.max(0,offset-pageSize))} accessibilityRole="button" style={[s.secondary,offset===0&&s.disabled]}><Text style={s.link}>Poprzednia strona</Text></Pressable><Pressable disabled={offset+items.length>=total} onPress={()=>setOffset(offset+pageSize)} accessibilityRole="button" style={[s.secondary,offset+items.length>=total&&s.disabled]}><Text style={s.link}>Następna strona</Text></Pressable></View>
    </View>}
  </View>}
 </View></ScrollView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#f6f8f0'},pad:{padding:18,paddingBottom:50},wrap:{width:'100%',maxWidth:1100,alignSelf:'center'},row:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:12},hero:{backgroundColor:'#183c2b',padding:26,borderRadius:20,gap:12,marginVertical:18},eyebrow:{color:'#d6e8c7',fontSize:12,fontWeight:'800',letterSpacing:1.2},eyebrowDark:{color:'#4e7447',fontSize:12,fontWeight:'800',letterSpacing:.7},h1:{color:'white',fontSize:34,fontWeight:'900',lineHeight:41},heroText:{color:'#e3ecdc',fontSize:16,lineHeight:25},card:{backgroundColor:'white',borderWidth:1,borderColor:'#dbe5d5',borderRadius:15,padding:19,gap:12,marginVertical:9},h2:{fontSize:19,fontWeight:'800',color:'#183c2b',lineHeight:27},body:{fontSize:15,lineHeight:25,color:'#294a34'},small:{fontSize:12,lineHeight:20,color:'#667966'},label:{fontSize:14,fontWeight:'700',color:'#183c2b'},input:{flex:1,minWidth:190,borderWidth:1,borderColor:'#bbcdb5',backgroundColor:'white',color:'#183c2b',padding:13,borderRadius:10,fontSize:16},primary:{backgroundColor:'#183c2b',padding:14,borderRadius:10},white:{color:'white',fontWeight:'800'},secondary:{borderWidth:1,borderColor:'#cedfc2',backgroundColor:'#edf4e4',padding:11,borderRadius:10},link:{color:'#235d35',fontSize:14,fontWeight:'700',lineHeight:22},disabled:{opacity:.4},term:{fontSize:37,fontWeight:'900',color:'#183c2b'},notice:{backgroundColor:'#eaf3e0',padding:14,borderRadius:10,color:'#183c2b',lineHeight:23,marginVertical:7},error:{backgroundColor:'#fff0e9',color:'#893825',padding:17,borderRadius:12,lineHeight:23},warning:{backgroundColor:'#f6efdb',padding:19,borderRadius:15,gap:10,marginVertical:9},tableRow:{flexDirection:'row'},cell:{width:210,padding:12,borderBottomWidth:1,borderBottomColor:'#dbe5d5',fontSize:13,lineHeight:21,color:'#294a34'},tableHead:{fontWeight:'800',backgroundColor:'#edf4e4'},answer:{padding:12,borderWidth:1,borderColor:'#dbe5d5',borderRadius:10},selected:{borderColor:'#47773f',backgroundColor:'#edf4e4'},source:{gap:5,paddingVertical:8,borderTopWidth:1,borderTopColor:'#e3ebdd'}});
