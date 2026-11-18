# TRENERKI — instrukcja dokumentowania sprzedaży Stripe / Saldeo
Data: 18 listopada 2026. Właściciel potwierdza status czynnego podatnika VAT i JPK_V7.

## Główna zasada
Stripe NIE jest nabywcą kursu. Nigdy nie wystawiać zbiorczej faktury sprzedaży na Stripe za miesięczne wypłaty. Sprzedaż wynika z zakupów klientów. Wypłaty z Stripe rozliczamy przez konto rozrachunkowe operatora. Nie księgować ich powtórnie jako przychodu.

## Dla każdej opłaconej transakcji
Utrwalać ID Stripe Session / Charge, datę pobrania płatności, kurs, kwotę i walutę, e-mail nabywcy (dostęp tylko administratora), kraj i typ nabywcy, zwroty/korekty, numer dokumentu Saldeo/KSeF oraz status rozliczenia. Nie oznaczać wpływu na bank firmy, dopóki nie ma wypłaty w banku. Statusy: KLIENT_ZAPŁACIŁ, STRIPE_DO_WYPŁATY, PRZELEW_WYSŁANY, BANK_UZGODNIONY.

## Polska — konsument (B2C)
1. Sprawdzić warunki zwolnienia z kasy fiskalnej (poz. 42 załącznika rozporządzenia z 17 grudnia 2024 r. ze zmianami): całkowita zapłata przez wymagany kanał, jednoznaczne powiązanie płatności z konkretną usługą i nabywcą, brak wyłączeń z § 4. Samo to, że użyto Stripe, nie dowodzi spełnienia tych warunków.
2. Gdy zwolnienie jest rzeczywiście spełnione, nie wystawiono faktury i klient jej nie żąda, ujmować sprzedaż w ewidencji bezrachunkowej. Miesięczny zbiorczy dowód wewnętrzny z załącznikiem wszystkich transakcji oznaczyć WEW do JPK_V7. Nie dublować sprzedaży wykazanej w fakturach.
3. Gdy zwolnienie nie przysługuje, uruchomić prawidłową fiskalizację; nie zastępować paragonu zwykłym PDF-em.
4. Na prawidłowy wniosek konsumenta wystawić fakturę zgodnie z przepisami, kontrolując jej ujęcie w ewidencji bez podwójnego VAT.

## Polska — firma (B2B)
Wystawić fakturę rzeczywistemu nabywcy w Saldeo / KSeF, zależnie od obowiązujących przepisów. Zapis numeru faktury i KSeF w rejestrze TRENERKI ma tylko powiązać dokument z transakcją; nie wystawia drugiej faktury. Weryfikować NIP, kraj, usługę i stawkę przed wystawieniem.

## Sprzedaż zagraniczna
Nie stosować automatycznie 23% PL. Oddzielnie zweryfikować VAT UE, OSS, status B2B i reverse charge.

## Kursy a VAT
Dla automatycznych, gotowych kursów cyfrowych 23% PL to typowy wariant dla polskiej sprzedaży bez zwolnienia, ale nie zakładać go dla każdej usługi, nabywcy i kraju. Karty podarunkowe/saldo mogą mieć odmienne zasady VAT i daty podatkowe — wyłączyć z uproszczonego raportu WEW do odrębnej kontroli.

## Miesięczne zamknięcie
A. Weryfikacja sprzedaży + korekt i dokumentów nabywców (według dat podatkowych, nie daty przelewu Stripe).
B. WEW B2C tylko dla właściwie udokumentowanej sprzedaży bez faktury/kasy. Faktury B2B osobno, bez dublowania VAT.
C. Zestawienie kosztów operatora Stripe z dokumentami opłat. Sprawdzić import usług.
D. Zestawienie przepływów: saldo Stripe na początek + wpłaty - zwroty - opłaty - wypłaty = saldo na koniec. Wypłaty zestawiać z bankiem osobno.
E. Archiwum: dokument WEW, lista transakcji, faktury B2B, raport opłat, raport Stripe, potwierdzenie przelewu.

## Przykład
7 klientów B2C w Polsce po 100 zł brutto: sprzedaż 700 zł. Przy prawidłowej stawce 23% i całych 7 transakcjach rozliczanych zbiorczo: 569,11 zł netto, 130,89 zł VAT. Prowizje Stripe zmniejszają kwotę wypłaty operatora, NIE podstawę opodatkowania sprzedaży. Jeśli faktury zostały wystawione do części sprzedaży, rozdzielić ją prawidłowo, aby nie dublować wartości w JPK.

## Przepisy / źródła
- MF JPK_V7 FAQ, WEW: https://podatki.gov.pl/podatki-firmowe/jednolity-plik-kontrolny/jpk_vat-z-deklaracja/pytania-i-odpowiedzi
- Rozporządzenie MF o kasach z 17.12.2024, Dz.U. 2024 poz. 1902: https://isap.sejm.gov.pl/isap.nsf/download.xsp/WDU20240001902/O/D20241902.pdf
- KSeF: https://ksef.podatki.gov.pl/informacje-ogolne-ksef-20/zakres-obowiazkowego-ksef/
- Opłaty Stripe: https://support.stripe.com/questions/global-taxation-of-stripe-fees

## Kontrola wdrożenia
Obecny CSV operacji Stripe nie jest jeszcze gotowym dokumentem WEW ani plikiem importu faktur do Saldeo. Nie generować oficjalnych dokumentów z tego pliku, dopóki nie ma pełnego powiązania zakupów z identyfikacją nabywcy, statusami faktur i zwrotami. Rejestr faktur w Supabase służy tylko do powiązania istniejących dokumentów.
