# Gontarz — audyt i zapis przebudowy 2026-11-09

**Etap:** 4. kurs w serii Trenerki. Poprzednio 8 ogólnych lekcji. Teraz 12 indywidualnie zaprojektowanych lekcji z 5 sekcjami, 12 różnymi pytaniami, czterema wariantami odpowiedzi i zadaniem praktycznym każda. Zapisy rzeczywiście wykonano w Supabase (`course_slug=gontarz`).

## Zakres merytoryczny
1. Rodzaje gontów drewnianych; regionalne typy takspon, takflis, stikker.
2. Gatunki, kierunek włókien, sęki i wpływ wilgotności na trwałość.
3. Wytwarzanie łupane i cięte, narzędzia, szablony i kontrola partii.
4. Spadek 4:12, `arctan(4/12)≈18,4°`, przykład Pitagorasa 3,0 m + 1,0 m → 3,162 m po skosie.
5. Zakłady i ekspozycja — model `L/E=400/120≈3,33`, bez przypisywania przykładowej wartości jako bezwzględnej normy.
6. Przesunięcia styków bocznych i dobór właściwych łączników.
7. Okap, kosz, kalenica, komin i obróbki.
8. Wentylacja i ryzyko kondensacji w warstwach.
9. Diagnoza pęknięć, deformacji, degradacji i korozji.
10. Konserwacja oryginalnego regionalnego pokrycia.
11. Norweskie podejście do BHP pracy na wysokości — fachowa ocena i ochrona zbiorowa.
12. Projekt końcowy: uproszczone 12 m² / 0,012 m² = 1000 gontów; przy 10% odrzutu `ceil(1000/0,9)=1112` kandydatów przed rzeczywistymi detalami.

## Dowody i źródła
- [Store norske leksikon — takspon](https://snl.no/takspon)
- [Bygg og Bevar — tradycyjne materiały](https://byggogbevar.no/pusse-opp/tak-og-tekking/artikler/tradisjonelle-tekkematerialer/)
- [Bygg og Bevar — konserwacja flistak](https://byggogbevar.no/pusse-opp/tak-og-tekking/artikler/vedlikehold-av-flistak/)
- [Cedar Shake & Shingle Bureau — manual](https://www.cedarbureau.org/installation/roof-installation-manual/)
- [IBHS — inspekcja gontów i mocowania](https://ibhs.org/guidance/ricowi-roof-guide-cedar-shingles-and-shakes/)
- [Arbeidstilsynet — praca na dachu](https://www.arbeidstilsynet.no/risikofylt-arbeid/arbeid-i-hoyden/unnga-fall-ved-arbeid-pa-tak/)
- [Badanie naukowe — łupane vs cięte](https://www.sciencedirect.com/org/science/article/pii/S2772318622000029)

Źródła z USA/Kanady **nie zastępują** lokalnych przepisów i projektów. Instrukcje dotyczą konkretnych systemów i klas, nie stanowią ogólnego pozwolenia na pracę.

## Rejestr techniczny
- Treść: `content/gontarz-masterclass-20261109-part1.json` i `part2.json`.
- Schematy: `public/academy/assets/gontarz-{warstwy,spadek,szczeliny,wlokna}.svg`.
- Komponent: `src/LessonIllustratedSections.tsx` rozszerzony o nowe nazwy ilustracji.
- Odtwarzalny SQL: `database/patches/trenerki-gontarz-content-20261109.sql`.
- Wynik weryfikacji Supabase: 12 lekcji (0–11), 12 razy 5 sekcji, 12 unikalnych pytań, 12 kompletów po 4 opcje i 4 wyjaśnienia, 12 samodzielnych zadań, `curriculum_revision=4`.
- Bez dotykania ta_learning_progress, płatności, kont, uprawnień oraz flag publikacji.

## Status i następne kontrole
Status `review_needed`. Nadal wymagane: recenzja projektanta/dekarza/konserwatora odpowiednio do tematu, test ścieżki 1–12 przez zalogowanego ucznia, test egzaminu i poprawności certyfikatu, potwierdzenie publikacji plików SVG przez Expo. Zielone CI GitHub nie oznacza zaliczenia tych kontroli. Prawdziwa praca na dachu wymaga BHP i fachowego nadzoru; kurs nie nadaje uprawnień zawodowych.
