import React from 'react';
import {Linking,Platform,Pressable,StyleSheet,Text,View,useWindowDimensions,ScrollView} from 'react-native';

export const helpTitle='Potrzebujesz pomocy? Nie jesteś sam';
export const helpDescription='Bezpłatne telefony zaufania i profesjonalne wsparcie';
const ink='#1A324B';
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
export function HelpFooter({compact=false}:{compact?:boolean}={}){
 const {width}=useWindowDimensions();
 // Mobile layout must not rely on a separately deployed/cached stylesheet.
 // One unobtrusive row, always horizontally scrollable, never a multi-line card.
 if(Platform.OS==='web'&&width<640){
  const linkStyle:React.CSSProperties={display:'inline-flex',alignItems:'center',justifyContent:'center',flex:'0 0 auto',height:44,padding:'0 7px',fontSize:12,fontWeight:650,whiteSpace:'nowrap',color:'#C8D8E8',textDecoration:'none'};
  return <footer aria-label="Pomoc i informacje" style={{flex:'0 0 auto',boxSizing:'border-box',width:'100%',backgroundColor:'#0B2238',borderTop:'1px solid #314962',padding:'2px 9px',fontFamily:'system-ui, -apple-system, BlinkMacSystemFont, sans-serif'}}>
   <div style={{display:'flex',alignItems:'center',gap:5,minWidth:0,maxWidth:1100,margin:'0 auto'}}>
    <a href="/pomoc" aria-label={helpTitle} style={{...linkStyle,padding:'0 4px',color:'#F3F7FC',fontWeight:750}}>♡ Pomoc</a>
    <nav aria-label="Informacje i kontakt" className="ta-app-footer-links" style={{display:'flex',alignItems:'center',flex:'1 1 auto',minWidth:0,width:'auto',flexWrap:'nowrap',gap:2,margin:0,overflowX:'auto',whiteSpace:'nowrap',WebkitOverflowScrolling:'touch'}}>
     <a style={linkStyle} href="/academy/program-afiliacyjny.html">Partnerzy</a>
     {footerLinks.map(({href,label})=><a style={linkStyle} href={href} key={href}>{label}</a>)}
    </nav>
   </div>
  </footer>;
 }
 if(Platform.OS!=='web'&&width<640)return <View role="contentinfo" style={{backgroundColor:'#0B2238',borderTopWidth:1,borderTopColor:'#314962'}}>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{alignItems:'center',paddingHorizontal:10,gap:4}}>
   <Pressable accessibilityRole="link" accessibilityLabel={helpTitle} onPress={()=>openSupportLink('/pomoc')} style={{minHeight:44,justifyContent:'center',paddingHorizontal:8}}>
    <Text style={{fontSize:12,fontWeight:'800',color:'#F3F7FC'}}>♡ Pomoc</Text>
   </Pressable>
   <Pressable accessibilityRole="link" onPress={()=>openSupportLink('/academy/program-afiliacyjny.html')} style={{minHeight:44,justifyContent:'center',paddingHorizontal:8}}><Text style={{fontSize:12,color:'#C8D8E8'}}>Partnerzy</Text></Pressable>
   {footerLinks.map(({href,label})=><Pressable key={href} accessibilityRole="link" onPress={()=>openSupportLink(href)} style={{minHeight:44,justifyContent:'center',paddingHorizontal:8}}><Text style={{fontSize:12,color:'#C8D8E8'}}>{label}</Text></Pressable>)}
  </ScrollView>
 </View>;
 if(Platform.OS==='web')return <footer className={compact?'ta-app-footer ta-app-footer--compact':'ta-app-footer'}>
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
    <a href="/academy/program-afiliacyjny.html">Program partnerski</a>
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
    <Pressable accessibilityRole="link" onPress={()=>openSupportLink('/academy/program-afiliacyjny.html')} style={footerStyles.link}>
      <Text style={footerStyles.linkText}>Program partnerski</Text>
    </Pressable>
    {footerLinks.map(({href,label})=><Pressable key={href} accessibilityRole="link" onPress={()=>openSupportLink(href)}
     style={({pressed})=>[footerStyles.link,pressed&&footerStyles.pressed]}><Text style={footerStyles.linkText}>{label}</Text></Pressable>)}
   </View>
  </View>
 </View>;
}

const footerStyles=StyleSheet.create({
 root:{backgroundColor:'#0B2238',borderTopWidth:1,borderColor:'#314962',paddingHorizontal:16,paddingVertical:10},
 inner:{width:'100%',maxWidth:1100,alignSelf:'center',flexDirection:'row',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',columnGap:20,rowGap:4},
 help:{maxWidth:'100%',minHeight:48,flexDirection:'row',alignItems:'center',gap:10,padding:8,paddingRight:13,borderRadius:14,borderWidth:1,borderColor:'#48627A',backgroundColor:'#17354D'},
 heart:{width:34,height:34,borderRadius:17,justifyContent:'center',alignItems:'center',backgroundColor:'#263E56'},
 heartText:{fontSize:23,color:'#e9a6b0',lineHeight:27},
 copy:{flexShrink:1},
 title:{color:'#F3F7FC',fontSize:14,fontWeight:'700'},
 description:{color:'#BDD0E2',fontSize:12,marginTop:2},
 links:{flexDirection:'row',flexWrap:'wrap',gap:6},
 link:{minHeight:44,justifyContent:'center',paddingHorizontal:8},
 linkText:{color:'#F3F7FC',fontSize:13,fontWeight:'700'},
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
 return <View style={{borderLeftWidth:3,borderColor:'#CDA14C',backgroundColor:'#F8F3E8',marginTop:13,padding:14,gap:8}}>
  <Text style={{color:ink,lineHeight:22}}>Jeśli ten temat dotyczy Twojej osobistej sytuacji i potrzebujesz dodatkowego wsparcia, możesz bezpłatnie skontaktować się ze specjalistą.</Text>
  <HelpLink href={'/pomoc#'+category}>Znajdź pomoc</HelpLink>
 </View>;
}
