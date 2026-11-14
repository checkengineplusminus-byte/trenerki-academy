import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Linking,Pressable,ScrollView,StyleSheet,Text,TextInput,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Link,useLocalSearchParams,useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
// @ts-ignore — małe funkcje mają niezależne testy Node.
import {PAGE_SIZE,lessonNumber,checkExercise,sourceURL,noteDraftKey,resumeNoteDraft,exerciseSaveLabel} from '../src/accounting/reader-core.js';

type Overview={is_editor:boolean;authored_count:number;approved_count:number;read_count:number;program_version?:string;active_program?:{sections:number;topics:number;authored_topics:number;complete_topics:number};sections:{section_no:number;title_pl:string;description_pl:string}[]};
type Chapter={chapter_no:number;title_pl:string;authored_count:number;approved_count:number};
type Summary={lesson_no:number;chapter_no?:number;title_pl:string;learning_goal:string;editorial_status:string};
type Lesson=Summary&{material:any;body_text:string;legal_as_of:string|null;updated_at:string};
type Note={note:string;updated_at:string}|null;
function Button({title,onPress,disabled=false,primary=false}:{title:string;onPress:()=>void;disabled?:boolean;primary?:boolean}){return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button,primary&&s.primary,disabled&&s.disabled]}><Text style={primary?s.white:s.buttonText}>{title}</Text></Pressable>;}
function Table({table}:{table:any}){return <View style={s.card}><Text accessibilityRole="header" style={s.h2}>{table.title}</Text><ScrollView horizontal><View><View style={s.tableRow}>{(table.columns||[]).map((v:string,i:number)=><Text key={i} style={[s.cell,s.tableHead]}>{v}</Text>)}</View>{(table.rows||[]).map((r:any[],i:number)=><View key={i} style={s.tableRow}>{r.map((v:any,j:number)=><Text key={j} style={s.cell}>{String(v)}</Text>)}</View>)}</View></ScrollView></View>;}

