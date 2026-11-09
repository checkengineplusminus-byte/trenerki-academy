# TRENERKI ACADEMY — TRWAŁY PUNKT KONTROLNY
Aktualizacja: 2026-11-09 (Europe/Oslo)
Status: PRACE TRWAJĄ. To zapis stanu, NIE raport ukończenia całej akademii.

## Źródła prawdy
- GitHub: `checkengineplusminus-byte/trenerki-academy`
- Supabase: projekt `kcvvixcjuwglfvdpypzs`
- Dokument audytu wszystkich kursów: `docs/QUALITY_GAP_AUDIT_ALL_80_2026-11-09.md`
- Cieśla: `docs/CIESLA_SOURCE_GAP_AUDIT_20261109.md`; pozostałe materiały pod `content/ciesla-*.json`
- Treści i poprawki pozostałych kursów są w `content/curriculum-depth-*-20261109.json` i `content/assessments-pdf-apartamenty-wspolnota-20261109.json`.

## Ostatni odczyt z bazy
- 80 kursów; 1089 lekcji łącznie.
- 828 lekcji z co najmniej czterema sekcjami; 261 z mniej niż czterema sekcjami.
- Liczba sekcji NIE dowodzi poprawnej merytorycznie treści.
- Cieśla: 63 lekcje; `published=false`; kurs nadal wymaga recenzji.
- Osiem kursów ma pełną czterosekcyjną strukturę według weryfikacji:
  `apartamenty` (8/8), `dostepne-pdf` (8/8), `festyn` (8/8), `kgw` (8/8),
  `lepszy-szef` (8/8), `nie-marnuj-jedzenia` (8/8),
  `obowiazki-domowe` (12/12), `wspolnota` (8/8).
  W trzech z nich (`apartamenty`, `dostepne-pdf`, `wspolnota`) 24 pytania z odpowiedziami zostały indywidualnie poprawione i sprawdzone zapytaniem do bazy.
- Wiele innych kursów jest nadal zbyt płytkich; w testach powtarzają się banalne dystraktory i przewidywalna pozycja prawidłowej odpowiedzi.

## Co faktycznie zapisano
1. Pełny audyt 80 kursów — GitHub (commit `720e2fda`).
2. Rozbudowa PDF, Apartamenty, Wspólnota — GitHub `7df5a01c` i aktualizacja `ta_lessons`.
3. Festyn, KGW, Nie marnuj jedzenia — GitHub `4d1fb489` i aktualizacja `ta_lessons`.
4. Lepszy szef, Obowiązki domowe — GitHub `53c3257d` i aktualizacja `ta_lessons`.
5. Nowe testy PDF/Apartamenty/Wspólnota — GitHub `3aa6dcaf` i aktualizacja `ta_lessons`.
6. Uzupełniono brakującą czwartą sekcję w tych ośmiu kursach; potwierdzono odczytem z Supabase 8/8 albo 12/12.
7. Poprzednio zapisany kurs cieśli i audyt źródeł; 63 lekcje, nieopublikowany.

## Kolejne zadania
- Przeanalizować i indywidualnie uzupełnić pozostałe 261 lekcji z mniej niż 4 sekcjami oraz lekcje strukturalnie długie, ale słabe merytorycznie.
- Poprawić nieintuicyjne lub zbyt łatwe testy we wszystkich pozostałych kursach; losować pozycje odpowiedzi przy zachowaniu prawidłowego indeksu.
- Dla kursów programów komputerowych dać prawdziwe nazwy menu i interaktywne, działające ćwiczenia wersji programu.
- Dla rzemiosł dodać pełne materiałoznawstwo, rysunki, narzędzia, procesy i ćwiczenia.
- W kursach prawnych, finansowych, zdrowotnych i rodzinnych zweryfikować źródła i granice porad.
- Przed ogłoszeniem końca pracy wykonać testy E2E, w tym progres, egzamin, konto ucznia, i potwierdzić publikację Expo.
- Nie usuwać ani nie resetować progresu, kont, faktur lub zamówień.
- Nie wystawiać słabych kursów jako certyfikowane zawodowo.

