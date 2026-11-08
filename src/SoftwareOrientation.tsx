import React,{useState} from 'react';
import {Image,Platform,Pressable,Text,View} from 'react-native';
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
export default function SoftwareOrientation({slug}:{slug:string}){
 const p=programs[slug], [active,setActive]=useState<KeyboardShortcut|null>(null),[runId,setRunId]=useState(0),[selectedTerm,setSelectedTerm]=useState(0);
 if(!p)return null;
 function execute(a:Action){setActive({combo:a.combo,keys:[a.combo],kind:p.mode==='cad'?'alias':'hotkey',label:a.name,before:a.desc,after:a.desc,tip:a.desc});setRunId(n=>n+1);}
 return <View style={{backgroundColor:'#f0f6ec',padding:17,borderRadius:18,borderColor:'#c9ddc5',borderWidth:1,gap:16,marginBottom:22}}>
  <Text style={{color:'#457054',fontWeight:'900',fontSize:12}}>PIERWSZY ROZDZIAŁ · POZNAJ PROGRAM OD ZERA</Text>
  <Text style={{color:ink,fontSize:23,fontWeight:'900',lineHeight:29}}>{p.name}: skąd się wziął i co zobaczysz na ekranie?</Text>
  {p.history.map((paragraph,i)=><Text key={i} style={{fontSize:15,lineHeight:26,color:'#355542'}}>{paragraph}</Text>)}
  <View style={{backgroundColor:'#e0efdc',padding:15,borderRadius:12,gap:7}}>
   <Text style={{fontSize:16,color:ink,fontWeight:'900'}}>Po co używamy tego programu?</Text>
   <Text style={{fontSize:15,color:'#355542',lineHeight:25}}>{p.why}</Text>
  </View>
  <Text style={{fontWeight:'900',color:ink,fontSize:18}}>1. Zobacz główne okno aplikacji</Text>
  <View style={{backgroundColor:'white',padding:9,borderWidth:1,borderColor:'#d6e5d2',borderRadius:13,gap:9}}>
   {Platform.OS==='web'?<Image source={{uri:'https://trenerki-academy.expo.app/academy/assets/'+p.image+'.svg'}} resizeMode="contain" accessibilityLabel={'Schemat okna '+p.name} style={{width:'100%',height:285}}/>:
    <Text style={{color:'#4e6f58'}}>Schemat interfejsu: {p.name}. Poniżej opisane są wszystkie ważne obszary.</Text>}
   <Text style={{color:'#69806c',fontSize:11,lineHeight:17}}>Własny rysunek edukacyjny TRENERKI Academy, pokazujący przykładowe menu. Nie jest zrzutem rzeczywistej aplikacji.</Text>
  </View>
  <Text style={{fontWeight:'900',fontSize:18,color:ink}}>2. Poznaj menu i znaczenie każdego obszaru</Text>
  <View style={{gap:9}}>{p.zones.map((z,i)=><View key={i} style={{backgroundColor:'white',borderRadius:11,padding:13,flexDirection:'row',gap:12}}>
   <Text style={{fontWeight:'900',color:'#316849',fontSize:17,width:25}}>{i+1}.</Text>
   <View style={{flex:1,gap:5}}><Text style={{color:ink,fontWeight:'900',fontSize:15}}>{z.name}</Text><Text style={{color:'#50715b',fontSize:14,lineHeight:22}}>{z.meaning}</Text></View>
  </View>)}</View>
  <Text style={{fontWeight:'900',fontSize:18,color:ink}}>3. Mała encyklopedia — poznaj nowe słowa</Text>
  <View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>{p.terms.map((t,i)=><Pressable key={i} onPress={()=>setSelectedTerm(i)} style={{backgroundColor:i===selectedTerm?'#c8e3c2':'white',borderWidth:1,borderColor:'#c2d7c1',borderRadius:9,padding:10}}><Text style={{color:ink,fontWeight:'800',fontSize:12}}>{t.name}</Text></Pressable>)}</View>
  <View style={{backgroundColor:'white',borderRadius:11,padding:16,gap:7}}><Text style={{fontSize:17,fontWeight:'900',color:ink}}>{p.terms[selectedTerm].name}</Text><Text style={{color:'#4a6450',fontSize:15,lineHeight:24}}>{p.terms[selectedTerm].description}</Text></View>
  <Text style={{fontWeight:'900',fontSize:18,color:ink}}>4. Zrób coś samodzielnie — wirtualne ćwiczenie</Text>
  <Text style={{color:'#45634c',lineHeight:24,fontSize:15}}>{p.today} Przyciski poniżej wykonują polecenie w ćwiczeniu, nie zmieniają Twoich prawdziwych plików.</Text>
  <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{p.actions.map((a,i)=><Pressable accessibilityRole="button" key={i} onPress={()=>execute(a)} style={{backgroundColor:ink,paddingHorizontal:13,paddingVertical:11,borderRadius:9}}><Text style={{color:'white',fontWeight:'800',fontSize:12}}>{a.name}</Text></Pressable>)}</View>
  {(p.mode==='excel'||p.mode==='cad')?<HandsOnLab key={slug} mode={p.mode} active={active} runId={runId}/>:
   <SoftwarePlayground mode={p.mode} active={active}/>}
  <Text style={{fontSize:13,color:'#53705c',lineHeight:21}}>Po ćwiczeniu opisz Anielce, co zrobiłeś i co się zmieniło. Dopiero potem przejdziesz do następnego etapu.</Text>
 </View>;
}
