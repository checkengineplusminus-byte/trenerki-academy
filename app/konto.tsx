import React,{useEffect,useState} from 'react';
import {View,Text,TextInput,Pressable,ScrollView} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
const ink='#193b2a',pale='#e7f2da';
export default function AccountPage(){
 const router=useRouter(),params=useLocalSearchParams<{course?:string}>(),course=typeof params.course==='string'?params.course:'';
 const [activeEmail,setActiveEmail]=useState(''),[mode,setMode]=useState<'register'|'login'|'reset'|'new-password'>('register'),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[showPassword,setShowPassword]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{
  let isCurrent=true;
  void supabase.auth.getUser().then(({data:{user},error})=>{
    if(isCurrent && !error && user?.email)setActiveEmail(user.email);
  }).catch(()=>{});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
   if(event==='PASSWORD_RECOVERY'){
     setMode('new-password');setMessage('Podaj nowe hasło do swojego konta.');
   }else if(event==='SIGNED_IN' || event==='TOKEN_REFRESHED'){
     if(session?.user?.email)setActiveEmail(session.user.email);
   }else if(event==='SIGNED_OUT')setActiveEmail('');
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
       await supabase.auth.signOut();
       setMode('login');setPassword('');setConfirmPassword('');
       setMessage('Hasło zostało zmienione. Zaloguj się teraz nowym hasłem.');
       return;
     }
     if(!email.trim().includes('@'))throw new Error('Wpisz prawidłowy adres e-mail.');
     if(mode==='reset'){
       const redirectTo='https://trenerki-academy.expo.app/konto';
       const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo});if(error)throw error;
       setMessage('Sprawdź pocztę e-mail i folder SPAM.');return;
     }
     if(password.length<8)throw new Error('Hasło powinno mieć minimum 8 znaków.');
     if(mode==='register'){
       if(name.trim().length<2)throw new Error('Wpisz swoje imię i nazwisko.');
       const emailRedirectTo='https://trenerki-academy.expo.app/konto';
       const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo,data:{full_name:name.trim()}}});
       if(error)throw error;
       if(data.session){router.replace('/moje-kursy');return;}
       setMessage('Konto utworzone. Potwierdź adres e-mail (sprawdź także SPAM), a następnie zaloguj się do swojego konta.');return;
     }
     const {error}=await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password});
     if(error){
       if(error.code==='invalid_credentials'||/invalid login credentials/i.test(error.message))throw new Error('Nieprawidłowy e-mail lub hasło. Sprawdź hasło wpisane przy rejestracji lub wybierz „Nie pamiętam hasła”.');
       if(error.code==='email_not_confirmed')throw new Error('Potwierdź adres e-mail w wiadomości od TRENERKI Academy.');
       throw error;
     }
     router.replace('/moje-kursy');
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
   <Pressable onPress={()=>router.replace('/moje-kursy')} style={{backgroundColor:ink,padding:13,borderRadius:10,alignItems:'center'}}>
     <Text style={{color:'#fff',fontWeight:'800'}}>Otwórz Moje kursy →</Text>
   </Pressable>
   <Pressable onPress={()=>{setMode('new-password');setMessage('Możesz zmienić hasło w zalogowanym koncie.');}} style={{padding:11,alignItems:'center'}}>
     <Text style={{color:ink,fontWeight:'700'}}>Zmień hasło bez ponownego logowania</Text>
   </Pressable>
 </View>}
 <Text style={{color:'#53695d',lineHeight:22,marginBottom:20}}>{mode==='new-password'?'Po otwarciu linku z e-maila ustaw nowe hasło i zaloguj się ponownie.':course?'Załóż konto lub zaloguj się, żeby korzystać ze swojego panelu ucznia. Płatności za kursy uruchomimy w kolejnym etapie.':'Zaloguj się, aby zobaczyć swoje kursy i zapisany postęp. Płatności uruchomimy później.'}</Text>
 {mode==='register'&&<TextInput style={input} placeholder="Imię i nazwisko" value={name} onChangeText={setName} autoComplete="name"/>}
 {mode!=='new-password'&&<TextInput style={input} placeholder="Adres e-mail" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address"/>}
 {mode!=='reset'&&<TextInput style={input} placeholder={mode==='new-password'?'Nowe hasło (min. 8 znaków)':'Hasło (minimum 8 znaków)'} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoComplete={mode==='register'||mode==='new-password'?'new-password':'current-password'}/>}
 {mode!=='reset'&&<Pressable onPress={()=>setShowPassword(v=>!v)} style={{alignSelf:'flex-end',paddingVertical:6,marginBottom:9}}><Text style={{color:ink,fontWeight:'700'}}>{showPassword?'Ukryj hasło':'Pokaż hasło'}</Text></Pressable>}
 {mode==='new-password'&&<TextInput style={input} placeholder="Powtórz nowe hasło" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password"/>}
 {!!message&&<Text style={{color:'#355a42',backgroundColor:pale,padding:13,borderRadius:12,marginBottom:14}}>{message}</Text>}
 <Pressable onPress={submit} disabled={busy} style={{backgroundColor:ink,padding:16,borderRadius:12,alignItems:'center',opacity:busy?.5:1}}><Text style={{color:'white',fontWeight:'800'}}>{busy?'Przetwarzanie…':mode==='register'?'Załóż konto':mode==='login'?'Zaloguj się':mode==='reset'?'Wyślij link':'Zmień hasło'}</Text></Pressable>
 {mode!=='new-password'&&<Pressable onPress={()=>{setMode(mode==='register'?'login':'register');setMessage('')}} style={{padding:12,alignItems:'center'}}><Text style={{color:ink,fontWeight:'700'}}>{mode==='register'?'Mam już konto — zaloguj':'Utwórz nowe konto'}</Text></Pressable>}
 {mode==='login'&&<Pressable onPress={()=>{setMode('reset');setMessage('')}} style={{padding:12,alignItems:'center'}}><Text style={{color:ink}}>Nie pamiętam hasła</Text></Pressable>}
 <Text style={{fontSize:12,color:'#708778',marginTop:14}}>Rejestracja i logowanie już działają. Zakup kursów będzie dostępny po uruchomieniu płatności; samo założenie konta nie aktywuje płatnego kursu.</Text>
 </View></ScrollView>
}