## Zasada zapisu podczas kontynuacji
Po każdej serii zmian zapisać źródła w repozytorium i potwierdzić wynik zapytaniem Supabase. Aktualizować TEN plik kolejnymi seriami (z nowym wynikiem audytu, commitami i listą braków), zamiast polegać na historii czatu. Przed kolejną sesją odczytać ten plik i aktualny stan DB; nie zakładać, że wszystko opisane jako plan zostało zrealizowane. Żadnych fikcyjnych deklaracji wdrożenia.


## SERIA „JEDEN KURS PO DRUGIM” — zapis 2026-11-09

**Kurs 1: Bednarz — przebudowa treści ukończona, wymaga recenzji i wdrożenia**
- Przed: 8 lekcji; obecnie **16** kolejnych lekcji `0..15`; 16× po pięć rozbudowanych sekcji, 16× cztery odpowiedzi, 16 indywidualnych tematów i zadania samodzielne.
- Potwierdzenie: odczyt Supabase `n=16`, `five_sections=16`, `questions=16`, `four_options=16`, `tasks=16`, `curriculum_revision=3`.
- Nowe schematy: `bednarz-anatomia`, `bednarz-geometria`, `bednarz-wrega`, `bednarz-diagnoza`. Dodano rejestr odczytu SVG, ale **nie potwierdzono jeszcze publikacji najnowszych plików przez Expo**.
- Rewizja: GitHub `content/bednarz-masterclass-20261109-part1.json` (commit `25ed980f`), `part2.json` (`ad12e409`), grafiki i rejestr (`19108af3`). Odtwarzalny SQL `database/patches/trenerki-bednarz-content-20261109.sql` (`4ea1bc85`). Szczegóły: `docs/COURSE_REVIEW_BEDNARZ_20261109.md` (`612c469c`).
- Metadane programu i zajawka zostały zsynchronizowane w Supabase, status recenzji `review_needed`, bez zmiany `published`, postępów lub płatności.
- Pozostaje: pełny test zalogowanego ucznia lekcje 1–16 → egzamin → dyplom, potwierdzenie grafiki z hostingu oraz recenzja profesjonalnego bednarza. **Nie przedstawiać jako formalnie ukończonego lub zawodowo zatwierdzonego kursu.**
- Zasada następnego kursu: osobna treść i metodologia dopasowana do zawodu; po każdym kursie obowiązkowe DB verify + GitHub source + SQL patch + dopisanie checkpointu.


**Kurs 2: Garncarz — przebudowa treści ukończona, wymaga recenzji i deployu**
- Przed 8 lekcji; teraz 12 kolejnych lekcji `0..11` z pięcioma sekcjami każda, 12 różnymi pytaniami i czterema odpowiedziami. Supabase QA: `lessons=12, sections5=12, unique_q=12, four_choices=12, revised=12`.
- Kurs indywidualny: gliny, szamot, plastyczność, centrowanie, płaty i wałki, obliczenia skurczu, suszenie, biskwit, szkliwienie i angoba, wymagania bezpieczeństwa oraz rozpoznawanie crazing/shivering.
- GitHub: `content/garncarz-masterclass-20261109-part1.json` (`d83a0efc`), `part2.json` (`940caa8f`), schematy SVG i rejestr (`0996ee7d`), `database/patches/trenerki-garncarz-content-20261109.sql` (`f2408b35`), raport `docs/COURSE_REVIEW_GARNCARZ_20261109.md` (`e1ec9cc2`).
- Metadane Supabase zaktualizowane; publikacji nie zmieniano. Nie dotykano postępów ani płatności.
- **Nadal brak**: testu konta i egzaminu, recenzji fachowej, potwierdzenia grafik w Expo. Nie przedstawiać jako formalnego świadectwa zawodowego.


