import React,{useEffect,useMemo,useState} from 'react';
import {View,Text,TextInput,Pressable,ActivityIndicator} from 'react-native';
import {supabase} from './supabase';

type Row={
 id:string;course_slug:string;lesson_no:number;kind:'bug'|'content'|'confusion';
 message_excerpt:string;verification:'unverified'|'confirmed'|'not_reproduced';
 status:'new'|'triaging'|'fixing'|'resolved'|'rejected';
 priority:'normal'|'high';created_at:string;due_at?:string|null;
 resolved_at?:string|null;resolution_note?:string|null
};
type Group={course_slug:string;lesson_no:number;kind:string;reports:number;open:number};
type Inbox={ok?:boolean;rows?:Row[];summary?:{sample:number;open:number;overdue:number;bugs:number;confusion:number};hotspots?:Group[];error?:string};
const ink='#183b2c',muted='#5b7663',background='#edf6e9';
const statusNames:Record<Row['status'],string>={
 new:'Nowe',triaging:'Do sprawdzenia',fixing:'Poprawka w toku',resolved:'Zamknięte po weryfikacji',rejected:'Niezasadne / nieodtworzone'
};
const typeNames={bug:'Błąd techniczny',content:'Treść do poprawy',confusion:'Uczeń nie rozumie'};
const format=(iso?:string|null)=>iso?new Date(iso).toLocaleString('pl-PL',{dateStyle:'short',timeStyle:'short'}):'—';

