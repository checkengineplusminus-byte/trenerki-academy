# Anielka — bezpieczny automat usprawnień

## Co działa
Wiadomości zalogowanych uczniów obsługuje istniejąca funkcja ta-lesson-guide (weryfikacja użytkownika i dostępu do kursu). Część wypowiedzi opisujących błędy, nieścisłości i trudności z rozumieniem jest zapisywana prywatnie w ta_course_feedback.

Jeden proces GitHub Actions (plik .github/workflows/anielka-autofix.yml) uruchamia się co 15 minut: o 07, 22, 37 i 52 minucie godziny. Sprawdza kolejkę w Supabase przez Edge Function ta-feedback-autofix. Token GitHub OIDC jest krótkotrwały i weryfikowany kryptograficznie: issuer, audience, repozytorium, gałąź, workflow i typ zdarzenia. Ani sekret Supabase, ani klucz OpenAI nie jest zapisywany w repozytorium ani we frontendzie.

Model korzysta z istniejącego klucza OPENAI_API_KEY lub OPENAI_KEY_API w Supabase. Nie używa prywatnego konta ChatGPT ani pluginu.

## Ścieżki automatu
1. CONFUSION — po zgłoszeniu tej samej lekcji przez co najmniej dwóch niezależnych uczniów agent może przygotować dodatkowe wyjaśnienie. Pierwszy model korzysta wyłącznie z oryginalnej lekcji. Drugi przebieg sprawdza zgodność z tym materiałem. Tylko niskoryzykowne wyjaśnienia są publikowane automatycznie. Są odrębne od oryginalnego materiału, nie zmieniają egzaminów. Dostęp mają wyłącznie uczestnicy z kursem. Zmiana lekcji źródłowej ukrywa starszą podpowiedź.
2. CONTENT — niezgodności, błędne dane lub wyniki wymagają niezależnej weryfikacji. Agent tworzy zgłoszenie techniczne bez zmieniania prawdy źródłowej, egzaminów lub ocen.
3. BUG — agent analizuje wskazane pliki UI z bardzo krótkiej białej listy. Model może zaproponować jedną małą zmianę. Dopiero gdy przejdzie ona ograniczenia bezpieczeństwa, testy i eksport Expo web, tworzony jest szkic PR. Kod NIE jest automatycznie scalany ani publikowany. Jeśli nie ma pewnej zmiany, powstaje publiczny Issue bez jakiegokolwiek cytatu z wiadomości ucznia.

## Ochrona danych i odporność na nadużycia
Treści od uczniów są traktowane wyłącznie jako DANE. Żaden użytkownik nie może przez wiadomość dodać instrukcji do modelu ani bezpośrednio uruchomić kodu. Agent nie dotyka płatności, autoryzacji, RLS, danych, sekretów ani ocen. Dzienny limit: maksymalnie 24 nowe sprawy. Maksymalnie 1 sprawa na jeden przebieg i 3 próby na sprawę.

GitHub jest publiczny, dlatego PR i Issue zawierają tylko numer lekcji, identyfikator zadania automatu i nazwę kursu. Pełny opis użytkownika jest wyłącznie w prywatnym Supabase.

## Dla administratora
W /admin > Zgłoszenia Anielki można sprawdzić status automatu, czas ostatniego zalogowania przez OIDC, sprawy w toku i odnośniki do Pull Requestów. Jeśli ostatni heartbeat jest starszy niż 50 minut, interfejs ostrzega o błędzie. Zielone testy kodu są konieczne, ale nie potwierdzają jeszcze wdrożenia na żywej stronie.

## Jak zweryfikować
1. Znajdź z sukcesem zakończony przebieg Github Actions pod nazwą TRENERKI Anielka — ciągłe doskonalenie kursów.
2. Zweryfikuj aktualizację public.ta_feedback_autofix_heartbeat.last_success_at w Supabase.
3. Testy lokalne bez sekretów: node --test scripts/test-anielka-autofix-guards.mjs oraz node --experimental-strip-types --test scripts/test-anielka-feedback.mjs.
4. Gdy istnieje zgłoszenie, kontroluj stan w panelu. Nie twórz fikcyjnych zgłoszeń prawdziwych klientów.

## Ważne ograniczenia
6 godzin to cel pierwszej weryfikacji błędu technicznego, nie obiecany termin naprawy. Błędy infrastruktury, płatności, logowania lub systemu egzaminacyjnego pozostają do odrębnej, autoryzowanej kontroli. Żadna wiadomość ucznia nie może automatycznie wdrożyć zmiany kodu produkcyjnego.

Płatne materiały znajdujące się w historii publicznego GitHub także wymagają osobnego zabezpieczenia.
