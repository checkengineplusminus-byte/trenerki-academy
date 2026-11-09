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
