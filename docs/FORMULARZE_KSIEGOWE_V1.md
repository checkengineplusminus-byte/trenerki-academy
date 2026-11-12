# Pracownia formularzy — stan 12 listopada 2026

Trasa: `/formularze-ksiegowego`, opcjonalnie `?entry=formularz-pit38-18`. Dostęp z czytnika, biura i słownika. Kurs nadal nieopublikowany, cena 999 zł bez zmian. Pełne treści i materiały płatnego kursu pozostają w Supabase, nie w publicznym repozytorium.

## Faktyczny zakres

Dodano lekcje 21–30: dobór wzoru, PIT-38, PCC-3, RCA, DRA, sprzedaż praw a majątku, zmiana nazwy, właściciele i akcjonariusze, daty stosowania prawa oraz projekt przejęcia dokumentacji. Każda ma pięć części objaśnień, dwa przykłady, cztery zadania, tabelę i rolę praktyczną. Stan po zapisach: 30 pełnych lekcji, 60 przykładów, 110 zadań. Kolejna nieopracowana pozycja 31; plan 100000 pozycji nie jest liczbą gotowych lekcji.

Cztery nowe karty: PIT-38(18), PCC-3(6), ZUS DRA i RCA od rozliczeń za kwiecień 2026. Osiem scenariuszy, 26 pól odpowiedzi, mapa pól, jawne założenia, zakres i linki do bezpłatnych oryginałów urzędowych. To wybrane fragmenty, NIE cztery kompletne deklaracje. PIT-38 ćwiczony za 2025. Obejrzane strony PDF: PIT-38 1–2, PCC-3 1–2, DRA 1–2, RCA 1. Nie deklarować analizy wszystkich stron. Oryginały pozostają bezpłatnymi dokumentami wydawców, a objaśnienia Trenerki są odrębne.

## Zapis i kontrola

Nowa tabela `ta_accounting_form_attempts` jest prywatna per konto i scenariusz. Otwarty formularz zachowuje szkic lokalnie. Przycisk „Sprawdź i zapisz” wywołuje RPC `ta_accounting_form_save`, które sprawdza dostęp, wersję wcześniejszego zapisu i wersję materiału, a następnie ocenia pola na serwerze. Użytkownik nie ma prawa bezpośredniej zmiany evaluation. Puste pole nie oznacza zera, grosze nie są automatycznie zaokrąglane w polu pełnych złotych. Zmiana treści wymaga porównania, a nie cichego ponownego uznania starej odpowiedzi.

Żaden przycisk nie składa deklaracji, nie łączy się z bankiem, nie wysyła do ZUS/KSeF/urzędu. Nie wprowadzać prawdziwych danych podatników. To ćwiczenie, nie egzamin zawodowy, kontrola urzędowa ani opinia biegłego rewidenta.

## Testy i naprawy — bez udawania pełnego audytu

Rejestr: `ta_accounting_qa_results`, run_key `forms-corporate-20261112`; usterki w `ta_accounting_qa_issues`.

Żądany cykl został zastosowany do TEJ PARTII jako scenariusze symulowane i testy techniczne, nie udział prawdziwego księgowego, recenzenta ani pracownika ZUS. A: 5 księgowego i 5 krytyka; poprawki i powtórka. B: 5 księgowego i 5 recenzenta. C: 5 wejść początkującego i 5 kontroli z perspektywy dokumentów ZUS. Po poprawkach: 28/30 zaliczonych, 2 niewykonane. Osobny końcowy przegląd zapisano jako fazę F.

Wykryto i naprawiono: kolizję aliasu SQL w ocenie, błędny typ odpowiedzi w lokalnym szkicu, brak walidacji rzeczywistych dat, niewyjaśnione skróty funduszy. Zachowano pierwszy nieudany wynik zamiast zastępować go zielonym statusem. Poprawiono też aktualizację znacznika czasu karty i tekstu wyszukiwania po zmianie opisu.

21/21 testów pomocników Node przeszło lokalnie. TSX nie ma błędów składni według transpileModule. To nie jest pełna kompilacja Expo ani test interfejsu w przeglądarce. Wyniki CI i publikacji sprawdzać dla końcowego commitu, nie wywodzić ich z tego pliku.

Dwie blokady: rzeczywisty konflikt zapisu w dwóch zalogowanych oknach i izolacja dwóch zalogowanych kont. Próba testu z podmianą kontekstu tożsamości została zablokowana i nie jest ponawiana. Wymagane są zwykłe autoryzowane sesje kontrolowanych kont testowych. Statyczne sprawdzenie RLS i uprawnień nie zastępuje E2E. Nie wydobywać tokenów sesji, nie wyłączać RLS i nie obchodzić ograniczeń.

## Kontynuacja

1. Odczytać aktualne checkpointy i head repo przed każdą zmianą; chronić równoległą pracę.
2. Sprawdzić wynik kompilacji/publikacji i rzeczywistą nawigację do formularzy. Wykonać brakujące autoryzowane testy, gdy zwykłe sesje są dostępne.
3. Rozbudować pole-po-polu pozostałe strony i scenariusze, potem kolejne dokumenty: NIP-8, VAT-R, ZUA, ZZA, ZWUA, ZCNA, RSA, PIT-11/37/36/36L/28, CIT i formularze rejestrowe. Każdy symbol to zakres do zweryfikowania, nie deklaracja gotowości.
4. Zachować rozróżnienie sprzedaży istniejących praw, emisji, sprzedaży aktywów i reorganizacji; osobno skutki stron, rejestry, terminy i dokumenty.
5. Dla każdej partii przeprowadzić cykl testów, zapisać błędy, poprawki, regresję i niewykonane próby. Pełny końcowy audyt całego kursu dopiero po ukończeniu zakresu.
6. Niezależny backup całego projektu nadal niezweryfikowany. Historia w tej samej bazie ani commit kodu nie zastępują backupu danych.

Migracje tej partii: accounting_forms_practice_versions_and_quality_audit, accounting_forms_evaluator_alias_and_manifest_guard, accounting_forms_testable_manifest_validation, accounting_forms_valid_dates_and_reference_timestamps. Źródło DDL jest w historii migracji Supabase; przy odtwarzaniu pobrać pełne definicje z zależnościami. Nie wpisywać płatnych treści do publicznego repozytorium.
