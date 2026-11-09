import React,{useEffect,useState} from 'react';
import {View,Text,Image,Platform,Pressable} from 'react-native';
export type LearningSection={heading:string;text:string};
const ink='#173e2d',body='#3e5c48';
type Props={courseSlug:string;lessonNo:number;title:string;sections?:LearningSection[];illustration?:string;
            situation?:string;example?:string;source?:{label:string;url:string}[]};
const imageNames=new Set(['eko-hierarchy','eko-sort','eko-cycle','eko-hazard','eko-textiles','eko-food','eko-home','eko-community','windows-history','windows-folders','windows-security','windows-desktop','windows-explorer','excel-interface','word-interface','autocad-interface','word-document','word-structure','word-review','excel-addresses','excel-formulas','excel-chart','autocad-coordinates','autocad-layers','autocad-filetypes','autocad-commands','craft-bednarz','bednarz-anatomia','bednarz-geometria','bednarz-wrega','bednarz-diagnoza','craft-garncarz-tradycja','garncarz-etapy','garncarz-skurcz','garncarz-szkliwo','garncarz-bezpieczenstwo','craft-gontarz','craft-introligator-tradycja','introligator-anatomia','introligator-wlokna','introligator-skladka','introligator-przegub','craft-kaletnik-tradycja','craft-kolodziej','craft-kowal-tradycja','kowal-stanowisko','kowal-narzedzia','kowal-rysunek','kowal-operacje','kowal-kopyto','ciesla-drewno','ciesla-wilgotnosc','ciesla-rysunek','ciesla-zlacze','ciesla-dach','ciesla-mur-pruski','ciesla-sztapel','ciesla-suszarnia','ciesla-pily-zeby','ciesla-klin-pilarki','ciesla-strugarki','ciesla-narzedzia','ciesla-pasowe','ciesla-plyty','ciesla-kleje','ciesla-rachunki','ciesla-rysunek-skala','ciesla-bhp','ciesla-szkic-przekroj','craft-ludwisarz','craft-mlynarz-tradycyjny','craft-plecionkarz','craft-powroznik','craft-rymarz','craft-sitarz','craft-snycerz','craft-szewc-tradycja','craft-tkacz-reczny','craft-woznica','craft-zdun-tradycja','craft-zecer','craft-zegarmistrz-tradycja']);
const masteryImages=new Set(['mastery-bednarz','mastery-garncarz-tradycja','mastery-gontarz','mastery-introligator-tradycja','mastery-kaletnik-tradycja','mastery-kolodziej','mastery-ludwisarz','mastery-mlynarz-tradycyjny','mastery-plecionkarz','mastery-powroznik','mastery-rymarz','mastery-sitarz','mastery-snycerz','mastery-szewc-tradycja','mastery-tkacz-reczny','mastery-woznica','mastery-zdun-tradycja','mastery-zecer','mastery-zegarmistrz-tradycja','mastery-brygadzista','mastery-kierownik-budowy','mastery-autocad-skroty','mastery-dostepne-pdf','mastery-excel-skroty','mastery-windows-skroty','mastery-word-skroty','mastery-nie-marnuj-jedzenia','mastery-obowiazki-domowe','mastery-jestem-eko','mastery-ekonomia-domowa-bez-dlugow','mastery-lepszy-cukiernik','mastery-lepszy-kucharz','mastery-pasieka','mastery-swiety-mikolaj','mastery-trawnik-jestem-ogrodnikiem','mastery-angielski-na-budowie','mastery-niemiecki-na-budowie','mastery-norweski-na-budowie','mastery-lepszy-szef','mastery-astro-consafe-wms','mastery-axapta-dynamics-magazyn','mastery-blue-yonder-wms','mastery-infor-wms','mastery-manhattan-active-wms','mastery-ongoing-wms','mastery-oracle-wms-cloud','mastery-sap-ewm-magazyn','mastery-sap-tm-transport','mastery-facebook-ads-promocja','mastery-google-ads-promocja','mastery-jak-kupic-samochod','mastery-apartamenty','mastery-odbiory','mastery-wspolnota','mastery-opieka-seniorzy','mastery-wsparcie-adhd','mastery-festyn','mastery-kgw','mastery-blizej-dziecka','mastery-lepsza-mama','mastery-lepszy-tata','mastery-nie-lubie-ludzi','mastery-partner-z-uzaleznieniem','mastery-pomagaj-dziecku-w-lekcjach','mastery-rodzice-50-50','mastery-wyjdz-z-toksycznego-zwiazku','mastery-zwiazek-rozmowa','mastery-mierz-ponad-sily','mastery-mocny-charakter','mastery-poznaj-siebie','mastery-bdo','mastery-gpsr','mastery-transport-logistyka-praktycznie','mastery-koordynator','mastery-dziennik-kota','mastery-petsitter','mastery-kryzys-po-40-bez-dlugow','mastery-zaczynam-od-zera','material-bednarz','material-garncarz-tradycja','material-gontarz','material-introligator-tradycja','material-kaletnik-tradycja','material-kolodziej','material-ludwisarz','material-mlynarz-tradycyjny','material-plecionkarz','material-powroznik','material-rymarz','material-sitarz','material-snycerz','material-szewc-tradycja','material-tkacz-reczny','material-woznica','material-zdun-tradycja','material-zecer','material-zegarmistrz-tradycja']);
const deeperCraftImages=new Set(['technique-bednarz','diagnosis-bednarz','technique-garncarz-tradycja','diagnosis-garncarz-tradycja','technique-gontarz','diagnosis-gontarz','technique-introligator-tradycja','diagnosis-introligator-tradycja','technique-kaletnik-tradycja','diagnosis-kaletnik-tradycja','technique-kolodziej','diagnosis-kolodziej','technique-ludwisarz','diagnosis-ludwisarz','technique-mlynarz-tradycyjny','diagnosis-mlynarz-tradycyjny','technique-plecionkarz','diagnosis-plecionkarz','technique-powroznik','diagnosis-powroznik','technique-rymarz','diagnosis-rymarz','technique-sitarz','diagnosis-sitarz','technique-snycerz','diagnosis-snycerz','technique-szewc-tradycja','diagnosis-szewc-tradycja','technique-tkacz-reczny','diagnosis-tkacz-reczny','technique-woznica','diagnosis-woznica','technique-zdun-tradycja','diagnosis-zdun-tradycja','technique-zecer','diagnosis-zecer','technique-zegarmistrz-tradycja','diagnosis-zegarmistrz-tradycja']);
const secondLessonImages=new Set(['second-brygadzista','second-kierownik-budowy','second-dostepne-pdf','second-nie-marnuj-jedzenia','second-obowiazki-domowe','second-ekonomia-domowa-bez-dlugow','second-lepszy-cukiernik','second-lepszy-kucharz','second-pasieka','second-swiety-mikolaj','second-trawnik-jestem-ogrodnikiem','second-angielski-na-budowie','second-niemiecki-na-budowie','second-norweski-na-budowie','second-lepszy-szef','second-astro-consafe-wms','second-axapta-dynamics-magazyn','second-blue-yonder-wms','second-infor-wms','second-manhattan-active-wms','second-ongoing-wms','second-oracle-wms-cloud','second-sap-ewm-magazyn','second-sap-tm-transport','second-facebook-ads-promocja','second-google-ads-promocja','second-apartamenty','second-odbiory','second-wspolnota','second-opieka-seniorzy','second-wsparcie-adhd','second-festyn','second-kgw','second-blizej-dziecka','second-bdo','second-gpsr','second-koordynator','second-dziennik-kota','second-petsitter','second-kryzys-po-40-bez-dlugow','second-lepsza-mama','second-lepszy-tata','second-mierz-ponad-sily','second-mocny-charakter','second-nie-lubie-ludzi','second-partner-z-uzaleznieniem','second-pomagaj-dziecku-w-lekcjach','second-poznaj-siebie','second-rodzice-50-50','second-transport-logistyka-praktycznie','second-wyjdz-z-toksycznego-zwiazku','second-zaczynam-od-zera','second-zwiazek-rozmowa']);
function FallbackDiagram({title,sections,example}:{title:string;sections:LearningSection[];example?:string}){
 const blocks=sections.length>=3?
  sections.slice(0,3).map(s=>({label:s.heading,info:s.text.slice(0,90)})):
  [{label:'Zrozum temat',info:title},{label:'Sytuacja',info:sections[0]?.text||''},{label:'Rozwiązanie',info:example||''}];
 return <View accessibilityLabel={'Schemat edukacyjny: '+title} style={{backgroundColor:'#eaf3e4',padding:14,borderRadius:13,gap:9}}>
  <Text style={{fontWeight:'900',color:ink,fontSize:12}}>SCHEMAT UCZENIA — OD PRZYCZYNY DO ROZWIĄZANIA</Text>
  <View style={{flexDirection:'row',gap:6,flexWrap:'wrap'}}>
   {blocks.map((b,i)=><View key={i} style={{flex:1,minWidth:125,backgroundColor:'white',padding:10,borderRadius:9,borderWidth:1,borderColor:'#cfdfc9',gap:7}}>
    <View style={{backgroundColor:i===0?'#d5e6d0':i===1?'#dceadc':'#e6edcb',alignSelf:'flex-start',width:28,height:28,borderRadius:10,alignItems:'center',justifyContent:'center'}}>
     <Text style={{color:ink,fontWeight:'900'}}>{i+1}</Text></View>
    <Text style={{fontWeight:'900',color:ink,fontSize:12}}>{b.label}</Text>
    <Text style={{color:body,fontSize:11,lineHeight:16}}>{b.info}</Text>
   </View>)}
  </View>}
 </View>;
}
export default function LessonIllustratedSections({courseSlug,lessonNo,title,sections,illustration,situation,example}:Props){
 const [failed,setFailed]=useState(false);
 useEffect(()=>{setFailed(false)},[courseSlug,lessonNo]);
 const named=Array.isArray(sections)&&sections.length>0?sections.filter(x=>x?.heading&&x?.text):[];
 const validIllustration=typeof illustration==='string'&&(imageNames.has(illustration)||masteryImages.has(illustration)||deeperCraftImages.has(illustration)||secondLessonImages.has(illustration)),showImage=validIllustration&&Platform.OS==='web'&&!failed;
 if(!named.length&&!validIllustration)return <FallbackDiagram title={title} sections={situation?[{heading:'Zadanie z lekcji',text:situation}]:[]} example={example}/>;
 return <View style={{marginBottom:18,gap:14}}>
  {validIllustration&&<View style={{backgroundColor:'#f1f8ed',padding:9,borderWidth:1,borderColor:'#d9e7d5',borderRadius:16,gap:7}}>
   {showImage?<Image
    accessibilityLabel={'Ilustracja objaśniająca temat: '+title}
    source={{uri:'https://trenerki-academy.expo.app/academy/assets/'+illustration+'.svg'}}
    onError={()=>setFailed(true)}
    resizeMode="contain"
    style={{width:'100%',height:Math.max(210,Math.min(395,typeof window==='undefined'?280:window.innerWidth*.45)),borderRadius:10}}
   />:<FallbackDiagram title={title} sections={named} example={example}/>}
  </View>}
  {!validIllustration&&named.length>0&&<FallbackDiagram title={title} sections={named} example={example}/>}
  {!!named.length&&<View style={{backgroundColor:'#fff',borderWidth:1,borderColor:'#dce9d8',borderRadius:16,overflow:'hidden'}}>
   <View style={{backgroundColor:'#e8f3e3',padding:15}}>
    <Text style={{color:ink,fontWeight:'900',fontSize:18}}>Wyjaśnienie krok po kroku</Text>
   </View>
   <View style={{padding:15,gap:18}}>
    {named.map((section,i)=><View key={i} style={{gap:9}}>
     <View style={{flexDirection:'row',alignItems:'center',gap:10}}>
      <Text style={{width:29,height:29,lineHeight:29,textAlign:'center',backgroundColor:'#dfedd9',color:ink,borderRadius:9,overflow:'hidden',fontWeight:'900'}}>{i+1}</Text>
      <Text style={{color:ink,fontWeight:'900',fontSize:16,flex:1}}>{section.heading}</Text>
     </View>
     <Text style={{color:body,fontSize:15.5,lineHeight:27}}>{section.text}</Text>
    </View>)}
   </View>}
  </View>}
 </View>;
}
