# Kartoteka majątku — pierwsze wdrożenie

12 listopada 2026. Trasa /majatek-ksiegowy. To rozwinięcie prywatnego biura kursanta, nie deklaracja gotowości całego kursu.

## Rzeczywisty zakres

Karta urządzenia, samochodu lub narzędzia ujętego jako środek trwały. Wybór istniejącej faktury zakupu, numer inwentarzowy, data przyjęcia, pierwszy miesiąc odpisu, okres użytkowania, wartość końcowa oraz jawne założenie odliczenia VAT. Jedna faktura odpowiada jednemu składnikowi. Przyjęcie ma podgląd wierszy i osobne potwierdzenie; zapisuje kartę i księgowanie w jednej wersji istniejącego workspace.

Wartość modelu to netto plus nieodliczona część VAT. Amortyzacja liniowa miesięczna jest liczona przez różnicę zaokrąglonych wartości narastających, aby nie gubić końcówek groszowych. Zatrzymuje się na wartości końcowej. Daty i parametry są założeniami zadania; program nie dobiera prawa do odliczenia, podatkowej stawki, KŚT, limitu samochodu ani kosztu podatkowego.

Likwidacja bez sprzedaży wyksięgowuje wartość początkową i umorzenie, a pozostałą wartość obciąża wynik modelu. Nie wylicza skutków VAT likwidacji. Nie obsługuje jeszcze sprzedaży majątku, leasingu, ulepszeń ani wielu składników z jednego dokumentu. Wybór kategorii samochód nie oznacza pełnej podatkowej obsługi samochodów.

## Integracja i trwałość

Wspólne konta 010,071,401,761. Raport pracowni uwzględnia majątek, umorzenie, amortyzację i likwidację. Sprawdzanie nie narzuca już schematu kosztu usługi dokumentowi powiązanemu z prawidłową kartą majątku. Dawne obliczenia faktur, banku i rozrachunków pozostają w bazowym module.

Stan zawiera assets, a zdarzenia majątku są w istniejącym journals z asset_id i asset_action. Zachowano RLS, oczekiwaną wersję zapisu i prywatność workspace. Historia zapisuje przed/po także dla kart. Nie czytano ani nie zmieniano rzeczywistych danych uczniów. Szkic formularza przechowuje się lokalnie, karta po zapisie na koncie. Konflikt wersji nie jest cichym nadpisaniem.

Storno zachowuje oryginał. Nie można cofnąć przyjęcia, jeżeli pozostały aktywne odpisy, ani starszego odpisu przy późniejszych. Przyjętej karty nie nadpisuje się; do zmienionych założeń trzeba cofnąć operacje w kolejności i utworzyć osobną kartę. Nie jest to jeszcze rozbudowany moduł zmian szacunków.

## Testy i ograniczenia dowodów

42/42 lokalne testy funkcji klienta. 27/27 testów czystych funkcji serwera. Usterki pierwszego podejścia (komunikat ze znakiem procentu w migracji oraz konflikt aliasów walidatora) naprawione i sprawdzone ponownie. Żaden test nie podszywał się pod użytkownika. Składnia TSX sprawdzona transpilerem. Dodano7 prób integracji z rzeczywistym dotychczasowym silnikiem do CI; wynik CI i wdrożenia należy sprawdzić po commicie. Nie deklarować zalogowanego E2E ani odtworzenia backupu.

Migracje w Supabase: accounting_asset_helpers_v1, accounting_asset_invariants_and_history_v1, accounting_asset_validator_alias_fix. Definicje sprzed zmian zapisane w checkpoint asset-register-v1-before; punkty postępu asset-register-v1-server i assets-workshop-v1-tests-saved. Historia w tej samej bazie nie jest niezależną kopią zapasową.

## Kontynuacja

Potwierdzić rzeczywiste UI na koncie właściciela, przeładowanie, dwa okna i drugie konto. Dokończyć rolę Anielki dla rozszerzonego planu kont. Przygotować podatkowe warianty dopiero po weryfikacji przepisów i dokumentów. Rozbudować kadry/płace oraz pełne zamknięcia. Sprzedaż kursu pozostaje wyłączona; 50 opracowanych lekcji nie jest pełnym uzgodnionym programem.

Źródła techniczne sprawdzone: https://supabase.com/changelog oraz https://supabase.com/docs/guides/database/postgres/row-level-security. Oficjalny wykaz KSR: https://www.gov.pl/web/finanse/krajowe-standardy-rachunkowosci (punkt wyjścia do dalszej weryfikacji merytorycznej, nie pełna recenzja KSR11 w tej partii).
