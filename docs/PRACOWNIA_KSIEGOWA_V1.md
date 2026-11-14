# Biuro księgowe — pierwsza pracownia Trenerki

Stan przygotowania: 12 listopada 2026. Trasa: `/biuro-ksiegowe`.

## Zakres

Własna fikcyjna firma kursanta, faktury sprzedaży i zakupu, podgląd dokumentu ćwiczeniowego, import CSV z podglądem i blokadą błędów, dziennik Wn/Ma, częściowe płatności i rozrachunki, storno, zestawienia oraz historia zapisów. Interfejs i wszystkie komunikaty są po polsku. Dokumenty nie są wysyłane do KSeF, urzędu, banku ani kontrahenta. Nie używać prawdziwych danych klientów.

Pierwszy scenariusz to firma usługowa w PLN, z zerowymi saldami początkowymi. Sprzedaż: 1000 zł netto + zadany VAT 230 zł. Zakup usługi kosztowej: 200 zł netto + zadany VAT 46 zł, z pełnym odliczeniem jako założeniem ćwiczenia. Przelewy: +1230 zł i −246 zł. Oczekiwany wynik po kompletnym księgowaniu: bank 984 zł, wynik modelu 800 zł, VAT ćwiczeniowy 184 zł, należności i zobowiązania 0 zł. To nie jest kwalifikacja podatkowa dowolnej transakcji.

## Zapis i bezpieczeństwo

Migracja Supabase `accounting_lab_private_workspaces_v1` została zastosowana w projekcie Trenerki. `ta_accounting_lab_workspaces` przechowuje stan, a `ta_accounting_lab_events` historię zmian przed/po. RLS ogranicza dane do właściciela. Zapis wymaga aktywnego dostępu do kursu lub roli właściciela projektu. Wcześniej zapisane własne dane pozostają dostępne do odczytu i eksportu po wygaśnięciu dostępu.

RPC `ta_accounting_lab_save` wymaga oczekiwanej wersji, aby nie nadpisywać innego okna. Serwer przelicza kwoty w groszach i sprawdza limity, źródła, bilans Wn/Ma oraz salda płatności. Niezbilansowany szkic jest dozwolony; zatwierdzenie jest blokowane. Wystawionych dokumentów, zatwierdzonych księgowań i zaimportowanych operacji nie można po cichu nadpisać. Storno jest osobnym zapisem.

Pola otwartego formularza zapisują się lokalnie na urządzeniu. Przycisk zapisu szkicu, wystawienia lub zatwierdzenia zapisuje dane na koncie. Eksport JSON stanowi ręczną kopię bieżącego biura, nie automatyczny backup całego projektu. Historia w tej samej bazie również nie zastępuje niezależnej kopii zapasowej.

Limity wersji 1: 12 firm na konto, 200 faktur i po 1000 operacji bankowych, zapisów dziennika oraz powiązań na firmę; 1,5 MB stanu. CSV do 1 MB, cztery kolumny `id;data;kwota;opis`.

## Anielka

Kontrole regułowe w `lab-core.js` wskazują błędne strony, niezaksięgowane dokumenty, błędne konta mimo zgodnych sum, ponowne rozpoznanie przychodu przy zapłacie oraz różnice banku. Uwagi o niezapłaconej fakturze są informacją, nie automatycznym błędem.

Osobna funkcja serwerowa `ta-accounting-coach` została wdrożona z weryfikacją JWT. Sprawdza konto i dostęp do biura, wysyła do modelu pytanie oraz ograniczone dane liczbowe bez nazw kontrahentów, numerów faktur, opisów przelewów i surowych plików. Nie może zmieniać księgowań. Wykorzystuje wspólny limit tutora 15 pytań dziennie. W tej sesji nie potwierdzono odpowiedzi modelu w rzeczywistej zalogowanej sesji. Jej niedostępność nie blokuje ćwiczeń.

## Weryfikacja

- 14/14 testów bazy: własność, RLS, wersje, obliczenia serwerowe, szkic, zatwierdzenie, częściowa płatność, nadpłata, storno i historia. Dane testowe wycofano transakcją.
- 25/25 testów obliczeń, CSV, raportów i bezpiecznego HTML. Uruchomienie: `node --experimental-default-type=module --test scripts/test-accounting-lab.mjs`.
- 12/12 prób interfejsu w lokalnej przeglądarce, z atrapą połączenia do bazy. Obejmowały odtworzenie lokalnego formularza i widok 390 px. To nie był test zalogowanej strony produkcyjnej ani kompletnej kompilacji Expo.
- Kontrola bezpieczeństwa Supabase nie zgłosiła nowych problemów tabel pracowni. W projekcie pozostały wcześniejsze ostrzeżenia: funkcja edycji kontaktów wsparcia z podwyższonymi uprawnieniami oraz wyłączona ochrona przed hasłami ujawnionymi w wyciekach; nie zmieniono ich w ramach pracowni.

