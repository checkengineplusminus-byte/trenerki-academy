# Ludwisarz — stan pracy 2026-11-09

Kurs 7. Przebudowano 12 lekcji (0–11) z materiałoznawstwa, anatomii dzwonu, rdzenia i płaszcza formy, dekoracji, skurczu, bezpieczeństwa ciekłego metalu, wad odlewu, akustyki, strojenia, mocowań i projektu końcowego.

## QA danych
Supabase: 12 lekcji; 12 różnych pytań; 12 lekcji z pięcioma sekcjami; 12 zestawów czterech odpowiedzi i czterech komentarzy; wszystkie rekordy mają revision=7. Sprawdzono SQL po zapisie. Nie zmieniono postępów, użytkowników, płatności, RLS i publikacji.

## Repozytorium
- `content/ludwisarz-masterclass-20261109-part1.json` — sześć pierwszych lekcji.
- `content/ludwisarz-masterclass-20261109-part2.json` — sześć następnych, commit `63b753b1`.
- `database/patches/trenerki-ludwisarz-content-20261109.sql` — pełny idempotentny patch, commit `0967650d`.
- Sześć schematów `ludwisarz-anatomia`, `forma`, `stop`, `akustyka`, `wady`, `bhp`; rejestr w `src/LessonIllustratedSections.tsx`, commit `ba4fad71`.

## Źródła
- https://heritagecrafts.org.uk/craft/bell-founding/
- https://www.hse.gov.uk/moltenmetals/safety-topics.htm
- https://www.bells.org/how-bells-are-made
- https://www.bells.org/blog/what-is-bell-strike-tone

## Ograniczenia
Treść to dydaktyka, nie instrukcja odlewania ani kwalifikacja zawodowa. Przykłady procentowe, częstotliwości i wymiary są modelowe. Nadal wymagane: ekspercka recenzja technologii i akustyki, test zalogowanego ucznia, weryfikacja egzaminu i certyfikatu, test rzeczywistego renderowania SVG na Expo. GitHub Actions przy ostatnim odczycie: in_progress, nie twierdzić, że CI zakończone.
