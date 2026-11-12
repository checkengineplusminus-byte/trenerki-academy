# Słownik księgowego — objaśnienia od zera

Stan prac: 12 listopada 2026. Nowa trasa: `/slownik-ksiegowego`. Odsyłacze do NIP, REGON, KRS i KSeF znajdują się nad pracownią księgowania. Parametr `entry=slownik-ksef` otwiera konkretne hasło.

## Zapisana treść

12 haseł w `ta_accounting_reference`, typu `glossary`: NIP, REGON, KRS, KSeF, PESEL, CEIDG, PKD, numer KSeF, UPO, VAT-UE, VIES, CRBR. Każde zawiera pełną nazwę, proste znaczenie, genezę i cel, organ lub źródło numeru, zastosowanie w pracy, dwa przykłady, tabelę, pytanie z wyjaśnieniem, ograniczenia oraz oficjalne źródła i datę sprawdzenia. Nie są to kompletne procedury podatkowe dla wszystkich sytuacji.

Dopisano pełne lekcje 6–10: rozpoznawanie identyfikatorów; NIP, PESEL i REGON; CEIDG/KRS i reprezentacja; KSeF, numery i UPO; kontrola teczki kontrahenta. Każda ma trzy rozbudowane sekcje, dwa rozwiązane przykłady, trzy zadania oraz linki logiczne do haseł. W bazie jest obecnie 10 pełnych lekcji, nie 100000. Cel programu nie jest licznikiem ukończonych materiałów.

Płatne teksty pozostają w chronionej bazie, nie w publicznym repozytorium. Słownik korzysta z istniejących zasad dostępu i tabeli ulubionych `ta_accounting_reference_saves`.

## Standard każdego nowego pojęcia

Pierwsze użycie skrótu rozwijamy i podajemy praktyczny sens. Nie objaśniamy jednego niezrozumiałego skrótu trzema kolejnymi bez wyjaśnienia. Rozdzielamy: cel systemu, źródło nazwy, historyczną genezę, aktualny stan prawny i przykład fikcyjny. Nie dopisujemy dat historycznych bez źródła. Nie wywodzimy statusu VAT z NIP, właściwej stawki z PKD, uprawnienia do reprezentacji z samej funkcji w zarządzie ani zapłaty z UPO.

Trigger `accounting_reference_quality` blokuje oznaczenie hasła jako zatwierdzonego, gdy brakuje genezy, podstawowych objaśnień, dwóch przykładów, poprawnie skonstruowanego pytania, źródeł lub daty. To kontrola struktury redakcyjnej, nie niezależna recenzja eksperta.

## Wyszukiwanie i odsłuch

RPC `ta_accounting_glossary_search` respektuje RLS, ogranicza wyniki do haseł i dzieli listę na strony po 12. Obsługuje normalizację polskich znaków, prefiksy wyrazów oraz zapisane aliasy, w tym „rejestr sondowy”. Dokładne dopasowanie skrótu ma pierwszeństwo. Nie jest to pełna semantyczna wyszukiwarka dowolnie sformułowanych pytań.

Widok pokazuje rozwijanie pojęcia krok po kroku, ulubione zapisane na koncie, powiązane terminy, tabelę, zadanie i źródła. Źródła można otwierać tylko jako HTTPS w domenach urzędowych gov.pl lub instytucji europa.eu. Treści renderuje React jako tekst, nie surowy HTML.

Odsłuch jest opcjonalnym odczytem przez polski głos urządzenia. Nie jest nagraniem lektora. Bez polskiego głosu przycisk jest wyłączony z wyjaśnieniem. Odczyt jest dzielony na krótkie fragmenty i zatrzymywany przy zmianie hasła lub opuszczeniu widoku. Nie odczytuje automatycznie klucza odpowiedzi.

## Weryfikacja tej partii

- 12/12 testów bazy: kompletność haseł, brak genezy, dokładny skrót, polskie znaki, alias, stronicowanie, historia i brak dostępu bez uprawnienia. Dane testowe wycofano transakcją.
- 12/12 lokalnych testów logiki: klucze, bezpieczne źródła, fragmenty odsłuchu i odpowiedzi ćwiczeniowe.
- Sprawdzono składnię TSX. To nie zastępuje pełnej kompilacji ani testu przeglądarki po zalogowaniu.
- Nie przeprowadzono w tej partii testu słyszalnego głosu na telefonie ani pełnej zalogowanej ścieżki produkcyjnej. Sprawdzić te elementy po publikacji.

## Kontynuacja

Sprawdzić aktualny commit i stan bazy przed dalszą pracą. Nie nadpisywać materiałów opracowanych przez inną sesję. Rozszerzać słownik o kolejne pojęcia używane w lekcjach, w tym instytucje, rejestry, rodzaje deklaracji i zapisy księgowe. Miesięczny przegląd powinien obejmować również `ta_accounting_reference`, ich źródła i historię wersji, nie tylko lekcje. Cena 999 zł oraz blokada sprzedaży niedokończonej encyklopedii pozostają bez zmian.
