import React,{useEffect,useState} from 'react';
import {View,Text,TextInput,Pressable,ScrollView,Linking} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {supabase,isPasswordRecoveryRedirect,clearPasswordRecoveryFlag} from '../src/supabase';
const ink='#193b2a',pale='#e7f2da';
// Keep Expo preview authentication working until custom DNS and Supabase Auth allowlist are configured.
const siteUrl=(typeof window!=='undefined' && /^https:\/\/(?:www\.)?(?:trenerki\.com)$|^https:\/\/trenerki-academy\.expo\.app$/.test(window.location?.origin||''))
 ? window.location.origin : 'https://trenerki.com';
export default function AccountPage(){
 const router=useRouter(),params=useLocalSearchParams<{course?:string;next?:string;gift?:string}>(),
 course=typeof params.course==='string' && /^[a-z0-9][a-z0-9_-]{1,79}$/.test(params.course)?params.course:'',
 gift=typeof params.gift==='string' && /^TA-[0-9A-F]{32}$/i.test(params.gift)?params.gift:'';
 const [activeEmail,setActiveEmail]=useState(''),[mode,setMode]=useState<'register'|'login'|'reset'|'new-password'>(isPasswordRecoveryRedirect()?'new-password':course?'login':'register'),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[showPassword,setShowPassword]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const continueToSelectedCourse=async()=>{
    if(gift){router.replace({pathname:'/prezent',params:{code:gift}});return;}
    if(course){router.replace({pathname:params.next==='gift'?'/prezent':'/kup',params:{course}});return;}
    // Email confirmation sends users back to /konto without original query params.
    // Recover the chosen course from signup metadata for navigation only;
    // enrollment authorization is always checked independently by the server.
    const {data:{user}}=await supabase.auth.getUser();
    const candidate=user?.user_metadata?.pending_course;
    const selected=typeof candidate==='string'&&/^[a-z0-9][a-z0-9_-]{1,79}$/.test(candidate)?candidate:'';
    const next=user?.user_metadata?.pending_checkout==='gift'?'/prezent':'/kup';
    const possibleGift=user?.user_metadata?.pending_gift;
    const savedGift=typeof possibleGift==='string'&&/^TA-[0-9A-F]{32}$/i.test(possibleGift)?possibleGift:'';
    if(selected||savedGift){
      // Clear once consumed so future logins don't keep redirecting to old courses.
      await supabase.auth.updateUser({data:{pending_course:null,pending_gift:null,pending_checkout:null}});
      if(savedGift){router.replace({pathname:'/prezent',params:{code:savedGift}});return;}
      router.replace({pathname:next,params:{course:selected}});return;
    }
    router.replace('/moje-kursy');
 };
 useEffect(()=>{
  let isCurrent=true;
  const showRecovery=()=>{
    if(!isCurrent)return;
    setMode('new-password');
    setMessage('Link potwierdzony. Ustaw nowe hasło do swojego konta.');
  };
  // Subscribe before reading the session; the redirect event can race with screen mounting.
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
    if(!isCurrent)return;
    if(event==='PASSWORD_RECOVERY')showRecovery();
    else if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED'){
      if(session?.user?.email)setActiveEmail(session.user.email);
    }else if(event==='SIGNED_OUT')setActiveEmail('');
  });
  // Handle PASSWORD_RECOVERY already captured by the early listener in src/supabase.ts.
  void supabase.auth.getUser().then(({data:{user},error})=>{
    if(!isCurrent)return;
    if(!error&&user?.email)setActiveEmail(user.email);
    if(isPasswordRecoveryRedirect()){
      if(!error&&user)showRecovery();
      else{
        setMode('reset');
        setMessage('Link odzyskiwania wygasł lub jest nieważny. Poproś o nową wiadomość.');
        clearPasswordRecoveryFlag();
      }
    }
  }).catch(()=>{
    if(isCurrent&&isPasswordRecoveryRedirect()){
      setMode('reset');
      setMessage('Nie udało się zweryfikować linku. Wyślij nową prośbę.');
      clearPasswordRecoveryFlag();
    }
  });
  return()=>{isCurrent=false;subscription.unsubscribe();};
 },[]);
 async function submit(){
   setBusy(true);setMessage('');
   try{
     if(mode==='new-password'){
       if(password.length<8)throw new Error('Nowe hasło musi mieć co najmniej 8 znaków.');
       if(password!==confirmPassword)throw new Error('Podane hasła różnią się.');
       const {error}=await supabase.auth.updateUser({password});
       if(error)throw error;
       clearPasswordRecoveryFlag();
       await supabase.auth.signOut();
       setMode('login');setPassword('');setConfirmPassword('');
       setMessage('Hasło zostało zmienione. Zaloguj się teraz nowym hasłem.');
       return;
     }
     if(!email.trim().includes('@'))throw new Error('Wpisz prawidłowy adres e-mail.');
     if(mode==='reset'){
       const redirectTo=siteUrl+'/konto';
       const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo});if(error)throw error;
       setMessage('Sprawdź pocztę e-mail i folder SPAM.');return;
     }
     if(password.length<8)throw new Error('Hasło powinno mieć minimum 8 znaków.');
     if(mode==='register'){
       if(name.trim().length<2)throw new Error('Wpisz swoje imię i nazwisko.');
       const emailRedirectTo=siteUrl+'/konto';
       const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo,data:{full_name:name.trim(),pending_course:course||null,pending_gift:gift||null,pending_checkout:params.next==='gift'?'gift':null}}});
       if(error)throw error;
       if(data.session){await continueToSelectedCourse();return;}
       setMessage('Konto utworzone. Potwierdź e-mail (również w SPAM), następnie zaloguj się. Wybrany kurs będzie czekał w koszyku.');return;
     }
     const {error}=await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password});
     if(error){
       if(error.code==='invalid_credentials'||/invalid login credentials/i.test(error.message))throw new Error('Nieprawidłowy e-mail lub hasło. Sprawdź hasło wpisane przy rejestracji lub wybierz „Nie pamiętam hasła”.');
       if(error.code==='email_not_confirmed')throw new Error('Potwierdź adres e-mail w wiadomości od TRENERKI Academy.');
       throw error;
     }
     await continueToSelectedCourse();
   }catch(e:any){setMessage(e?.message||'Operacja nie powiodła się.');}finally{setBusy(false)}
 }
 const input={borderWidth:1,borderColor:'#c9d8c5',borderRadius:12,padding:13,marginBottom:12,color:ink,fontSize:16} as const;
 const heading=mode==='register'?'Rozpocznij naukę.':mode==='login'?'Witaj ponownie!':mode==='reset'?'Odzyskaj konto':'Ustaw nowe hasło';
 return <ScrollView style={{flex:1,backgroundColor:'#fcfcf7'}} contentContainerStyle={{minHeight:'100%',padding:22,justifyContent:'center'}}>
 <View style={{maxWidth:530,width:'100%',alignSelf:'center',backgroundColor:'white',borderRadius:20,padding:28,borderWidth:1,borderColor:'#e0e9dc'}}>
 <Pressable onPress={()=>router.push('/')}><Text style={{color:ink,fontWeight:'700',marginBottom:22}}>← Wszystkie kursy</Text></Pressable>
 <Text style={{fontSize:12,color:'#61826c',fontWeight:'800',marginBottom:8}}>TRENERKI ACADEMY · TWOJE KONTO</Text>
 <Text style={{fontSize:30,fontWeight:'900',color:ink,marginBottom:10}}>{heading}</Text>
 {!!activeEmail&&mode!=='new-password'&&<View style={{backgroundColor:'#e8f3dc',borderWidth:1,borderColor:'#d3e6c0',borderRadius:13,padding:16,marginVertical:12}}>
   <Text style={{fontWeight:'800',color:ink}}>Twoja sesja nadal jest aktywna</Text>
   <Text style={{color:'#45664f',marginTop:5,marginBottom:11}}>{activeEmail}</Text>
   <Pressable onPress={()=>{void continueToSelectedCourse().catch(()=>router.replace('/moje-kursy'));}} style={{backgroundColor:ink,padding:13,borderRadius:10,alignItems:'center'}}>
     <Text style={{color:'#fff',fontWeight:'800'}}>{gift?'Odbierz prezent →':course?'Kontynuuj do kursu →':'Otwórz Moje kursy →'}</Text>
   </Pressable>
   <Pressable onPress={()=>{setMode('new-password');setMessage('Możesz zmienić hasło w zalogowanym koncie.');}} style={{padding:11,alignItems:'center'}}>
     <Text style={{color:ink,fontWeight:'700'}}>Zmień hasło bez ponownego logowania</Text>
   </Pressable>
 </View>}
 <Text style={{color:'#53695d',lineHeight:22,marginBottom:20}}>{mode==='new-password'?'Po otwarciu linku z e-maila ustaw nowe hasło i zaloguj się ponownie.':gift?'Zaloguj się, żeby odebrać prezent od bliskiej osoby. Twoja karta podarunkowa pozostanie wybrana.':course?'Zaloguj się lub utwórz konto. Po zalogowaniu wrócisz do wybranego kursu i zobaczysz jego cenę oraz przycisk zakupu.':'Zaloguj się, aby zobaczyć swoje kursy i zapisany postęp. Wybierz kurs, a następnie zapłać bezpiecznie przez Stripe.'}</Text>
 {mode==='register'&&<TextInput style={input} placeholder="Imię i nazwisko" value={name} onChangeText={setName} autoComplete="name"/>}
 {mode!=='new-password'&&<TextInput style={input} placeholder="Adres e-mail" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address"/>}
 {mode!=='reset'&&<TextInput style={input} placeholder={mode==='new-password'?'Nowe hasło (min. 8 znaków)':'Hasło (minimum 8 znaków)'} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoComplete={mode==='register'||mode==='new-password'?'new-password':'current-password'}/>}
 {mode!=='reset'&&<Pressable onPress={()=>setShowPassword(v=>!v)} style={{alignSelf:'flex-end',paddingVertical:6,marginBottom:9}}><Text style={{color:ink,fontWeight:'700'}}>{showPassword?'Ukryj hasło':'Pokaż hasło'}</Text></Pressable>}
 {mode==='new-password'&&<TextInput style={input} placeholder="Powtórz nowe hasło" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password"/>}
 {!!message&&<Text style={{color:'#355a42',backgroundColor:pale,padding:13,borderRadius:12,marginBottom:14}}>{message}</Text>}
 <Pressable onPress={submit} disabled={busy} style={{backgroundColor:ink,padding:16,borderRadius:12,alignItems:'center',opacity:busy?.5:1}}><Text style={{color:'white',fontWeight:'800'}}>{busy?'Przetwarzanie…':mode==='register'?'Załóż konto':mode==='login'?'Zaloguj się':mode==='reset'?'Wyślij link':'Zmień hasło'}</Text></Pressable>
 {mode!=='new-password'&&<Pressable onPress={()=>{setMode(mode==='register'?'login':'register');setMessage('')}} style={{padding:12,alignItems:'center'}}><Text style={{color:ink,fontWeight:'700'}}>{mode==='register'?'Mam już konto — zaloguj':'Utwórz nowe konto'}</Text></Pressable>}
 {mode==='login'&&<Pressable onPress={()=>{setMode('reset');setMessage('')}} style={{padding:12,alignItems:'center'}}><Text style={{color:ink}}>Nie pamiętam hasła</Text></Pressable>}
 <View style={{marginTop:17,marginBottom:6,gap:8}}>
  <Text style={{color:'#55705e',fontSize:12,lineHeight:20}}>TRENERKI oferuje autorskie kursy i autorskie dyplomy potwierdzające naukę. Dyplom można wpisać do CV jako szkolenie dodatkowe; nie jest kwalifikacją zawodową ani oficjalnym uprawnieniem.</Text>
  <View style={{flexDirection:'row',gap:17,flexWrap:'wrap'}}>
   <Pressable onPress={()=>Linking.openURL(siteUrl+'/academy/regulamin.html')}><Text style={{fontSize:12,color:'#237244',fontWeight:'900'}}>Regulamin</Text></Pressable>
   <Pressable onPress={()=>Linking.openURL(siteUrl+'/academy/prywatnosc.html')}><Text style={{fontSize:12,color:'#237244',fontWeight:'900'}}>Polityka prywatności</Text></Pressable>
   <Pressable onPress={()=>Linking.openURL(siteUrl+'/academy/certyfikaty.html')}><Text style={{fontSize:12,color:'#237244',fontWeight:'900'}}>Zasady dyplomów</Text></Pressable>
  </View>
 </View>
 <Text style={{fontSize:12,color:'#708778',marginTop:14}}>Rejestracja jest bezpłatna. Dostęp do płatnego kursu jest nadawany dopiero po potwierdzeniu zapłaty Stripe i obowiązuje przez 12 miesięcy. Darmowy kurs można odebrać po zalogowaniu.</Text>
 </View></ScrollView>
}