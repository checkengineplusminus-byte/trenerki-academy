import React,{useEffect,useState} from 'react';
import {View,Text,Pressable,ActivityIndicator,Platform,useWindowDimensions,Linking} from 'react-native';
import {Slot,Stack,usePathname,useGlobalSearchParams,useRouter,type ErrorBoundaryProps,type Href} from 'expo-router';
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
 return <View testID="route-recovery" style={{flex:1,justifyContent:'center',alignItems:'center',padding:24,backgroundColor:'#F7F9FC'}}>
  <View style={{width:'100%',maxWidth:540,gap:16,padding:24,borderRadius:16,backgroundColor:'#EFF4F8'}}>
   <Text accessibilityRole="header" style={{fontSize:24,fontWeight:'900',color:'#14263B'}}>Nie udało się otworzyć tej strony</Text>
   <Text style={{fontSize:16,lineHeight:25,color:'#14263B'}}>Strona mogła zostać zaktualizowana lub połączenie zostało przerwane. Zapisane wyniki pozostają na Twoim koncie. Spróbuj ponownie.</Text>
   <Pressable accessibilityRole="button" onPress={()=>{
    if(web&&typeof window!=='undefined')window.location.replace(lastWorkingWebLocation||webLocation());
    else void retry();
   }} style={{minHeight:48,padding:14,borderRadius:10,backgroundColor:'#D6A444'}}>
    <Text style={{fontWeight:'800',color:'white',textAlign:'center'}}>{web?'Odśwież stronę':'Spróbuj ponownie'}</Text>
   </Pressable>
  </View>
 </View>;
}


// Shared navigation across account, checkout, business, gifts and partner screens.
// Course workspaces keep their own full-screen learning controls.
const siteMenu=[
 {label:'Kursy',href:'/academy/index.html#kursy'},
 {label:'Dla firm',href:'/firma'},
 {label:'Moje kursy',href:'/moje-kursy'},
 {label:'Mój profil',href:'/konto'},
 {label:'Nie jesteś sam',href:'/pomoc'}
] as const;

function SiteAccountHeader({signedIn}:{signedIn:boolean}){
 const {width}=useWindowDimensions();
 const router=useRouter();
 const pathname=usePathname();
 const compact=width<920;
 const [open,setOpen]=useState(false);
 useEffect(()=>{setOpen(false)},[pathname,compact]);
 function navigate(href:string){
  setOpen(false);
  if(href.startsWith('/academy/')){
   if(Platform.OS==='web'&&typeof window!=='undefined')window.location.assign(href);
   else void Linking.openURL('https://trenerki.com'+href);
  }else router.push(href as Href);
 }
 const nav=(mobile:boolean)=>siteMenu.map(item=>{
  const active=item.href===pathname;
  const profile=item.href==='/konto';
  const label=profile&&!signedIn?'Zaloguj się':item.label;
  return <Pressable key={item.href} accessibilityRole="link"
   accessibilityState={{selected:active}}
   onPress={()=>navigate(item.href)}
   style={{minHeight:44,justifyContent:'center',alignItems:mobile?'flex-start':'center',
    paddingHorizontal:mobile?16:12,paddingVertical:10,borderRadius:9,
    backgroundColor:profile?'#EDC368':active?'#244963':'transparent',
    borderWidth:profile?1:0,borderColor:'#D3A749'}}>
   <Text style={{fontSize:mobile?14:13,fontWeight:profile?'900':'700',
    color:profile?'#14263B':active?'#FFDC8B':'#EDF3FA'}}>{label}</Text>
  </Pressable>;
 });
 return <View accessibilityRole="header" style={{zIndex:300,backgroundColor:'#0B2238',borderBottomWidth:1,borderBottomColor:'#395671'}}>
  <View style={{width:'100%',maxWidth:1260,alignSelf:'center',paddingHorizontal:compact?14:24,
    minHeight:64,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8}}>
   <Pressable accessibilityRole="link" accessibilityLabel="Trenerki Academy — strona główna"
    onPress={()=>navigate('/academy/index.html')} style={{flexDirection:'row',alignItems:'center',gap:9,minWidth:0}}>
    <View style={{width:37,height:37,borderRadius:10,borderWidth:2,borderColor:'#E7BC63',
      justifyContent:'center',alignItems:'center'}}>
     <Text style={{color:'#F5CB79',fontWeight:'900',fontSize:19}}>T.</Text>
    </View>
    <View>
     <Text style={{fontWeight:'900',color:'#FFFFFF',fontSize:compact?15:18,letterSpacing:-.4}}>TRENERKI</Text>
     <Text style={{fontWeight:'700',fontSize:9,color:'#C9DAEA',letterSpacing:1.7}}>ACADEMY</Text>
    </View>
   </Pressable>
   {compact?
    <Pressable accessibilityRole="button" accessibilityLabel={open?'Zamknij menu':'Otwórz menu'}
     accessibilityState={{expanded:open}}
     onPress={()=>setOpen(v=>!v)}
     style={{minHeight:44,minWidth:76,alignItems:'center',justifyContent:'center',
      borderRadius:10,borderWidth:1,borderColor:'#B59253',backgroundColor:'#163853'}}>
     <Text style={{color:'#FFDA8B',fontWeight:'800',fontSize:13}}>{open?'Zamknij':'Menu'}</Text>
    </Pressable>:
    <View style={{flexDirection:'row',alignItems:'center',gap:3}}>{nav(false)}</View>}
  </View>
  {compact&&open&&<View style={{position:'absolute',right:14,top:63,
    width:Math.min(310,width-28),backgroundColor:'#102E48',padding:10,
    borderWidth:1,borderColor:'#B18B4A',borderRadius:14,
    shadowColor:'#071726',shadowOpacity:.26,shadowRadius:18,elevation:16,zIndex:1000}}>
    {nav(true)}
   </View>}
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
 if(pathname==='/pomoc')return <View style={{flex:1}}><SiteAccountHeader signedIn={false}/><View style={{flex:1}}><Slot/></View></View>;
 return <AccountLayout/>;
}

function AccountLayout(){
 const pathname=usePathname();
 const {width}=useWindowDimensions();
 const learningRoutes=['/ksiegowosc','/program-ksiegowosci','/temat-ksiegowosci','/sciezka-ksiegowosci','/biuro-ksiegowe','/dane-biura','/formularze-ksiegowego','/majatek-ksiegowy','/slownik-ksiegowego'];
 const hideAccountFooter=width<760&&(pathname==='/konto'||learningRoutes.includes(pathname));
 const hideSiteHeader=pathname==='/'||pathname==='/nauka';
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
 if(!ready)return <View style={{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#F7F9FC'}}><ActivityIndicator size="large" color="#B88426"/></View>;
 // Learner entry routes must be exportable and remain mounted while a session
 // is being revalidated. Both screens independently verify auth; RLS protects
 // all personal/paid lesson data. A transient guard=false must not send learners
 // to / (which redirects to the public catalog).
 return <View style={{flex:1}}>
  {!hideSiteHeader&&<SiteAccountHeader signedIn={signedIn}/>}
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
