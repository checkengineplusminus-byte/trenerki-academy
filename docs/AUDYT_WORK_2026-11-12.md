# TRENERKI Academy — kontrola po zatrzymaniu Work (12.11.2026)

Status: **częściowo ukończone, nie ogłaszać pełnego zakończenia**.
Źródła: read-only Supabase TRENERKI Academy `kcvvixcjuwglfvdpypzs`, GitHub `checkengineplusminus-byte/trenerki-academy` i Actions. Nie wykonywano w tej kontroli zmian danych uczniów ani aktywacji pytań.

## Potwierdzone dane produkcyjne
- Projekt Supabase: `ACTIVE_HEALTHY`.
- 81 kursów w `public.ta_courses`; 81 opublikowanych; 81 z opisem, polskim tytułem dyplomu i angielskim tytułem.
- 2473 lekcje: 79 kursów po 30, jeden po 40 (`zaufany-wolontariusz`) i jeden po 63 (`ciesla-przygotowanie-czeladnicze`). Numeracja od 0, brak zaobserwowanych przerw.
- Status redakcyjny lekcji: 2369 `approved`, 64 `needs_expert_review`, 40 bez statusu (`zaufany-wolontariusz`). Jednocześnie wszystkie 81 podglądów ma `review_status='approved'` — trzeba wyjaśnić to rozróżnienie przed ogłoszeniem merytorycznego zatwierdzenia.
- Każda z 81 pozycji ma przynajmniej 30 poprawnie sformatowanych pytań w quizach lekcyjnych według warunku 2–6 opcji i poprawnego indeksu; nie jest to niezależna recenzja poprawności odpowiedzi.
- 7607 pytań `ta_private.questions`: **168 aktywnych, 7439 nieaktywnych**. 51 kursów ma pytania prywatne, 20 nie ma żadnych; 48 kursów ma po 150, wszystkie nieaktywne; pozostałe rozkłady: 117/8 aktywnych, 150/20 aktywnych, 140/140 aktywnych.
- Każde z 7607 pytań ma 4 opcje i indeks poprawnej odpowiedzi 0..3. Nie stwierdzono dokładnych duplikatów pytań w obrębie kursu (normalizowane odstępy/wielkość liter). 15 wyjaśnień ma <30 znaków, jedno pytanie <35 znaków. To kontrola strukturalna, nie merytoryczna.
- Repozytorium zawiera 81 różnych plików `public/academy/photos/<slug>.webp` oraz manifest zdjęć. Ich obecność w repo nie dowodzi odczytania wszystkich na stronie produkcyjnej.
- Aktualne GitHub Actions dla commitu `e205d952b283fa9d2b790e8c801ff6dbbcc73ee3`: przeglądarka mobilna/desktop **success** (run 43200282400), spójność kursów **success** (run 43200282260). To test kodu, nie potwierdzenie wdrożenia Expo czy prawdziwego zakupu.
- Funkcje Supabase dla egzaminów, Stripe, dyplomów i analityki są obecne i `ACTIVE`; nie dowodzi to pomyślnych zakupów end-to-end.

## Blokery przed oznaczeniem „100% gotowe”
1. **Banki egzaminacyjne:** 7439 pytań jest wyłączonych. Nie aktywować hurtowo bez recenzji poprawności odpowiedzi, dystraktorów, źródeł i wrażliwych dziedzin. Zwłaszcza 20 kursów bez prywatnej puli. Quizy lekcyjne pozwalają technicznie na egzamin, lecz nie na obiecane 20 pełnych podejść bez powtórki.
2. **Rotacja do 20 podejść:** `supabase/functions/ta-exam/selection.ts` stosuje okno 20 prób, preferuje pytania wcześniej niewykorzystane i tasuje odpowiedzi; po wyczerpaniu puli dopuszcza ponowne użycie. Gwarancja żadnych powtórek przez pierwsze 20 prób nie jest spełniona dla kursów z ~30 aktywnymi pytaniami. Nie deklarować jej w UI/marketingu.
3. **Recenzje:** 64 lekcje oznaczone `needs_expert_review` w ośmiu kursach: `swiety-mikolaj` 12, `brygadzista` 12, `lepszy-tata` 12, `obowiazki-domowe` 8, `jak-kupic-samochod` 8, `kolodziej` 4, `bednarz` 4, `plecionkarz` 4; ponadto 40 bez statusu w kursie wolontariusza.
4. **Produkcja / sprzedaż:** zweryfikować domenę, odczyt zdjęć z CDN na produkcji, kupno Stripe live, webhook → `ta_enrollments` → dostęp → egzamin → PDF → mail w rzeczywistym koncie, bez tworzenia niechcianej płatności. Próba dostępu do `https://trenerki.com` i `https://www.trenerki.com` przez narzędzie zewnętrzne nie powiodła się, nie oznacza to dowiedzionej awarii strony.
5. **Bezpieczeństwo:** Supabase Security Advisor: 17 INFO `rls_enabled_no_policy` dla tabel serwerowych, ostrzeżenie dla publicznej funkcji SECURITY DEFINER `ta_update_support_contact` (funkcja kontroluje `auth.uid()` i rolę administratora; nie znosi to konieczności przeglądu), ostrzeżenie o wyłączonej ochronie przed hasłami wyciekłymi. Remediacje: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy oraz https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable .
6. **Backup:** przed masowymi poprawkami sprawdzić kopię zapasową poza produkcyjnym projektem.

## Bezpieczna kolejność następnej pracy
- Utrzymać bieżące działające zakupy/konta; nie wykonywać masowych UPDATE/DELETE na danych postępów, dyplomów i płatności.
- Zweryfikować pytania kurs po kursie (np. partie po 10), w tym odpowiedzi błędne celowo podobne, bez sztucznego rozbudowywania banku; aktywować tylko zaakceptowane pytania i sprawdzać egzamin po aktywacji.
- Uzupełnić pytania w kursach bez prywatnego banku, zapewniając realną liczbę wariantów wystarczającą na 20 podejść. Zmierz realne zużycie pytań na próbę, testy po 1/5/19/20/21 próbach, historia wielosesyjna i brak seryjnych prawidłowych pozycji.
- Zakończyć recenzję 64 oznaczonych lekcji oraz ustalić status 40 lekcji wolontariusza; nie polegać wyłącznie na polu `ta_course_previews.review_status`.
- Zweryfikować build/Expo i Stripe od początku do końca; dopiero potem raportować gotowość produkcyjną.

## Ważne
Ten plik jest trwałym checkpointem dla kolejnych sesji Work, a nie dowodem wdrożenia poprawek. Stan odczytano 12.11.2026. Przed każdą zmianą odczytaj Supabase i HEAD GitHub ponownie, bo w tym projekcie prace mogą być równoległe.
