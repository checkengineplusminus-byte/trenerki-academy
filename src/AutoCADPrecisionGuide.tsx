import React from 'react';
import {Text,View} from 'react-native';

const bg='#eef7ef',dark='#244c35',body='#3d6048';
const Info=({title,children}:{title:string;children:React.ReactNode})=><View style={{padding:12,borderRadius:9,backgroundColor:'white',gap:5,borderWidth:1,borderColor:'#d2e7d7'}}>
 <Text style={{fontWeight:'900',fontSize:15,color:dark}}>{title}</Text>
 <Text style={{fontSize:14,lineHeight:24,color:body}}>{children}</Text>
</View>;

export default function AutoCADPrecisionGuide({lessonNo}:{lessonNo:number}){
 const line=[0,3,4,5,6,9,12,16,29].includes(lessonNo);
 const dim=[9,16,19,20,24,25,29].includes(lessonNo);
 if(!line&&!dim)return null;
 return <View testID="autocad-precision-guide" style={{marginBottom:17,backgroundColor:bg,borderRadius:13,padding:16,gap:13}}>
  <Text style={{color:dark,fontWeight:'900',fontSize:19}}>Instrukcja bez zgadywania: liczby, punkty i wymiary</Text>
  {line&&<>
   <Info title="Dlaczego sama liczba 1000 może wystarczyć?">
    Po LINE program oczekuje najpierw punktu początkowego. Dopiero po nim możesz podać długość. W prawdziwym AutoCAD skieruj kursor w żądanym kierunku, ale nie klikaj ponownie, i wpisz 1000 → Enter. Jest to „wprowadzanie odległości bezpośredniej”. W naszym warsztacie działa tak samo; bez wybranego kierunku rysujemy w prawo (+X). Na ekranie dotykowym wybierz kierunek przy przyciskach.
   </Info>
   <Info title="Przykład do samodzielnego przejścia — pozioma linia 1000">
    1. Wpisz LINE i naciśnij Enter. 2. Wpisz 0,0 i naciśnij Enter — to punkt początkowy X=0, Y=0. 3. Skieruj kursor w prawo albo włącz ORTHO (F8). 4. Wpisz 1000 i naciśnij Enter. 5. Zakończ polecenie pustym Enterem. 6. Wpisz DIST → 0,0 → 1000,0 i sprawdź wynik 1000. Jeśli wpiszesz samo 1000 PRZED wyborem punktu początkowego, rysunek nie ma jeszcze odniesienia.
   </Info>
   <Info title="Trzy sposoby zapisu, których nie wolno mieszać">
    1000,0 oznacza punkt absolutny o współrzędnych X=1000, Y=0. @1000,0 oznacza przesunięcie od poprzedniego punktu o ΔX=1000, ΔY=0. @1000&lt;90 oznacza przesunięcie o długości 1000 pod kątem 90° (do góry w standardowym układzie X/Y). Samo 1000 podane po punkcie początkowym oznacza odległość w kierunku wskazanym przez kursor. W AutoCAD z aktywnym Dynamic Input część sposobów wpisywania ma inne domyślne zachowanie, dlatego w razie wątpliwości używaj jawnych form @ i odczytuj komunikat programu.
   </Info>
  </>}
  {dim&&<>
   <Info title="DIM, DIMLINEAR, DIMALIGNED i DIST — co robi każde polecenie?">
    DIM (Wymiar) dodaje do rysunku widoczne oznaczenie z wartością. DIMLINEAR (DLI) tworzy wymiar poziomy albo pionowy — np. rzut poziomy ukośnej linii. DIMALIGNED (DAL) tworzy wymiar wzdłuż odcinka, pokazując jego rzeczywistą długość. DIST (DI) jedynie mierzy odległość między dwoma punktami; samo polecenie nie zostawia wymiaru na rysunku. W warsztacie TRENERKI polecenie DIM dla odcinka uruchamia uproszczony tryb zgodny z DAL.
   </Info>
   <Info title="Jak dodać wymiar 1000 — krok po kroku">
    1. Narysuj linię od 0,0 do 1000,0. 2. Zaznacz jej krawędź pojedynczym kliknięciem lub dotknięciem. 3. Wpisz DIM i naciśnij Enter, albo naciśnij przycisk „DIM · Wymiar”. 4. Wskaż miejsce ponad odcinkiem (np. 500,200) i zatwierdź. 5. Na rysunku pojawi się liczba 1000. Alternatywnie: bez zaznaczania linii uruchom DLI → wybierz 0,0 → 1000,0 → 500,200. 6. Sprawdź osobno DIST → 0,0 → 1000,0; wynik musi zgadzać się z wymiarem.
   </Info>
   <Info title="Dlaczego linia ukośna ma różne wymiary?">
    Dla odcinka od (0,0) do (1000,600) rzut poziomy to 1000, rzut pionowy to 600, ale długość ukośna wynosi pierwiastek z (1000² + 600²), czyli około 1166,19 jednostek. DLI (rzut poziomy) może pokazać 1000, a DAL pokaże około 1166,19. To nie jest błąd: polecenia mierzą różne wielkości. W rozwiązaniach i na rysunkach zawsze podaj rodzaj wymiaru.
   </Info>
   <Info title="Gdy wymiar się nie pojawia — pięć sprawdzeń">
    Upewnij się, że jesteś w Model, nie Layout. Sprawdź, czy nie włączono niewidocznej warstwy. Wybierz dwa różne punkty (0,0 i 1000,0), a następnie jeszcze trzeci punkt położenia opisu; DIM nie kończy się po drugim punkcie. W razie trudności z klikaniem włącz OSNAP Endpoint. Jeśli wynik jest zły, zmierz odcinek niezależnie DIST i sprawdź jednostki — wymiar opisuje geometrię, nie zastępuje jej kontroli.
   </Info>
  </>}
  <Text style={{fontSize:12,color:'#5a745c',lineHeight:19}}>Wskazówki odnoszą się do ćwiczeń 2D i nie oznaczają, że symulator TRENERKI zastępuje pełną licencję Autodesk AutoCAD.</Text>
 </View>;
}
