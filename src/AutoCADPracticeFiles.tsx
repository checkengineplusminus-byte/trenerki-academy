import React from 'react';
import {Linking,Platform,Pressable,Text,View} from 'react-native';

// Genuine 2D DXF geometry, with millimetre units. Open in AutoCAD/AutoCAD LT.
const files:Record<number,{name:string;filename:string;task:string}>={
 5:{name:'Trójkąt z trzech oddzielnych linii',filename:'autocad-triangle-lines.dxf',
    task:'Wybierz jeden bok i sprawdź, że to LINE. Połącz trzy boki poleceniem JOIN lub PEDIT → Join. Sprawdź typ obiektu we Właściwościach, a potem przesuń cały obrys poleceniem MOVE.'},
 9:{name:'Pokój 4 000 × 3 000 mm',filename:'autocad-room-4000x3000.dxf',
    task:'Zmierz boki poleceniem DIST, sprawdź jednostkę i połącz obrys. Dodaj warstwę dla otworów i narysuj drzwi według ćwiczenia.'},
 11:{name:'Trójkąt do ćwiczenia MOVE i COPY',filename:'autocad-triangle-lines.dxf',
    task:'Najpierw połącz trzy linie w jeden obiekt. Następnie przesuń go o @2000,0, skopiuj o @0,1500 i porównaj wymiary przed i po.'},
 29:{name:'Panel A — baza do zadania końcowego',filename:'autocad-panel-A.dxf',
    task:'Sprawdź obrys 600 × 350 mm i dwa otwory R10. Zapisz wersję A jako DWG, wykonaj osobną kopię B i zmień jej geometrię zgodnie z poleceniem lekcji 30.'}
};
export default function AutoCADPracticeFiles({lessonNo}:{lessonNo:number}){
 const file=files[lessonNo];
 if(!file)return null;
 const path='/academy/assets/'+file.filename;
 const download=()=>{
  if(Platform.OS==='web'&&typeof document!=='undefined'){
   const link=document.createElement('a');
   link.href=path;link.download=file.filename;
   document.body.appendChild(link);
   link.click();
   link.remove();
  }else void Linking.openURL('https://trenerki.com'+path);
 };
 return <View testID="autocad-real-dxf" style={{backgroundColor:'#f1f7ed',borderRadius:14,borderWidth:1,borderColor:'#c9ddc1',padding:16,gap:9,marginBottom:16}}>
  <Text style={{fontSize:17,fontWeight:'900',color:'#173e2d'}}>Ćwicz w prawdziwym AutoCAD-zie</Text>
  <Text style={{fontSize:14,lineHeight:22,color:'#355544'}}>Gotowy plik DXF zawiera rzeczywistą geometrię 2D w milimetrach, nie symulację. Otwórz go w AutoCAD lub AutoCAD LT na komputerze.</Text>
  <Text style={{fontWeight:'800',fontSize:15,color:'#173e2d'}}>{file.name}</Text>
  <Text style={{fontSize:14,lineHeight:22,color:'#355544'}}>{file.task}</Text>
  <Pressable accessibilityRole="button" accessibilityLabel={'Pobierz plik DXF: '+file.filename} onPress={download} style={{backgroundColor:'#173e2d',padding:15,borderRadius:10,minHeight:48}}>
   <Text style={{fontWeight:'900',fontSize:15,color:'white',textAlign:'center'}}>Pobierz plik DXF do AutoCAD ↓</Text>
  </Pressable>
  <Text style={{fontSize:12,lineHeight:19,color:'#526b57'}}>Po otwarciu sprawdź jednostki poleceniem UNITS i zapisz własny plik DWG. Pliki służą wyłącznie do ćwiczeń, nie do produkcji.</Text>
 </View>;
}
