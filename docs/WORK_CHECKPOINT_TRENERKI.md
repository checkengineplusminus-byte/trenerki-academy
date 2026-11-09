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
