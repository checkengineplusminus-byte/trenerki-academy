import React from 'react';
import {Linking,Platform,Pressable,Text,View} from 'react-native';

export const helpTitle='Potrzebujesz pomocy? Nie jesteś sam';
export const helpDescription='Bezpłatne telefony zaufania i profesjonalne wsparcie';
const ink='#17392a';

export function HelpLink({children,href='/pomoc'}:{children:React.ReactNode;href?:string}){
 return Platform.OS==='web'
  ? <a href={href} style={{color:ink,fontWeight:700,textDecoration:'underline',textUnderlineOffset:3}}>{children}</a>
  : <Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(href.startsWith('/')?'https://trenerki.com'+href:href)}>
     <Text style={{color:ink,fontWeight:'800',textDecorationLine:'underline'}}>{children}</Text>
    </Pressable>;
}
export function HelpFooter(){
 return <View role="contentinfo" style={{backgroundColor:'#edf5e9',borderTopWidth:1,borderColor:'#d3e4d0',paddingHorizontal:16,paddingVertical:9}}>
  <View style={{width:'100%',maxWidth:1000,alignSelf:'center',flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',columnGap:20,rowGap:5}}>
   <View><HelpLink>❤️ {helpTitle}</HelpLink><Text style={{color:'#385743',fontSize:12}}>{helpDescription}</Text></View>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>
    <HelpLink href="/academy/kontakt.html">Kontakt</HelpLink>
    <HelpLink href="/academy/regulamin.html">Regulamin</HelpLink>
    <HelpLink href="/academy/prywatnosc.html">Prywatność</HelpLink>
   </View>
  </View>
 </View>;
}

const courses:Record<string,string>={
 'partner-z-uzaleznieniem':'uzaleznienia','wyjdz-z-toksycznego-zwiazku':'przemoc',
 'rodzice-50-50':'rodzina','lepsza-mama':'rodzina','lepszy-tata':'rodzina',
 'blizej-dziecka':'rodzina','pomagaj-dziecku-w-lekcjach':'rodzina','wsparcie-adhd':'rodzina',
 'zwiazek-rozmowa':'przemoc','ekonomia-domowa-bez-dlugow':'finanse','kryzys-po-40-bez-dlugow':'finanse',
 'zaczynam-od-zera':'kryzys','nie-lubie-ludzi':'kryzys','poznaj-siebie':'kryzys'
};
export function LessonHelp({slug,title}:{slug:string;title:string}){
 const category=courses[slug];
 const relevant=/kryzys|przemoc|uzależnie|nałóg|pomoc|wsparci|dług|zadłuż|rozsta|konflikt|granice|emocj|samotn|bezpieczeńst|mediac|finans|budżet|alarm/i.test(title);
 if(!category||!relevant)return null;
 return <View style={{borderLeftWidth:3,borderColor:'#6d9872',backgroundColor:'#eef5eb',marginTop:13,padding:14,gap:8}}>
  <Text style={{color:ink,lineHeight:22}}>Jeśli ten temat dotyczy Twojej osobistej sytuacji i potrzebujesz dodatkowego wsparcia, możesz bezpłatnie skontaktować się ze specjalistą.</Text>
  <HelpLink href={'/pomoc#'+category}>Znajdź pomoc</HelpLink>
 </View>;
}
