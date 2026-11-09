# Kaletnik — audyt 2026-11-09

Status: przebudowa treści 12 lekcji (0–11) w Supabase, **review_needed**. Wcześniej 8 lekcji o zbyt ogólnej strukturze.

## Treść
1. Anatomia skóry: lico, dwoina i powłoki.
2. Garbowanie roślinne i chromowe, wykończenie i wpływ na produkt.
3. Jednostki grubości: 1 oz ≈ 0,396875 mm, stos warstw.
4. Rozkrój: kierunek włókien, wykorzystanie powierzchni i odpady.
5. Konstrukcja portfela, kieszenie, luz, zagięcia.
6. Warsztat: narzędzia, kolejność operacji i bezpieczeństwo.
7. Ścieg siodlarski, rozstaw otworów: 12 otworów co 4 mm = 44 mm od pierwszego do ostatniego.
8. Kleje, karty SDS, warunki utwardzenia.
9. Ścienianie i wykończenie krawędzi.
10. Okucia, sprzączki i koncentracja naprężeń.
11. Diagnozowanie uszkodzeń i odbiór jakościowy.
12. Projekt portfela: papierowy prototyp, karta odbioru, modelowy koszt 182,50 zł przed zyskiem i podatkami.

## Źródła
- https://tandyleather.com/fr/blogs/tandy-blog/leather-weight-thickness-chart — tabela grubości.
- https://www.ianatkinson.net/leather/learn/leatherguide.htm — przewodnik materiałowy i techniki.
- https://www.leatherworkinggroup.com/certification/leather-manufacturer-standard/ — środowiskowe i chemiczne aspekty produkcji skóry.
- https://www.leatherworkinggroup.com/our-impact/traceability/ — pochodzenie materiału.
Wymagana recenzja fachowa; źródła nie są certyfikacją ucznia.

## Techniczne potwierdzenie
- JSON: `content/kaletnik-masterclass-20261109.json` (commit `c0f02500`).
- Odtwarzalny SQL: `database/patches/trenerki-kaletnik-content-20261109.sql` (commit `989de973`).
- Cztery SVG: `public/academy/assets/kaletnik-{przekroj,szew,portfel,grubosc}.svg` (commity `68b3c24b`, `f63c0b94`, `80a504b4`, `9fa91e40`).
- Rejestr obrazów w `src/LessonIllustratedSections.tsx` (commit `e68da302`).
- QA Supabase: `lessons=12`, `first=0`, `last=11`, `unique_questions=12`, `five_sections=12`, `four_options=12`, `four_feedback=12`, `tasks=12`, `revision5=12`. Prawidłowe odpowiedzi mają zróżnicowane indeksy `[2,3,1,0,2,1,3,2,0,1,3,2]`.
- Pozostawiono flagę publikacji, konta, progres, zakupy i RLS bez zmian.

## Ograniczenia
- Nie wykonano testu zalogowanego ucznia, egzaminu, certyfikatu, testu wyświetlania SVG w Expo ani recenzji zawodowego kaletnika.
- CI dla ostatniego commitu było `queued` w chwili kontroli. Nie deklarować przejścia kompilacji.
- Teksty nadal wymagają redakcyjnego przeglądu pod kątem powtórzeń i jakości pytań; strukturalne QA nie dowodzi wysokiej wartości edukacyjnej.