**Kurs 3: Introligator — przebudowa treści ukończona, czeka na recenzję i deploy**
- Dawniej 8 krótkich lekcji, obecnie 12 indywidualnych (0–11). QA Supabase: `lessons=12, five_sections=12, unique_q=12, four_choices=12, revision=3`.
- Własne działy: anatomia książki, kierunek włókien papieru i tektury, narzędzia, folio i składki, szycie, oprawa twarda i przegub, diagnostyka, kleje i pH, konserwacja, przechowywanie, budżet i projekt notesu.
- GitHub: `content/introligator-masterclass-20261109-part1.json` (`b7f3aeec`), `part2.json` (`580b1e26`), schematy i ich rejestr (`ebb8625d`), SQL `database/patches/trenerki-introligator-content-20261109.sql` (`15370220`), raport `docs/COURSE_REVIEW_INTROLIGATOR_20261109.md` (`7a7da968`).
- Zmieniono treść i metadane, nie resetowano postępów ani nie zmieniano flagi publikacji. Kurs ma nadal `review_needed`, wymaga eksperckiej recenzji i testu całości na opublikowanym Expo.

**Następny kurs do podjęcia:** `gontarz` (obecnie 8 lekcji, 4 wymagają głębszej struktury), a potem pozostałe kursy z `docs/QUALITY_GAP_AUDIT_ALL_80_2026-11-09.md`. W każdej sesji w pierwszej kolejności odczytać świeży Supabase i checkpoint — nie zakładać niezmienności starej listy.


## Harmonogram kontynuacji — aktualny stan
- 2026-11-09 zmieniono istniejącą automatyzację „Trenerki — kurs po kursie” z codziennej na **co godzinę, bez automatycznego końca harmonogramu**. Aktualny RRULE `FREQ=HOURLY`, strefa `Europe/Oslo`.
- Nie jest możliwe automatyczne samowznawianie po 10 minutach bezczynności — minimalna częstotliwość uruchamiania wynosi godzinę. Zawsze jednak po nowym uruchomieniu odczytaj ten checkpoint i DB, kontynuuj kolejny kurs, nie czekając na ręczne „kontynuuj”.
- Każdy kurs dokumentuj osobno: GitHub content + odtwarzalny SQL + weryfikacja Supabase + ilustracje + aktualizacja tego checkpointu + status testów. Nie powtarzaj już opracowanych kursów.
- **Powiadomienie końcowe:** Dopiero gdy rzeczywiście opracowano 80/80 indywidualnych kursów, wyślij użytkownikowi wiadomość z potwierdzeniem i listą niezakończonych recenzji oraz testów E2E/Expo. Nie traktuj numeru iteracji automatyzacji jako dowodu ukończenia.
- Automatyczne uruchomienie może nie wykonać zadania, np. z powodu połączenia lub ograniczeń narzędzi. Zapisuj błędy w checkpoint zamiast twierdzić, że praca została wykonana.

**Kurs 4: Gontarz — przebudowa treści zapisana, recenzja i E2E wymagane**
- Przed 8 ogólnych lekcji, teraz **12** o numerach `0..11`; 12× pięć sekcji, 12 odrębnych pytań, 12 zestawów czterech odpowiedzi z feedbackiem i 12 zadań. QA Supabase potwierdziła `lessons=12`, `five_sections=12`, `unique_questions=12`, `four_options=12`, `four_feedback=12`, `tasks=12`, `revision4=12`.
- Program indywidualny: rodzaje gontów, gatunki i włókna, łupanie/cięcie, rysunek i obliczanie połaci, ekspozycja, mijankowe styki, obróbki, wilgoć i wentylacja, diagnozowanie wad, renowacja zabytków, BHP na wysokości i obmiar.
- GitHub `content/gontarz-masterclass-20261109-part1.json` (`0871fab3`), `part2.json` (`67cfa047`); cztery techniczne schematy i komponent (`62e4ac4b`); odtwarzalny patch `database/patches/trenerki-gontarz-content-20261109.sql` (`b5762f63`), audyt `docs/COURSE_REVIEW_GONTARZ_20261109.md` (`bdcc3710`).
- Weryfikacja merytoryczna eksperta, przejście zalogowanego ucznia i potwierdzenie deployu Expo są nadal **niezakończone**. Nie zmieniano flag opublikowania, danych użytkownika, postępów ani płatności.
- **Kolejny kurs:** sprawdź obecny stan `kaletnik-tradycja` w Supabase, a jeśli nadal nieprzebudowany, rozpocznij od jego specyficznego materiałoznawstwa, konstrukcji i pomiarów. Upewnij się, że licznik kursów odpowiada faktycznemu checkpointowi, nie tylko liczbie lekcji.