function NotePanel({userId,number}:{userId:string;number:number}){
 const [text,setText]=useState(''),[remote,setRemote]=useState<Note>(null),[base,setBase]=useState<string|null>(null),[conflict,setConflict]=useState(false),[loading,setLoading]=useState(true),[loadFailed,setLoadFailed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[showRemote,setShowRemote]=useState(false);
 const active=useRef(true),writing=useRef(false),queue=useRef(Promise.resolve()),key=noteDraftKey(userId,number);
 const persist=(value:string,version:string|null)=>{
  queue.current=queue.current.catch(()=>{}).then(()=>AsyncStorage.setItem(key,JSON.stringify({text:value,base:version}))).catch(()=>{if(active.current)setMessage('Nie udało się zachować szkicu na urządzeniu. Zapisz notatkę na koncie przed wyjściem.');});
 };
 useEffect(()=>{active.current=true;void(async()=>{
  try{
   const r=await supabase.from('ta_accounting_notes').select('note,updated_at').eq('user_id',userId).eq('lesson_no',number).maybeSingle();
   if(r.error)throw r.error;
   let raw:string|null=null;try{raw=await AsyncStorage.getItem(key);}catch{if(active.current)setMessage('Nie można odczytać lokalnego szkicu. Odczytano wersję z konta.');}
   if(!active.current)return;
   const note=r.data as Note,draft=resumeNoteDraft(raw,note);setRemote(note);
   if(draft&&draft.dirty){setText(draft.text);setBase(draft.base);setConflict(draft.conflict);setMessage(draft.conflict?'Masz lokalny szkic i inną wersję na koncie. Porównaj je przed zapisem.':'Przywrócono lokalny szkic. Zapisz go na koncie, aby mieć dostęp z innego urządzenia.');}
   else{setText(note?.note||'');setBase(note?.updated_at||null);}
  }catch{if(active.current){setLoadFailed(true);setMessage('Nie udało się odczytać notatki. Zapis jest zablokowany, aby nie nadpisać istniejących danych. Odśwież widok.');}}
  finally{if(active.current)setLoading(false);}
 })();return()=>{active.current=false;};},[userId,number]);
 async function save(){
  if(writing.current||loading||loadFailed||conflict)return;writing.current=true;setBusy(true);setMessage('');
  const snapshot=text;
  try{const r=await supabase.rpc('ta_accounting_note_save',{p_lesson:number,p_note:snapshot,p_expected_updated_at:base});
   if(r.error){
    if(r.error.code==='40001'){
     const current=await supabase.from('ta_accounting_notes').select('note,updated_at').eq('user_id',userId).eq('lesson_no',number).maybeSingle();
     if(active.current){if(!current.error)setRemote(current.data as Note);else setLoadFailed(true);setConflict(true);setShowRemote(true);}
     throw new Error('W innym oknie zapisano nowszą notatkę. Twój szkic jest zachowany; niczego nie nadpisano.');
    }throw r.error;
   }
   const saved=r.data as {note:string;updated_at:string};
   if(!active.current)return;setRemote(saved);setBase(saved.updated_at);setConflict(false);persist(snapshot,saved.updated_at);setMessage('Notatka zapisana na Twoim koncie.');
  }catch(e:any){if(active.current)setMessage(e.message||'Nie udało się zapisać. Szkic pozostaje na urządzeniu.');}
  finally{writing.current=false;if(active.current)setBusy(false);}
 }
 function useRemote(){const value=remote?.note||'',version=remote?.updated_at||null;setText(value);setBase(version);setConflict(false);setShowRemote(false);persist(value,version);setMessage('Odczytano wersję z konta.');}
 function merge(){setBase(remote?.updated_at||null);setConflict(false);persist(text,remote?.updated_at||null);setMessage('Przyjęto aktualną wersję bazową. Uzupełnij szkic po porównaniu i naciśnij Zapisz na koncie.');}
 return <View style={s.card}><Text accessibilityRole="header" style={s.h2}>Twoja notatka do lekcji</Text><Text style={s.small}>Szkic zachowuje się lokalnie. Przycisk zapisu przenosi go na konto. Nie wpisuj danych prawdziwych klientów.</Text>{loading?<ActivityIndicator/>:<TextInput value={text} onChangeText={v=>{setText(v);persist(v,base);}} editable={!busy&&!loadFailed} multiline maxLength={10000} accessibilityLabel="Prywatna notatka do lekcji" textAlignVertical="top" placeholder="Zapisz własnymi słowami, co rozumiesz i co chcesz sprawdzić." style={s.note}/>}<View style={s.row}><Button title={busy?'Zapisywanie…':'Zapisz na koncie'} primary disabled={busy||loading||loadFailed||conflict} onPress={()=>void save()}/>{conflict&&<Button title="Porównaj wersje" onPress={()=>setShowRemote(v=>!v)}/>}</View>{showRemote&&<View style={s.notice}><Text style={s.label}>Aktualnie na koncie:</Text><Text selectable style={s.body}>{remote?.note||'(Pusta notatka)'}</Text><View style={s.row}><Button title="Zachowaj wersję z konta" disabled={busy||loadFailed} onPress={useRemote}/><Button title="Porównałem — przygotuj mój szkic do zapisu" disabled={busy||loadFailed} onPress={merge}/></View></View>}{!!message&&<Text accessibilityLiveRegion="polite" style={s.small}>{message}</Text>}</View>;
}

function Practice({userId,number,exercise,initial}:{userId:string;number:number;exercise:any;initial:string}){
 const [answer,setAnswer]=useState(initial),[feedback,setFeedback]=useState<any>(null),[busy,setBusy]=useState(false),[saved,setSaved]=useState(false),[saveError,setSaveError]=useState(false);const active=useRef(true),lock=useRef(false);
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 function change(v:string){setAnswer(v);setFeedback(null);setSaved(false);setSaveError(false);}
 async function check(){if(lock.current)return;const result=checkExercise(exercise,answer);setFeedback(result);setSaved(false);setSaveError(false);if(!result.valid)return;lock.current=true;setBusy(true);
  try{const r=await supabase.from('ta_accounting_practice_answers').upsert({user_id:userId,lesson_no:number,exercise_id:exercise.id,answer},{onConflict:'user_id,lesson_no,exercise_id'}).select('updated_at').single();if(r.error)throw r.error;if(active.current)setSaved(true);}
  catch{if(active.current)setSaveError(true);}finally{lock.current=false;if(active.current)setBusy(false);}
 }
 return <View style={s.exercise}><Text style={s.body}>{exercise.prompt}</Text>{exercise.type==='choice'?(exercise.choices||[]).map((v:string,i:number)=><Pressable key={i} disabled={busy} accessibilityRole="radio" accessibilityState={{checked:answer===String(i)}} onPress={()=>change(String(i))} style={[s.choice,answer===String(i)&&s.selected]}><Text style={s.body}>{v}</Text></Pressable>):<View style={s.row}><TextInput editable={!busy} accessibilityLabel="Twoja odpowiedź liczbowa" inputMode="decimal" value={answer} onChangeText={change} maxLength={100} placeholder="Wpisz liczbę" style={s.input}/><Text style={s.small}>{exercise.unit||''}</Text></View>}<Button title={busy?'Zapisywanie odpowiedzi…':'Sprawdź i zapisz odpowiedź'} disabled={busy} onPress={()=>void check()}/>{feedback&&<View accessibilityLiveRegion="polite" style={feedback.valid?s.notice:s.warning}><Text style={s.label}>{!feedback.valid?feedback.message:feedback.correct?'Poprawnie — sprawdź jeszcze uzasadnienie.':'Spójrz na tok rozwiązania i spróbuj ponownie.'}</Text>{feedback.valid&&<Text style={s.body}>{feedback.explanation}</Text>}</View>}<Text style={s.small}>{exerciseSaveLabel(feedback?.valid,saved,saveError)}</Text></View>;
}

export default function AccountingReader(){
 const params=useLocalSearchParams<{lesson?:string}>(),router=useRouter(),raw=typeof params.lesson==='string'?params.lesson:'',requested=lessonNumber(raw);
 const [userId,setUserId]=useState(''),[overview,setOverview]=useState<Overview|null>(null),[accessError,setAccessError]=useState(''),[loading,setLoading]=useState(true);
 const [section,setSection]=useState(1),[chapters,setChapters]=useState<Chapter[]>([]),[chapter,setChapter]=useState<number|null>(null),[mode,setMode]=useState<'program'|'search'|'saved'>('program'),[page,setPage]=useState(0),[query,setQuery]=useState(''),[applied,setApplied]=useState('');
 const [items,setItems]=useState<Summary[]>([]),[more,setMore]=useState(false),[listBusy,setListBusy]=useState(false),[listError,setListError]=useState(''),[chaptersBusy,setChaptersBusy]=useState(false),[refreshList,setRefreshList]=useState(0);
 const [detail,setDetail]=useState<Lesson|null>(null),[opening,setOpening]=useState(false),[detailError,setDetailError]=useState(''),[answerMap,setAnswerMap]=useState<Record<string,string>>({}),[answersReady,setAnswersReady]=useState(false),[bookmarked,setBookmarked]=useState(false),[read,setRead]=useState(false),[markReady,setMarkReady]=useState(false),[saving,setSaving]=useState(false),[notice,setNotice]=useState('');
 const scroll=useRef<React.ComponentRef<typeof ScrollView>>(null),active=useRef(true),detailSerial=useRef(0),markLock=useRef(false);
 useEffect(()=>{active.current=true;let mounted=true;void(async()=>{try{
  const auth=await supabase.auth.getUser();if(auth.error||!auth.data.user){router.replace('/konto');return;}
  const info=await supabase.rpc('ta_accounting_overview');if(info.error)throw info.error;
  if(mounted){setUserId(auth.data.user.id);setOverview(info.data);}
 }catch(e:any){if(mounted)setAccessError(e.code==='42501'?'Encyklopedia wymaga aktywnego dostępu. Właściciel może korzystać z podglądu przygotowywanego kursu.':'Nie udało się odczytać kursu. Spróbuj ponownie.');}finally{if(mounted)setLoading(false);}})();return()=>{mounted=false;active.current=false;};},[]);
 useEffect(()=>{if(!userId)return;let mounted=true;setChaptersBusy(true);setListError('');void supabase.rpc('ta_accounting_chapter_list',{p_section:section}).then(({data,error})=>{if(!mounted)return;if(error){setChapters([]);setListError('Nie udało się wczytać rozdziałów.');}else setChapters(data||[]);}).catch(()=>{if(mounted)setListError('Błąd połączenia przy odczycie rozdziałów.');}).finally(()=>{if(mounted)setChaptersBusy(false);});return()=>{mounted=false;};},[userId,section]);
 useEffect(()=>{if(!userId)return;let mounted=true;setItems([]);setMore(false);setListError('');if(mode==='program'&&chapter===null){setListBusy(false);return;}setListBusy(true);
  void(async()=>{try{let rows:Summary[]=[];const offset=page*PAGE_SIZE;
   if(mode==='search'){const r=await supabase.rpc('ta_accounting_search',{query_text:applied,section_filter:null,page_size:PAGE_SIZE+1,page_offset:offset});if(r.error)throw r.error;rows=r.data||[];}
   else if(mode==='saved'){const r=await supabase.from('ta_accounting_bookmarks').select('lesson_no,ta_accounting_lessons!inner(lesson_no,chapter_no,title_pl,learning_goal,editorial_status)').eq('user_id',userId).order('created_at',{ascending:false}).order('lesson_no',{ascending:true}).range(offset,offset+PAGE_SIZE);if(r.error)throw r.error;rows=(r.data||[]).map((x:any)=>x.ta_accounting_lessons).filter(Boolean);}
   else{const r=await supabase.from('ta_accounting_lessons').select('lesson_no,chapter_no,title_pl,learning_goal,editorial_status').eq('chapter_no',chapter).in('editorial_status',['approved','review_needed']).order('lesson_no').range(offset,offset+PAGE_SIZE);if(r.error)throw r.error;rows=r.data||[];}
   if(mounted){setItems(rows.slice(0,PAGE_SIZE));setMore(rows.length>PAGE_SIZE);}
  }catch{if(mounted)setListError('Nie udało się pobrać listy lekcji. Spróbuj zmienić stronę lub odświeżyć widok.');}finally{if(mounted)setListBusy(false);}})();return()=>{mounted=false;};
 },[userId,mode,chapter,page,applied,refreshList]);
 useEffect(()=>{const serial=++detailSerial.current;let mounted=true;setDetail(null);setDetailError('');setNotice('');setMarkReady(false);setAnswerMap({});setAnswersReady(false);
  if(!raw){setOpening(false);return;}if(!requested){setOpening(false);setDetailError('Nieprawidłowy numer lekcji. Wybierz pozycję z listy.');return;}if(!userId)return;
  setOpening(true);void(async()=>{try{
   const [l,a,b,p]=await Promise.all([
    supabase.from('ta_accounting_lessons').select('lesson_no,chapter_no,title_pl,learning_goal,material,body_text,editorial_status,legal_as_of,updated_at').eq('lesson_no',requested).maybeSingle(),
    supabase.from('ta_accounting_practice_answers').select('exercise_id,answer').eq('user_id',userId).eq('lesson_no',requested),
    supabase.from('ta_accounting_bookmarks').select('lesson_no').eq('user_id',userId).eq('lesson_no',requested).maybeSingle(),
    supabase.from('ta_accounting_progress').select('lesson_no').eq('user_id',userId).eq('lesson_no',requested).maybeSingle()
   ]);
   if(!mounted||serial!==detailSerial.current)return;
   if(l.error||!l.data)throw new Error('Ta lekcja nie jest jeszcze dostępna na Twoim koncie. Puste pozycje programu nie są publikowane.');
   setDetail(l.data);setAnswersReady(!a.error);setAnswerMap(Object.fromEntries((a.data||[]).map(x=>[x.exercise_id,x.answer])));setBookmarked(!!b.data);setRead(!!p.data);setMarkReady(!b.error&&!p.error);
   if(a.error||b.error||p.error)setNotice('Treść odczytana, ale część zapisów osobistych jest niedostępna. Nie uznajemy brakującej odpowiedzi serwera za brak Twojego postępu.');
   scroll.current?.scrollTo({y:0,animated:false});
  }catch(e:any){if(mounted)setDetailError(e.message||'Nie udało się otworzyć lekcji.');}finally{if(mounted)setOpening(false);}})();return()=>{mounted=false;};
 },[userId,raw]);
 function open(n:number){setNotice('');router.setParams({lesson:String(n)});}
 function back(){router.setParams({lesson:''});}
 function search(){back();setMode('search');setPage(0);setApplied(query.trim());}
 async function mark(kind:'bookmark'|'read'){
  if(!detail||!userId||!markReady||markLock.current)return;markLock.current=true;setSaving(true);setNotice('');const number=detail.lesson_no,serial=detailSerial.current,exists=kind==='bookmark'?bookmarked:read,table=kind==='bookmark'?'ta_accounting_bookmarks':'ta_accounting_progress';
  try{const r=exists?await supabase.from(table).delete().eq('user_id',userId).eq('lesson_no',number):await supabase.from(table).insert({user_id:userId,lesson_no:number});if(r.error)throw r.error;
   if(active.current&&serial===detailSerial.current){if(kind==='bookmark'){setBookmarked(!exists);setRefreshList(v=>v+1);}else{setRead(!exists);setOverview(x=>x?{...x,read_count:Math.max(0,x.read_count+(exists?-1:1))}:x);}setNotice(kind==='read'?'Zapisano oznaczenie przeczytania. To nie jest zaliczenie egzaminu.':exists?'Usunięto zakładkę.':'Lekcja dodana do ulubionych.');}
  }catch{if(active.current&&serial===detailSerial.current)setNotice('Nie udało się zapisać oznaczenia. Odśwież lekcję i sprawdź aktualny stan.');}finally{markLock.current=false;if(active.current)setSaving(false);}
 }
 function chooseSection(n:number){back();setMode('program');setSection(n);setChapter(null);setPage(0);}
 const m=detail?.material||{};
 return <ScrollView ref={scroll} style={s.page} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled"><View style={s.wrap}>
  <View style={s.row}><Link href="/moje-kursy" style={s.link}>← Moje kursy</Link><Link href="/program-ksiegowosci" style={s.link}>Nowy program: 100 tematów</Link><Link href="/biuro-ksiegowe" style={s.link}>Biuro ćwiczeniowe</Link><Link href="/slownik-ksiegowego" style={s.link}>Słownik pojęć</Link></View>
  <View style={s.hero}><Text style={s.eyebrow}>KSIĘGOWOŚĆ OD PODSTAW · ENCYKLOPEDIA I PRAKTYKA</Text><Text accessibilityRole="header" style={s.h1}>{detail?'Rozumiesz. Ćwiczysz. Sprawdzasz.':'Od pierwszego dokumentu do samodzielnego rozliczenia.'}</Text><Text style={s.heroText}>Czytaj w swoim tempie, wracaj do zagadnień i sprawdzaj obliczenia w fikcyjnym biurze.</Text></View>
  {loading&&<ActivityIndicator accessibilityLabel="Odczytywanie kursu"/>}{!!accessError&&<Text accessibilityRole="alert" style={s.warning}>{accessError}</Text>}
  {overview&&<View style={s.summary}>
   {overview.program_version==='core-v3-20261113'&&overview.active_program?.sections===10&&overview.active_program?.topics===100
    ?<Text style={s.label}>Aktywny program: 10 działów · {overview.active_program.authored_topics}/100 tematów z zapisanym materiałem · {overview.active_program.complete_topics}/100 tematów po pełnym odbiorze</Text>
    :<Text style={s.warning}>Brak potwierdzonych liczników aktywnego programu. Dane archiwalne nie są liczbą ukończonych tematów.</Text>}
   <Text style={s.small}>Katalog wcześniejszych lekcji: {overview.is_editor?overview.authored_count:overview.approved_count} {overview.is_editor?'opracowanych':'zatwierdzonych'} · Oznaczonych jako przeczytane w archiwum: {overview.read_count}. Te liczby nie oznaczają ukończenia nowego programu ani egzaminu.</Text>
   <Text style={s.small}>Dotychczasowe materiały i postępy są zachowane. Starsza mapa 100 000 pozycji jest archiwalna; same zarysy nie są gotowymi lekcjami.</Text>
   {overview.is_editor&&<Text style={s.small}>Podgląd właściciela: wersje redakcyjne wymagają niezależnego odbioru. Kontrola SQL i testy automatyczne nie zastępują recenzji księgowo-prawnej ani próby kursanta.</Text>}
  </View>}
  {!!notice&&<Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}{opening&&<ActivityIndicator accessibilityLabel="Otwieranie lekcji"/>}{!!detailError&&<Text accessibilityRole="alert" style={s.warning}>{detailError}</Text>}
  {detail?<View key={detail.lesson_no}>
   <View style={s.card}><Button title="← Spis i wyszukiwanie" onPress={back}/><Text style={s.eyebrowDark}>LEKCJA {detail.lesson_no} · ROZDZIAŁ {detail.chapter_no}</Text><Text accessibilityRole="header" style={s.h1Dark}>{detail.title_pl}</Text><Text style={s.goal}>{detail.learning_goal}</Text><Text style={s.body}>{m.intro}</Text>{detail.editorial_status!=='approved'&&<Text style={s.warning}>Wersja robocza widoczna właścicielowi, nie kursantom.</Text>}<View style={s.row}><Button title={bookmarked?'Usuń z ulubionych':'Zapisz w ulubionych'} disabled={!markReady||saving} onPress={()=>void mark('bookmark')}/><Button title={read?'Cofnij oznaczenie przeczytania':'Oznacz jako przeczytane'} disabled={!markReady||saving} onPress={()=>void mark('read')}/></View></View>
   {(m.sections||[]).map((section:any,i:number)=><View key={i} style={s.card}><Text accessibilityRole="header" style={s.h2}>{section.heading}</Text>{(section.paragraphs||[]).map((p:string,j:number)=><Text key={j} selectable style={s.body}>{p}</Text>)}</View>)}
   {!m.sections?.length&&<Text selectable style={s.body}>{detail.body_text}</Text>}
   {(m.tables||[]).map((table:any,i:number)=><Table key={i} table={table}/>)}
   {(m.examples||[]).map((example:any,i:number)=><View key={i} style={s.card}><Text style={s.eyebrowDark}>PRZYKŁAD {i+1} · KROK PO KROKU</Text><Text accessibilityRole="header" style={s.h2}>{example.title}</Text>{(example.steps||[]).map((step:string,j:number)=><Text key={j} style={s.body}>{j+1}. {step}</Text>)}<Text style={s.goal}>{example.result}</Text></View>)}
   {!!m.practice&&<View style={s.task}><Text style={s.eyebrowDark}>TERAZ TY PRACUJESZ W BIURZE</Text><Text accessibilityRole="header" style={s.h2}>{m.practice.role}</Text><Text style={s.body}>{m.practice.task}</Text><Link href="/biuro-ksiegowe" style={s.link}>Otwórz własne biuro ćwiczeniowe →</Link><Text style={s.small}>Pracujesz na danych fikcyjnych. Otwarcie biura nie wprowadza za Ciebie dokumentów ani nie wysyła ich do urzędu.</Text></View>}
   {m.sheet&&<Table table={{title:'Formuły do ćwiczenia w arkuszu',columns:['Komórka','Wartość lub formuła'],rows:Object.entries(m.sheet).map(([k,v])=>[k,String(v)])}}/>}
   <View style={s.card}><Text accessibilityRole="header" style={s.h2}>Sprawdź, czy potrafisz to zastosować</Text><Text style={s.small}>Ćwiczenia samosprawdzające. Możesz wracać do wyjaśnień i ponawiać próby; nie zastępują egzaminu.</Text>{!answersReady&&<Text style={s.warning}>Nie odczytano wcześniejszych odpowiedzi. Odśwież lekcję przed zapisem nowych, aby nie zastąpić nieznanych danych.</Text>}{answersReady&&(m.exercises||[]).map((q:any)=><Practice key={`${detail.lesson_no}:${q.id}`} userId={userId} number={detail.lesson_no} exercise={q} initial={answerMap[q.id]||''}/>)}</View>
   <NotePanel key={`note:${detail.lesson_no}`} userId={userId} number={detail.lesson_no}/>
   {(m.takeaways||[]).length>0&&<View style={s.card}><Text accessibilityRole="header" style={s.h2}>Zabierz to ze sobą</Text>{m.takeaways.map((v:string,i:number)=><Text key={i} style={s.body}>{i+1}. {v}</Text>)}</View>}
   {(m.glossary_keys||[]).length>0&&<View style={s.card}><Text accessibilityRole="header" style={s.h2}>Pojęcia wyjaśnione od zera</Text><View style={s.row}>{m.glossary_keys.filter((key:any)=>typeof key==='string'&&/^[a-z0-9-]+$/.test(key)).map((key:string)=><Link key={key} href={{pathname:'/slownik-ksiegowego',params:{entry:key}}} style={s.link}>{key.replace(/^slownik-/,'').replace(/-/g,' ').toUpperCase()}</Link>)}</View></View>}
   <View style={s.card}><Text accessibilityRole="header" style={s.h2}>Źródła i zakres materiału</Text><Text style={s.small}>Data odniesienia materiału: {detail.legal_as_of||'nie podano'}. Sama data i lista odnośników nie potwierdzają aktualności prawa ani weryfikacji źródeł. Przed użyciem zasad podatkowych sprawdź oficjalne przepisy właściwe dla daty i sytuacji.</Text>{(m.sources||[]).map((source:any,i:number)=>{const url=sourceURL(source.url);return <View key={i} style={s.source}><Text style={s.label}>{source.title}</Text>{!!source.scope&&<Text style={s.small}>{source.scope}</Text>}{url&&<Button title="Otwórz źródło" onPress={()=>void Linking.openURL(url).catch(()=>setNotice('Nie udało się otworzyć źródła.'))}/>}</View>;})}</View>
   <View style={s.row}><Button title="Wróć do spisu" onPress={back}/><Button title="Wyszukaj kolejny temat" onPress={()=>{back();setMode('search');setApplied('');setQuery('');setPage(0);}}/></View>
  </View>:overview&&!opening?<View>
   <View style={s.card}><Text style={s.label}>Szukaj tematu, dokumentu lub problemu</Text><View style={s.row}><TextInput accessibilityLabel="Szukaj w encyklopedii" value={query} onChangeText={setQuery} onSubmitEditing={search} maxLength={120} placeholder="Np. częściowa wpłata, Wn Ma, KSeF" style={s.input}/><Button title="Szukaj" primary onPress={search}/></View><View style={s.row}><Button title="Archiwalny katalog" onPress={()=>{setMode('program');setPage(0);}}/><Button title="Moje ulubione lekcje" onPress={()=>{setMode('saved');setPage(0);}}/></View></View>
   {mode==='program'&&<View style={s.card}><Text accessibilityRole="header" style={s.h2}>Archiwalny katalog wcześniejszych materiałów</Text><Text style={s.small}>Ta lista zachowuje dotychczasowe lekcje i adresy. Obowiązujący układ nauki to 100 tematów w 10 działach.</Text><Link href="/program-ksiegowosci" style={s.link}>Otwórz aktualny program</Link><View style={s.sections}>{overview.sections.map(x=><Pressable key={x.section_no} accessibilityRole="button" accessibilityState={{selected:section===x.section_no}} onPress={()=>chooseSection(x.section_no)} style={[s.section,section===x.section_no&&s.selected]}><Text style={s.label}>{x.section_no}. {x.title_pl}</Text><Text style={s.small}>Rozdziały {(x.section_no-1)*100+1}–{x.section_no*100}</Text></Pressable>)}</View>{chaptersBusy?<ActivityIndicator/>:chapter===null?<View>{chapters.map(c=><Pressable key={c.chapter_no} accessibilityRole="button" disabled={!Number(c.authored_count)} onPress={()=>{setChapter(c.chapter_no);setPage(0);}} style={[s.chapter,!Number(c.authored_count)&&s.unavailable]}><Text style={s.label}>{c.chapter_no}. {c.title_pl}</Text><Text style={s.small}>{Number(c.authored_count)?`${c.authored_count} opracowanych w dawnym katalogu`:'Archiwalna pozycja planu — brak opracowanych lekcji'}</Text></Pressable>)}</View>:<View style={s.row}><Text style={s.label}>Rozdział {chapter}</Text><Button title="Zwiń i wybierz inny rozdział" onPress={()=>{setChapter(null);setPage(0);}}/></View>}</View>}
   {!!listError&&<Text accessibilityRole="alert" style={s.warning}>{listError}</Text>}{listBusy&&<ActivityIndicator/>}
   {(mode!=='program'||chapter!==null)&&!listBusy&&<View style={s.card}><Text accessibilityRole="header" style={s.h2}>{mode==='saved'?'Twoje ulubione lekcje':mode==='search'?'Wyniki wyszukiwania':'Lekcje w rozdziale'}</Text>{!items.length?<Text style={s.small}>Brak dostępnych pozycji dla tego wyboru. Nie pokazujemy pustych tytułów jako gotowych lekcji.</Text>:items.map(x=><Pressable key={x.lesson_no} accessibilityRole="button" onPress={()=>open(x.lesson_no)} style={s.chapter}><Text style={s.eyebrowDark}>LEKCJA {x.lesson_no}</Text><Text style={s.h2}>{x.title_pl}</Text><Text style={s.body}>{x.learning_goal}</Text>{x.editorial_status!=='approved'&&<Text style={s.small}>Wersja robocza — podgląd właściciela</Text>}</Pressable>)}<View style={s.row}><Button title="Poprzednia strona" disabled={page===0} onPress={()=>setPage(p=>Math.max(0,p-1))}/><Text style={s.small}>Strona {page+1} · do {PAGE_SIZE} lekcji</Text><Button title="Następna strona" disabled={!more} onPress={()=>setPage(p=>p+1)}/></View></View>}
  </View>:null}
 </View></ScrollView>;
}
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:'#f6f8f0'},pad:{padding:18,paddingBottom:55},wrap:{width:'100%',maxWidth:1040,alignSelf:'center',gap:14},row:{flexDirection:'row',flexWrap:'wrap',gap:12,alignItems:'center',marginVertical:8},link:{color:'#205434',fontSize:14,fontWeight:'800',paddingVertical:6},hero:{backgroundColor:'#183c2b',padding:26,borderRadius:22,gap:12},eyebrow:{color:'#d4e6c8',fontSize:11,fontWeight:'800',letterSpacing:1.3},h1:{color:'white',fontSize:31,fontWeight:'900',lineHeight:39},heroText:{color:'#e1edda',fontSize:16,lineHeight:25},summary:{padding:16,borderRadius:12,backgroundColor:'#e9f1df',gap:8},card:{backgroundColor:'white',padding:20,borderRadius:16,borderWidth:1,borderColor:'#dce6d5',gap:12,marginBottom:14},h1Dark:{fontSize:28,fontWeight:'900',color:'#183c2b',lineHeight:37},h2:{fontSize:20,fontWeight:'800',color:'#183c2b',lineHeight:28},body:{fontSize:16,lineHeight:28,color:'#23432f'},small:{fontSize:12,lineHeight:20,color:'#58705c'},label:{fontSize:14,lineHeight:23,fontWeight:'800',color:'#1e422d'},goal:{fontSize:16,lineHeight:27,color:'#244f33',backgroundColor:'#eef5e6',padding:12,borderRadius:10},button:{paddingHorizontal:15,paddingVertical:12,borderRadius:10,borderWidth:1,borderColor:'#c7d8bf',backgroundColor:'#edf4e5'},primary:{backgroundColor:'#183c2b',borderColor:'#183c2b'},buttonText:{fontSize:14,fontWeight:'800',color:'#214e31'},white:{fontSize:14,fontWeight:'800',color:'white'},disabled:{opacity:.45},input:{flexGrow:1,minWidth:180,borderWidth:1,borderColor:'#bcccaf',borderRadius:10,padding:13,fontSize:16,backgroundColor:'white',color:'#17392a'},note:{minHeight:140,borderWidth:1,borderColor:'#bcccaf',padding:14,borderRadius:10,fontSize:16,lineHeight:25,color:'#17392a'},notice:{backgroundColor:'#eaf3df',padding:14,borderRadius:10,gap:8,color:'#244f33'},warning:{backgroundColor:'#fff0e5',padding:14,borderRadius:10,color:'#873e24',fontSize:14,lineHeight:23},tableRow:{flexDirection:'row'},cell:{width:205,padding:12,borderBottomWidth:1,borderBottomColor:'#e0e8d9',fontSize:14,lineHeight:23,color:'#23432f'},tableHead:{fontWeight:'800',backgroundColor:'#edf4e5'},exercise:{paddingVertical:18,borderTopWidth:1,borderTopColor:'#dce6d5',gap:12},choice:{padding:13,borderWidth:1,borderColor:'#d1dfc7',borderRadius:10},selected:{backgroundColor:'#e6f1d8',borderColor:'#557b42'},task:{backgroundColor:'#e9f1df',padding:22,borderRadius:16,gap:12,marginBottom:14},eyebrowDark:{fontSize:11,fontWeight:'800',color:'#557649',letterSpacing:.8},sections:{flexDirection:'row',flexWrap:'wrap',gap:10},section:{flexGrow:1,flexBasis:280,borderWidth:1,borderColor:'#d3dfcb',padding:13,borderRadius:10,gap:6},chapter:{paddingVertical:15,paddingHorizontal:8,borderBottomWidth:1,borderBottomColor:'#e0e8d9',gap:7},unavailable:{opacity:.55},source:{borderTopWidth:1,borderTopColor:'#e1e8dc',paddingTop:12,gap:6}
});
