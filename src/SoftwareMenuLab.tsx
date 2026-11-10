import React,{useEffect,useState} from 'react';
import {View,Text,Pressable,ScrollView} from 'react-native';

type Item={tab:string;path:string;purpose:string;fields:string[];exercise:string;warning?:string};
type Menu={label:string;context:string;verified:boolean;items:Item[]};
const modules:Record<string,Menu>={
 'ongoing-wms':{label:'Ongoing WMS',context:'Menu nad stroną · wybór Goods owner (F2) · szukaj strony (F3)',verified:true,items:[
  {tab:'Order',path:'Order → Order list',purpose:'Zlecenia wysyłkowe i statusy pobrania.',fields:['Order number','Goods owner','Pickable','Order rows'],exercise:'Znajdź zamówienie O-104. Sprawdź Pickable, zanim zlecisz kompletację.'},
  {tab:'Inbound',path:'Order → Purchase order list',purpose:'Przyjęcia zapowiedziane przez klienta.',fields:['Purchase order','Article','Expected qty','Received qty'],exercise:'Dostawa zapowiada 120 szt., przyjechało 108. Którą wartość trzeba potwierdzić jako fizyczny odbiór?'},
  {tab:'Goods flow',path:'Goods flow → Order rows',purpose:'Obserwacja przepływu i możliwości kompletacji.',fields:['Article','Location','Quantity','Pickability'],exercise:'Zidentyfikuj, czy brak dotyczy stanu czy jego rezerwacji.'},
  {tab:'Pick',path:'Order list → Allocate → Pick',purpose:'Najpierw alokacja, następnie fizyczne pobranie; pakowanie jest odrębnym etapem.',fields:['Allocated','Picked','Packed','Available'],exercise:'Dlaczego sam status Allocated nie dowodzi, że operator pobrał produkt?'}
 ]},
 'axapta-dynamics-magazyn':{label:'Dynamics 365 Supply Chain Management',context:'Warehouse management → Setup → Mobile device',verified:true,items:[
  {tab:'Menu',path:'Warehouse management → Setup → Mobile device → Mobile device menu',purpose:'Definiuje, jakie zadania są widoczne na terminalu operatora.',fields:['Menu name','Menu structure','Available menu items'],exercise:'Dlaczego dwaj pracownicy mogą zobaczyć różne funkcje po zalogowaniu?'},
  {tab:'Menu items',path:'Warehouse management → Setup → Mobile device → Mobile device menu items',purpose:'Konfiguracja czynności takich jak receiving, picking i putaway.',fields:['Name','Title','Mode: Work / Indirect','Use existing work'],exercise:'Dla istniejącego zadania putaway wybierz Work z odpowiednią konfiguracją existing work.'},
  {tab:'Worker',path:'Warehouse management → Setup → Worker',purpose:'Przypisanie menu do konta pracownika.',fields:['Worker','User ID','Default menu'],exercise:'Sprawdź, gdzie ustala się, jakie opcje ma widzieć operator na skanerze.'},
  {tab:'Confirm',path:'Mobile device → Work confirmation setup',purpose:'Potwierdzanie produktu, ilości i lokacji po rzeczywistym ruchu.',fields:['Work type','Location confirmation','Quantity confirmation'],exercise:'Dlaczego warto wymagać skanu lokacji docelowej przed zakończeniem odłożenia?'}
 ]},
 'sap-ewm-magazyn':{label:'SAP Extended Warehouse Management',context:'SAP Fiori Launchpad / RF · zakres zależy od roli',verified:true,items:[
  {tab:'Fiori',path:'Launchpad → Extended Warehouse Management',purpose:'Dostęp do funkcji EWM jest powiązany z rolą.',fields:['Warehouse Monitor','Inbound','Outbound','Warehouse Tasks'],exercise:'Ustal, dlaczego nie każda rola widzi ten sam zestaw kafelków.'},
  {tab:'RF',path:'Execution → Test RF Environment',purpose:'Praca w środowisku RF z numerem magazynu, zasobem i urządzeniem.',fields:['Warehouse number','Resource','Presentation device'],exercise:'Które trzy dane trzeba ustalić przed pracą w szkoleniowym środowisku RF?'},
  {tab:'Query',path:'05 Internal Processes → 03 Query',purpose:'Zapytanie o HU, stan lub warehouse order.',fields:['01 HU Query','02 Stock Query','03 WO Query'],exercise:'Wskaż funkcję do sprawdzenia stanu w danej lokacji.'},
  {tab:'Stock',path:'03 Query → 02 Stock Query',purpose:'Podgląd zapasu według lokacji lub produktu.',fields:['01 By Storage Bin','02 By Product'],exercise:'Czym różni się pytanie o wszystkie produkty w bin od pytania o jeden produkt w wielu bin?'}
 ]},
 'oracle-wms-cloud':{label:'Oracle WMS Cloud',context:'UI menu oraz RF menu przypisane do grupy użytkowników',verified:true,items:[
  {tab:'UI menu',path:'Browser UI → ASN / Orders / Loads',purpose:'Karty i listy dokumentów dostępne według roli.',fields:['ASNs','Orders','Loads','Permissions'],exercise:'Dlaczego użytkownik może widzieć Orders, lecz nie edytować ich danych?'},
  {tab:'RF menu',path:'RF menu → Receiving / Putaway / Picking',purpose:'Transakcje wykonywane skanerem.',fields:['RF menu','Group','Permissions','Parameters'],exercise:'Sprawdź, w jaki sposób menu pracownika różni się od funkcji administratora.'},
  {tab:'Groups',path:'Users → Groups → UI Menu / RF Menu',purpose:'Grupa może wpływać na widoczne ekrany i operacje.',fields:['Group','Default group','UI menu','RF menu'],exercise:'Zalogowany operator nie ma RF Picking. Gdzie sprawdzisz przypisanie?'}
 ]},
 'infor-wms':{label:'Infor WMS',context:'Przepływ operacji · nazwy menu zależą od konfiguracji',verified:false,items:[
  {tab:'Owner',path:'Company / Warehouse / Owner',purpose:'Rozdzielenie towarów klientów 3PL.',fields:['Owner','SKU','Warehouse','Status'],exercise:'Dwie firmy używają SKU-15. Jak zapobiec pomieszaniu ich stanów?'},
  {tab:'Inbound',path:'ASN → Receiving → Directed putaway',purpose:'Od dokumentu dostawy do zarejestrowanej lokacji.',fields:['ASN','LPN','Lot','Location'],exercise:'Nie przyjmuj 10 kartonów, gdy fizycznie dostarczono 9.'},
  {tab:'Outbound',path:'Allocation → Picking → Packing',purpose:'Realizacja zamówienia z poprawnym przypisaniem towaru.',fields:['Order','Owner','Pick quantity','Pack status'],exercise:'Które pole musi pozostać zgodne z właścicielem towaru?'}
 ]},
 'manhattan-active-wms':{label:'Manhattan Active Warehouse Management',context:'Mapa procesów · rzeczywiste widoki zależą od wdrożenia',verified:false,items:[
  {tab:'Inventory',path:'Stock → Availability',purpose:'Rozróżnienie on-hand i available.',fields:['SKU','Location','On-hand','Reserved'],exercise:'Oblicz available z 100 szt., 20 reserved i 5 quality hold.'},
  {tab:'Tasks',path:'Work → Picking / Replenishment',purpose:'Zadania operatorów i uzupełnienia.',fields:['Work ID','Resource','Source','Destination'],exercise:'Co musi być potwierdzone fizycznie przed zamknięciem pracy?'},
  {tab:'Shipping',path:'Packing → Loading',purpose:'Kontrola kompletności i wydania.',fields:['Order','Carton','Carrier','Load'],exercise:'Dlaczego etykieta i rzeczywista zawartość muszą być powiązane?'}
 ]},
 'blue-yonder-wms':{label:'Blue Yonder WMS',context:'Mapa procesów · menu jest konfigurowalne',verified:false,items:[
  {tab:'Inbound',path:'Receiving → Quality → Putaway',purpose:'Zapis rzeczywistego przyjęcia i kontroli jakości.',fields:['ASN','SKU','Quality status','Location'],exercise:'Kiedy nie wolno włączyć dostawy do available?'},
  {tab:'Outbound',path:'Wave → Picking → Packing',purpose:'Grupowanie zleceń i ich fizyczne wykonanie.',fields:['Wave','Pick task','Carton','Shipment'],exercise:'Wyjaśnij, dlaczego wave nie oznacza jeszcze fizycznego pobrania.'},
  {tab:'Analytics',path:'Execution → Resource monitoring',purpose:'Obciążenia stanowisk i kolejność wykonania.',fields:['Queue','Resource','Task status','Exception'],exercise:'Co zrobić, gdy automatyka potwierdza timeout przy ruchu palety?'}
 ]},
 'astro-consafe-wms':{label:'Consafe Astro WMS',context:'Mapa procesów · nie jest kopią ekranów konkretnego klienta',verified:false,items:[
  {tab:'Receiving',path:'Goods receipt → HU',purpose:'Potwierdzenie przyjętych jednostek.',fields:['Article','HU','Actual quantity','Location'],exercise:'Dostawa 10 HU, ale fizycznie 9. Co zapisujesz?'},
  {tab:'Voice / RF',path:'Picking → Voice / RF',purpose:'Przydzielenie zadania i potwierdzenie lokacji.',fields:['Task ID','Location','Product','Quantity'],exercise:'Co zrobić, jeśli operator odczytuje inną lokację niż zadanie?'},
  {tab:'WES',path:'Execution → Equipment / Automation',purpose:'Koordynacja pracy ludzi i urządzeń.',fields:['Command ID','Resource','Status','Error'],exercise:'Dlaczego timeout nie upoważnia do ślepego powtórzenia ruchu?'}
 ]},
 'sap-tm-transport':{label:'SAP Transportation Management',context:'Widok zadań planowania · menu zależy od wersji SAP',verified:false,items:[
  {tab:'Freight',path:'Freight Units → Freight Orders',purpose:'Od zapotrzebowania do planu przewozu.',fields:['Freight unit','Freight order','Capacity','Stops'],exercise:'Dwa ładunki zajmują 11 i 9 m³. Czy pasują do auta 18 m³?'},
  {tab:'Plan',path:'Transportation Cockpit → Planning',purpose:'Przypisanie zasobu i planowanie trasy.',fields:['Carrier','Vehicle','ETA','Window'],exercise:'Jakie okno dostawy naruszy przejazd opóźniony o 45 minut?'},
  {tab:'Execute',path:'Execution → Events → Charges',purpose:'Zapis dostawy i rozliczenia.',fields:['Event','POD','Charges','Exception'],exercise:'Czym różni się szacowana data ETA od potwierdzenia POD?'}
 ]},
 'excel-skroty':{label:'Microsoft Excel',context:'Wstążka arkusza kalkulacyjnego',verified:true,items:[
  {tab:'Home',path:'Home → Number / Cells',purpose:'Format liczb, procentów i stylu komórek.',fields:['Number format','Percent','Insert cells','Sort'],exercise:'Dlaczego 0,25 wyświetlone jako 25% nie zmienia wartości liczbowej?'},
  {tab:'Formulas',path:'Formulas → Function Library',purpose:'Wstawianie i audyt formuł.',fields:['Insert Function','SUM','IF','Trace precedents'],exercise:'Oblicz =B2*C2 i sprawdź jednostki oraz źródło B2.'},
  {tab:'Data',path:'Data → Sort & Filter',purpose:'Odfiltrowanie i walidacja rekordów.',fields:['Filter','Sort','Data Validation','Get Data'],exercise:'Odróżnij filtrowanie od usuwania wierszy.'}
 ]},
 'word-skroty':{label:'Microsoft Word',context:'Wstążka edytora tekstu',verified:true,items:[
  {tab:'Home',path:'Home → Styles',purpose:'Nagłówki i style semantyczne.',fields:['Normal','Heading 1','Heading 2','Paragraph'],exercise:'Dlaczego pogrubienie tekstu nie zastępuje stylu nagłówka?'},
  {tab:'Layout',path:'Layout → Page Setup',purpose:'Marginesy, podziały i sekcje.',fields:['Margins','Orientation','Breaks','Indent'],exercise:'Zmień orientację wybranej sekcji, nie całego dokumentu.'},
  {tab:'Review',path:'Review → Track Changes',purpose:'Weryfikacja zmian i komentarze.',fields:['Track Changes','Comments','Accept','Reject'],exercise:'Odróżnij zaakceptowanie od ukrycia zmian.'}
 ]},
 'autocad-skroty':{label:'AutoCAD',context:'Wstążka CAD · układ zależy od workspace',verified:true,items:[
  {tab:'Home',path:'Home → Draw / Modify',purpose:'Linie, polilinie i geometria.',fields:['Line','Polyline','Circle','Offset'],exercise:'Zbuduj obrys prostokąta 180 × 40 mm, sprawdź jednostki.'},
  {tab:'Annotate',path:'Annotate → Dimensions',purpose:'Wymiarowanie i opisy.',fields:['Linear','Aligned','Text','Leader'],exercise:'Odczytaj wymiar z rysunku niezależnie od wielkości wydruku.'},
  {tab:'Output',path:'Output → Plot',purpose:'Arkusz i wydruk w odpowiedniej skali.',fields:['Page setup','Plot','PDF','Scale'],exercise:'Czym różni się skala modelu od skali wydruku?'}
 ]},
 'windows-skroty':{label:'Windows 11',context:'Menu Start, Ustawienia i Eksplorator plików',verified:true,items:[
  {tab:'Start',path:'Start → All apps / Search',purpose:'Uruchamianie narzędzi.',fields:['Search','Pinned','All apps','Settings'],exercise:'Znajdź Eksplorator bez otwierania pliku z nieznanego źródła.'},
  {tab:'Explorer',path:'File Explorer → Home / This PC',purpose:'Praca na folderach i ścieżkach.',fields:['Address bar','New','Copy','Paste'],exercise:'Rozróżnij skrót pulpitu od kopii prawdziwego pliku.'},
  {tab:'Settings',path:'Settings → Accounts / System',purpose:'Uprawnienia i preferencje.',fields:['System','Accounts','Privacy & security'],exercise:'Dlaczego nie należy zmieniać uprawnień konta bez potrzeby?'}
 ]}
};