**Kurs 5: Kaletnik — przebudowa treści w Supabase, wymagane recenzja i E2E**
- Wcześniej 8 lekcji, teraz **12** (0–11) o anatomii skóry, garbowaniu, grubości, rozkroju, portfelach, narzędziach, szyciu, klejach, wykończeniu, okuciach, diagnostyce i kosztorysie.
- Potwierdzenie Supabase: `lessons=12`, `five_sections=12`, `unique_questions=12`, `four_options=12`, `four_feedback=12`, `tasks=12`, `revision5=12`, rozłożenie prawidłowych odpowiedzi `[2,3,1,0,2,1,3,2,0,1,3,2]`.
- GitHub: `content/kaletnik-masterclass-20261109.json` (`c0f02500`), odtwarzalny SQL `database/patches/trenerki-kaletnik-content-20261109.sql` (`989de973`), 4 nowe SVG i ich rejestr (`e68da302`), raport `docs/COURSE_REVIEW_KALETNIK_20261109.md` (`b8d7c472`).
- Bez zmian kont, postępów, zakupów, RLS i publikacji. `review_status=review_needed`. **Nie wykonano** fachowej recenzji, testów E2E/egzaminu ani potwierdzenia deployu Expo. Ostatni CI był queued; nie twierdzić, że kompilacja przeszła.
- **Następny kurs:** zweryfikuj w Supabase i audycie `kolodziej`; jeśli jeszcze nieprzebudowany, opracuj go indywidualnie. Nie powtarzaj kursów 1–5.


**Kurs 6: Kołodziej — indywidualna przebudowa treści ukończona, recenzja i E2E nadal wymagane**
- Poprzednio 8 powierzchownych lekcji, teraz **16** kolejnych (`lesson_no 0..15`) w 4 modułach. Uczeń poznaje piastę, szprychy, dzwona i obręcze, wiąz/dąb/jesion, rysunek, obwód, łuki, cięciwy, talerzowatość, narzędzia, gniazda i czopy, przyrząd traveler, metalową obręcz, obciążenia, bicie, konserwację, kosztorys i projekt końcowy.
- **Zweryfikowane w Supabase**: `lessons=16`, `first=0`, `last=15`, `unique_questions=16`, `five_sections=16`, `four_choices=16`, `four_feedback=16`, `tasks=16`, `revision6=16`, `diagrams=16`.
- GitHub: `content/kolodziej-masterclass-20261109-part1.json` i `part2.json`, aktualizacje pytań `0d04d281` i `309b7359`. Cztery techniczne SVG i rejestr nazw `9b259f05`. SQL odtworzeniowy `database/patches/trenerki-kolodziej-content-20261109.sql` (`f6cd35bf`), raport źródeł i braków `docs/COURSE_REVIEW_KOLODZIEJ_20261109.md` (`2573d9c7`).
- W Supabase `review_status='review_needed'`, flaga publikacji bez zmian; NIE dotykano kont, płatności, postępów i uprawnień. Przykłady obliczeń są edukacyjne, a nie dopuszczeniem koła do ruchu.
- **Nadal nieukończone**: recenzja specjalisty, test zalogowanego ucznia do egzaminu i certyfikatu, potwierdzenie publikacji schematów na Expo oraz ręczna weryfikacja dydaktyczna.
- **Następny do weryfikacji**: `ludwisarz` (o ile aktualny Supabase i checkpoint nie potwierdzają wcześniejszej przebudowy). Nie rozpoczynaj ponownie kursów 1–6.


