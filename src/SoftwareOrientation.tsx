import React,{useState} from 'react';
import {Image,Platform,Pressable,Text,View,Linking} from 'react-native';
import HandsOnLab from './HandsOnLab';
import SoftwarePlayground from './SoftwarePlayground';
import type {KeyboardShortcut} from './KeyboardLesson';

type Term={name:string;description:string};
type Action={name:string;combo:string;desc:string};
type Program={
 name:string;image:string;history:string[];why:string;today:string;
 zones:{name:string;meaning:string}[];terms:Term[];actions:Action[];
 mode:'excel'|'cad'|'word'|'windows';
};
const ink='#183c2b';
const programs:Record<string,Program>={
 'word-skroty':{
  name:'Microsoft Word',image:'word-interface',mode:'word',
  history:[
   'Word jest edytorem tekstu — programem, w którym piszesz i poprawiasz dokumenty. To nie jest program do obliczeń, a dokument Worda nie jest automatycznie plikiem PDF.',
   'Program powstał w firmie Microsoft. Nad wczesną wersją pracowali m.in. Charles Simonyi i Richard Brodie. W 1983 roku ukazał się pod nazwą Multi-Tool Word; Microsoft podaje 25 października 1983 r. jako premierę Worda. Wersję Word dla Windows udostępniono w 1989 roku.',
   'Pierwsze edytory tekstu zastępowały maszynę do pisania. Ich przewaga polegała na tym, że literówki i akapity można było poprawiać bez przepisywania całej kartki. W kolejnych latach doszły obrazy, tabele, style, współpraca, spisy treści i eksport PDF.'
  ],
  why:'Dzisiaj Word służy do pism, umów, raportów, ofert, protokołów i dokumentacji. Zrobisz dokument, który ktoś inny może przeczytać, poprawić i podpisać.',
  today:'Zacznij od napisania prawdziwego pisma, a nie od zapamiętywania skrótów. Poznaj edytowalny DOCX, gotowy do udostępniania PDF i sprawdź, kiedy wybrać każdy format.',
  zones:[
   {name:'Plik',meaning:'Nowy dokument, otwieranie, zapis, drukowanie i eksport.'},
   {name:'Narzędzia główne',meaning:'Czcionka, pogrubienie, akapity, wyrównanie i style.'},
   {name:'Wstawianie',meaning:'Tabela, obraz, nagłówek, stopka i numery stron.'},
   {name:'Układ',meaning:'Marginesy, orientacja strony i wielkość papieru.'},
   {name:'Recenzja',meaning:'Komentarze, śledzenie zmian i korekta.'},
   {name:'Biała strona',meaning:'Tutaj piszesz — kursor wskazuje dokładne miejsce wpisywania.'}
  ],
  terms:[
   {name:'DOCX',description:'Plik edytowalnego dokumentu. Możesz go ponownie otworzyć i zmienić treść.'},
   {name:'PDF',description:'Format do czytania i publikowania dokumentu. Zwykle utrzymuje wygląd stron.'},
   {name:'Akapit',description:'Fragment tekstu zakończony Enterem. Może mieć własny odstęp i wyrównanie.'},
   {name:'Styl',description:'Nazwany zestaw formatowania, np. Nagłówek 1, umożliwiający spis treści.'},
   {name:'Wstążka',description:'Górny obszar z kartami oraz poleceniami programu.'},
   {name:'Kursor',description:'Migająca pionowa kreska, w której miejscu pojawią się litery.'}
  ],
  actions:[
   {name:'Pogrub nagłówek',combo:'CTRL+B',desc:'Zaznacz tytuł i zastosuj pogrubienie.'},
   {name:'Zapisz dokument',combo:'CTRL+S',desc:'Zapis ma znaczenie dopiero po sprawdzeniu lokalizacji.'},
   {name:'Cofnij zmianę',combo:'CTRL+Z',desc:'Sprawdź, czy odzyskano właściwą treść.'}
  ]
 },
 'excel-skroty':{
  name:'Microsoft Excel',image:'excel-interface',mode:'excel',
  history:[
   'Excel jest arkuszem kalkulacyjnym, czyli programem do organizowania danych, obliczeń i analiz. W odróżnieniu od Worda pracuje przede wszystkim na komórkach, formułach, zakresach, tabelach i wykresach.',
   'Microsoft zaprezentował Excel w 1985 roku na komputerach Apple Macintosh. Wersja dla Windows pojawiła się w 1987 roku. Był następcą wcześniejszych prób Microsoftu na rynku arkuszy, w tym Multiplana.',
   'Przed rozpowszechnieniem arkuszy ludzie liczyli budżety na papierze i kalkulatorze. Arkusz pozwolił zmienić jedną cenę, a następnie automatycznie przeliczyć dziesiątki powiązanych wyników.'
  ],
  why:'Excel przydaje się do budżetu domowego, kosztorysu budowy, raportu magazynu, planu sprzedaży, listy pracowników i analiz. Najpierw nauczysz się rozumieć dane, nie tylko klikać ikony.',
  today:'W pierwszym ćwiczeniu zobaczysz arkusz kosztów remontu. Zmienisz ilość farby i cenę, sprawdzisz sumę, a później zrobisz z tych danych wykres.',
  zones:[
   {name:'Skoroszyt',meaning:'Cały plik XLSX, który może zawierać wiele arkuszy.'},
   {name:'Arkusz',meaning:'Jedna karta z wierszami i kolumnami.'},
   {name:'Siatka komórek',meaning:'Pola A1, B2, C3 — w nich są liczby, teksty i formuły.'},
   {name:'Pasek formuły',meaning:'Pokazuje pełną zawartość wybranej komórki, np. =C2*D2.'},
   {name:'Wstążka',meaning:'Polecenia Narzędzia główne, Wstawianie, Formuły, Dane i inne.'},
   {name:'Karty arkuszy',meaning:'Przełączają m.in. Arkusz 1 i Arkusz 2 w tym samym pliku.'}
  ],
  terms:[
   {name:'Komórka',description:'Jedno pole w miejscu przecięcia kolumny i wiersza, np. B2.'},
   {name:'Formuła',description:'Wyrażenie zaczynające się od =, np. =C2*D2 do policzenia wartości.'},
   {name:'Funkcja SUMA',description:'Dodaje wybrane liczby. W angielskich wersjach często nazywa się SUM.'},
   {name:'XLSX',description:'Współczesny format skoroszytu Excela, zawierający arkusze i ich dane.'},
   {name:'Zakres',description:'Grupa komórek, np. B2:B20.'},
   {name:'Wykres',description:'Wizualne porównanie danych, np. kosztów trzech materiałów.'}
  ],
  actions:[
   {name:'Przejdź na początek',combo:'CTRL+HOME',desc:'Zaznacza komórkę na początku arkusza.'},
   {name:'Policz sumę',combo:'ALT+=',desc:'Wprowadza funkcję SUM do wiersza wartości.'},
   {name:'Zamień dane w tabelę',combo:'CTRL+T',desc:'Włącza widok uporządkowanej tabeli.'},
   {name:'Narysuj wykres',combo:'ALT+F1',desc:'Pokazuje wizualizację kosztów usług.'},
   {name:'Wpisz i przelicz formułę',combo:'F2',desc:'Po wybraniu komórki możesz edytować jej zawartość.'}
  ]
 },
 'autocad-skroty':{
  name:'Autodesk AutoCAD',image:'autocad-interface',mode:'cad',
  history:[
   'AutoCAD to program CAD — Computer-Aided Design, czyli projektowanie wspomagane komputerowo. Pomaga narysować obiekt w zadanej geometrii i skali, kontrolować wymiary i przekazywać dokumentację wykonawczą.',
   'Firmę Autodesk założono w 1982 roku, a pierwsza wersja AutoCAD pojawiła się w tym samym roku. Jednym z założycieli Autodesk był John Walker. Wcześniej rysunki techniczne wykonywano ręcznie na deskach kreślarskich; ich poprawianie często wymagało żmudnego przerysowywania.',
   'Format DWG ma osobną historię: technologia została opracowana przez Mike’a Riddle’a pod koniec lat 70. i stała się formatem natywnym AutoCAD po licencjonowaniu przez Autodesk w 1982 roku. DWG może przechowywać geometrię, warstwy, opisy i inne dane projektu.'
  ],
  why:'AutoCAD wykorzystuje się w budownictwie, architekturze, instalacjach, produkcji i projektowaniu. Tu nauczysz się najpierw rysunku 2D, współrzędnych, jednostek, warstw i wiersza poleceń, a dopiero później rozwiązań zaawansowanych.',
  today:'Najpierw poznaj przestrzeń modelu i polecenia LINE, CIRCLE oraz RECTANG. Zbuduj szkic pokoju, dodaj linie i sprawdź różnicę między obrazem a precyzyjną geometrią.',
  zones:[
   {name:'Ribbon — wstążka',meaning:'Grupy narzędzi Home, Insert, Annotate i pozostałe.'},
   {name:'Model Space',meaning:'Główna przestrzeń, gdzie rysujesz obiekty w rzeczywistych jednostkach.'},
   {name:'Command Line',meaning:'Wpisujesz polecenie, a program pyta o punkty i parametry.'},
   {name:'Layers — warstwy',meaning:'Przypisujesz obiekty do grup, np. ściany, osie, wymiary.'},
   {name:'Layout',meaning:'Arkusz do przygotowania widoków i wydruku w skali.'},
   {name:'Status Bar',meaning:'Przełączniki m.in. przyciągania, ortogonalności i siatki.'}
  ],
  terms:[
   {name:'DWG',description:'Główny format pliku rysunkowego AutoCAD, z geometrią i informacjami projektu.'},
   {name:'DXF',description:'Format wymiany danych pomiędzy różnymi programami CAD.'},
   {name:'Linia',description:'Odcinek określony punktami, a nie odręczny ślad na obrazku.'},
   {name:'Warstwa',description:'Sposób organizowania obiektów według funkcji, koloru i widoczności.'},
   {name:'OSNAP',description:'Przyciąganie do charakterystycznych punktów obiektów.'},
   {name:'Jednostki',description:'Miara geometrii: np. mm albo m. Nie zakładaj jej bez sprawdzenia projektu.'}
  ],
  actions:[
   {name:'Narysuj linię',combo:'L',desc:'Dodaje linię do wirtualnego rysunku.'},
   {name:'Dodaj okrąg',combo:'C',desc:'Dodaje okrąg i pozwala zobaczyć geometrię.'},
   {name:'Dodaj prostokąt',combo:'REC',desc:'Tworzy obrys ściany lub pomieszczenia.'},
   {name:'Skopiuj obiekt',combo:'CP',desc:'Powiela ostatni element rysunku.'},
   {name:'Przesuń obiekt',combo:'M',desc:'Zmienia położenie ostatniego elementu.'},
   {name:'Warstwa',combo:'LA',desc:'Zmienia kolor i aktywną warstwę rysowania.'}
  ]
 },
 'windows-skroty':{
  name:'Microsoft Windows',image:'windows-desktop',mode:'windows',
  history:[
   'Windows jest systemem operacyjnym, a nie pojedynczym edytorem tekstu. Pozwala uruchamiać aplikacje, zarządzać urządzeniami, zapisywać pliki oraz korzystać z kont użytkowników.',
   'W 1981 roku komputery IBM PC korzystały m.in. z MS-DOS. Microsoft przedstawił koncepcję Windows w 1983 roku, a Windows 1.0 trafił do użytkowników 20 listopada 1985 roku. Graficzne okna i mysz pomogły zastępować wpisywanie trudnych komend.',
   'Windows 95 upowszechnił menu Start i pasek zadań. Kolejne wersje, w tym XP, 7, 10 i 11, rozwinęły obsługę sprzętu, sieci, aplikacji i zabezpieczeń.'
  ],
  why:'Windows pomaga organizować codzienną pracę komputera. Najpierw poznasz pulpit, Start, pasek zadań, okna, pliki i Eksplorator, później zaczniesz pracować szybciej i bezpieczniej.',
  today:'Otwórz pulpit ćwiczebny, znajdź folder Dokumenty i napisz krótkie zdanie w Notatniku. Zrozum, czym różni się program, folder, plik i strona internetowa.',
  zones:[
   {name:'Pulpit',meaning:'Ekran główny, ikony i skróty do aplikacji.'},
   {name:'Menu Start',meaning:'Wyszukiwarka programów, ustawienia i funkcje zasilania.'},
   {name:'Pasek zadań',meaning:'Przełączanie otwartych aplikacji i obszar powiadomień.'},
   {name:'Eksplorator',meaning:'Otwieranie, szukanie, porządkowanie i zapisywanie plików.'},
   {name:'Okno',meaning:'Obszar pracy jednego programu; można go minimalizować i zamykać.'},
   {name:'Kosz',meaning:'Miejsce, z którego część usuniętych plików da się przywrócić.'}
  ],
  terms:[
   {name:'System operacyjny',description:'Oprogramowanie zarządzające podstawowymi zasobami komputera.'},
   {name:'Aplikacja',description:'Program wykonujący zadanie, np. Word, Kalkulator lub przeglądarka.'},
   {name:'Folder',description:'Katalog zawierający pliki i podfoldery.'},
   {name:'Plik',description:'Zapisane dane — np. oferta.docx albo zdjęcie.jpg.'},
   {name:'Skrót',description:'Odnośnik do programu lub pliku; nie zawsze jest samym plikiem.'},
   {name:'Eksplorator plików',description:'Wbudowany program do przeglądania lokalizacji i porządkowania danych.'}
  ],
  actions:[
   {name:'Pokaż pulpit',combo:'WIN+D',desc:'Pokazuje pulpit bez zamykania aplikacji.'},
   {name:'Otwórz Eksplorator',combo:'WIN+E',desc:'Otwiera okno do pracy z plikami.'}
  ]
 }
};
export const hasSoftwareOrientation=(slug:string)=>Boolean(programs[slug]);
type Tab='interface'|'history'|'terms'|'practice';
const officialPages:Record<string,string>={
 'word-skroty':'https://support.microsoft.com/en-us/office/foundations-experiences/show-or-hide-the-ribbon-in-office',
 'excel-skroty':'https://support.microsoft.com/en-us/excel/show-the-ribbon',
 'autocad-skroty':'https://help.autodesk.com/cloudhelp/2026/ENU/AutoCAD-OnBoarding/files/ACD_FOUNDATIONS_MAIN1.html',
 'windows-skroty':'https://support.microsoft.com/en-us/windows'
};
const walkthroughs:Record<string,string[]>={
 'word-skroty':[
  'Otwórz Plik → Zapisz jako. Wybierz folder, nazwę i format DOCX. Po zapisie znajdź dokument w wybranej lokalizacji.',
  'Zaznacz jeden tytuł. W Narzędziach głównych nadaj mu styl Nagłówek 1, a nie tylko pogrubienie. Dzięki temu zbudujesz spis treści.',
  'Wybierz Wstawianie → Tabela. Ustaw dwie kolumny i trzy wiersze. Sprawdź, czy wszystkie informacje zmieściły się na stronie.',
  'Otwórz Układ i sprawdź marginesy. Zobacz w podglądzie wydruku, czy tekst nie wychodzi poza kartkę.',
  'Otwórz Recenzja i sprawdź komentarze oraz śledzenie zmian. Nie zatwierdzaj cudzej korekty bez zapoznania się z treścią.',
  'Kliknij w środek dokumentu. Wpisz jedno zdanie, zaznacz je i popraw. Wskaźnik myszy i kursor tekstu to różne elementy.'
 ],
 'excel-skroty':[
  'Zapisz jeden plik XLSX i nazwij go Budżet. Nie twórz osobnego pliku dla każdej pozycji; w tym samym skoroszycie możesz dodać kolejne arkusze.',
  'Otwórz kartę arkusza. Nazwij ją Materiały i wpisz trzy produkty. Przełącz na drugi arkusz i sprawdź, czy dane są niezależne.',
  'Zaznacz komórkę E2. Wpisz =C2*D2. Następnie zmień C2 i zobacz, czy wynik sam się przelicza.',
  'Kliknij na komórkę z formułą. Sprawdź jej pełną treść w pasku formuły. Nie myl wyświetlanego wyniku z zapisanym działaniem.',
  'Znajdź Formuły i zapoznaj się z SUMA/SUM. Zsumuj zakres wartości, nie włączając do sumy komórki z wynikiem.',
  'Sprawdź kartę arkusza na dole. Dodaj nową, nazwij Raport i wróć do Materiałów. To nadal jeden plik.'
 ],
 'autocad-skroty':[
  'W obszarze wstążki wybierz Home, a w nim Draw i Modify. Rozróżnij narzędzia tworzenia nowych obiektów i zmiany istniejących.',
  'Rysuj w Model Space w uzgodnionych jednostkach. Wprowadź punkty narożników zamiast zgadywać ich położenie na ekranie.',
  'Wpisz LINE w Command Line, ustaw pierwszy i kolejny punkt. Enter kończy etap, Esc przerywa polecenie. Wykonaj to w symulatorze.',
  'Utwórz warstwy dla ścian i wymiarów. Ukryj jedną, a następnie przywróć — obiekty nie zostały fizycznie usunięte.',
  'Layout służy do przygotowania widoku i wydruku, nie do przypadkowego przeskalowania modelu. Sprawdź wymiary w modelu przed eksportem.',
  'Włącz i wyłącz funkcje Snap/Ortho w symulatorze. Zwróć uwagę, kiedy uzyskujesz poziome lub pionowe odcinki.'
 ],
 'windows-skroty':[
  'Wskaż ikonę programu na pulpicie. Pamiętaj, że ikona może być skrótem, nie samym plikiem z dokumentem.',
  'Naciśnij klawisz Windows i wyszukaj Kalkulator. Uruchom aplikację i wróć do menu Start bez jej odinstalowywania.',
  'Otwórz Eksplorator skrótem Win+E. Znajdź Dokumenty i Pobrane, a następnie odczytaj ścieżkę do pliku.',
  'Zminimalizuj próbne okno, po czym przywróć je z paska zadań. Zobacz, że aplikacja nie została zamknięta.',
  'Otwórz dwa okna. Użyj Alt+Tab do ich zmiany, a Win+D do pokazania pulpitu. Nie zamykaj żadnego bez potrzeby.',
  'W Koszu znajdź próbny usunięty plik. Nie zakładaj, że każdy usunięty dokument lub plik na dysku sieciowym trafi właśnie tutaj.'
 ]
};
const tabs:{key:Tab;label:string}[]=[
 {key:'interface',label:'Poznaj ekran'},{key:'history',label:'Historia i zastosowanie'},
 {key:'terms',label:'Słownik'},{key:'practice',label:'Ćwicz sam'}
];
export default function SoftwareOrientation({slug}:{slug:string}){
 const p=programs[slug], [active,setActive]=useState<KeyboardShortcut|null>(null),[runId,setRunId]=useState(0);
 const [selectedTerm,setSelectedTerm]=useState(0),[selectedZone,setSelectedZone]=useState(0);
 const [tab,setTab]=useState<Tab>('interface'),[imageFailed,setImageFailed]=useState(false);
 if(!p)return null;
 function execute(a:Action){
  setActive({combo:a.combo,keys:[a.combo],kind:p.mode==='cad'?'alias':'hotkey',label:a.name,before:a.desc,after:a.desc,tip:a.desc});
  setRunId(n=>n+1);
 }
 return <View style={{backgroundColor:'#eef6e9',padding:16,borderRadius:18,borderColor:'#c9ddc5',borderWidth:1,gap:15,marginBottom:22}}>
  <Text style={{color:'#477455',fontWeight:'900',fontSize:12}}>ZACZYNAMY OD ZERA · PRZEWODNIK PO PROGRAMIE</Text>
  <Text style={{color:ink,fontSize:23,fontWeight:'900',lineHeight:30}}>{p.name} — poznaj ekran i wykonaj pierwsze zadanie</Text>
  {Platform.OS==='web'&&!imageFailed?
   <Image source={{uri:'https://trenerki-academy.expo.app/academy/assets/'+p.image+'.svg'}} onError={()=>setImageFailed(true)}
    resizeMode="contain" style={{width:'100%',height:290,backgroundColor:'white',borderRadius:12}}
    accessibilityLabel={'Ilustrowana mapa głównego ekranu '+p.name}/>:
   <View style={{backgroundColor:'white',borderRadius:12,padding:13,gap:10}}>
    <View style={{padding:10,backgroundColor:'#193c2d',borderRadius:8}}>
     <Text style={{fontWeight:'900',color:'white'}}>{p.name} · ekran pracy</Text>
    </View>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
     {p.zones.slice(0,5).map((z,i)=><Pressable key={i} onPress={()=>{setSelectedZone(i);setTab('interface')}} style={{padding:8,backgroundColor:'#e5f1e1',borderRadius:8}}>
      <Text style={{color:ink,fontSize:12,fontWeight:'800'}}>{z.name}</Text>
     </Pressable>)}
    </View>
    <View style={{backgroundColor:'#ecf2ed',padding:25,minHeight:90,borderRadius:9}}>
     <Text style={{color:ink,fontWeight:'800'}}>{p.zones[selectedZone].name}</Text>
     <Text style={{color:'#476a54',lineHeight:22}}>{p.zones[selectedZone].meaning}</Text>
    </View>
   </View>}
  <Text style={{fontSize:11,color:'#647d66',lineHeight:18}}>Autorski schemat edukacyjny, nie zrzut ekranu producenta. Wygląd może się zmieniać zależnie od wersji programu.</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
   {tabs.map(x=><Pressable key={x.key} onPress={()=>setTab(x.key)} accessibilityRole="button"
    accessibilityState={{selected:tab===x.key}}
    style={{paddingHorizontal:12,paddingVertical:11,backgroundColor:tab===x.key?ink:'white',borderRadius:10,borderColor:'#d4e4d0',borderWidth:1}}>
    <Text style={{color:tab===x.key?'white':ink,fontWeight:'900',fontSize:13}}>{x.label}</Text>
   </Pressable>)}
  </View>
  {tab==='interface'&&<>
   <Text style={{color:ink,fontWeight:'900',fontSize:19}}>Kliknij część menu i przećwicz jej funkcję</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
    {p.zones.map((z,i)=><Pressable key={i} onPress={()=>setSelectedZone(i)} accessibilityRole="button" accessibilityState={{selected:i===selectedZone}}
     style={{padding:11,borderRadius:9,backgroundColor:i===selectedZone?'#cde6c5':'white',borderWidth:1,borderColor:'#c8dcca'}}>
     <Text style={{color:ink,fontWeight:'800',fontSize:13}}>{String(i+1)+'. '+z.name}</Text>
    </Pressable>)}
   </View>
   <View style={{backgroundColor:'white',borderRadius:12,padding:17,gap:10}}>
    <Text style={{color:'#3e8158',fontWeight:'900',fontSize:12}}>WYBRANA CZĘŚĆ EKRANU</Text>
    <Text style={{color:ink,fontSize:19,fontWeight:'900'}}>{p.zones[selectedZone].name}</Text>
    <Text style={{color:'#43654a',lineHeight:24,fontSize:15}}>{p.zones[selectedZone].meaning}</Text>
    <Text style={{color:ink,fontWeight:'900'}}>Spróbuj na własnym komputerze:</Text>
    <Text style={{color:'#43654a',lineHeight:24,fontSize:15}}>{walkthroughs[slug][selectedZone]}</Text>
   </View>
   <Pressable onPress={()=>setTab('practice')} style={{padding:14,backgroundColor:ink,borderRadius:11}}>
    <Text style={{color:'white',fontWeight:'900',textAlign:'center'}}>Przejdź do wirtualnego programu →</Text>
   </Pressable>
  </>}
  {tab==='history'&&<View style={{gap:13}}>
   <Text style={{fontSize:18,fontWeight:'900',color:ink}}>Skąd pochodzi {p.name}?</Text>
   {p.history.map((paragraph,i)=><Text key={i} style={{fontSize:15,lineHeight:26,color:'#355542'}}>{paragraph}</Text>)}
   <View style={{backgroundColor:'white',padding:15,borderRadius:12,gap:8}}>
    <Text style={{fontWeight:'900',color:ink,fontSize:17}}>Gdzie wykorzystasz tę wiedzę?</Text>
    <Text style={{fontSize:15,color:'#3e5f48',lineHeight:24}}>{p.why}</Text>
   </View>
  </View>}
  {tab==='terms'&&<View style={{gap:12}}>
   <Text style={{color:ink,fontWeight:'900',fontSize:18}}>Mała encyklopedia programu</Text>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
    {p.terms.map((t,i)=><Pressable key={i} onPress={()=>setSelectedTerm(i)} style={{backgroundColor:i===selectedTerm?'#c9e7c5':'white',borderRadius:9,padding:11}}>
     <Text style={{color:ink,fontWeight:'900',fontSize:13}}>{t.name}</Text>
    </Pressable>)}
   </View>
   <View style={{backgroundColor:'white',padding:16,borderRadius:12,gap:9}}>
    <Text style={{color:ink,fontWeight:'900',fontSize:17}}>{p.terms[selectedTerm].name}</Text>
    <Text style={{color:'#3d604c',lineHeight:25,fontSize:15}}>{p.terms[selectedTerm].description}</Text>
   </View>
  </View>}
  {tab==='practice'&&<View style={{gap:12}}>
   <Text style={{color:ink,fontWeight:'900',fontSize:18}}>Otwórz warsztat i sprawdź rezultat</Text>
   <Text style={{color:'#3d624d',lineHeight:24}}>{p.today}</Text>
   <View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>
    {p.actions.map((a,i)=><Pressable accessibilityRole="button" key={i} onPress={()=>execute(a)}
     style={{backgroundColor:ink,paddingHorizontal:12,paddingVertical:12,borderRadius:9}}>
     <Text style={{color:'white',fontWeight:'900',fontSize:12}}>{a.name}</Text>
    </Pressable>)}
   </View>
   {(p.mode==='excel'||p.mode==='cad')?<HandsOnLab key={slug} mode={p.mode} active={active} runId={runId}/>:
    <SoftwarePlayground mode={p.mode} active={active}/>}
   <Text style={{color:'#4a7054',fontSize:12,lineHeight:21}}>Ćwiczenie nie zmienia Twoich rzeczywistych plików. Przejdź do kolejnych zadań, żeby sprawdzić umiejętności.</Text>
  </View>}
  <Pressable onPress={()=>Linking.openURL(officialPages[slug])} accessibilityRole="link"
   style={{borderTopWidth:1,borderColor:'#d0e1ce',paddingTop:14}}>
   <Text style={{color:'#28684b',fontSize:13,fontWeight:'800',textDecorationLine:'underline'}}>Zobacz oryginalny interfejs i instrukcje producenta ↗</Text>
  </Pressable>
 </View>;
}