export const hasSoftwareMenuLab=(slug:string)=>Object.prototype.hasOwnProperty.call(modules,slug);
export default function SoftwareMenuLab({slug}:{slug:string}){
 const m=modules[slug];const [selected,setSelected]=useState(0);
 useEffect(()=>setSelected(0),[slug]);if(!m)return null;
 const v=m.items[Math.min(selected,m.items.length-1)];
 return <View style={{marginBottom:18,borderRadius:16,borderWidth:1,borderColor:'#d2e0d4',backgroundColor:'#fff',overflow:'hidden'}}>
  <View style={{padding:14,backgroundColor:'#e7f0e5',gap:4}}>
   <Text style={{fontWeight:'900',fontSize:18,color:'#1b4530'}}>Poznaj menu: {m.label}</Text>
   <Text style={{color:'#4b6555',fontSize:12,lineHeight:18}}>{m.context}</Text>
  </View>
  <View style={{backgroundColor:'#263d34',padding:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
   <Text style={{color:'white',fontSize:12,fontWeight:'800'}}>{m.label}</Text>
   <Text style={{color:'#d5e6dc',fontSize:11}}>☰  ·  ◉</Text>
  </View>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{backgroundColor:'#f5f7f2'}} contentContainerStyle={{gap:7,padding:10}}>
   {m.items.map((x,i)=><Pressable key={x.tab} accessibilityRole="button" accessibilityLabel={'Otwórz zakładkę '+x.tab} onPress={()=>setSelected(i)}
     style={{paddingHorizontal:13,paddingVertical:10,borderRadius:8,borderWidth:1,borderColor:selected===i?'#668c72':'#d4dfd3',backgroundColor:selected===i?'#e2f2de':'#fff'}}>
    <Text style={{fontSize:13,fontWeight:'800',color:'#234733'}}>{x.tab}</Text>
   </Pressable>)}
  </ScrollView>
  <View style={{padding:15,gap:11}}>
   <Text style={{fontWeight:'900',color:'#214c34',fontSize:15}}>{v.path}</Text>
   <Text style={{color:'#365947',fontSize:14,lineHeight:22}}>{v.purpose}</Text>
   <View style={{backgroundColor:'#f0f5ec',borderRadius:10,padding:10,gap:7}}>
    <Text style={{color:'#56705b',fontSize:11,fontWeight:'900'}}>POLA I ELEMENTY EKRANU</Text>
    <View style={{flexDirection:'row',gap:6,flexWrap:'wrap'}}>{v.fields.map((label,i)=><View key={label+'-'+i} style={{backgroundColor:'#fff',borderColor:'#d9e5d6',borderWidth:1,paddingHorizontal:8,paddingVertical:7,borderRadius:7}}><Text style={{color:'#315c41',fontSize:12}}>{label}</Text></View>)}</View>
   </View>
   <View style={{borderLeftWidth:3,borderLeftColor:'#74a17c',paddingLeft:11,gap:4}}>
    <Text style={{fontSize:11,color:'#416a4d',fontWeight:'900'}}>SPRÓBUJ SAMODZIELNIE</Text>
    <Text style={{color:'#264b35',fontSize:14,lineHeight:22}}>{v.exercise}</Text>
   </View>
   <Text style={{fontSize:11,color:'#6a796b',lineHeight:16}}>{m.verified?'Układ i nazwy oparte na dokumentacji; dostęp zależy od wersji i uprawnień.':'Przykładowa nawigacja procesowa; konkretne menu zależy od wdrożenia.'}</Text>
  </View>
 </View>;
}
