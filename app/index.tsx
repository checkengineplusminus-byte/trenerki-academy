import React,{useEffect} from 'react';
import {Platform,View,Text,Pressable,Linking} from 'react-native';
import {getInitialRecoveryHash} from '../src/supabase';

const LEGACY_SITE='/academy/index.html';

export function generateMetadata(){
  return {
    title:'Trenerki Academy — kursy online i praktyczna nauka',
    description:'Poznaj kursy online Trenerki Academy: budownictwo, technologie, biznes, rzemiosło i codzienne umiejętności. Ucz się we własnym tempie.',
  };
}

// Expo Hosting serves the original, fully restored HTML design from /public/academy.
// The course material remains protected by Supabase RLS; this public entry only shows a catalog.
export default function Home(){
  useEffect(()=>{
    if(Platform.OS==='web' && typeof window!=='undefined'){
      // Recovery links accidentally landing on the root must reach the account page
      // with their original fragment, before Supabase consumes the one-time token.
      const recoveryHash=getInitialRecoveryHash();
      if(recoveryHash){
        window.location.replace('/konto'+window.location.search+recoveryHash);
        return;
      }
      const target=LEGACY_SITE+window.location.search+window.location.hash;
      window.location.replace(target);
    }
  },[]);
  return <View style={{flex:1,backgroundColor:'#F7F9FC',alignItems:'center',justifyContent:'center',padding:24}}>
    <Text style={{fontSize:28,fontWeight:'900',color:'#14263B',marginBottom:18}}>TRENERKI Academy</Text>
    <Text style={{color:'#5F7185',fontSize:16,marginBottom:14,textAlign:'center'}}>Otwieramy katalog kursów TRENERKI Academy.</Text>
    <Pressable onPress={()=>Linking.openURL('https://trenerki.com'+LEGACY_SITE)}
      style={{backgroundColor:'#14263B',borderRadius:12,paddingHorizontal:22,paddingVertical:15}}>
      <Text style={{color:'white',fontWeight:'800'}}>Otwórz akademię →</Text>
    </Pressable>
  </View>;
}