**Kurs 7: Ludwisarz — treść przebudowana, recenzja i E2E wymagane (2026-11-09)**
- Przed: 8 lekcji, w tym 2 stare. Teraz: **12 lekcji (0–11)** z pełną strukturą, materiałoznawstwem, formą, skurczem, BHP, wadami, akustyką, strojeniem, zawieszeniem i projektem.
- Zweryfikowany Supabase: `n=12, unique_q=12, sections5=12, options4=12, feedback4=12, revised=12`. Zapis nie zmieniał kont, postępów, płatności, RLS ani flag publikacji.
- GitHub: `content/ludwisarz-masterclass-20261109-part1.json` i `part2.json` (druga `63b753b1`), odtwarzalny SQL `database/patches/trenerki-ludwisarz-content-20261109.sql` (`0967650d`), 6 SVG oraz rejestr (`ba4fad71`), audyt `docs/COURSE_REVIEW_LUDWISARZ_20261109.md` (`01e844fc`).
- GitHub Actions dla ostatnich commitów **in_progress**. Nadal brak recenzji odlewnika i stroiciela, testu konta ucznia, egzaminu, certyfikatu i potwierdzenia widoczności SVG na Expo. Nie oznaczać kursu jako w pełni zweryfikowanego.
- **Następny kurs do wybrania w kolejnym uruchomieniu**: `mlynarz-tradycyjny` po ponownym odczycie checkpointu i Supabase. Nie powtarzać kursów 1–7.


**Kurs 8: Młynarz tradycyjny — opracowanie treści zapisane (2026-11-09)**
- Z 8 ogólnych lekcji do **12 indywidualnych** z pięciosekcyjną strukturą: budowa ziarna, czyszczenie, kamienie, przekładnia, rowki i zużycie, wyciąg, popiół, wybuchowość pyłu, składowanie, jakość mąki, diagnostyka i projekt.
- Zweryfikowano Supabase: `lessons=12`, `first=0`, `last=11`, `unique_questions=12`, `five_sections=12`, `four_options=12`, `revision8=12`. Status `review_needed`.
- GitHub: `content/mlynarz-masterclass-20261109-part1.json` (commit `90cba171`), `part2.json` (`2abdf6be`); cztery oryginalne rysunki i rejestr (`1ddf2555`); idempotentny SQL `database/patches/trenerki-mlynarz-content-20261109.sql` (`46b1cc54`) oraz audyt `docs/COURSE_REVIEW_MLYNARZ_20261109.md` (`bde98a3c`).
- Nie zmieniono uprawnień, kont, płatności, postępów ani flag publikacji. Wciąż potrzebne: recenzja ekspercka, test 1–12 do egzaminu na zalogowanym koncie, kontrola jakości dystraktorów i potwierdzenie deployu Expo. 
- **Następny kurs**: zweryfikować aktualny stan `plecionkarz` i wybrać dopiero po odczycie najnowszego checkpointu i Supabase. Nie dublować kursów 1–8.


**Kurs 9: Plecionkarz — osiem lekcji merytorycznie przebudowanych (2026-11-09)**
- W Supabase poprawiono osiem istniejących lekcji: surowce i dobór wikliny, nawilżanie, dno, splot prosty, dwu- i trzyprętowy, geometria i obliczenia, brzeg i uchwyt, kontrola jakości i kosztorys. Każda ma pięć sekcji, zadanie praktyczne, indywidualne pytanie, cztery odpowiedzi i komentarze.
- SQL odtwarzalny: `database/patches/trenerki-plecionkarz-content-20261109.sql` (commit `fe7277e56ea657cd9534b11c4daee40f55685420`). Zmiany zapisano w bazie; istniejące konta, zakupy, postępy i RLS pozostały nietknięte.
- **Ograniczenia:** materiały są robocze i wymagają recenzji mistrza plecionkarstwa; brak nowych technicznych SVG, weryfikacji E2E egzaminu/certyfikatu, deployu Expo i fachowej kontroli źródeł. Nie oznaczać kursu jako ostatecznie ukończonego ani wszystkich 80 jako gotowych. Następny kurs `powroznik`.


