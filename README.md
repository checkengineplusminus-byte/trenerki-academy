# TRENERKI Academy v0.8.0 — Expo + Supabase

**Podgląd:** https://trenerki-academy.expo.app  
**Pełny katalog HTML:** https://trenerki-academy.expo.app/academy/index.html  
**Projekt Supabase:** `kcvvixcjuwglfvdpypzs`

## Stan: 8 listopada 2026

- **69 kursów** z ustalonymi cenami w złotych i 8 modułami każdy (**552 lekcje** w Supabase).
- **69 kart kursów i opisów przed zakupem**, z ciekawostką, sytuacją z życia, efektami nauki, pełnym spisem modułów i odpowiednimi ostrzeżeniami.
- **20 kursów rzadkich rzemiosł** w serii „Zapomniane rzemiosła”. Każdy ma status historyczny nauczania oparty na źródle. Gdy brak wiarygodnej daty zakończenia kształcenia w Polsce, pozostaje `null` i strona mówi to otwarcie. **Kowal, zdun i kaletnik nadal występują w materiałach MEN; nie wolno nazywać ich wymarłymi zawodami.**
- **Angielski, norweski i niemiecki na budowie**, kurs o wspieraniu dziecka w pracach domowych, **Transport i logistyka**, **Windows — skróty**.
- Windows, Word, Excel i AutoCAD: **8 modułów** każdy; rysowane w React klawisze, widok *PRZED/PO*, tipy i zadania. Windows **48 skrótów**, Word **48**, Excel **40**, AutoCAD **41**. Skróty mogą zależeć od wersji, języka, platformy i ustawień.
- Zrealizowane również kursy bezpieczeństwa w relacjach, wsparcia bliskich osoby uzależnionej, ekonomii domowej, niemarnowania jedzenia i pielęgnacji trawnika. Dwa ostatnie kosztują **29,99 zł**; Windows, Word, Excel i AutoCAD po **10 zł**. Świąteczny kurs Mikołaja **gratis**.
- Wszystkie nowe treści mają **status roboczy**, dopóki nie zostaną sprawdzone przez redaktora / specjalistę. Nie sprzedajemy ich jako ukończonej, certyfikowanej edukacji.

## Przebieg testowego zakupu

Katalog → opis kursu → **Kup kurs** → `/konto?course=<slug>` → logowanie lub rejestracja → `/kup?course=<slug>` → symulacja **wyłącznie dla administratora** z faktycznie pobraną kwotą **0 zł**. Dostęp DEMO ważny 14 dni, oznaczony w panelu `/moje-kursy`.

Nie włączono rzeczywistego obciążania kart, faktur VAT ani automatycznego nadawania płatnego dostępu.

**Darmowy Mikołaj**: osobna chroniona funkcja `ta-enroll-free`; nie przyznaje zawodowych uprawnień.  
**Gavekort / karta podarunkowa**: `/prezent`, wygenerowany kod jednorazowy, możliwość wysłania linku i odebrania prezentu po zalogowaniu. Płatne kursy dostępne wyłącznie jako voucher testowy administratora. Wysyłka Resend działa tylko po konfiguracji sekretów.  
**Panel administratora**: `/admin`, autoryzacja serwerowa w `ta_admins`, użytkownicy, zamówienia DEMO, prezenty, wersje testowe dokumentów (nie faktury VAT), kontrola jakości kursów.

## Treści i bezpieczeństwo

- Prywatne lekcje tylko przez Supabase RLS z aktywnym `active` lub `demo` na koncie użytkownika. Publiczny plik HTML zawiera wyłącznie katalog i opisy, **bez płatnych lekcji lub odpowiedzi**.
- Kursy o relacjach, uzależnieniach i rodzicielstwie nie zastępują specjalisty ani pomocy alarmowej; nie nakazują pozostawania w przemocowym związku.
- Kursy o dawnych rzemiosłach nie uprawniają do budowania pieców, pracy na wysokości, obsługi maszyn ani zawodowego wykonywania ryzykownych prac.
- Historia zawodów: źródła MEN, ZRP, cechy i warsztaty. **Brak potwierdzonej daty zakończenia nauczania ≠ zawód przestał istnieć**.
- **Dokument ukończenia kursu**, jeśli zostanie później wdrożony, będzie potwierdzeniem prywatnego szkolenia, a nie państwowym certyfikatem czy uprawnieniem zawodowym.
- Zasady jakości `ta_course_previews.review_status` i `editorial_note` widoczne dla uczestników i administratora.

## Architektura

- `public/academy/index.html` — oryginalny styl HTML, 69 publicznych kursów, filtry, podglądy, historia rzemiosła.
- `app/konto.tsx` — Supabase Auth i zachowanie kursu wybranego przed logowaniem.
- `app/kup.tsx` — strona decyzji przed zakupem, serwerowo ograniczona symulacja.
- `app/prezent.tsx` — podarunki, kody jednorazowe.
- `app/admin.tsx` — panel z serwerową autoryzacją właściciela.
- `app/nauka.tsx`, `src/KeyboardLesson.tsx` — nauka i wizualne skróty.
- `supabase/functions/ta-academy/index.ts` — admin, prezenty, testy; sekrety wyłącznie po stronie serwera.
- `content/` — źródłowe programy, materiały i informacje historyczne.
- `scripts/check-content-consistency.mjs` — automatyczny test spójności kursów i cen.
- `.github/workflows/course-consistency.yml` — CI testu treści.
- `.eas/workflows/deploy-web.yml` — automatyczna publikacja Expo z gałęzi `main`.

## Nadal konieczne przed sprzedażą

1. **Osobna weryfikacja gotowych lekcji** przez odpowiednich specjalistów i poprawienie statusu `draft`/ `review_needed`.
2. Potwierdzenie działania ostatniego workflow Expo oraz test w rzeczywistej przeglądarce na telefonie.
3. W Supabase Auth `Site URL` = `https://trenerki-academy.expo.app` i redirect `https://trenerki-academy.expo.app/konto`. Podłączone narzędzie Supabase nadal nie udostępnia zapisu globalnych ustawień Auth; nie deklarować, że naprawiono redirecty e-mail.
4. Weryfikacja Stripe, Resend, polityk i danych prawnych sprzedawcy oraz rzeczywistego procesu fakturowania.
5. Bezpieczne serwerowe testy/egzaminy, weryfikowalne potwierdzenia ukończenia oraz reguły wykrywania nadużyć.

**Uwaga:** strony prawne są wersjami przedprodukcyjnymi. Płatności są wyłączone.
