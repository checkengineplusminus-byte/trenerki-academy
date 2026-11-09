# Introligator — przebudowa programu i kontrola jakości (2026-11-09)

**Poprzednio:** 8 pobieżnych lekcji, głównie historia zawodu, materiały bez konkretnych ćwiczeń.
**Obecnie:** 12 lekcji, 5 sekcji dydaktycznych na każdą, 12 osobnych pytań i zadań, cztery dodatkowe schematy techniczne oraz projekt końcowy notesu 64-stronicowego.

## Tematy i mierzalne umiejętności
- Anatomia książki: blok, składka, grzbiet, fore-edge, wyklejka, przegub.
- Kierunek włókien papieru i tektury, ich rola w otwieraniu.
- Narzędzia: kostka, szydło, igła, nić, prasa, nóż i kleje.
- Rachunek: 64 strony / 4 strony na arkusz = 16 arkuszy; 4 składki po 4 arkusze.
- Szycie składek, oprawa twarda, przegub, wada odklejonej okładki.
- Dobór kleju, pH papieru i ograniczenia taśm samoprzylepnych.
- Konserwacja zabytków (bez samowolnych ingerencji), przechowywanie, kosztorys i kontrola.

## Źródła
- [University of Toronto — Bookbinding terminology](https://guides.library.utoronto.ca/c.php?g=747378&p=5418809).
- [Cornell Library — basic remedial treatment](https://chinapreservationtutorial.library.cornell.edu/content/basic-remedial-treatment/).
- [Library of Congress — Repairing Your Books](https://guides.loc.gov/preserving-your-books/repairing).
- [Library of Congress — Storage and Preservation](https://loc.gov/preservation/about/faqs/books.html).
- [University of California Berkeley Library Bindery — terms](https://bindery.berkeley.edu/campus-libraries/definitions-common-terms).

## Technika
- Kurs `introligator-tradycja`; zachowano identyfikator, flagę opublikowania i postęp uczniów.
- Zweryfikowano w Supabase 12 lekcji o numerach 0–11, 12 różnych pytań, 12 pięciosekcyjnych treści, cztery odpowiedzi na pytanie.
- Zapis źródłowy `content/introligator-masterclass-20261109-part1.json`, `part2.json`, powtarzalny SQL `database/patches/trenerki-introligator-content-20261109.sql`.
- Rysunki: `introligator-anatomia`, `introligator-wlokna`, `introligator-skladka`, `introligator-przegub`.

## Ograniczenia
- Treści `review_needed`: potrzebna recenzja praktyka, test 12 lekcji z prawdziwego konta i sprawdzenie końcowego egzaminu.
- Brak weryfikacji nowych obrazów w hostingu Expo; commit do GitHub nie dowodzi deployu.
- Kurs nie nadaje uprawnień konserwatorskich. Przedmiot historycznie wartościowy należy oceniać z konserwatorem.
