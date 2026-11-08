# TRENERKI Academy — checkpoint 2026-11-08

## Aktualny stan zweryfikowany w GitHub/Supabase
- Projekt Supabase: kcvvixcjuwglfvdpypzs.
- Repozytorium: checkengineplusminus-byte/trenerki-academy, gałąź main.
- Katalog: 78 kursów, w tym 9 nowych specjalistycznych programów logistyki/WMS.
- 9 kursów logistycznych po 30 lekcji, zapisanych w tabeli public.ta_lessons i plikach content/logistics-*.json:
  - axapta-dynamics-magazyn
  - sap-ewm-magazyn
  - oracle-wms-cloud
  - manhattan-active-wms
  - blue-yonder-wms
  - infor-wms
  - ongoing-wms
  - astro-consafe-wms
  - sap-tm-transport
- To kursy autorskie, przygotowawcze; nie są oficjalnymi szkoleniami producentów. Status treści: review_needed.
- Ich zakres obejmuje trzy etapy po 10 lekcji, od podstaw do expert.
- Wcześniej dodano 30-lekcyjne programy Windows, Excel, AutoCAD oraz komponent ConceptAtlas.
- Dane o postępie użytkowników należy zachować. Nie usuwać ani nie resetować postępu.
- Autoryzacja: Supabase Auth i RLS. Płatności rzeczywiste i dyplomy/egzaminy końcowe nie zostały jeszcze uruchomione.

## Ostatnia korekta
- GitHub Actions po dodaniu 9 programów wyświetlał fałszywe błędy 8 zamiast 30 lekcji i statycznej liczby wstępów.
- Poprawka scripts/check-content-consistency.mjs: zbiór logisticsSlugs, limit 30 lekcji i dynamiczna kontrola poradników.
- Commit: ff4548ef005a0d9465c1723693d5e3d6f79735eb.
- Do sprawdzenia: wynik Actions z tego commitu oraz status Expo.

## Najważniejsze prace otwarte
1. Dopilnować zielonego CI po ostatnich zmianach. Utrzymać kontrolę również faktycznej kompilacji Expo.
2. Wprowadzać kolejne poprawki w małych commitach, a po dużej zmianie w danych również wykonywać zapytanie weryfikacyjne.
3. Uzupełniać autorskie symulacje ekranów magazynowych i rzeczywiste ćwiczenia przyjęć, lokacji, skanowania, pickingu oraz wysyłki.
4. Egzamin Anielki: weryfikacja na serwerze, unikalne pytania, bez możliwości samodzielnego zaznaczenia zdania egzaminu w przeglądarce.
5. Dyplom po udokumentowanym ukończeniu i zdanym egzaminie z imieniem/nazwiskiem, datą i weryfikowalnym numerem. Nie certyfikat zawodowy.
6. Stopniowo podnosić merytorykę pozostałych kursów do 3 działów po 10 indywidualnych lekcji.

## Standard bezpieczeństwa pracy
- Nie modyfikować cudzych projektów Supabase.
- Nie publikować kluczy tajnych.
- Nie ogłaszać ukończenia wdrożenia, jeśli CI/EAS lub test przeglądarkowy nie zostały potwierdzone.
- Komitować porcjami. Tylko aktywna sesja może pracować; ten plik ułatwia wznowienie, nie uruchamia automatycznej pracy w tle.
