# TRENERKI — audyt 80 ilustracji kursów, 9 listopada 2026

## Stan plików
- Audyt początkowy: **309 plików SVG** w repozytorium, w tym **302 pliki w `public/academy/assets/`**.
- Po zmianie: 5 nowych paczek symboli SVG, więc **314 plików SVG**. Same symbole zostały wyodrębnione z istniejących autorskich rysunków (z wyjątkiem nowych ikon cieśli i dokumentu Word).
- Publiczny katalog: **80 kart, 80 przypisanych symboli SVG, 5 małych paczek** po 16 symboli. Użytkownik nie musi pobierać całych infografik o rozdzielczości 960×540.
- Poprzednio wszystkie karty używały jednego z **2 ogólnych ilustracyjnych szablonów** oraz emoji. Przy rzemiośle kołodzieja wyświetlała się opona `🛞`; nowy symbol to piasta, drewniane szprychy i obręcz.
- Każda karta ma podpis z nazwą kursu i tematyką, symbol ma dostępny opis dla czytnika ekranu.

## Zasady decyzji projektowej
1. **Rozpoznanie przed dekoracją.** Ilustracja przedstawia konkretny przedmiot, sytuację albo narzędzie. To oszczędza czas odbiorcy i redukuje niejasność.
2. **Spójna estetyka.** Wszystkie symbole z materiałów kursowych są pokazane w podobnej skali i ramie kolorystycznej; brak losowo dobranych emoji.
3. **Animacje tylko na działanie.** Delikatne uniesienie karty i ikon przy hover/focus, bez automatycznych cyklicznych ruchów. Przy `prefers-reduced-motion` animacje są wyłączane.
4. **Jasna korzyść i bezpieczna ścieżka.** Zachować widoczne nazwy, programy, ceny, czas nauki i uczciwy status kursów testowych. Bez fikcyjnej presji, fałszywych ocen i obietnic zdania oficjalnego egzaminu.
5. **Efekt biznesowy pozostaje hipotezą.** Sam projekt nie dowodzi wzrostu zakupów; potrzebny jest eksperyment A/B z pomiarem kliknięć w szczegóły kursu, rejestracji i po uruchomieniu płatności — faktycznych zakupów.

