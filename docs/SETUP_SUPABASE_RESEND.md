# Integracja TRENERKI Academy — Supabase, Resend, Stripe

## Status
**Przygotowane technicznie, jeszcze nieaktywne.** W listopadzie 2026 do konta GitHub jest podpięty kod startowy Expo. Osobna baza Supabase TRENERKI, domena pocztowa Resend i produkcyjne klucze Stripe NIE są skonfigurowane.

## Osobny projekt Supabase
Nie używać baz CheckEngine lub TaxiTrip. Własny projekt TRENERKI ma obsługiwać:
- Auth: rejestracja e-mail, potwierdzenie adresu, logowanie, odzyskanie hasła.
- Courses + enrollments: opłacone kursy, status płatności i data wygaśnięcia (12 miesięcy).
- Drafts: miejsce wznowienia kursu i notatki.
- Module/exam results: wyłącznie zapisane przez zaufany serwer.
- Certificates: unikalny numer, tytuły PL/EN, data wystawienia.
- Private questions: pula egzaminów niepubliczna, niewysyłana do kodu przeglądarki.

## RLS i bezpieczeństwo
Każdy użytkownik widzi tylko swoje zakupy, notatki i wyniki. Płatny dostęp można aktywować wyłącznie po potwierdzeniu rzeczywistej płatności na serwerze. Nigdy nie umieszczać service_role, Stripe secret ani Resend API key w kodzie Expo czy w publicznym GitHubie.

## Resend
Po zweryfikowaniu domeny trenerki.academy i rekordów DNS: 
- Supabase Auth → Custom SMTP lub oficjalna integracja Resend z Supabase.
- SMTP: host `smtp.resend.com`, port `465`, użytkownik `resend`, hasło = prywatny klucz API Resend.
- Nadawca (po weryfikacji): np. `kontakt@trenerki.academy`.
- Ustawić Site URL i dozwolone Redirect URLs w Supabase, włączyć potwierdzenie e-mail oraz CAPTCHA.
- E-maile po zakupie wysyłać z zaufanej funkcji serwerowej po potwierdzeniu webhooka Stripe.

## Stripe
Endpoint `ta-create-checkout`: tylko zalogowany użytkownik, cena pobrana z bazy, a nie z przeglądarki.
Endpoint `ta-stripe-webhook`: weryfikacja podpisu Stripe, poprawnej ceny i waluty, bezpieczny zapis dostępu i powiadomienie Resend. Koniecznie testować zdarzenia opóźnione, powtórzone i zwroty.

## Expo
Prawidłowy projekt Expo Router, następnie `npm install`, `npx expo export --platform web`, `npx eas-cli@latest deploy`.
Aktualna paczka v0.5 jest udostępniona jako ZIP w rozmowie; repo nie zawiera pełnej puli egzaminacyjnej.

## Do produkcji
- Utworzyć/połączyć osobny projekt Supabase TRENERKI, przeprowadzić migrację SQL i audyt Security Advisor.
- Zweryfikować domenę e-mail w Resend i wysłać testowe e-maile.
- Skonfigurować Stripe w trybie testowym, przeprowadzić test rejestracji → zakupu → 12 miesięcy dostępu → zapis → zaliczenie → certyfikat → zwrot.
- Przenieść wszystkie odpowiedzi egzaminacyjne ze statycznego prototypu na prywatny backend.
- Sprawdzić prawną dokumentację sprzedaży i włączyć produkcję dopiero po testach.

Dokumentacja: https://supabase.com/docs/guides/auth/auth-smtp · https://supabase.com/partners/catalog/resend · https://docs.expo.dev/eas/hosting/get-started/
