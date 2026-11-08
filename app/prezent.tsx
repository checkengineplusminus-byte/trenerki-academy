import React,{useEffect,useState} from 'react';
import {ScrollView,View,Text,TextInput,Pressable,ActivityIndicator,Platform,Share} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
import {academyAction} from '../src/academyApi';
const ink='#173d2c',pale='#e9f4dc';
type Course={slug:string,title_pl:string,price_grosze:number};
export default function GiftPage(){
 const p=useLocalSearchParams<{course?:string;code?:string}>(),router=useRouter();
 const course=typeof p.course==='string'?p.course:'',linkCode=typeof p.code==='string'?p.code:'';
 const [recipient,setRecipient]=useState(''),[message,setMessage]=useState(''),[code,setCode]=useState(linkCode),[item,setItem]=useState<Course|null>(null),
 [ready,setReady]=useState(false),[isAdmin,setAdmin]=useState(false),[busy,setBusy]=useState(false),
 [link,setLink]=useState(''),[notice,setNotice]=useState(''),[sent,setSent]=useState(false),[status,setStatus]=useState('');
 useEffect(()=>{void (async()=>{
  try{
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){router.replace({pathname:'/konto',params:linkCode?{gift:linkCode}:{course,next:'gift'}});return;}
   const info=await academyAction('whoami');setAdmin(!!info.is_admin);
   if(course){const {data,error}=await supabase.from('ta_courses').select('slug,title_pl,price_grosze').eq('slug',course).eq('published',true).maybeSingle();if(error)throw error;if(data)setItem(data);}
  }catch(e:any){setNotice(e?.message||'Nie udało się pobrać prezentu.');}
  finally{setReady(true)}
 })()},[course,linkCode]);
 async function createGift(){
  if(!item||busy)return;setBusy(true);setNotice('');
  try{
   const result=await academyAction('create_gift',{course_slug:item.slug,recipient_email:recipient.trim(),message:message.trim()});
   setCode(result.code);setLink(result.link);setSent(!!result.email_sent);
   setStatus(result.mode==='free'?'free':'demo');
   setNotice(result.email_sent?'Prezent utworzony i wysłany na podany e-mail.':'Prezent gotowy! Skopiuj link lub udostępnij go samodzielnie. Automatyczna wysyłka e-mail nie jest jeszcze skonfigurowana.');
  }catch(e:any){setNotice(e?.message||'Nie udało się utworzyć prezentu.');}
  finally{setBusy(false)}
 }
 async function redeem(){
  if(busy)return;setBusy(true);setNotice('');
  try{const result=await academyAction('redeem_gift',{code:code.trim()});
   setNotice(result.mode==='demo'?'Odebrano testowy kurs (14 dni). To nie był zakup ani płatność.':'Prezent odebrany! Kurs czeka już na Twoim koncie.');
   router.replace('/moje-kursy');
  }catch(e:any){setNotice(e?.message||'Nie udało się odebrać prezentu.');}
  finally{setBusy(false)}
 }
 async function share(){
  if(!link)return;
  if(Platform.OS==='web'&&typeof navigator!=='undefined'&&navigator.clipboard?.writeText){
   try{await navigator.clipboard.writeText(link);setNotice('Link do prezentu skopiowany. Możesz wysłać go znajomemu.');return;}catch{}
  }
  try{await Share.share({message:'Mam dla Ciebie prezent od TRENERKI Academy: '+link});}catch{setNotice('Skopiuj widoczny link do prezentu.');}
 }
 const input={borderWidth:1,borderColor:'#cddfca',padding:14,borderRadius:12,color:ink,backgroundColor:'white',fontSize:15,marginTop:10} as const;
 return <ScrollView style={{backgroundColor:'#fcfcf7',flex:1}} contentContainerStyle={{padding:22,paddingBottom:50}}>
  <View style={{maxWidth:720,alignSelf:'center',width:'100%',gap:17}}>
   <Pressable onPress={()=>router.replace('/')}><Text style={{color:ink,fontWeight:'800'}}>← Katalog kursów</Text></Pressable>
   <Text style={{fontSize:12,color:'#67836c',fontWeight:'800',letterSpacing:1.5}}>TRENERKI ACADEMY · PREZENT</Text>
   <Text style={{fontSize:35,color:ink,fontWeight:'900'}}>Podaruj komuś mały krok do przodu. 🎁</Text>
   <Text style={{color:'#526c5b',lineHeight:24,fontSize:16}}>Nie zawsze trzeba kupować kolejny przedmiot. Czasem najwięcej znaczy zaproszenie do nauki, rozmowy albo zrobienia czegoś pierwszy raz.</Text>
   {!ready&&<ActivityIndicator/>}
   {!!item&&<View style={{backgroundColor:'white',padding:22,borderWidth:1,borderColor:'#e2e9d8',borderRadius:18,gap:12}}>
    <Text style={{color:'#73816c',fontWeight:'800',fontSize:12}}>KURS NA PREZENT</Text>
    <Text style={{fontSize:23,fontWeight:'900',color:ink}}>{item.title_pl}</Text>
    <Text style={{color:ink,fontWeight:'900',fontSize:23}}>{item.price_grosze===0?'GRATIS':'Cena katalogowa '+(item.price_grosze/100).toFixed(0)+' zł'}</Text>
    {item.price_grosze>0&&<View style={{backgroundColor:'#fff2dc',padding:14,borderRadius:12}}>
     <Text style={{color:'#7e6229',fontWeight:'800'}}>Voucher testowy — bez płatności</Text>
     <Text style={{color:'#7e6229',marginTop:5}}>Taki prezent może tworzyć tylko administrator; odbiorca będzie mógł przetestować kurs przez 14 dni. Nie ma wartości pieniężnej.</Text>
    </View>}
    {(item.price_grosze===0||isAdmin)&&<>
     <TextInput style={input} placeholder="E-mail obdarowanej osoby (opcjonalnie)" value={recipient} onChangeText={setRecipient} autoCapitalize="none" keyboardType="email-address"/>
     <TextInput style={[input,{minHeight:86,textAlignVertical:'top'}]} multiline value={message} maxLength={300} onChangeText={setMessage} placeholder="Kilka słów od Ciebie, np. „Pomyślałem o Tobie”"/>
     <Pressable disabled={busy} onPress={createGift} style={{backgroundColor:ink,borderRadius:12,padding:17,opacity:busy?.6:1}}>
      <Text style={{color:'white',fontWeight:'900',textAlign:'center'}}>{busy?'Tworzę prezent…':'Utwórz kartę podarunkową →'}</Text>
     </Pressable>
    </>}
    {item.price_grosze>0&&!isAdmin&&<Text style={{color:'#806b41'}}>Płatne karty podarunkowe włączymy po uruchomieniu płatności. Darmowy kurs Mikołaja możesz wysłać już teraz.</Text>}
   </View>}
   {!!link&&<View style={{backgroundColor:pale,borderRadius:18,padding:22,gap:10}}>
    <Text style={{color:ink,fontSize:20,fontWeight:'900'}}>Prezent gotowy!</Text>
    <Text style={{color:ink,fontWeight:'800'}}>Twój kod: {code}</Text>
    <Text style={{color:'#57775c'}} selectable>{link}</Text>
    <Pressable onPress={share} style={{backgroundColor:ink,padding:15,borderRadius:12}}><Text style={{color:'white',textAlign:'center',fontWeight:'800'}}>Udostępnij / skopiuj link →</Text></Pressable>
    <Text style={{color:'#607863',fontSize:12}}>Kod pokazujemy przy tworzeniu. Przechowuj link w bezpiecznym miejscu. {sent?'Wysłano również e-mail.':'Jeśli podałeś adres odbiorcy, można wysłać mu link samodzielnie.'}</Text>
   </View>}
   <View style={{backgroundColor:'white',padding:22,borderWidth:1,borderColor:'#e2e9d8',borderRadius:18,gap:12}}>
    <Text style={{fontSize:24,fontWeight:'900',color:ink}}>Masz kod od znajomego?</Text>
    <Text style={{color:'#5b755e'}}>Wpisz kod i odbierz wybrany kurs na swoim koncie. Jedna karta może zostać wykorzystana tylko raz.</Text>
    <TextInput style={input} value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="TA-..."/>
    <Pressable onPress={redeem} disabled={busy||!code.trim()} style={{padding:17,backgroundColor:ink,borderRadius:12,opacity:busy||!code.trim()?.5:1}}>
     <Text style={{textAlign:'center',fontWeight:'900',color:'white'}}>Odbierz prezent →</Text>
    </Pressable>
   </View>
   <Pressable onPress={()=>router.replace({pathname:'/prezent',params:{course:'swiety-mikolaj'}})} style={{backgroundColor:pale,padding:17,borderRadius:14}}>
    <Text style={{textAlign:'center',color:ink,fontWeight:'900'}}>🎅 Podaruj darmowy kurs Świętego Mikołaja</Text>
   </Pressable>
   {!!notice&&<Text style={{backgroundColor:'#f4efdd',color:'#6c603b',padding:16,borderRadius:12}}>{notice}</Text>}
   <Text style={{color:'#6f816f',fontSize:12,lineHeight:20}}>Karta podarunkowa do kursu bezpłatnego ma wartość 0 zł. Testowe karty do kursów płatnych nie są przedpłaconymi bonami ani dowodem zakupu.</Text>
  </View>
 </ScrollView>
}
