import React,{useEffect,useState} from 'react';
import {ScrollView,View,Text,TextInput,Pressable,ActivityIndicator,Platform,Share,Linking} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
import {academyAction} from '../src/academyApi';
const ink='#173d2c',pale='#e9f4dc';
type Course={slug:string,title_pl:string,price_grosze:number};
export default function GiftPage(){
 const p=useLocalSearchParams<{course?:string;code?:string;checkout?:string}>(),router=useRouter();
 const course=typeof p.course==='string'?p.course:'',linkCode=typeof p.code==='string'?p.code:'';
 const [recipient,setRecipient]=useState(''),[message,setMessage]=useState(''),[code,setCode]=useState(linkCode),[item,setItem]=useState<Course|null>(null),
 [ready,setReady]=useState(false),[terms,setTerms]=useState(false),[busy,setBusy]=useState(false),
 [link,setLink]=useState(''),[notice,setNotice]=useState(''),[sent,setSent]=useState(false);
 useEffect(()=>{void (async()=>{
  try{
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){router.replace({pathname:'/konto',params:linkCode?{gift:linkCode}:{course,next:'gift'}});return;}
   if(course){const {data,error}=await supabase.from('ta_courses').select('slug,title_pl,price_grosze').eq('slug',course).eq('published',true).maybeSingle();if(error)throw error;if(data)setItem(data);}
  }catch(e:any){setNotice(e?.message||'Nie udało się pobrać prezentu.');}
  finally{setReady(true)}
 })()},[course,linkCode]);
 async function createGift(){
  if(!item||busy)return;setBusy(true);setNotice('');
  try{
   if(item.price_grosze>0){
    const {data,error}=await supabase.functions.invoke('ta-create-checkout',{body:{
     kind:'gift',course_slug:item.slug,recipient_email:recipient.trim(),message:message.trim(),accepted_terms:terms
    }});
    if(error||typeof data?.url!=='string'||!data.url.startsWith('https://checkout.stripe.com/')){
     let reason='';
     try{reason=(await (error as any)?.context?.json())?.error||'';}catch{}
     const errors:Record<string,string>={
      invalid_recipient_email:'Wpisz poprawny e-mail obdarowanej osoby.',
      payments_not_configured:'Płatności za karty podarunkowe są jeszcze zablokowane w konfiguracji serwera. Administrator może sprawdzić szczegóły w panelu TRENERKI.',
      payments_not_live:'Serwer nie ma poprawnego klucza Stripe LIVE. Zakup jest wstrzymany.',
      email_not_configured:'Brakuje konfiguracji Resend do wysyłania płatnych kart podarunkowych.',
      confirmed_login_required:'Zaloguj się i potwierdź adres e-mail, aby kupić prezent.',
      gift_creation_failed:'Nie udało się przygotować karty podarunkowej. Nie pobrano pieniędzy.',
      consent_required:'Zaakceptuj regulamin i warunki zakupu prezentu.',
      payment_provider_unavailable:'Stripe chwilowo nie przyjmuje tej płatności. Nie pobrano pieniędzy.',
      already_purchased:'Ten kurs jest już na Twoim koncie.',
      database_unavailable:'Chwilowy problem z bazą danych. Nie pobrano pieniędzy.'
     };
     throw new Error(errors[reason]||'Nie udało się rozpocząć płatności za prezent. Nie pobrano pieniędzy.');
    }
    if(Platform.OS==='web'&&typeof window!=='undefined')window.location.assign(data.url);
    else await Linking.openURL(data.url);
    return;
   }
   const result=await academyAction('create_gift',{course_slug:item.slug,recipient_email:recipient.trim(),message:message.trim()});
   setCode(result.code);setLink(result.link);setSent(!!result.email_sent);
   setNotice(result.email_sent?'Prezent utworzony i wysłany na podany e-mail.':'Prezent gotowy! Skopiuj link lub udostępnij go samodzielnie. Automatyczna wysyłka e-mail nie jest jeszcze skonfigurowana.');
  }catch(e:any){setNotice(e?.message||'Nie udało się utworzyć prezentu.');}
  finally{setBusy(false)}
 }
 async function redeem(){
  if(busy)return;setBusy(true);setNotice('');
  try{await academyAction('redeem_gift',{code:code.trim()});
   setNotice('Prezent odebrany! Kurs czeka już na Twoim koncie.');
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
   {p.checkout==='success'&&<Text style={{color:ink}}>Czekamy na potwierdzenie płatności ze Stripe. Po jego otrzymaniu wyślemy wiadomość do Ciebie i odbiorcy.</Text>}
   {!!item&&<View style={{backgroundColor:'white',padding:22,borderWidth:1,borderColor:'#e2e9d8',borderRadius:18,gap:12}}>
    <Text style={{color:'#73816c',fontWeight:'800',fontSize:12}}>KURS NA PREZENT</Text>
    <Text style={{fontSize:23,fontWeight:'900',color:ink}}>{item.title_pl}</Text>
    <Text style={{color:ink,fontWeight:'900',fontSize:23}}>{item.price_grosze===0?'GRATIS':'Cena katalogowa '+(item.price_grosze/100).toFixed(0)+' zł'}</Text>
    <TextInput style={input} placeholder={item.price_grosze>0?'E-mail obdarowanej osoby':'E-mail obdarowanej osoby (opcjonalnie)'} value={recipient} onChangeText={setRecipient} autoCapitalize="none" keyboardType="email-address"/>
    <TextInput style={[input,{minHeight:86,textAlignVertical:'top'}]} multiline value={message} maxLength={300} onChangeText={setMessage} placeholder="Dodaj krótką dedykację (opcjonalnie)"/>
    {item.price_grosze>0&&<>
     <Text style={{color:ink}}>Po potwierdzeniu płatności wyślemy prezent odbiorcy, a Tobie potwierdzenie zakupu. Odbiorca odbierze kurs na koncie z podanym adresem e-mail i dostanie dostęp na 12 miesięcy.</Text>
     <Pressable accessibilityRole="checkbox" accessibilityState={{checked:terms}} onPress={()=>setTerms(value=>!value)}><Text style={{color:ink}}>{terms?'☑':'☐'} Akceptuję regulamin i warunki zakupu karty.</Text></Pressable>
     <Pressable onPress={()=>Linking.openURL('https://trenerki.com/academy/regulamin.html')}><Text style={{color:ink,textDecorationLine:'underline'}}>Przeczytaj regulamin</Text></Pressable>
    </>}
    <Pressable disabled={busy||(item.price_grosze>0&&(!terms||!recipient.trim()))} onPress={createGift} style={{backgroundColor:ink,borderRadius:12,padding:17,opacity:busy||(item.price_grosze>0&&(!terms||!recipient.trim()))?0.5:1}}>
     <Text style={{color:'white',fontWeight:'900',textAlign:'center'}}>{busy?'Chwileczkę…':item.price_grosze===0?'Utwórz kartę podarunkową →':'Kupuję i płacę '+(item.price_grosze/100).toLocaleString('pl-PL')+' zł →'}</Text>
    </Pressable>
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
    <Pressable onPress={redeem} disabled={busy||!code.trim()} style={{padding:17,backgroundColor:ink,borderRadius:12,opacity:(busy||!code.trim())?0.5:1}}>
     <Text style={{textAlign:'center',fontWeight:'900',color:'white'}}>Odbierz prezent →</Text>
    </Pressable>
   </View>
   <Pressable onPress={()=>router.replace({pathname:'/prezent',params:{course:'swiety-mikolaj'}})} style={{backgroundColor:pale,padding:17,borderRadius:14}}>
    <Text style={{textAlign:'center',color:ink,fontWeight:'900'}}>🎅 Podaruj darmowy kurs Świętego Mikołaja</Text>
   </Pressable>
   {!!notice&&<Text style={{backgroundColor:'#f4efdd',color:'#6c603b',padding:16,borderRadius:12}}>{notice}</Text>}
   <Text style={{color:'#6f816f',fontSize:12,lineHeight:20}}>Karta jest przypisana do wybranego kursu i można ją wykorzystać raz.</Text>
  </View>
 </ScrollView>
}
