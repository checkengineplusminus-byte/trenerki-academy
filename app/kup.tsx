import React,{useEffect,useState} from 'react';
import {ScrollView,View,Text,Pressable,ActivityIndicator,Linking,Platform} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
import PurchaseLegalLinks from '../src/PurchaseLegalLinks';
import {coursePrice,termsVersion} from '../src/courseQuote';

type Course={slug:string,title_pl:string,description_pl:string|null,category_pl:string|null,price_grosze:number};
type Preview={curiosity:string,scenario:string,outcome_1:string,outcome_2:string,outcome_3:string,module_titles:string[],editorial_note:string};
const ink='#193a2c',muted='#5b7563',lime='#e6f3d6';
export default function Purchase(){
 const params=useLocalSearchParams<{course?:string}>(),slug=typeof params.course==='string'?params.course:'';
 const router=useRouter(),[item,setItem]=useState<Course|null>(null),[preview,setPreview]=useState<Preview|null>(null),
 [email,setEmail]=useState(''),[termsAccepted,setTermsAccepted]=useState(false),[earlyAccessConsent,setEarlyAccessConsent]=useState(false),[busy,setBusy]=useState(true),
 [paying,setPaying]=useState(false),[owned,setOwned]=useState(''),[message,setMessage]=useState('');
 const [creditBalance,setCreditBalance]=useState(0),[applyCredit,setApplyCredit]=useState(true),[quote,setQuote]=useState<{slug:string;price:number}|null>(null);
 const quoted=quote?.slug===slug?quote.price:null;
 const [quoteLoading,setQuoteLoading]=useState(false);
 async function loadQuote(){
  setQuoteLoading(true);setQuote(null);
  try{
   const [price,wallet]=await Promise.all([coursePrice(slug),supabase.functions.invoke('ta-credit',{body:{action:'balance'}})]);
   if(wallet.error||!wallet.data?.ok)throw new Error('Nie udało się sprawdzić salda. Spróbuj ponownie.');
   setQuote({slug,price});setCreditBalance(Number(wallet.data.available_grosze));
  }catch(e:any){setMessage(e.message);}
  finally{setQuoteLoading(false);}
 }
 useEffect(()=>{let active=true;void (async()=>{
  if(!slug){setMessage('Wybierz kurs w katalogu.');setBusy(false);return;}
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser();
   if(authError||!user){router.replace({pathname:'/konto',params:{course:slug,next:'kup'}});return;}
   const [courseResult,previewResult,enrollmentResult]=await Promise.all([
    supabase.from('ta_courses').select('slug,title_pl,description_pl,category_pl,price_grosze').eq('slug',slug).eq('published',true).maybeSingle(),
    supabase.from('ta_course_previews').select('curiosity,scenario,outcome_1,outcome_2,outcome_3,module_titles,editorial_note').eq('course_slug',slug).maybeSingle(),
    supabase.from('ta_enrollments').select('id,status').eq('course_slug',slug).eq('user_id',user.id).eq('status','active').gt('expires_at',new Date().toISOString()).limit(1),
   ]);
   if(courseResult.error||!courseResult.data)throw courseResult.error||new Error('Nie odnaleziono kursu.');
   if(previewResult.error)throw previewResult.error;
   if(active){
    setItem(courseResult.data);setPreview(previewResult.data);setEmail(user.email||'');
    setOwned(enrollmentResult.data?.[0]?.status||'');
    if(courseResult.data.price_grosze>0&&!enrollmentResult.data?.length)void loadQuote();
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
    if(error||!data?.ok)throw new Error('Nie udało się odebrać darmowego kursu. Sprawdź konto i spróbuj ponownie.');
    router.replace('/moje-kursy');return;
   }
   if(quoted===null)throw new Error('Odśwież aktualną cenę przed zakupem.');
   if(!termsAccepted||!earlyAccessConsent)throw new Error('Zaznacz obie wymagane zgody przed płatnością.');
   // The server atomically reserves wallet funds, or grants a fully covered course.
   if(effectiveCredit>0){
    const {data:wallet,error:walletError}=await supabase.functions.invoke('ta-credit',{body:{
     action:'purchase_course',course_slug:slug,accepted_terms:true,immediate_content_consent:true,terms_version:termsVersion,expected_price_grosze:quoted,expected_credit_grosze:effectiveCredit
    }});
    if(!walletError&&wallet?.ok){
     if(wallet.mode==='covered'){router.replace('/moje-kursy');return;}
     if(wallet.mode==='split'&&typeof wallet.url==='string'&&wallet.url.startsWith('https://checkout.stripe.com/')){
      if(Platform.OS==='web'&&typeof window!=='undefined')window.location.assign(wallet.url);
      else await Linking.openURL(wallet.url);
      return;
     }
     throw new Error('Nie udało się przygotować dopłaty z karty. Spróbuj ponownie.');
    }
    let reason=String(wallet?.error||'');
    try{reason=String((await (walletError as any)?.context?.json())?.error||reason)}catch{}
    if(reason==='quote_changed'||reason==='no_balance'){await loadQuote();throw new Error('Cena lub saldo się zmieniły. Sprawdź nową kwotę i potwierdź ponownie.');}
    const messages:Record<string,string>={
      already_owned:'Masz już dostęp do tego kursu.',
      purchase_in_progress:'Masz rozpoczętą płatność za ten kurs. Dokończ ją lub spróbuj ponownie później.',
      payments_not_ready:'Dopłata Stripe jest chwilowo niedostępna.',
      invalid_course:'Ten kurs nie jest dostępny.',
      consent_required:'Zaakceptuj regulamin i warunki zakupu.'
     };
    throw new Error(messages[reason]||'Nie udało się użyć salda. Spróbuj ponownie.');
   }
   // Price, account ownership and course publication are re-checked by the server.
   const {data,error}=await supabase.functions.invoke('ta-create-checkout',{
    body:{course_slug:slug,accepted_terms:true,immediate_content_consent:true,terms_version:termsVersion,expected_price_grosze:quoted}
   });
   if(error){
    let code='';
    try{if((error as any).context?.json)code=String((await (error as any).context.json())?.error||'')}catch{}
    if(code==='quote_changed'){await loadQuote();throw new Error('Cena się zmieniła. Sprawdź nową kwotę i potwierdź ponownie.');}
    const message:Record<string,string>={
      payments_not_configured:'Sprzedaż jest wyłączona w konfiguracji serwera. Administrator może sprawdzić cztery wymagane ustawienia w panelu TRENERKI.',
      payments_not_live:'Serwer wymaga produkcyjnego klucza Stripe LIVE. Nie pobrano pieniędzy.',
      server_not_ready:'Brakuje konfiguracji serwera płatności. Nie pobrano pieniędzy.',
      database_unavailable:'Baza płatności jest tymczasowo niedostępna. Nie pobrano pieniędzy.',
      email_not_configured:'Potwierdzenia e-mail są chwilowo niedostępne. Spróbuj ponownie później.',
      confirmed_login_required:'Potwierdź adres e-mail przed zakupem.',
      already_purchased:'Masz już aktywny dostęp do tego kursu — otwórz Moje kursy.',
      course_unavailable_or_free:'Kurs nie jest obecnie dostępny do zakupu.',
      consent_required:'Potwierdź regulamin i zgodę na rozpoczęcie nauki.',
      payment_provider_unavailable:'Nie można teraz połączyć się ze Stripe. Spróbuj ponownie.'
    };
    throw new Error(message[code]||'Nie udało się rozpocząć bezpiecznej płatności. Nie pobrano pieniędzy.');
   }
   if(typeof data?.url!=='string'||!data.url.startsWith('https://checkout.stripe.com/'))
    throw new Error('Brak bezpiecznego linku płatności Stripe. Nie pobrano pieniędzy.');
   if(Platform.OS==='web'&&typeof window!=='undefined')window.location.assign(data.url);
   else await Linking.openURL(data.url);
  }catch(e:any){setMessage(e?.message||'Operacja nie powiodła się.');}
  finally{setPaying(false);}
 }
 const price=item?(item.price_grosze/100).toLocaleString('pl-PL')+' zł':'';
 const effectiveCredit=quoted!==null&&applyCredit?(creditBalance>=quoted?quoted:Math.min(creditBalance,Math.max(0,quoted-200))):0;
 const toPay=quoted===null?0:quoted-effectiveCredit;
 const pln=(grosze:number)=>(grosze/100).toLocaleString('pl-PL',{minimumFractionDigits:2,maximumFractionDigits:2})+' zł';
 return <ScrollView style={{flex:1,backgroundColor:'#fcfcf7'}} contentContainerStyle={{padding:22,paddingBottom:60}}>
  <View style={{maxWidth:820,width:'100%',alignSelf:'center',gap:18}}>
   <Pressable onPress={()=>router.replace('/')}><Text style={{color:ink,fontWeight:'800'}}>← Wróć do katalogu</Text></Pressable>
   <Text style={{fontSize:11,color:'#618067',letterSpacing:2,fontWeight:'800'}}>TRENERKI ACADEMY · TWOJA DECYZJA</Text>
   <Text style={{fontSize:37,fontWeight:'900',color:ink}}>Najpierw poznaj. Potem zdecyduj.</Text>
   <Text style={{fontSize:16,color:muted,lineHeight:25}}>Nie kupujesz w ciemno. Zobacz, czego nauczysz się na przykładach z prawdziwego życia — i dopiero wtedy wybierz kurs.</Text>
   {busy&&<ActivityIndicator/>}
   {!!item&&<>
    <View style={{borderRadius:19,backgroundColor:'white',borderWidth:1,borderColor:'#dbe8d9',padding:23,gap:11}}>
     <Text style={{fontSize:12,color:'#6b8d70',fontWeight:'800'}}>{item.category_pl||'KURS ONLINE'}</Text>
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
     </View>
     {!!preview.module_titles?.length&&<View style={{backgroundColor:'white',borderRadius:18,borderWidth:1,borderColor:'#dfe8d9',padding:23,gap:12}}>
      <Text style={{fontSize:23,fontWeight:'900',color:ink,marginBottom:6}}>Program kursu</Text>
      {preview.module_titles.map((name,i)=><View key={String(i)} style={{flexDirection:'row',gap:12,alignItems:'center',paddingVertical:6,borderBottomWidth:i===preview.module_titles.length-1?0:1,borderColor:'#eff2ed'}}>
       <Text style={{color:'#73945f',fontWeight:'800',fontSize:16}}>{String(i+1).padStart(2,'0')}</Text><Text style={{fontSize:14,color:ink,flex:1}}>{name}</Text>
      </View>)}
     </View>}
    </>}
    <View style={{backgroundColor:'white',borderRadius:19,borderWidth:1,borderColor:'#dce9d9',padding:24,gap:12}}>
     <Text style={{fontSize:22,fontWeight:'900',color:ink}}>Twój wybór</Text>
     <Text style={{color:muted}}>Zalogowano: {email}</Text>
     <Text style={{fontSize:23,fontWeight:'900',color:ink}}>Cena katalogowa: {item.price_grosze===0?'0 zł':price}</Text>
     {item.price_grosze>0&&!owned&&quoted===null&&<Pressable accessibilityRole="button" disabled={quoteLoading} onPress={()=>void loadQuote()}>
      <Text style={{color:ink,fontWeight:'800'}}>{quoteLoading?'Pobieram cenę…':'Pobierz aktualną cenę'}</Text>
     </Pressable>}
     {item.price_grosze>0&&!owned&&quoted!==null&&<View style={{backgroundColor:'#f6f7f0',borderRadius:12,padding:15,gap:13}}>
       <Text style={{fontSize:20,fontWeight:'900',color:ink}}>Łączna cena brutto {pln(quoted)}</Text>
       {creditBalance>0&&<View style={{padding:12,borderRadius:11,backgroundColor:'#e7f2dd',gap:8}}>
        <Text style={{color:ink,fontWeight:'900'}}>Twoje saldo kart: {pln(creditBalance)}</Text>
        <Pressable accessibilityRole="checkbox" accessibilityState={{checked:applyCredit}} onPress={()=>setApplyCredit(v=>!v)} style={{flexDirection:'row',gap:10,alignItems:'center',paddingVertical:5}}>
         <Text style={{fontSize:19,color:ink}}>{applyCredit?'☑':'☐'}</Text>
         <Text style={{flex:1,color:ink,fontWeight:'700'}}>Wykorzystaj moje saldo przy zakupie</Text>
        </Pressable>
        {applyCredit&&<Text style={{color:ink,fontSize:13}}>Z salda: {pln(effectiveCredit)} · {toPay===0?'Bez dopłaty':('Dopłata Stripe: '+pln(toPay))}</Text>}
       </View>}
       <Text style={{color:ink,fontWeight:'900'}}>{applyCredit&&creditBalance>0?toPay===0?'Zapłata z salda':'Dopłata przez Stripe: '+pln(toPay):'Płatność jednorazowa przez Stripe'}</Text>
       <Text style={{color:muted,fontSize:13,lineHeight:20}}>Dostęp na 12 miesięcy po potwierdzonej płatności. Brak automatycznego odnawiania. Kurs odblokowuje się na Twoim koncie.</Text>
       <PurchaseLegalLinks/>
       <Pressable accessibilityRole="checkbox" accessibilityState={{checked:termsAccepted}} onPress={()=>setTermsAccepted(v=>!v)} style={{flexDirection:'row',gap:10,alignItems:'flex-start',paddingVertical:6}}>
        <Text style={{fontSize:20,color:ink}}>{termsAccepted?'☑':'☐'}</Text>
        <Text style={{flex:1,color:ink,lineHeight:21}}>Zapoznałem się z regulaminem i akceptuję warunki zakupu.</Text>
       </Pressable>
       <Pressable accessibilityRole="checkbox" accessibilityState={{checked:earlyAccessConsent}} onPress={()=>setEarlyAccessConsent(v=>!v)} style={{flexDirection:'row',gap:10,alignItems:'flex-start',paddingVertical:6}}>
        <Text style={{fontSize:20,color:ink}}>{earlyAccessConsent?'☑':'☐'}</Text>
        <Text style={{flex:1,color:ink,lineHeight:21}}>Wyraźnie zgadzam się na rozpoczęcie dostarczania treści cyfrowych przed upływem 14 dni i przyjmuję do wiadomości, że po rozpoczęciu dostarczania mogę utracić prawo odstąpienia, jeżeli spełniono wszystkie warunki ustawowe opisane w regulaminie.</Text>
       </Pressable>
      </View>}
     {!!owned?<Pressable onPress={()=>router.replace({pathname:'/nauka',params:{course:slug}})} style={{padding:17,backgroundColor:ink,borderRadius:12}}>
      <Text style={{color:'white',fontWeight:'900',textAlign:'center'}}>Masz dostęp — rozpocznij naukę →</Text>
     </Pressable>:<Pressable disabled={paying||(item.price_grosze>0&&(!termsAccepted||!earlyAccessConsent||quoted===null))} onPress={checkout} accessibilityRole="button" style={{padding:17,backgroundColor:ink,borderRadius:12,opacity:(paying||(item.price_grosze>0&&(!termsAccepted||!earlyAccessConsent||quoted===null)))?0.5:1}}>
      <Text style={{color:'white',fontWeight:'900',textAlign:'center',fontSize:16}}>{paying?'Przechodzę do płatności…':item.price_grosze===0?'Odbierz za darmo →':(effectiveCredit>0?(toPay===0?'Kupuję i płacę z salda '+pln(effectiveCredit):'Przejdź do płatności '+pln(toPay)):'Przejdź do płatności Stripe')+' →'}</Text>
     </Pressable>}
     <Pressable onPress={()=>router.push({pathname:'/prezent',params:{course:slug}})} style={{padding:15,backgroundColor:lime,borderRadius:12}}>
      <Text style={{color:ink,fontWeight:'800',textAlign:'center'}}>🎁 Podaruj ten kurs</Text>
     </Pressable>

    </View>
   </>}
   {!!message&&<View style={{backgroundColor:'#fff2dc',padding:17,borderRadius:12}}><Text style={{color:'#805f2e'}}>{message}</Text></View>}
   <Pressable onPress={()=>router.replace('/moje-kursy')} style={{padding:12}}><Text style={{color:ink,textAlign:'center',fontWeight:'800'}}>Moje kursy</Text></Pressable>
  </View>
 </ScrollView>;
}
