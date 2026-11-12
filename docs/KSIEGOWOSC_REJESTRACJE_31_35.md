# Encyklopedia — zgłoszenia i rejestry, partia 31–35

Zapis pracy 12 listopada 2026. Materiały płatnego kursu i ich klucze odpowiedzi pozostają w chronionej bazie, nie w tym publicznym repozytorium. Cena 999 zł, sprzedaż nieukończonego kursu wyłączona.

## Treści zapisane w Supabase

5 nowych pełnych lekcji: NIP-8, ZUA, ZZA, ZWUA oraz projekt przejęcia teczki po zmianach danych. Każda ma 5 sekcji, 2 rozwiązane przykłady, 4 zadania, tabelę i rolę praktyczną. Dodano 4 hasła słownika: płatnik składek, ubezpieczony, tytuł ubezpieczenia, zmiana i korekta. Powiązania z lekcjami i innymi hasłami zostały sprawdzone.

Dodano 4 częściowe karty formularzy: NIP-8(4), ZUA, ZZA, ZWUA. To 8 nowych scenariuszy i 25 pól liczbowych. Zadania dotyczą wybranych kodów opcji, pomocniczych składników dat i kontroli liczbowych. Nie wymagają prawdziwych NIP/PESEL ani adresów. Nie są pełnym edytorem wszystkich pól urzędowego formularza.

Stan po tej partii: 35 pełnych lekcji, 70 rozwiązanych przykładów w lekcjach, 130 zadań w lekcjach, 40 kart biblioteki (w tym 16 haseł i 8 częściowych kart formularzy), 50 tabel biblioteki. Formularze razem: 16 scenariuszy i 51 pól. Są też odrębne tabele w lekcjach. 100000 pozycji programu nie jest liczbą gotowych lekcji. Następna nieopracowana pozycja: 36; przed kontynuacją sprawdzić rzeczywisty stan.

## Źródła i ograniczenia

Przejrzano oficjalne strony MF i ZUS oraz obrazy wzorów: ZUA strony 1–2, ZZA 1–2, ZWUA 1. W NIP-8 obejrzano strony 1, 3, 4; podgląd strony 2 nie był dostępny. Nie zaliczono tej strony do szczegółowo zweryfikowanej mapy. ZUA/ZZA mają datę stosowania podaną u wydawcy; przy NIP-8 i ZWUA zapisano bieżącą dostępność, nie zgadniętą datę wejścia w życie. Objaśnienia i przykłady są autorskie, oryginalne wzory bezpłatne u wydawców. Wewnętrzny status approved nie oznacza niezależnej recenzji zawodowej ani akceptacji urzędu.

## Zmiany techniczne

Migracja `accounting_forms_verified_current_availability` dodaje tryb manifestu `period_mode: verified_current`. Wymaga prawdziwej daty `availability_checked_at` równej `verified_at`, opisowego `period_note` oraz braku `valid_from`, `valid_until` i `verified_tax_years` w tym samym trybie. Nie miesza dostępności pliku z okresem prawnym. Inne walidacje pozostają aktywne.

Pomocnik `periodLabel` pokazuje odrębny komunikat dostępności, a przy sprzecznych metadanych lub braku obiektu bezpieczny komunikat wymagający sprawdzenia. `officialURL` dopuszcza dokładny oficjalny host `www.podatki.gov.pl`; nie dopuszcza domen podszywających się, HTTP ani danych logowania w URL.

Istniejący interfejs `/formularze-ksiegowego` pobiera nowe karty dynamicznie. Zapis odpowiedzi wymaga wcześniejszego odczytu i oczekiwanej wersji. Nie zmieniono kont użytkowników, płatności ani ustawień innych kursów.

## Faktycznie wykonane kontrole

- Lokalny test Node z nowymi regresjami: początkowo 27/31, 4 błędy. Po poprawkach 31/31. Dotyczy helperów, nie prawdziwie zalogowanej strony.
- QA w bazie `run_key=registration-31-35-20261112`: etap A po poprawkach 8/10, pozostałe 2 blocked; etap B 10/10; etap C początkowo 9/10. Wykryto brak jawnego symbolu ZWUA w jednym objaśnieniu lekcji 33. Doprecyzowano i ponowiono test: pozytywny. Pierwotny wynik failed zachowano.
- 10 odpowiedzi liczbowych nowych lekcji sprawdzono niezależnymi działaniami i kalendarzem; 8 nowych scenariuszy odtworzono z niezależnie wpisanymi rozwiązaniami.
- Regresja wszystkich 16 scenariuszy, walidacja 8 manifestów i odrzucenie 8 celowo uszkodzonych manifestów przeszły. Badano też brak odpowiedzi, jawne zero i nadmiarowe pola.
- QA z perspektywy początkującego i wymogów ZUS to symulowane kontrole treści i logiki. Nie uczestniczyli realni kursanci, biegły rewident ani pracownicy ZUS.
- Dwie realne próby zalogowanych sesji nadal zablokowane: izolacja dwóch kont i konflikt dwóch okien. Nie podszywano się pod użytkowników i nie omijano uwierzytelnienia. Statyczna kontrola RLS nie zastępuje tych prób.
- Wyniki CI i publikacji tego commitu trzeba odczytać z GitHub/Expo i checkpointu; nie wynikają z samego zapisu plików.

## Wznowienie

Odczytać najnowsze `ta_accounting_checkpoints`, `ta_accounting_qa_issues`, aktualny main i blokadę `ta_accounting_internal.build_leases`. Zapisuj po maksymalnie 5 nowych lekcjach, wyłącznie z własną aktywną blokadą. Nie nadpisuj pracy drugiej sesji. Kontynuować od faktycznie pierwszej nieopracowanej pozycji, rozbudować dalsze druki, brakujące fragmenty obecnych wzorów i scenariusze branżowe. Historia i checkpointy są w tej samej bazie; niezależny backup nadal niezweryfikowany. Nie włączać sprzedaży na podstawie samych testów technicznych.
