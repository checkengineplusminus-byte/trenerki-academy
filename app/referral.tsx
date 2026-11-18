import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Linking,Pressable,Text,View,Platform} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';

// Expo Hosting temporarily redirects /123 → /referral?affiliateNumber=123.
// We resolve the number before entering the catalog so no early click can lose attribution.
const api=(process.env.EXPO_PUBLIC_SUPABASE_URL||'https://kcvvixcjuwglfvdpypzs.supabase.co').replace(/\/$/,'');
const publishableKey=process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_wpRp2JuWNW_WcjZdWXwIRQ_HfCPlxrj';
export default function Referral(){
 const params=useLocalSearchParams<{affiliateNumber?:string;course?:string}>();
 const router=useRouter();
 const [error,setError]=useState('');
 const raw=typeof params.affiliateNumber==='string'?params.affiliateNumber:'';
 const numeric=/^[1-9]\d{0,8}$/.test(raw)&&Number(raw)<=999999999;
 useEffect(()=>{
  let cancelled=false;
  if(!numeric){setError('Ten numer partnera jest nieprawidłowy.');return;}
  const controller=new AbortController();
  async function resolve(){
   try{
    const response=await fetch(api+'/functions/v1/ta-affiliate-resolve?id='+encodeURIComponent(raw),{
     method:'GET',headers:{apikey:publishableKey},signal:controller.signal,cache:'no-store'
    });
    if(!response.ok)throw new Error('unavailable');
    const payload=await response.json();
    if(!payload?.ok||typeof payload.ref!=='string'||!/^TA[A-F0-9]{12}$/.test(payload.ref))
      throw new Error('unavailable');
    if(cancelled)return;
    const url='/academy/index.html?ref='+encodeURIComponent(payload.ref);
    const course=typeof params.course==='string'&&/^[a-z0-9][a-z0-9_-]{1,79}$/.test(params.course)
      ?'&course='+encodeURIComponent(params.course):'';
    if(Platform.OS==='web'&&typeof window!=='undefined')window.location.replace(url+course);
    else void Linking.openURL('https://trenerki.com'+url+course);
   }catch{
    if(!cancelled)setError('Ten link partnerski nie jest dostępny. Sprawdź numer lub wróć do katalogu.');
   }
  }
  void resolve();
  return ()=>{cancelled=true;controller.abort()};
 },[raw,numeric,params.course]);
 return <View style={{flex:1,alignItems:'center',justifyContent:'center',padding:25,backgroundColor:'#fcfcf7',gap:16}}>
  <Text accessibilityRole="header" style={{fontSize:28,fontWeight:'900',color:'#173228',textAlign:'center'}}>TRENERKI Academy</Text>
  {error
   ?<><Text accessibilityLiveRegion="polite" style={{fontSize:16,color:'#7d352f',textAlign:'center'}}>{error}</Text>
     <Pressable accessibilityRole="button" onPress={()=>router.replace('/')} style={{padding:15,backgroundColor:'#173228',borderRadius:10}}>
      <Text style={{color:'white',fontWeight:'800'}}>Przejdź do katalogu</Text>
     </Pressable></>
   :<><ActivityIndicator size="large" color="#245f36"/>
     <Text style={{fontSize:16,color:'#567362',textAlign:'center'}}>Otwieramy katalog z Twojego linku partnerskiego…</Text></>}
 </View>;
}
