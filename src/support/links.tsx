import React from 'react';
import {Linking,Platform,Pressable,StyleSheet,Text,View} from 'react-native';

export const helpTitle='Potrzebujesz pomocy? Nie jesteś sam';
export const helpDescription='Bezpłatne telefony zaufania i profesjonalne wsparcie';
const ink='#17392a';
const footerLinks=[
 {label:'Kontakt',href:'/academy/kontakt.html'},
 {label:'Regulamin',href:'/academy/regulamin.html'},
 {label:'Prywatność',href:'/academy/prywatnosc.html'},
];

function openSupportLink(href:string){
 void Linking.openURL(href.startsWith('/')?'https://trenerki.com'+href:href);
}

export function HelpLink({children,href='/pomoc'}:{children:React.ReactNode;href?:string}){
 return Platform.OS==='web'
  ? <a href={href} style={{color:ink,fontWeight:700,textDecoration:'underline',textUnderlineOffset:3}}>{children}</a>
  : <Pressable accessibilityRole="link" onPress={()=>openSupportLink(href)}>
     <Text style={{color:ink,fontWeight:'800',textDecorationLine:'underline'}}>{children}</Text>
    </Pressable>;
}
export function HelpFooter(){
 if(Platform.OS==='web')return <footer className="ta-app-footer">
  <link rel="stylesheet" href="/academy/app-footer.css" precedence="default"/>
  <div className="ta-app-footer-inner">
   <a className="ta-app-footer-help" href="/pomoc" aria-label={helpTitle} aria-describedby="ta-app-footer-help-description">
    <span className="ta-app-footer-heart" aria-hidden="true">
     <span className="ta-app-footer-heart-outline">♡</span>
     <span className="ta-app-footer-heart-fill">♥</span>
    </span>
    <span className="ta-app-footer-help-copy">
     <strong>Nie jesteś sam</strong>
     <span id="ta-app-footer-help-description">{helpDescription}</span>
    </span>
   </a>
   <nav className="ta-app-footer-links" aria-label="Informacje i kontakt">
    {footerLinks.map(({href,label})=><a href={href} key={href}>{label}</a>)}
   </nav>
  </div>
 </footer>;
 return <View role="contentinfo" style={footerStyles.root}>
  <View style={footerStyles.inner}>
   <Pressable accessibilityRole="link" accessibilityLabel={helpTitle} accessibilityHint={helpDescription}
    onPress={()=>openSupportLink('/pomoc')} style={({pressed})=>[footerStyles.help,pressed&&footerStyles.pressed]}>
    <View accessible={false} style={footerStyles.heart}><Text style={footerStyles.heartText}>♡</Text></View>
    <View style={footerStyles.copy}>
     <Text style={footerStyles.title}>Nie jesteś sam</Text>
     <Text style={footerStyles.description}>{helpDescription}</Text>
    </View>
   </Pressable>
   <View style={footerStyles.links}>
    {footerLinks.map(({href,label})=><Pressable key={href} accessibilityRole="link" onPress={()=>openSupportLink(href)}
     style={({pressed})=>[footerStyles.link,pressed&&footerStyles.pressed]}><Text style={footerStyles.linkText}>{label}</Text></Pressable>)}
   </View>
  </View>
 </View>;
}

const footerStyles=StyleSheet.create({
 root:{backgroundColor:'#102820',borderTopWidth:1,borderColor:'#2c463b',paddingHorizontal:16,paddingVertical:10},
 inner:{width:'100%',maxWidth:1100,alignSelf:'center',flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',columnGap:20,rowGap:4},
 help:{maxWidth:'100%',minHeight:48,flexDirection:'row',alignItems:'center',gap:10,padding:8,paddingRight:13,borderRadius:14,borderWidth:1,borderColor:'#355448',backgroundColor:'#18372d'},
 heart:{width:34,height:34,borderRadius:17,justifyContent:'center',alignItems:'center',backgroundColor:'#2d4237'},
 heartText:{fontSize:23,color:'#e9a6b0',lineHeight:27},
 copy:{flexShrink:1},
 title:{color:'#f1ede0',fontSize:14,fontWeight:'700'},
 description:{color:'#b7c8bd',fontSize:12,marginTop:2},
 links:{flexDirection:'row',flexWrap:'wrap',gap:6},
 link:{minHeight:44,justifyContent:'center',paddingHorizontal:8},
 linkText:{color:'#f1ede0',fontSize:13,fontWeight:'700'},
 pressed:{opacity:.76},
});

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
