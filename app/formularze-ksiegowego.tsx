import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Linking,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Link,useLocalSearchParams,useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
// @ts-ignore — niewielki moduł bez zależności, testowany w Node.
import {officialURL,formKey,draftKey,restoreDraft,feedbackTitle,periodLabel} from '../src/accounting/forms-core.js';
// @ts-ignore — safe whitelisted Ministry of Finance links, not reproduced forms.
import {OFFICIAL_FORMS,officialFormUrl} from '../src/accounting/official-forms.js';
import OfficialFormTrainingDraft from '../src/accounting/OfficialFormTrainingDraft';
type Card={reference_key:string;title_pl:string;summary:string;category:string;material:any;legal_as_of:string;revision:string;total_count?:number};
type Saved={inputs:Record<string,string>;evaluation:any;version:number;content_revision:string}|null;
function Button({title,onPress,disabled=false,primary=false}:{title:string;onPress:()=>void;disabled?:boolean;primary?:boolean}){return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button,primary&&s.primary,disabled&&s.disabled]}><Text style={primary?s.white:s.link}>{title}</Text></Pressable>;}
function Practice({userId,card,scenario,onReload}:{userId:string;card:Card;scenario:any;onReload:()=>void}){
 const [inputs,setInputs]=useState<Record<string,string>>({}),[remote,setRemote]=useState<Saved>(null),[base,setBase]=useState(0),[evaluation,setEvaluation]=useState<any>(null);
 const [loading,setLoading]=useState(true),[loadFailed,setLoadFailed]=useState(false),[busy,setBusy]=useState(false),[conflict,setConflict]=useState(false),[oldContent,setOldContent]=useState(false),[message,setMessage]=useState('');
 const active=useRef(true),locked=useRef(false),queue=useRef(Promise.resolve()),key=draftKey(userId,card.reference_key,scenario.id);
 const persist=(values:Record<string,string>,version:number)=>{queue.current=queue.current.catch(()=>{}).then(()=>AsyncStorage.setItem(key,JSON.stringify({inputs:values,baseVersion:version,revision:card.revision}))).catch(()=>{if(active.current)setMessage('Nie udało się zachować lokalnego szkicu. Zapisz odpowiedzi na koncie przed wyjściem.');});};
 const getRemote=()=>supabase.from('ta_accounting_form_attempts').select('inputs,evaluation,version,content_revision').eq('user_id',userId).eq('reference_key',card.reference_key).eq('scenario_id',scenario.id).maybeSingle();
 useEffect(()=>{active.current=true;void(async()=>{
  try{const r=await getRemote();if(r.error)throw r.error;let raw:string|null=null;try{raw=await AsyncStorage.getItem(key);}catch{}
   if(!active.current)return;const saved=r.data as Saved,draft=restoreDraft(raw,card.revision,saved);setRemote(saved);setBase(draft?.baseVersion??saved?.version??0);setInputs(draft?.inputs||saved?.inputs||{});
   const changed=!!saved&&saved.content_revision!==card.revision||!!draft?.oldContent;
   setOldContent(changed);setConflict(changed||!!draft?.conflict);
   if(changed)setMessage('Treść zadania ma inną wersję niż zapisane odpowiedzi. Porównaj założenia; wynik poprzedniej wersji nie zalicza nowej.');
   else if(draft?.conflict)setMessage('W innym oknie zapisano nowsze odpowiedzi. Szkic pozostaje dostępny; porównaj wersje.');
   else if(saved&&(!draft||JSON.stringify(draft.inputs)===JSON.stringify(saved.inputs)))setEvaluation(saved.evaluation);
   else if(draft)setMessage('Przywrócono lokalny szkic. Sprawdzenie zapisze go również na koncie.');
  }catch{if(active.current){setLoadFailed(true);setMessage('Nie udało się odczytać poprzedniego zapisu. Nie nadpiszemy go bez odczytu. Odśwież kartę.');}}
  finally{if(active.current)setLoading(false);}
 })();return()=>{active.current=false;};},[userId,card.reference_key,card.revision,scenario.id]);
 function change(field:string,value:string){const next={...inputs,[field]:value};setInputs(next);setEvaluation(null);persist(next,base);}
 function compareAndContinue(useSaved:boolean){const version=remote?.version||0,values=oldContent?{}:useSaved?remote?.inputs||{}:inputs;setInputs(values);setBase(version);setConflict(false);setOldContent(false);setEvaluation(null);persist(values,version);setMessage('Przyjęto aktualną wersję bazową. Wpisz lub porównaj odpowiedzi i sprawdź je ponownie.');}
 async function save(){if(locked.current||loading||loadFailed||conflict)return;locked.current=true;setBusy(true);setMessage('');const snapshot={...inputs};
  try{const r=await supabase.rpc('ta_accounting_form_save',{p_reference:card.reference_key,p_scenario:scenario.id,p_revision:card.revision,p_expected_version:base,p_inputs:snapshot});
   if(r.error){if(r.error.code==='40001'){const current=await getRemote();if(active.current){if(current.error)setLoadFailed(true);else setRemote(current.data as Saved);setConflict(true);if(/Treść ćwiczenia/.test(r.error.message)){setOldContent(true);setLoadFailed(true);}}throw new Error('Zmieniła się wersja zapisu lub treści. Szkic zachowano; niczego nie nadpisano.');}throw r.error;}
   if(!active.current)return;const saved=r.data;setRemote(saved);setBase(saved.version);setEvaluation(saved.evaluation);persist(snapshot,saved.version);setMessage('Odpowiedzi zapisane na koncie · wersja '+saved.version+'. To nie jest wysyłka formularza do urzędu.');
  }catch(e:any){if(active.current)setMessage(e.message||'Nie udało się sprawdzić i zapisać. Szkic pozostaje lokalnie.');}
  finally{locked.current=false;if(active.current)setBusy(false);}
 }
 return <View style={s.card}><Text style={s.eyebrowDark}>SCENARIUSZ · DANE FIKCYJNE</Text><Text style={s.h2}>{scenario.title}</Text><Text style={s.body}>{scenario.assumptions}</Text><View style={s.notice}>{(scenario.given||[]).map((line:string,i:number)=><Text key={i} style={s.body}>{line}</Text>)}</View>
  {loading?<ActivityIndicator/>:(scenario.fields||[]).map((f:any)=>{const result=evaluation?.fields?.find((x:any)=>x.key===f.key);return <View key={f.key} style={s.field}><Text style={s.label}>{f.label}</Text><TextInput value={inputs[f.key]||''} onChangeText={v=>change(f.key,v)} editable={!busy&&!loadFailed} inputMode="decimal" maxLength={32} accessibilityLabel={f.label} placeholder={f.precision===0?'Liczba całkowita':'Kwota, np. 123,45'} style={s.input}/><Text style={s.small}>{f.precision===0?'Pełne złote albo całkowita liczba wskazana w etykiecie.':'Kwota z groszami; możesz użyć przecinka.'}</Text>{result&&<View style={result.correct?s.notice:s.warning}><Text style={s.label}>{result.correct?'Zgodnie z zadaniem.':result.valid?'Sprawdź wynik.':result.message}</Text><Text style={s.body}>{result.explanation}</Text></View>}</View>;})}
  {conflict&&<View style={s.warning}><Text style={s.h2}>Porównaj przed zapisem</Text><Text style={s.small}>Aktualne odpowiedzi na koncie:</Text>{(scenario.fields||[]).map((f:any)=><Text key={f.key} style={s.body}>{f.label}: {remote?.inputs?.[f.key]??'(brak)'}</Text>)}<View style={s.row}>{oldContent?<><Button title="Wczytaj ponownie kartę i jej założenia" onPress={onReload}/><Button title="Zapoznałem się — rozpocznij nowy wariant" disabled={loadFailed} onPress={()=>compareAndContinue(false)}/></>:<><Button title="Przyjmij odpowiedzi z konta" onPress={()=>compareAndContinue(true)} disabled={loadFailed}/><Button title="Porównałem — zachowaj mój szkic" onPress={()=>compareAndContinue(false)} disabled={loadFailed}/></>}</View></View>}
  <Button title={busy?'Sprawdzanie i zapis…':'Sprawdź i zapisz na koncie'} primary disabled={busy||loading||loadFailed||conflict} onPress={()=>void save()}/>
  {!!evaluation&&<View accessibilityLiveRegion="polite" style={s.notice}><Text style={s.h2}>{feedbackTitle(evaluation)}</Text><Text style={s.body}>{evaluation.correct_count} z {evaluation.field_count} pól. {evaluation.scope}</Text></View>}
  {!!message&&<Text accessibilityLiveRegion="polite" style={s.message}>{message}</Text>}
  <Text style={s.small}>Otwarte pola zachowują się na tym urządzeniu. Przycisk zapisuje je na koncie. Nie wpisuj danych prawdziwego podatnika ani pracownika.</Text>
 </View>;
}
type OfficialForm={code:string;category:string;icon:string;description:string;source:string;edition?:string;pdf?:string};
function OfficialFormsPanel({onSearch,userId}:{onSearch:(query:string)=>void;userId:string}){
 const [category,setCategory]=useState('Popularne'),[selected,setSelected]=useState<OfficialForm|null>(null),[all,setAll]=useState(false);
 const listed=(OFFICIAL_FORMS as OfficialForm[]).filter(f=>category==='Popularne'?['PIT-37','PIT-36L','PIT-11','CIT-8','CIT-8/O','VAT-R','VAT-UE'].includes(f.code):f.category===category);
 const subset=all?listed:listed.slice(0,category==='Popularne'?7:9);
 const open=(url:string|null)=>{if(url)void Linking.openURL(url);};
 if(selected)return <View style={s.card}>
  <Pressable accessibilityRole="button" onPress={()=>setSelected(null)} style={s.formTileBtn}><Text style={s.link}>← Wszystkie formularze</Text></Pressable>
  <Text style={s.eyebrowDark}>{selected.category} · URZĘDOWY DOKUMENT</Text>
  <Text style={s.h2}>{selected.icon} {selected.code}</Text>
  <Text style={s.body}>{selected.description}</Text>
  <Text style={s.small}>{selected.edition||'Sprawdź najnowsze wydanie i właściwy rocznik na stronie urzędu.'}</Text>
  {Platform.OS==='web'&&!!selected.pdf&&React.createElement('iframe' as any,{
   title:'Oryginalny dokument '+selected.code,src:officialFormUrl(selected,true)||'',
   style:{width:'100%',height:350,border:'1px solid #D8E2EB',borderRadius:12,background:'white'}
  })}
  {!selected.pdf&&<View style={s.notice}><Text style={s.body}>Oryginalny druk i dostępne wersje do wypełnienia otworzysz na stronie Ministerstwa Finansów. Nie podstawiamy własnej kopii dokumentu.</Text></View>}
  <View style={s.row}>
   <Button title="📄 Oryginalny druk / PDF ↗" onPress={()=>open(officialFormUrl(selected,!!selected.pdf))}/>
   <Button title="📚 Wersje i instrukcje MF ↗" onPress={()=>open(officialFormUrl(selected,false))}/>
  </View>
  <OfficialFormTrainingDraft key={selected.code} form={selected} userId={userId}/>
  <Button title="Sprawdź inne gotowe scenariusze Trenerki" onPress={()=>{onSearch(selected.code);setSelected(null);}}/>
 </View>;
 return <View style={s.card}>
  <Text style={s.eyebrowDark}>PIT / CIT / VAT / JPK · ORYGINAŁY</Text>
  <Text style={s.h2}>📂 Wybierz dokument</Text>
  <Text style={s.small}>Otwórz oryginalny druk, a potem zapisz własne ćwiczenie na fikcyjnych danych.</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:7,paddingVertical:6}}>
   {['Popularne','PIT','CIT','VAT','JPK'].map(k=><Pressable key={k} accessibilityRole="button" accessibilityState={{selected:category===k}}
    onPress={()=>{setCategory(k);setAll(false);}} style={[s.taxPill,category===k&&s.taxPillActive]}>
    <Text style={[s.taxPillText,category===k&&s.taxPillTextActive]}>{k}</Text>
   </Pressable>)}
  </ScrollView>
  <View style={s.formTiles}>{subset.map((form:OfficialForm)=><View key={form.code} style={s.formTile}>
   <Text style={{fontSize:28}}>{form.icon}</Text>
   <Text style={s.formName}>{form.code}</Text>
   <Text style={s.small}>{form.description}</Text>
   <View style={{gap:7,marginTop:'auto'}}>
    <Pressable accessibilityRole="button" onPress={()=>setSelected(form)} style={s.formTileBtn}>
     <Text style={s.link}>Podgląd i ćwiczenie →</Text>
    </Pressable>
    <Pressable accessibilityRole="link" onPress={()=>open(officialFormUrl(form,false))} style={s.formTileBtn}>
     <Text style={s.link}>Oryginalny druk MF ↗</Text>
    </Pressable>
   </View>
  </View>)}</View>
  {!all&&listed.length>subset.length&&<Button title={'Pokaż wszystkie ('+listed.length+')'} onPress={()=>setAll(true)}/>}
 </View>;
}
export default function AccountingForms(){
 const router=useRouter(),params=useLocalSearchParams<{entry?:string}>(),entry=typeof params.entry==='string'?params.entry:'';
 const [user,setUser]=useState(''),[query,setQuery]=useState(''),[applied,setApplied]=useState(''),[page,setPage]=useState(0),[total,setTotal]=useState(0),[cards,setCards]=useState<Card[]>([]);
 const [card,setCard]=useState<Card|null>(null),[scenarioIndex,setScenarioIndex]=useState(0),[loading,setLoading]=useState(true),[opening,setOpening]=useState(false),[error,setError]=useState(''),[detailError,setDetailError]=useState(''),[reload,setReload]=useState(0);
 const scroll=useRef<React.ComponentRef<typeof ScrollView>>(null);
 useEffect(()=>{let active=true;void supabase.auth.getUser().then(({data,error})=>{if(!active)return;if(error||!data.user){router.replace('/konto');return;}setUser(data.user.id);}).catch(()=>{if(active){setError('Nie udało się sprawdzić konta.');setLoading(false);}});return()=>{active=false;};},[]);
 useEffect(()=>{if(!user)return;let active=true;setLoading(true);setError('');void supabase.rpc('ta_accounting_forms_list',{p_query:applied,p_limit:12,p_offset:page*12}).then(({data,error})=>{if(!active)return;if(error){setCards([]);setError(error.code==='42501'?'Pracownia formularzy wymaga aktywnego dostępu do encyklopedii. Właściciel ma dostęp do podglądu.':'Nie udało się pobrać formularzy.');}else{setCards(data||[]);setTotal(Number(data?.[0]?.total_count||0));}}).catch(()=>{if(active)setError('Błąd połączenia podczas pobierania listy.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[user,applied,page,reload]);
 useEffect(()=>{let active=true;setCard(null);setDetailError('');setScenarioIndex(0);if(!entry||!user){setOpening(false);return;}if(!formKey(entry)){setDetailError('Wybierz formularz z listy.');return;}setOpening(true);void supabase.rpc('ta_accounting_form_get',{p_reference:entry}).then(({data,error})=>{if(!active)return;if(error||!data)setDetailError('Nie można otworzyć tej karty na Twoim koncie.');else{setCard(data);scroll.current?.scrollTo({y:0,animated:false});}}).catch(()=>{if(active)setDetailError('Błąd odczytu karty.');}).finally(()=>{if(active)setOpening(false);});return()=>{active=false;};},[entry,user,reload]);
 function openURL(raw:string){const url=officialURL(raw);if(!url){setDetailError('Adres źródła nie przeszedł kontroli domeny urzędowej.');return;}void Linking.openURL(url).catch(()=>setDetailError('Nie udało się otworzyć źródła. Sprawdź stronę wydawcy.'));}
 const f=card?.material?.form,scenario=f?.scenarios?.[scenarioIndex];
 return <ScrollView ref={scroll} style={s.page} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled"><View style={s.wrap}>
  <View style={s.row}><Link href="/ksiegowosc" style={s.link}>← Encyklopedia</Link><Link href="/biuro-ksiegowe" style={s.link}>Biuro ćwiczeniowe</Link><Link href="/slownik-ksiegowego" style={s.link}>Słownik</Link></View>
  <View style={s.hero}><Text style={s.eyebrow}>TRENERKI · FORMULARZE I ĆWICZENIA</Text><Text accessibilityRole="header" style={s.h1}>📄 Druki PIT, CIT i VAT</Text><Text style={s.heroText}>Podejrzyj oryginał, naucz się pól i zapisz własne ćwiczenie.</Text></View>
  <OfficialFormsPanel userId={user} onSearch={code=>{setQuery(code);setApplied(code);setPage(0);router.setParams({entry:''});}}/>
  <View style={s.card}><Text style={s.label}>Szukaj dokumentu lub tematu</Text><View style={s.row}><TextInput value={query} onChangeText={setQuery} maxLength={120} placeholder="Np. PIT-38, DRA, udziały, składki" accessibilityLabel="Wyszukiwarka formularzy" style={[s.input,{flex:1,minWidth:180}]} onSubmitEditing={()=>{setApplied(query.trim());setPage(0);router.setParams({entry:''});}}/><Button title="Szukaj" primary onPress={()=>{setApplied(query.trim());setPage(0);router.setParams({entry:''});}}/></View><Text style={s.small}>Oryginalne wzory są dostępne bezpłatnie u wydawców. Objaśnienia i zadania Trenerki są odrębne od dokumentu urzędowego.</Text></View>
  {!!error&&<Text accessibilityRole="alert" style={s.warning}>{error}</Text>}{!!detailError&&<Text accessibilityRole="alert" style={s.warning}>{detailError}</Text>}{opening&&<ActivityIndicator/>}
  {card&&f?<>
   <View style={s.card}><Button title="← Lista dokumentów" onPress={()=>router.setParams({entry:''})}/><Text style={s.eyebrowDark}>{f.publisher}</Text><Text accessibilityRole="header" style={s.h2}>{card.title_pl}</Text><Text style={s.body}>{card.material.intro||card.summary}</Text><Text style={s.label}>Wersja: {f.edition} · {periodLabel(f)}</Text><Text style={s.body}>{f.period_note}</Text><Text style={s.small}>Sprawdzono źródło: {card.legal_as_of}. Obejrzane strony: {(f.verified_pages||[]).join(', ')}.</Text><View style={s.row}><Button title="Otwórz bezpłatny oryginał urzędowy" onPress={()=>openURL(f.download_url)}/><Button title="Wersje i instrukcje u wydawcy" onPress={()=>openURL(f.official_page)}/></View><View style={s.notice}><Text style={s.label}>Zakres tego ćwiczenia</Text><Text style={s.body}>{f.scope}</Text><Text style={s.small}>{f.inspection}</Text></View></View>
   {(card.material.tables||[]).map((t:any,i:number)=><View key={i} style={s.card}><Text style={s.h2}>{t.title}</Text><ScrollView horizontal><View><View style={s.tableRow}>{t.columns.map((v:string,n:number)=><Text key={n} style={[s.cell,s.tableHead]}>{v}</Text>)}</View>{t.rows.map((row:string[],n:number)=><View key={n} style={s.tableRow}>{row.map((v:string,c:number)=><Text key={c} style={s.cell}>{v}</Text>)}</View>)}</View></ScrollView></View>)}
   <View style={s.card}><Text style={s.h2}>Wybierz sytuację</Text><View style={s.row}>{(f.scenarios||[]).map((v:any,i:number)=><Button key={v.id} title={(i+1)+'. '+String(v.title).replace(/^\s*\d{1,3}[.)–-]\s*/u,'')} primary={scenarioIndex===i} onPress={()=>setScenarioIndex(i)}/>)}</View></View>
   {scenario&&<Practice key={card.reference_key+':'+card.revision+':'+scenario.id+':'+reload} userId={user} card={card} scenario={scenario} onReload={()=>setReload(v=>v+1)}/>}
   <View style={s.warning}><Text style={s.h2}>Granice zadania</Text>{(card.material.warnings||[]).map((v:string,n:number)=><Text key={n} style={s.body}>{v}</Text>)}</View>
  </>:!opening&&<>{loading?<ActivityIndicator/>:<><Text style={s.small}>Liczba dostępnych kart: {total}. Lista po 12 dokumentów.</Text>{cards.map(c=><View key={c.reference_key} style={s.card}><Text style={s.eyebrowDark}>{c.category}</Text><Text accessibilityRole="header" style={s.h2}>{c.title_pl}</Text><Text style={s.body}>{c.summary}</Text><Button title="Przejdź do pól i ćwiczeń" primary onPress={()=>router.setParams({entry:c.reference_key})}/></View>)}{!cards.length&&!error&&<Text style={s.body}>Nie znaleziono gotowej karty. Nie pokazujemy pustych pozycji programu jako opracowanych formularzy.</Text>}<View style={s.row}><Button title="Poprzednie" disabled={page===0} onPress={()=>setPage(p=>p-1)}/><Button title="Następne" disabled={(page+1)*12>=total} onPress={()=>setPage(p=>p+1)}/></View></>}</>}
 </View></ScrollView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#F7F9FC'},pad:{padding:18,paddingBottom:60},wrap:{width:'100%',maxWidth:1100,alignSelf:'center',gap:14},row:{flexDirection:'row',flexWrap:'wrap',gap:10,alignItems:'center'},hero:{backgroundColor:'#17354D',padding:18,borderRadius:16,gap:8},h1:{fontSize:27,lineHeight:34,color:'white',fontWeight:'900'},heroText:{color:'#EFF3F8',fontSize:16,lineHeight:26},eyebrow:{color:'#D8E2EB',fontSize:11,fontWeight:'800',letterSpacing:1},eyebrowDark:{color:'#49647A',fontSize:11,fontWeight:'800',letterSpacing:1},h2:{color:'#17354D',fontSize:22,lineHeight:29,fontWeight:'800'},card:{backgroundColor:'white',padding:14,borderRadius:16,borderWidth:1,borderColor:'#D8E2EB',gap:10},
 taxPill:{paddingVertical:9,paddingHorizontal:13,borderWidth:1,borderColor:'#D8E2EB',backgroundColor:'#F7F9FC',borderRadius:12,minHeight:43,justifyContent:'center'},
 taxPillActive:{backgroundColor:'#17354D',borderColor:'#17354D'},
 taxPillText:{fontSize:13,fontWeight:'800',color:'#17354D'},
 taxPillTextActive:{color:'white'},
 formTiles:{flexDirection:'row',flexWrap:'wrap',gap:10},
 formTile:{width:'47%',minWidth:140,flexGrow:1,backgroundColor:'#F7F9FC',borderWidth:1,borderColor:'#D8E2EB',borderBottomWidth:4,borderBottomColor:'#D8E2EB',borderRadius:15,padding:12,gap:7},
 formName:{fontSize:18,fontWeight:'900',color:'#17354D'},
 formTileBtn:{paddingVertical:9,paddingHorizontal:9,minHeight:42,borderRadius:10,backgroundColor:'#EFF3F8',justifyContent:'center'},body:{color:'#17354D',fontSize:16,lineHeight:26},small:{color:'#49647A',fontSize:12,lineHeight:19},label:{color:'#17354D',fontSize:14,fontWeight:'800',lineHeight:21},input:{borderWidth:1,borderColor:'#ADBDCC',padding:12,borderRadius:9,fontSize:17,color:'#17354D',backgroundColor:'white'},field:{gap:7,paddingVertical:10},button:{backgroundColor:'#EFF3F8',paddingVertical:12,paddingHorizontal:16,borderRadius:10},primary:{backgroundColor:'#17354D'},disabled:{opacity:.45},white:{color:'white',fontWeight:'800'},link:{color:'#49647A',fontWeight:'800'},notice:{backgroundColor:'#EFF3F8',padding:14,borderRadius:10,gap:7},warning:{backgroundColor:'#fff1e7',padding:15,borderRadius:10,color:'#7f3b25',gap:10},message:{fontSize:14,lineHeight:22,color:'#17354D'},tableRow:{flexDirection:'row'},cell:{width:240,padding:12,borderBottomWidth:1,borderColor:'#EFF3F8',fontSize:14,lineHeight:22,color:'#17354D'},tableHead:{fontWeight:'800',backgroundColor:'#EFF3F8'}});
