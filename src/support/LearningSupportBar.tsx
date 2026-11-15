import React from 'react';
import {Linking,Platform,Pressable,Text,View} from 'react-native';

// Keep professional support visible while protecting the limited vertical
// space of the full-screen learning route on phones and tablets.
export default function LearningSupportBar(){
 if(Platform.OS==='web')return <footer className="ta-app-footer" aria-label="Pomoc podczas kursu" data-testid="learning-support-bar"
  style={{boxSizing:'border-box',width:'100%',height:50,minHeight:50,maxHeight:50,background:'#102820',color:'#f1ede0',display:'flex',
   alignItems:'center',justifyContent:'center',flexWrap:'nowrap',overflow:'hidden',gap:'0 20px',padding:'0 12px',
   borderTop:'1px solid #2c463b',fontFamily:'system-ui, sans-serif'}}>
  <link rel="stylesheet" href="/academy/app-footer.css" precedence="default"/>
  <a href="/pomoc" aria-label="Potrzebujesz pomocy? Nie jesteś sam"
   style={{color:'#f1ede0',textDecoration:'none',fontWeight:750,fontSize:13,
    display:'inline-flex',alignItems:'center',minHeight:40,gap:8}}>
   <span aria-hidden="true" style={{color:'#e9a6b0',fontSize:19}}>♡</span>
   Pomoc i wsparcie
  </a>
  <a href="/academy/kontakt.html" style={{color:'#b7c8bd',fontSize:12,minHeight:40,display:'inline-flex',alignItems:'center'}}>
   Kontakt
  </a>
  <nav className="ta-app-footer-links" aria-label="Ustawienia prywatności" style={{display:'inline-flex',alignItems:'center',flex:'0 0 auto',minHeight:44}}/>
 </footer>;
 return <View role="contentinfo" style={{backgroundColor:'#102820',borderTopWidth:1,borderColor:'#2c463b',
  minHeight:48,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:22,paddingHorizontal:12}}>
  <Pressable accessibilityRole="link" accessibilityLabel="Potrzebujesz pomocy? Nie jesteś sam"
   onPress={()=>void Linking.openURL('https://trenerki.com/pomoc')} style={{minHeight:44,justifyContent:'center'}}>
   <Text style={{color:'#f1ede0',fontSize:13,fontWeight:'800'}}>♡  Pomoc i wsparcie</Text>
  </Pressable>
  <Pressable accessibilityRole="link" accessibilityLabel="Kontakt"
   onPress={()=>void Linking.openURL('https://trenerki.com/academy/kontakt.html')} style={{minHeight:44,justifyContent:'center'}}>
   <Text style={{color:'#b7c8bd',fontSize:12,fontWeight:'700'}}>Kontakt</Text>
  </Pressable>
 </View>;
}
