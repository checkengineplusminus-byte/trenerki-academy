import React,{useEffect,useState} from 'react';
import {View,ActivityIndicator,Platform} from 'react-native';
import {Slot,Stack,usePathname} from 'expo-router';
import {HelpFooter} from '../src/support/links';
import {supabase} from '../src/supabase';

/**
 * Route visibility is a convenience, NOT the authorization boundary.
 * /admin always renders only its access-check screen until the verified
 * Supabase owner role is established; Edge Functions enforce that role.
 *
 * Avoid making the entire site wait for ta-academy/whoami: if a network
 * request stalls, a global guard must never lock users out of /konto.
 */
export default function RootLayout(){
 const pathname=usePathname();
 useEffect(()=>{
  if(Platform.OS!=='web'||typeof document==='undefined'||document.querySelector('script[data-trenerki-google-ads]'))return;
  const script=document.createElement('script');script.src='/academy/google-ads.js';script.async=true;
  script.setAttribute('data-trenerki-google-ads','true');document.head.appendChild(script);
 },[]);
 if(pathname==='/pomoc')return <Slot/>;
 return <AccountLayout/>;
}

function AccountLayout(){
 const [ready,setReady]=useState(false);
 const [signedIn,setSignedIn]=useState(false);
 useEffect(()=>{
  let mounted=true;
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
   if(!mounted)return;
   setSignedIn(!!session?.user);
   setReady(true);
  });
  void supabase.auth.getSession().then(({data})=>{
   if(!mounted)return;
   setSignedIn(!!data.session?.user);
   setReady(true);
  }).catch(()=>{if(mounted){setSignedIn(false);setReady(true)}});
  return()=>{mounted=false;subscription.unsubscribe()};
 },[]);
 if(!ready)return <View style={{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#fcfcf7'}}><ActivityIndicator size="large" color="#2d7146"/></View>;
 return <View style={{flex:1}}><View style={{flex:1}}><Stack screenOptions={{headerShown:false}}>
  <Stack.Screen name="index"/>
  <Stack.Screen name="konto"/>
  <Stack.Screen name="kup"/>
  <Stack.Screen name="materialy-wolontariusza"/>
  <Stack.Screen name="prezent"/>
  <Stack.Screen name="firma"/>
  <Stack.Screen name="admin"/>
  <Stack.Protected guard={signedIn} redirectTo="/konto">
   <Stack.Screen name="moje-kursy"/>
   <Stack.Screen name="ustawienia"/>
   <Stack.Screen name="nauka"/>
   <Stack.Screen name="biuro-ksiegowe"/>
   <Stack.Screen name="slownik-ksiegowego"/>
   <Stack.Screen name="dyplom"/>
   <Stack.Screen name="moje-dyplomy"/>
  </Stack.Protected>
 </Stack></View><HelpFooter/></View>;
}
