"""Prepare the reviewed 30-lesson AutoCAD release from a verified live snapshot.
Usage: python scripts/prepare-autocad-review.py /absolute/path/to/snapshot.json
This does not write to production.
"""
import json,sys
from pathlib import Path

rows=json.loads(Path(sys.argv[1]).read_text())
assert len(rows)==30 and [r['lesson_no'] for r in rows]==list(range(30))
# Each row: topic-specific curiosity, real-program practice, expected result, common mistake.
review=[
('Przybliżenie rysunku działa jak lupa: odcinek zajmuje więcej miejsca na ekranie, ale jego długość w modelu pozostaje taka sama.',
 'Na tej stronie poznajesz pojęcia. Nie musisz jeszcze rysować. Obejrzyj oryginalne fragmenty ekranu powyżej i znajdź miejsce na rysunek oraz wiersz poleceń. Powiedz własnymi słowami, czym różni się plik z geometrią od fotografii.',
 'Wiesz, że CAD przechowuje obiekty o współrzędnych i wymiarach. Potrafisz wskazać, gdzie będziesz rysować i gdzie program pokaże kolejny krok. W następnych lekcjach wyjaśnimy jednostki i polecenia.',
 'Zdjęcie nie daje samo z siebie pewnej skali. Nawet rysunek DWG trzeba sprawdzić: jaka jest jednostka, skąd pochodzi plik i czy pokazuje aktualny stan.'),
('Gwiazdka przy nazwie karty rysunku oznacza niezapisane zmiany. To niewielki znak, który pomaga zauważyć, że bieżąca wersja różni się od zapisanej.',
 'Otwórz nowy rysunek w AutoCAD-zie. Znajdź wstążkę, karty rysunków, obszar modelu i wiersz poleceń. Wpisz _LINE, naciśnij Enter i przeczytaj pytanie o pierwszy punkt. Naciśnij Esc, ponieważ w tej próbie tylko rozpoznajesz komunikat.',
 'Potrafisz uruchomić polecenie, odczytać, czego oczekuje program, i je przerwać. Po Esc nie powinien powstać odcinek, jeśli nie podano jeszcze punktów.',
 'Samo uruchomienie LINE nie tworzy linii. Program potrzebuje jej początku i końca. Zamiast ponownie klikać narzędzie, przeczytaj komunikat.'),
('Zmiana końcówki nazwy pliku z .pdf na .dwg nie zamienia dokumentu w rysunek CAD. Rozszerzenie jest nazwą formatu, a nie poleceniem konwersji.',
 'Załóż folder Kurs_AutoCAD. W notatce zaplanuj nazwy trzech plików: panel_A.dwg do edycji, panel_A.pdf do odczytu i panel_A.dxf tylko wtedy, gdy odbiorca wymaga wymiany w tym formacie. Zapisz, komu i w jakim celu przekazujesz każdy z nich.',
 'Plik źródłowy pozostaje zachowany. W nazwie DWG i PDF jest ta sama wersja A. Potrafisz wyjaśnić, dlaczego odbiorcy PDF-a nie obiecujesz pełnej edycji oryginalnego modelu.',
 'PDF nie zastępuje całej dokumentacji roboczej. Import geometrii z PDF może też dać inne obiekty niż w oryginalnym DWG.'),
('Pokój o szerokości 4 m ma 4000 mm. Ten sam wymiar zapisany w dwóch jednostkach daje liczby różniące się tysiąc razy.',
 'W nowym rysunku przyjmij 1 jednostkę = 1 mm i zapisz to w notatce. Przelicz 4 m, 3 m i 0,6 m na milimetry. W ustawieniach jednostek sprawdź format i jednostkę wstawiania. Nie zmieniaj skali istniejącego projektu bez sprawdzenia wymiaru odniesienia.',
 'Wyniki to 4000 mm, 3000 mm i 600 mm. Rozróżniasz wyświetlanie liczby, jednostkę wstawiania i rzeczywisty rozmiar już narysowanego obiektu.',
 'Samo wybranie milimetrów w ustawieniach nie jest dowodem, że otrzymana geometria ma poprawne wymiary. Zmierz znany odcinek.'),
('Znak @ mówi o przesunięciu względem poprzedniego punktu. Dlatego @100,0 może prowadzić do różnych współrzędnych końcowych zależnie od miejsca startu.',
 'W wierszu poleceń uruchom _LINE. Wpisz punkt -1000,-700, potem @4200,0 i zakończ Enterem. Zapisuj współrzędne w wierszu poleceń, a nie w polach dynamicznych przy kursorze. Odczytaj oba końce we Właściwościach.',
 'Punkt końcowy to (3200, -700), a długość odcinka wynosi 4200 jednostek. Współrzędna Y się nie zmieniła.',
 'Wpis @4200,0 nie oznacza punktu (4200,0). Dodajesz przesunięcie do punktu poprzedniego. Przy wpisywaniu dziesiętnych współrzędnych używaj kropki, a przecinkiem oddzielaj X i Y.'),
('Obrys może wyglądać jak trójkąt, choć składa się z trzech osobnych obiektów. O sposobie zaznaczania decyduje typ geometrii, nie sam wygląd.',
 'W pustym rysunku uruchom _LINE. Podaj 0,0, następnie 1000,0 i 500,800. Wpisz _Close. Powstaną trzy odcinki. Zaznacz wszystkie trzy i użyj _JOIN. We Właściwościach sprawdź typ Polilinia oraz zamknięcie. Jeżeli połączenie nie powstało, sprawdź wspólne końce i wysokość Z; możesz użyć _PEDIT z opcją Dołącz. Dla porównania narysuj taki sam trójkąt poleceniem _PLINE i zakończ _Close.',
 'Trójkąt po poprawnym połączeniu zaznacza się jako jedna polilinia. Drugi, narysowany PLINE, również jest jednym obiektem. Pole trójkąta o podstawie 1000 i wysokości 800 wynosi 400 000 jednostek kwadratowych.',
 'Nie przeciągaj pojedynczego uchwytu wierzchołka, jeśli chcesz przesunąć cały kształt. Użyj MOVE na zaznaczonym obiekcie. Samo zetknięcie linii nie łączy ich automatycznie.'),
('Esc przerywa dalsze wykonywanie polecenia, ale nie usuwa automatycznie wszystkich obiektów, które zdążyły już powstać.',
 'Uruchom _LINE, wskaż trzy różne punkty i naciśnij Esc. Następnie użyj Cofnij i porównaj rysunek. W drugiej próbie uruchom _RECTANG, wskaż tylko pierwszy narożnik i naciśnij Esc.',
 'Po pierwszym Esc pozostają dwa zatwierdzone odcinki. Po przerwaniu RECTANG przed drugim narożnikiem prostokąt jeszcze nie powstał. Wiesz, kiedy przerwać polecenie, a kiedy cofnąć zmianę.',
 'Enter nie zawsze oznacza to samo: może zatwierdzać wybór, kończyć etap albo powtarzać ostatnie polecenie. Zawsze sprawdzaj bieżący komunikat.'),
('Wyłączenie warstwy przypomina schowanie przezroczystej kalki z częścią rysunku. Obiekty nadal istnieją i wracają po włączeniu widoczności.',
 'Otwórz menedżer warstw poleceniem _LAYER. Utwórz Obrys i Osie, nadaj im różne kolory. Ustaw Obrys jako bieżącą i narysuj prostokąt. Na Osie dodaj linię. Przełącz bieżącą warstwę na Obrys, wyłącz Osie, a potem włącz ją ponownie.',
 'Prostokąt pozostaje widoczny przez cały czas. Linia osi wraca dokładnie w to samo miejsce. We Właściwościach obiektów widzisz odpowiednio Obrys i Osie.',
 'Nadanie obiektowi innego koloru nie przenosi go na inną warstwę. Sprawdź pole Warstwa, a kolor pozostaw ByLayer, jeżeli ma wynikać z warstwy.'),
('Jeden model możesz pokazać na kilku arkuszach w różnych skalach, bez tworzenia pomniejszonej kopii geometrii.',
 'Na kartce rozpisz, co należy do modelu pokoju, a co do arkusza. Model: ściany o rzeczywistych wymiarach. Arkusz: ramka, tabliczka i rzutnia pokazująca model. Przelicz, jak duży będzie pokój 4000 × 3000 mm w skali 1:50.',
 'Widok pokoju na papierze ma 80 × 60 mm. W modelu nadal ma 4000 × 3000 mm. Wymiary można organizować różnymi sposobami; ważne, by ich wartość i czytelność odpowiadały przyjętemu sposobowi dokumentowania.',
 'Nie zmniejszaj budynku poleceniem SCALE tylko po to, aby zmieścił się na kartce. Dobierz skalę rzutni i ustawienia arkusza.'),
('Prostokąt 4 × 3 m ma przekątną 5 m. Ta zależność daje prosty, niezależny sposób sprawdzenia pierwszego szkicu.',
 'W nowym rysunku milimetrowym wpisz _RECTANG, podaj 0,0 i @4000,3000. Wykonaj _ZOOM z opcją _Extents. Poleceniem _DIST zmierz dwa boki i przekątną, przyciągając do narożników. Zapisz plik pokoj_A.dwg.',
 'Boki mają 4000 i 3000 mm, przekątna 5000 mm, a pole 12 000 000 mm², czyli 12 m². Zapisany plik możesz zamknąć i ponownie otworzyć.',
 'Tekst „4 × 3 m” dopisany do przypadkowego prostokąta nie poprawia geometrii. Wynik potwierdź pomiarem rzeczywistych krawędzi.'),
('Okrąg o promieniu 300 mm ma średnicę 600 mm. Pomylenie tych wartości daje obiekt dwa razy większy niż planowano.',
 'W jednym pliku narysuj LINE o długości 1000, zamkniętą PLINE z trzema wierzchołkami, RECTANG 1000 × 600 i CIRCLE o środku 2000,1000 oraz promieniu 300. Wskazuj każdy obiekt osobno i odczytaj jego typ we Właściwościach.',
 'Rozpoznajesz linię, polilinię i okrąg. Prostokąt wykonany RECTANG jest polilinią. Dla okręgu odczytujesz promień 300 i średnicę 600.',
 'Podczas wpisywania CIRCLE czytaj, czy program pyta o promień, czy o średnicę. Nie wpisuj tej samej wartości do obu opcji.'),
('MOVE zmienia położenie obiektu, a SCALE jego wielkość. Dwa rysunki mogą wyglądać podobnie po zmianie widoku, choć przeszły zupełnie różne operacje.',
 'Użyj połączonego trójkąta z lekcji 6. Zaznacz jego krawędź i uruchom _MOVE. Wskaż bazę 0,0, a jako punkt docelowy wpisz @2000,0. Następnie wykonaj kopię poleceniem _COPY o przesunięciu @0,1500. Na kopii wypróbuj _ROTATE o 90 stopni, a potem cofnij tę zmianę.',
 'Pierwszy trójkąt przesunął się w całości o 2000 w osi X. Kopia ma identyczne długości boków i jest wyżej o 1500. Po obrocie długości boków także się nie zmieniają.',
 'Gdy przesuwa się tylko jeden bok, zaznaczono linię, a nie cały obrys. Połącz linie albo zaznacz wszystkie potrzebne obiekty przed MOVE.'),
('Siatka widoczna na ekranie i przyciąganie do siatki to osobne ustawienia. Można widzieć kratkę i nadal wskazywać punkty między jej liniami.',
 'W ustawieniach OSNAP włącz przyciąganie do końca odcinka. Narysuj nową linię rozpoczynającą się dokładnie na końcu starej. Sprawdź marker przed kliknięciem. Następnie włącz ORTHO i narysuj odcinek poziomy. Porównaj to z próbą przy wyłączonych ustawieniach.',
 'Połączenie ma wspólny punkt końcowy. Poziomy odcinek ma taką samą współrzędną Y na obu końcach. Potrafisz odróżnić przyciąganie do obiektu od ograniczenia kierunku.',
 'Blisko położony kursor nie gwarantuje połączenia. Zwracaj uwagę na marker OSNAP; przypadkowe przyciągnięcie do środka odcinka może dać inny punkt niż zamierzony.'),
('Właściwość ByLayer pozwala zmienić wygląd wielu obiektów przez zmianę warstwy. Ręcznie nadany kolor może pozostać inny mimo zmiany koloru warstwy.',
 'Utwórz trzy linie na warstwie Obrys. Dwie pozostaw w kolorze ByLayer, trzeciej nadaj kolor bezpośrednio. Zmień kolor warstwy i porównaj wynik. Przywróć ByLayer wszystkim trzem, jeśli mają wspólny wygląd.',
 'Po pierwszej zmianie dwie linie przyjmują nowy kolor warstwy, a trzecia zachowuje własny. Po przywróceniu ByLayer wszystkie reagują zgodnie z warstwą.',
 'Przed masową zmianą sprawdź zakres zaznaczenia i właściwości obiektów. Różny kolor nie zawsze oznacza różne warstwy.'),
('PAN przesuwa widok tak jak przesunięcie kartki pod lupą. Współrzędne obiektów pozostają bez zmian.',
 'Zapisz odczytaną długość boku pokoju. Przybliż rysunek kółkiem myszy, przesuń widok i ponownie zmierz ten bok. Wpisz _ZOOM, wybierz _Extents i sprawdź, czy widzisz cały rysunek. Polecenie _REGEN zastosuj, gdy potrzebne jest odświeżenie sposobu wyświetlania.',
 'Długość boku przed zmianą widoku i po niej wynosi tyle samo. ZOOM i PAN nie zmieniły wymiarów ani położenia w modelu.',
 'Nie używaj MOVE do przesuwania samego widoku. Jeśli po Zoom Extents rysunek staje się bardzo mały, sprawdź, czy daleko od niego nie ma przypadkowego obiektu.'),
('Kilka wstawień bloku korzysta z jednej definicji. To pomaga utrzymać ten sam symbol w wielu miejscach rysunku.',
 'Narysuj prosty symbol słupka: kwadrat 50 × 50. Poleceniem _BLOCK nadaj mu nazwę SLUPEK i wybierz punkt bazowy w środku. Wstaw trzy egzemplarze. Następnie zapisz osobny plik podklad.dwg i dołącz go jako odnośnik zewnętrzny do pliku ćwiczeniowego.',
 'Rozróżniasz definicję bloku, jego wstawienia i XREF odwołujący się do osobnego pliku. Wiesz, gdzie leży plik podkładu i czego będzie potrzebował odbiorca rysunku.',
 'Widoczny XREF nie oznacza, że jego zawartość została trwale skopiowana do pliku głównego. Przeniesienie lub brak pliku podkładu może przerwać odwołanie.'),
('Ręcznie wpisany tekst wymiaru może pokazywać inną liczbę niż rzeczywista geometria. Ładny napis nie jest dowodem poprawnego rozmiaru.',
 'Narysuj odcinek 1000 mm i dodaj wymiar. Zmierz ten sam odcinek niezależnie poleceniem _DIST. Na kopii zmień geometrię do 980 mm i sprawdź, co pokazuje wymiar. Jeżeli nie reaguje, sprawdź jego powiązanie z obiektem i ewentualne nadpisanie tekstu.',
 'Odczyt DIST odpowiada rzeczywistej długości. Potrafisz wskazać różnicę między wartością mierzoną a napisem zastępującym wymiar.',
 'Nie poprawiaj rozbieżności przez wpisanie oczekiwanej liczby na wymiarze. Ustal, czy błędny jest model, powiązanie wymiaru czy opis.'),
('Zapis DWG i eksport PDF to dwa różne wyniki pracy. Można zapisać poprawny model, a jednocześnie wyeksportować niewłaściwy zakres arkusza.',
 'Zapisz pokoj_A.dwg. Przygotuj arkusz z nazwą, jednostką i skalą. Otwórz podgląd wydruku, a następnie utwórz PDF. Otwórz gotowy PDF w przeglądarce dokumentów i sprawdź, czy są w nim wszystkie wymiary, linie i oznaczenie wersji.',
 'DWG i PDF mają zgodną wersję A. PDF zawiera cały potrzebny rysunek, a tekst pozostaje czytelny przy docelowym rozmiarze wydruku.',
 'Podgląd na ekranie AutoCAD-a nie zastępuje sprawdzenia wyeksportowanego PDF-a. Szczególnie skontroluj warstwy wyłączone z drukowania.'),
('Cztery słupki ustawione w jednej linii tworzą trzy odstępy. Liczba elementów i liczba przerw między nimi to różne rzeczy.',
 'Wstaw cztery symbole słupków w punktach X=0, 800, 1600, 2400, przy Y=0. Dodaj wymiar całkowity i trzy wymiary odcinkowe. W kopii B przesuń ostatni słupek do X=2380. Oznacz rysunek jako ćwiczenie, a zmieniony odstęp zaznacz w opisie.',
 'Wersja A ma trzy odstępy po 800 mm i rozstaw skrajnych osi 2400 mm. W wersji B ostatni odstęp wynosi 780 mm, a rozstaw skrajnych osi 2380 mm.',
 'Nie utożsamiaj rozstawu osi ze światłem między krawędziami. Grubość słupków wpływa na wolną przestrzeń.'),
('Ten sam wynik warto sprawdzić dwiema drogami: wymiarem na rysunku i osobnym pomiarem DIST. Rozbieżność szybko ujawnia problem z opisem lub zaznaczonymi punktami.',
 'Narysuj obrys 4200 × 3000 mm. Dodaj okrąg o średnicy 600 na osobnej warstwie i linię osi. Zwymiaruj szerokość, zmierz ją ponownie przez DIST, zapisz DWG i przygotuj PDF. Wyłącz na chwilę warstwę osi, by sprawdzić, czy obrys pozostaje nienaruszony.',
 'Obie kontrole szerokości dają 4200 mm, średnica wynosi 600 mm, a wyłączenie osi nie usuwa obrysu. PDF zawiera potrzebne wymiary.',
 'Nie oceniaj ukończenia wyłącznie po wyglądzie. Sprawdź liczby, jednostkę, widoczność warstw i zapisany plik.'),
('Najnowsza data zapisu nie musi oznaczać wersji zatwierdzonej. Można dziś zapisać roboczą kopię starszego rysunku.',
 'Przygotuj dwie kopie panelu: A o szerokości 600 i B o szerokości 650 mm. Dodaj do każdej nazwę, rewizję, datę i status: „do sprawdzenia”. W wykazie zapisz, co zmieniono i która wersja czeka na akceptację. Nie dopisuj samodzielnie tolerancji ani wymagań konstrukcyjnych, których nie określono w zadaniu.',
 'Odbiorca rozpoznaje wersję i jej status bez zgadywania z daty pliku. Szkic ćwiczeniowy nie jest opisany jako dokument zatwierdzony do produkcji.',
 'Wysłanie nowszego pliku nie jest równoznaczne z jego zatwierdzeniem. Status wydania musi być jednoznaczny.'),
('Dwie linie przecinające się na rzucie 2D nie zawsze oznaczają zderzenie w przestrzeni. Elementy mogą znajdować się na różnych wysokościach.',
 'Na osobnych warstwach narysuj rzut rury i wspornika. Zaznacz miejsce przecięcia. W notatce podaj współrzędne, wersje obu rysunków i znane wysokości. Jeśli wysokości nie podano, napisz, jakiej informacji brakuje. Nie przesuwaj elementu tylko po to, by przecięcie zniknęło z obrazka.',
 'Zgłoszenie rozróżnia widoczne przecięcie na rzucie od potwierdzonej kolizji przestrzennej. Ma lokalizację i konkretne pytanie do rozstrzygnięcia.',
 'Ukrycie warstwy usuwa problem z widoku, ale nie rozwiązuje konfliktu projektu. Najpierw ustal geometrię w trzech wymiarach.'),
('Brak czcionki albo podkładu może zmienić wygląd rysunku, chociaż sam plik DWG daje się otworzyć.',
 'Otwórz kopię otrzymanego pliku. Zapisz jego nazwę i wersję. Sprawdź komunikaty, odnośniki, warstwy oraz jeden wymiar odniesienia. Porównaj rysunek z kontrolnym PDF-em. Wypisz brakujące pliki i nie nadpisuj oryginału.',
 'Masz listę sprawdzonych elementów i braków. Potrafisz odróżnić pustą warstwę, warstwę ukrytą i brakujący odnośnik.',
 'Samo zamknięcie ostrzeżenia nie usuwa jego przyczyny. Przed użyciem rysunku ustal, czy brakuje informacji istotnej dla zadania.'),
('Wariant i rewizja odpowiadają na inne pytania: wariant pokazuje możliwe rozwiązanie, a rewizja dokumentuje zmianę określonego rozwiązania.',
 'Z pliku panel_A.dwg utwórz panel_B.dwg i zmień szerokość z 600 na 650 mm. Dodaj opis „zwiększono szerokość o 50 mm” oraz status do sprawdzenia. Zachowaj A. Jeżeli przygotowujesz alternatywny układ otworów, nazwij go wariantem i opisz osobno.',
 'Możesz wskazać poprzednią geometrię, nową geometrię i przyczynę zmiany. Nazwy plików, tabliczka i wykaz mówią o tej samej wersji.',
 'Nazwa „ostateczny_nowy2” nie wyjaśnia, która wersja obowiązuje. Ustal prosty, konsekwentny sposób oznaczania.'),
('Odcinek 5000 mm ma na papierze 100 mm w skali 1:50, a 50 mm w skali 1:100. Sam model nie zmienia się ani o milimetr.',
 'Pokaż ten sam model na dwóch arkuszach, w rzutniach 1:50 i 1:100. Ustaw format papieru i kontrolowaną skalę wydruku arkusza. Zapisz dwa PDF-y. Sprawdź opisy i wymiary, a przy wydruku wybierz rzeczywisty rozmiar, bez dodatkowego dopasowania do strony.',
 'Odcinek 5000 mm zajmuje na papierze odpowiednio 100 i 50 mm. Tekst jest czytelny w obu wariantach. Rozmiar geometrii w modelu pozostaje 5000 mm.',
 'Dodatkowe „Dopasuj do strony” w przeglądarce PDF lub drukarce może zmienić końcową skalę, mimo poprawnej rzutni.'),
('Różnicę pomiaru można zapisać ze znakiem. Jeśli stan rzeczywisty ma 3170 mm, a projekt 3200 mm, różnica „pomiar minus projekt” wynosi -30 mm.',
 'W notatce pomiarowej zapisz 3200 mm z rysunku i 3170 mm z pomiaru. Określ te same punkty odniesienia, datę i narzędzie. Oblicz różnicę, zaznacz miejsce na szkicu i przygotuj pytanie o sposób uwzględnienia rozbieżności.',
 'Różnica wynosi -30 mm, czyli zmierzony wymiar jest krótszy o 30 mm. Notatka pozwala odtworzyć, co dokładnie porównano.',
 'Nie zmieniaj po cichu modelu, żeby zgadzał się z jednym odczytem. Najpierw potwierdź punkty pomiaru i ustal decyzję o zmianie.'),
('Dwa bloki nałożone dokładnie na siebie mogą wyglądać jak jeden. Liczenie samych widocznych symboli może więc dać błędny wynik.',
 'W pliku próbnym wstaw pięć bloków SLUPEK. Na kopii dodaj szósty dokładnie na jednym z istniejących. Porównaj liczbę widocznych symboli i liczbę wstawień. Jeśli Twoja wersja ma COUNT, sprawdź jego szczegóły i ostrzeżenia; w starszej wersji użyj wyboru obiektów i Właściwości.',
 'W kopii są sześć wstawień, choć widać pięć miejsc. Potrafisz wskazać nakładkę i wyjaśnić różnicę w zestawieniu.',
 'Nie zatwierdzaj ilości wyłącznie na podstawie tabeli. Sprawdź zakres zliczania, nazwy bloków i ewentualne duplikaty.'),
('Domknięcie obrysu i brak samoprzecięć to różne warunki. Zamknięta polilinia nadal może przecinać samą siebie.',
 'Narysuj prostokąt 1000 × 600 mm i zapisz kopię. Na jednej kopii dodaj zdublowaną linię, a na drugiej zrób szczelinę 2 mm. Obejrzyj narożniki i liczbę obiektów. Po korekcie sprawdź zamknięcie, pole i długości boków.',
 'Poprawny prostokąt ma pole 600 000 mm² i obwód 3200 mm. Raport wskazuje, gdzie był duplikat lub szczelina i co zmieniono.',
 'Udane kreskowanie jest pomocną kontrolą, ale nie dowodzi samo w sobie braku wszystkich błędów. Sprawdź też punkty, duplikaty i samoprzecięcia.'),
('Plik główny może odwoływać się do innych plików. Rysunek, który działa na Twoim komputerze, może być niekompletny po wysłaniu samego DWG.',
 'Przygotuj paczkę z bieżącym DWG, odpowiadającym mu PDF-em, potrzebnymi odnośnikami i wykazem wersji. Użyj eTransmit, jeśli jest dostępne w Twojej wersji, i przejrzyj raport plików dołączonych oraz pominiętych. Rozpakuj kopię w innym folderze i ją otwórz.',
 'Wskazana jest jedna aktualna wersja. Odnośniki działają w nowym folderze, PDF ma zgodną rewizję, a wykaz wyjaśnia przeznaczenie plików.',
 'Automatyczna paczka nie zwalnia z kontroli raportu. Część zależności może być pominięta albo niedostępna.'),
('Przesunięcie obu otworów o ten sam wektor zachowuje ich rozstaw. Przesunięcie tylko jednego otworu zmienia rozstaw.',
 'Przygotuj panel A: 600 × 350 mm, otwory o promieniu 10, środki (50,50) i (550,50). Zapisz A. W kopii B zwiększ szerokość do 650, przesuń środki na (50,70) i (600,70). Dodaj wymiary, oznaczenia wersji, PDF i listę kontroli. Otwórz ponownie oba pliki i porównaj je.',
 'W A rozstaw środków wynosi 500 mm. W B wynosi 550 mm; prawy otwór leży 50 mm od prawej krawędzi, a oba środki 70 mm od dolnej. Promienie pozostają 10 mm. Pliki i opis zmian są spójne.',
 'Nie oznaczaj ćwiczenia jako dokumentu gotowego do produkcji. Oddziel to, co sprawdzono w kursie, od wymagań, obliczeń i zatwierdzeń rzeczywistego projektu.'),
]
assert len(review)==30
later_intros=[
 'Narzędzie wybierasz według tego, co chcesz później zrobić z obiektem. LINE daje osobne odcinki, PLINE jeden obiekt z wieloma segmentami, a CIRCLE okrąg. RECTANG tworzy prostokątną polilinię. Rysunek może wyglądać podobnie, ale zaznaczanie i edycja będą inne. W tej lekcji sprawdzisz typy we Właściwościach, zamiast zgadywać je po wyglądzie.',
 'Przed zmianą geometrii ustal trzy rzeczy: co zaznaczasz, gdzie jest punkt bazowy i jaki ma być wynik. MOVE przesuwa, COPY tworzy dodatkowy egzemplarz, ROTATE obraca, a SCALE zmienia wielkość. Punkt bazowy jest odniesieniem dla operacji. Przy przesunięciu wszystkie punkty wybranego obiektu zmieniają położenie o ten sam wektor, dzięki czemu kształt i wymiary pozostają takie same.',
 'Dokładność nie polega na trafieniu kursorem w odpowiedni piksel. OSNAP pozwala wskazać charakterystyczne punkty istniejących obiektów, np. koniec lub środek odcinka. ORTHO ogranicza wskazywany kierunek do poziomu i pionu bieżącego układu. Widoczna siatka pomaga się orientować, natomiast skok siatki ogranicza pozycje kursora. To różne narzędzia, które trzeba świadomie włączać.',
 'Warstwy porządkują znaczenie obiektów, a Właściwości pozwalają sprawdzić cechy zaznaczonego elementu. Obiekt może dziedziczyć kolor i rodzaj linii po warstwie albo mieć własne ustawienia. ByLayer oznacza dziedziczenie z warstwy. Gdy dwa elementy na tej samej warstwie wyglądają inaczej, sprawdź nadpisane właściwości, zanim zaczniesz zmieniać cały rysunek.',
 'Widok jest sposobem oglądania modelu. ZOOM przybliża lub oddala, PAN przesuwa to, co widzisz, a REGEN przelicza sposób wyświetlania rysunku. Żadne z tych działań nie powinno zmieniać rzeczywistej długości boku pokoju. Rozróżnienie widoku i geometrii chroni przed częstą pomyłką: przesuwaniem lub skalowaniem obiektów tylko po to, by lepiej je zobaczyć.',
 'Blok to nazwana definicja, którą wstawiasz wielokrotnie. Może reprezentować np. symbol słupka, drzwi albo urządzenia. Punkt bazowy pomaga ustawić każde wstawienie w określonym miejscu. XREF jest odwołaniem do osobnego pliku, używanym np. jako podkład innej branży. Oba rozwiązania ograniczają powtarzanie pracy, ale wymagają kontroli nazw, położenia i jednostek.',
 'Wymiar informuje odbiorcę o wielkości lub położeniu elementu. Czytelny opis powinien odpowiadać geometrii, dlatego sprawdzamy go niezależnym pomiarem. Styl wymiarowania ustala wygląd strzałek, tekstu i innych oznaczeń. Powiązanie wymiaru z obiektem pomaga aktualizować wartość po zmianie, lecz ręczne nadpisanie tekstu może tę informację ukryć.',
 'Zapis utrwala bieżącą pracę w pliku DWG. Wydruk lub eksport przygotowuje konkretny widok na arkuszu. Przed wysłaniem potrzebujesz obu kontroli: właściwej wersji modelu oraz czytelnego dokumentu dla odbiorcy. Nazwa pliku, tabliczka i wykaz powinny wskazywać tę samą rewizję. Przy większych zmianach zachowuj poprzednią wersję.',
 'W szkicu balustrady rozdziel położenie osi słupków, wymiary samych słupków i światło między nimi. Są to różne wielkości. Rysunek ćwiczeniowy służy nauce rozmieszczania, warstw i wymiarów. Nie dobieramy tu elementów nośnych. Zaczniemy od czterech symboli na jednej osi, a potem sprawdzimy, jak przesunięcie ostatniego zmienia wymiary.',
 'Teraz łączysz poznane czynności w jeden przebieg pracy. Najpierw ustalasz jednostkę i tworzysz geometrię, potem porządkujesz warstwy, dodajesz wymiary i sprawdzasz wynik. Dopiero na końcu zapisujesz wersję do przekazania. Gotowy rysunek powinien dać się odczytać także komuś, kto nie widział, jak go tworzyłeś.',
 'Rysunek przeznaczony do wykonania jest częścią dokumentacji, a nie tylko obrazem kształtu. Odbiorca musi wiedzieć, której części dotyczy, jakie ma wymiary, jaka wersja obowiązuje i jaki jest status zatwierdzenia. W tym ćwiczeniu uczysz się porządku dokumentacyjnego. Wymagania konstrukcyjne i tolerancje przyjmuje się z właściwego projektu, nie z domysłu osoby rysującej.',
 'Koordynacja polega na porównywaniu informacji o tym samym miejscu. Na rzucie 2D widzisz położenie w planie, ale nie zawsze wysokość elementu. Zanim nazwiesz przecięcie kolizją, sprawdź poziomy i zakres obu rysunków. Dobre zgłoszenie pokazuje lokalizację, wersje dokumentów, obserwację oraz informację potrzebną do podjęcia decyzji.',
 'Otrzymany DWG może korzystać z podkładów, czcionek i ustawień, których nie ma na Twoim komputerze. Może też być zapisany w innej jednostce niż Twoje pliki. Dlatego pierwszym krokiem jest kontrola na kopii, a nie natychmiastowe użycie geometrii. Zapisz komunikaty i sprawdź przynajmniej jeden wymiar, którego prawidłową wartość znasz z wiarygodnego źródła.',
 'Rewizja to oznaczona zmiana dokumentacji, a wariant pokazuje alternatywne rozwiązanie. W obu przypadkach odbiorca potrzebuje jasnego opisu. Zachowanie poprzedniej wersji umożliwia porównanie oraz wyjaśnienie, dlaczego wymiar lub układ został zmieniony. Własna data zapisu pomaga w pracy, ale nie zastępuje informacji o statusie dokumentu.',
 'Skala rzutni ustala, jak duży fragment modelu zobaczysz na papierze. Ustawienia wydruku arkusza są kolejnym etapem, a przeglądarka PDF lub drukarka może jeszcze włączyć własne dopasowanie do strony. Kontrolujesz więc cały przebieg od modelu do papieru. Mniejsza skala wymaga również sprawdzenia, czy teksty i szczegóły pozostają czytelne.',
 'Pomiar rzeczywistego elementu porównuj z tym samym miejscem w dokumentacji. Długość między osiami może być inna niż długość między krawędziami. Zapisuj punkty odniesienia, jednostkę, datę i sposób pomiaru. Dopiero po takim porównaniu można ocenić, czy wystąpiła rozbieżność i jakie wyjaśnienie jest potrzebne przed zmianą modelu.',
 'Zestawienie ilości jest wynikiem przyjętego zakresu i sposobu zliczania. Symbole mogą się nakładać, być w innych warstwach, mieć różne nazwy lub stanowić części większego bloku. Dlatego liczbę z tabeli trzeba porównać z rysunkiem. W prostym przykładzie nauczysz się wykrywać ukryte dodatkowe wstawienie i wyjaśniać różnicę.',
 'Przed oddaniem geometrii sprawdź ciągłość obrysu, duplikaty, samoprzecięcia i wymiary skrajne. Dwa kształty wyglądające podobnie przy dużym oddaleniu mogą mieć inne pole albo małą szczelinę. Pracuj na kopii, aby móc porównać wynik korekty z punktem wyjścia. Samo zmniejszenie liczby obiektów nie dowodzi jeszcze, że rysunek został poprawiony.',
 'Przekazanie rysunku kończy się dopiero wtedy, gdy odbiorca potrafi otworzyć właściwą wersję wraz z jej zależnościami. Plik główny może korzystać z innych rysunków, obrazów i ustawień wydruku. Dołącz krótki wykaz: co jest bieżące, co jest podkładem i jaki status ma całość. Paczkę warto sprawdzić w innym folderze niż roboczy.',
 'W zadaniu końcowym przejdziesz cały cykl: założenia, geometria, kontrola, zmiana wersji i przygotowanie plików. Nie chodzi o szybkość wpisywania komend. Najważniejsze jest, czy potrafisz wyjaśnić każdą zmianę i udowodnić wynik pomiarem. Zapisz swoje kontrole tak, aby po ponownym otwarciu rysunku można było je powtórzyć.',
]
assert len(later_intros)==20
questions=[
 ('Co musisz sprawdzić, zanim odczytasz długość z rysunku CAD?', ['Jednostkę i geometrię rysunku.','Samo powiększenie widoku.','Wielkość monitora.'],0),
 ('Po wpisaniu LINE program pyta o pierwszy punkt. Co to oznacza?', ['Polecenie zakończyło już rysowanie.','Trzeba ponownie otworzyć ten sam plik.','Narzędzie działa i czeka na początek odcinka.'],2),
 ('Chcesz zachować możliwość edycji i przekazać dokument do czytania. Co zapiszesz?', ['Tylko PDF — zawsze zachowuje wszystkie właściwości DWG.','DWG roboczy oraz sprawdzony PDF tej samej wersji.','DWG z końcówką nazwy zmienioną ręcznie na PDF.'],1),
 ('Ile jednostek ma bok długości 4 m, jeżeli 1 jednostka modelu oznacza 1 mm?', ['4000.','400.','4.'],0),
 ('Startujesz w punkcie (-1000, -700). Jaki punkt otrzymasz po wpisaniu @4200,0?', ['(4200, 0).','(3200, -700).','(-5200, -700).'],1),
 ('Trzy stykające się linie tworzą trójkąt. Jak uzyskasz jeden obiekt do przesuwania?', ['Samo zetknięcie końców już tworzy jeden obiekt.','Łączę odcinki w polilinię, sprawdzam wynik i używam MOVE.','Przeciągam uchwyt jednego wierzchołka.'],1),
 ('W LINE zatwierdzono trzy punkty, a potem naciśnięto Esc. Co powinno pozostać?', ['Żaden obiekt — Esc zawsze usuwa wszystkie zmiany.','Trzy odcinki, bo podano trzy punkty.','Dwa zatwierdzone odcinki.'],2),
 ('Wyłączasz warstwę Osie. Co dzieje się z jej liniami?', ['Zostają usunięte z pliku.','Przechodzą na warstwę 0.','Pozostają w pliku, ale są ukryte.'],2),
 ('Model ma 4000 × 3000 mm. Jakie wymiary ma jego widok na papierze w skali 1:50?', ['80 × 60 mm.','200 × 150 mm.','4000 × 3000 mm.'],0),
 ('Jaką przekątną ma prostokąt o bokach 4000 i 3000 mm?', ['7000 mm.','3500 mm.','5000 mm.'],2),
 ('Otwór ma mieć średnicę 600 mm. Jaki promień wpiszesz w CIRCLE?', ['300 mm.','600 mm.','1200 mm.'],0),
 ('Chcesz dodać drugi identyczny słupek i zachować pierwszy. Którego polecenia użyjesz?', ['MOVE.','SCALE.','COPY.'],2),
 ('Koniec odcinka leży poza siatką. Co pomoże trafić dokładnie w ten koniec?', ['OSNAP z włączonym trybem Koniec.','Samo ORTHO.','Samo wyświetlenie siatki F7.'],0),
 ('Trzy linie są na tej samej warstwie, ale jedna nie zmienia koloru razem z warstwą. Co sprawdzisz?', ['Czy ta linia ma własny kolor zamiast ByLayer.','Czy widok jest dostatecznie przybliżony.','Czy trzeba zmienić długość linii.'],0),
 ('Co zmienia PAN?', ['Współrzędne wszystkich obiektów.','Położenie oglądanego fragmentu widoku.','Jednostkę modelu.'],1),
 ('Przy otwarciu rysunku pojawia się Missing XREF. Co sprawdzisz najpierw?', ['Czy trzeba rozbić wszystkie bloki.','Ścieżkę oraz dostępność pliku odnośnika.','Czy wystarczy zapisać ten sam DWG pod inną nazwą.'],1),
 ('DIST pokazuje 975 mm, a tekst wymiaru 1000 mm. Jaki jest właściwy następny krok?', ['Sprawdzam punkty, geometrię, powiązanie i nadpisanie tekstu przed korektą.','Zakładam, że tekst wymiaru zawsze jest prawidłowy.','Zmieniam przybliżenie, aby obiekt pasował do napisu.'],0),
 ('Po zapisaniu DWG utworzono PDF. Co jeszcze trzeba sprawdzić?', ['Tylko rozmiar pliku PDF w kilobajtach.','Tylko to, że nazwa kończy się na .pdf.','Gotowy PDF: wersję, zakres, skalę i czytelność oznaczeń.'],2),
 ('Słupki stoją na osiach X=0, 800, 1600 i 2380 mm. Ile wynosi ostatni odstęp osiowy?', ['780 mm.','800 mm.','2380 mm.'],0),
 ('Wymiar obrysu pokazuje 4200 mm. Jak niezależnie sprawdzisz jego szerokość?', ['Zmierzę jego wielkość na ekranie linijką.','Odczytam tylko ręcznie wpisany opis.','Użyję DIST między właściwymi narożnikami.'],2),
 ('Dostałeś dwa pliki; nowszy nie ma statusu zatwierdzenia. Który można skierować do wykonania?', ['Zawsze nowszy według daty pliku.','Zawsze mniejszy plik.','Najpierw trzeba potwierdzić obowiązującą, zatwierdzoną wersję.'],2),
 ('Rura i wspornik przecinają się na rzucie 2D, ale nie podano wysokości. Co zgłosisz?', ['Pewną kolizję przestrzenną bez dalszych danych.','Brak problemu, bo to tylko rzut.','Przecięcie na rzucie i potrzebę sprawdzenia wysokości obu elementów.'],2),
 ('DWG otwiera się, ale brakuje części widoku. Co zrobisz?', ['Sprawdzę warstwy, zależności i komunikaty, porównując z kontrolnym PDF-em.','Uznam, że plik jest kompletny, skoro się otworzył.','Wyłączę wszystkie ostrzeżenia i przejdę do rysowania.'],0),
 ('Po zmianie szerokości panelu chcesz zachować czytelną historię. Co przygotujesz?', ['Nową rewizję z opisem zmian i statusem, zachowując poprzednią.','Tylko nową datę zapisu bez opisu.','Jedną nadpisaną kopię, bez poprzedniej wersji.'],0),
 ('Model ma dobry wymiar, ale jego widok nie mieści się na arkuszu. Co zmienisz?', ['Skalę rzutni i układ arkusza.','Wymiary całego modelu poleceniem SCALE.','Liczby zapisane na wymiarach.'],0),
 ('Pomiar wynosi 3170 mm, a projekt 3200 mm. Ile wynosi pomiar minus projekt?', ['-30 mm.','30 mm.','-300 mm.'],0),
 ('Widać pięć miejsc z symbolami, ale w pliku jest sześć wstawień tego samego bloku. Co może to wyjaśniać?', ['Dwa wstawienia nakładają się w jednym miejscu.','Każdy blok zawsze liczy się jako pół elementu.','Powiększenie widoku dodało nowe wstawienie.'],0),
 ('Po usunięciu duplikatu z obrysu 1000 × 600 mm co potwierdzi poprawność wyniku?', ['Mniejsza liczba obiektów bez dalszej kontroli.','Taki sam kolor linii.','Zachowane wymiary, zamknięcie, brak nakładek i pole 600 000 mm².'],2),
 ('Jak sprawdzisz paczkę rysunkową przed przekazaniem?', ['Otworzę kopię w innym folderze, sprawdzę odnośniki i zgodność wersji.','Sprawdzę wyłącznie, czy istnieje plik ZIP.','Sprawdzę tylko miniaturę głównego DWG.'],0),
 ('W panelu B środki otworów są w (50,70) i (600,70). Jaki jest ich rozstaw?', ['500 mm.','550 mm.','650 mm.'],1),
]
assert len(questions)==30
for row,(curiosity,exercise,result,mistake) in zip(rows,review):
 m=row['material'];n=row['lesson_no']
 intro=m['sections'][0]['text'] if n<10 else later_intros[n-10]
 m['learning']['intro']=intro
 m['curiosity']=curiosity
 m['sections']=[
  {'heading':'Co warto zrozumieć','text':intro},
  {'heading':'Krok po kroku w AutoCAD-zie' if n else 'Zanim zaczniesz rysować','text':exercise},
  {'heading':'Sprawdź wynik po wykonaniu' if n else 'Co już wiesz','text':result},
  {'heading':'Na co uważać','text':mistake},
 ]
 m['learning']['task']=exercise
 m['learning']['explanation']=result+' '+mistake
 m['learning']['feedback']=[('Dobrze. ' if i==m['learning']['correct'] else 'Spróbuj jeszcze raz. ')+result+' '+mistake for i in range(len(m['learning']['options']))]
 m['raw']=[row['title_pl'],intro,exercise,result,mistake]
 m['exercise']=exercise
 m['quickTips']=[mistake]
 if n==4:
  m['learning']['question']='Startujesz w punkcie (-1000, -700). Jaki punkt uzyskasz po wpisaniu @4200,0 w wierszu poleceń?'
 if n==5:
  m['learning']['question']='Trójkąt składa się z trzech stykających się linii. Jak uzyskasz jeden obiekt do przesuwania?'
  m['learning']['options']=['Samo zetknięcie końców wystarczy — klikam dowolny bok.','Łączę odcinki w polilinię, sprawdzam wynik i przesuwam ją poleceniem MOVE.','Przeciągam pojedynczy uchwyt jednego wierzchołka.']
  m['learning']['correct']=1
 question,options,correct=questions[n]
 m['learning'].update(question=question,options=options,correct=correct,example=options[correct],situation=None)
 m['learning']['feedback']=[('Dobrze. ' if i==correct else 'Spróbuj jeszcze raz. ')+result+' '+mistake for i in range(len(options))]
 for shortcut in m.get('shortcuts',[]):
  if shortcut['combo']=='MT':
   shortcut.update(before='Potrzebujesz nowego opisu z kilkoma wierszami.',after='Tworzysz nowy obiekt tekstu wielowierszowego.',tip='MTEXT tworzy nowy tekst. Do łączenia istniejących tekstów służy TXT2MTXT, jeśli jest dostępne w Twojej wersji.')
 extensions={
  4:('Układ współrzędnych i zapis biegunowy','WCS oznacza globalny układ rysunku, a UCS układ użytkownika, który można przesunąć lub obrócić. Te same liczby mogą więc wskazywać inne miejsce. W ćwiczeniach używamy standardowego układu XY. Przy wyłączonym wprowadzaniu dynamicznym wpis 250,120 w wierszu poleceń jest bezwzględny, a @250,120 względny. Zapis @150<30 oznacza odcinek długości 150 pod kątem 30° przy standardowych ustawieniach kątów. Punkt środkowy ma współrzędne będące średnimi współrzędnych końców: między (40,20) a (160,100) jest to (100,60).'),
  10:('Kolejne narzędzia geometrii','ARC pozwala narysować łuk, m.in. przez trzy punkty. OFFSET tworzy równoległą linię lub współśrodkowy okrąg w zadanej odległości; dla promienia 50 i odsunięcia na zewnątrz o 8 nowy promień wynosi 58. TRIM przycina wystający fragment, a EXTEND wydłuża obiekt do wskazanej granicy. Zawsze czytaj komunikaty, ponieważ sposób wyboru granic zależy od ustawień i wersji. Na kopii narysuj przecinające się odcinki, przytnij jeden, cofnij zmianę i porównaj punkty końcowe.'),
  11:('Skala i odbicie','Współczynnik SCALE to rozmiar docelowy podzielony przez obecny. Z 760 do 950 otrzymujesz 1,25. Punkt bazowy nie zmienia położenia; punkt X=120 skalowany dwukrotnie względem X=100 przechodzi do X=140. MIRROR odbija obiekty względem osi wskazanej dwoma punktami. Odbicie punktu X=130 względem pionowej osi X=100 daje X=70. Przed zatwierdzeniem sprawdź też opcję zachowania obiektów źródłowych.'),
  12:('Punkty i śledzenie','W OSNAP poznaj Koniec (Endpoint), Środek odcinka (Midpoint), Środek okręgu (Center) i Przecięcie (Intersection). Śledzenie biegunowe, przełączane domyślnie F10, pomaga prowadzić kierunek pod ustawionymi kątami. F11 przełącza śledzenie od punktów obiektów, współpracujące z OSNAP. F12 przełącza wprowadzanie dynamiczne przy kursorze. W naszych próbach liczbowych korzystaj z wiersza poleceń, aby nie pomylić sposobów wpisywania punktu. Porównaj działanie pomocy pojedynczo.'),
  13:('Blokada, druk i rzutnie','Zablokowana warstwa może pozostać widoczna, a jej obiekty są chronione przed przypadkową edycją. Ustawienie drukowania decyduje, czy warstwa trafi na wydruk. Widocznością można też zarządzać osobno w konkretnej rzutni arkusza. MATCHPROP przenosi wybrane właściwości ze wzorca na obiekt docelowy, więc przed użyciem sprawdź ich zakres. Gdy linia kreskowana wygląda jak ciągła, porównaj skalę typu linii w modelu i w rzutni, zamiast zmieniać geometrię.'),
  15:('Atrybuty, nakładki i przenoszenie plików','Atrybut bloku przechowuje np. numer pozycji inny w każdym wstawieniu. Rozbicie przez EXPLODE zmienia organizację obiektów, co może utrudnić zliczanie według nazw i atrybutów. WBLOCK zapisuje wskazany blok lub obiekty do oddzielnego DWG. Przy XREF typ Overlay (nakładka) zapobiega dalszemu przenoszeniu tego podkładu jako zagnieżdżonego odnośnika, gdy plik główny staje się odnośnikiem w następnym rysunku. Ścieżka względna pomaga przenosić wspólne drzewo folderów, jeśli zachowasz jego układ.'),
  16:('Tekst i czytelność','MTEXT tworzy nowy tekst wielowierszowy. Samo uruchomienie tego polecenia nie scala istniejących napisów. Do takiej konwersji służy TXT2MTXT, jeśli jest dostępne w używanej wersji. Dla wymiaru dobierz właściwy typ, np. promień zamiast średnicy. Kontroluj wysokość tekstu w docelowym wydruku, nie tylko po przybliżeniu modelu. Styl wymiarowania i skala adnotacji lub rzutni wpływają na sposób przedstawienia informacji.'),
  17:('Szablon, wersja i odzyskiwanie','DWT jest szablonem nowego rysunku: może zawierać warstwy i style. Uzgodnij wersję zapisu DWG z odbiorcą, a po zapisaniu kopii sprawdź jej otwarcie. Po awarii porównuj odzyskany plik z ostatnim zapisem w oddzielnych kopiach. Nie zakładaj, że najnowszy plik odzyskiwania zawiera wszystkie potrzebne zmiany. Podgląd i ponowne otwarcie pomagają ustalić, co rzeczywiście zostało zachowane.'),
  24:('Zablokuj ustawioną rzutnię','Po ustawieniu skali zablokuj rzutnię, aby przypadkowe przybliżenie podczas pracy wewnątrz niej nie zmieniło przygotowanego widoku. Jeśli na arkuszu masz 180 mm miejsca, odcinek 10 000 mm nie zmieści się w skali 1:50, bo zajmie 200 mm. W skali 1:100 zajmie 100 mm. Różne rzutnie mogą prezentować ten sam model w różnych skalach; każdą opisz i sprawdź osobno.'),
 }
 if n in extensions:
  heading,text=extensions[n];m['sections'].insert(1,{'heading':heading,'text':text})
 # Keep lesson identities and existing server-graded shortcut questions.
 row['course_slug']='autocad-skroty'
out={'course_slug':'autocad-skroty','review_date':'2026-11-15','status':'prepared_not_fully_tested','lessons':rows}
Path('content/autocad-real-program-2026-11-15.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('Prepared 30 lessons, each with a distinct curiosity, practice, expected result and error explanation.')
