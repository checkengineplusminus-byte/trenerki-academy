import React,{useEffect,useState} from 'react';
import {Pressable,Text,TextInput,View} from 'react-native';
import {supabase} from './supabase';
import homework from '../content/autocad-homework-2026.json';

type Props={lessonNo:number;userId:string};
const ink='#1c4934',body='#355745';

export default function AutoCADHomework({lessonNo,userId}:Props){
 const assignment=homework.assignments[lessonNo];
 const [open,setOpen]=useState(true),[checks,setChecks]=useState<number[]>([]);
 const [notes,setNotes]=useState(''),[saving,setSaving]=useState(false),[loaded,setLoaded]=useState(false);
 const [status,setStatus]=useState(''),[savedComplete,setSavedComplete]=useState(false);
 useEffect(()=>{
  let active=true;
  setChecks([]);setNotes('');setStatus('');setSavedComplete(false);setLoaded(false);
  if(!userId||!assignment){setLoaded(true);return ()=>{active=false};}
  (async()=>{
   const {data,error}=await supabase.from('ta_autocad_homework')
    .select('note,steps_done,completed').eq('user_id',userId).eq('lesson_no',lessonNo).maybeSingle();
   if(!active)return;
   if(error){setStatus('Nie udało się odczytać zapisu. Możesz pracować dalej i spróbować zapisać później.');}
   else if(data){
    setNotes(String(data.note||'').slice(0,4000));
    setChecks(Array.isArray(data.steps_done)?data.steps_done.filter((n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<3):[]);
    setSavedComplete(!!data.completed);
   }
   setLoaded(true);
  })();
  return ()=>{active=false};
 },[lessonNo,userId]);
 if(!assignment)return null;
 const isDone=checks.length===3&&notes.trim().length>=20;
 const label=assignment.mode==='autocad'?'ORYGINALNY AUTOCAD — KOMPUTER':
  assignment.mode==='warsztat'?'MOŻESZ ĆWICZYĆ W TRENERKI':'WARSZTAT TRENERKI + AUTOCAD NA KOMPUTERZE';
 function toggleStep(i:number){
  setSavedComplete(false);setStatus('');
  setChecks(prev=>prev.includes(i)?prev.filter(n=>n!==i):[...prev,i].sort((a,b)=>a-b));
 }
 async function save(){
  if(saving||!userId){setStatus('Zaloguj się, aby zapisać pracę domową.');return;}
  setSaving(true);setStatus('');
  const {error}=await supabase.from('ta_autocad_homework').upsert({
   user_id:userId,lesson_no:lessonNo,note:notes.trim().slice(0,4000),
   steps_done:checks,completed:isDone,updated_at:new Date().toISOString()
  },{onConflict:'user_id,lesson_no'});
  if(error)setStatus('Nie zapisano: '+error.message.slice(0,160)+'. Nie zamykaj tej strony przed ponowną próbą.');
  else{setSavedComplete(isDone);setStatus(isDone?'Zapisano: praca domowa ukończona według Twojej kontroli.':'Zapisano szkic. Możesz wrócić i dokończyć później.');}
  setSaving(false);
 }
 return <View testID={'autocad-homework-'+lessonNo} style={{borderWidth:1,borderColor:'#c9e0d1',borderRadius:13,backgroundColor:'#f4faf5',marginVertical:15,overflow:'hidden'}}>
  <Pressable accessibilityRole="button" testID="autocad-homework-toggle" accessibilityState={{expanded:open}} onPress={()=>setOpen(v=>!v)}
   style={{padding:16,backgroundColor:'#e5f1e8',gap:6}}>
   <Text style={{fontSize:12,color:'#3c7153',fontWeight:'900'}}>PRACA DOMOWA · LEKCJA {lessonNo+1}/30 · {assignment.minutes} MIN</Text>
   <Text style={{fontWeight:'900',fontSize:18,color:ink}}>{assignment.title} {open?'↑':'↓'}</Text>
   <Text style={{color:'#3b6750',fontSize:13,fontWeight:'700'}}>{checks.length}/3 kroki · {savedComplete?'Zapisana jako ukończona':'do samodzielnego wykonania'}</Text>
  </Pressable>
  {open&&<View style={{padding:16,gap:13}}>
   <Text style={{fontWeight:'900',color:'#557049',fontSize:12}}>{label}</Text>
   <Text style={{fontSize:14,lineHeight:23,color:body}}>Wykonaj ćwiczenie samodzielnie. Odhacz każdy krok dopiero po zrobieniu go w programie. Możesz zapisać pracę częściową i wrócić później.</Text>
   {assignment.steps.map((step,i)=><Pressable key={i} testID={'autocad-homework-step-'+i} accessibilityRole="checkbox" accessibilityState={{checked:checks.includes(i)}}
    onPress={()=>toggleStep(i)} style={{flexDirection:'row',alignItems:'flex-start',gap:10,padding:12,borderRadius:9,backgroundColor:'white',borderWidth:1,borderColor:'#dbe8dc'}}>
    <Text style={{fontSize:20,color:checks.includes(i)?'#25844b':'#677e6b',fontWeight:'900'}}>{checks.includes(i)?'☑':'☐'}</Text>
    <Text style={{fontSize:14,lineHeight:23,color:body,flex:1}}>{i+1}. {step}</Text>
   </Pressable>)}
   <View style={{padding:12,borderRadius:9,backgroundColor:'#eaf4e8',gap:5}}>
    <Text style={{fontWeight:'900',color:ink}}>Prawidłowy wynik — porównaj</Text>
    <Text style={{color:body,lineHeight:23,fontSize:14}}>{assignment.expected}</Text>
   </View>
   <Text style={{color:body,lineHeight:22,fontSize:14}}><Text style={{fontWeight:'900'}}>Co zapisać w notatkach: </Text>{assignment.evidence}</Text>
   <Text style={{color:'#8a5327',lineHeight:21,fontSize:13}}><Text style={{fontWeight:'900'}}>Typowy błąd: </Text>{assignment.commonMistake}</Text>
   <Text style={{fontWeight:'900',fontSize:15,color:ink}}>Mój wynik i wnioski z zadania</Text>
   <TextInput testID="autocad-homework-notes" accessibilityLabel="Wyniki i notatki z pracy domowej AutoCAD"
    multiline numberOfLines={4} maxLength={4000} textAlignVertical="top"
    placeholder="Opisz, co narysowano, jakie wartości zmierzono, co było trudne i jak sprawdzono wynik..."
    value={notes} onChangeText={v=>{setSavedComplete(false);setNotes(v);}}
    style={{backgroundColor:'white',borderWidth:1,borderColor:'#bad5c5',borderRadius:9,padding:12,minHeight:94,fontSize:14,color:ink}}/>
   <Text style={{fontSize:12,color:'#53715c'}}>Praca jest ukończona po zaznaczeniu 3 kroków i wpisaniu co najmniej 20 znaków wniosków. Twoje notatki są prywatne i powiązane z kontem. Nie jest to automatyczna weryfikacja techniczna pliku DWG.</Text>
   <Pressable accessibilityRole="button" testID="autocad-homework-save" disabled={saving||!loaded} onPress={save}
    style={{padding:14,borderRadius:9,backgroundColor:saving||!loaded?'#a4b6a9':'#245d3d',alignItems:'center'}}>
    <Text style={{color:'white',fontWeight:'900',fontSize:14}}>{saving?'Zapisuję…':isDone?'Zapisz ukończoną pracę domową':'Zapisz szkic / postęp pracy'}</Text>
   </Pressable>
   {!!status&&<Text testID="autocad-homework-status" accessibilityLiveRegion="polite" style={{color:'#285d40',fontWeight:'700',lineHeight:22}}>{status}</Text>}
  </View>}
 </View>;
}