## Źródła UX i naukowe
- Nielsen Norman Group: [Icon usability](https://www.nngroup.com/articles/icon-usability/) — rozpoznawalność i rola etykiet.
- Nielsen Norman Group: [Icon classification](https://www.nngroup.com/articles/classifying-icons/) — lepsze odwzorowanie przedmiotu ułatwia interpretację.
- Baymard Institute: [Product images and descriptive graphics](https://baymard.com/research-articles/product-images-descriptive-text) — obraz i tekst wzajemnie się uzupełniają.
- Reinecke i in., CHI 2013: [Perceived visual complexity and website appeal](https://doi.org/10.1145/2470654.2481281) — pierwsze wrażenie i złożoność wizualna.
- Uitdenbogerd i in. (2022): [Animated elements in web search](https://arxiv.org/abs/2211.11993) — niepotrzebny ruch może rozpraszać.

## Każdy kurs — źródło i powiązanie

Nr | Kurs | Nowa ikona SVG | Wykorzystana ilustracja | Zasada
---|---|---|---|---
01 | Cieśla — przygotowanie do egzaminu czeladniczego | `course-icons-1.svg#course-ciesla-przygotowanie-czeladnicze` | Autorski schemat więźby | Powiązanie ilustracji z tematem + etykieta nazwy kursu
02 | Lepszy brygadzista — zespół, tempo i jakość | `course-icons-1.svg#course-brygadzista` | mastery-brygadzista.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
03 | Lepszy kierownik budowy — decyzje, ludzie i plan | `course-icons-1.svg#course-kierownik-budowy` | mastery-kierownik-budowy.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
04 | Bądź lepszym szefem — codzienna praktyka | `course-icons-1.svg#course-lepszy-szef` | mastery-lepszy-szef.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
05 | Obsługa apartamentów premium | `course-icons-1.svg#course-apartamenty` | mastery-apartamenty.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
06 | GPSR dla rękodzielników | `course-icons-1.svg#course-gpsr` | mastery-gpsr.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
07 | BDO dla małego e-commerce | `course-icons-1.svg#course-bdo` | mastery-bdo.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
08 | Dostępne PDF i materiały cyfrowe | `course-icons-1.svg#course-dostepne-pdf` | mastery-dostepne-pdf.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
09 | Dotacje i rozliczenia KGW | `course-icons-1.svg#course-kgw` | mastery-kgw.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
10 | Organizacja stoiska na festynie | `course-icons-1.svg#course-festyn` | mastery-festyn.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
11 | Petsitter kotów — odpowiedzialna opieka | `course-icons-1.svg#course-petsitter` | mastery-petsitter.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
12 | Dokumentowanie usterek mieszkań | `course-icons-1.svg#course-odbiory` | mastery-odbiory.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
13 | Zarząd małej wspólnoty mieszkaniowej | `course-icons-1.svg#course-wspolnota` | mastery-wspolnota.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
14 | Pierwsza pasieka — plan sezonu | `course-icons-1.svg#course-pasieka` | mastery-pasieka.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
15 | Pierwsze zlecenie w małej firmie sprzątającej | `course-icons-1.svg#course-koordynator` | mastery-koordynator.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
16 | Organizacja małego hoteliku dla kotów | `course-icons-1.svg#course-dziennik-kota` | mastery-dziennik-kota.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
17 | Opieka nad osobami starszymi | `course-icons-2.svg#course-opieka-seniorzy` | mastery-opieka-seniorzy.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
18 | Opieka i wsparcie osób z ADHD | `course-icons-2.svg#course-wsparcie-adhd` | mastery-wsparcie-adhd.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
19 | Poznaj siebie — odkryj swoje mocne strony | `course-icons-2.svg#course-poznaj-siebie` | mastery-poznaj-siebie.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
20 | Wybuduj mocny charakter i bądź stanowczy | `course-icons-2.svg#course-mocny-charakter` | mastery-mocny-charakter.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
21 | Związek to rozmowa | `course-icons-2.svg#course-zwiazek-rozmowa` | mastery-zwiazek-rozmowa.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
22 | Bądź bliżej swojego dziecka | `course-icons-2.svg#course-blizej-dziecka` | mastery-blizej-dziecka.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
23 | Rodzice na 50 procent — dobra opieka naprzemienna | `course-icons-2.svg#course-rodzice-50-50` | mastery-rodzice-50-50.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
24 | Zaczynam od zera po utracie majątku | `course-icons-2.svg#course-zaczynam-od-zera` | mastery-zaczynam-od-zera.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
25 | Obowiązki domowe — dom, który działa | `course-icons-2.svg#course-obowiazki-domowe` | mastery-obowiazki-domowe.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
26 | Bądź lepszym cukiernikiem | `course-icons-2.svg#course-lepszy-cukiernik` | mastery-lepszy-cukiernik.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
27 | Bądź lepszym kucharzem | `course-icons-2.svg#course-lepszy-kucharz` | mastery-lepszy-kucharz.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
28 | Nie lubię ludzi — jak to zmienić? | `course-icons-2.svg#course-nie-lubie-ludzi` | mastery-nie-lubie-ludzi.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
29 | Jak kupić samochód i nie żałować | `course-icons-2.svg#course-jak-kupic-samochod` | mastery-jak-kupic-samochod.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
30 | Zawsze mierz ponad swoje siły — nawet bez szkoły | `course-icons-2.svg#course-mierz-ponad-sily` | mastery-mierz-ponad-sily.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
31 | Excel — wszystkie najważniejsze skróty klawiszowe | `course-icons-2.svg#course-excel-skroty` | mastery-excel-skroty.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
32 | AutoCAD — wszystkie najważniejsze skróty i komendy | `course-icons-2.svg#course-autocad-skroty` | mastery-autocad-skroty.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
33 | Promocja firmy w Google Ads od podstaw | `course-icons-3.svg#course-google-ads-promocja` | mastery-google-ads-promocja.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
34 | Promocja firmy w Facebook Ads i Instagramie | `course-icons-3.svg#course-facebook-ads-promocja` | mastery-facebook-ads-promocja.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
35 | Uprawnienia Świętego Mikołaja — kurs świąteczny | `course-icons-3.svg#course-swiety-mikolaj` | mastery-swiety-mikolaj.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
36 | Bądź lepszym tatą — obecność, rozmowa i zaufanie | `course-icons-3.svg#course-lepszy-tata` | mastery-lepszy-tata.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
37 | Bądź lepszą mamą — bliskość, spokój i zaufanie | `course-icons-3.svg#course-lepsza-mama` | mastery-lepsza-mama.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
38 | Word — skróty klawiaturowe od podstaw | `course-icons-3.svg#course-word-skroty` | Autorska ikona dokumentu | Powiązanie ilustracji z tematem + etykieta nazwy kursu
39 | Wyjdź z toksycznego związku i nie daj się manipulować | `course-icons-3.svg#course-wyjdz-z-toksycznego-zwiazku` | mastery-wyjdz-z-toksycznego-zwiazku.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
40 | Kryzys po czterdziestce — jak nie wpaść w długi | `course-icons-3.svg#course-kryzys-po-40-bez-dlugow` | mastery-kryzys-po-40-bez-dlugow.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
41 | Moja druga połówka ma problem z alkoholem lub narkotykami — jak żyć, pomagać i chronić siebie | `course-icons-3.svg#course-partner-z-uzaleznieniem` | mastery-partner-z-uzaleznieniem.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
42 | Nie wyrzucaj jedzenia — gotuj z tego, co masz | `course-icons-3.svg#course-nie-marnuj-jedzenia` | mastery-nie-marnuj-jedzenia.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
43 | Trawnik — jestem swoim ogrodnikiem | `course-icons-3.svg#course-trawnik-jestem-ogrodnikiem` | mastery-trawnik-jestem-ogrodnikiem.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
44 | Ekonomia domowa — wybory, które chronią przed długami | `course-icons-3.svg#course-ekonomia-domowa-bez-dlugow` | mastery-ekonomia-domowa-bez-dlugow.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
45 | Angielski na budowie — od zera, krok po kroku | `course-icons-3.svg#course-angielski-na-budowie` | mastery-angielski-na-budowie.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
46 | Norweski na budowie — od zera do pierwszego dnia pracy | `course-icons-3.svg#course-norweski-na-budowie` | mastery-norweski-na-budowie.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
47 | Niemiecki na budowie — od pierwszego słowa | `course-icons-3.svg#course-niemiecki-na-budowie` | mastery-niemiecki-na-budowie.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
48 | Bądź dobrym nauczycielem swojego dziecka — prace domowe bez kłótni | `course-icons-3.svg#course-pomagaj-dziecku-w-lekcjach` | mastery-pomagaj-dziecku-w-lekcjach.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
49 | Windows od zera — historia, pliki i bezpieczna praca | `course-icons-4.svg#course-windows-skroty` | mastery-windows-skroty.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
50 | Transport i logistyka — zostań dobry w planowaniu dostaw | `course-icons-4.svg#course-transport-logistyka-praktycznie` | mastery-transport-logistyka-praktycznie.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
51 | Kowal — ogień, stal i tradycja kuźni | `course-icons-4.svg#course-kowal-tradycja` | craft-kowal-tradycja.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
52 | Zdun — piece kaflowe i mistrzowie ciepła | `course-icons-4.svg#course-zdun-tradycja` | craft-zdun-tradycja.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
53 | Kołodziej — drewniane koła dawnych wozów | `course-icons-4.svg#course-kolodziej` | craft-kolodziej.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
54 | Bednarz — beczki i drewniane naczynia | `course-icons-4.svg#course-bednarz` | craft-bednarz.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
55 | Woźnica — dawna sztuka powożenia | `course-icons-4.svg#course-woznica` | craft-woznica.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
56 | Rymarz — skórzane uprzęże i naprawy | `course-icons-4.svg#course-rymarz` | craft-rymarz.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
57 | Garncarz — glina i koło garncarskie | `course-icons-4.svg#course-garncarz-tradycja` | craft-garncarz-tradycja.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
58 | Plecionkarz — kosze z wikliny | `course-icons-4.svg#course-plecionkarz` | craft-plecionkarz.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
59 | Powroźnik — tradycyjne liny i powrozy | `course-icons-4.svg#course-powroznik` | craft-powroznik.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
60 | Snycerz — ornament i rzeźba w drewnie | `course-icons-4.svg#course-snycerz` | craft-snycerz.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
61 | Sitarz — sztuka ręcznej produkcji sit | `course-icons-4.svg#course-sitarz` | craft-sitarz.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
62 | Zecer — skład gazet przed komputerem | `course-icons-4.svg#course-zecer` | craft-zecer.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
63 | Ludwisarz — dzwony i tradycyjne odlewnictwo | `course-icons-4.svg#course-ludwisarz` | craft-ludwisarz.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
64 | Introligator — oprawa książek ręcznie | `course-icons-4.svg#course-introligator-tradycja` | craft-introligator-tradycja.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
65 | Tkacz ręczny — krosno i dawne tkaniny | `course-icons-5.svg#course-tkacz-reczny` | craft-tkacz-reczny.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
66 | Kaletnik — torby, paski i portfele | `course-icons-5.svg#course-kaletnik-tradycja` | craft-kaletnik-tradycja.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
67 | Zegarmistrz — serce mechanicznego zegarka | `course-icons-5.svg#course-zegarmistrz-tradycja` | craft-zegarmistrz-tradycja.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
68 | Młynarz — od ziarna do mąki | `course-icons-5.svg#course-mlynarz-tradycyjny` | craft-mlynarz-tradycyjny.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
69 | Gontarz — drewniane dachy | `course-icons-5.svg#course-gontarz` | craft-gontarz.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
70 | Szewc — uratuj i napraw stare buty | `course-icons-5.svg#course-szewc-tradycja` | craft-szewc-tradycja.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
71 | Axapta (Dynamics AX) i Dynamics 365 SCM — magazyn od zera | `course-icons-5.svg#course-axapta-dynamics-magazyn` | mastery-axapta-dynamics-magazyn.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
72 | SAP EWM — magazyn od pierwszego skanu do eksperta | `course-icons-5.svg#course-sap-ewm-magazyn` | mastery-sap-ewm-magazyn.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
73 | Oracle Warehouse Management Cloud — kompletny kurs WMS | `course-icons-5.svg#course-oracle-wms-cloud` | mastery-oracle-wms-cloud.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
74 | Manhattan ActiveWarehouse — obsługa magazynu WMS | `course-icons-5.svg#course-manhattan-active-wms` | mastery-manhattan-active-wms.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
75 | Blue Yonder WMS — magazyn, ludzie i automatyzacja | `course-icons-5.svg#course-blue-yonder-wms` | mastery-blue-yonder-wms.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
76 | Infor CloudSuite WMS — profesjonalna gospodarka magazynowa | `course-icons-5.svg#course-infor-wms` | mastery-infor-wms.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
77 | Ongoing WMS — magazyn, e-commerce i 3PL w Skandynawii | `course-icons-5.svg#course-ongoing-wms` | mastery-ongoing-wms.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
78 | Consafe Astro WMS — magazyn i automatyka | `course-icons-5.svg#course-astro-consafe-wms` | mastery-astro-consafe-wms.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
79 | SAP Transportation Management — planowanie transportu TMS | `course-icons-5.svg#course-sap-tm-transport` | mastery-sap-tm-transport.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu
80 | JESTEM EKO — żyj świadomie, segreguj mądrze | `course-icons-5.svg#course-jestem-eko` | mastery-jestem-eko.svg | Powiązanie ilustracji z tematem + etykieta nazwy kursu

## Testy akceptacyjne
- `node scripts/check-content-consistency.mjs`
- `node scripts/test-anielka.mjs`
- `node scripts/test-course-icons.mjs`
- `npx expo export --platform web`

**Uwaga do wdrożenia:** aktualizacja GitHub nie oznacza automatycznie publikacji. Wymagana jest poprawna konfiguracja `EXPO_TOKEN` w sekretach GitHub dla działania workflow Expo Hosting. Stan publikacji weryfikuj niezależnie po każdym wdrożeniu.


## Korekta po kontroli znaczenia ikon (runda 2)

Pierwsza runda audytu była niewystarczająca: 80 różnych identyfikatorów SVG nie oznaczało 80 różnych rysunków. Część `mastery-...` wyodrębniała dokładnie tę samą figurę przy niepowiązanych kursach (np. Excel/AutoCAD, brygadzista/kierownik budowy, dziewięć systemów WMS, kucharz/cukiernik).

Naprawa: **58 ilustracji** zastąpiono układami przedmiotów bezpośrednio związanych z kursem; **20 oryginalnych zawodowych rysunków** zachowano; ikony **cieśli i Worda** zachowano po sprawdzeniu. W dalszej korekcie dopasowano opiekę senioralną, bliskość z dzieckiem, mamę i pomoc w lekcjach oraz rozróżniono angielski, norweski i niemiecki na budowie czytelnymi symbolami państw i języków. W kodzie testowym `scripts/test-course-icons.mjs` jest teraz kontrola powtarzanych **rysunków po usunięciu podpisów** (nie tylko nazw plików).

### Nowe kierunki graficzne
- Excel: arkusz z komórkami i sumą; AutoCAD: cyrkiel kreślarski z planem technicznym
- Brygadzista: kask i ekipa; kierownik budowy: żuraw i rysunek konstrukcyjny
- Kucharz: garnek; cukiernik: tort; ogrodnik: kosiarka
- BDO: paczka i obieg odpadów; GPSR: tarcza bezpieczeństwa i dokument
- Kursy językowe: kask budowlany + rozmowa + odrębne oznaczenie EN/NO/DE i flaga
- Systemy logistyczne: różne czynności magazynowe, np. skanowanie, chmura, przenośnik, trasa transportu i automatyka
- Rodzina: opieka/rozmowa/planowanie wspólnego czasu zamiast zamiennych figur

**Ograniczenie:** test programistyczny wykrywa identyczną geometrię, ale nie zastępuje testu rozpoznawalności z rzeczywistymi użytkownikami. Publiczną jakość wizualną trzeba zweryfikować po publikacji Expo. Nie twierdzimy, że ta korekta już zwiększyła konwersję.
