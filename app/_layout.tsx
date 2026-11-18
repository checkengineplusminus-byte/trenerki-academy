import React,{useEffect,useState} from 'react';
import {View,Text,Pressable,ActivityIndicator,Platform,useWindowDimensions} from 'react-native';
import {Slot,Stack,usePathname,useGlobalSearchParams,type ErrorBoundaryProps} from 'expo-router';
import {HelpFooter} from '../src/support/links';
import LearningSupportBar from '../src/support/LearningSupportBar';
import {supabase} from '../src/supabase';

// The router may replace the URL with its root when a parent boundary catches
// a failed lazy route. Retain the most recent committed page for recovery.
const webLocation=()=>Platform.OS==='web'&&typeof window!=='undefined'
 ? window.location.pathname+window.location.search : '';
let lastWorkingWebLocation=webLocation();

// An open tab can reference a route chunk from the release before the latest
// deployment. Keep a recovery action visible instead of leaving a blank page.
export function ErrorBoundary({retry}:ErrorBoundaryProps){
 const web=Platform.OS==='web';
 return <View testID="route-recovery" style={{flex:1,justifyContent:'center',alignItems:'center',padding:24,backgroundColor:'#fbfcf7'}}>
  <View style={{width:'100%',maxWidth:540,gap:16,padding:24,borderRadius:16,backgroundColor:'#eaf3e4'}}>
   <Text accessibilityRole="header" style={{fontSize:24,fontWeight:'900',color:'#19392b'}}>Nie udało się otworzyć tej strony</Text>
   <Text style={{fontSize:16,lineHeight:25,color:'#19392b'}}>Strona mogła zostać zaktualizowana lub połączenie zostało przerwane. Zapisane wyniki pozostają na Twoim koncie. Spróbuj ponownie.</Text>
   <Pressable accessibilityRole="button" onPress={()=>{
    if(web&&typeof window!=='undefined')window.location.replace(lastWorkingWebLocation||webLocation());
    else void retry();
   }} style={{minHeight:48,padding:14,borderRadius:10,backgroundColor:'#245f36'}}>
    <Text style={{fontWeight:'800',color:'white',textAlign:'center'}}>{web?'Odśwież stronę':'Spróbuj ponownie'}</Text>
   </Pressable>
  </View>
 </View>;
}

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
 const routeParams=JSON.stringify(useGlobalSearchParams());
 useEffect(()=>{lastWorkingWebLocation=webLocation();},[pathname,routeParams]);
 useEffect(()=>{
  if(Platform.OS!=='web'||typeof document==='undefined'||document.querySelector('script[data-trenerki-google-ads]'))return;
  const script=document.createElement('script');script.src='/academy/google-ads.js';script.async=true;
  script.setAttribute('data-trenerki-google-ads','true');document.head.appendChild(script);
 },[]);
 if(pathname==='/pomoc')return <Slot/>;
 return <AccountLayout/>;
}

function AccountLayout(){
 const pathname=usePathname();
 const {width}=useWindowDimensions();
 const learningRoutes=['/ksiegowosc','/program-ksiegowosci','/temat-ksiegowosci','/sciezka-ksiegowosci','/biuro-ksiegowe','/dane-biura','/formularze-ksiegowego','/majatek-ksiegowy','/slownik-ksiegowego'];
 const hideAccountFooter=width<760&&(pathname==='/konto'||learningRoutes.includes(pathname));
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
 // Learner entry routes must be exportable and remain mounted while a session
 // is being revalidated. Both screens independently verify auth; RLS protects
 // all personal/paid lesson data. A transient guard=false must not send learners
 // to / (which redirects to the public catalog).
 return <View style={{flex:1}}>

  <View style={{flex:1}}><Stack screenOptions={{headerShown:false}}>
  <Stack.Screen name="index"/>
  <Stack.Screen name="konto"/>
  <Stack.Screen name="kup"/>
  <Stack.Screen name="moje-kursy"/>
  <Stack.Screen name="nauka"/>
  <Stack.Screen name="materialy-wolontariusza"/>
  <Stack.Screen name="prezent"/>
  <Stack.Screen name="firma"/>
  <Stack.Screen name="partner"/>
  <Stack.Screen name="referral"/>
  <Stack.Screen name="admin"/>
  <Stack.Protected guard={signedIn} redirectTo="/konto">
   <Stack.Screen name="partner-admin"/>
   <Stack.Screen name="ustawienia"/>
   <Stack.Screen name="biuro-ksiegowe"/>
   <Stack.Screen name="dane-biura"/>
   <Stack.Screen name="majatek-ksiegowy"/>
   <Stack.Screen name="slownik-ksiegowego"/>
   <Stack.Screen name="ksiegowosc"/>
   <Stack.Screen name="program-ksiegowosci"/>
   <Stack.Screen name="temat-ksiegowosci"/>
   <Stack.Screen name="sciezka-ksiegowosci"/>
   <Stack.Screen name="formularze-ksiegowego"/>
   <Stack.Screen name="dyplom"/>
   <Stack.Screen name="moje-dyplomy"/>
  </Stack.Protected>
 </Stack></View>{pathname==='/nauka'?<LearningSupportBar/>:!hideAccountFooter?<HelpFooter/>:null}</View>;
}