## Kolejność kontynuacji

1. Potwierdzić kompilację Expo i rzeczywistą trasę z logowaniem, odświeżeniem, zapisem oraz rozmową z Anielką. Sprawdzić aktualny commit przed zmianami.
2. Dodać wejście do pracowni z docelowego interfejsu encyklopedii oraz panelu administratora, bez odblokowywania sprzedaży nieukończonego kursu.
3. Dodać kolejne scenariusze branżowe, korekty faktur, rozliczenia okresów i wersjonowane reguły. KPiR, płace, deklaracje, inne waluty oraz import XLSX/MT940/PDF nie są jeszcze obsługiwane.
4. Kontynuować pełne lekcje od pierwszej nieopracowanej pozycji; nie przedstawiać 100000 pozycji programu jako gotowych lekcji.

Cena kursu 999 zł i jego stan nieopublikowany nie zostały zmienione. Źródła SQL pozostają w historii migracji Supabase. Przed odtworzeniem nowej bazy pobrać migrację i zależności `ta_accounting_internal`, nie zgadywać definicji.


## Etapy D01–D36 (14 listopada 2026)

Do istniejącej pracowni dodano ćwiczenie księgowania Wn/Ma po pojedynczych dowodach oraz próbny raport zamknięcia miesiąca. Po zalogowaniu kursant otwiera własne fikcyjne biuro i kartę „Miesiąc firmy D01–D36”. Kolejne części:
1. Rozpoznanie rodzaju dokumentu.
2. Samodzielne obliczenie wpływów, wypływów oraz zmiany rachunku bankowego.
3. Wybór ćwiczeniowych kont Wn i Ma, kwot oraz świadomej decyzji „brak księgowania” dla każdego dowodu. Możliwe jest 8 wierszy na dokument; system wykrywa niezgodność kont nawet przy zbilansowanych kwotach. Własne odpowiedzi i poprawki są zapisywane w wersjonowanym stanie biura jako `simulator_journal_attempts_v1`, a nie dopisywane automatycznie do zatwierdzonego dziennika.
4. Po zapisaniu decyzji dla wszystkich 36 dowodów pojawia się próbne zestawienie rachunku, należności, magazynu, maszyny, zobowiązań, pożyczki i wyniku. Równe sumy Wn/Ma nie zastępują uzgodnienia ze stanem referencyjnym.

Wzorcowa dekretacja i ćwiczeniowy plan kont są zapisane wyłącznie w chronionym manifeście Supabase (temat 96, `scenario.journal_practice_v1`). Nie umieszczać wzorcowych zapisów w repozytorium publicznym. Każda próba i jej odpowiedź należą do biura kursanta; zapis korzysta z istniejącego RPC z kontrolą wersji, a RLS ogranicza odczyt do właściciela. W tym zakresie nie wykonano autoryzowanego testu z dwoma kontami, więc nie twierdzimy, że został zaliczony.

Niezależny odczyt SQL referencji wykazał 36 dokumentów: 29 wymagających dekretu i 7 bez nowego dekretu; sumy Wn=Ma po 220 900 zł. Modelowy bank 60 100 zł, należności 4 000 zł, zapasy 3 000 zł i maszyna netto 9 000 zł dają aktywa 76 100 zł; zobowiązania 12 000 zł oraz kapitał z wynikiem 64 100 zł. Wynik modelu przed podatkiem wynosi 4 100 zł.

Wszystkie kwoty, konta i zdarzenia są **fikcyjnym uproszczeniem szkoleniowym bez naliczania VAT, PIT, CIT ani ZUS**. Nie wykonywać żadnych rzeczywistych wysyłek. Nadal są wymagane: recenzja polskiego prawa i metod księgowych, autoryzowane E2E dwóch kont, praktyczny test początkującego, integracja pełnego dziennika i niezależna próba odtworzenia kopii zapasowej. Żaden etap nie potwierdza gotowości do uruchomienia sprzedaży.
