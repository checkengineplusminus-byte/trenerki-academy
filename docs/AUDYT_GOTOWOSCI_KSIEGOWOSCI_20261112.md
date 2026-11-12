# Audyt gotowości encyklopedii księgowości — 12 listopada 2026

## Decyzja

NO-GO dla sprzedaży jako kompletnej encyklopedii i pełnego symulatora. Cena 999 zł i published=false bez zmian. Powodzenie kompilacji ani samodzielnego testu obliczeń nie jest potwierdzeniem nauczenia rzeczywistego początkującego ani recenzją biegłego rewidenta. Nie deklarować zgodności wszystkich kursów ani całego polskiego prawa.

## Zakres rzeczywiście przejrzany

Bieżące metadane programu i checkpointy, treści lekcji 1,13,16,17,20,45 bez pobierania kluczy ich zadań do przejścia, reguły walidacji pracowni, kod wejścia /moje-kursy i /nauka, kod procesu zakupu, regulamin. Dane osób uczących się nie były wykorzystywane. Zwykły publiczny podgląd witryny nie był dostępny przez narzędzie web; brak autoryzowanej sesji przeglądarkowej. Nie obchodzono logowania. W czasie audytu odrębny wykonawca dopisał lekcje46–50; nie są to lekcje stworzone przez ten audyt.

## Symulacja podstawowego przebiegu

Wykonano na fikcyjnych danych odrębny pakiet sprzedaży, zakupu, częściowych płatności, dziennika i rozrachunków; sprawdzono na serwerze wyniki i zabezpieczenia. To sprawdzian spójności materiałów z ograniczonym silnikiem, nie dowód, że osoba bez wcześniejszej wiedzy przyswoiła kurs. Ocena skuteczności nauki wymaga niezależnych zadań, braku podpowiedzi z klucza, odroczonego powtórzenia i prób rzeczywistych początkujących.

20 pozycji audytu (po5 perspektyw początkującego, krytyka, pracownika i szefa): początkowo12 passed,2 failed,6 blocked. Wykryto i naprawiono błąd duplikatów zakupowych; powtórzone6 prób czystej funkcji passed. Po tej naprawie ostatnie wyniki macierzy to13 passed,1 failed,6 blocked. Nie zastępuje to pełnego poprzednio zdefiniowanego audytu całego kursu.

Blocked obejmuje majątek w faktycznym silniku, pełne zatrudnienie/płace, zakończenie zatrudnienia, dwie sesje kont, konflikt okien oraz niezależne odtworzenie backupu. Napisanie lekcji o tych czynnościach nie dowodzi wdrożenia modułów. Failed dotyczy kompletności obiecanej oferty. Wnioski i wyniki w ta_accounting_qa_results, run_key release-readiness-20261112.

## Naprawy

1. Baza: accounting_purchase_number_scope_by_supplier. Wcześniej dwie faktury zakupowe różnych dostawców o tym samym numerze były odrzucane. Zakres duplikatu zakupowego obejmuje teraz NIP wystawcy (starsze dokumenty: znormalizowaną nazwę), a własna numeracja sprzedaży pozostaje osobna. Zachowano definicję przed zmianą w checkpoint. Nie zmieniano istniejących dokumentów ani RLS. Nazwa w starym dokumencie nie dowodzi tożsamości; nowa karta wymaga pełnych danych.
2. /moje-kursy: encyklopedia używa swojego RPC licznika i właściwej trasy zamiast ta_lessons oraz starego czytnika. Licznik opisuje przeczytane dostępne materiały, nie100000 gotowych lekcji i nie zaliczenie egzaminu. Brak odczytu jest oznaczony jako niedostępny postęp.
3. Przeczytanie dostępnych materiałów encyklopedii nie przenosi kursu do ukończonych i nie sugeruje wydania certyfikatu. Właściciel ma czytelne wejście do podglądu, bez zmiany RLS i bez sztucznego zakupu.

13 testów logiki nowego wejścia wykonano lokalnie. Dodano3 kontrole integracji plików do CI. Dawny app/nauka.tsx zachowano bajt w bajt, ponieważ korzystają z niego inne kursy i ich testy. Stare bezpośrednie odsyłacze do /nauka?course=ksiegowosc-od-podstaw poza kartą Moje kursy nadal wymagają docelowego przeglądu; nie deklarować ich automatycznego przekierowania. Wynik pełnego CI, kompilacji i publikacji należy odczytać po tym commicie. Nie deklarować rzeczywistej próby zalogowanego interfejsu.

## Wnioski dydaktyczne

Przykłady odróżniają dokument, zapis, płatność, wynik i pieniądze. Brakuje dowodu samodzielnego opanowania pełnej pracy przez początkującego. Wszystkie dotąd opracowane lekcje są podpięte do pierwszego rozdziału; trzeba zaprojektować progresję, zależności wstępne oraz etapowe zadania bez rozwiązania w instrukcji. Nie naprawiono tego samym przesunięciem numerów, ponieważ zmieniłoby to powiązania i postępy. Builder pracował równolegle; treści nie nadpisywano.

## Zakres prawny — wstępny przegląd, nie certyfikacja

Regulamin zawiera dane operatora,12-miesięczny dostęp, odstąpienie, reklamacje, informację o charakterze prywatnego dyplomu i Anielce. Kod zakupu ma oddzielne zgody i filtr published=true. Nie wykonano pełnej próbnej transakcji, utrwalenia potwierdzenia na trwałym nośniku, zwrotu ani obsługi reklamacji. Nie sprawdzono całej zgodności przepływu danych symulatora i retencji z polityką prywatności oraz wszystkich ustawowych wyjątków w materiałach.

Materiały i symulator są powiązanymi świadczeniami cyfrowymi; ich kwalifikacja i moment utraty prawa odstąpienia wymagają spójności umowy, checkoutu i rzeczywistej dostawy, nie samego checkboxa. Nie obiecywać100000 gotowych lekcji, pełnej obsługi kadr lub wszystkich podmiotów bez pokrycia.

Oficjalne źródła przejrzane podczas audytu:
- https://prawakonsumenta.uokik.gov.pl/prawo-do-informacji/sprzedaz-poza-lokalem-i-na-odleglosc/
- https://prawakonsumenta.uokik.gov.pl/prawo-odstapienia-od-umowy/wylaczenia-prawa-do-odstapienia/
- https://prawakonsumenta.uokik.gov.pl/prawo-odstapienia-od-umowy/umowy-szczegolne/
- https://prawakonsumenta.uokik.gov.pl/zmiany-2023/

## Warunki zakończenia blokady sprzedaży

Uzupełnić faktycznie oferowany zakres, ukończyć i sprawdzić procesy end-to-end w każdej obiecanej formie podmiotu, wykonać testy początkujących i zadania bez podpowiedzi, potwierdzić dwie autoryzowane sesje i odtworzenie backupu, zakończyć przegląd merytoryczny oraz prawny konkretnej oferty i procesu sprzedaży. Dopiero wtedy ponownie ocenić publikację. Właścicielski podgląd techniczny nie jest komercyjną premierą.
