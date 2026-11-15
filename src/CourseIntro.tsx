import React,{useState,useEffect} from 'react';
import {View,Text,Pressable} from 'react-native';
import individualGuides from '../content/course-guides-individual.json';
import craftGuides from '../content/craft-guides-individual.json';
type Intro={what:string;first:string;result:string;boundary?:string};
const intros:Record<string,Intro>={
 'ciesla-przygotowanie-czeladnicze':{
  what:'Ciesielstwo to sztuka pracy z drewnianą konstrukcją budynku. Cieśla przygotowuje i montuje m.in. słupy, belki, stropy i więźby dachowe. Stolarz zwykle wykonuje meble, drzwi i wykończenie. Oba zawody wymagają dokładności, ale ich zadania są inne.',
  first:'Zaczniesz od rozpoznawania elementów: podwaliny, oczepu, murłaty i krokwi. Następnie dowiesz się, jak powstaje tarcica, dlaczego drewno trzeba odpowiednio suszyć i jak kontrolować wymiary. Kurs ma 63 lekcje w siedmiu działach; wszystkie pojęcia wyjaśniamy od zera.',
  result:'Nauczysz się czytać podstawowe opisy i rysunki konstrukcji, rozpoznawać materiały, narzędzia, połączenia i zagrożenia. W każdej lekcji czeka pytanie kontrolne, a w wybranych również obliczenia. Jest to przygotowanie teoretyczne, nie uprawnienie do samodzielnego wykonywania konstrukcji.',
  boundary:'Praca na wysokości, obsługa maszyn i montaż elementów nośnych wymagają praktycznego przeszkolenia, projektu i przestrzegania zasad bezpieczeństwa.'
 },
 'excel-skroty':{
 what:'Wyobraź sobie sklep sprzed kilkudziesięciu lat. Ktoś zapisuje towary, ilości i ceny w zeszycie, a potem godzinami dodaje liczby. Kiedy jedna cena się zmienia, musi liczyć wszystko od nowa. W 1979 roku pojawił się VisiCalc — jeden z pierwszych popularnych arkuszy dla komputerów osobistych. Microsoft wprowadził Excel w 1985 roku na komputery Macintosh, a wersję dla Windows w 1987 roku. Od tamtej pory idea pozostała prosta: wpisujesz dane w kratkach, a obliczenia mogą aktualizować się automatycznie. Nie musisz wcześniej znać programu, znać skrótów ani lubić matematyki.',
 first:'Zacznij od rozpoznania ekranu Microsoft Excel. Zobaczysz, gdzie jest menu Plik, Narzędzia główne, puste kratki i pasek formuły. Dowiesz się, czym jest skoroszyt (plik), arkusz (karta w pliku), wiersz (pozioma linia) i kolumna (pionowy słupek). Dopiero gdy zrozumiesz te nazwy, przejdziesz do prostego ćwiczenia na liście zakupów lub produktach sklepu. Będziesz wykonywać jedną małą czynność naraz, z podpowiedziami i możliwością powtórki. Do prawdziwego Excela dostaniesz pliki CSV z danymi treningowymi.',
 result:'Kurs ma 30 lekcji w trzech częściach: fundamenty, praktyka i analiza. Najpierw nauczysz się wpisać dane, znaleźć komórkę, zapisać plik XLSX i użyć prostych formuł, a później przygotować budżet, filtr, wykres i raport. Bardziej złożone funkcje, takie jak X.WYSZUKAJ czy Power Query, zostawiamy na później. Ćwiczenia wewnątrz Trenerki są symulacjami edukacyjnymi — prawdziwy Microsoft Excel poznajesz także z instrukcji producenta i samodzielnie otwieranych plików.'
 },
 'word-skroty':{
 what:'Word został stworzony przez firmę Microsoft jako edytor dokumentów. Wśród jego głównych twórców byli Charles Simonyi i Richard Brodie. Program Multi-Tool Word trafił na rynek w 1983 roku; Microsoft podaje premierę 25 października 1983 r. Word dla Windows pojawił się w 1989 roku. Program pozwala pisać i poprawiać pisma bez przepisywania całych stron, a później wzbogacono go o tabele, obrazy, style, spisy treści i wspólną pracę.',
 first:'Najpierw zobaczysz ilustrowany ekran Worda: karty Plik, Narzędzia główne, Wstawianie, Układ i Recenzja, obszar dokumentu i kursor. Wyjaśnię różnicę między DOCX a PDF, akapitem a linią, nazwą dokumentu a miejscem zapisu. Dopiero potem napiszesz własne pismo w ćwiczeniu.',
 result:'Nauczysz się tworzyć prawdziwe dokumenty, protokoły, oferty, raporty, tabele i automatyczne spisy treści. Na poziomie zaawansowanym sprawdzisz dostępność, wersje, ukryte komentarze, bezpieczeństwo danych i gotowy PDF.'
 },
 'autocad-skroty':{
 what:'AutoCAD to program projektowania wspomaganego komputerowo (CAD) firmy Autodesk, założonej w 1982 roku m.in. przez Johna Walkera. AutoCAD zadebiutował w 1982 roku i umożliwił przeniesienie precyzyjnych rysunków z deski kreślarskiej na komputer. Jego główny format DWG wywodzi się z technologii opracowanej przez Mike’a Riddle’a w latach 70. XX wieku. Zanim narysujesz pierwszą linię, poznasz jednostki, współrzędne, formaty DWG i DXF, warstwy oraz przestrzeń modelu.',
 first:'Na początek spokojnie poznasz ekran programu i słownik. Wstążka to górny pasek narzędzi. Wiersz poleceń jest miejscem, w którym program pyta o następny krok. Model to przestrzeń rysowania, a arkusz służy do przygotowania wydruku. Warstwa porządkuje elementy, podobnie jak osobne przegródki: jedna dla obrysu, druga dla osi, trzecia dla wymiarów. Nie musisz od razu pamiętać wszystkich nazw. W pierwszych dziesięciu lekcjach wracamy do nich na prostych przykładach. Oryginalne fragmenty ekranu pomogą Ci odnaleźć te miejsca w AutoCAD-zie.',
 result:'Kurs składa się z 30 lekcji. W lekcjach 1–10 poznasz podstawy, jednostki i pierwszy obrys pokoju. W lekcjach 11–20 przećwiczysz rysowanie, przesuwanie, kopiowanie, przyciąganie do punktów, warstwy, bloki, wymiary i zapis. Lekcje 21–30 dotyczą kontroli dokumentacji: wersji plików, skali wydruku, pomiarów i przekazywania kompletnego rysunku. Nauczysz się też, dlaczego trzy linie tworzące trójkąt nie łączą się same oraz jak połączyć je w jeden obiekt i przesunąć bez zmiany kształtu. Ćwiczenia wykonujesz w Autodesk AutoCAD lub AutoCAD LT na komputerze, na własnym pliku treningowym. Tutaj czytasz instrukcję, porównujesz oczekiwany wynik i odpowiadasz na pytania. Możesz czytać kurs na telefonie, a rysunki wykonać później przy komputerze. Dostęp do programu Autodesk jest potrzebny do części praktycznej i nie jest dołączony do kursu.'
 },
 'windows-skroty':{
 what:'Wyobraź sobie komputer z początku lat osiemdziesiątych: zamiast dzisiejszego pulpitu użytkownik wpisuje polecenia do MS-DOS. Microsoft ogłosił Windows w 1983 roku, a w 1985 roku wypuścił Windows 1.0 z obsługą myszy i okien. W 1995 roku Windows 95 spopularyzował menu Start i pasek zadań. System zmieniał się przez kolejne dekady aż do Windows 11. Zaczniemy od zrozumienia tej historii i tego, po co w ogóle potrzebny jest system operacyjny.',
 first:'Nie zaczynamy od wciskania skrótów. Najpierw poznasz historię, pulpit, okna, menu Start, pliki, foldery i Eksplorator. Zobaczysz własne ilustracje ekranów, a później w próbnym Notatniku napiszesz i zapiszesz swój pierwszy dokument. Dopiero kiedy rozumiesz te elementy, przejdziemy do pracy klawiaturą i rozwiązywania problemów.',
 result:'Zrozumiesz rolę systemu operacyjnego, samodzielnie zorganizujesz dokumenty, zapiszesz i odnajdziesz plik, ustawisz dwa okna do pracy, sprawdzisz źródło programu, ochronisz dane i wykonasz zadanie biurowe od początku do końca. W trzecim dziale nauczysz się diagnozy problemów, kopii zapasowych i bezpiecznego udostępniania.'
 },
 'norweski-na-budowie':{
 what:'Norweski na budowie to język codziennej pracy. Uczymy się od pierwszego „hei” i pytania, gdzie jest wejście, nie od skomplikowanych zdań kierownika.',
 first:'Stoisz przy bramie. Dowiesz się, jak się przedstawić, poprosić o powtórzenie i zapytać o kartę HMS.',
 result:'Udzielisz podstawowych informacji, poprosisz o pomoc i dowiesz się, gdzie sprawdzić swoje prawa i obowiązki w Norwegii.'
 },
 'angielski-na-budowie':{
 what:'Praktyczny angielski dla każdego pracownika budowy w Wielkiej Brytanii: pomocnika, malarza, montera czy dostawcy.',
 first:'Zaczniesz od Hello, swojego imienia i prostego pytania o site induction.',
 result:'Przejdziesz przez typowy dzień pracy i poznasz lokalne zasady bezpieczeństwa oraz podstawowe prawa pracownika.'
 },
 'niemiecki-na-budowie':{
 what:'Praktyczny niemiecki od podstaw dla pracowników budowlanych, bez konieczności znajomości gramatyki.',
 first:'Poznasz Hallo, wymowę ä ö ü oraz pytania o wejście i instruktaż na niemieckiej budowie.',
 result:'Nauczysz się użytecznych zdań, nazw narzędzi, zgłaszania zagrożenia i podstaw informacji o wynagrodzeniu.'
 },
 'jak-kupic-samochod':{
 what:'Ten kurs uczy oceniać używany samochód jako zakup z ryzykiem, nie jako ładne zdjęcie w ogłoszeniu.',
 first:'Dostajesz ofertę auta za 40 tysięcy złotych. Zanim pojedziesz na oględziny, policzysz budżet, rezerwę i pytania do sprzedającego.',
 result:'Zrobisz checklistę oględzin, historii, diagnostyki i umowy, żeby podejmować decyzję opartą na faktach.'
 },
 'lepszy-kucharz':{
 what:'Gotowanie to organizacja pracy, higiena, kontrola temperatury, świadomy smak i powtarzalność posiłków.',
 first:'Przygotujesz stanowisko i poznasz pojęcie mise en place, zanim włączysz palnik.',
 result:'Zaczniesz kontrolować jakość dania, ryzyko i koszty — także w domowej kuchni.'
 },
 'lepszy-cukiernik':{
 what:'Cukiernictwo to precyzja: zmiana proporcji o niewielką ilość może zmienić cały wypiek.',
 first:'Zważysz składniki i porównasz wynik z odmierzaniem na oko.',
 result:'Zrozumiesz konsystencję, temperaturę, bezpieczne przechowywanie oraz kalkulację porcji.'
 },
 'opieka-seniorzy':{
 what:'Opieka to przede wszystkim szacunek, komunikacja, bezpieczeństwo i wspieranie samodzielności starszej osoby.',
 first:'Senior prosi, by nie wyręczać go we wszystkim. Nauczysz się zapytać o jego potrzeby i granice.',
 result:'Zaplanujesz pomoc w codziennych czynnościach, poznasz sygnały alarmowe i własne granice jako opiekun.'
 },
 'wsparcie-adhd':{
 what:'ADHD wpływa na uwagę i samoregulację, ale każdy człowiek ma inne potrzeby. Nie uczymy diagnozowania ani oceniania.',
 first:'Zobaczysz, dlaczego ogólne „weź się w garść” zwykle nie pomaga rozpocząć trudnego zadania.',
 result:'Nauczysz się prostych komunikatów, rutyn i metod wspierania — bez zawstydzania.'
 },
 'zaczynam-od-zera':{
 what:'Po poważnej stracie najpierw trzeba zadbać o podstawy, rozpoznać fakty i odzyskać możliwość podejmowania decyzji.',
 first:'Zrobisz spis pilnych wydatków, zobowiązań i dostępnych zasobów.',
 result:'Ułożysz mały plan finansowy i praktyczne kroki odbudowy bez ryzykownych obietnic.'
 },
 'mierz-ponad-sily':{
 what:'Ambicja pomaga rosnąć, ale nie powinna oznaczać ryzykowania domu, zdrowia ani bezpieczeństwa bliskich.',
 first:'Weźmiesz wielki pomysł i zamienisz go w jeden mały, mierzalny test.',
 result:'Nauczysz się pokazywać umiejętności w praktyce i podejmować odważne, ale przemyślane decyzje.'
 },
 'zwiazek-rozmowa':{
 what:'Rozmowa to nie konkurs na lepszy argument. Uczysz się nazywać potrzeby i słuchać bez oskarżania.',
 first:'Przećwiczysz, jak zmienić „ty zawsze” na opis jednej konkretnej sytuacji.',
 result:'Otrzymasz narzędzia do spokojniejszej komunikacji w relacji, gdy obie osoby mają przestrzeń i poczucie bezpieczeństwa.'
 },
 'nie-marnuj-jedzenia':{
 what:'Codzienne marnowanie jedzenia często zaczyna się od nieplanowanych zakupów i złego przechowywania.',
 first:'Zajrzymy do lodówki i zaplanujemy posiłek z bezpiecznych produktów, które już masz.',
 result:'Będziesz lepiej planować zakupy i bezpieczne wykorzystanie resztek, oszczędzając pieniądze.'
 },
 'ekonomia-domowa-bez-dlugow':{
 what:'Domowa ekonomia to decyzje podejmowane przed zakupem: ile masz pieniędzy, co jest konieczne i jakie zobowiązanie zostanie później.',
 first:'Rozłożysz przykładową wypłatę na potrzeby, rachunki i rezerwę.',
 result:'Zaczniesz rozumieć koszty stałe, zadłużenie i różnicę między ceną a całkowitym kosztem.'
 },
 'google-ads-promocja':{
 what:'Google Ads pokazuje reklamę osobom szukającym produktów lub usług. Każde kliknięcie może kosztować, więc liczy się cel i pomiar.',
 first:'Zamiast reklamować się wszystkim, wybierzesz konkretną usługę, lokalizację i intencję klienta.',
 result:'Zaplanujesz próbny budżet i nauczysz się oceniać zapytania, a nie same kliknięcia.'
 },
 'facebook-ads-promocja':{
 what:'Reklamy Facebooka i Instagrama pomagają pokazać ofertę wybranym odbiorcom. Zasięg nie oznacza automatycznie klientów.',
 first:'Dopasujesz prosty komunikat do jednej usługi i grupy odbiorców.',
 result:'Będziesz oceniać kreacje, budżet i jakość kontaktów z reklam, nie tylko polubienia.'
 }
};
export default function CourseIntro({slug,title,description,first}:{slug:string,title:string,description?:string,first:boolean}){
 const [open,setOpen]=useState(first);
 useEffect(()=>setOpen(first),[slug,first]);
 const localGuides={...(individualGuides as Record<string,Intro>),...(craftGuides as Record<string,Intro>)};
 const entry=intros[slug]||localGuides[slug]||{
  what:description||'Poznaj codzienną praktykę tego tematu, żeby zobaczyć, kiedy i jak wykorzystać nową umiejętność.',
  first:'Najpierw przeanalizujesz przykład, potem spróbujesz samodzielnie podjąć decyzję.',
  result:'Ułożysz sposób działania, który możesz sprawdzić na bezpiecznym przykładzie.'
 };
 return <View style={{backgroundColor:'#edf5e7',borderRadius:17,marginBottom:19,borderWidth:1,borderColor:'#dbe9d7'}}>
  <Pressable onPress={()=>setOpen(v=>!v)} style={{padding:18,flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10}}>
   <Text style={{fontWeight:'900',fontSize:19,color:'#193d2c',flex:1}}>Poznaj swój kurs — od czego zaczniemy?</Text>
   <Text style={{fontWeight:'900',color:'#456c48'}}>{open?'Zwiń':'Rozwiń'}</Text>
  </Pressable>
  {open&&<View style={{paddingHorizontal:19,paddingBottom:20,gap:14}}>
   <Text style={{fontSize:15,lineHeight:25,color:'#3c6048'}}>{entry.what}</Text>
   {slug==='ciesla-przygotowanie-czeladnicze'&&<View testID="carpentry-course-history" style={{gap:12}}>
    <Text style={{fontSize:17,fontWeight:'900',color:'#183c2b'}}>Od dawnych osad do nowoczesnych konstrukcji</Text>
    {[
     {era:'Dawne osady',story:'Drewniane ściany budowano m.in. w technice zrębowej (układane bale) i sumikowo-łątkowej (poziome elementy między pionowymi słupami). Dokładne dopasowanie drewna było potrzebne na długo przed pojawieniem się dzisiejszych wkrętów.'},
     {era:'Średniowiecze i późniejsze stulecia',story:'Rozwijano ciesielskie wręby, czopy i więźby dachowe. W niektórych regionach Polski rozpowszechniły się szkielety drewniane z wypełnionymi polami, nazywane szachulcem lub murem pruskim.'},
     {era:'XIX i XX wiek',story:'Mechaniczne piły i rozwój tartaków umożliwiły szybszą obróbkę oraz bardziej powtarzalne wymiary tarcicy. Jednocześnie umiejętność pomiaru, trasowania i pasowania elementów pozostała niezbędna.'},
     {era:'Współczesność',story:'Obok tradycyjnych złączy spotkasz łączniki stalowe, drewno konstrukcyjne, prefabrykowane wiązary i projekty cyfrowe. Nadal trzeba rozumieć obciążenia, wilgotność i sposób podparcia.'}
    ].map(({era,story},i)=><View key={era} style={{backgroundColor:'white',padding:13,borderRadius:12,borderLeftWidth:4,borderLeftColor:i%2===0?'#8aad73':'#659579',gap:5}}>
     <Text style={{fontWeight:'900',fontSize:14,color:'#245337'}}>{i+1}. {era}</Text>
     <Text style={{fontSize:14,lineHeight:23,color:'#314d39'}}>{story}</Text>
    </View>)}
    <View style={{backgroundColor:'#fff6e5',borderRadius:12,padding:15,gap:8}}>
     <Text style={{fontWeight:'900',fontSize:14,color:'#6f4e22'}}>Ciekawostki z warsztatu</Text>
     <Text style={{fontSize:14,lineHeight:22,color:'#584527'}}>🌲 Drewno zmienia wymiary wraz z wilgotnością. Najsilniej pęcznieje i kurczy się w poprzek włókien, dlatego suszenie oraz przechowywanie nie są tylko sprawą wyglądu.</Text>
     <Text style={{fontSize:14,lineHeight:22,color:'#584527'}}>🏠 Dawne szkielety drewniane bywały przygotowywane na ziemi i znakowane, aby ułatwić późniejszy montaż. To historyczny krewny dzisiejszej prefabrykacji.</Text>
    </View>
    <View style={{backgroundColor:'#e0ecdc',padding:14,borderRadius:12,gap:6}}>
     <Text style={{fontWeight:'900',color:'#244a36'}}>Jak zaliczać lekcje?</Text>
     <Text style={{color:'#355840',lineHeight:22}}>Czytaj opis, poznaj przykład i odpowiedz na pytanie. W lekcjach z obliczeniami zaliczasz DWA zadania: pytanie kontrolne oraz wynik z ćwiczenia rachunkowego. Na ekranie zobaczysz postęp 0/2, 1/2 albo 2/2. Rozmowa z Anielką jest dobrowolną pomocą.</Text>
    </View>
   </View>}
   <View style={{backgroundColor:'white',padding:15,borderRadius:11,gap:7}}>
    <Text style={{fontWeight:'900',color:'#3e7247',fontSize:13}}>PIERWSZE KROKI — ZACZYNAMY OD ZERA</Text>
    <Text style={{lineHeight:23,color:'#264431'}}>{entry.first}</Text>
   </View>
   <View style={{gap:5}}>
    <Text style={{fontWeight:'900',color:'#3e7247',fontSize:13}}>CZEGO SIĘ NAUCZYSZ</Text>
    <Text style={{lineHeight:24,color:'#264431'}}>{entry.result}</Text>
   </View>
   {!!entry.boundary&&<Text style={{fontSize:12,lineHeight:20,color:'#67806c'}}>{entry.boundary}</Text>}
  </View>}
 </View>;
}
