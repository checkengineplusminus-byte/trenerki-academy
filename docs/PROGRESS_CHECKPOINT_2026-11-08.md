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


## 2026-11-08 — bez pomijania etapów, konwersacyjna Anielka
- UI: usunięto przycisk `Pomiń na razie` i notatnik z `app/nauka.tsx`.
- Kolejna lekcja nie jest dostępna z mapy lekcji, dopóki poprzednia nie jest ukończona. Można powtarzać już ukończone.
- Dodano `src/GuidedDialogue.tsx`: osobna rozmowa z Anielką w każdej lekcji, imię bez nazwiska, treść z aktualnego kursu, minimum dwie merytoryczne wypowiedzi.
- Nowa funkcja Supabase `ta-lesson-guide` (ACTIVE, verify_jwt=true) przechowuje prywatne wypowiedzi w `ta_lesson_dialogues`. Zaliczenie sprawdza na serwerze kolejność, wypowiedzi i wymagane ćwiczenia.
- Od zwykłych błędów i frustracji nie ma kar. Ograniczenie rozmowy ma dotyczyć dopiero skrajnych i powtarzających się nadużyć; jest 30-minutowe, nie usuwa zaliczonego materiału.
- Migration `lock_learning_progress_writes_to_verified_server`: role `anon` i `authenticated` nie mogą już bezpośrednio wstawiać ani zmieniać zaliczeń w `ta_learning_progress`; pozostał odczyt właściciela. `service_role` zachowuje zapis zweryfikowanych zaliczeń.
- Zweryfikowano SQL: direct authenticated INSERT=false, UPDATE=false, SELECT=true, service_role INSERT=true. Stare 39 rekordów postępu zachowane.
- GitHub Actions run 42477655059: web_bundle=success, content_integrity=success; publikacja Expo potwierdzona stanem success.
- Commity: backend `74de922700f63710102e1f4717feeab7e5b7b75b`, dialog UI `a24b5f0a787b1ad500192f935effbeb9e595cf0c`, nawigacja bez pomijania `e0c0319d311db92f191f56c0b1ffde6e20ca8112`.

### Pozostałe ważne sprawdziany
- Rzeczywisty test zalogowanego ucznia i rozmowy (nie potwierdzono end-to-end z kontem użytkownika).
- Głębsze zabezpieczenie zapisu `ta_learning_attempts`: próby ćwiczeń nadal mogą być przesyłane bezpośrednio przez klienta; obecny serwer sprawdza ich obecność, a nie niezależnie poprawność.
- Zweryfikować aktualny status tajnego klucza `OPENAI_API_KEY` i działanie limitu rozmów; nie ogłaszać uruchomionej oceny bez realnego testu.
- Weryfikacja ochrony przed omijaniem przez inne klienty i kontrola tempa / kosztów zapytań AI.


