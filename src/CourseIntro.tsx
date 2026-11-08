import React,{useState,useEffect} from 'react';
import {View,Text,Pressable} from 'react-native';
import individualGuides from '../content/course-guides-individual.json';
import craftGuides from '../content/craft-guides-individual.json';
type Intro={what:string;first:string;result:string;boundary?:string};
const intros:Record<string,Intro>={
 'excel-skroty':{
 what:'Excel to arkusz kalkulacyjny. Działa jak siatka komórek: w jednej wpisujesz liczbę, w drugiej formułę, a program może sam policzyć wynik.',
 first:'Wyobraź sobie kosztorys: ilość farby, cena za litr i koszt całkowity. Zaczniemy od poruszania się po komórkach bez myszy.',
 result:'Nauczysz się szybciej wyszukiwać dane, formatować komórki, pracować z tabelami i nie zgubić się w dużym arkuszu.'
 },
 'word-skroty':{
 what:'Word to edytor tekstu. Tworzysz w nim pisma, oferty, umowy i raporty. Skróty oszczędzają czas przy pisaniu oraz poprawianiu dokumentów.',
 first:'Zrobimy krótkie pismo do klienta. Zmienisz nagłówek, zapiszesz dokument i cofniesz przypadkową zmianę.',
 result:'Będziesz szybciej edytować dokumenty i świadomie sprawdzać rezultat każdego polecenia.'
 },
 'autocad-skroty':{
 what:'AutoCAD służy do wykonywania i edytowania rysunków technicznych. Używa linii, okręgów, warstw i dokładnych wymiarów.',
 first:'Na wirtualnym rysunku wykonasz polecenie L i zobaczysz linię. Następnie wypróbujesz okrąg, prostokąt i podstawowe zmiany geometrii.',
 result:'Rozróżnisz polecenia wpisywane w wierszu komend od skrótów klawiatury oraz zrozumiesz podstawy precyzyjnego rysowania.'
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
