import React,{useEffect,useState} from 'react';
import {ScrollView,View,Text,Pressable,ActivityIndicator,Platform} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
type Diploma={id:string;certificate_no:string;holder_name:string;title_pl:string;title_en:string;issued_at:string;is_demo:boolean};
const ink='#17382b';
export default function DiplomaPage(){
 const {course}=useLocalSearchParams<{course?:string}>(),slug=typeof course==='string'?course:'',router=useRouter();
 const [cert,setCert]=useState<Diploma|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let active=true;(async()=>{
  try{
   if(!slug||!/^[a-z0-9_-]+$/.test(slug))throw new Error('Nie wybrano prawidłowego kursu.');
   const {data:{user},error:ue}=await supabase.auth.getUser();
   if(ue||!user){router.replace('/konto');return;}
   const {data,error:ce}=await supabase.from('ta_certificates')
    .select('id,certificate_no,holder_name,title_pl,title_en,issued_at,is_demo')
    .eq('user_id',user.id).eq('course_slug',slug).is('revoked_at',null).maybeSingle();
   if(ce)throw ce;if(!data)throw new Error('Dyplom nie został jeszcze wystawiony. Wróć do kursu i ukończ egzamin.');
   if(active)setCert(data as Diploma);
  }catch(e:any){if(active)setError(e.message||'Nie udało się pobrać dokumentu.');}
  finally{if(active)setBusy(false);}
 })();return()=>{active=false};},[slug]);
 const print=()=>{
  if(Platform.OS!=='web'||!cert)return;
  const root=globalThis as any;
  const escaped=(v:unknown)=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const issuedAt=new Date(cert.issued_at).toLocaleDateString('pl-PL',{day:'numeric',month:'long',year:'numeric'});
  const markup=[
   '<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Dyplom TRENERKI Academy</title>',
   '<style>@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{margin:0;font-family:Georgia,serif;color:#183d2d;background:#fff}',
   '.paper{border:7px double #63936e;min-height:265mm;padding:20mm 14mm;display:flex;flex-direction:column;align-items:center;justify-content:space-between;text-align:center}',
   '.brand{font:900 25px Arial;letter-spacing:7px}.sub{font:11px Arial;letter-spacing:2px;margin-top:8px;color:#567863}',
   '.title{font-size:37px;letter-spacing:2px;font-weight:bold}.name{font-size:33px;font-weight:bold;margin:16px auto;max-width:160mm;overflow-wrap:anywhere}',
   '.course{font-size:23px;font-weight:bold;line-height:1.4;max-width:165mm;margin:18px auto}',
   '.note{font:13px/1.65 Arial;color:#586f5b;max-width:170mm}.line{border-top:1px solid #bacfb9;width:100%;padding-top:12px}',
   '.demo{border:2px solid #b27336;color:#96501f;background:#fff4e5;font:900 18px Arial;padding:13px;margin:10px auto}',
   'p{margin:7px 0}button{font:700 14px Arial;background:#184a32;color:white;border:0;border-radius:9px;padding:13px 20px;margin:10px}',
   '@media print{button{display:none}.paper{border-width:7px}body{background:white}}</style></head><body>',
   '<div class="paper"><div><div class="brand">TRENERKI</div><div class="sub">ACADEMY · INDEPENDENT EDUCATION</div></div>',
   cert.is_demo?'<div class="demo">WZÓR TESTOWY — NIEWAŻNY</div>':'',
   '<div><div class="title">AUTORSKI DYPLOM</div>',
   '<p class="note">potwierdzenia ukończenia prywatnego kursu TRENERKI Academy</p>',
   '<p class="note">TRENERKI ACADEMY POTWIERDZA</p>',
   '<div class="name">'+escaped(cert.holder_name)+'</div>',
   '<p class="note">ukończenie programu edukacyjnego i zaliczenie wewnętrznego egzaminu wiedzy:</p>',
   '<div class="course">'+escaped(cert.title_pl.replace(/^Ukończenie (prywatnego )?kursu:\s*/i,''))+'</div></div>',
   '<div><p>Data ukończenia: <strong>'+escaped(issuedAt)+'</strong></p>',
   '<p>Numer dokumentu: '+escaped(cert.certificate_no)+'</p></div>',
   '<div class="line"><p class="note">Dyplom jest autorskim potwierdzeniem ukończenia prywatnego programu nauki. Może stanowić dodatkową informację w CV, ale nie jest kwalifikacją zawodową, certyfikatem państwowym, licencją, fagbrev ani formalnym uprawnieniem.</p>',
   '<p class="note"><strong>Wiedza i umiejętności są najważniejsze. Dyplom jest dodatkiem.</strong></p></div></div>',
   '<button onclick="window.print()">Drukuj lub zapisz jako PDF</button></body></html>'
  ].join('');
  const popup=root.window?.open?.('','_blank');
  if(!popup){setError('Przeglądarka zablokowała nową kartę dyplomu. Zezwól na wyskakujące okna i spróbuj ponownie.');return;}
  popup.opener=null;popup.document.open();popup.document.write(markup);popup.document.close();popup.focus();
 };
 const issued=cert?new Date(cert.issued_at).toLocaleDateString('pl-PL',{day:'numeric',month:'long',year:'numeric'}):'';
 return <ScrollView style={{backgroundColor:'#fbfbf6',flex:1}} contentContainerStyle={{padding:20,maxWidth:880,width:'100%',alignSelf:'center',paddingBottom:70,gap:14}}>
  <Pressable onPress={()=>router.push('/moje-kursy')}><Text style={{color:'#327449',fontWeight:'900'}}>← Moje kursy</Text></Pressable>
  {busy&&<ActivityIndicator color={ink}/>}
  {!!error&&<Text style={{color:'#9f423c',backgroundColor:'#fff2e8',borderRadius:10,padding:15}}>{error}</Text>}
  {!!cert&&<View style={{borderColor:'#7da480',borderWidth:2,padding:12,backgroundColor:'#f6f9ee',borderRadius:3}}>
   <View style={{minHeight:590,borderColor:'#b9cfaa',borderWidth:1,padding:29,alignItems:'center',justifyContent:'space-around',gap:20,backgroundColor:'#fffefb'}}>
    <View style={{alignItems:'center',gap:4}}>
     <Text style={{color:'#50765c',fontWeight:'900',fontSize:15,letterSpacing:4}}>TRENERKI</Text>
     <Text style={{color:'#6d8d76',fontWeight:'700',fontSize:11,letterSpacing:3}}>ACADEMY · INDEPENDENT EDUCATION</Text>
    </View>
    {cert.is_demo&&<View style={{backgroundColor:'#fff1dd',padding:15,borderRadius:7,borderWidth:1,borderColor:'#e2bb71',width:'100%'}}>
      <Text style={{textAlign:'center',color:'#8c4d20',fontWeight:'900',fontSize:19}}>WZÓR TESTOWY — NIEWAŻNY</Text>
      <Text style={{textAlign:'center',color:'#97633d',fontSize:12}}>Nie przedstawiać jako dokumentu ukończenia szkolenia</Text>
     </View>}
    <View style={{alignItems:'center',gap:12,width:'100%'}}>
     <Text style={{fontWeight:'900',color:ink,fontSize:34,textAlign:'center'}}>AUTORSKI DYPLOM</Text>
     <Text style={{color:'#52725a',fontSize:15,textAlign:'center'}}>potwierdzenia ukończenia prywatnego kursu</Text>
     <Text style={{color:'#44654b',fontSize:12,fontWeight:'800'}}>TRENERKI ACADEMY POTWIERDZA</Text>
     <Text style={{fontSize:29,color:ink,fontWeight:'900',textAlign:'center',lineHeight:38}}>{cert.holder_name}</Text>
     <Text style={{color:'#56725c',fontSize:13,textAlign:'center'}}>ukończenie programu edukacyjnego i zaliczenie wewnętrznego egzaminu wiedzy:</Text>
     <Text style={{color:ink,fontSize:20,fontWeight:'900',textAlign:'center',lineHeight:30}}>{cert.title_pl.replace(/^Ukończenie (prywatnego )?kursu:\s*/i,'')}</Text>
    </View>
    <View style={{width:'100%',alignItems:'center',gap:6}}>
     <Text style={{color:ink,fontWeight:'800'}}>Data zakończenia: {issued}</Text>
     <Text style={{color:'#526a5a',fontSize:12}}>Nr dyplomu: {cert.certificate_no}</Text>
    </View>
    <View style={{borderTopWidth:1,borderColor:'#b8ceae',paddingTop:13,gap:6,width:'100%'}}>
     <Text style={{textAlign:'center',fontSize:12,color:'#627866',lineHeight:19}}>Dyplom TRENERKI jest autorskim dokumentem dodatkowej edukacji, możliwym do wskazania w CV. Nie stanowi państwowego certyfikatu, kwalifikacji zawodowej, fagbrev, licencji ani formalnego uprawnienia.</Text>
     <Text style={{textAlign:'center',fontSize:12,fontWeight:'800',color:ink}}>Wiedza i umiejętności są najważniejsze. Dyplom jest dodatkiem.</Text>
    </View>
   </View>
  </View>}
  {!!cert&&Platform.OS==='web'&&<Pressable onPress={print} style={{backgroundColor:ink,borderRadius:12,padding:17}}>
   <Text style={{color:'white',textAlign:'center',fontWeight:'900'}}>Drukuj lub zapisz jako PDF w przeglądarce</Text>
  </Pressable>}
  {!!cert&&<Text style={{color:'#637c69',fontSize:12,lineHeight:19,textAlign:'center'}}>Imię i nazwisko na dokumencie są podane przez użytkownika. W razie błędu danych zgłoś potrzebę korekty operatorowi.</Text>}
 </ScrollView>;
}