## Uaktualnienie: Plecionkarz i tryb przyspieszony (9 listopada 2026)
- Żądanie użytkownika: **cel 40 kursów na godzinę**, bez sztucznego zatrzymywania pracy po jednym kursie. Zmodyfikowano włączoną automatyzację godzinową: **do 40 kursów na uruchomienie, ale wyłącznie faktycznie zapisanych i sprawdzonych**. Technicznie nie jest dostępny cykl startu częściej niż raz na godzinę. Nie gwarantować liczby 40, gdy jakość lub limity wykonania nie pozwalają. Zapis po KAŻDYM kursie.
- **Kurs 9: Plecionkarz — 16 lekcji w Supabase, nie 8.** Pierwotny wpis niżej powstał w równoległej sesji po ośmiu lekcjach i jest już nieaktualny. Aktualny stan bazy: lekcje `0..15` z `curriculum_revision=9`, 16 pytań indywidualnych, po 5 sekcji, opcje i informacje zwrotne.
- GitHub: `content/plecionkarz-masterclass-20261109-part1.json` (commit `b577bf33`), `part2.json` (`0093a435`), pięć autorskich schematów i rejestr `src/LessonIllustratedSections.tsx` (commit `22b50d34`), patch `database/patches/trenerki-plecionkarz-content-20261109.sql` (commit `141176bc`, **obowiązujący, 16 lekcji**), raport `docs/COURSE_REVIEW_PLECIONKARZ_20261109.md`.
- Odnotowano konflikt równoległego zapisu: pierwotny patch GitHub opisywał tylko 8 lekcji, dlatego został zastąpiony pełnym idempotentnym patchem 16 lekcji. Unikaj nadpisywania nowszych danych niepełnymi wersjami.
- Publikacja i dane uczniów bez zmian. **Nadal wymagane** recenzja eksperta, test konta do egzaminu, QA dystraktorów i wdrożenia Expo; nie deklarować pełnego zamknięcia.
- Następny `powroznik`; przed edycją sprawdź aktualną DB i checkpoint, aby nie dublować równoległego uruchomienia.


## Kurs 10: Powroźnik — 12 lekcji zapisanych i sprawdzonych (2026-11-09)
- **Stan przed:** 8 ogólnych lekcji. **Stan po:** 12 osobnych lekcji `0..11` z pięcioma sekcjami, źródłami, przykładami i zadaniami. Supabase QA: `n=12`, `uq=12`, `five_sections=12`, `options4=12`, `feedback4=12`, `revised=12`.
- Program: włókna konopie/len/sizal/manila; włókno→przędza→pasmo→lina; S/Z; ropewalk; skrócenie i masa; typy lin; skok skrętu; kontrola uszkodzeń; zakończenia; różnica MBL/obciążenie robocze; przechowywanie; projekt demonstracyjny. Brak deklaracji udźwigu bez dokumentacji i certyfikacji.
- GitHub: `content/powroznik-masterclass-20261109-part1.json` (`8c9a5955`), `part2.json` (`58b370d2`), `part3.json` (`896ffa3d`). Cztery diagramy SVG i rejestr (`e146148c`), SQL `database/patches/trenerki-powroznik-content-20261109.sql` (`cc4d9770`), raport `docs/COURSE_REVIEW_POWROZNIK_20261109.md` (`bf4c3fed`).
- Status `review_needed`. **Pozostało**: niezależna recenzja powroźnika i specjalisty od lin, test zalogowanego użytkownika (lekcje→egzamin→certyfikat), potwierdzenie Expo. CI pierwszych trzech części i SVG `success`; CI ostatnich patch/doc było jeszcze `in_progress` w chwili kontroli, nie oznaczaj ich jako zakończone.
- Dane uczniów, postępy, konta, płatności, RLS i status publikacji pozostawiono bez zmian.
- **Stan serii:** 10 z 80 indywidualnie przebudowanych kursów. Następny do sprawdzenia: `rymarz` (po odczycie aktualnego checkpointu i bazy). Cel automatyzacji: do 40 kursów w jednym uruchomieniu, bez obniżania jakości i bez fałszywych deklaracji.
