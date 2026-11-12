# Encyklopedia księgowości — czytnik i lekcje 11–20

Prace zapisane 12 listopada 2026. Treści po polsku. Cena 999 zł i kurs nieopublikowany — bez zmian.

## Treści w bazie, nie w publicznym repozytorium

Zapisano 10 kolejnych pełnych lekcji (11–20): kontrola dokumentów i dekret, aktywa/pasywa, Wn/Ma, plan kont, dziennik i zestawienie, sprzedaż, zakup usługi, częściowe wpłaty, storno oraz projekt firmy. Każda nowa lekcja zawiera pięć sekcji teorii, dwa rozwiązane przykłady, cztery zadania, tabelę i rolę praktyczną. Teoria nowych lekcji ma ponad 3000 znaków na lekcję, poza przykładami i ćwiczeniami. Stan po zapisie: 20 pełnych lekcji, 40 rozwiązanych przykładów i 70 ćwiczeń. Kolejna pozycja do opracowania: 21. Program 100000 pozycji nie jest liczbą gotowych lekcji.

Wspólny scenariusz: sprzedaż netto2400, VAT552, brutto2952; zakup zużytej usługi netto600, VAT138, brutto738; wpłaty1000 i1952 oraz wypływ738. Przy jawnych założeniach modelu: bank2214, wynik1800, różnica VAT414, należność0 i zobowiązanie0; suma obrotów dziennika po każdej stronie7380. To nie jest rzeczywista deklaracja ani klasyfikacja stawek i odliczeń. Opracowania oparto w podanym zakresie na urzędowym tekście ustawy o rachunkowości; źródła i zakres artykułów są przy każdej lekcji. Wewnętrzne approved nie oznacza niezależnej recenzji eksperta.

## Czytnik

Trasa `/ksiegowosc`, także `?lesson=11`. Pobiera treść chronioną RLS z Supabase. Dziesięć działów, wczytanie 100 rozdziałów wybranego działu, rozwijany rozdział i strony po20 lekcji. Puste outline nie są pokazywane jako gotowe materiały. Dostęp: właściciel projektu albo aktywny kurs; dane innych kursów pozostają bez zmian.

Czytnik pokazuje teorię, przykłady, tabele, zadania, linki do słownika, źródła i przejście do biura ćwiczeniowego. Arkusze w tej wersji czytnika to tabele danych/formuł, nie nowy działający edytor arkusza. Nie deklarować pełnego Excela.

Ćwiczenia są samosprawdzające z możliwością ponawiania. Liczby polskie i kropka dziesiętna są obsługiwane; puste pole nie jest zerem. Odpowiedź zapisuje się na koncie po sprawdzeniu. W razie nieudanego odczytu poprzednich odpowiedzi zapis jest blokowany. Oznaczenie przeczytania nie jest wynikiem egzaminu i nie wydaje certyfikatu.

Notatka: lokalny szkic per konto i lekcja, jawny zapis na koncie oraz porównanie wersji w razie konfliktu. Nie nadpisuje się nowszej wersji bez porównania i ponownego potwierdzenia. Ulubione są zapisywane prywatnie. Wejście do czytnika dodano nad biurem ćwiczeniowym. Stary ogólny widok `/nauka` i licznik kart `/moje-kursy` nadal wymagają docelowej integracji przed sprzedażą encyklopedii.

## Baza

Migracja `accounting_reader_answers_and_note_versioning`: prywatne `ta_accounting_practice_answers`, polityki własności i istniejących pytań oraz RPC `ta_accounting_note_save` z oczekiwaną wersją updated_at. Kod błędu40001 oznacza konflikt; szkic pozostaje lokalnie. Historia materiałów zachowała poprzednie pozycje programu. Nie jest to niezależny backup całego projektu.

Punkty zapisu treści: `foundations-11-15-v1`, `foundations-16-20-v1`; funkcji bazy: `reader-private-answers-note-cas-v1`.

## Weryfikacja wykonana przed commitem

- 14/14 kontroli bazy i treści: struktura nowych lekcji, unikalność, źródła, historia, wszystkie22 odpowiedzi liczbowe przeliczone niezależnymi działaniami,18 poprawnych zakresów kluczy wyboru, własność odpowiedzi i notatek, konflikt wersji oraz wyszukiwanie. Dane próbne wycofano transakcją.
- 13/13 testów pomocników Node: wejście liczbowe, odpowiedzi, bezpieczne źródła, rozdzielenie kont i odtworzenie szkicu.
- Składnia TSX sprawdzona transpilerem: bez błędów składni. To nie jest pełna kompilacja projektu.
- Nowy test uruchamiany w GitHub Actions i jako warunek w workflow Expo.
- Pełna kompilacja nowego commitu, publikacja i rzeczywisty zalogowany przebieg czytnika nie zostały jeszcze potwierdzone w chwili zapisu tego dokumentu. Aktualny wynik należy sprawdzić w CI i checkpointach Supabase, a nie wywodzić z samego commitu.

## Kontynuacja

Sprawdzić najnowszy main i checkpoint. Przetestować na koncie właściciela: spis, rozwijanie, wyszukiwanie, lekcja, zadanie, odświeżenie odpowiedzi, ulubione, notatka i konflikt dwóch okien. Rozbudować lekcje od21 oraz słownik terminów użytych w kolejnych partiach. Do każdej zmiany zachować źródła, jawne założenia oraz historię. Nie włączać sprzedaży na podstawie technicznego powodzenia testów.
