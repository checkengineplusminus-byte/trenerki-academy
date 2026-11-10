import React,{useEffect,useState} from 'react';
import {ScrollView,View,Text,Pressable,ActivityIndicator,Linking} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
import {academyAction} from '../src/academyApi';

type Course={slug:string,title_pl:string,description_pl:string|null,category_pl:string|null,price_grosze:number};
type Preview={curiosity:string,scenario:string,outcome_1:string,outcome_2:string,outcome_3:string,module_titles:string[],editorial_note:string,review_status:string,study_minutes:number|null,workshop_count:number|null};
const ink='#193a2c',muted='#5b7563',lime='#e6f3d6';
export default function Purchase(){
 const params=useLocalSearchParams<{course?:string}>(),slug=typeof params.course==='string'?params.course:'';
 const router=useRouter(),[item,setItem]=useState<Course|null>(null),[preview,setPreview]=useState<Preview|null>(null),
 [email,setEmail]=useState(''),[isAdmin,setIsAdmin]=useState(false),[busy,setBusy]=useState(true),
 [paying,setPaying]=useState(false),[owned,setOwned]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{let active=true;void (async()=>{
  if(!slug){setMessage('Wybierz kurs w katalogu.');setBusy(false);return;}
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser();
   if(authError||!user){router.replace({pathname:'/konto',params:{course:slug,next:'kup'}});return;}
   const [courseResult,previewResult,enrollmentResult,profile]=await Promise.all([
    supabase.from('ta_courses').select('slug,title_pl,description_pl,category_pl,price_grosze').eq('slug',slug).eq('published',true).maybeSingle(),
    supabase.from('ta_course_previews').select('curiosity,scenario,outcome_1,outcome_2,outcome_3,module_titles,editorial_note,review_status,study_minutes,workshop_count').eq('course_slug',slug).maybeSingle(),
    supabase.from('ta_enrollments').select('id,status').eq('course_slug',slug).eq('user_id',user.id).in('status',['active','demo']).gt('expires_at',new Date().toISOString()).limit(1),
    academyAction('whoami')
   ]);
   if(courseResult.error||!courseResult.data)throw courseResult.error||new Error('Nie odnaleziono kursu.');
   if(previewResult.error)throw previewResult.error;
   if(active){
    setItem(courseResult.data);setPreview(previewResult.data);setEmail(user.email||'');
    setOwned(enrollmentResult.data?.[0]?.status||'');setIsAdmin(!!profile.is_admin);
   }
  }catch(e:any){if(active)setMessage(e?.message||'Nie udało się pobrać danych kursu.');}
  finally{if(active)setBusy(false);}
 })();return()=>{active=false}},[slug]);
 async function checkout(){
  if(!item||paying)return;
  setPaying(true);setMessage('');
  try{
   if(item.price_grosze===0){
    const {data,error}=await supabase.functions.invoke('ta-enroll-free',{body:{course_slug:slug}});
    if(error){
     let code='';try{const context=(error as any).context;if(context?.json)code=String((await context.json()).error||'');}catch{}
     if(code==='already_enrolled_or_expired')throw new Error('Kurs jest już zapisany na Twoim koncie. Otwórz „Moje kursy”.');
     throw new Error('Nie udało się odebrać darmowego kursu. Spróbuj ponownie.');
    }
    if(!data?.ok)throw new Error('Nie udało się odebrać darmowego kursu.');
   }else{
    if(!isAdmin)throw new Error('Symulacja zakupu jest dostępna wyłącznie na koncie administratora. Na razie nie pobieramy prawdziwych płatności.');
    const result=await academyAction('demo_checkout',{course_slug:slug});
    if(!result?.ok)throw new Error('Nie udało się zakończyć symulacji.');
   }
   router.replace('/moje-kursy');
  }catch(e:any){setMessage(e?.message||'Operacja nie powiodła się.');}
  finally{setPaying(false)}
 }
 const price=item?(item.price_grosze/100).toLocaleString('pl-PL')+' zł':'';
 return <ScrollView style={{flex:1,backgroundColor:'#fcfcf7'}} contentContainerStyle={{padding:22,paddingBottom:60}}>
  <View style={{maxWidth:820,width:'100%',alignSelf:'center',gap:18}}>
   <Pressable onPress={()=>router.replace('/')}><Text style={{color:ink,fontWeight:'800'}}>← Wróć do katalogu</Text></Pressable>
   <Text style={{fontSize:11,color:'#618067',letterSpacing:2,fontWeight:'800'}}>TRENERKI ACADEMY · TWOJA DECYZJA</Text>
   <Text style={{fontSize:37,fontWeight:'900',color:ink}}>Najpierw poznaj. Potem zdecyduj.</Text>
   <Text style={{fontSize:16,color:muted,lineHeight:25}}>Nie kupujesz w ciemno. Zobacz, czego nauczysz się na przykładach z prawdziwego życia — i dopiero wtedy wybierz kurs.</Text>
   {busy&&<ActivityIndicator/>}
   {!!item&&<>
    <View style={{borderRadius:19,backgroundColor:'white',borderWidth:1,borderColor:'#dbe8d9',padding:23,gap:11}}>
     <Text style={{fontSize:12,color:'#6b8d70',fontWeight:'800'}}>{item.category_pl||'KURS ONLINE'} · {preview?.module_titles?.length||0} LEKCJI</Text>
     {!!preview?.study_minutes&&<Text style={{color:muted,fontWeight:'800'}}>Około {Math.floor(preview.study_minutes/60)} godz.{preview.study_minutes%60?' '+preview.study_minutes%60+' min':''} · {preview.workshop_count} {preview.workshop_count===4?'pracownie':'pracowni'}</Text>}
     <Text style={{fontSize:26,fontWeight:'900',color:ink}}>{item.title_pl}</Text>
     <Text style={{fontSize:15,color:muted,lineHeight:24}}>{item.description_pl}</Text>
     <Text style={{fontSize:27,fontWeight:'900',color:ink}}>{item.price_grosze===0?'GRATIS':price}</Text>
    </View>
    {!!preview&&<>
     <View style={{borderRadius:18,backgroundColor:lime,padding:24,gap:12}}>
      <Text style={{fontWeight:'800',fontSize:12,color:'#5c795c'}}>CIEKAWOSTKA NA POCZĄTEK</Text>
      <Text style={{fontWeight:'800',fontSize:23,color:ink,lineHeight:32}}>{preview.curiosity}</Text>
      <Text style={{fontWeight:'700',color:ink,fontSize:15,lineHeight:24}}>Wyobraź sobie taką sytuację:</Text>
      <Text style={{fontSize:16,color:'#496851',lineHeight:25}}>{preview.scenario}</Text>
     </View>
     <View style={{backgroundColor:'white',borderRadius:18,borderWidth:1,borderColor:'#dfe8d9',padding:23,gap:14}}>
      <Text style={{fontSize:24,fontWeight:'900',color:ink}}>Czego naprawdę się nauczysz?</Text>
      {[preview.outcome_1,preview.outcome_2,preview.outcome_3].map((t,i)=><View key={i} style={{flexDirection:'row',gap:12}}>
       <Text style={{fontSize:21,color:'#6d9e59',fontWeight:'900'}}>✓</Text><Text style={{color:'#3a5945',fontSize:15,flex:1,lineHeight:24}}>{t}</Text>
      </View>)}
     </View>
     <View style={{backgroundColor:'#f0f5eb',padding:18,borderRadius:12,gap:8}}>
      <Text style={{fontWeight:'900',color:ink}}>Ważne zasady tego kursu</Text>
      <Text style={{color:'#3f5b49',lineHeight:22}}>{preview.editorial_note}</Text>
      {preview.review_status!=='approved'&&<Text style={{fontSize:12,color:'#87622b'}}>Weryfikacja redakcyjna materiału trwa.</Text>}
     </View>
     {!!preview.module_titles?.length&&<View style={{backgroundColor:'white',borderRadius:18,borderWidth:1,borderColor:'#dfe8d9',padding:23,gap:12}}>
      <Text style={{fontSize:23,fontWeight:'900',color:ink,marginBottom:6}}>{preview.module_titles.length} lekcji · {preview.module_titles.length===30?'3 działy od zera do Expert':'program ćwiczeń'}</Text>
      {preview.module_titles.map((name,i)=><View key={String(i)} style={{flexDirection:'row',gap:12,alignItems:'center',paddingVertical:6,borderBottomWidth:i===preview.module_titles.length-1?0:1,borderColor:'#eff2ed'}}>
       <Text style={{color:'#73945f',fontWeight:'800',fontSize:16}}>{String(i+1).padStart(2,'0')}</Text><Text style={{fontSize:14,color:ink,flex:1}}>{name}</Text>
      </View>)}
     </View>}
    </>}
    <View style={{backgroundColor:'white',borderRadius:19,borderWidth:1,borderColor:'#dce9d9',padding:24,gap:12}}>
     <Text style={{fontSize:22,fontWeight:'900',color:ink}}>Twój wybór</Text>
     <Text style={{color:muted}}>Zalogowano: {email}</Text>
     <Text style={{fontSize:23,fontWeight:'900',color:ink}}>Cena katalogowa: {item.price_grosze===0?'0 zł':price}</Text>
     {item.price_grosze>0&&!owned&&<View style={{backgroundColor:'#f6f0dc',borderRadius:12,padding:14}}>
      <Text style={{color:'#765d25',fontWeight:'900'}}>{isAdmin?'TRYB TESTOWY · 0 ZŁ POBRANE':'Zapisy na płatne kursy są w przygotowaniu'}</Text>
      {isAdmin&&<Text style={{color:'#786337',fontSize:13,marginTop:6,lineHeight:20}}>Po symulacji kurs pojawi się w „Moich kursach” jako DEMO na 14 dni.</Text>}
     </View>}
     {!!owned?<Pressable onPress={()=>router.replace({pathname:'/nauka',params:{course:slug}})} style={{padding:17,backgroundColor:ink,borderRadius:12}}>
      <Text style={{color:'white',fontWeight:'900',textAlign:'center'}}>Masz dostęp — rozpocznij naukę →</Text>
     </Pressable>:(item.price_grosze===0||isAdmin)&&<Pressable disabled={paying} onPress={checkout} style={{padding:17,backgroundColor:ink,borderRadius:12,opacity:paying?0.5:1}}>
      <Text style={{color:'white',fontWeight:'900',textAlign:'center',fontSize:16}}>{paying?'Zapisuję dostęp…':item.price_grosze===0?'Odbierz za darmo →':'Symuluj zakup · 0 zł pobrane →'}</Text>
     </Pressable>}
     {(item.price_grosze===0||isAdmin)&&<Pressable onPress={()=>router.push({pathname:'/prezent',params:{course:slug}})} style={{padding:15,backgroundColor:lime,borderRadius:12}}>
      <Text style={{color:ink,fontWeight:'800',textAlign:'center'}}>🎁 Podaruj ten kurs komuś bliskiemu</Text>
     </Pressable>}
     <Pressable onPress={()=>Linking.openURL('https://trenerki-academy.expo.app/academy/regulamin.html')}>
      <Text style={{fontSize:13,color:muted,textDecorationLine:'underline',textAlign:'center'}}>Regulamin i zasady dostępu ↗</Text>
     </Pressable>
    </View>
   </>}
   {!!message&&<View style={{backgroundColor:'#fff2dc',padding:17,borderRadius:12}}><Text style={{color:'#805f2e'}}>{message}</Text></View>}
   <Pressable onPress={()=>router.replace('/moje-kursy')} style={{padding:12}}><Text style={{color:ink,textAlign:'center',fontWeight:'800'}}>Moje kursy</Text></Pressable>
  </View>
 </ScrollView>;
}
