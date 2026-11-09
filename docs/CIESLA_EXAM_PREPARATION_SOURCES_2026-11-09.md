# Cieśla — zakres źródeł i standardy redakcyjne (9.11.2026)

## Źródło prywatne otrzymane od właściciela konta

Wiadomość z 24 stycznia 2025 r., godz. 09:31, od DA Spesialistene, wysłana na prywatny adres właściciela; jest odpowiedzią na wiadomość właściciela z godz. 09:19. Załączniki:
- `cieśla 1.pdf` — 20 stron, skanowane zestawy przygotowawcze do części ustnej egzaminu czeladniczego;
- `cieśla 2.pdf` — 20 stron, analogiczne zestawy;
- `Test przykładowy.pdf` — 8 stron, wzorcowy test części pisemnej, m.in. zagadnienia ogólnozawodowe.

Odczytane i potwierdzone działy zestawów ustnych: **technologia, maszynoznawstwo, materiałoznawstwo**. Widoczne tematy obejmują suszenie drewna, urządzenia do obróbki, właściwości materiałów, złącza i zabezpieczenia. Przykładowy test pisemny zawiera również wiedzę o działalności i dokumentach. **Nie przesłano oryginalnych plików do repozytorium ani nie przepisano banku pytań**. Ze względu na skanowaną postać załączników nie deklarujemy kompletnej transkrypcji wszystkich 48 stron; dalsza recenzja źródeł należy do listy zadań.

## Materiały publiczne

- Oficjalny informator CKE BUD.02: https://bip.cke.gov.pl/attachments/download/8416
- Związek Rzemiosła Polskiego, standardy wymagań egzaminacyjnych: https://zrp.pl/dzialalnosc-zrp/oswiata-zawodowa/egzaminy/standardy-egzaminacyjne/
- CKE BUD.02 i rzemieślniczy egzamin czeladniczy **nie są automatycznie tym samym egzaminem**. Należy weryfikować zakres, część praktyczną i warunki z konkretną komisją.

## Stan realizacji

- Utworzono w Supabase kurs `ciesla-przygotowanie-czeladnicze` jako `published=false`, `price_grosze=0`. Wersja robocza nie jest sprzedawana.
- 30 lekcji w trzech działach, 30 różnych pytań, cztery części na lekcję, cztery rozbudowane lekcje pilotażowe (wilgotność, obmiar, więźba, projekt praktyczny).
- Pięć autorskich schematów technicznych własnego opracowania, niebędących kopiami załączników.
- Lekcje uczą teorii, interpretacji rysunku, BHP i podejmowania decyzji. **Nie zastępują szkolenia praktycznego, komisji egzaminacyjnej ani nie wydają formalnego świadectwa.**
- Wymagane przed publicznym uruchomieniem: recenzja rzemieślnika, zweryfikowanie wszystkich 48 stron źródeł, szczegółowe symulacje, odrębny egzamin na nowe scenariusze, test E2E zalogowanego ucznia i próby wykonania zadania w warsztacie.

## Jakość pozostałych kursów oprogramowania

Dla Excela i AutoCAD-a dodano w kodzie `src/SoftwareMenuLab.tsx` uproszczone, obsługiwane dotykiem modele wstążki, arkusza i obszaru Model Space; w Excelu uczniowie mogą zmieniać cenę i ilość i widzieć wynik, a w CAD poznają polecenia, wstążkę, okno komend oraz przejście Model/Layout. Są to **modele edukacyjne**, nie zrzuty producentów ani w pełni funkcjonalne wersje programów. Prawdziwe zrzuty i ekranowe symulacje w kolejnych lekcjach wymagają dalszej, indywidualnej implementacji oraz sprawdzenia aktualnych wersji.
