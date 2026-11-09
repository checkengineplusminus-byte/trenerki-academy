# Bednarz — zapis przebudowy kursu (2026-11-09)

**Stan przed:** 8 krótkich lekcji, przewaga opisu historii i prostego rozpoznawania przedmiotów.

**Stan po:** 16 merytorycznych lekcji, pięć sekcji każda, 16 indywidualnych pytań 4‑opcyjnych, ćwiczenia techniczne, przykłady obliczeń i osobne informacje zwrotne. Zapisano i zweryfikowano w Supabase. Nie zmieniono identyfikatora kursu ani istniejącego postępu uczniów, nie przeprowadzono ręcznego testu konta użytkownika.

## Działy
1. Podstawy, drewno, narzędzia i geometria (1–4)
2. Przygotowanie klepek, gięcie, denko i diagnostyka (5–8)
3. Przeznaczenie, właściwości sensorialne, higiena i kalkulacja (9–12)
4. Wady, rejestr jakości, konserwacja i projekt końcowy (13–16)

## Obowiązujące źródła techniczne
- [Museum of Early Trades & Crafts](https://metc.org/decoding-the-past-cooper/) — części beczki, rola obręczy i croze.
- [Bouchard Cooperages](https://www.bouchardcooperages.com/wine-barrels-faq) — gatunki dębu i dobór klepek.
- [Saury](https://www.saury.com/en/our-skills/the-stages-of-barrel-making/) — etapy formowania beczki.
- [Australian Wine Research Institute](https://www.awri.com.au/industry_support/winemaking_resources/storage-and-packaging/packaging-operations/barrel-cleaning-storage-and-maintenance/) — ryzyka higieniczne i konserwacja użytkowych beczek.
- [Barrel Associates — jakościowa kontrola](https://www.enotools.com/uploads/2/3/9/7/2397754/barrel_associates_american_oak_quality_control_guidelines.pdf) — kontrola międzyoperacyjna i traceability.
- [Scientific review: wood and toasting](https://pmc.ncbi.nlm.nih.gov/articles/PMC13164676/) — zmiany właściwości przy obróbce cieplnej.

## Kontrola wykonania
- Weryfikacja SQL: 16 rekordów, `lesson_no=0..15`, 16 unikalnych pytań, 16 zestawów czterech odpowiedzi i informacji zwrotnych, 16 lekcji po pięć sekcji, 16 zadań.
- Techniczne schematy SVG w `public/academy/assets/bednarz-{anatomia,geometria,wrega,diagnoza}.svg` i wpisy w `src/LessonIllustratedSections.tsx`.
- Źródłowa zawartość kursu w `content/bednarz-masterclass-20261109-part1.json` i `part2.json`.
- Idempotentny patch SQL: `database/patches/trenerki-bednarz-content-20261109.sql`.

## Co nadal należy sprawdzić
- Ręczny test przejścia od lekcji 1 do 16, zapisu postępu i egzaminu końcowego.
- Odczyt ilustracji SVG z faktycznie opublikowanego hostingu Expo; commit GitHub nie jest dowodem wdrożenia.
- Niezależna ocena fachowca i poziomu dystraktorów.
- Zgodność wymagań formalnych i zasad higieny przy wyrobach użytkowych.

**Status:** pełna przebudowa treści pierwszego kursu w kolejce; `review_needed`. Nie nadawać formalnych uprawnień na tej podstawie.
