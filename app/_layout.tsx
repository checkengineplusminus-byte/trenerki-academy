import React,{useEffect,useState} from 'react';
import {View,ActivityIndicator} from 'react-native';
import {Stack} from 'expo-router';
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
 return <Stack screenOptions={{headerShown:false}}>
  <Stack.Screen name="index"/>
  <Stack.Screen name="konto"/>
  <Stack.Screen name="kup"/>
  <Stack.Screen name="prezent"/>
  <Stack.Screen name="firma"/>
  <Stack.Screen name="admin"/>
  <Stack.Protected guard={signedIn} redirectTo="/konto">
   <Stack.Screen name="moje-kursy"/>
   <Stack.Screen name="nauka"/>
   <Stack.Screen name="dyplom"/>
   <Stack.Screen name="moje-dyplomy"/>
  </Stack.Protected>
 </Stack>;
}
