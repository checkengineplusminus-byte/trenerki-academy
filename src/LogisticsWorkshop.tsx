import React,{useMemo,useState} from 'react';
import {View,Text,Pressable} from 'react-native';
const ink='#173e2c',soft='#e9f2e4';
type GlossaryEntry={term:string;meaning:string};
type Config={name:string;module:string;unit:string;inbound:string;storage:string;picking:string;outbound:string;special:GlossaryEntry[]};
const systems:Record<string,Config>={
 'axapta-dynamics-magazyn':{name:'Dynamics AX / D365 SCM',module:'Warehouse Management',unit:'License plate',inbound:'Purchase order / Receiving',storage:'Location directive / Putaway',picking:'Work / Picking',outbound:'Shipment / Loading',
  special:[{term:'Axapta',meaning:'Historyczna potoczna nazwa rodziny Microsoft Dynamics AX; nie oznacza identycznego interfejsu w D365.'},{term:'Released product',meaning:'Produkt udostępniony w odpowiedniej firmie do operacji ERP.'},{term:'Location directive',meaning:'Zasada wybierania adresu pobrania lub odłożenia w D365 WMS.'},{term:'Work template',meaning:'Konfiguracja kolejnych etapów pracy, np. Pick i Put.'},{term:'Wave',meaning:'Proces grupowania pracy związanej z wydaniem lub innymi operacjami magazynowymi.'}]},
 'sap-ewm-magazyn':{name:'SAP Extended Warehouse Management',module:'Warehouse Monitor / RF',unit:'Handling Unit (HU)',inbound:'Inbound Delivery / GR',storage:'Warehouse Task / Putaway',picking:'Warehouse Order / Picking',outbound:'Outbound Delivery / Goods Issue',
  special:[{term:'Handling Unit (HU)',meaning:'Zidentyfikowane opakowanie lub nośnik logistyczny wraz z zawartością.'},{term:'Warehouse Task (WT)',meaning:'Konkretny ruch lub zadanie w magazynie.'},{term:'Warehouse Order (WO)',meaning:'Zestaw zadań WT do realizacji.'},{term:'Storage Type',meaning:'Rodzaj strefy magazynu, np. obszar kompletacji.'},{term:'Goods Issue',meaning:'Potwierdzenie wydania towaru w odpowiednim procesie.'}]},
 'oracle-wms-cloud':{name:'Oracle WMS Cloud',module:'WMS Cloud / RF',unit:'LPN',inbound:'ASN / Receiving',storage:'Directed Putaway',picking:'Wave / Picking',outbound:'Packing / Shipping',
  special:[{term:'LPN',meaning:'License Plate Number – identyfikator jednostki logistycznej w magazynie.'},{term:'ASN',meaning:'Advanced Shipment Notice – wcześniejsze powiadomienie o dostawie.'},{term:'Facility',meaning:'Obiekt magazynowy obsługiwany przez WMS.'},{term:'Wave template',meaning:'Zasady wybierania zleceń do procesu realizacji.'},{term:'Allocation',meaning:'Przypisanie dostępnego zapasu do zamówienia.'}]},
 'manhattan-active-wms':{name:'Manhattan Active Warehouse Management',module:'Warehouse Execution',unit:'LPN',inbound:'Receiving / Inbound',storage:'Slotting / Putaway',picking:'Waving / Picking',outbound:'Yard / Loading',
  special:[{term:'Labor Management',meaning:'Planowanie, rozdzielanie i analiza efektywności pracy.'},{term:'Yard',meaning:'Plac logistyczny, przyjazdy samochodów oraz przydzielanie doków.'},{term:'Slotting',meaning:'Przypisywanie artykułów do lokalizacji według rotacji i ograniczeń.'},{term:'Waving',meaning:'Grupowanie zamówień do wykonania.'}]},
 'blue-yonder-wms':{name:'Blue Yonder WMS',module:'Warehouse Operations',unit:'LPN / Container',inbound:'ASN / Receiving',storage:'Putaway / Slotting',picking:'Directed Picking',outbound:'Packing / Shipping',
  special:[{term:'WES',meaning:'Warehouse Execution System – koordynuje wykonanie zadań przez ludzi i automatykę.'},{term:'Robotics Hub',meaning:'Warstwa integracji różnych systemów robotycznych; funkcje zależą od produktu.'},{term:'System-directed Picking',meaning:'Kompletacja sterowana kolejnymi zadaniami WMS.'},{term:'Load Building',meaning:'Planowanie konfiguracji i kolejności załadunku.'}]},
 'infor-wms':{name:'Infor WMS',module:'Warehouse Management',unit:'LPN',inbound:'ASN / Receipt',storage:'Directed Putaway',picking:'Wave / Picking',outbound:'Outbound / Shipping',
  special:[{term:'Goods Owner',meaning:'Właściciel zapasu w systemie, istotny w magazynach 3PL.'},{term:'Cross-docking',meaning:'Przepływ z przyjęcia do wysyłki bez długiego składowania.'},{term:'Kitting',meaning:'Kompletowanie zestawu z kilku artykułów.'},{term:'VAS',meaning:'Value Added Services – dodatkowe operacje, np. etykietowanie.'}]},
 'ongoing-wms':{name:'Ongoing WMS',module:'Warehouse / Scanner',unit:'Goods Owner / Pallet ID',inbound:'In Order',storage:'Locations / Putaway',picking:'Out Order / Picking',outbound:'Shipping / Carrier',
  special:[{term:'Goods Owner',meaning:'Klient, do którego przypisany jest towar; nie wolno mieszać zapasu różnych firm.'},{term:'In Order',meaning:'Zlecenie przyjęcia do magazynu.'},{term:'Out Order',meaning:'Zlecenie wyjścia towaru z magazynu.'},{term:'3PL',meaning:'Third Party Logistics – firma logistyczna obsługująca zapas innych firm.'},{term:'Carrier Integration',meaning:'Przekazanie statusów i etykiet do systemu przewoźnika.'}]},
 'astro-consafe-wms':{name:'Consafe Astro WMS',module:'Astro Warehouse Operations',unit:'HU / Container',inbound:'Goods Receipt',storage:'Directed Putaway',picking:'Voice / RF Picking',outbound:'Shipping / WES',
  special:[{term:'WES',meaning:'Steruje kolejnością operacji i koordynacją automatyki.'},{term:'Voice Picking',meaning:'Wykonywanie czynności na podstawie komunikatów głosowych z potwierdzeniem.'},{term:'Digital Twin',meaning:'Cyfrowy model wspomagający analizę rzeczywistego przepływu towaru.'},{term:'Smart Box',meaning:'Techniki doboru opakowania w celu ograniczenia pustej przestrzeni.'}]},
 'sap-tm-transport':{name:'SAP Transportation Management',module:'Transport Cockpit',unit:'Freight Unit (FU)',inbound:'Freight Unit / Order',storage:'Planning / Route',picking:'Carrier Tendering',outbound:'Freight Order / Execution',
  special:[{term:'Freight Unit',meaning:'Wymaganie transportowe zawierające ładunek i parametry dostawy.'},{term:'Freight Order',meaning:'Zorganizowane zlecenie przewozowe z trasą i wykonawcą.'},{term:'Tendering',meaning:'Uzyskanie i ocena ofert przewoźników.'},{term:'POD',meaning:'Proof of Delivery – potwierdzenie dostawy.'},{term:'ETA',meaning:'Estimated Time of Arrival – przewidywany czas przyjazdu.'}]}
};
export const isLogisticsCourse=(slug:string)=>Object.prototype.hasOwnProperty.call(systems,slug);
const basics:GlossaryEntry[]=[
 {term:'ERP',meaning:'Enterprise Resource Planning – połączony system zarządzania procesami firmy, np. zamówieniami, księgowością i zapasem.'},
 {term:'WMS',meaning:'Warehouse Management System – zarządzanie pracą magazynu, zapasem i ruchem produktów.'},
 {term:'TMS',meaning:'Transportation Management System – planowanie i obsługa przewozów poza magazynem.'},
 {term:'SKU',meaning:'Unikatowy kod artykułu w danej bazie; dwie podobne nazwy nie muszą oznaczać tego samego SKU.'},
 {term:'UOM',meaning:'Unit of Measure – jednostka miary, np. sztuka, karton, paleta. Musi być zgodna z przelicznikiem.'},
 {term:'ASN',meaning:'Awizo dostawy. Informuje, co według nadawcy ma przyjechać; fizyczna ilość wymaga sprawdzenia.'},
 {term:'Receiving',meaning:'Przyjęcie faktycznie otrzymanego towaru i dokumentacja ewentualnych braków.'},
 {term:'Putaway',meaning:'Odłożenie przyjętego produktu do konkretnego adresu, z potwierdzeniem lokalizacji.'},
 {term:'Picking',meaning:'Pobranie produktów z magazynu do konkretnego zamówienia.'},
 {term:'Packing',meaning:'Kontrola i pakowanie skompletowanego zamówienia do wysyłki.'},
 {term:'On-hand',meaning:'Fizyczny stan zarejestrowany w systemie; nie zawsze jest równy ilości dostępnej.'},
 {term:'Reserved',meaning:'Zapas przypisany do zamówienia albo innego celu, zwykle niedostępny dla pozostałych zleceń.'},
 {term:'Cycle Count',meaning:'Częściowe liczenie magazynu w celu porównania zapisu systemowego z rzeczywistością.'},
 {term:'FEFO',meaning:'First Expired, First Out – pobieranie partii z wcześniejszą datą ważności, jeśli pozwalają na to status i reguły.'}
];
export function LogisticsAtlas({slug}:{slug:string}){
 const config=systems[slug],list=useMemo(()=>config?[...config.special,...basics]:[],[slug]);
 const [selected,setSelected]=useState(0),[all,setAll]=useState(false);
 if(!config)return null;
 return <View style={{backgroundColor:'#ecf5e8',borderColor:'#cfdfcb',borderWidth:1,borderRadius:16,padding:18,gap:12,marginBottom:18}}>
  <Text style={{fontWeight:'900',color:ink,fontSize:20}}>Mapa programu i encyklopedia logistyki</Text>
  <Text style={{color:'#526c5b',fontSize:14,lineHeight:23}}>Najpierw poznaj pojęcia i kolejność operacji. Układ menu może się różnić między wersjami {config.name}.</Text>
  <View style={{borderColor:'#cddacb',borderWidth:1,borderRadius:12,overflow:'hidden'}}>
   <View style={{backgroundColor:'#203d31',padding:13,flexDirection:'row',justifyContent:'space-between'}}>
    <Text style={{fontSize:12,color:'white',fontWeight:'900'}}>{config.name}</Text><Text style={{fontSize:12,color:'#cee2d0'}}>▣  ◻  ×</Text>
   </View>
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:7,backgroundColor:'#dce8db',padding:10}}>
    {[config.module,'Inventory','Orders','Tasks','Reports'].map(x=><Text key={x} style={{color:ink,fontWeight:'800',fontSize:11,padding:6,backgroundColor:'white',borderRadius:6}}>{x}</Text>)}
   </View>
   <View style={{backgroundColor:'white',padding:13,gap:9}}>
    <Text style={{fontSize:12,color:'#3c6650',fontWeight:'900'}}>NAUKOWA MAPA PRZEPŁYWU</Text>
    {[config.inbound,config.storage,config.picking,config.outbound].map((name,i)=><View key={i} style={{flexDirection:'row',alignItems:'center',gap:8}}>
     <View style={{backgroundColor:'#e4f1df',borderRadius:6,width:24,height:24,alignItems:'center',justifyContent:'center'}}><Text style={{fontWeight:'900',color:ink}}>{i+1}</Text></View>
     <Text style={{fontSize:13,color:ink,flex:1}}>{name}</Text>
    </View>)}
   </View>
  </View>
  <Text style={{fontWeight:'900',color:ink,fontSize:16}}>Słownik pojęć — dotknij hasło</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{list.slice(0,all?list.length:9).map((item,i)=><Pressable key={item.term+'-'+i} onPress={()=>setSelected(i)} style={{paddingHorizontal:10,paddingVertical:8,borderRadius:9,backgroundColor:selected===i?'#d0e7c6':'white',borderColor:'#ccdec6',borderWidth:1}}><Text style={{color:ink,fontWeight:'800',fontSize:12}}>{item.term}</Text></Pressable>)}</View>
  {!!list[selected]&&<View style={{backgroundColor:'white',padding:14,borderRadius:10,gap:5}}><Text style={{color:ink,fontWeight:'900',fontSize:16}}>{list[selected].term}</Text><Text style={{color:'#476450',lineHeight:23}}>{list[selected].meaning}</Text></View>}
  <Pressable onPress={()=>setAll(x=>!x)}><Text style={{color:'#276c45',fontWeight:'900'}}>{all?'Pokaż mniej':'Otwórz całą encyklopedię ('+list.length+' pojęć)'}</Text></Pressable>
 </View>;
}
const scenario=[
 {title:'1. Przyjęcie dostawy',info:'Dokument zapowiada 10 sztuk. Fizycznie na rampie jest 9. Co wpiszesz do WMS?',
  options:['Przyjmuję 10, bo tak jest w dokumencie','Rejestruję 9 i zapisuję brak jednej sztuki','Od razu potwierdzam wysyłkę'],
  correct:1,after:'Przyjęto 9 rzeczywistych sztuk. Odnotowano brak 1. Zapas: 9.'},
 {title:'2. Putaway i lokalizacja',info:'9 sztuk są na rampie A-00. WMS wskazuje prawidłowy regał B-12. Co robisz?',
  options:['Odkładam towar na B-12 i skanuję tę lokację','Wpisuję dowolny wolny regał z pamięci','Kasuję dokument przyjęcia'],correct:0,after:'Potwierdzono fizyczne odłożenie na B-12. Stan: 9.'},
 {title:'3. Rezerwacja i picking',info:'Masz 9 sztuk, z czego 2 są zablokowane. Zamówienie wymaga 6. Co oznacza to dla wydania?',
  options:['Zapas dostępny wynosi 9, więc wydaję 9','Towaru jest za mało, bo 9–2–6=1','Dostępnych jest 7; pobieram 6 i zostaje 1 dostępna'],correct:2,after:'Pobrano 6, do wysyłki przygotowano 6. Zostały 3 sztuki, w tym 2 zablokowane.'},
 {title:'4. Pakowanie i kontrola',info:'Dla 6 sztuk tylko 5 ma już poprawną etykietę i potwierdzone pakowanie. Czy kończysz shipment?',
  options:['Wysyłam 6 i nie sprawdzam','Wstrzymuję wydanie do oznaczenia ostatniej sztuki','Potwierdzam brakującą etykietę bez wykonania pracy'],correct:1,after:'Wydanie wstrzymane do poprawnego pakowania wszystkich 6 sztuk.'},
 {title:'5. Zakończenie wysyłki',info:'Wszystkie 6 sztuk spakowano, numery etykiet są zgodne, a przewoźnik ma właściwe dokumenty.',
  options:['Potwierdzam 6 sztuk i zapisuję zdarzenie wydania','Wpisuję do wydania 9 sztuk, bo tyle było przyjętych','Usuwam historię przyjęcia'],correct:0,after:'Wydano 6 sztuk. Stan magazynu: 3 sztuki (w tym 2 zablokowane).'}
];
const transportScenario=[
 {title:'1. Freight Unit — sprawdź ładunek',info:'Masz trzy palety po 400 kg. Dostępny pojazd zabiera maksymalnie 1000 kg ładunku. Czy możesz skierować wszystkie trzy palety jednym przejazdem?',
  options:['Tak, ponieważ trzy palety nie przekraczają czterech sztuk','Nie. Ładunek waży 1200 kg i przekracza limit 1000 kg o 200 kg','Tak, jeśli kierowca jedzie ostrożnie'],
  correct:1,after:'Łącznie 1200 kg; o 200 kg za dużo. Potrzebujesz odpowiedniej pojemności lub planu podziału.'},
 {title:'2. Freight Order — policz czas',info:'Pierwsza dostawa zaczyna się o 09:15. Rozładunek trwa 30 min, a przejazd do drugiego klienta 35 min. Drugi klient przyjmuje od 10:30. Co zaplanujesz?',
  options:['Przyjazd o 10:20 i oczekiwanie do okna 10:30','Przyjazd o 09:50 bez liczenia przejazdu','Potwierdzenie dostawy o 09:15 dla obu klientów'],
  correct:0,after:'09:15 + 30 + 35 = 10:20. Okno drugiego klienta zaczyna się o 10:30; plan przewiduje 10 min oczekiwania.'},
 {title:'3. Capacity — objętość też się liczy',info:'Zlecenia zajmują 11 m³ i 9 m³. Pojazd ma 18 m³ użytecznej pojemności. Czy można połączyć oba ładunki?',
  options:['Tak, ponieważ oba ważą mniej niż tonę','Tak, po wpisaniu 18 zamiast 20 w systemie','Nie: 11 + 9 = 20 m³, czyli przekroczenie o 2 m³'],
  correct:2,after:'Suma 20 m³ przekracza limit 18 m³. Łączenie wymaga innego zasobu lub zmiany planu.'},
 {title:'4. Carrier tendering — wybór oferty',info:'Przewoźnik A jest tańszy, lecz nie potwierdził chłodni. B jest droższy, ma potwierdzoną temperaturę przewozu i dostępne okno. Towar wymaga chłodni.',
  options:['Wybrać A tylko na podstawie najniższej ceny','Wybrać ofertę spełniającą wymagania przewozu; potwierdzić warunki u B','Zrezygnować z kontroli temperatury, by zmieścić się w budżecie'],
  correct:1,after:'Wybór musi respektować warunki przewozu, nawet jeśli cena nie jest najniższa.'},
 {title:'5. Tracking — nowy czas dostawy',info:'W trakcie realizacji pojazd ma opóźnienie 45 min. Drugie okno dostawy może zostać przekroczone. Jaki ślad pozostawisz w TM?',
  options:['Zmienię datę w historii tak, aby wyglądała na zgodną','Nie zgłoszę nic do chwili wystawienia faktury','Zapiszę zdarzenie, przeliczę ETA i przekażę aktualizację odpowiednim osobom'],
  correct:2,after:'Opóźnienie jest udokumentowane, ETA przeliczone, klient lub dyspozytor otrzymuje aktualizację.'}
];
export function LogisticsWorkshop({slug,lessonNo}:{slug:string;lessonNo:number}){
 const cfg=systems[slug],[step,setStep]=useState(0),[mistakes,setMistakes]=useState(0),[log,setLog]=useState<string[]>([]),[feedback,setFeedback]=useState('');
 if(!cfg)return null;
 const isTransport=slug==='sap-tm-transport';
 const currentScenario=isTransport?transportScenario:scenario;
 const stage=currentScenario[step];
 function choose(index:number){if(!stage)return;
  if(index!==stage.correct){setMistakes(n=>n+1);setFeedback('Ten ruch byłby błędny. Rzeczywisty stan, dokument i zatwierdzenie muszą odpowiadać sobie. Zastanów się, co magazyn rzeczywiście zrobił.');return;}
  setLog(old=>[...old,stage.after]);setStep(n=>n+1);setFeedback(stage.after);
 }
 return <View style={{marginVertical:19,borderWidth:1,borderColor:'#c9dbca',backgroundColor:'#fff',padding:17,borderRadius:17,gap:13}}>
  <Text style={{color:'#4e7854',fontWeight:'900',fontSize:12}}>{isTransport?'WARSZTAT TRANSPORTOWY':'WARSZTAT MAGAZYNOWY'} · LEKCJA {lessonNo+1} · DANE ĆWICZENIOWE</Text>
  <Text style={{color:ink,fontWeight:'900',fontSize:20}}>{isTransport?'Od zamówienia do dostawy — plan przewozu':'Od dostawy do wysyłki — praktyczna symulacja'}</Text>
  <Text style={{color:'#607263',lineHeight:23}}>{isTransport?'Planujesz ładunki, trasę i przewoźnika w scenariuszu z ograniczeniami masy, objętości oraz czasu.':'Pracujesz na przykładzie 10 sztuk. Każda dobra decyzja zmienia widoczny stan magazynu.'} To ćwiczenie, nie połączenie z systemem producenta.</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{(isTransport?['Freight Unit','Freight Order','Carrier','Execution']:[cfg.inbound,cfg.storage,cfg.picking,cfg.outbound]).map((v,i)=><View key={i} style={{backgroundColor:i<=step?'#e1f1dc':'#f4f5f0',borderRadius:8,padding:8}}><Text style={{fontSize:11,color:ink,fontWeight:'800'}}>{v}</Text></View>)}</View>
  <View style={{backgroundColor:'#f0f6ed',padding:13,borderRadius:11,flexDirection:'row',justifyContent:'space-between'}}>
   <Text style={{color:ink,fontWeight:'800'}}>Krok {Math.min(step+1,5)} z 5</Text><Text style={{color:'#5b735c',fontWeight:'800'}}>Pomylone decyzje: {mistakes}</Text>
  </View>
  {stage?<View style={{gap:10}}>
   <Text style={{color:ink,fontWeight:'900',fontSize:17}}>{stage.title}</Text>
   <Text style={{color:'#4c6350',lineHeight:23}}>{stage.info}</Text>
   {stage.options.map((option,i)=><Pressable key={i} onPress={()=>choose(i)} style={{padding:14,backgroundColor:'#f1f5ed',borderRadius:10,borderWidth:1,borderColor:'#dce8d6'}}>
    <Text style={{color:ink,fontWeight:'800',lineHeight:21}}>{String.fromCharCode(65+i)}. {option}</Text>
   </Pressable>)}
  </View>:<View style={{padding:15,backgroundColor:'#dfefd7',borderRadius:11,gap:5}}>
   <Text style={{fontSize:18,fontWeight:'900',color:ink}}>Przepływ zakończony ✓</Text>
   <Text style={{color:ink,lineHeight:23}}>{isTransport?'Potrafisz powiązać ładunek, planowaną trasę, ograniczenia pojazdu, wybór przewoźnika i aktualizację ETA.':'Dokument, faktyczny stan, lokacja i status wysyłki muszą być zgodne. Wróć do lekcji i sprawdź nazwy operacji w swoim systemie.'}</Text>
  </View>}
  {!!feedback&&<Text style={{padding:12,backgroundColor:'#e9f4e4',borderRadius:9,color:ink,fontWeight:'700',lineHeight:21}}>{feedback}</Text>}
  {!!log.length&&<View style={{gap:6}}><Text style={{fontWeight:'900',color:ink}}>Historia poprawnych operacji</Text>{log.map((x,i)=><Text key={i} style={{color:'#58725e',fontSize:12,lineHeight:18}}>{i+1}. {x}</Text>)}</View>}
  {step===5&&<Pressable onPress={()=>{setStep(0);setMistakes(0);setFeedback('');setLog([])}} style={{padding:12,backgroundColor:soft,borderRadius:10}}><Text style={{color:ink,fontWeight:'900',textAlign:'center'}}>Zacznij nowy przebieg</Text></Pressable>}
 </View>;
}
