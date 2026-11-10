# TRENERKI Academy — oficjalna domena i e-mail (10.11.2026)

## Stan potwierdzony w kodzie

- Domenę `trenerki.com` kupił właściciel. Docelowy adres serwisu: `https://trenerki.com`.
- Oficjalny adres kontaktu, reklamacji, odstąpień i RODO: `trenerki.pl@gmail.com`. To adres wskazany przez właściciela; trzeba niezależnie utworzyć/zweryfikować skrzynkę i przetestować wysyłkę oraz odbiór wiadomości. Nie jest potrzebne konto pocztowe we własnej domenie.
- Expo obsługuje stronę i aplikację; projekt TRENERKI Supabase: `kcvvixcjuwglfvdpypzs`. Zmiany kodu nie oznaczają, że DNS i certyfikat TLS zostały już ustawione.
- W GitHubie dodano publiczne dokumenty `/academy/regulamin.html`, `/academy/prywatnosc.html`, `/academy/kontakt.html`, `/academy/odstapienie.html` i `/academy/certyfikaty.html`.
- Stripe obsługuje zakup kursów i kart podarunkowych. Produkcyjny checkout jest kontrolowany przez sekret TA_SALES_ENABLED.

## Nieodzowne kroki ręczne przed przełączeniem na oficjalną domenę

1. W panelu Expo Hosting powiązać `trenerki.com` z obecną witryną. Skopiować **konkretne rekordy DNS wskazane przez Expo** do rejestratora. Skonfigurować działanie `www.trenerki.com` i przekierowanie na adres bez `www`, zweryfikować HTTPS.
2. W **Supabase → Authentication → URL Configuration** ustawić `Site URL = https://trenerki.com` oraz dodać dozwolone redirect URL `https://trenerki.com/konto` (i, jeśli używane, `https://www.trenerki.com/konto`). Zachować testowy `https://trenerki-academy.expo.app/konto`, dopóki jest używany do testów.
3. Sprawdzić rejestrację konta, potwierdzenie e-mail i reset hasła na nowej domenie. Frontend automatycznie dobiera origin webowy z listy oficjalnych hostów i preview.
4. Zalogować się na `trenerki.pl@gmail.com` i przetestować korespondencję przychodzącą/wychodzącą; bez tego kanał reklamacyjny nie jest rzeczywiście działający.
5. Podać i opublikować firmowy numer telefonu przed rozpoczęciem sprzedaży zgodnie z art. 12 ust. 1 pkt 3 ustawy o prawach konsumenta. Zweryfikować aktualność danych KRS.
6. Zweryfikować treść regulaminu, polityki RODO i zgodności treści cyfrowych z ustawą. W procesie zakupu zapewnić pełną cenę brutto, przycisk obowiązku zapłaty i ewentualne wyraźne, odrębne zgody wymagane do rozpoczęcia dostawy treści cyfrowych przed upływem terminu odstąpienia wraz z potwierdzeniem e-mail.
7. Ustalić obsługę potwierdzeń i wiadomości transakcyjnych. Publiczny adres kontaktowy Gmail nie oznacza, że działa z niego automatyczne wysyłanie e-maili przez Supabase Auth lub funkcje dyplomów. Resend wymaga osobnej konfiguracji i weryfikacji domeny nadawcy, gdyby został wybrany do wiadomości automatycznych.
8. **Bezpieczeństwo płatnych treści:** repo `checkengineplusminus-byte/trenerki-academy` jest publiczne i zawierało źródłowe materiały kursów. RLS chroni dane w Supabase, ale nie publiczną historię Git. Przenieść wrażliwe materiały do prywatnego repo/zasobu przed uruchomieniem sprzedaży.

## Dla programistów

- Kod strony: `public/academy/index.html`; SEO canonical: `https://trenerki.com/academy/index.html`.
- Adresy legal: `/academy/kontakt.html`, `/academy/odstapienie.html`, `/academy/regulamin.html`, `/academy/prywatnosc.html`.
- Domena preview pozostaje `https://trenerki-academy.expo.app`.
- CORS funkcji `ta-diplomas` dopuszcza `https://trenerki.com`, `https://www.trenerki.com` i preview.
- Adres support e-mail jest oddzielny od dostawcy wysyłki automatycznych wiadomości.
- Do uruchomienia Autopay wymagany będzie nowy, bezpieczny flow checkout/webhook po stronie Supabase, niezależny od przygotowanego kodu Stripe.

## Oficjalne źródła

- https://prawakonsumenta.uokik.gov.pl/pytania-i-odpowiedzi/prawo-do-informacji/
- https://prawakonsumenta.uokik.gov.pl/prawo-odstapienia-od-umowy/umowy-szczegolne/
- https://supabase.com/docs/guides/auth/redirect-urls
- https://docs.expo.dev/eas/hosting/get-started/
