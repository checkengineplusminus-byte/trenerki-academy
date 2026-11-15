import React from 'react';
import {Image,Text,View} from 'react-native';

type Focus='overview'|'ribbon'|'tabs'|'command';
const screens=[
 {file:'autocad-original-ribbon.png',width:472,height:289,alt:'Oryginalny AutoCAD: okno rysunku oraz powiększony pasek szybkiego dostępu',caption:'Okno programu i pasek szybkiego dostępu. Znajdziesz tu m.in. zapis i cofanie zmian.'},
 {file:'autocad-original-tabs.png',width:283,height:61,alt:'Oryginalny AutoCAD: karty Start i Drawing1 z gwiazdką przy nazwie rysunku',caption:'Karta rysunku. Gwiazdka przy nazwie informuje o niezapisanych zmianach.'},
 {file:'autocad-original-command.png',width:425,height:45,alt:'Oryginalny AutoCAD: wiersz poleceń',caption:'Wiersz poleceń. Tu wpisujesz polecenia i czytasz pytania programu o kolejne kroki.'},
];
export default function AutoCADOriginalScreen({focus='overview'}:{focus?:Focus}){
 const selected=focus==='overview'?screens:focus==='command'?[screens[2]]:focus==='tabs'?[screens[1]]:[screens[0]];
 return <View testID="autocad-original-screens" style={{gap:13,backgroundColor:'white',padding:12,borderRadius:12}}>
  <Text style={{fontWeight:'900',fontSize:17,color:'#183c2b'}}>{focus==='overview'?'Tak wygląda oryginalny AutoCAD':'Oryginalny ekran AutoCAD — zobacz fragment'}</Text>
  {selected.map(s=><View key={s.file} style={{gap:6}}>
   <Image source={{uri:'/academy/assets/'+s.file}} accessibilityLabel={s.alt} resizeMode="contain" style={{width:'100%',maxWidth:s.width,aspectRatio:s.width/s.height,alignSelf:'center'}}/>
   <Text style={{fontSize:14,lineHeight:22,color:'#3e5c48'}}>{s.caption}</Text>
  </View>)}
  <Text style={{fontSize:12,lineHeight:19,color:'#5a705e'}}>Oryginalne fragmenty ekranu z instrukcji Autodesk AutoCAD 2026. Widać angielską wersję interfejsu. Układ i nazwy mogą się różnić w zależności od wersji, języka i ustawień programu.</Text>
 </View>;
}
