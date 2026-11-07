# TRENERKI Academy
Praktyczna nauka online — 8 etapów, testy, rozmowa sytuacyjna i certyfikat PL/EN. 

## Status
Projekt w przygotowaniu. **Nie przyjmuje płatności ani nie wydaje prawdziwych certyfikatów.**

Repozytorium jest obecnie **PUBLICZNE**. Pełna wersja demonstracyjna zawiera treści szkoleń, bazę pytań i odpowiedzi. Te materiały nie powinny zostać opublikowane w publicznym repozytorium ani wykorzystywane w produkcyjnym egzaminie po stronie przeglądarki.

## Expo Web
Docelowo: Expo Router + Expo Hosting. Stary interfejs HTML zachowujemy w podkatalogu `public/academy/` podczas etapowej migracji.

Wymagane przed produkcją:
- przełączyć repozytorium na **Private**;
- przesłać pełne źródła i wykonać `npm install && npx expo export --platform web`;
- połączyć projekt z kontem Expo i wykonać `npx eas-cli@latest deploy`;
- podłączyć prawdziwe konta, uprawnienia, Supabase Auth, Stripe i bezpieczną bazę egzaminów;
- zweryfikować treści z ekspertami i dokumenty prawne.

## Prawa i dane
Prototyp zachowuje stare teksty oraz wygląd TRENERKI. Nie kopiujemy cudzych kursów. Dokumenty prywatne są robocze i wymagają prawnego przeglądu przed sprzedażą.

Wersja przygotowanej paczki: `0.4.0`, 7.11.2026.
