import React,{useState} from 'react';
import {Linking,Pressable,Text,View} from 'react-native';
import {labStyles} from './LabControls';

export const AUTOCAD_HELP='https://help.autodesk.com/cloudhelp/2026/ENU/AutoCAD-DidYouKnow/files/GUID-29D46150-7550-420A-B151-73BE44146665.htm';

export default function AutoCADRealPractice({shortcut}:{shortcut?:string;runId:number}){
 const [triangleOpen,setTriangleOpen]=useState(false);
 return <View testID="autocad-real-practice" style={labStyles.panel}>
  <Text style={labStyles.heading}>Ćwiczenie w Twoim AutoCAD-zie</Text>
  <Text style={labStyles.body}>Rysunek wykonujesz w programie Autodesk AutoCAD lub AutoCAD LT na komputerze. Otwórz nowy plik ćwiczeniowy i ustaw go obok tej lekcji. Kurs nie zawiera licencji programu. Wersja przeglądarkowa i aplikacja na telefon mogą mieć inny zakres funkcji; poniższe instrukcje dotyczą wersji komputerowej.</Text>
  <Text style={labStyles.body}>Najpierw przeczytaj wyjaśnienia. Gdy lekcja prosi o narysowanie lub zmianę obiektu, wykonaj te kroki we własnym programie i zapisz plik DWG. Pytania w Trenerki sprawdzają rozumienie materiału; poprawna odpowiedź nie oznacza automatycznej kontroli Twojego rysunku.</Text>
  {!!shortcut&&<Text testID="autocad-selected-command" style={labStyles.body}>Wybrane polecenie lub skrót: {shortcut}. Użyj go w AutoCAD-zie, zgodnie z opisem „Przed użyciem” i „Co się zmieni”. Aliasy można zmieniać w ustawieniach programu — gdy alias nie działa, wpisz pełną nazwę polecenia.</Text>}
  <Pressable accessibilityRole="button" accessibilityState={{expanded:triangleOpen}} onPress={()=>setTriangleOpen(v=>!v)} style={labStyles.ribbon}>
   <Text style={labStyles.heading}>Trójkąt z trzech linii: jak przesunąć go w całości? {triangleOpen?'↑':'↓'}</Text>
  </Pressable>
  {triangleOpen&&<View style={labStyles.ribbon}>
   <Text style={labStyles.body}>Trzy odcinki narysowane poleceniem LINE pozostają trzema obiektami, nawet gdy ich końce się stykają. Połączenie w jeden obrys trzeba wykonać osobno. Jeżeli dopiero zaczynasz kurs, wróć do tej instrukcji po lekcji „Linia, polilinia i okrąg”.</Text>
   <Text style={labStyles.body}>1. W nowym rysunku narysuj trzy odcinki o wspólnych końcach. Włącz przyciąganie do końca obiektu (OSNAP), aby nie zostawić szczelin. Wszystkie odcinki powinny leżeć w jednej płaszczyźnie.</Text>
   <Text style={labStyles.body}>2. Zaznacz wszystkie trzy odcinki, wpisz _JOIN i potwierdź Enterem. Sprawdź we Właściwościach, że zaznaczenie jest teraz jednym obiektem typu Polilinia. Jeśli program pozostawił osobne linie, sprawdź ich końce i wysokość Z. Alternatywą jest _PEDIT: zamiana linii na polilinię i opcja Dołącz (Join).</Text>
   <Text style={labStyles.body}>3. Wskaż krawędź powstałej polilinii. Wpisz _MOVE, potwierdź wybór, wskaż punkt bazowy i punkt docelowy. Cały trójkąt powinien przesunąć się o ten sam wektor. Kliknięcie uchwytu wierzchołka może zmieniać kształt, dlatego w tym ćwiczeniu użyj MOVE.</Text>
   <Text style={labStyles.body}>4. Sprawdź długości boków przed przesunięciem i po nim. Powinny zostać takie same. Gdy potrzebujesz przesunąć kilka osobnych linii bez ich łączenia, zaznacz wszystkie i użyj MOVE. Nowy trójkąt możesz też od początku narysować poleceniem _PLINE z opcją _Close.</Text>
  </View>}
  <Pressable accessibilityRole="link" accessibilityLabel="Otwórz instrukcję łączenia obiektów Autodesk" onPress={()=>void Linking.openURL(AUTOCAD_HELP)} style={[labStyles.ribbon,{minHeight:44}]}>
   <Text style={{fontWeight:'800',color:'#1d6546'}}>Zobacz łączenie obiektów w oryginalnym AutoCAD-zie ↗</Text>
  </Pressable>
 </View>;
}
