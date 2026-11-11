import React,{useEffect,useRef,useState} from 'react';
import {ScrollView,View,Text,TextInput,Pressable,ActivityIndicator,Platform,Share,Linking,useWindowDimensions} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
import PurchaseLegalLinks from '../src/PurchaseLegalLinks';
import {coursePrice,termsVersion} from '../src/courseQuote';
import {academyAction} from '../src/academyApi';
const ink='#173d2c',pale='#e9f4dc';
export function generateMetadata(){
 return {
  title:'Kurs online na prezent i karty podarunkowe — Trenerki Academy',
  description:'Podaruj wybrany kurs online lub kartę kwotową Trenerki Academy. Wybierz prezent, wpisz odbiorcę i dodaj osobistą wiadomość.',
 };
}
type Course={slug:string;title_pl:string;price_grosze:number;category_pl:string|null};
export default function GiftPage(){
 const {width}=useWindowDimensions(),scroll=useRef<ScrollView>(null);
 const cols=width>=1050?4:width>=720?3:2;
 const cardWidth=Math.max(135,Math.floor((Math.min(width,1070)-44-(cols-1)*12)/cols));
 const [catalog,setCatalog]=useState<Course[]>([]),[query,setQuery]=useState(''),[category,setCategory]=useState('Wszystkie'),[visible,setVisible]=useState(8);
 const p=useLocalSearchParams<{course?:string;code?:string;checkout?:string}>(),router=useRouter();
 const course=typeof p.course==='string'?p.course:'',linkCode=typeof p.code==='string'?p.code:'';
 const [valueCardMode,setValueCardMode]=useState(false),[valueAmount,setValueAmount]=useState('100'),[valueRecipient,setValueRecipient]=useState(''),[valueMessage,setValueMessage]=useState(''),[valueTerms,setValueTerms]=useState(false);
 const [recipient,setRecipient]=useState(''),[message,setMessage]=useState(''),[code,setCode]=useState(linkCode),[item,setItem]=useState<Course|null>(null),
 [ready,setReady]=useState(false),[terms,setTerms]=useState(false),[busy,setBusy]=useState(false),
 [link,setLink]=useState(''),[notice,setNotice]=useState(''),[sent,setSent]=useState(false);
 const [giftQuote,setGiftQuote]=useState<{slug:string;price:number}|null>(null);
 async function loadGiftPrice(slug:string){
  setGiftQuote(null);
  try{setGiftQuote({slug,price:await coursePrice(slug)});}
  catch(e:any){setNotice(e.message);}
 }
 useEffect(()=>{if(item?.price_grosze)void loadGiftPrice(item.slug);},[item?.slug]);
 useEffect(()=>{let mounted=true;void (async()=>{
  try{
   const {data:all,error}=await supabase.from('ta_courses').select('slug,title_pl,price_grosze,category_pl').eq('published',true).order('title_pl');
   if(error)throw error;
   if(!mounted)return;
   setCatalog((all||[]) as Course[]);
   if(course){
    const selected=(all||[]).find(c=>c.slug===course);
    if(selected)setItem(selected as Course);
    else setNotice('Wybrany kurs nie jest już dostępny. Wybierz inny z listy.');
   }
  }catch(e:any){if(mounted)setNotice(e?.message||'Nie udało się pobrać listy kursów.');}
  finally{if(mounted)setReady(true);}
 })();return()=>{mounted=false};},[course]);
 async function createValueGift(){
  if(busy)return;
  setBusy(true);setNotice('');
  try{
   const {data:{user}}=await supabase.auth.getUser();
   if(!user?.email_confirmed_at){router.push({pathname:'/konto',params:{next:'valuegift'}});return;}
   const inputAmount=valueAmount.trim();
   const amount=Math.round(Number(inputAmount.replace(',','.'))*100);
   if(!/^\d{1,4}([,.]\d{1,2})?$/.test(inputAmount)||amount<2500||amount>100000)
    throw new Error('Wpisz kwotę od 25 do 1000 zł (maksymalnie dwa miejsca po przecinku).');
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valueRecipient.trim()))
    throw new Error('Wpisz poprawny e-mail odbiorcy.');
   if(!valueTerms)throw new Error('Przed zakupem zaakceptuj regulamin.');
   const {data,error}=await supabase.functions.invoke('ta-credit',{body:{
    action:'create_voucher',amount_grosze:amount,recipient_email:valueRecipient.trim(),
    message:valueMessage.trim(),accepted_terms:true,terms_version:termsVersion
   }});
   if(error||!data?.ok||typeof data?.url!=='string'||!data.url.startsWith('https://checkout.stripe.com/'))
    throw new Error('Nie udało się utworzyć bezpiecznej płatności. Nie pobrano pieniędzy.');
   if(Platform.OS==='web'&&typeof window!=='undefined')window.location.assign(data.url);
   else await Linking.openURL(data.url);
  }catch(e:any){setNotice(e?.message||'Nie udało się utworzyć karty podarunkowej.');}
  finally{setBusy(false);}
 }
 async function createGift(){
  if(!item||busy)return;setBusy(true);setNotice('');
  try{
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){router.push({pathname:'/konto',params:{course:item.slug,next:'gift'}});return;}
   if(!user.email_confirmed_at)throw new Error('Potwierdź adres e-mail, aby kupić prezent.');
   if(item.price_grosze>0){
    if(!giftQuote||giftQuote.slug!==item.slug)throw new Error('Sprawdź aktualną cenę przed zakupem.');
    const {data,error}=await supabase.functions.invoke('ta-create-checkout',{body:{
     kind:'gift',course_slug:item.slug,recipient_email:recipient.trim(),message:message.trim(),accepted_terms:terms,terms_version:termsVersion,expected_price_grosze:giftQuote.price
    }});
    if(error||typeof data?.url!=='string'||!data.url.startsWith('https://checkout.stripe.com/')){
     let reason='';
     try{reason=(await (error as any)?.context?.json())?.error||'';}catch{}
     if(reason==='quote_changed'){await loadGiftPrice(item.slug);throw new Error('Cena się zmieniła. Sprawdź nową kwotę i potwierdź ponownie.');}
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
   setNotice(result.email_sent?'Prezent utworzony i wysłany na podany e-mail.':'Prezent gotowy! Nie otrzymaliśmy potwierdzenia wysyłki e-mail — możesz skopiować link i przesłać go samodzielnie.');
  }catch(e:any){setNotice(e?.message||'Nie udało się utworzyć prezentu.');}
  finally{setBusy(false)}
 }
 async function redeem(){
  if(busy)return;setBusy(true);setNotice('');
  try{
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){router.push({pathname:'/konto',params:{gift:code.trim()}});return;}
   if(/^TW-[0-9A-F]{32}$/i.test(code.trim())){
    const {data,error}=await supabase.functions.invoke('ta-credit',{body:{action:'redeem',code:code.trim().toUpperCase()}});
    if(error||!data?.ok){
     const err=data?.error||'';
     throw new Error(err==='wrong_email'?'Ta karta jest przypisana do innego adresu e-mail.':err==='code_used_or_expired'?'Ten kod został już użyty lub stracił ważność.':'Nie udało się odebrać karty. Sprawdź kod.');
    }
    setNotice('Karta odebrana. Saldo zostało dodane do Twojego konta.');
   }else{
    await academyAction('redeem_gift',{code:code.trim()});
    setNotice('Prezent odebrany! Kurs czeka już na Twoim koncie.');
   }
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
 const gifts=catalog.filter(c=>c.price_grosze>0);
 const categories=['Wszystkie',...new Set(gifts.map(c=>c.category_pl||'Pozostałe'))];
 const matching=gifts.filter(c=>(category==='Wszystkie'||(c.category_pl||'Pozostałe')===category) && (!query.trim()||(c.title_pl+' '+(c.category_pl||'')).toLocaleLowerCase('pl').includes(query.trim().toLocaleLowerCase('pl'))));
 const offers=matching.slice(0,visible);
 function selectCourse(chosen:Course){
  setItem(chosen);setRecipient('');setMessage('');setTerms(false);setNotice('');
  scroll.current?.scrollTo({y:0,animated:true});
 }
 return <ScrollView ref={scroll} style={{backgroundColor:'#fcfcf7',flex:1}} contentContainerStyle={{padding:22,paddingBottom:50}}>
  <View style={{maxWidth:1070,alignSelf:'center',width:'100%',gap:17}}>
   <Pressable onPress={()=>router.replace('/')}><Text style={{color:ink,fontWeight:'800'}}>← Katalog kursów</Text></Pressable>
   <Text style={{fontSize:12,color:'#67836c',fontWeight:'800',letterSpacing:1.5}}>TRENERKI ACADEMY · PREZENT</Text>
   <Text style={{fontSize:width<500?29:37,color:ink,fontWeight:'900',lineHeight:width<500?36:44}}>Podaruj komuś coś, co zostanie na dłużej. 🎁</Text>
   <Text style={{color:'#526c5b',lineHeight:24,fontSize:16}}>Wybierz kurs, dodaj dedykację i podaruj bliskiej osobie nową umiejętność.</Text>
   {!ready&&<ActivityIndicator/>}
   {p.checkout==='success'&&<Text style={{color:ink}}>Czekamy na potwierdzenie płatności ze Stripe. Po jego otrzymaniu wyślemy wiadomość do Ciebie i odbiorcy.</Text>}
   {!item&&!ready&&<Text style={{color:'#5e7b62'}}>Wczytuję kursy do wyboru…</Text>}
   <View style={{flexDirection:'row',gap:9,flexWrap:'wrap',marginBottom:4}}>
    <Pressable accessibilityRole="button" onPress={()=>setValueCardMode(false)} style={{backgroundColor:!valueCardMode?ink:pale,paddingVertical:13,paddingHorizontal:18,borderRadius:12,flexGrow:1}}>
     <Text style={{color:!valueCardMode?'white':ink,textAlign:'center',fontWeight:'900'}}>🎁 Podaruj kurs</Text>
    </Pressable>
    <Pressable accessibilityRole="button" onPress={()=>setValueCardMode(true)} style={{backgroundColor:valueCardMode?ink:pale,paddingVertical:13,paddingHorizontal:18,borderRadius:12,flexGrow:1}}>
     <Text style={{color:valueCardMode?'white':ink,textAlign:'center',fontWeight:'900'}}>💳 Karta na kwotę</Text>
    </Pressable>
   </View>
   {valueCardMode&&<View style={{backgroundColor:'white',borderRadius:17,borderWidth:1,borderColor:'#dce9d9',padding:width<540?16:23,gap:13}}>
    <Text style={{fontSize:23,fontWeight:'900',color:ink}}>Podaruj środki na dowolny kurs</Text>
    <Text style={{color:'#54705a',lineHeight:22,fontSize:14}}>Odbiorca dostanie kartę z saldem na swoim koncie. Może kupić kilka kursów, a jeśli zabraknie środków — dopłaci różnicę.</Text>
    <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
     {[50,100,200,500].map(amount=><Pressable key={amount} onPress={()=>setValueAmount(String(amount))} style={{backgroundColor:valueAmount===String(amount)?ink:pale,borderRadius:10,paddingVertical:10,paddingHorizontal:14}}>
      <Text style={{color:valueAmount===String(amount)?'white':ink,fontWeight:'800'}}>{amount} zł</Text>
     </Pressable>)}
    </View>
    <Text style={{fontSize:13,fontWeight:'800',color:ink}}>Kwota karty (25–1000 zł)</Text>
    <TextInput accessibilityLabel="Kwota karty podarunkowej w złotych" value={valueAmount} onChangeText={setValueAmount} keyboardType="decimal-pad" placeholder="100" style={[input,{marginTop:0}]}/>
    <Text style={{fontSize:13,fontWeight:'800',color:ink}}>E-mail odbiorcy</Text>
    <TextInput accessibilityLabel="E-mail odbiorcy karty" value={valueRecipient} onChangeText={setValueRecipient} keyboardType="email-address" autoCapitalize="none" placeholder="odbiorca@example.com" style={[input,{marginTop:0}]}/>
    <TextInput accessibilityLabel="Dedykacja" value={valueMessage} onChangeText={setValueMessage} maxLength={300} multiline placeholder="Dodaj dedykację (opcjonalnie)" style={[input,{minHeight:82,textAlignVertical:'top',marginTop:0}]}/>
    <Pressable accessibilityRole="checkbox" accessibilityState={{checked:valueTerms}} onPress={()=>setValueTerms(v=>!v)}><Text style={{color:ink,fontSize:14}}>{valueTerms?'☑':'☐'} Akceptuję regulamin zakupu karty podarunkowej.</Text></Pressable>
    <PurchaseLegalLinks/>
    <Pressable accessibilityRole="button" onPress={createValueGift} disabled={busy||!valueTerms} style={{backgroundColor:ink,borderRadius:11,padding:16,opacity:busy||!valueTerms?.5:1}}>
     <Text style={{color:'white',fontWeight:'900',textAlign:'center'}}>Kup kartę podarunkową →</Text>
    </Pressable>
   </View>}

   {!valueCardMode&&!!item&&<View style={{alignSelf:'stretch',maxWidth:740,width:'100%',backgroundColor:'white',padding:22,borderWidth:1,borderColor:'#e2e9d8',borderRadius:18,gap:12}}>
    <Text style={{color:'#73816c',fontWeight:'800',fontSize:12}}>TWÓJ WYBÓR — KURS NA PREZENT</Text>
    <Pressable onPress={()=>{setItem(null);setNotice('')}} accessibilityRole="button" style={{alignSelf:'flex-end',padding:6}}><Text style={{color:'#4b7456',fontSize:12,fontWeight:'800'}}>Zmień kurs ↓</Text></Pressable>
    <Text style={{fontSize:23,fontWeight:'800',color:ink,lineHeight:30}}>{item.title_pl}</Text>
    <Text style={{color:ink,fontWeight:'900',fontSize:23}}>{item.price_grosze===0?'GRATIS':'Cena katalogowa '+(item.price_grosze/100).toFixed(0)+' zł'}</Text>
    <TextInput style={input} placeholder={item.price_grosze>0?'E-mail obdarowanej osoby':'E-mail obdarowanej osoby (opcjonalnie)'} value={recipient} onChangeText={setRecipient} autoCapitalize="none" keyboardType="email-address"/>
    <TextInput style={[input,{minHeight:86,textAlignVertical:'top'}]} multiline value={message} maxLength={300} onChangeText={setMessage} placeholder="Dodaj krótką dedykację (opcjonalnie)"/>
    {item.price_grosze>0&&<>
     {giftQuote?.slug===item.slug?<Text style={{color:ink,fontWeight:'900'}}>Cena brutto {(giftQuote.price/100).toLocaleString('pl-PL')} zł</Text>:<Pressable onPress={()=>void loadGiftPrice(item.slug)}><Text style={{color:ink}}>Sprawdź aktualną cenę</Text></Pressable>}
     <Text style={{color:ink}}>Po potwierdzeniu płatności wyślemy prezent odbiorcy, a Tobie potwierdzenie zakupu. Odbiorca odbierze kurs na koncie z podanym adresem e-mail i dostanie dostęp na 12 miesięcy.</Text>
     <Pressable accessibilityRole="checkbox" accessibilityState={{checked:terms}} onPress={()=>setTerms(value=>!value)}><Text style={{color:ink}}>{terms?'☑':'☐'} Akceptuję regulamin i warunki zakupu karty.</Text></Pressable>
     <PurchaseLegalLinks/>
    </>}
    <Pressable disabled={busy||(item.price_grosze>0&&(!terms||!recipient.trim()||giftQuote?.slug!==item.slug))} onPress={createGift} style={{backgroundColor:ink,borderRadius:12,padding:17,opacity:busy||(item.price_grosze>0&&(!terms||!recipient.trim()||giftQuote?.slug!==item.slug))?0.5:1}}>
     <Text style={{color:'white',fontWeight:'900',textAlign:'center'}}>{busy?'Chwileczkę…':item.price_grosze===0?'Utwórz kartę podarunkową →':'Przejdź do płatności Stripe →'}</Text>
    </Pressable>
   </View>}
   {!valueCardMode&&<View style={{marginTop:12,gap:13}}>
    <View style={{gap:5}}>
     <Text style={{fontSize:24,color:ink,fontWeight:'900'}}>Wybierz kurs na prezent</Text>
     <Text style={{color:'#5b745e',fontSize:14}}>Do wyboru {gifts.length} płatnych kursów. Znajdź coś, co naprawdę zainteresuje obdarowaną osobę.</Text>
    </View>
    <TextInput accessibilityLabel="Wyszukaj kurs na prezent" value={query} onChangeText={v=>{setQuery(v);setVisible(8)}} placeholder="Szukaj, np. Excel, budownictwo, dom…" autoCapitalize="none" style={[input,{marginTop:0}]}/>
    <View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>
     {categories.map(cat=><Pressable key={cat} accessibilityRole="button" onPress={()=>{setCategory(cat);setVisible(8)}} style={{borderWidth:1,borderColor:category===cat?ink:'#d6e4d2',backgroundColor:category===cat?ink:'white',borderRadius:20,paddingVertical:7,paddingHorizontal:11}}>
      <Text style={{fontSize:11,fontWeight:'800',color:category===cat?'white':ink}}>{cat}</Text>
     </Pressable>)}
    </View>
    {!ready&&<ActivityIndicator/>}
    {ready&&!matching.length&&<Text style={{color:'#5b745e',paddingVertical:14}}>Nie znaleziono kursu. Spróbuj innej nazwy lub kategorii.</Text>}
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>
     {offers.map(c=><View key={c.slug} style={{width:cardWidth,backgroundColor:'white',borderWidth:1,borderColor:item?.slug===c.slug?'#78a777':'#dbe7d6',borderRadius:15,padding:12,gap:8,justifyContent:'space-between',minHeight:160}}>
      <View style={{gap:7}}>
       <View style={{width:38,height:38,borderRadius:11,backgroundColor:'#e4f1d9',alignItems:'center',justifyContent:'center'}}><Text style={{color:ink,fontSize:17,fontWeight:'900'}}>T.</Text></View>
       <Text style={{fontSize:cols===2?12:14,color:ink,fontWeight:'800',lineHeight:cols===2?17:20}} numberOfLines={3}>{c.title_pl}</Text>
       <Text style={{color:'#3c6944',fontWeight:'900',fontSize:16}}>{(c.price_grosze/100).toLocaleString('pl-PL')} zł</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={()=>selectCourse(c)} style={{backgroundColor:ink,borderRadius:9,paddingVertical:11,paddingHorizontal:5}}>
       <Text style={{fontSize:cols===2?11:12,color:'white',fontWeight:'800',textAlign:'center'}}>Podaruj ten kurs</Text>
      </Pressable>
     </View>)}
    </View>
    {matching.length>visible&&<Pressable accessibilityRole="button" onPress={()=>setVisible(v=>v+4)} style={{alignSelf:'center',backgroundColor:pale,borderRadius:12,paddingVertical:11,paddingHorizontal:20}}>
     <Text style={{color:ink,fontWeight:'800'}}>Pokaż kolejne 4 kursy ({matching.length-visible} pozostało)</Text>
    </Pressable>}
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
    <Text style={{textAlign:'center',color:ink,fontWeight:'900'}}>🎅 Bezpłatny prezent: kurs Świętego Mikołaja</Text>
   </Pressable>
   {!!notice&&<Text style={{backgroundColor:'#f4efdd',color:'#6c603b',padding:16,borderRadius:12}}>{notice}</Text>}
   <Text style={{color:'#6f816f',fontSize:12,lineHeight:20}}>Kod karty można aktywować raz. Karta kwotowa pozwala wykorzystać saldo przy kilku zakupach.</Text>
  </View>
 </ScrollView>
}
