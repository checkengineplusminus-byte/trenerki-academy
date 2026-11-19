import React,{useEffect,useRef,useState} from 'react';
import {ActivityIndicator,Linking,Pressable,Text,TextInput,View} from 'react-native';
import {supabase} from '../supabase';

type Form={code:string;category:string;description:string};
type DraftRow={fields:Record<string,string>;version:number;updated_at:string};
const ink='#183d2c',muted='#57715e';
const questions=[
 {id:'scenario',label:'1. Co się wydarzyło?',hint:'Opisz wyłącznie fikcyjną sytuację firmy albo osoby.'},
 {id:'reason',label:'2. Dlaczego ten formularz?',hint:'Jaki rodzaj rozliczenia i okres? Sprawdź, czy dokument pasuje.'},
 {id:'amounts',label:'3. Dane wejściowe i kwoty',hint:'Zapisz przychody, koszty lub inne kwoty z zadania. Tylko dane fikcyjne.'},
 {id:'calculation',label:'4. Pokaż własne obliczenia',hint:'Pokaż działanie i wyjaśnij, skąd pochodzi wynik.'},
 {id:'review',label:'5. Co trzeba jeszcze sprawdzić?',hint:'Źródło danych, wersję formularza i datę obowiązywania zasad.'}
];
const buttonStyle={padding:12,minHeight:46,backgroundColor:'#e4f0dc',borderRadius:11,justifyContent:'center' as const};
export default function OfficialFormTrainingDraft({form,userId}:{form:Form;userId:string}){
 const [year,setYear]=useState(2025),[values,setValues]=useState<Record<string,string>>({}),[version,setVersion]=useState(0);
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[readError,setReadError]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[reload,setReload]=useState(0);
 const lock=useRef(false);
 useEffect(()=>{
  let live=true;setValues({});setVersion(0);setLoading(true);setReadError(false);setError('');setMessage('');
  if(!userId){setLoading(false);return()=>{live=false};}
  void supabase.from('ta_accounting_official_drafts').select('fields,version,updated_at')
    .eq('user_id',userId).eq('form_code',form.code).eq('tax_year',year).maybeSingle()
    .then(({data,error})=>{
     if(!live)return;
     if(error){setReadError(true);setError('Nie udało się odczytać wcześniejszej wersji szkicu. Nie zapisujemy niczego, dopóki nie potwierdzimy stanu konta.');return;}
     if(data){const row=data as DraftRow;setValues(row.fields&&typeof row.fields==='object'&&!Array.isArray(row.fields)?row.fields:{});setVersion(row.version);setMessage('Wczytano wcześniejszy zapis z Twojego konta.');}
    }).catch(()=>{if(live){setReadError(true);setError('Nie udało się połączyć z Twoim szkicem.');}})
    .finally(()=>{if(live)setLoading(false)});
  return()=>{live=false};
 },[form.code,userId,year,reload]);
 function edit(key:string,text:string){setValues(p=>({...p,[key]:text}));setError('');setMessage('');}
 async function save(){
  if(lock.current||loading||saving||readError||!userId)return;
  const fields=Object.fromEntries(questions.map(q=>[q.id,String(values[q.id]||'').slice(0,1500)]));
  if(Object.values(fields).every(x=>!x.trim())){setError('Wpisz choć jeden krok rozwiązania, aby zapisać prywatny szkic.');return;}
  lock.current=true;setSaving(true);setError('');setMessage('');
  try{
   const {data,error:problem}=await supabase.rpc('ta_accounting_official_draft_save',{
    p_form_code:form.code,p_tax_year:year,p_fields:fields,p_expected_version:version
   });
   if(problem||!data||!Number.isSafeInteger(data.version))throw problem||new Error('Serwer nie potwierdził zapisu.');
   setVersion(data.version);setValues(fields);
   setMessage('✓ Zapisano na koncie · wersja '+data.version+'. To wyłącznie ćwiczenie, nie złożona deklaracja.');
  }catch(e:any){
   const conflict=e?.code==='40001';
   if(conflict)setReadError(true); // Freeze stale version until learner explicitly reloads.
   setError(conflict?
    'Zapis odrzucony — w innym oknie jest nowsza wersja. Skopiuj własne odpowiedzi przed wczytaniem nowej wersji.':
    'Nie udało się zapisać szkicu. Zachowaj wpisane odpowiedzi i ponów próbę.');
  }finally{setSaving(false);lock.current=false;}
 }
 const primer=form.category==='PIT'?'Ustal źródło fikcyjnego dochodu oraz osobę, której dotyczy rozliczenie.':
  form.category==='CIT'?'Sprawdź formę prawną fikcyjnej firmy, zakres danych i rodzaj przychodów.':
  form.category==='VAT'?'Zacznij od transakcji, statusu podatnika, daty i źródłowego dokumentu.':
  'Ustal typ dokumentu, cel zgłoszenia i rodzaj danych.';
 return <View style={{backgroundColor:'#f2f8ed',borderWidth:1,borderColor:'#d1e3cc',borderRadius:15,padding:14,gap:11}}>
  <Text style={{fontSize:11,fontWeight:'900',color:'#57774b'}}>📝 SZKIC SZKOLENIOWY — NIE DEKLARACJA</Text>
  <Text style={{fontSize:20,color:ink,fontWeight:'900'}}>Wypełnij krok po kroku</Text>
  <Text style={{fontSize:14,lineHeight:22,color:muted}}>{primer}</Text>
  <View style={{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:8}}>
   <Text style={{fontWeight:'800',color:ink}}>Rok ćwiczenia</Text>
   {[2025,2026].map(y=><Pressable key={y} accessibilityRole="button" accessibilityState={{selected:y===year}} onPress={()=>setYear(y)}
    style={{...buttonStyle,backgroundColor:y===year?ink:'#e3eeda',minWidth:70,alignItems:'center'}}>
    <Text style={{fontWeight:'800',color:y===year?'white':ink}}>{y}</Text></Pressable>)}
  </View>
  <Text style={{fontSize:12,color:muted,lineHeight:19}}>Rok ćwiczenia nie wybiera automatycznie urzędowej wersji druku. Wydanie i datę sprawdź u Ministerstwa Finansów.</Text>
  {loading?<ActivityIndicator accessibilityLabel="Wczytywanie wcześniejszego szkicu"/>:
   questions.map(q=><View key={q.id} style={{backgroundColor:'white',padding:12,borderRadius:12,borderWidth:1,borderColor:'#d7e7d4',gap:7}}>
    <Text style={{fontSize:15,color:ink,fontWeight:'800'}}>{q.label}</Text>
    <Text style={{color:muted,fontSize:12,lineHeight:19}}>{q.hint}</Text>
    <TextInput multiline textAlignVertical="top" value={values[q.id]||''} maxLength={1500}
     editable={!saving} onChangeText={text=>edit(q.id,text)}
     placeholder={q.id==='calculation'?'Np. 1200 − 350 = 850 zł — wyjaśnij, co oznacza wynik.':'Wpisz własne wyjaśnienie…'}
     accessibilityLabel={q.label} style={{backgroundColor:'white',borderWidth:1,borderColor:'#b7d1b4',borderRadius:11,minHeight:77,padding:11,fontSize:16,lineHeight:23,color:ink}}/>
   </View>)}
  {!!error&&<View style={{backgroundColor:'#fff0e7',padding:12,borderRadius:10,gap:8}}>
   <Text accessibilityRole="alert" style={{color:'#873e28',lineHeight:20}}>{error}</Text>
   {readError&&<Pressable style={buttonStyle} accessibilityRole="button" onPress={()=>setReload(x=>x+1)}><Text style={{fontWeight:'800',color:ink}}>Ponów bezpieczny odczyt</Text></Pressable>}
  </View>}
  {!!message&&<Text accessibilityLiveRegion="polite" style={{fontSize:13,fontWeight:'700',color:'#21583a'}}>{message}</Text>}
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:9}}>
   <Pressable accessibilityRole="button" disabled={loading||saving||readError} onPress={()=>void save()}
    style={{...buttonStyle,backgroundColor:ink,flexGrow:1,alignItems:'center',opacity:(loading||saving||readError)?0.5:1}}>
    <Text style={{color:'white',fontWeight:'900'}}>{saving?'Zapisywanie…':'💾 Zapisz prywatny szkic'}</Text>
   </Pressable>
   <Pressable accessibilityRole="link" onPress={()=>void Linking.openURL('https://trenerki.com/biuro-ksiegowe')}
    style={{...buttonStyle,flexGrow:1,alignItems:'center'}}>
    <Text style={{color:ink,fontWeight:'800'}}>💬 Anielka w biurze</Text>
   </Pressable>
  </View>
  <Text style={{color:muted,fontSize:11,lineHeight:18}}>Wpisuj tylko dane fikcyjne. To notatnik ćwiczeniowy: nie zmienia urzędowego PDF, nie przesyła deklaracji i nie stanowi porady podatkowej.</Text>
 </View>;
}
