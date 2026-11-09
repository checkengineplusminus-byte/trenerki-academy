-- Trenerki Academy: substantive WMS/TM lesson-depth expansion.
-- Content is educational and remains review_needed. No learner progress or payments are touched.
with classified as (
 select l.course_slug,l.lesson_no,l.title_pl,l.material,
 case
 when l.title_pl ~* '(SKU|item number|article|towar i numer|jednostk|UOM|kartoteka|product master|wymiar magazynow)' then 0
when l.title_pl ~* '(owner|3PL|company|firma,|facility|storage type|warehouse number|stref|lokacj|location|storage bin)' then 1
when l.title_pl ~* '(ASN|inbound|przyję|dostaw|receiv|purchase order|goods receipt)' then 2
when l.title_pl ~* '(HU|LPN|license plate|nośnik|palet|kody kresk)' then 3
when l.title_pl ~* '(on-hand|available|reserved|rezerwac|allocation|alokac|inventory status|zapas|stany|pickabil|quality hold)' then 4
when l.title_pl ~* '(putaway|odkład|work template|location directive|internal movement|transfer|przenoszen|replenish|uzupełnian)' then 5
when l.title_pl ~* '(pick|kompletac|warehouse task|warehouse order|release to warehouse|pobra)' then 6
when l.title_pl ~* '(wave|batch|zone|sortowan|consolidation)' then 7
when l.title_pl ~* '(pack|kitting|etykiet|smart box|manifest)' then 8
when l.title_pl ~* '(loading|shipping|wydani|goods issue|carrier|kurier|nShift|dispatch|yard|dock door)' then 9
when l.title_pl ~* '(returns|RMA|zwrot|quality|kontrola jakości)' then 10
when l.title_pl ~* '(cycle count|inwentaryzac|stocktaking|physical inventory|korekt|rozbieżnoś|audit trace)' then 11
when l.title_pl ~* '(lot|batch|traceability|serial|FEFO|FIFO|cold chain|dangerous)' then 12
when l.title_pl ~* '(automation|automatyka|WES|robot|AutoStore|resource prediction|digital twin|AI |labor|KPI|SLA|forecast|plan awaryj|awaria)' then 13
when l.title_pl ~* '(freight|transport|tender|trasa|stop|cargo|ETA|nośnoś|objętoś|waga|capacity|planning|okna dostaw|carrier)' then 14
when l.title_pl ~* '(AI |analytics|forecast|slotting|rotac|optimization|labour|resource|planning|workforce)' then 15
 else 99 end kind
 from public.ta_lessons l where l.course_slug in ('astro-consafe-wms','axapta-dynamics-magazyn','blue-yonder-wms','infor-wms','manhattan-active-wms','ongoing-wms','oracle-wms-cloud','sap-ewm-magazyn','sap-tm-transport')
), drafted as (
 select course_slug,lesson_no,
 jsonb_build_array(
 jsonb_build_object('heading','Co oznacza: '||title_pl,
  'text',coalesce(material->'learning'->>'intro','')||' '||
  case kind when 0 then 'SKU identyfikuje wariant artykułu, jednostka bazowa opisuje sztuki, kilogramy albo metry, a jednostka opakowania może oznaczać karton lub paletę. Bez przelicznika liczba kartonów nie jest liczbą sztuk.'
when 1 then 'Warehouse number, strefa (storage type) i adres lokacji (storage bin) odpowiadają różnym poziomom ewidencji. W 3PL stany odrębnych właścicieli towarów nie mogą być automatycznie łączone nawet dla tego samego SKU.'
when 2 then 'Zamówienie zakupu, awizacja ASN i rzeczywisty odbiór opisują różne momenty. ASN zapowiada towar, lecz stan można poprawnie potwierdzić dopiero po fizycznej kontroli ilości i jakości.'
when 3 then 'HU lub LPN oznacza pojemnik lub jednostkę logistyczną, a SKU konkretny produkt. Jeden nośnik może mieć kilka artykułów i partii; identyfikatora palety nie wolno używać zamiast kodu produktu.'
when 4 then 'Fizyczne on-hand nie jest tym samym co available. Rezerwacje, blokady jakości, przypisanie do właściciela i ograniczenia partii decydują o tym, czy towar wolno wydać.'
when 5 then 'Putaway odróżnia się od odbioru: to przemieszczenie z rampy do właściwego miejsca. Replenishment to osobny proces uzupełniania lokalizacji pickingu z rezerwy. Zadanie ruchu powinno opisywać źródło i cel.'
when 6 then 'Picking jest fizycznym pobraniem artykułu pod zamówienie. Alokacja wskazuje lub rezerwuje towar wcześniej; samo przydzielenie nie jest potwierdzeniem pobrania. Warehouse task określa operację, którą trzeba rozliczyć.'
when 7 then 'Wave, batch i zone picking to różne sposoby organizacji prac. Grupowanie może skrócić przejścia magazynowe, ale wymaga późniejszego poprawnego przypisania pozycji do klienta i zamówienia.'
when 8 then 'Pobranie, zapakowanie i wydanie to odrębne zdarzenia. Pakowanie wymaga zgodności SKU i liczby sztuk, ochrony produktu, etykiety odbiorcy oraz powiązania numeru paczki z zamówieniem.'
when 9 then 'Przygotowanie do wysyłki, załadunek i potwierdzenie wydania są oddzielnymi momentami. Zapis wydania powinien odzwierciedlać towar rzeczywiście przekazany, przewoźnika i dokumenty, a nie tylko zaplanowaną trasę.'
when 10 then 'Zwrot nie jest automatycznie ponownym przyjęciem do zapasu dostępnego do sprzedaży. Towar może wymagać kontroli, naprawy, odseparowania albo utylizacji. Decyzję trzeba powiązać ze zleceniem i identyfikatorem partii.'
when 11 then 'Cycle count polega na okresowym liczeniu wybranych stanów. Korekta księgowa nie jest analizą przyczyny; błąd może wynikać ze złego UOM, lokacji, niepotwierdzonego ruchu lub rzeczywistego ubytku.'
when 12 then 'Partia identyfikuje grupę produktów, numer seryjny może identyfikować pojedynczy egzemplarz. FEFO oznacza wydanie według najbliższego terminu ważności, a FIFO według kolejności przyjęcia, o ile spełnione są ograniczenia jakości i prawa.'
when 13 then 'System może utworzyć polecenie, wysłać je do urządzenia, a później otrzymać potwierdzenie. Są to różne statusy. KPI musi mieć jednostkę i okres odniesienia, a prognoza AI wymaga weryfikacji z rzeczywistymi danymi i ograniczeniami pracy.'
when 14 then 'Freight unit opisuje potrzebę przewozu, freight order jest dokumentem wykonania planu. Masa, objętość, gabaryty, liczba stopów, okna czasowe i wymagania przewozowe są niezależnymi ograniczeniami.'
when 15 then 'Optymalizacja magazynowa działa pod ograniczeniami: pojemność, bezpieczeństwo, dostępność nośników i okna pracy. Wynik analityczny bez porównywalnej definicji jednostek nie daje podstawy do decyzji.' else 'Operacja musi mieć identyfikator obiektu, jednostkę miary, rzeczywistą ilość, status i ślad audytu. Przed podjęciem działania trzeba odróżnić dokument od fizycznego ruchu.' end),
 jsonb_build_object('heading','Proces i kontrola danych',
  'text',case kind when 0 then 'Odczytaj identyfikator SKU, jednostkę bazową, zawartość opakowania oraz wymagany format dokumentu. Przelicz ilości przed zapisem i sprawdź, czy katalog produktu odpowiada skanowanej etykiecie.'
when 1 then 'Zmapuj właściciela towaru, magazyn, strefę i dokładny adres. Sprawdź limit masy i gabaryty lokacji, status produktu i czy pracownik ma prawo wykonać dany ruch.'
when 2 then 'Porównaj dokument i identyfikatory, przelicz fizyczną ilość, rozdziel braki od uszkodzeń i dopiero potem zarejestruj właściwy status. Nie uznawaj palety za odłożoną tylko dlatego, że została przyjęta na rampę.'
when 3 then 'Odczytaj numer nośnika, jego zawartość, ilości, lokację i status. Przy przepakowaniu zapisz relację starego i nowego nośnika. W RF sprawdź, jakiego identyfikatora wymaga ekran.'
when 4 then 'Zbierz stan fizyczny, ilość zarezerwowaną i zablokowaną. Jeżeli te kategorie się nie nakładają, dostępny zapas można wyliczyć przez odjęcie obydwu od on-hand. Sprawdź też lokalizację i jednostkę miary.'
when 5 then 'Zweryfikuj lokalizację źródłową i docelową, masę, gabaryty, dostępność miejsca i status nośnika. Wykonaj ruch, po czym potwierdź faktyczny adres; zgłoś wyjątek, jeśli lokacja jest niewłaściwa.'
when 6 then 'Zidentyfikuj zlecenie, lokację, SKU, partię i ilość. Skanuj to, o co pyta proces, potwierdź faktycznie pobraną ilość, a przy niedoborze utwórz zgłoszenie rozbieżności zamiast ukrywać problem.'
when 7 then 'Porównaj liczbę przejść w kompletacji pojedynczej i zbiorczej, zaprojektuj punkt sortowania, a następnie potwierdź tożsamość zamówienia i każdej pozycji po rozdziale.'
when 8 then 'Porównaj fizyczną zawartość z listą, dobierz odpowiednie opakowanie, potwierdź etykietę oraz masę i wymiar, a dopiero potem zamknij paczkę w systemie.'
when 9 then 'Sprawdź bramę, pojazd, numer wysyłki i kompletność nośników. Udokumentuj czas, ilość, odbiorcę oraz wyjątki. Nie księguj towaru jako wydanego, dopóki nie osiągnięto właściwego etapu procesu.'
when 10 then 'Po przyjęciu dokumentu RMA skontroluj produkt i stan fizyczny, przypisz status oraz zapisz podstawę decyzji. Zapas uszkodzony musi pozostać oddzielony od towaru pełnowartościowego.'
when 11 then 'Ustal zakres liczenia, policz niezależnie od stanu systemowego, porównaj wynik i zweryfikuj historię ruchów. Przy korekcie zapisz autora, powód i zatwierdzenie wymagane procedurą.'
when 12 then 'Sprawdź datę, stan jakości, przypisanie do właściciela i właściwe warunki przechowywania. Zachowaj historię partii od przyjęcia do klienta; nie wydawaj produktu z przekroczonym terminem.'
when 13 then 'Sprawdź ID zadania, status komunikatu, fizyczny rezultat i ślad audytu. W razie awarii nie obchodź osłon ani uprawnień; uzgodnij bezpieczną procedurę i odtworzenie stanu.'
when 14 then 'Zbierz punkty trasy, czas obsługi, okna, ładunek i zasób pojazdu, sprawdź zgodność masy i objętości. Przydziel przewoźnika i udokumentuj zmiany planu, nie ukrywając opóźnienia.'
when 15 then 'Zdefiniuj dane wejściowe, miarę celu i ograniczenia, następnie sprawdź propozycję względem rzeczywistych stanów i kryteriów BHP. Pomyśl o sposobie odrzucenia błędnej rekomendacji.' else 'Ustal stan przed, dokument źródłowy, zamierzony ruch oraz stan po. Potwierdzaj jedynie faktyczne wykonanie i sprawdź spójność identyfikatora, jednostki miary oraz ilości.' end),
 jsonb_build_object('heading','Przykład z rzeczywistej pracy',
  'text',case kind when 0 then 'W kartonie jest 12 sztuk. Pięć kartonów i osiem sztuk luzem to 5 × 12 + 8 = 68 sztuk, a nie 13. Zapis niezgodnej jednostki powoduje błąd zapasu.'
when 1 then 'Klient A ma 20 sztuk SKU-8, klient B ma 15 sztuk identycznie oznaczonego produktu. Klient A ma najwyżej 20 sztuk, a nie 35; stan magazynu musi zachować rozdział właścicieli.'
when 2 then 'ASN: 20 kartonów × 6 szt. = 120 sztuk. Przyjechało 19 kartonów, z czego jeden uszkodzony. Fizycznie jest 114 sztuk, a do sprzedaży można dopuścić maksymalnie 108 do czasu kontroli.'
when 3 then 'HU-701 zawiera 3 kartony A po 12 sztuk i 2 kartony B po 8: 36 sztuk A oraz 16 sztuk B. Łącznie 52 sztuki, lecz w dwóch różnych SKU.'
when 4 then 'On-hand 120 sztuk, reserved 35, quality hold 10: available 75 sztuk. Zamówienie na 80 nie może zostać bezwarunkowo potwierdzone jako w pełni możliwe do pobrania.'
when 5 then 'System proponuje miejsce o nośności 500 kg, a paleta waży 620 kg. Nie należy potwierdzać fikcyjnego odłożenia; trzeba znaleźć dopuszczalną lokację i odnotować wyjątek.'
when 6 then 'Zamówiono 16 sztuk, w lokalizacji jest 12. Fizycznie można pobrać 12; brak 4 wymaga wyjaśnienia lub uzupełnienia, a potwierdzenie pobrania 16 zafałszuje stan.'
when 7 then 'Trzy zamówienia po 1 sztuce tego samego SKU pozwalają pobrać 3 za jednym podejściem, ale dopiero prawidłowy sort przydziela po 1 do trzech paczek.'
when 8 then 'Dokument: 2 × A i 1 × B. W pudełku: 2 × A i 2 × B. Łącznie 4 zamiast 3 sztuk i nadmiar B; zgodność samego produktu A nie zamyka kontroli.'
when 9 then 'Na dokumentach są 3 palety, a do samochodu trafiły 2. Potwierdzenie 3 ukrywa brak jednej palety i prowadzi do reklamacji.'
when 10 then 'Z 5 zwróconych sztuk 1 ma uszkodzony element, a 2 wymagają dodatkowej kontroli. Nie wolno bez oceny przywrócić do dostępnego zapasu wszystkich 5.'
when 11 then 'System pokazuje 80 sztuk, fizycznie jest 74: różnica –6. Poprawa nie polega na dowolnym przepisaniu 74, lecz na ustaleniu, dlaczego wystąpiła rozbieżność.'
when 12 then 'Partia A jest ważna do grudnia 2026, B do marca 2027. W FEFO pierwsza powinna być rozpatrywana A, jeśli obie partie są dopuszczone i spełniają wymogi zlecenia.'
when 13 then 'Przenośnik fizycznie przesunął paletę, lecz potwierdzenie nie dotarło. Bez sprawdzenia ruchu powtórzenie zadania może stworzyć duplikat lub kolizję.'
when 14 then 'Naczepa ma 18 m³, dwa ładunki zajmują 11 i 9 m³, razem 20 m³. Mimo odpowiedniej masy ładunków nie da się ich zmieścić bez innego rozwiązania.'
when 15 then 'Przesunięcie szybko rotującego ciężkiego produktu do najwyższej lokacji skraca trasę, ale może pogorszyć bezpieczeństwo i ergonomię.' else 'Zamówiono 6 kartonów po 10 sztuk, przyjechało 5. Oczekiwano 60 sztuk, fizycznie jest 50; różnica 10 wymaga zarejestrowania.' end||' Sytuacja z tej lekcji: '||coalesce(material->'learning'->>'situation','Sprawdź to na stanie przykładowym.')),
 jsonb_build_object('heading','Zastosuj i sprawdź wynik',
  'text',case kind when 0 then 'Policz siedem kartonów po 24 sztuki i 6 luzem (174 sztuki). Wskaż, w którym polu zapiszesz UOM i przelicznik.'
when 1 then 'Narysuj dwa magazyny i po dwie lokacje. Przypisz im owner, SKU, sztuki, nośnik i ograniczenie nośności.'
when 2 then 'Zapisz: oczekiwano 120, przyjęto 114, zablokowano jakościowo 6. Wyjaśnij każdą z trzech wartości i dokumentację niezgodności.'
when 3 then 'Rozrysuj hierarchię HU → SKU → partia → liczba sztuk. Przesuń jeden karton do HU-702 i przelicz zawartość obu nośników.'
when 4 then 'Dla 60 on-hand, 11 reserved i 7 hold oblicz dostępny zapas (42). Wyjaśnij, co zmieni się, jeśli blokady się pokrywają.'
when 5 then 'Podaj pięć kontroli przed zatwierdzeniem ruchu: produkt, nośnik, ilość, lokacja, nośność. Rozdziel status utworzenia zadania od jego wykonania.'
when 6 then 'Wypisz kroki pobrania jednej pozycji i decyzję w sytuacji, gdy skanowana partia nie odpowiada partii wskazanej w dokumencie.'
when 7 then 'Narysuj trasę z 4 lokacjami i punkt, w którym może zostać pomylony koszyk jednego klienta z drugim.'
when 8 then 'Zrób checklistę: SKU, liczba, zabezpieczenie, etykieta, adresat, waga. Wskaż, dlaczego poprawna masa nie gwarantuje poprawnej zawartości.'
when 9 then 'Zapisz, czym różni się etap ''gotowe do wydania'' od ''przekazano przewoźnikowi'' i jaki dowód potwierdza każdy etap.'
when 10 then 'Dla pięciu zwrotów sporządź trzy kategorie statusu i plan kontroli. Zapisz, kto może zatwierdzić dalszą sprzedaż.'
when 11 then 'Wypisz stan systemowy, policzony i różnicę. Zaproponuj trzy możliwe przyczyny oraz dokument, który mógłby je potwierdzić.'
when 12 then 'Wypisz pięć danych pozwalających prześledzić partię i odtwórz fikcyjną reklamację jednej serii.'
when 13 then 'Zaprojektuj statusy: utworzone, wysłane, wykonane, potwierdzone, wyjątek. Wskaż właściwe zachowanie przy utracie komunikatu.'
when 14 then 'Policz trasę z dwoma punktami, 35 minutami jazdy i 30 minutami obsługi. Ustal realistyczny czas rozpoczęcia drugiej dostawy.'
when 15 then 'Porównaj wynik przed i po: dystans, czas, błędy, obciążenie stanowiska. Wskaż warunek, który blokuje pozornie najkrótszą trasę.' else 'Zapisz stan przed i po, źródło danych, działanie i dowód potwierdzenia. Wyjaśnij różnicę między rzeczywistym ruchem i informacją na ekranie.' end||' Dla omawianego przypadku: '||coalesce(material->'learning'->>'example','uzasadnij decyzję na danych.'))
 ) sections
 from classified
),updated as (
 update public.ta_lessons l set material=jsonb_set(l.material,'{sections}',d.sections,true),updated_at=now()
 from drafted d where l.course_slug=d.course_slug and l.lesson_no=d.lesson_no
 and jsonb_array_length(coalesce(l.material->'sections','[]'::jsonb))<3
 returning l.course_slug,l.lesson_no
)
select count(*) as updated_lessons,count(distinct course_slug) as updated_courses from updated;
