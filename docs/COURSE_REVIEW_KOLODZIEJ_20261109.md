# Trenerki Academy — Kołodziej: audyt kursu (9 listopada 2026)

## Stan i wynik
- Wcześniej: 8 ogólnych lekcji; zbyt mało materiałoznawstwa, technologii, rysunku, przykładów.
- Teraz: **16 indywidualnych lekcji**, `lesson_no=0..15`, podzielonych na 4 moduły.
- Zweryfikowany odczyt Supabase: `lessons=16`, `unique_questions=16`, `five_sections=16`, `four_choices=16`, `four_feedback=16`, `tasks=16`, `revision6=16`, `diagrams=16`.
- Odrębne, wiarygodniejsze odpowiedzi błędne i komentarz dla każdej odpowiedzi. Możliwość zastosowania wiedzy sprawdzana przez obliczenia, rysunki i studia przypadku.
- Grafiki techniczne: `public/academy/assets/kolodziej-{przekroj,drewno,geometria,bicie}.svg`, wpisane do rejestru w `src/LessonIllustratedSections.tsx`.
- Pliki treści: `content/kolodziej-masterclass-20261109-part1.json`, `content/kolodziej-masterclass-20261109-part2.json`.
- Odtwarzalny SQL: `database/patches/trenerki-kolodziej-content-20261109.sql`.

## Moduły i umiejętności
I. Budowa koła, tradycyjne gatunki wiąz/dąb/jesion, obwód, talerzowatość. Uczeń rozpoznaje części i potrafi policzyć podstawową geometrię.

II. Narzędzia (strug do szprych, tokarka, traveler), piasta i gniazda, czopy, szprychy oraz dzwona. Uczeń rysuje przekrój i analizuje łuk vs cięciwę.

III. Obręcz skurczowa — zjawisko bez samodzielnego warsztatowego instruktażu; przyrząd traveler, droga obciążeń, piasta/łożyskowanie, mierzenie bicia i odczytów.

IV. Wilgotność i korozja, zabytkowe i użytkowe koło, BOM i kosztorys, samodzielny projekt demonstracyjny.

Przykładowe obliczenia:
- D=900 mm → C≈2827,43 mm.
- 16 szprych → 22,5°.
- 8 dzwon → łuk≈353,43 mm, cięciwa≈344,42 mm.
- Masa 600 kg / 4 koła → około 1472 N statycznie na koło.
- Koszt 3280 zł i przychód 3500 zł → 220 zł przed pozostałymi kosztami.

## Potwierdzone źródła i ograniczenia
- [Hessenpark — Wheelwrights](https://www.hessenpark.de/en/lexikon/handwerk/vorfuehrungen/wagnerei/)
- [Museum of Early Trades & Crafts — The Wheelwright](https://metc.org/decoding-the-past-wheelwright/)
- [National Museum Wales — Cart wheel](https://museum.wales/collections/online/object/c92c1c74-5534-34bf-91d5-b6ade7331896/Cart-wheel/)
- [Museum of English Rural Life — Shoulder to the Wheel](https://merl.reading.ac.uk/explore/online-exhibitions/shoulder-to-the-wheel/)
- [Winterthur — Traveler](https://dominycollections.winterthur.org/tools-of-the-trade/woodworking/traveler/)
- [Templeton Historical Museum — blacksmith/wheelwright](https://templetonmuseum.com/portfolio-items/blacksmith-shop/)
- [Pemberton Museum — tyre upsetter](https://www.pembertonmuseum.org/objects/tire-upsetter/)

Wszystkie obliczenia mają charakter dydaktyczny; nie są wymiarami pasowań ani certyfikowaną wyceną. Instruktaż internetowy nie uprawnia do pracy z gorącym metalem ani wykonania elementów przewożących ludzi.

## Nadal do wykonania
- Recenzja techniczna przez praktyka kołodziejstwa, kowala i/lub konserwatora.
- Ręczny test wszystkich lekcji z konta ucznia, przejście do egzaminu, zapis postępu, działanie certyfikatu i rozróżnienie edukacji od kwalifikacji.
- Weryfikacja realnego wyświetlania SVG pod adresem produkcyjnego hostingu Expo; zapis w GitHub nie potwierdza wdrożenia.
- Przed sprzedażą jako kurs przygotowania zawodowego niezbędna odrębna kontrola treści i obietnic marketingowych.
- Stan `review_needed`, flaga `published` zachowana bez zmian. Dane kont i płatności bez zmian.

## Kryterium jakości
16 lekcji i 5 sekcji to miernik struktury, **nie dowód profesjonalnej wiedzy**. Każdy problem powinien mieć źródło, definicję, analizę, wynik sprawdzalny i zadanie, a na końcu recenzję oraz E2E.
