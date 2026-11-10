import React,{useEffect,useState} from 'react';
import {ScrollView,View,Text,Pressable,ActivityIndicator,Platform} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
import {downloadDiploma,type Diploma,type DiplomaLanguage} from '../src/diplomaApi';
const ink='#17382b';
export default function DiplomaPage(){
 const {course,preview}=useLocalSearchParams<{course?:string;preview?:string}>(),slug=typeof course==='string'?course:'',router=useRouter();
 const [cert,setCert]=useState<Diploma|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState('');
 const [language,setLanguage]=useState<DiplomaLanguage>('pl'),[downloading,setDownloading]=useState(false);
 const polish=language==='pl';
 useEffect(()=>{let active=true;(async()=>{
  try{
   if(!slug||!/^[a-z0-9_-]+$/.test(slug))throw new Error('Nie wybrano prawidłowego kursu.');
   const {data:{user},error:ue}=await supabase.auth.getUser();
   if(ue||!user){router.replace('/konto');return;}
   const {data,error:ce}=await supabase.from('ta_certificates')
    .select('id,certificate_no,holder_name,title_pl,title_en,issued_at,is_demo')
    .eq('user_id',user.id).eq('course_slug',slug).is('revoked_at',null).order('is_demo').order('issued_at',{ascending:false}).limit(1).maybeSingle();
   if(ce)throw ce;
   if(!data&&preview==='1'){
    const {data:courseInfo,error:courseError}=await supabase.from('ta_courses').select('title_pl,certificate_pl,certificate_en').eq('slug',slug).maybeSingle();
    if(courseError||!courseInfo)throw new Error('Nie znaleziono kursu do podglądu wzoru.');
    const fullName=typeof user.user_metadata?.full_name==='string'?user.user_metadata.full_name.trim():'';
    if(active)setCert({
     id:'preview-only',certificate_no:'WZÓR — BEZ NUMERU',holder_name:fullName||'Imię i nazwisko kursanta',
     title_pl:courseInfo.certificate_pl||courseInfo.title_pl,title_en:courseInfo.certificate_en||'',
     issued_at:new Date().toISOString(),is_demo:true
    });
   }else{
    if(!data)throw new Error('Dyplom nie został jeszcze wystawiony. Wróć do kursu i ukończ egzamin.');
    if(active)setCert(data as Diploma);
   }
  }catch(e:any){if(active)setError(e.message||'Nie udało się pobrać dokumentu.');}
  finally{if(active)setBusy(false);}
 })();return()=>{active=false};},[slug,preview]);
 async function download(){
  if(Platform.OS!=='web'||!cert||cert.id==='preview-only'||downloading)return;
  setDownloading(true);setError('');
  try{await downloadDiploma(cert.id,language);}
  catch(e){setError(e instanceof Error?e.message:'Nie udało się pobrać PDF. Spróbuj ponownie.');}
  finally{setDownloading(false);}
 }
 const issued=cert?new Date(cert.issued_at).toLocaleDateString(polish?'pl-PL':'en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Warsaw'}):'';
 const courseTitle=cert?(polish?cert.title_pl.replace(/^Ukończenie (?:prywatnego )?(?:kursu|programu)\s*:\s*/i,''):cert.title_en.replace(/^(?:Completion of (?:the )?(?:private )?(?:course|programme)|Certificate of completion)\s*:\s*/i,'')):'';
 return <ScrollView style={{backgroundColor:'#fbfbf6',flex:1}} contentContainerStyle={{padding:20,maxWidth:880,width:'100%',alignSelf:'center',paddingBottom:70,gap:14}}>
  <Pressable onPress={()=>router.push('/moje-kursy')}><Text style={{color:'#327449',fontWeight:'900'}}>← Moje kursy</Text></Pressable>
  {busy&&<ActivityIndicator color={ink}/>}
  {!!error&&<Text style={{color:'#9f423c',backgroundColor:'#fff2e8',borderRadius:10,padding:15}}>{error}</Text>}
  {!!cert&&<View style={{flexDirection:'row',gap:8}}>
   {(['pl','en'] as const).map(option=><Pressable key={option} accessibilityRole="button" accessibilityState={{selected:language===option}}
    onPress={()=>setLanguage(option)} style={{padding:12,borderRadius:9,backgroundColor:language===option?ink:'#e9f1e4'}}>
    <Text style={{fontWeight:'800',color:language===option?'white':ink}}>{option==='pl'?'Polski':'English'}</Text>
   </Pressable>)}
  </View>}
  {!!cert&&<View style={{borderColor:'#7da480',borderWidth:2,padding:12,backgroundColor:'#f6f9ee',borderRadius:3}}>
   <View style={{minHeight:590,borderColor:'#b9cfaa',borderWidth:1,padding:29,alignItems:'center',justifyContent:'space-around',gap:20,backgroundColor:'#fffefb'}}>
    <View style={{alignItems:'center',gap:4}}>
     <Text style={{color:'#50765c',fontWeight:'900',fontSize:15,letterSpacing:4}}>TRENERKI</Text>
     <Text style={{color:'#6d8d76',fontWeight:'700',fontSize:11,letterSpacing:3}}>ACADEMY · INDEPENDENT EDUCATION</Text>
    </View>
    {cert.is_demo&&<View style={{backgroundColor:'#fff1dd',padding:15,borderRadius:7,borderWidth:1,borderColor:'#e2bb71',width:'100%'}}>
      <Text style={{textAlign:'center',color:'#8c4d20',fontWeight:'900',fontSize:19}}>{polish?'WZÓR TESTOWY — NIEWAŻNY':'TEST SAMPLE — NOT VALID'}</Text>
      <Text style={{textAlign:'center',color:'#97633d',fontSize:12}}>{polish?'Wersja demonstracyjna':'Demonstration copy'}</Text>
     </View>}
    <View style={{alignItems:'center',gap:12,width:'100%'}}>
     <Text style={{fontWeight:'900',color:ink,fontSize:34,textAlign:'center'}}>{polish?'Dyplom ukończenia':'Certificate of Completion'}</Text>
     <Text style={{color:'#52725a',fontSize:15,textAlign:'center'}}>{polish?'Prywatny program edukacyjny':'Private education programme'}</Text>
     <Text style={{color:'#44654b',fontSize:12,fontWeight:'800'}}>TRENERKI ACADEMY</Text>
     <Text style={{fontSize:29,color:ink,fontWeight:'900',textAlign:'center',lineHeight:38}}>{cert.holder_name}</Text>
     <Text style={{color:'#56725c',fontSize:13,textAlign:'center'}}>{polish?'Potwierdza ukończenie kursu i zaliczenie egzaminu wewnętrznego':'Confirms completion of the course and passing its internal exam'}</Text>
     <Text style={{color:ink,fontSize:20,fontWeight:'900',textAlign:'center',lineHeight:30}}>{courseTitle}</Text>
    </View>
    <View style={{width:'100%',alignItems:'center',gap:6}}>
     <Text style={{color:ink,fontWeight:'800'}}>{polish?'Data ukończenia':'Date of completion'} · {issued}</Text>
     <Text style={{color:'#526a5a',fontSize:12}}>{polish?'Numer dokumentu':'Document number'} · {cert.certificate_no}</Text>
    </View>
    <View style={{borderTopWidth:1,borderColor:'#b8ceae',paddingTop:13,gap:6,width:'100%'}}>
     <Text style={{textAlign:'center',fontSize:12,color:'#627866',lineHeight:19}}>{polish?'Dokument potwierdza ukończenie prywatnego kursu edukacyjnego. Nie nadaje kwalifikacji zawodowych ani państwowych uprawnień.':'This document confirms completion of a private education course. It does not confer a professional qualification or a state licence.'}</Text>
    </View>
   </View>
  </View>}
  {!!cert&&cert.id!=='preview-only'&&Platform.OS==='web'&&<Pressable accessibilityRole="button" disabled={downloading} onPress={()=>void download()} style={{backgroundColor:ink,borderRadius:12,padding:17}}>
   <Text style={{color:'white',textAlign:'center',fontWeight:'900'}}>{downloading?'Przygotowuję PDF…':polish?'Pobierz dyplom PDF (PL)':'Download certificate PDF (EN)'}</Text>
  </Pressable>}
  {!!cert&&<Text style={{color:'#637c69',fontSize:12,lineHeight:19,textAlign:'center'}}>Imię i nazwisko na dokumencie są podane przez użytkownika. W razie błędu danych zgłoś potrzebę korekty operatorowi.</Text>}
 </ScrollView>;
}
