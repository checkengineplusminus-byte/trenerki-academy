# Symulator — dane firmy i stron dokumentów

Stan implementacji: 12 listopada 2026. Nowa trasa `/dane-biura`, powiązana z istniejącą pracownią. Materiały płatnego kursu pozostają w chronionej bazie. Ta notatka opisuje kod i zakres, nie jest pełną instrukcją księgową.

## Wykonane

Karta jednostki: nazwa, polski adres, NIP, REGON, KRS, rodzaj jednostki, ewidencja oraz status VAT przyjęty w scenariuszu. Identyfikatory przechowywane jako tekst; NIP kontrolowany strukturalnie i cyfrą kontrolną, REGON tylko długość 9/14, KRS tylko 10 cyfr. Żadna kontrola nie potwierdza istnienia podmiotu, rejestracji VAT ani prawa do zwolnienia. Dane testów są syntetyczne, nie deklarujemy numerów zastrzeżonych i nie odpytujemy rejestrów.

Szkic dopuszcza błędy do nauki. Gotowa karta i wystawienie dokumentu mają ostrzejsze warunki. NIP konsumenta nie jest wymuszany. Rodzaj podmiotu nie zmienia automatycznie silnika rozliczeń: obecny dziennik jest nadal uproszczony. Karta fundacji nie oznacza wdrożonej pełnej rachunkowości fundacji.

Faktury sprzedaży i zakupu mają osobne obrazy danych własnej firmy i kontrahenta, datę wystawienia i wykonania, termin, pozycje oraz obliczenia. Dane wystawionego dokumentu nie są nadpisywane po zmianie nazwy. Nowy dokument wymaga zgodności z aktualną zapisaną kartą. Zmiana podatnika po wystawieniu nie może być zasymulowana zwykłą podmianą NIP-u. Potrzebny osobny podmiot lub opracowana ścieżka przekształcenia.

Dokumenty zapisują się w tych samych prywatnych `ta_accounting_lab_workspaces` co bank, dziennik i rozrachunki, z oczekiwaną wersją. Historia `ta_accounting_lab_events` została rozszerzona o company before/after. Nie zmieniono zasad własności ani nie odczytywano rzeczywistych danych uczniów. Starszy edytor nie może usunąć danych stron nowego dokumentu — odsyła do karty. Stare dokumenty bez identyfikatorów pozostają bez zmian.

`lab-core-base.js` zachowuje dokładnie wcześniejszy blob silnika `4dbf4a59f6cbff36c42832fa70316ac8320f360c`. Nowy `lab-core.js` re-eksportuje funkcje i kieruje wydruk dokumentów z danymi do nowego bezpiecznie kodowanego HTML. Pozostałe obliczenia zachowane. Nie wprowadzać kołowego importu: identity-core importuje base, nie wrapper.

## Testy przed commitem

30/30 testów helperów lokalnie; do lokalnego testu importowanych obliczeń wykorzystano odczytany podzbiór starego silnika. W repo pozostawiono cały oryginalny blob; CI ma uruchomić nowy zestaw i wszystkie istniejące testy pracowni. Składnia TSX sprawdzona transpilerem po naprawie brakującego nawiasu JSX. To nie pełny test przeglądarkowy.

24/24 testy czystych funkcji serwera: identyfikatory, błąd w szkicu, walidacja, konsument, odrębne daty, historia nazwy, blokada podmiany podatnika, kompatybilność, blokada utraty danych przez stary edytor. W pierwszym przebiegu znaleziono kolizję aliasu k; naprawiono i powtórzono testy. Wynik pierwotnego błędu pozostaje w QA. Testy nie podszywały się pod użytkownika i nie potwierdzają izolacji rzeczywistych sesji.

Przed uznaniem publikacji i E2E sprawdzić bieżące CI, status Expo i rzeczywiste logowanie. Dwie wcześniejsze próby: dwa konta i dwa okna pozostają blocked, a nie passed.

## Dalszy zakres wymagany przez Adriana

Scenariusz życia jednostki: rozpoczęcie, pierwsza faktura, zatrudnienie, rozwiązanie umowy, dwie kolejne osoby, samochód i narzędzia, zaliczki, straty, zamknięcia miesięczne, dokumenty do właściwych organów i zamknięcie roku. Osobne warianty JDG, spółki z o.o., fundacji i stowarzyszenia; nie kopiować jednego schematu jako uniwersalnego.

Jeszcze nie wdrożono w pełnym przebiegu: kadry i płace, wypowiedzenia, kartoteki samochodów/narzędzi, rozliczenie strat i zaliczek, pełne formularze, kompletne zamknięcie oraz symulowane kolejki urzędowe. Wpisanie rodzaju jednostki nie jest wykonaniem tych modułów.

KRS/RDF dotyczy odpowiedniego sprawozdania i pakietu, nie wysyłki pojedynczych faktur. Przyszła wysyłka w symulatorze musi być wyłącznie ćwiczeniowa, bez prawdziwych zgłoszeń i skutków prawnych. Źródło: https://www.gov.pl/web/finanse/jakie-dokumenty-i-w-jakim-formacie-zgodnie-z-ustawa-o-rachunkowosci-jednostka-majaca-siedzibe-na-terytorium-rp-powinna-zlozyc-do-krs

Kontynuować z najnowszego checkpointu Supabase i własną aktywną blokadą. W tej partii zapisano także 5 lekcji 41–45 oraz uszczegółowiono 200 planowanych rozdziałów w działach 6 i 10. Liczba rozdziałów planu nie jest liczbą ukończonych materiałów. Zasady podatkowe, kadrowe i sprawozdawcze wymagają aktualnych źródeł i odrębnych testów. Cena 999 zł i nieopublikowana sprzedaż pozostają bez zmian.
