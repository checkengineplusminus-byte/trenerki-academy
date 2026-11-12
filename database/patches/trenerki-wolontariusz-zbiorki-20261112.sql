-- TRENERKI Academy · Zaufany wolontariusz · 2026-11-12
-- Rozbudowa lekcji 12, 23, 24 i 30 przy zachowaniu numerów, tytułów i postępów.
-- Dodatkowy sprawdzian sytuacyjny znajduje się w publicznym materiale kursu.
begin;

do $verify_existing_course$
begin
  if (
    select count(*) from public.ta_lessons
    where course_slug = 'zaufany-wolontariusz' and lesson_no in (11, 22, 23, 29)
  ) <> 4 or not exists (
    select 1 from public.ta_course_previews where course_slug = 'zaufany-wolontariusz'
  ) then
    raise exception 'Najpierw należy zaimportować kurs Zaufany wolontariusz z 40 lekcjami';
  end if;
end;
$verify_existing_course$;

with additions as (
  select lesson_no, material
  from jsonb_to_recordset($volunteer_lessons$[
  {
    "lesson_no": 11,
    "material": {
      "module": 3,
      "sections": [
        {
          "heading": "Cel lekcji",
          "text": "Sprawdzisz puszkę, plomby i sposób rozliczenia środków. Zareagujesz na rozbieżność i ujawnisz konflikt interesów."
        },
        {
          "heading": "Sprawdź organizatora i zbiórkę",
          "text": "Zanim przyjmiesz datki, ustal, kto organizuje zbiórkę, jaki ma cel i czy prowadzisz zbiórkę publiczną w rozumieniu ustawy. Jeśli tak, organizator zgłasza ją i czeka na publikację w portalu zbiórek publicznych. Organizator zapewnia identyfikator z Twoim imieniem i nazwiskiem, informacją o nazwie i celu zbiórki, organizatorze i numerze zbiórki. Sprawdź wpis oraz zgodność celu i terminu. Pokaż zainteresowanej osobie identyfikator i wskaż oficjalną metodę wpłaty. Używaj tylko wyposażenia i sposobów wpłaty zatwierdzonych przez organizatora."
        },
        {
          "heading": "Sprawdź puszkę i plomby",
          "text": "Przy odbiorze puszki porównaj oznaczenie puszki z rejestrem wydania. Jeżeli organizator używa numerowanych plomb, porównaj numery wszystkich wymaganych plomb z rejestrem. Obejrzyj, czy zamknięcia są kompletne i całe oraz czy pojemnik nie jest uszkodzony. Praktyka organizacyjna polega na zapisaniu daty, godziny, oznaczeń, stanu, osoby wydającej i odbierającej. W czasie kwesty kontroluj stan zabezpieczenia przy każdym przekazaniu oraz po zdarzeniu, które mogło je naruszyć. Przy rozbieżności wstrzymaj przyjmowanie datków do tej puszki, zachowaj ją w zastanym stanie i skontaktuj się z wyznaczoną osobą. Puszkę zastępczą odbierz i odnotuj według procedury."
        },
        {
          "heading": "Przekazanie i liczenie gotówki",
          "text": "Po dyżurze oddaj zamkniętą puszkę wyznaczonej osobie w ustalonym miejscu. Potwierdźcie stan i czas przekazania. Otwarcie i liczenie gotówki wykonuje upoważniona obsada według instrukcji organizatora. Dobrym zabezpieczeniem jest liczenie z udziałem dwóch osób i zapis potwierdzony przez obie. Jeśli wyniki się różnią, zachowaj oba zapisy, zgłoś różnicę i zastosuj procedurę ponownego przeliczenia. Wymogi dotyczące numerowanych plomb i podwójnej kontroli wynikają z zasad danej zbiórki, które warto poznać przed dyżurem."
        },
        {
          "heading": "Dary i konflikt interesów",
          "text": "Przy darach rzeczowych sprawdź warunki przyjęcia i miejsca przekazania. Zapisuj tylko dane potrzebne do rozliczenia. Jeśli dar, przydział pomocy albo zakup dotyczy bliskiej Ci osoby lub prywatnej korzyści, powiadom koordynatora i przekaż decyzję innej upoważnionej osobie."
        },
        {
          "heading": "Co zrobić krok po kroku",
          "text": "1. Potwierdź organizatora, wpis zbiórki publicznej, identyfikator i zatwierdzony kanał wpłat.\n2. Przy wydaniu sprawdź puszkę, stan zamknięcia oraz numery plomb stosowanych przez organizatora.\n3. Przy rozbieżności zatrzymaj zbiórkę do tej puszki. Zachowaj stan zastany, odnotuj fakty i poproś wyznaczoną osobę o decyzję.\n4. Przekaż puszkę w uzgodnionym miejscu i zachowaj potwierdzenie.\n5. Jeżeli bierzesz udział w liczeniu, pracuj według instrukcji i zgłoś różnicę bez zmieniania pierwotnych zapisów.\n6. Ujawnij relację albo prywatną korzyść, która może wpłynąć na przydział darów."
        },
        {
          "heading": "Sytuacja z dyżuru",
          "text": "W karcie wydania fikcyjnej puszki P-017 widnieje plomba PL-042. Puszka wygląda na zamkniętą, ale widoczna plomba ma numer PL-024. Na punkt czekają już darczyńcy."
        },
        {
          "heading": "Przećwicz",
          "text": "Wypełnij fikcyjną kartę odbioru i przekazania P-017. Wpisz oczekiwany i odczytany numer plomby, jej stan, godzinę, decyzję i rolę osoby przejmującej sprawę. Dodaj jeden przykład konfliktu interesów przy darach rzeczowych."
        },
        {
          "heading": "Sprawdź wynik po wykonaniu",
          "text": "Wstrzymaj przyjmowanie datków do P-017. Zapisz oba numery, stan puszki, godzinę i miejsce. Skontaktuj się z wyznaczoną osobą, zachowując puszkę w zastanym stanie. Darczyńcom wskaż inny potwierdzony punkt lub oficjalny sposób wpłaty. Wznów pracę z puszką dopiero po wyjaśnieniu albo udokumentowanej wymianie.\n\nKryterium ćwiczenia. Rozbieżność jest zapisana bez poprawiania numerów lub plomb. Zapis określa decyzję o wstrzymaniu zbiórki do tej puszki i osobę, która przejęła sprawę. Przy darze dla znajomego decyzję podejmuje inna upoważniona osoba."
        }
      ],
      "learning": {
        "intro": "Sprawdzisz puszkę, plomby i sposób rozliczenia środków. Zareagujesz na rozbieżność i ujawnisz konflikt interesów.",
        "situation": "W karcie wydania fikcyjnej puszki P-017 widnieje plomba PL-042. Puszka wygląda na zamkniętą, ale widoczna plomba ma numer PL-024. Na punkt czekają już darczyńcy.",
        "example": "Wstrzymaj przyjmowanie datków do P-017. Zapisz oba numery, stan puszki, godzinę i miejsce. Skontaktuj się z wyznaczoną osobą, zachowując puszkę w zastanym stanie. Darczyńcom wskaż inny potwierdzony punkt lub oficjalny sposób wpłaty. Wznów pracę z puszką dopiero po wyjaśnieniu albo udokumentowanej wymianie.",
        "task": "Wypełnij fikcyjną kartę odbioru i przekazania P-017. Wpisz oczekiwany i odczytany numer plomby, jej stan, godzinę, decyzję i rolę osoby przejmującej sprawę. Dodaj jeden przykład konfliktu interesów przy darach rzeczowych.",
        "question": "Numer plomby różni się od numeru w rejestrze. Jak postępujesz przed rozpoczęciem kwesty?",
        "options": [
          "Rozpoczynam kwestę i zgłaszam różnicę przy oddawaniu puszki.",
          "Wstrzymuję przyjmowanie datków, zapisuję oba numery i kontaktuję się z wyznaczoną osobą.",
          "Aktualizuję rejestr do numeru widocznego na puszce i rozpoczynam kwestę."
        ],
        "correct": 1,
        "explanation": "Wstrzymanie chroni zebrane środki i pozwala sprawdzić, skąd wzięła się rozbieżność. Zachowanie obu numerów ułatwia odtworzenie przebiegu przekazania."
      },
      "references": [
        {
          "title": "Ustawa o zasadach prowadzenia zbiórek publicznych",
          "url": "https://api.sejm.gov.pl/eli/acts/DU/2020/1672/text.html"
        },
        {
          "title": "Zgłoś zbiórkę publiczną – MSWiA",
          "url": "https://www.gov.pl/web/mswia/zglos-zbiorke-publiczna"
        },
        {
          "title": "Regulamin wolontariusza 34. Finału WOŚP",
          "url": "https://static.wosp.org.pl/trunk/uploaded/sended/files/34final/regulaminy/regulamin_wolontariusza_34._final_wosp.pdf"
        },
        {
          "title": "Korpus Solidarności – Co warto wiedzieć o wolontariacie",
          "url": "https://korpussolidarnosci.gov.pl/Content/pub/broszura_co-wiedziec-o-wolontariacie_2025.pdf"
        },
        {
          "title": "Jak zaangażować wolontariusza do działań swojej organizacji – ngo.pl",
          "url": "https://poradnik.ngo.pl/jak-zaangazowac-wolontariusza-do-dzialan-swojej-organizacji"
        },
        {
          "title": "Standardy bezpieczeństwa i dobrostanu wolontariuszy – IFRC",
          "url": "https://www.ifrc.org/document/implementation-guide-standards-facilitate-safety-security-and-well-being-volunteers"
        }
      ],
      "illustration": "volunteer-seal",
      "practice": {
        "visual": {
          "title": "Cztery kroki kontroli puszki",
          "kind": "flow",
          "entries": [
            {
              "label": "Oznaczenie",
              "detail": "Porównaj oznaczenie puszki z rejestrem wydania."
            },
            {
              "label": "Stan i numery",
              "detail": "Sprawdź zamknięcia i numery plomb, jeśli organizator stosuje oznaczenia."
            },
            {
              "label": "Zapis",
              "detail": "Odnotuj odczyty, stan, godzinę i osoby przekazujące."
            },
            {
              "label": "Rozbieżność",
              "detail": "Wstrzymaj przyjmowanie datków do tej puszki i skontaktuj się z wyznaczoną osobą."
            }
          ]
        }
      }
    }
  },
  {
    "lesson_no": 22,
    "material": {
      "module": 6,
      "sections": [
        {
          "heading": "Cel lekcji",
          "text": "Dobierzesz bezpieczną ścieżkę zgłoszenia krzywdzenia lub podejrzenia przestępstwa, także gdy dotyczy koordynatora."
        },
        {
          "heading": "Zapisz zachowanie",
          "text": "W zespole możesz zobaczyć przemoc, niechciane komentarze, nacisk na złamanie zasad albo zachowanie, które budzi podejrzenie przywłaszczenia darów. Zapisz konkretne zdarzenie i rozdziel własne obserwacje od tego, co usłyszałeś. Przykładowy zapis brzmi „O 17.15 przy stanowisku 2 widziałem, jak osoba odebrała banknot od darczyńcy i schowała go do kieszeni”. Taki zapis pozwala sprawdzić sytuację bez wydawania wyroku."
        },
        {
          "heading": "Natychmiastowa interwencja",
          "text": "Gdy ktoś jest atakowany albo występuje bezpośrednie zagrożenie wymagające natychmiastowej interwencji, odsuń się w bezpieczne miejsce i dzwoń pod 112. Przekaż lokalizację, co się dzieje, czy zagrożenie trwa i czy są osoby poszkodowane. Skieruj osoby postronne do bezpiecznego miejsca tylko wtedy, gdy możesz zrobić to bez narażenia siebie i innych. Postępuj zgodnie z poleceniami operatora."
        },
        {
          "heading": "Zgłoszenie organizacji i właściwym organom",
          "text": "W sprawie, która nie wymaga natychmiastowej interwencji, zgłoś fakty organizacji. Jeżeli dotyczy koordynatora, wybierz niezależny kontakt, na przykład osobę odpowiedzialną za bezpieczeństwo, przełożonego albo zarząd. W przypadku podejrzenia przestępstwa możesz zawiadomić Policję lub prokuraturę, również bez zgody koordynatora. Art. 304 § 1 k.p.k. przewiduje społeczny obowiązek zawiadomienia Policji lub prokuratora, gdy dowiesz się o popełnieniu przestępstwa ściganego z urzędu. § 2 przewiduje odrębny obowiązek instytucji państwowych i samorządowych, które w związku ze swą działalnością dowiedziały się o takim przestępstwie, oraz czynności zapobiegające zatarciu śladów i dowodów. Art. 240 § 1 k.k. ustanawia prawny obowiązek niezwłocznego zawiadomienia, gdy masz wiarygodną informację o usiłowaniu, dokonaniu albo karalnym przygotowaniu jednego z wymienionych w nim czynów. Paragrafy 2–3 przewidują wyjątki i przypadki niekaralności. W sytuacji objętej tym przepisem wewnętrzne zgłoszenie nie zastępuje kontaktu z organem ścigania. W sprawach dotyczących dzieci stosuj także standardy ochrony małoletnich."
        },
        {
          "heading": "Bezpieczeństwo i dalszy kontakt",
          "text": "Zabezpiecz siebie i przekazuj informacje wyłącznie uprawnionym osobom. Ocenę podejrzenia pozostaw właściwym służbom. Zrezygnuj z prywatnego przesłuchiwania, przeszukiwania, zabierania telefonu albo zatrzymywania kogokolwiek. Poproś o potwierdzenie przyjęcia, kontakt zwrotny i ustalenie, jak ograniczyć ryzyko odwetu. Jeżeli po zgłoszeniu pojawia się presja albo groźby, zgłoś również te zdarzenia."
        },
        {
          "heading": "Co zrobić krok po kroku",
          "text": "1. Oceń, czy zagrożenie trwa i czy potrzebna jest natychmiastowa pomoc. W sytuacji alarmowej dzwoń pod 112 z bezpiecznego miejsca.\n2. Zapisz czas, miejsce i to, co sam widziałeś lub słyszałeś. Przypisz cudzą relację do jej źródła.\n3. Zgłoś sprawę niezależnym kanałem i w razie podejrzenia przestępstwa skontaktuj się z Policją lub prokuraturą.\n4. Zachowaj dyskrecję, uzgodnij ochronę na dyżurze i zanotuj sposób kontaktu zwrotnego."
        },
        {
          "heading": "Sytuacja z dyżuru",
          "text": "Podczas kwesty widzisz, jak członek zespołu wkłada otrzymany banknot do kieszeni zamiast do puszki. Koordynator mówi, żebyś nikomu o tym nie wspominał. Zdarzenie się zakończyło, nikt nie jest zagrożony."
        },
        {
          "heading": "Przećwicz",
          "text": "Napisz dwa krótkie zgłoszenia fikcyjnej sytuacji. W pierwszym zagrożenie trwa i potrzebna jest natychmiastowa interwencja. W drugim sytuacja się zakończyła, a koordynator zniechęca do zgłoszenia."
        },
        {
          "heading": "Sprawdź wynik po wykonaniu",
          "text": "Zapisz, co widziałeś, i osobno zanotuj wypowiedź koordynatora. Przekaż fakty niezależnemu kontaktowi wskazanemu przez organizację. Jeśli okoliczności budzą podejrzenie przestępstwa, zawiadom Policję lub prokuraturę bez czekania na zgodę koordynatora. Pozostaw ocenę i czynności wyjaśniające właściwym osobom.\n\nKryterium ćwiczenia. Zgłoszenie alarmowe podaje lokalizację i zagrożenie. Drugie odróżnia obserwację od podejrzenia, omija osobę, której sprawa dotyczy, i uwzględnia możliwość zawiadomienia Policji lub prokuratury."
        }
      ],
      "learning": {
        "intro": "Dobierzesz bezpieczną ścieżkę zgłoszenia krzywdzenia lub podejrzenia przestępstwa, także gdy dotyczy koordynatora.",
        "situation": "Podczas kwesty widzisz, jak członek zespołu wkłada otrzymany banknot do kieszeni zamiast do puszki. Koordynator mówi, żebyś nikomu o tym nie wspominał. Zdarzenie się zakończyło, nikt nie jest zagrożony.",
        "example": "Zapisz, co widziałeś, i osobno zanotuj wypowiedź koordynatora. Przekaż fakty niezależnemu kontaktowi wskazanemu przez organizację. Jeśli okoliczności budzą podejrzenie przestępstwa, zawiadom Policję lub prokuraturę bez czekania na zgodę koordynatora. Pozostaw ocenę i czynności wyjaśniające właściwym osobom.",
        "task": "Napisz dwa krótkie zgłoszenia fikcyjnej sytuacji. W pierwszym zagrożenie trwa i potrzebna jest natychmiastowa interwencja. W drugim sytuacja się zakończyła, a koordynator zniechęca do zgłoszenia.",
        "question": "Podejrzenie przestępstwa dotyczy koordynatora. Zagrożenie minęło. Co możesz zrobić?",
        "options": [
          "Zgłosić fakty niezależnej osobie w organizacji i zawiadomić Policję lub prokuraturę.",
          "Czekać na zgodę koordynatora przed kontaktem z Policją.",
          "Rozesłać nazwisko i podejrzenie na czacie całego zespołu."
        ],
        "correct": 0,
        "explanation": "Zgłoszenie do niezależnego kontaktu ogranicza konflikt interesów. Zawiadomienie o podejrzeniu przestępstwa można przekazać Policji lub prokuraturze bez zgody osoby, której ono dotyczy."
      },
      "references": [
        {
          "title": "Kodeks postępowania karnego, art. 304",
          "url": "https://eli.gov.pl/eli/DU/2026/490"
        },
        {
          "title": "Kodeks karny – art. 240 § 1",
          "url": "https://eli.gov.pl/eli/DU/2026/1342/ogl"
        },
        {
          "title": "Zgłoś przestępstwo – Gov.pl",
          "url": "https://www.gov.pl/web/gov/zglos-przestepstwo"
        },
        {
          "title": "Numer alarmowy 112 – jak zgłaszać zdarzenie",
          "url": "https://www.gov.pl/web/numer-alarmowy-112/jak-zglaszac"
        },
        {
          "title": "Standardy bezpieczeństwa i dobrostanu wolontariuszy – IFRC",
          "url": "https://www.ifrc.org/document/implementation-guide-standards-facilitate-safety-security-and-well-being-volunteers"
        },
        {
          "title": "Zgłaszanie i analiza incydentów przemocy – HSE",
          "url": "https://www.hse.gov.uk/violence/employer/reporting-learning-from-incidents.htm"
        },
        {
          "title": "Vademecum. Wolontariat w szkole zgodnie z prawem – NIW",
          "url": "https://niw.gov.pl/czytelnia/vademecum-wolontariat-w-szkole-zgodnie-z-prawem/"
        }
      ],
      "illustration": "volunteer-report",
      "practice": {
        "visual": {
          "title": "Dobierz drogę zgłoszenia",
          "kind": "comparison",
          "entries": [
            {
              "label": "Zagrożenie trwa",
              "detail": "Gdy potrzebna jest natychmiastowa interwencja, dzwoń pod 112 z bezpiecznego miejsca."
            },
            {
              "label": "Zdarzenie minęło",
              "detail": "Zapisz fakty. Podejrzenie przestępstwa możesz zgłosić Policji lub prokuraturze."
            },
            {
              "label": "Sprawa dotyczy koordynatora",
              "detail": "W organizacji skorzystaj z niezależnego kontaktu, który może przyjąć sprawę."
            }
          ]
        }
      }
    }
  },
  {
    "lesson_no": 23,
    "material": {
      "module": 6,
      "sections": [
        {
          "heading": "Cel lekcji",
          "text": "Udokumentujesz incydent i rozbieżność w rozliczeniu, zachowasz istniejące materiały i uzgodnisz bezpieczny powrót."
        },
        {
          "heading": "Co zapisać po zdarzeniu",
          "text": "Najpierw sprawdź, czy zagrożone osoby otrzymały pomoc i kto przejął sprawę. Zapisz godzinę i miejsce, przebieg zdarzenia, własne działania i możliwych świadków. Rozdziel to, co widziałeś, od cudzych wypowiedzi i swoich wniosków. Podaj dokładny cytat tylko wtedy, gdy pamiętasz jego brzmienie. Przy puszce odnotuj oznaczenie, stan zamknięcia, odczytane numery plomb i ostatnie potwierdzone przekazanie."
        },
        {
          "heading": "Rozbieżność przy liczeniu",
          "text": "Jeżeli trafisz na niezgodność przy liczeniu gotówki, zachowaj pierwotne zapisy i oba wyniki. Poproś wyznaczoną osobę o uruchomienie procedury ponownego liczenia. Zapisz kolejny wynik jako odrębny wpis z datą i osobami uczestniczącymi. Przy naruszeniu plomby lub innej możliwej ingerencji nie otwieraj puszki, nie wymieniaj zabezpieczenia i nie czyść przedmiotów. Wskaż właściwej osobie miejsce i stan rzeczy oraz stosuj polecenia służb, jeśli przejmą sprawę."
        },
        {
          "heading": "Istniejące materiały i ochrona danych",
          "text": "Zachowaj istniejące materiały w formie otrzymanej, jeśli masz do nich uprawniony dostęp. Zapisz, skąd i kiedy pochodzą. Jeżeli może istnieć nagranie z monitoringu, wskaż uprawnionemu administratorowi miejsce i godzinę. Przekaż niezbędne dane organizacji lub właściwym organom odpowiednim kanałem. Unikaj publikowania nagrań, dokumentów, danych uczestników i nazwisk na otwartych grupach. Nie zdobywaj materiałów przez przeszukiwanie cudzych rzeczy, kont lub telefonów."
        },
        {
          "heading": "Bezpieczny powrót do dyżuru",
          "text": "Podaj osobie prowadzącej sprawę, czego potrzebujesz na kolejnym dyżurze. Zespół może usprawnić rejestr, zmienić miejsce przekazania gotówki, wyznaczyć kontakt zastępczy albo obsadzić dyżur w parze. Ustalcie odpowiedzialność i termin sprawdzenia. Zgłaszaj też niebezpieczne sytuacje, które zakończyły się bez szkody, aby poprawić procedurę przed następnym dyżurem."
        },
        {
          "heading": "Co zrobić krok po kroku",
          "text": "1. Ustal, kto przejął sytuację i czy potrzebne jest dalsze wsparcie.\n2. Zapisz czas, miejsce, stan, źródła informacji, kwoty oraz wykonane działania w zakresie potrzebnym do sprawy.\n3. Zachowaj pierwotne wpisy i istniejące materiały, do których masz uprawniony dostęp. Przekaż je właściwym osobom odpowiednim kanałem.\n4. Uzgodnij poprawki w organizacji dyżuru, osobę odpowiedzialną i warunki powrotu."
        },
        {
          "heading": "Sytuacja z dyżuru",
          "text": "W fikcyjnej zbiórce upoważnione osoby uzyskują 380 zł i 350 zł podczas kontroli tej samej puli. Jedna osoba proponuje dopisać 30 zł z własnych pieniędzy, żeby rozliczenie się zgadzało."
        },
        {
          "heading": "Przećwicz",
          "text": "Napisz krótką notatkę o fikcyjnym incydencie przy rozliczeniu. Oddziel liczby zapisane podczas kontroli od relacji innej osoby. Wskaż, kto przejmuje sprawę i jaką zmianę organizacyjną warto sprawdzić przed kolejną zbiórką."
        },
        {
          "heading": "Sprawdź wynik po wykonaniu",
          "text": "Zachowaj oba odczyty i zgłoś rozbieżność osobie prowadzącej rozliczenie. Wstrzymaj zatwierdzanie wyniku. Zgodnie z instrukcją przeliczcie tę samą pulę, a rezultat i ewentualną korektę wpiszcie oddzielnie z datą, powodem i potwierdzeniem. Zachowaj rozdzielenie datków od prywatnych pieniędzy.\n\nKryterium ćwiczenia. Notatka zachowuje oba wyniki, opisuje źródło informacji, wskazuje odbiorcę i dalszą procedurę. Dane obejmują wyłącznie informacje potrzebne do ustalenia przebiegu zdarzenia."
        }
      ],
      "learning": {
        "intro": "Udokumentujesz incydent i rozbieżność w rozliczeniu, zachowasz istniejące materiały i uzgodnisz bezpieczny powrót.",
        "situation": "W fikcyjnej zbiórce upoważnione osoby uzyskują 380 zł i 350 zł podczas kontroli tej samej puli. Jedna osoba proponuje dopisać 30 zł z własnych pieniędzy, żeby rozliczenie się zgadzało.",
        "example": "Zachowaj oba odczyty i zgłoś rozbieżność osobie prowadzącej rozliczenie. Wstrzymaj zatwierdzanie wyniku. Zgodnie z instrukcją przeliczcie tę samą pulę, a rezultat i ewentualną korektę wpiszcie oddzielnie z datą, powodem i potwierdzeniem. Zachowaj rozdzielenie datków od prywatnych pieniędzy.",
        "task": "Napisz krótką notatkę o fikcyjnym incydencie przy rozliczeniu. Oddziel liczby zapisane podczas kontroli od relacji innej osoby. Wskaż, kto przejmuje sprawę i jaką zmianę organizacyjną warto sprawdzić przed kolejną zbiórką.",
        "question": "Dwa przeliczenia dały różne kwoty. Który zapis zostawisz?",
        "options": [
          "Wyłącznie wyższą kwotę, skoro jest korzystniejsza dla zbiórki.",
          "Wyłącznie późniejszy wpis, bez wzmianki o rozbieżności.",
          "Oba pierwotne odczyty oraz odrębny wpis o dalszej kontroli według procedury."
        ],
        "correct": 2,
        "explanation": "Zachowanie obu odczytów i opisu dalszych czynności pozwala odtworzyć przebieg rozliczenia i wyjaśnić różnicę."
      },
      "references": [
        {
          "title": "Ustawa o zasadach prowadzenia zbiórek publicznych",
          "url": "https://api.sejm.gov.pl/eli/acts/DU/2020/1672/text.html"
        },
        {
          "title": "Zgłoś przestępstwo – Gov.pl",
          "url": "https://www.gov.pl/web/gov/zglos-przestepstwo"
        },
        {
          "title": "Zgłaszanie i analiza incydentów przemocy – HSE",
          "url": "https://www.hse.gov.uk/violence/employer/reporting-learning-from-incidents.htm"
        },
        {
          "title": "Standardy bezpieczeństwa i dobrostanu wolontariuszy – IFRC",
          "url": "https://www.ifrc.org/document/implementation-guide-standards-facilitate-safety-security-and-well-being-volunteers"
        },
        {
          "title": "Zgłaszanie naruszeń ochrony danych – Urząd Ochrony Danych Osobowych",
          "url": "https://uodo.gov.pl/pl/525/2584"
        },
        {
          "title": "Rozporządzenie (UE) 2016/679 – RODO",
          "url": "https://eur-lex.europa.eu/legal-content/PL/TXT/?uri=CELEX:32016R0679"
        }
      ],
      "illustration": "volunteer-handover",
      "practice": {
        "visual": {
          "title": "Rozliczenie z różnicą",
          "kind": "flow",
          "entries": [
            {
              "label": "Pierwotne zapisy",
              "detail": "Zachowaj oba wyniki i odnotuj rozbieżność."
            },
            {
              "label": "Przejęcie sprawy",
              "detail": "Zawiadom osobę prowadzącą rozliczenie i wstrzymaj zatwierdzanie wyniku."
            },
            {
              "label": "Kontrola",
              "detail": "Upoważniona obsada ponownie liczy datki według procedury."
            },
            {
              "label": "Potwierdzenie",
              "detail": "Zapisz wynik kontroli, datę i powód jako oddzielny wpis."
            }
          ]
        }
      }
    }
  },
  {
    "lesson_no": 29,
    "material": {
      "module": 8,
      "sections": [
        {
          "heading": "Cel lekcji",
          "text": "Przygotujesz bezpieczny dyżur na wydarzeniu i zareagujesz na próbę przejęcia lub kradzież puszki."
        },
        {
          "heading": "Odprawa i stanowisko",
          "text": "Podczas odprawy ustal swoje zadanie, osobę nadzorującą, punkt rozliczenia, dostępne wejścia, drogi ewakuacji oraz miejsca pomocy. Jeżeli kwestujesz, wybierz miejsce uzgodnione z organizatorem, widoczne i uczęszczane. Zgodnie z instrukcją pracuj w parze lub grupie. Ustal, kto i jak wezwie pomoc. Miej naładowany telefon i zapisany kontakt do koordynatora oraz ochrony. Jeśli zbierają osoby małoletnie, potwierdź reguły opieki obowiązujące na danym wydarzeniu."
        },
        {
          "heading": "Nadzór nad puszką",
          "text": "Pilnuj puszki i przekazuj ją tylko osobie upoważnionej. Przy prośbie o przeniesienie lub zdanie puszki potwierdź dyspozycję z organizatorem przez ustalony numer lub punkt kontaktowy. Przejście do ustronnego miejsca, aby rzekomo odebrać dar, zwiększa ryzyko. Poproś darczyńcę o kontakt w miejscu kwesty lub wskaż oficjalny kanał wpłaty. W razie niepokojącego zachowania odsuń się, dołącz do zespołu i skontaktuj się z ochroną lub koordynatorem."
        },
        {
          "heading": "Próba odebrania lub kradzież puszki",
          "text": "Gdy ktoś wyrywa puszkę, priorytetem jest bezpieczeństwo osób. Odsuń się, zrezygnuj z pościgu i prób odbierania puszki. Jeżeli potrzebna jest natychmiastowa interwencja służb, dzwoń pod 112 z bezpiecznego miejsca. Podaj lokalizację, co widziałeś, czy ktoś ucierpiał i czy zagrożenie trwa. Jeśli zdarzenie się zakończyło i pomoc nie jest pilna, zgłoś kradzież Policji zwykłym kanałem i przekaż organizacji oznaczenie puszki oraz informacje o przekazaniu sprawy."
        },
        {
          "heading": "Organizacja wydarzenia",
          "text": "Przy tłoku poinformuj osobę nadzorującą, które przejście jest zablokowane. Przed dyżurem poznaj procedury dotyczące zagubionego dziecka, rzeczy znalezionych i dostępności wejścia. W publicznych komunikatach używaj tylko danych dopuszczonych przez organizację. Po dyżurze potwierdź, kto przejął nierozwiązane sprawy."
        },
        {
          "heading": "Co zrobić krok po kroku",
          "text": "1. Na odprawie ustal bezpieczne miejsce, skład grupy, kanał łączności i punkt przekazania puszki.\n2. Zachowaj stały nadzór nad puszką i potwierdzaj polecenia jej przekazania w ustalonym kanale.\n3. Przy próbie odebrania puszki odejdź w bezpieczne miejsce. Przy zdarzeniu wymagającym natychmiastowej interwencji użyj 112.\n4. Zgłoś fakty Policji i organizatorowi odpowiednim kanałem oraz odnotuj, kto przejął sprawę."
        },
        {
          "heading": "Sytuacja z dyżuru",
          "text": "Podczas kwesty nieznajomy szarpie wolontariusza, wyrywa mu puszkę i ucieka przez zatłoczone wejście. Wolontariusz upada, a ktoś z zespołu chce pobiec za sprawcą."
        },
        {
          "heading": "Przećwicz",
          "text": "Zaplanuj fikcyjny dyżur w parze. Wskaż bezpieczne stanowisko, drogę dojścia do punktu rozliczenia, osobę do kontaktu i sposób wezwania pomocy. Ułóż krótki meldunek o zdarzeniu z poszkodowanym."
        },
        {
          "heading": "Sprawdź wynik po wykonaniu",
          "text": "Odsuńcie się od zagrożenia i z bezpiecznego miejsca wezwijcie 112. Podajcie dokładne miejsce, informację o szarpnięciu i upadku oraz to, co da się potwierdzić. Nie ruszajcie za sprawcą. Jeśli jest bezpiecznie, pomóżcie poszkodowanemu zgodnie z poleceniem operatora. Następnie zgłoście zdarzenie organizatorowi.\n\nKryterium ćwiczenia. Plan uwzględnia osoby, miejsce, łączność i przekazanie puszki. Meldunek podaje lokalizację, przebieg i stan osób zagrożonych bez zachęcania do pościgu."
        }
      ],
      "learning": {
        "intro": "Przygotujesz bezpieczny dyżur na wydarzeniu i zareagujesz na próbę przejęcia lub kradzież puszki.",
        "situation": "Podczas kwesty nieznajomy szarpie wolontariusza, wyrywa mu puszkę i ucieka przez zatłoczone wejście. Wolontariusz upada, a ktoś z zespołu chce pobiec za sprawcą.",
        "example": "Odsuńcie się od zagrożenia i z bezpiecznego miejsca wezwijcie 112. Podajcie dokładne miejsce, informację o szarpnięciu i upadku oraz to, co da się potwierdzić. Nie ruszajcie za sprawcą. Jeśli jest bezpiecznie, pomóżcie poszkodowanemu zgodnie z poleceniem operatora. Następnie zgłoście zdarzenie organizatorowi.",
        "task": "Zaplanuj fikcyjny dyżur w parze. Wskaż bezpieczne stanowisko, drogę dojścia do punktu rozliczenia, osobę do kontaktu i sposób wezwania pomocy. Ułóż krótki meldunek o zdarzeniu z poszkodowanym.",
        "question": "Ktoś właśnie wyrwał puszkę, przewrócił wolontariusza i ucieka. Co jest właściwą reakcją?",
        "options": [
          "Z bezpiecznego miejsca wzywam 112, podaję lokalizację i informację o osobie poszkodowanej.",
          "Najpierw proszę organizatora o zgodę na telefon pod 112.",
          "Biegnę za sprawcą, a po powrocie ustalam, czy ktoś potrzebuje pomocy."
        ],
        "correct": 0,
        "explanation": "W świeżym zdarzeniu z przemocą i osobą poszkodowaną potrzebna jest szybka pomoc. Pozostanie w bezpiecznym miejscu ogranicza ryzyko kolejnych urazów."
      },
      "references": [
        {
          "title": "Bezpieczeństwo wolontariuszy na kweście – Policja w Oświęcimiu",
          "url": "https://oswiecim.policja.gov.pl/kos/o-nas/aktualnosci/67534,Oswiecim-Bezpieczenstwo-podczas-34-Finalu-WOSP-Policjanci-przeszkolili-wolontari.html"
        },
        {
          "title": "Regulamin wolontariusza 34. Finału WOŚP",
          "url": "https://static.wosp.org.pl/trunk/uploaded/sended/files/34final/regulaminy/regulamin_wolontariusza_34._final_wosp.pdf"
        },
        {
          "title": "Numer alarmowy 112 – jak zgłaszać zdarzenie",
          "url": "https://www.gov.pl/web/numer-alarmowy-112/jak-zglaszac"
        },
        {
          "title": "Standardy bezpieczeństwa i dobrostanu wolontariuszy – IFRC",
          "url": "https://www.ifrc.org/document/implementation-guide-standards-facilitate-safety-security-and-well-being-volunteers"
        },
        {
          "title": "Vademecum. Wolontariat w szkole zgodnie z prawem – NIW",
          "url": "https://niw.gov.pl/czytelnia/vademecum-wolontariat-w-szkole-zgodnie-z-prawem/"
        }
      ],
      "illustration": "volunteer-box",
      "practice": {
        "visual": {
          "title": "Bezpieczny dyżur na wydarzeniu",
          "kind": "flow",
          "entries": [
            {
              "label": "Odprawa",
              "detail": "Ustal miejsce, skład zespołu, łączność i punkt rozliczenia."
            },
            {
              "label": "Przekazanie puszki",
              "detail": "Potwierdź dyspozycję z organizatorem i użyj wyznaczonego punktu."
            },
            {
              "label": "Nagłe zagrożenie",
              "detail": "Odsuń się, zgłoś zdarzenie i zostaw odzyskanie puszki służbom."
            }
          ]
        }
      }
    }
  }
]$volunteer_lessons$::jsonb)
    as lesson(lesson_no smallint, material jsonb)
), merged as (
  select current_lesson.lesson_no,
    coalesce(current_lesson.material, '{}'::jsonb)
    || (additions.material - 'practice')
    || jsonb_build_object(
      'practice', coalesce(current_lesson.material -> 'practice', '{}'::jsonb) || (additions.material -> 'practice')
    ) as material
  from public.ta_lessons as current_lesson
  join additions using (lesson_no)
  where current_lesson.course_slug = 'zaufany-wolontariusz'
)
update public.ta_lessons as lesson
set material = merged.material, updated_at = now()
from merged
where lesson.course_slug = 'zaufany-wolontariusz'
  and lesson.lesson_no = merged.lesson_no
  and lesson.material is distinct from merged.material;

update public.ta_course_previews
set workshop_count = 10,
  editorial_note = 'Kurs edukacyjny obejmuje 40 działów, 10 kart pracy, sprawdzian sytuacyjny i dodatkowy test o bezpieczeństwie zbiórek. Dyplom ma charakter wewnętrzny.',
  updated_at = now()
where course_slug = 'zaufany-wolontariusz'
  and (workshop_count, editorial_note) is distinct from
    (10, 'Kurs edukacyjny obejmuje 40 działów, 10 kart pracy, sprawdzian sytuacyjny i dodatkowy test o bezpieczeństwie zbiórek. Dyplom ma charakter wewnętrzny.');

commit;
