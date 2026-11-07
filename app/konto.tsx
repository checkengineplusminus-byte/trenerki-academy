import React,{useState} from 'react';
import {View,Text,TextInput,Pressable,ScrollView,Linking} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
const ink='#193b2a',pale='#e7f2da';
export default function AccountPage(){
 const router=useRouter(),params=useLocalSearchParams<{course?:string}>(),course=typeof params.course==='string'?params.course:'';
 const [mode,setMode]=useState<'register'|'login'|'reset'>('register'),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function checkout(){
   if(!course){router.replace('/moje-kursy');return;}
   const {data,error}=await supabase.functions.invoke('ta-create-checkout',{body:{course_slug:course}});
   if(error||!data?.url)throw new Error(data?.error||error?.message||'Płatność jest obecnie niedostępna.');
   await Linking.openURL(data.url);
 }
 async function submit(){
   setBusy(true);setMessage('');
   try{
     if(!email.includes('@'))throw new Error('Wpisz prawidłowy adres e-mail.');
     if(mode==='reset'){
       const redirectTo=typeof window==='undefined'?undefined:window.location.origin+'/konto';
       const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo});if(error)throw error;
       setMessage('Sprawdź pocztę e-mail i folder SPAM.');return;
     }
     if(password.length<8)throw new Error('Hasło powinno mieć minimum 8 znaków.');
     if(mode==='register'){
       if(name.trim().length<2)throw new Error('Wpisz swoje imię i nazwisko.');
       const emailRedirectTo=typeof window==='undefined'?undefined:window.location.origin+'/konto'+(course?'?course='+encodeURIComponent(course):'');
       const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo,data:{full_name:name.trim()}}});
       if(error)throw error;
       if(data.session){await checkout();return;}
       setMessage('Konto utworzone. Potwierdź adres e-mail (sprawdź także SPAM), potem zaloguj się i dokończ zakup.');return;
     }
     const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;
     await checkout();
   }catch(e:any){setMessage(e?.message||'Operacja nie powiodła się.');}finally{setBusy(false)}
 }
 const input={borderWidth:1,borderColor:'#c9d8c5',borderRadius:12,padding:13,marginBottom:12,color:ink,fontSize:16} as const;
 const heading=mode==='register'?'Rozpocznij naukę.':mode==='login'?'Witaj ponownie!':'Odzyskaj konto';
 return <ScrollView style={{flex:1,backgroundColor:'#fcfcf7'}} contentContainerStyle={{minHeight:'100%',padding:22,justifyContent:'center'}}>
 <View style={{maxWidth:530,width:'100%',alignSelf:'center',backgroundColor:'white',borderRadius:20,padding:28,borderWidth:1,borderColor:'#e0e9dc'}}>
 <Pressable onPress={()=>router.push('/')}><Text style={{color:ink,fontWeight:'700',marginBottom:22}}>← Wszystkie kursy</Text></Pressable>
 <Text style={{fontSize:12,color:'#61826c',fontWeight:'800',marginBottom:8}}>TRENERKI ACADEMY · TWOJE KONTO</Text>
 <Text style={{fontSize:30,fontWeight:'900',color:ink,marginBottom:10}}>{heading}</Text>
 <Text style={{color:'#53695d',lineHeight:22,marginBottom:20}}>{course?'Załóż konto lub zaloguj się, żeby bezpiecznie opłacić wybrany kurs. Dostęp ważny przez 12 miesięcy.':'Loguj się, aby zobaczyć zakupione kursy i zapisany postęp.'}</Text>
 {mode==='register'&&<TextInput style={input} placeholder="Imię i nazwisko" value={name} onChangeText={setName} autoComplete="name"/>}
 <TextInput style={input} placeholder="Adres e-mail" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address"/>
 {mode!=='reset'&&<TextInput style={input} placeholder="Hasło (minimum 8 znaków)" value={password} onChangeText={setPassword} secureTextEntry autoComplete={mode==='register'?'new-password':'current-password'}/>}
 {!!message&&<Text style={{color:'#355a42',backgroundColor:pale,padding:13,borderRadius:12,marginBottom:14}}>{message}</Text>}
 <Pressable onPress={submit} disabled={busy} style={{backgroundColor:ink,padding:16,borderRadius:12,alignItems:'center',opacity:busy?.5:1}}><Text style={{color:'white',fontWeight:'800'}}>{busy?'Przetwarzanie…':mode==='register'?'Załóż konto':mode==='login'?'Zaloguj się':'Wyślij link'}</Text></Pressable>
 <Pressable onPress={()=>{setMode(mode==='register'?'login':'register');setMessage('')}} style={{padding:12,alignItems:'center'}}><Text style={{color:ink,fontWeight:'700'}}>{mode==='register'?'Mam już konto — zaloguj':'Utwórz nowe konto'}</Text></Pressable>
 {mode==='login'&&<Pressable onPress={()=>{setMode('reset');setMessage('')}} style={{padding:12,alignItems:'center'}}><Text style={{color:ink}}>Nie pamiętam hasła</Text></Pressable>}
 <Text style={{fontSize:12,color:'#708778',marginTop:14}}>Dostęp do płatnych materiałów powstaje wyłącznie po potwierdzeniu płatności przez operatora. Rejestracja sama w sobie nie aktywuje kursu.</Text>
 </View></ScrollView>
}