## 2026-11-08 — naprawy pełnych kursów, AI, egzaminów i dyplomu (późna sesja)
- **Prawdziwy stan Supabase przed zmianami:** `ta_certificates=0`, `ta_exam_results=0`, `ta_exam_sessions=0`, `ta_learning_progress=39`, `ta_lesson_dialogues=0`. Nie wolno mówić, że dyplom przeszedł prawdziwy test E2E.
- **Usunięta regresja obrazów:** `src/LessonIllustratedSections.tsx` pokazywał tylko schemat zamiast obrazka, kiedy lekcja nie miała `material.sections`; wyeliminowano przedwczesny return.
- **Wstęp do czterech programów:** `src/SoftwareOrientation.tsx` dostarcza historię, zastosowania, mapę menu, słownik podstaw i praktyczny simulator w pierwszej lekcji. W Excel i AutoCAD dostępny od razu `HandsOnLab` reagujący na polecenia. Word/Windows mają bezpieczne ćwiczenie. `src/CourseIntro.tsx` zawiera zweryfikowane fakty o 1983 Word, 1985 Excel, 1982 AutoCAD.
- **Baza wiedzy:** 30 lekcji Word, 30 Excel i 30 AutoCAD otrzymało po 4 unikatowe sekcje (teoria, przypadek, zadanie, błąd). Pierwsze 10 każdego kursu rozwinięto znacznie szerzej. Wszystkie trzy źródłowe JSON zapisane na GitHub i zaktualizowane materiały w Supabase; stare postępy zachowane. 30 Windows ma po 3 sekcje. Łącznie 120 lekcji podstawowych programów z rozbudowaną teorią.
- **Grafiki:** dziesięć nowych poglądowych, oryginalnych schematów o DOCX/PDF i stylach Worda, komórkach, formułach i wykresach Excela oraz jednostkach, warstwach, komendach i formatach AutoCAD; ilustracje przypisane do konkretnych lekcji, testy integralności wymagają ich obecności. Są to autorskie schematy, NIE rzeczywiste screenshoty producentów.
- **Dyplom:** w `ta-exam` (Supabase ACTIVE v4) serwerowa alternatywa oceny na pytaniach wyboru, gdy AI niedostępne. Co najmniej 8 pytań w każdym z 79 kursów; weryfikacja poprawnej odpowiedzi wyłącznie po stronie serwera, pięć poprawnych + finał, dodatkowa szansa, limit niepowodzeń. Tryb oral AI zachowany, użytkownik może przełączyć na bezpieczny tryb alternatywny. Dodano odzyskanie zapisu zdanej sesji i dokumentu po chwilowym błędzie wydania.
- **Dyplom WWW:** osobna drukowalna strona A4 z imieniem, nazwiskiem, nazwą kursu, datą i numerem; jasno opisuje brak uprawnień zawodowych. W `moje-kursy` dostępny podgląd testowego wzoru bez fałszywego wpisu w bazie. Egzamin Anielki przeniesiony wyżej w widoku `nauka` — nie trzeba szukać go pod całą lekcją.
- **Anielka:** `ta-lesson-guide` (ACTIVE v2) uwzględnia poprzednie trudne tematy i wyniki. Przy aktywnym poprawnym kluczu OpenAI korzysta z AI; w razie braku/awarii przechodzi do jasno oznaczonego przewodnika z regułami, bez udawania modelu AI. Zaliczenia nadal wymagają odpowiednich ćwiczeń i chronologicznego postępu.
- **Baza bezpieczeństwa:** `ta_exam_sessions` ma nowe prywatne `grading_mode`, `question_options`, `correct_option`, zaś `ta_exam_results` ma indeksowane `exam_session_id`. Sprawdzono role: klient `authenticated` nie może sam wstawić dyplomu ani sesji egzaminacyjnej; `service_role` może wystawiać dokumenty.
- **CI:** testy `content_integrity` i `web_bundle` zakończone **sukcesem dla commit `31f0794b2f9109a34eeac620f7914c9b2d73b8a3`**, workflow 42497327204. **Expo deployment nadal miał status pending** przy ostatnim sprawdzeniu. Późniejsze commity wymagają osobnej kontroli.

### Co jest nadal otwarte i nie należy twierdzić, że zrobione
- **Koniecznie test zalogowanego ucznia E2E**: dwa dialogi, quiz, ukończenie ostatniej lekcji, egzamin (oral i serwerowy), zapis `ta_exam_results` i `ta_certificates`, otwarcie i wydruk A4, przy błędzie ponowienie bez kolejnego podejścia.
- **Klucz OPENAI_API_KEY:** nie ma konektora do ustawiania sekretów Supabase. Nie zweryfikowano konfiguracji ani działania zewnętrznego modelu; agent AI nie może być uznany za w pełni podłączony bez tego. Awaryjny przewodnik offline to NIE AI.
- Serwer sprawdza wpisy `ta_learning_attempts` od klienta, ale nie dokonuje niezależnej oceny każdej próby; ochrona przed manipulacją wymaga osobnego testu i zmian.
- **Pozostałe dziedziny:** 79 kursów ma w sumie 1004 lekcje, a wiele pozostałych nadal nie jest na poziomie 3×10 i wymaga osobnej, specjalistycznej redakcji. Nie uogólniać 120 rozbudowanych lekcji na całą akademię.
- Grafiki programów są autorskimi schematami, nie licencjonowanymi screenshotami prawdziwego programu. Potrzebna redakcyjna weryfikacja zgodności z wersjami iOS/web.
- Doradca Supabase zgłosił ostrzeżenie o wyłączonej ochronie przed wyciekającymi hasłami. Tabele wewnętrzne bez publicznych polityk RLS są celowo prywatne.
