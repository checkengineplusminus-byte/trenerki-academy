import React,{useState} from 'react';
import {View,Text,Pressable} from 'react-native';

const ink='#153e2e',muted='#54715e';
export const glossary:Record<string,{term:string,meaning:string}[]>={
 'windows-skroty':[
 {term:'System operacyjny',meaning:'Podstawowe oprogramowanie sterujące sprzętem komputera i uruchamiające aplikacje.'},
 {term:'Pulpit',meaning:'Główny obszar pracy widoczny po zalogowaniu; nie jest miejscem, w którym powinny leżeć wszystkie dokumenty.'},
 {term:'Menu Start',meaning:'Lista aplikacji, wyszukiwarka i dostęp do wyłączania komputera, konta oraz ustawień.'},
 {term:'Eksplorator plików',meaning:'Program Windows do przeglądania folderów, odnajdywania, kopiowania i organizowania plików. Zwykle otwiera go Win+E.'},
 {term:'Plik',meaning:'Pojedynczy zapisany element, np. zdjęcie JPG, dokument DOCX czy arkusz XLSX.'},
 {term:'Folder',meaning:'Pojemnik porządkujący pliki i inne foldery; jest częścią ścieżki dostępu.'},
 {term:'Rozszerzenie',meaning:'Końcowe litery nazwy po kropce, np. .pdf; podpowiadają format pliku, lecz nie gwarantują bezpieczeństwa.'},
 {term:'Schowek',meaning:'Tymczasowa pamięć skopiowanych lub wyciętych danych, używana m.in. przez Ctrl+C i Ctrl+V.'},
 {term:'Skrót klawiszowy',meaning:'Naciśnięcie jednego lub kilku klawiszy wywołujące polecenie bez klikania menu.'},
 {term:'Pasek zadań',meaning:'Dolny lub boczny pasek z uruchomionymi aplikacjami, obszarem powiadomień i Start.'},
 {term:'Okno aktywne',meaning:'Program, który aktualnie odbiera wpisywany tekst i większość skrótów.'},
 {term:'Konto użytkownika',meaning:'Oddzielne środowisko z własnymi plikami i uprawnieniami; inne od hasła do strony internetowej.'},
 {term:'Kopia zapasowa',meaning:'Dodatkowa, niezależna kopia ważnych danych przydatna po błędzie lub awarii.'},
 {term:'Uprawnienia',meaning:'Zasady określające kto może odczytywać, zmieniać lub usuwać dane.'},
 {term:'Przeglądarka',meaning:'Program do stron internetowych, np. Edge; nie jest tym samym co Eksplorator plików.'},
 {term:'Menedżer zadań',meaning:'Narzędzie pokazujące pracujące procesy i zużycie zasobów, pomocne w diagnostyce.'}
 ],
 'excel-skroty':[
 {term:'Skoroszyt',meaning:'Cały plik Excela zawierający jeden lub wiele arkuszy.'},
 {term:'Arkusz',meaning:'Jedna karta skoroszytu z siatką wierszy i kolumn.'},
 {term:'Komórka',meaning:'Przecięcie kolumny i wiersza, np. C5; przechowuje wartość lub formułę.'},
 {term:'Adres komórki',meaning:'Litera kolumny i numer wiersza, np. D4.'},
 {term:'Zakres',meaning:'Grupa komórek, np. A1:D10.'},
 {term:'Formuła',meaning:'Obliczenie zaczynające się od znaku =, np. =C2*D2.'},
 {term:'Funkcja',meaning:'Gotowe działanie Excela w formule, np. SUMA lub SUM.'},
 {term:'Pasek formuły',meaning:'Miejsce nad arkuszem, w którym oglądasz i poprawiasz pełną zawartość aktywnej komórki.'},
 {term:'Odwołanie względne',meaning:'Adres formuły przesuwający się po kopiowaniu, np. A1.'},
 {term:'Odwołanie bezwzględne',meaning:'Adres z symbolami dolara, np. $A$1, który nie przesuwa się przy kopiowaniu.'},
 {term:'Filtr',meaning:'Ukrywa wiersze niespełniające wybranego kryterium bez ich usuwania.'},
 {term:'Tabela',meaning:'Ustrukturyzowany zakres z nagłówkami, ułatwiający filtrowanie i rozwijanie danych.'},
 {term:'Format liczby',meaning:'Sposób prezentowania wartości, np. waluta lub procent; nie powinien zmieniać sensu liczby.'},
 {term:'Wykres',meaning:'Graficzne przedstawienie danych, nie ich zamiennik; musi mieć czytelną skalę.'},
 {term:'Walidacja danych',meaning:'Reguły określające, co można wprowadzić do komórki.'},
 {term:'Tabela przestawna',meaning:'Sposób grupowania i podsumowania większego zbioru danych.'}
 ],
 'word-skroty':[
 {term:'Edytor tekstu',meaning:'Program do pisania, poprawiania i przygotowywania dokumentów.'},
 {term:'Dokument',meaning:'Plik zawierający treść, a często także formatowanie, obrazy i tabele.'},
 {term:'Wstążka',meaning:'Pasek kart i poleceń Worda, zwykle u góry okna: Narzędzia główne, Wstawianie, Układ i inne.'},
 {term:'Kursor',meaning:'Migająca kreska wskazująca, gdzie pojawi się wpisany znak.'},
 {term:'Zaznaczenie',meaning:'Fragment tekstu, na którym wykona się polecenie takie jak pogrubienie lub kopiowanie.'},
 {term:'Akapit',meaning:'Fragment tekstu zakończony Enterem; ma własne odstępy i wyrównanie.'},
 {term:'Styl',meaning:'Zestaw powtarzalnych ustawień tekstu, np. Nagłówek 1, pomagający utrzymać strukturę.'},
 {term:'Nagłówek',meaning:'Tytuł rozdziału sformatowany odpowiednim stylem; nie tylko pogrubione zdanie.'},
 {term:'Stopka',meaning:'Powtarzana dolna część stron, np. numer strony lub nazwa dokumentu.'},
 {term:'Podział strony',meaning:'Polecenie przeniesienia dalszej treści na nową stronę bez wielu Enterów.'},
 {term:'Interlinia',meaning:'Odległość między wierszami tekstu.'},
 {term:'Korekta',meaning:'Sprawdzenie pisowni, treści, liczb i spójności przed wysłaniem.'},
 {term:'Śledzenie zmian',meaning:'Tryb pozwalający pokazać poprawki osób redagujących dokument.'},
 {term:'PDF',meaning:'Format zachowujący układ stron podczas udostępniania; nie zastępuje wersji edytowalnej.'},
 {term:'DOCX',meaning:'Popularny format dokumentów Worda, który można dalej edytować.'}
 ],
 'autocad-skroty':[
 {term:'CAD',meaning:'Computer-Aided Design — projektowanie wspomagane komputerowo.'},
 {term:'AutoCAD',meaning:'Program do przygotowywania i edycji rysunków technicznych w 2D i, zależnie od wersji, także modeli 3D.'},
 {term:'DWG',meaning:'Główny format pliku rysunku AutoCAD. Zawiera geometrię i inne dane projektu.'},
 {term:'DXF',meaning:'Format wymiany danych rysunkowych między różnymi programami CAD.'},
 {term:'Model Space',meaning:'Przestrzeń modelu: najczęściej rysujesz tu obiekt w rzeczywistych jednostkach.'},
 {term:'Layout / Paper Space',meaning:'Arkusz prezentacyjny, w którym przygotowuje się widoki i wydruk w zadanej skali.'},
 {term:'Wiersz poleceń',meaning:'Pole tekstowe AutoCAD informujące, jakie polecenie jest aktywne i co zrobić dalej.'},
 {term:'Alias',meaning:'Krótka nazwa polecenia, np. L dla LINE, zatwierdzana Enterem.'},
 {term:'Warstwa',meaning:'Organizacja obiektów rysunku według roli, koloru, typu linii i widoczności.'},
 {term:'Polilinia',meaning:'Obiekt złożony z połączonych segmentów, edytowany jako całość.'},
 {term:'OSNAP',meaning:'Przyciąganie do charakterystycznych punktów obiektów, np. końca linii czy środka okręgu.'},
 {term:'ORTHO',meaning:'Tryb ułatwiający rysowanie w zadanych osiach, standardowo poziomo i pionowo.'},
 {term:'Blok',meaning:'Wielokrotnie używana definicja obiektu, np. symbol drzwi.'},
 {term:'XREF',meaning:'Zewnętrzny odnośnik do innego pliku rysunkowego.'},
 {term:'Wymiar',meaning:'Adnotacja opisująca odległość, kąt lub inny parametr; musi odpowiadać geometrii.'},
 {term:'Skala wydruku',meaning:'Relacja długości na arkuszu do długości w modelu, np. 1:50.'},
 {term:'Jednostki',meaning:'Ustalenie, czy wartości oznaczają np. milimetry czy metry.'},
 {term:'Rewizja',meaning:'Kontrolowana kolejna wersja rysunku, istotna przy koordynacji wykonania.'}
 ]
};
const terms=(slug:string)=>glossary[slug]||[];
const labels:Record<string,{title:string,menus:string[],panel:string[],hint:string}>={
 'windows-skroty':{title:'Pulpit systemu',menus:['Start','Szukaj','Eksplorator','Ustawienia'],panel:['Dokumenty','Pobrane','Obrazy','Ten komputer'],hint:'Eksplorator pokazuje foldery; Edge pokazuje strony internetowe. To dwa różne programy.'},
 'word-skroty':{title:'Dokument w Wordzie',menus:['Plik','Narzędzia główne','Wstawianie','Układ','Recenzja'],panel:['Wklej','Czcionka','Akapit','Style'],hint:'Wstążka służy do wybierania funkcji. Biała kartka jest miejscem pisania dokumentu.'},
 'excel-skroty':{title:'Arkusz w Excelu',menus:['Plik','Narzędzia główne','Wstawianie','Formuły','Dane'],panel:['A1','B1','C1','D1'],hint:'Pole nazwy pokazuje adres aktywnej komórki, a pasek formuły jej zawartość.'},
 'autocad-skroty':{title:'Rysunek w AutoCAD-zie',menus:['Home','Insert','Annotate','View','Manage'],panel:['LINE','CIRCLE','MOVE','LAYER'],hint:'Rysujesz w obszarze modelu; wiersz poleceń na dole podpowiada następny krok. DWG to plik projektu.'}
};
function WindowSketch({slug}:{slug:string}){
 const data=labels[slug];if(!data)return null;
 const cad=slug==='autocad-skroty',win=slug==='windows-skroty',excel=slug==='excel-skroty';
 return <View style={{borderWidth:1,borderColor:'#c9d9c9',borderRadius:13,overflow:'hidden'}}>
  <View style={{backgroundColor:'#e9f1e5',padding:11,flexDirection:'row',justifyContent:'space-between'}}>
   <Text style={{fontWeight:'900',color:ink,fontSize:12}}>{data.title}</Text>
   <Text style={{color:muted,fontSize:11}}>— □ ×</Text>
  </View>
  <View style={{flexDirection:'row',flexWrap:'wrap',backgroundColor:'#f5f7f2',padding:10,gap:10}}>
   {data.menus.map(x=><Text key={x} style={{fontSize:11,color:ink,fontWeight:'700'}}>{x}</Text>)}
  </View>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:7,backgroundColor:'#e1eadd',padding:10}}>
   {data.panel.map(x=><Text key={x} style={{paddingHorizontal:8,paddingVertical:6,backgroundColor:'white',borderRadius:5,color:ink,fontSize:11}}>{x}</Text>)}
  </View>
  {excel?<View style={{backgroundColor:'white',padding:12,gap:7}}>
   <Text style={{borderWidth:1,borderColor:'#dce9d8',padding:9,fontSize:12,color:ink}}>B2   ƒx   =C2*D2</Text>
   {[['','A','B','C','D'],['1','Produkt','Ilość','Cena','Razem'],['2','Farba','3','100','300'],['3','Taśma','2','25','50']].map((line,i)=><View key={i} style={{flexDirection:'row'}}>{line.map((v,j)=><Text key={j} style={{flex:1,borderWidth:.5,borderColor:'#d8e5d5',padding:5,color:ink,fontSize:10}}>{v}</Text>)}</View>)}
  </View>:cad?<View style={{height:146,backgroundColor:'#193a36',justifyContent:'center',alignItems:'center'}}>
    <View style={{width:145,height:78,borderColor:'#d7eb9b',borderWidth:2}}/>
    <View style={{position:'absolute',width:54,height:54,borderRadius:30,borderColor:'#a9e0de',borderWidth:2,right:'22%',top:33}}/>
    <Text style={{position:'absolute',bottom:8,left:10,color:'#d9e9bc',fontSize:11}}>Command: LINE  Specify first point:</Text>
  </View>:<View style={{minHeight:120,backgroundColor:win?'#cedbf1':'#fff',padding:16,flexDirection:win?'row':'column',gap:8}}>
   {win?<><View style={{width:'43%',backgroundColor:'white',padding:8,borderRadius:7}}><Text style={{fontWeight:'900',color:ink,fontSize:12}}>Eksplorator</Text><Text style={{color:muted,fontSize:10,marginTop:5}}>Dokumenty  •  Obrazy</Text></View><View style={{flex:1,justifyContent:'flex-end'}}><Text style={{color:ink,fontSize:11}}>Pulpit</Text></View></>:
    <><Text style={{fontWeight:'900',color:ink}}>Potwierdzenie zamówienia</Text><Text style={{color:ink,fontSize:12,lineHeight:22}}>Szanowni Państwo,{"\n"}potwierdzamy termin wykonania prac...{"\n"}Z poważaniem...</Text></>}
  </View>}
  <Text style={{backgroundColor:'#eff6ed',padding:12,color:muted,fontSize:12,lineHeight:19}}>{data.hint}</Text>
 </View>;
}
export default function ConceptAtlas({slug}:{slug:string}){
 const [expanded,setExpanded]=useState(false),[selected,setSelected]=useState<string|null>(null);
 const list=terms(slug),data=labels[slug];
 if(!list.length)return null;
 return <View style={{borderRadius:17,backgroundColor:'#edf5e9',borderWidth:1,borderColor:'#d4e6ce',padding:18,gap:13,marginBottom:18}}>
  <Text style={{fontSize:20,fontWeight:'900',color:ink}}>Poznaj swój program i jego język</Text>
  <Text style={{fontSize:14,lineHeight:23,color:muted}}>Nie zakładamy żadnej wcześniejszej wiedzy. To autorski schemat układu programu i mała encyklopedia pojęć. Kliknij dowolne hasło, aby poznać jego znaczenie.</Text>
  {!!data&&<WindowSketch slug={slug}/>}
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
   {list.slice(0,expanded?list.length:7).map(item=><Pressable key={item.term} onPress={()=>setSelected(v=>v===item.term?null:item.term)} style={{backgroundColor:selected===item.term?'#d3e9c8':'white',paddingHorizontal:12,paddingVertical:9,borderWidth:1,borderColor:'#d4e3d2',borderRadius:10}}>
    <Text style={{fontSize:12,fontWeight:'800',color:ink}}>{item.term}</Text>
   </Pressable>)}
  </View>
  {!!selected&&<View style={{backgroundColor:'white',borderRadius:11,padding:15}}>
   <Text style={{color:ink,fontWeight:'900',fontSize:16}}>{selected}</Text>
   <Text style={{color:muted,lineHeight:23,marginTop:5}}>{list.find(i=>i.term===selected)?.meaning}</Text>
  </View>}
  <Pressable onPress={()=>setExpanded(x=>!x)} style={{paddingVertical:9}}>
   <Text style={{color:'#236b46',fontWeight:'800'}}>{expanded?'Zwiń encyklopedię':'Zobacz wszystkie hasła ('+list.length+') →'}</Text>
  </Pressable>
 </View>
}
