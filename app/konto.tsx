import React,{useEffect,useRef,useState} from 'react';
import {View,Text,TextInput,Pressable,ScrollView,Linking,useWindowDimensions} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {supabase,isPasswordRecoveryRedirect,clearPasswordRecoveryFlag,getAuthRedirectError,clearAuthRedirectError,hasPasswordRecoveryCallback,getInitialAuthCallbackHash} from '../src/supabase';
import {academyAction} from '../src/academyApi';
import {validGiftCode} from '../src/giftCode';
import {AccountFeedbackError,accountEmail,accountErrorMessage} from '../src/accountFeedback.mjs';
const ink='#14263B',pale='#FDF4E1';
// Keep Expo preview authentication working until custom DNS and Supabase Auth allowlist are configured.
const siteUrl=(typeof window!=='undefined' && /^https:\/\/(?:www\.)?(?:trenerki\.com)$|^https:\/\/trenerki-academy\.expo\.app$/.test(window.location?.origin||''))
 ? window.location.origin : 'https://trenerki.com';
export default function AccountPage(){
 const {width}=useWindowDimensions();
 const compact=width<560;
 const router=useRouter(),params=useLocalSearchParams<{course?:string;next?:string;gift?:string;ref?:string;'#'?:string;link_error?:string;link_flow?:string}>(),
 course=typeof params.course==='string' && /^[a-z0-9][a-z0-9_-]{1,79}$/.test(params.course)?params.course:'',
 gift=validGiftCode(params.gift),
 referral=typeof params.ref==='string'&&/^TA[A-F0-9]{12}$/.test(params.ref)?params.ref:'';
 const [isAdmin,setIsAdmin]=useState(false);
 const [activeEmail,setActiveEmail]=useState(''),[mode,setMode]=useState<'register'|'login'|'reset'|'new-password'>(isPasswordRecoveryRedirect()?'new-password':'login'),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[showPassword,setShowPassword]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const authRequest=useRef(false),callbackCleared=useRef(false);
 function clearCallbackAddress(linkError?:{code:string;recovery:boolean}|null){
  if(callbackCleared.current||!params['#'])return;
  callbackCleared.current=true;
  router.replace({pathname:'/konto',params:{...(course?{course}:{}),...(gift?{gift}:{}),...(referral?{ref:referral}:{}),...(params.next?{next:params.next}:{}),...(linkError?{link_error:linkError.code,...(linkError.recovery?{link_flow:'recovery'}:{})}:{})}});
 }
 const [canRetryRecovery,setCanRetryRecovery]=useState(false);
 const nextConfirmationAt=useRef(0);
 const [canResend,setCanResend]=useState(false),[resendWait,setResendWait]=useState(0),[linkNeedsConfirmation,setLinkNeedsConfirmation]=useState(false);
 useEffect(()=>{
  if(resendWait<=0)return;
  const timer=setTimeout(()=>setResendWait(Math.max(0,Math.ceil((nextConfirmationAt.current-Date.now())/1000))),1000);
  return()=>clearTimeout(timer);
 },[resendWait]);
 function deferConfirmation(){nextConfirmationAt.current=Date.now()+60000;setResendWait(60);}
 const isCompanyLogin=params.next==='company';
 const continueToSelectedCourse=async()=>{
    if(params.next==='company'){router.replace('/firma');return;}
    if(params.next==='affiliate'){router.replace('/partner');return;}
    if(params.next==='valuegift'){router.replace('/prezent');return;}
    if(gift){router.replace({pathname:'/prezent',params:{code:gift}});return;}
    if(course){router.replace({pathname:params.next==='gift'?'/prezent':'/kup',params:{course,...(referral?{ref:referral}:{})}});return;}
    // Email confirmation sends users back to /konto without original query params.
    // Recover the chosen course from signup metadata for navigation only;
    // enrollment authorization is always checked independently by the server.
    const {data:{user}}=await supabase.auth.getUser();
    const candidate=user?.user_metadata?.pending_course;
    if(user?.user_metadata?.pending_valuegift===true){
      await supabase.auth.updateUser({data:{pending_valuegift:null}});
      router.replace('/prezent');return;
    }
    if(user?.user_metadata?.pending_company===true){
      await supabase.auth.updateUser({data:{pending_company:null}});
      router.replace('/firma');return;
    }
    if(user?.user_metadata?.pending_affiliate===true){
      await supabase.auth.updateUser({data:{pending_affiliate:null}});
      router.replace('/partner');return;
    }
    const selected=typeof candidate==='string'&&/^[a-z0-9][a-z0-9_-]{1,79}$/.test(candidate)?candidate:'';
    const next=user?.user_metadata?.pending_checkout==='gift'?'/prezent':'/kup';
    const savedReferral=typeof user?.user_metadata?.pending_referral_code==='string'&&/^TA[A-F0-9]{12}$/.test(user.user_metadata.pending_referral_code)?user.user_metadata.pending_referral_code:'';
    const activeReferral=referral||savedReferral;
    const possibleGift=user?.user_metadata?.pending_gift;
    const savedGift=validGiftCode(possibleGift);
    if(selected||savedGift){
      // Clear once consumed so future logins don't keep redirecting to old courses.
      await supabase.auth.updateUser({data:{pending_course:null,pending_gift:null,pending_checkout:null,pending_referral_code:null}});
      if(savedGift){router.replace({pathname:'/prezent',params:{code:savedGift}});return;}
      router.replace({pathname:next,params:{course:selected,...(activeReferral?{ref:activeReferral}:{})}});return;
    }
    router.replace('/moje-kursy');
 };
 useEffect(()=>{
  let isCurrent=true;
  const linkError=getAuthRedirectError()||(['otp_expired','invalid_link'].includes(params.link_error||'')?{code:params.link_error!,recovery:params.link_flow==='recovery'}:null);
  if(linkError){
    setMode(linkError.recovery?'reset':'login');
    setCanResend(!linkError.recovery);setLinkNeedsConfirmation(!linkError.recovery);
    setMessage(accountErrorMessage(linkError)+(linkError.recovery?' Wpisz swój e-mail, aby otrzymać nowy link do hasła.':' Wpisz swój e-mail i wyślij ponownie potwierdzenie albo wybierz „Nie pamiętam hasła”.'));
    clearAuthRedirectError();
    // Do not keep a dead callback in the address bar or replay it on refresh.
    clearCallbackAddress(linkError);
  }
  const showRecovery=()=>{
    if(!isCurrent)return;
    setMode('new-password');
    setMessage('Link potwierdzony. Ustaw nowe hasło do swojego konta.');
    clearCallbackAddress();
  };
  // Subscribe before reading the session; the redirect event can race with screen mounting.
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
    if(!isCurrent)return;
    if(event==='PASSWORD_RECOVERY'){
      if(session?.user?.email)setActiveEmail(session.user.email);
      showRecovery();
    }
    else if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED'){
      if(session?.user?.email)setActiveEmail(session.user.email);
    }else if(event==='SIGNED_OUT')setActiveEmail('');
  });
  // Handle PASSWORD_RECOVERY already captured by the early listener in src/supabase.ts.
  void(async()=>{
    const initialization=await supabase.auth.initialize();
    if(!isCurrent)return;
    if(getInitialAuthCallbackHash()&&initialization.error&&!linkError){
      const recovery=hasPasswordRecoveryCallback();
      setMode(recovery?'reset':'login');setLinkNeedsConfirmation(!recovery);
      if(initialization.error.name==='AuthRetryableFetchError'){
        setCanRetryRecovery(true);
        setMessage('Nie udało się sprawdzić linku przez problem z połączeniem. Sprawdź internet i wybierz „Sprawdź link ponownie”.');
      }else{
        clearPasswordRecoveryFlag();clearCallbackAddress({code:'invalid_link',recovery});
        setMessage(accountErrorMessage({code:'invalid_link'})+(recovery?' Wpisz swój e-mail, aby otrzymać nowy link do hasła.':''));
      }
      return;
    }
    const {data:{user},error}=await supabase.auth.getUser();
    if(!isCurrent)return;
    if(!error&&user?.email){
      setActiveEmail(user.email);
      if(getInitialAuthCallbackHash())clearCallbackAddress();
    }
    if(isPasswordRecoveryRedirect()){
      if(!error&&user)showRecovery();
      else if(error?.name==='AuthRetryableFetchError')setMessage(accountErrorMessage(error));
      else{
        setMode('reset');
        setMessage('Link odzyskiwania wygasł lub jest nieważny. Poproś o nową wiadomość.');
        clearPasswordRecoveryFlag();
      }
    }
  })().catch((error)=>{
    if(isCurrent&&isPasswordRecoveryRedirect()){
      // A temporary connection failure does not invalidate the recovery session.
      setMessage(accountErrorMessage(error));
    }
  });
  return()=>{isCurrent=false;subscription.unsubscribe();};
 },[]);
 useEffect(()=>{
  if(!activeEmail){setIsAdmin(false);return;}
  let mounted=true;
  void academyAction('whoami').then(data=>{if(mounted)setIsAdmin(data.is_admin===true)}).catch(()=>{if(mounted)setIsAdmin(false)});
  return()=>{mounted=false};
 },[activeEmail]);
 async function logout(){
  setBusy(true);
  try{
   const {error}=await supabase.auth.signOut({scope:'local'});
   if(error)throw error;
   setActiveEmail('');setIsAdmin(false);setPassword('');setConfirmPassword('');
   setMode('login');setMessage('Wylogowano pomyślnie.');
   router.replace(gift?{pathname:'/konto',params:{gift}}:'/konto');
  }catch{setMessage('Nie udało się wylogować. Spróbuj ponownie.')}
  finally{setBusy(false);}
 }
 async function submit(){
   if(authRequest.current)return;
   authRequest.current=true;
   setBusy(true);setMessage('');
   try{
     if(mode==='new-password'){
       if(password.length<8)throw new AccountFeedbackError('Nowe hasło musi mieć co najmniej 8 znaków.');
       if(password!==confirmPassword)throw new AccountFeedbackError('Podane hasła różnią się.');
       const {data,error}=await supabase.auth.updateUser({password});
       if(error)throw error;
       clearPasswordRecoveryFlag();
       if(data.user?.email)setActiveEmail(data.user.email);
       setPassword('');setConfirmPassword('');
       // A password update can succeed even if the following sign-out fails.
       // Report these outcomes separately so the learner does not repeat the update.
       try{
         const {error:signOutError}=await supabase.auth.signOut();
         if(signOutError)throw signOutError;
       }catch{
         setMode('login');
         setMessage('Hasło zostało zmienione. Nie udało się zakończyć sesji. Użyj przycisku „Wyloguj się” w profilu i zaloguj się nowym hasłem.');
         return;
       }
       setMode('login');setActiveEmail('');setIsAdmin(false);
       setMessage('Hasło zostało zmienione. Zaloguj się teraz nowym hasłem.');
       return;
     }
     const normalizedEmail=accountEmail(email);
     if(mode==='reset'){
       const redirectTo=siteUrl+'/konto';
       const {error}=await supabase.auth.resetPasswordForEmail(normalizedEmail,{redirectTo});if(error)throw error;
       setMessage('Sprawdź pocztę e-mail i folder SPAM.');return;
     }
     if(!password)throw new AccountFeedbackError('Wpisz hasło do swojego konta.');
     if(mode==='register'){
       if(password.length<8)throw new AccountFeedbackError('Hasło powinno mieć minimum 8 znaków.');
       if(name.trim().length<2)throw new AccountFeedbackError('Wpisz swoje imię i nazwisko.');
       const emailRedirectTo=siteUrl+'/konto';
       const {data,error}=await supabase.auth.signUp({email:normalizedEmail,password,options:{emailRedirectTo,data:{full_name:name.trim(),pending_course:course||null,pending_gift:gift||null,pending_checkout:params.next==='gift'?'gift':null,pending_company:isCompanyLogin,pending_affiliate:params.next==='affiliate',pending_referral_code:referral||null,pending_valuegift:params.next==='valuegift'}}});
       if(error)throw error;
       if(data.session){await continueToSelectedCourse();return;}
       setCanResend(true);deferConfirmation();
       setMessage(gift?'Konto utworzone. Potwierdź e-mail (sprawdź także SPAM), następnie zaloguj się. Twoja karta będzie czekać na odbiór.':'Konto utworzone. Potwierdź e-mail (również w SPAM), następnie zaloguj się. Wybrany kurs będzie czekał w koszyku.');return;
     }
     const {error}=await supabase.auth.signInWithPassword({email:normalizedEmail,password});
     if(error)throw error;
     await continueToSelectedCourse();
   }catch(e:any){
     if(mode==='new-password'&&(['session_not_found','session_expired','refresh_token_not_found'].includes(e?.code)||e?.name==='AuthSessionMissingError')){
       clearPasswordRecoveryFlag();setActiveEmail('');setMode('reset');setPassword('');setConfirmPassword('');
       setMessage('Sesja zmiany hasła wygasła. Wpisz swój e-mail i poproś o nowy link.');return;
     }
     if(e?.code==='email_not_confirmed')setCanResend(true);
     setMessage(accountErrorMessage(e));
   }finally{authRequest.current=false;setBusy(false)}
 }
 async function resendConfirmation(){
  if(authRequest.current||Date.now()<nextConfirmationAt.current)return;
  authRequest.current=true;setBusy(true);setMessage('');
  try{
   const normalizedEmail=accountEmail(email);
   const {error}=await supabase.auth.resend({type:'signup',email:normalizedEmail,options:{emailRedirectTo:siteUrl+'/konto'}});
   if(error)throw error;
   deferConfirmation();
   setMessage('Jeśli ten adres czeka na potwierdzenie, wysłaliśmy nowy link. Sprawdź odebrane wiadomości i SPAM.');
  }catch(e:any){
   if(e?.code==='over_email_send_rate_limit')deferConfirmation();
   setMessage(accountErrorMessage(e));
  }finally{authRequest.current=false;setBusy(false)}
 }
 const input={borderWidth:1,borderColor:'#DCE4ED',borderRadius:12,padding:13,marginBottom:12,color:ink,fontSize:16} as const;
 const desktopProfile=width>=1000&&!!activeEmail&&mode!=='new-password';
 const heading=activeEmail&&mode!=='new-password'?'Twój profil':mode==='register'?(isCompanyLogin?'Utwórz konto firmowe':'Rozpocznij naukę.'):mode==='login'?(isCompanyLogin?'Zaloguj się jako firma':'Witaj ponownie!'):mode==='reset'?'Odzyskaj konto':'Ustaw nowe hasło';
 return <ScrollView style={{flex:1,backgroundColor:'#F7F9FC'}} keyboardShouldPersistTaps="handled" contentContainerStyle={{minHeight:'100%',padding:compact?12:22,paddingBottom:compact?24:22,justifyContent:compact||desktopProfile?'flex-start':'center'}}>
 <View style={{maxWidth:desktopProfile?1920:530,width:'100%',alignSelf:'center',backgroundColor:'white',borderRadius:compact?15:20,padding:compact?17:28,borderWidth:1,borderColor:'#DCE4ED'}}>
 <Pressable onPress={()=>router.push('/')}><Text style={{color:ink,fontWeight:'700',marginBottom:compact?12:22}}>← Wszystkie kursy</Text></Pressable>
 {!activeEmail&&<View style={{flexDirection:'row',gap:9,marginBottom:compact?12:18}}>
  <Pressable accessibilityRole="button" disabled={busy} onPress={()=>{if(!authRequest.current)router.replace(gift?{pathname:'/konto',params:{gift}}:'/konto')}} style={{flex:1,backgroundColor:isCompanyLogin?'#f0f4fb':ink,padding:13,borderRadius:11,alignItems:'center'}}>
   <Text style={{color:isCompanyLogin?ink:'white',fontWeight:'900',fontSize:13}}>Konto prywatne</Text>
  </Pressable>
  <Pressable accessibilityRole="button" disabled={busy} onPress={()=>{if(!authRequest.current)router.replace({pathname:'/konto',params:{next:'company'}})}} style={{flex:1,backgroundColor:isCompanyLogin?ink:'#f0f4fb',padding:13,borderRadius:11,alignItems:'center'}}>
   <Text style={{color:isCompanyLogin?'white':ink,fontWeight:'900',fontSize:13}}>Dla firm</Text>
  </Pressable>
 </View>}
 <Text style={{fontSize:12,color:'#617386',fontWeight:'800',marginBottom:8}}>{isCompanyLogin?'TRENERKI ACADEMY · DLA FIRM':'TRENERKI ACADEMY · TWOJE KONTO'}</Text>
 <Text style={{fontSize:compact?26:30,fontWeight:'900',color:ink,marginBottom:compact?8:10}}>{heading}</Text>
 {!!activeEmail&&mode!=='new-password'&&<View style={{backgroundColor:'#eef3fc',borderWidth:1,borderColor:'#dbe5f4',borderRadius:13,padding:16,marginVertical:12}}>
   <Text style={{fontWeight:'800',color:ink}}>Jesteś zalogowany</Text>
   <Text style={{color:'#53657c',marginTop:5,marginBottom:11}}>{activeEmail}</Text>
   <View style={{flexDirection:desktopProfile?'row':'column',flexWrap:desktopProfile?'wrap':'nowrap',gap:12}}>
   <Pressable onPress={()=>{void continueToSelectedCourse().catch(()=>router.replace('/moje-kursy'));}} style={{backgroundColor:ink,padding:13,borderRadius:10,alignItems:'center'}}>
     <Text style={{color:'#fff',fontWeight:'800'}}>{isCompanyLogin?'Otwórz panel firmy →':gift?'Przejdź do prezentu →':course?'Kontynuuj do kursu →':'Otwórz Moje kursy →'}</Text>
   </Pressable>
   {(isCompanyLogin||gift||course)&&<Pressable accessibilityRole="button" onPress={()=>router.push('/moje-kursy')} style={{backgroundColor:'#F5F6FA',padding:13,borderRadius:10,alignItems:'center',marginTop:desktopProfile?0:8,minWidth:desktopProfile?220:undefined,flexGrow:desktopProfile?1:0}}>
      <Text style={{color:ink,fontWeight:'800'}}>Moje kursy →</Text>
    </Pressable>}
    <Pressable accessibilityRole="button" onPress={()=>router.push('/ustawienia')} style={{backgroundColor:'#F5F6FA',padding:13,borderRadius:10,alignItems:'center',marginTop:desktopProfile?0:8,minWidth:desktopProfile?220:undefined,flexGrow:desktopProfile?1:0}}>
      <Text style={{color:ink,fontWeight:'800'}}>Ustawienia profilu →</Text>
    </Pressable>
    <Pressable accessibilityRole="button" onPress={()=>router.push('/moje-dyplomy')} style={{backgroundColor:'#edf2ff',padding:13,borderRadius:10,alignItems:'center',marginTop:desktopProfile?0:8,minWidth:desktopProfile?220:undefined,flexGrow:desktopProfile?1:0}}>
     <Text style={{color:'#9A6D25',fontWeight:'800'}}>Moje dyplomy →</Text>
   </Pressable>
   <Pressable accessibilityRole="button" onPress={()=>router.push('/')} style={{backgroundColor:'#F5F6FA',padding:13,borderRadius:10,alignItems:'center',marginTop:desktopProfile?0:8,minWidth:desktopProfile?220:undefined,flexGrow:desktopProfile?1:0}}>
      <Text style={{color:ink,fontWeight:'800'}}>Przeglądaj kursy →</Text>
    </Pressable>
    <Pressable accessibilityRole="button" onPress={logout} style={{backgroundColor:'#f0f3f8',padding:13,borderRadius:10,alignItems:'center',marginTop:desktopProfile?0:8,minWidth:desktopProfile?220:undefined,flexGrow:desktopProfile?1:0}}>
     <Text style={{color:'#465569',fontWeight:'800'}}>Wyloguj się</Text>
   </Pressable>
   <Pressable onPress={()=>{setMode('new-password');setMessage('Możesz zmienić hasło w zalogowanym koncie.');}} style={{padding:11,alignItems:'center'}}>
     <Text style={{color:ink,fontWeight:'700'}}>Zmień hasło bez ponownego logowania</Text>
   </Pressable>
   </View>
 </View>}
 {(!activeEmail||mode==='new-password')&&<>
  <Text style={{color:'#58677b',lineHeight:compact?21:22,marginBottom:compact?14:20}}>{mode==='new-password'?'Ustaw nowe hasło, powtórz je w drugim polu i zapisz. Następnie zalogujesz się ponownie.':mode==='reset'?'Wpisz adres e-mail użyty przy zakładaniu konta. Wyślemy instrukcję zmiany hasła. Sprawdź również folder SPAM.':gift?'Zaloguj się, żeby odebrać prezent od bliskiej osoby. Twoja karta podarunkowa pozostanie wybrana.':course==='zaufany-wolontariusz'?'Zaloguj się, aby zapisać bezpłatny kurs na swoim koncie.':course?'Zaloguj się lub utwórz konto. Po zalogowaniu wrócisz do wybranego kursu i zobaczysz jego cenę oraz przycisk zakupu.':isCompanyLogin?'Konto opiekuna firmy. Przydzielaj kursy pracownikom i sprawdzaj wykorzystanie miejsc.':'Zaloguj się, aby zobaczyć swoje kursy i zapisany postęp. Wybierz kurs, a następnie zapłać bezpiecznie przez Stripe.'}</Text>
 {mode==='register'&&<TextInput style={input} accessibilityLabel="Imię i nazwisko" placeholder="Imię i nazwisko" value={name} onChangeText={setName} autoComplete="name"/>}
 {mode!=='new-password'&&<TextInput style={input} accessibilityLabel="Adres e-mail" placeholder="Adres e-mail" value={email} onChangeText={value=>{setEmail(value);setCanResend(false);setResendWait(0);nextConfirmationAt.current=0}} autoCapitalize="none" autoComplete="email" keyboardType="email-address" onSubmitEditing={()=>{if(mode==='reset')void submit()}} returnKeyType={mode==='reset'?'go':'next'}/>}
 {mode!=='reset'&&<TextInput style={input} accessibilityLabel={mode==='new-password'?'Nowe hasło':mode==='register'?'Hasło (minimum 8 znaków)':'Hasło'} placeholder={mode==='new-password'?'Nowe hasło (min. 8 znaków)':mode==='register'?'Hasło (minimum 8 znaków)':'Hasło'} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoComplete={mode==='register'||mode==='new-password'?'new-password':'current-password'} onSubmitEditing={()=>{if(mode!=='new-password')void submit()}} returnKeyType={mode==='new-password'?'next':'go'}/>}
 {mode!=='reset'&&<Pressable accessibilityRole="button" onPress={()=>setShowPassword(v=>!v)} style={{alignSelf:'flex-end',paddingVertical:6,marginBottom:9}}><Text style={{color:ink,fontWeight:'700'}}>{showPassword?'Ukryj hasło':'Pokaż hasło'}</Text></Pressable>}
 {mode==='new-password'&&<TextInput style={input} accessibilityLabel="Powtórz nowe hasło" placeholder="Powtórz nowe hasło" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password" onSubmitEditing={()=>void submit()} returnKeyType="go"/>}
  </>}
 {!!message&&<Text accessibilityLiveRegion="polite" testID="account-feedback" style={{color:'#264b92',backgroundColor:pale,padding:13,borderRadius:12,marginBottom:14}}>{message}</Text>}
 {(!activeEmail||mode==='new-password')&&<>
  {canRetryRecovery&&mode!=='register'&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>{if(typeof window!=='undefined')window.location.reload()}} style={{padding:12,alignItems:'center'}}><Text style={{color:ink,fontWeight:'700'}}>Sprawdź link ponownie</Text></Pressable>}
  <Pressable accessibilityRole="button" onPress={submit} disabled={busy} style={{backgroundColor:'#E7BB5B',padding:16,borderRadius:12,alignItems:'center',opacity:busy?.5:1}}><Text style={{color:'#14263B',fontWeight:'900'}}>{busy?'Przetwarzanie…':mode==='register'?'Załóż konto':mode==='login'?'Zaloguj się':mode==='reset'?'Wyślij link':'Zmień hasło'}</Text></Pressable>
 {(canResend||linkNeedsConfirmation&&mode==='login')&&(mode==='login'||mode==='register')&&<Pressable accessibilityRole="button" disabled={busy||resendWait>0} onPress={resendConfirmation} style={{padding:12,alignItems:'center',opacity:busy||resendWait>0?.6:1}}><Text style={{color:ink,fontWeight:'700'}}>{resendWait>0?'Wyślij ponownie za '+resendWait+' s':'Wyślij ponownie potwierdzenie e-mail'}</Text></Pressable>}
 {(mode==='reset'||mode==='new-password')&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>{if(authRequest.current)return;clearPasswordRecoveryFlag();setCanRetryRecovery(false);setMode('login');setPassword('');setConfirmPassword('');setMessage('')}} style={{padding:12,alignItems:'center'}}><Text style={{color:ink,fontWeight:'700'}}>{activeEmail?'Wróć do profilu':'Wróć do logowania'}</Text></Pressable>}
 {(mode==='login'||mode==='register')&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>{if(authRequest.current)return;setMode(mode==='register'?'login':'register');setMessage('')}} style={{padding:12,alignItems:'center'}}><Text style={{color:ink,fontWeight:'700'}}>{mode==='register'?'Mam już konto — zaloguj':'Utwórz nowe konto'}</Text></Pressable>}
 {mode==='login'&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>{if(authRequest.current)return;setMode('reset');setMessage('')}} style={{padding:12,alignItems:'center'}}><Text style={{color:ink}}>Nie pamiętam hasła</Text></Pressable>}
  </>}
 <View style={{marginTop:17,marginBottom:6,gap:8}}>
  <Text style={{color:'#58677b',fontSize:12,lineHeight:20}}>TRENERKI oferuje autorskie kursy i autorskie dyplomy potwierdzające naukę. Dyplom można wpisać do CV jako szkolenie dodatkowe; nie jest kwalifikacją zawodową ani oficjalnym uprawnieniem.</Text>
  <View style={{flexDirection:'row',gap:17,flexWrap:'wrap'}}>
   <Pressable onPress={()=>Linking.openURL(siteUrl+'/academy/regulamin.html')}><Text style={{fontSize:12,color:'#A8741C',fontWeight:'900'}}>Regulamin</Text></Pressable>
   <Pressable onPress={()=>Linking.openURL(siteUrl+'/academy/prywatnosc.html')}><Text style={{fontSize:12,color:'#A8741C',fontWeight:'900'}}>Polityka prywatności</Text></Pressable>
   <Pressable onPress={()=>Linking.openURL(siteUrl+'/academy/certyfikaty.html')}><Text style={{fontSize:12,color:'#A8741C',fontWeight:'900'}}>Zasady dyplomów</Text></Pressable>
   <Pressable accessibilityRole="button" accessibilityLabel="Ustawienia plików cookie" onPress={()=>{
    if(typeof window!=='undefined'&&typeof (window as any).TrenerkiAds?.openSettings==='function')
     (window as any).TrenerkiAds.openSettings();
    else void Linking.openURL(siteUrl+'/academy/prywatnosc.html#s8');
   }}><Text style={{fontSize:12,color:'#A8741C',fontWeight:'900'}}>Ustawienia cookies</Text></Pressable>
  </View>
 </View>
 {isAdmin&&<Pressable accessibilityRole="button" onPress={()=>router.push('/admin')} style={{alignSelf:'center',padding:11,marginTop:15}}><Text style={{color:'#6b788d',fontSize:11}}>Staff</Text></Pressable>}
 <Text style={{fontSize:12,color:'#687789',marginTop:14}}>Rejestracja jest bezpłatna. Dostęp do płatnego kursu jest nadawany dopiero po potwierdzeniu zapłaty Stripe i obowiązuje przez 12 miesięcy. Darmowy kurs można odebrać po zalogowaniu.</Text>
 </View></ScrollView>
}
