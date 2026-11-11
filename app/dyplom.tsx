import React,{useEffect,useState} from 'react';
import {ScrollView,View,Text,Pressable,ActivityIndicator,Platform,useWindowDimensions} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
import {downloadDiploma,type Diploma,type DiplomaLanguage} from '../src/diplomaApi';

const ink='#172336',gold='#aa7e36',soft='#d8bf88',paper='#fffefa';
export default function DiplomaPage(){
 const params=useLocalSearchParams<{course?:string;preview?:string}>(),slug=typeof params.course==='string'?params.course:'',router=useRouter();
 const {width}=useWindowDimensions(),dWidth=Math.min(850,Math.max(270,width-38)),scale=dWidth/842;
 const [cert,setCert]=useState<Diploma|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState('');
 const [language,setLanguage]=useState<DiplomaLanguage>('pl'),[downloading,setDownloading]=useState(false);
 const pl=language==='pl',font=(n:number)=>Math.max(7,Math.round(n*scale));
 useEffect(()=>{let active=true;(async()=>{
  try{
   if(!/^[a-z0-9_-]+$/.test(slug))throw new Error('Wybierz kurs, aby otworzyć dyplom.');
   const {data:{user},error:authError}=await supabase.auth.getUser();
   if(authError||!user){router.replace('/konto');return;}
   const {data,error:dbError}=await supabase.from('ta_certificates')
    .select('id,certificate_no,holder_name,title_pl,title_en,issued_at,is_demo')
    .eq('user_id',user.id).eq('course_slug',slug).is('revoked_at',null)
    .order('is_demo',{ascending:true}).order('issued_at',{ascending:false}).limit(1).maybeSingle();
   if(dbError)throw dbError;
   if(!data&&params.preview==='1'){
    const {data:info,error:ce}=await supabase.from('ta_courses').select('title_pl,certificate_pl,certificate_en').eq('slug',slug).maybeSingle();
    if(ce||!info)throw new Error('Nie znaleziono programu kursu.');
    const name=String(user.user_metadata?.full_name||'').trim();
    if(active)setCert({id:'preview-only',certificate_no:'WZÓR',holder_name:name||'Imię i nazwisko',
      title_pl:info.certificate_pl||info.title_pl,title_en:info.certificate_en||info.title_pl,
      issued_at:new Date().toISOString(),is_demo:true});
   }else{
    if(!data)throw new Error('Dyplom będzie dostępny po ukończeniu kursu i zaliczeniu egzaminu.');
    if(active)setCert(data as Diploma);
   }
  }catch(e:any){if(active)setError(e?.message||'Nie udało się otworzyć dyplomu.');}
  finally{if(active)setBusy(false);}
 })();return()=>{active=false};},[slug,params.preview]);
 async function download(){
  if(Platform.OS!=='web'||!cert||cert.id==='preview-only'||downloading)return;
  setDownloading(true);setError('');
  try{await downloadDiploma(cert.id,language);}catch(e:any){setError(e?.message||'Nie udało się pobrać PDF.');}
  finally{setDownloading(false);}
 }
 const date=cert?new Date(cert.issued_at).toLocaleDateString(pl?'pl-PL':'en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Warsaw'}):'';
 const raw=cert?(pl?cert.title_pl:cert.title_en):'';
 const title=raw.replace(/^Ukończenie (?:prywatnego )?(?:kursu|programu)\s*:\s*/i,'')
 .replace(/^(?:Completion of (?:the )?(?:private )?(?:course|programme)|Certificate of completion)\s*:\s*/i,'');
 return <ScrollView style={{flex:1,backgroundColor:'#fbfbf7'}} contentContainerStyle={{alignSelf:'center',width:'100%',maxWidth:940,padding:18,paddingBottom:64,gap:14}}>
  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
   <Pressable onPress={()=>router.push('/moje-dyplomy')}><Text style={{color:'#356a4b',fontWeight:'800'}}>← Moje dyplomy</Text></Pressable>
   {!!cert&&<View style={{flexDirection:'row',gap:8}}>
    {(['pl','en'] as const).map(lang=><Pressable key={lang} accessibilityRole="button" accessibilityState={{selected:language===lang}}
      onPress={()=>setLanguage(lang)} style={{backgroundColor:language===lang?ink:'#eaf1e5',padding:10,borderRadius:8}}>
     <Text style={{color:language===lang?'white':ink,fontWeight:'800'}}>{lang==='pl'?'Polski':'English'}</Text>
    </Pressable>)}
   </View>}
  </View>
  {busy&&<ActivityIndicator color={ink}/>}
  {!!error&&<Text style={{color:'#984837',padding:13,backgroundColor:'#fff1e8',borderRadius:9}}>{error}</Text>}
  {!!cert&&<View accessibilityLabel={(pl?'Dyplom ukończenia kursu: ':'Course completion diploma: ')+title}
    style={{width:dWidth,aspectRatio:842/595,backgroundColor:paper,borderColor:gold,borderWidth:1.5,padding:Math.max(7,9*scale),alignSelf:'center'}}>
   <View style={{flex:1,borderColor:soft,borderWidth:1,paddingHorizontal:Math.max(10,30*scale),paddingVertical:Math.max(6,12*scale),alignItems:'center',justifyContent:'space-between'}}>
    <View style={{alignItems:'center',gap:1}}>
     <Text style={{fontSize:font(14),fontFamily:'serif',letterSpacing:3*scale,fontWeight:'800',color:ink}}>TRENERKI</Text>
     <Text style={{fontSize:font(7),letterSpacing:2*scale,fontWeight:'700',color:gold}}>A C A D E M Y</Text>
    </View>
    <View style={{alignItems:'center',gap:Math.max(3,5*scale),width:'100%'}}>
     <Text style={{fontSize:font(30),fontFamily:'serif',letterSpacing:2*scale,color:ink}}>{pl?'DYPLOM':'DIPLOMA'}</Text>
     <View style={{width:'20%',height:1,backgroundColor:gold}}/>
     <Text style={{fontSize:font(12),fontFamily:'serif',color:ink}}>{pl?'Niniejszym potwierdza się, że':'This certifies that'}</Text>
     <Text adjustsFontSizeToFit numberOfLines={2} style={{fontSize:font(26),fontWeight:'700',fontFamily:'serif',color:ink,textAlign:'center'}}>{cert.holder_name||'—'}</Text>
     <View style={{width:'65%',height:1,backgroundColor:soft}}/>
     <Text style={{fontSize:font(11),color:'#555'}}>{pl?'ukończył(a) kurs':'has successfully completed the course'}</Text>
     <Text adjustsFontSizeToFit numberOfLines={2} style={{fontSize:font(18),fontFamily:'serif',fontWeight:'700',color:ink,textAlign:'center',maxWidth:'92%'}}>{title}</Text>
    </View>
    <View style={{width:'80%',height:1,backgroundColor:soft}}/>
    <View style={{width:'100%',flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:Math.max(6,25*scale)}}>
     <View style={{alignItems:'center',maxWidth:'40%',gap:3*scale}}>
      <Text style={{fontSize:font(8),color:'#555',letterSpacing:.3*scale}}>{pl?'DATA UKOŃCZENIA':'COMPLETION DATE'}</Text>
      <Text style={{fontSize:font(11),fontFamily:'serif',color:ink}}>{date}</Text>
     </View>
     <View style={{alignItems:'center',maxWidth:'55%',gap:3*scale}}>
      <Text style={{fontSize:font(8),color:'#555',letterSpacing:.3*scale}}>{pl?'NUMER DYPLOMU':'DIPLOMA NUMBER'}</Text>
      <Text style={{fontSize:font(11),fontFamily:'serif',color:ink}}>{cert.certificate_no}</Text>
     </View>
    </View>
    <View style={{width:'100%',flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:Math.max(6,20*scale)}}>
     <View style={{width:44*scale,height:44*scale,borderWidth:1.5,borderRadius:50,borderColor:gold,backgroundColor:'#faefcc',alignItems:'center',justifyContent:'center'}}>
      <Text style={{fontSize:font(23),color:gold}}>✦</Text>
     </View>
     <View style={{alignItems:'center',width:'42%',gap:2}}>
      <Text style={{fontSize:font(19),fontStyle:'italic',fontFamily:Platform.OS==='web'?'cursive':'serif',color:'#253e82'}}>Adrian Flaga</Text>
      <View style={{height:1,width:'90%',backgroundColor:gold}}/>
      <Text style={{fontSize:font(8),fontFamily:'serif',color:ink}}>Adrian Flaga</Text>
      <Text style={{fontSize:font(6),color:'#69645e'}}>{pl?'Założyciel TRENERKI Academy':'Founder, TRENERKI Academy'}</Text>
     </View>
    </View>
    {cert.is_demo&&<Text style={{fontSize:font(8),color:'#9d4e34',fontWeight:'800'}}>{pl?'WZÓR — NIEWAŻNY':'SAMPLE — NOT VALID'}</Text>}
   </View>
  </View>}
  {!!cert&&cert.id!=='preview-only'&&Platform.OS==='web'&&<Pressable onPress={()=>void download()} disabled={downloading} accessibilityRole="button"
    style={{backgroundColor:ink,padding:15,borderRadius:10}}>
   <Text style={{color:'white',textAlign:'center',fontWeight:'800'}}>{downloading?'Przygotowywanie PDF…':pl?'Pobierz dyplom PDF (PL)':'Download diploma PDF (EN)'}</Text>
  </Pressable>}
 </ScrollView>;
}
