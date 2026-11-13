# TRENERKI – nowy zakres kursu księgowości (13.11.2026)

## Decyzja projektowa
Obowiązującym zakresem podstawowym jest **10 działów × 10 konkretnych tematów = 100 tematów**. Poprzedni pomysł 100 000 lekcji i 1000 rozdziałów nie jest już celem ukończenia. Ustalenia dotyczące bezpieczeństwa i jakości pozostają aktualne.

Tematy są zapisane w `public.ta_accounting_core_topics_v3` (100 rekordów); każdy ma numer, dział, nazwę, stan, opcjonalny link do dawnej lekcji i dowody. `public.ta_accounting_build_control.plan_version` to `core-v3-20261113`. Nazwy rozdziałów i 99 895 dawnych rekordów `outline` pozostawiono dla zachowania historii i adresów; **nie liczą się do zakresu ukończenia**.

## Dziesięć działów
1. Podstawy rachunkowości i matematyka.
2. Dokumenty, faktury, KSeF i rozrachunki.
3. Podatki krajowe VAT, PIT, CIT i PCC.
4. Rozliczenia unijne i międzynarodowe.
5. Kadry, płace i ZUS.
6. Pełne księgi, majątek i sprawozdawczość.
7. Formy prawne, rejestry i zmiany własności.
8. Branżowe zastosowania księgowości.
9. Twórcy internetowi i finansowanie.
10. Excel, analiza i symulator firmy.

## Co istnieje
W dniu zmiany było 96 dawnych lekcji z redakcyjnym statusem `approved` i 9 z `review_needed`. Nie oznacza to ukończenia 105 nowych tematów. Wstępnie przypisano 42 rozłączne materiały po **samych tytułach** i oznaczono ich status w nowej tabeli jako `review_needed`. Wymagają przeglądu treści, merytoryki, ćwiczeń, prawa i zgodności praktyki. Pozostałe tematy są `planned`; żaden nowy temat nie był automatycznie `complete`.

## Widok
Nowa trasa `/program-ksiegowosci` odczytuje z Supabase 100 tematów i pokazuje rozdziały oraz stan faktyczny. `/ksiegowosc` linkuje do nowego programu, a dawny katalog jest jawnie archiwalny. Poprzednie zakładki, postępy i bezpośrednie identyfikatory lekcji pozostają nienaruszone. Trzeba oddzielnie potwierdzić CI, rzeczywisty deployment oraz uwierzytelnioną sesję.

## Zasady zamykania
Każdy temat ma zawierać pełny, odrębny materiał z teorią od zera, 2 rozwiązanymi przykładami, 4 różnorodnymi zadaniami z wyjaśnieniami, tabelą i wykonalnym ćwiczeniem. Liczby sprawdzać niezależnie; polskie przepisy i formularze weryfikować w obowiązującej, właściwej czasowo wersji źródeł urzędowych. Bez sprawdzonego prawa: `review_needed`. Stan `complete` wymaga rzeczowych dowodów, nie samej długości tekstu lub statusu redakcyjnego.

Do publikacji dodatkowo konieczne są niezależne próby nauki, zwykłe autoryzowane sesje dwóch kont, konflikt wersji, test odtworzenia kopii poza produkcją, rzeczywiste testy interfejsu i zamknięcie istotnych ustaleń audytu `release-readiness-509d0364`. Częściowe karty formularzy nie są całymi deklaracjami.

## Termin
**Poniedziałek 16.11.2026 jest celem roboczym i terminem oceny gotowości, nie gwarantowaną datą premiery.** Jeżeli brakuje treści, funkcji albo dowodów, raport musi podać faktyczny stan NO-GO. Bez samodzielnego włączania sprzedaży; cena `99900` groszy i `published=false` pozostają niezmienione.

## Bezpieczeństwo
Nie przenosić płatnej merytoryki, kluczy odpowiedzi, danych kursantów ani sekretów do tego publicznego repo. Zabezpieczony materiał pozostaje w Supabase; przykładów nie tworzy się z rzeczywistych danych klientów. Trzeba zachowywać stare identyfikatory, historię i uprawnienia. Zmiany w bazie wykonuj tylko przy posiadaniu wyłącznej ważnej blokady `encyclopedia-builder`.
