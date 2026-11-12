# Majątek — zapis napraw po testach integracji

Pierwszy przebieg CI na gałęzi accounting-assets-v1-20261112, commit59de7172071f868ed36965b13d696633461d3e15:196 testów,194 pozytywne,2 błędy. Oba dotyczyły ujemnego zera w raporcie wyniku/umorzenia, nie różnicy kwot. Nie osłabiono testów; obliczenie zmieniono z jednoargumentowej negacji na odejmowanie od zera. Wynik kolejnego CI wymaga osobnego potwierdzenia.

Rozszerzono źródło kontekstu Anielki o karty majątku i cztery nowe konta. Zamiast globalnie zakładać zakup usługi z pełnym odliczeniem, tutor widzi jawne założenia kart i powiązania pod lokalnymi etykietami. Nie otrzymuje nazw, NIP, adresów, numerów dokumentów, numerów inwentarzowych ani opisów przelewów. Pytanie użytkownika jest odrębnym wejściem; dotychczasowa blokada adresów e-mail i długich identyfikatorów w pytaniu pozostaje. Kontekst obejmuje najwyżej10 dokumentów,10 zapisów i10 kart; nie wolno przedstawiać go jako pełnego audytu.

Osiem testów nowego kontekstu wykonano lokalnie:8/8. Nie wykonano płatnego wywołania modelu ani odpowiedzi z rzeczywistej zalogowanej sesji. Przy wdrożeniu funkcji zachować verify_jwt=true, filtr właściciela, sprawdzenie dostępu i dotychczasowy limit tutora. Nie zmieniono ustawienia modelu ani kluczy.

Zakres biznesowy nadal opisuje docs/MAJATEK_SYMULATOR_V1.md. To nie pełna amortyzacja podatkowa, sprzedaż środków trwałych ani gotowość całego kursu.