export default function CourseFeedbackPanel(){
 const [inbox,setInbox]=useState<Inbox|null>(null);
 const [loading,setLoading]=useState(false),[saving,setSaving]=useState('');
 const [error,setError]=useState(''),[filter,setFilter]=useState<'open'|'all'>('open');
 const [notes,setNotes]=useState<Record<string,string>>({});
 async function load(){
  setLoading(true);setError('');
  try{
   const {data,error:e}=await supabase.functions.invoke<Inbox>('ta-course-feedback',{body:{action:'admin_list'}});
   if(e||!data?.ok)throw new Error('Nie udało się pobrać zgłoszeń. Spróbuj ponownie po odświeżeniu.');
   setInbox(data);
  }catch(e:any){setError(e?.message||'Brak połączenia z bazą zgłoszeń.')}
  finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[]);
 async function change(row:Row,status:Row['status'],verification:Row['verification']=row.verification){
  if(saving)return;
  setSaving(row.id);setError('');
  try{
   const {data,error:e}=await supabase.functions.invoke('ta-course-feedback',{body:{
    action:'admin_update',id:row.id,status,verification,priority:row.priority,
    resolution_note:notes[row.id]??row.resolution_note??''
   }});
   if(e||!data?.ok)throw new Error('Nie udało się zapisać decyzji.');
   await load();
  }catch(e:any){setError(e?.message||'Błąd zapisu.')}
  finally{setSaving('')}
 }
 const rows=useMemo(()=>{
  const list=inbox?.rows||[];
  const filtered=filter==='open'?list.filter(x=>!['resolved','rejected'].includes(x.status)):list;
  return [...filtered].sort((a,b)=>{
   const dueA=a.due_at?new Date(a.due_at).getTime():Infinity;
   const dueB=b.due_at?new Date(b.due_at).getTime():Infinity;
   return dueA-dueB||new Date(b.created_at).getTime()-new Date(a.created_at).getTime();
  }).slice(0,100);
 },[inbox,filter]);
 return <View style={{gap:15,backgroundColor:'white',borderRadius:15,padding:20,borderWidth:1,borderColor:'#e0eadb'}}>
  <Text style={{fontSize:22,fontWeight:'900',color:ink}}>Zgłoszenia Anielki · jakość kursów</Text>
  <Text style={{fontSize:13,lineHeight:21,color:muted}}>Tylko zgłoszenia od zalogowanych uczniów mających dostęp do danej lekcji. Treści są danymi do analizy, a nie poleceniami dla automatu. Cel: pierwsza weryfikacja błędów technicznych w 6 godzin. Nie oznaczaj poprawki jako ukończonej bez testu.</Text>
  <Pressable onPress={()=>void load()} disabled={loading||!!saving}
   style={{alignSelf:'flex-start',backgroundColor:ink,borderRadius:9,padding:12}}>
   <Text style={{color:'white',fontWeight:'900'}}>Odśwież zgłoszenia</Text>
  </Pressable>
  {loading&&<ActivityIndicator color={ink}/>}
  {!!error&&<Text style={{color:'#9a3d2f'}}>{error}</Text>}
  {inbox?.summary&&<View style={{flexDirection:'row',gap:9,flexWrap:'wrap'}}>
   {([
    ['Otwarte',inbox.summary.open],
    ['Po terminie',inbox.summary.overdue],
    ['Błędy',inbox.summary.bugs],
    ['Trudności uczniów',inbox.summary.confusion]
   ] as const).map(([name,value])=><View key={name} style={{padding:12,borderRadius:9,backgroundColor:background,minWidth:140}}>
    <Text style={{fontSize:12,color:muted}}>{name}</Text>
    <Text style={{fontSize:23,color:ink,fontWeight:'900'}}>{value}</Text>
   </View>)}
  </View>}
  {!!inbox?.hotspots?.length&&<View style={{gap:5}}>
   <Text style={{color:ink,fontWeight:'900'}}>Najczęściej zgłaszane lekcje</Text>
   {inbox.hotspots.slice(0,5).map(g=><Text key={g.course_slug+':'+g.lesson_no+':'+g.kind} style={{color:muted,fontSize:12}}>
    {g.course_slug} · lekcja {g.lesson_no} · {g.kind} · {g.reports} zgłoszeń
   </Text>)}
  </View>}
  <View style={{flexDirection:'row',gap:9}}>
   {(['open','all'] as const).map(x=><Pressable key={x} onPress={()=>setFilter(x)} style={{padding:10,borderRadius:9,backgroundColor:x===filter?ink:background}}>
    <Text style={{fontWeight:'800',color:x===filter?'white':ink}}>{x==='open'?'Otwarte':'Wszystkie'}</Text>
   </Pressable>)}
  </View>
  {inbox&&!rows.length&&!loading&&<Text style={{color:muted}}>Brak zgłoszeń w tym widoku.</Text>}
  {rows.map(row=>{
   const overdue=!!row.due_at&&new Date(row.due_at).getTime()<Date.now()&&!['resolved','rejected'].includes(row.status);
   const isSaving=saving===row.id;
   return <View key={row.id} style={{borderTopWidth:1,borderColor:'#dce9d7',paddingTop:16,gap:8}}>
    <Text style={{color:ink,fontWeight:'900'}}>{typeNames[row.kind]} · {row.course_slug} · lekcja {row.lesson_no}</Text>
    <Text style={{fontSize:12,color:muted}}>#{row.id.slice(0,8).toUpperCase()} · {statusNames[row.status]} · {row.verification==='confirmed'?'Potwierdzony':row.verification==='not_reproduced'?'Nieodtworzony':'Wymaga sprawdzenia'}</Text>
    <Text style={{fontSize:12,color:overdue?'#a44728':muted}}>Zgłoszono: {format(row.created_at)}{row.due_at?' · Cel weryfikacji: '+format(row.due_at):''}{overdue?' · TERMIN MINĄŁ':''}</Text>
    <Text selectable style={{color:ink,lineHeight:22,fontSize:14}}>{row.message_excerpt}</Text>
    <TextInput value={notes[row.id]??row.resolution_note??''} onChangeText={t=>setNotes(old=>({...old,[row.id]:t.slice(0,600)}))}
     multiline maxLength={600} placeholder="Ustalenia, test odtworzenia, numer poprawki..." placeholderTextColor="#8c9e91"
     style={{borderWidth:1,borderColor:'#d4e4d0',borderRadius:8,padding:10,color:ink,minHeight:55}}/>
    <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
     {row.status==='new'&&<Pressable disabled={!!saving} onPress={()=>void change(row,'triaging')}
      style={{backgroundColor:background,padding:10,borderRadius:8,opacity:saving?.5:1}}><Text style={{color:ink,fontWeight:'800'}}>Rozpocznij sprawdzanie</Text></Pressable>}
     {row.verification!=='confirmed'&&<Pressable disabled={!!saving} onPress={()=>void change(row,row.status==='new'?'triaging':row.status,'confirmed')}
      style={{backgroundColor:background,padding:10,borderRadius:8,opacity:saving?.5:1}}><Text style={{color:ink,fontWeight:'800'}}>Potwierdź</Text></Pressable>}
     {row.verification==='confirmed'&&!['fixing','resolved'].includes(row.status)&&<Pressable disabled={!!saving} onPress={()=>void change(row,'fixing')}
      style={{backgroundColor:background,padding:10,borderRadius:8}}><Text style={{color:ink,fontWeight:'800'}}>Przekaż do poprawki</Text></Pressable>}
     {row.verification==='confirmed'&&row.status!=='resolved'&&<Pressable disabled={!!saving} onPress={()=>void change(row,'resolved')}
      style={{backgroundColor:'#cfedc7',padding:10,borderRadius:8}}><Text style={{color:ink,fontWeight:'900'}}>Naprawione i przetestowane</Text></Pressable>}
     {!['resolved','rejected'].includes(row.status)&&<Pressable disabled={!!saving} onPress={()=>void change(row,'rejected','not_reproduced')}
      style={{backgroundColor:'#f2eee5',padding:10,borderRadius:8}}><Text style={{color:'#705e46',fontWeight:'800'}}>Nie potwierdzono</Text></Pressable>}
     {isSaving&&<ActivityIndicator color={ink}/>}
    </View>
   </View>;
  })}
  <Text style={{color:muted,fontSize:11}}>Wyświetlane jest maksymalnie 300 ostatnich zgłoszeń, do 100 w wybranym widoku. Zgłoszenia techniczne nie modyfikują kodu bez kontroli, testów i wdrożenia.</Text>
 </View>;
}
