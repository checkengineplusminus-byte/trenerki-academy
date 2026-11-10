import React,{useEffect,useState} from 'react';
import {View,ActivityIndicator} from 'react-native';
import {Stack} from 'expo-router';
import {supabase} from '../src/supabase';

/* Navigation guard only; real authorization is also enforced by Supabase RLS. */
export default function RootLayout(){
 const [ready,setReady]=useState(false);
 const [signedIn,setSignedIn]=useState(false);
 const [isAdmin,setIsAdmin]=useState(false);
 useEffect(()=>{
  let mounted=true;
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
   if(!mounted)return;
   if(event==='SIGNED_OUT'){setSignedIn(false);setReady(true);}
   else if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED'||event==='INITIAL_SESSION'){
    setSignedIn(!!session?.user);
    setReady(true);
   }
  });
  void supabase.auth.getUser().then(({data,error})=>{
   if(mounted){setSignedIn(!error&&!!data.user);setReady(true);}
  }).catch(()=>{if(mounted){setSignedIn(false);setReady(true);}});
  return()=>{mounted=false;subscription.unsubscribe();};
 },[]);
 useEffect(()=>{
  let active=true;
  if(!signedIn){setIsAdmin(false);return()=>{active=false};}
  setIsAdmin(false);
  void supabase.functions.invoke('ta-academy',{body:{action:'whoami'}}).then(({data,error})=>{
   if(active)setIsAdmin(!error&&data?.is_admin===true);
  }).catch(()=>{if(active)setIsAdmin(false)});
  return()=>{active=false};
 },[signedIn]);
 if(!ready)return <View style={{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#fcfcf7'}}><ActivityIndicator size="large" color="#2d7146"/></View>;
 return <Stack screenOptions={{headerShown:false}}>
   <Stack.Screen name="index"/>
   <Stack.Screen name="konto"/>
   <Stack.Screen name="kup"/>
   <Stack.Screen name="prezent"/>
   <Stack.Screen name="firma"/>
   <Stack.Protected guard={signedIn} redirectTo="/konto">
    <Stack.Screen name="moje-kursy"/>
    <Stack.Screen name="nauka"/>
    <Stack.Screen name="dyplom"/>
   </Stack.Protected>
   <Stack.Protected guard={signedIn&&isAdmin} redirectTo="/moje-kursy">
    <Stack.Screen name="admin"/>
   </Stack.Protected>
  </Stack>;
}
