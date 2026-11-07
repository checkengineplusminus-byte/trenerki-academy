import React,{useEffect} from 'react';
import {Platform,View,Text,Pressable,Linking} from 'react-native';

const LEGACY_SITE='/academy/index.html';

// Expo Hosting serves the original, fully restored HTML design from /public/academy.
// The course material remains protected by Supabase RLS; this public entry only shows a catalog.
export default function Home(){
  useEffect(()=>{
    if(Platform.OS==='web' && typeof window!=='undefined'){
      const target=LEGACY_SITE+window.location.search+window.location.hash;
      window.location.replace(target);
    }
  },[]);
  return <View style={{flex:1,backgroundColor:'#fcfcf7',alignItems:'center',justifyContent:'center',padding:24}}>
    <Text style={{fontSize:28,fontWeight:'900',color:'#173228',marginBottom:18}}>TRENERKI Academy</Text>
    <Text style={{color:'#567362',fontSize:16,marginBottom:14,textAlign:'center'}}>Otwieramy stronę akademii w oryginalnym wyglądzie.</Text>
    <Pressable onPress={()=>Linking.openURL('https://trenerki-academy.expo.app'+LEGACY_SITE)}
      style={{backgroundColor:'#173228',borderRadius:12,paddingHorizontal:22,paddingVertical:15}}>
      <Text style={{color:'white',fontWeight:'800'}}>Otwórz akademię →</Text>
    </Pressable>
  </View>;
}
