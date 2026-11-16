/**
 * Optional, ORIGINAL synthetic data packs for extra spreadsheet practice.
 * These are additional scenarios, NOT the paid lesson's case or answer key.
 * Students must still complete the assignment and submit their own reasoning.
 * Never put learner records, production tax IDs or course answer keys here.
 */
export const EXTRA_SPREADSHEET_CASES=Object.freeze({
  91:{
    title:'DODATKOWE ĆWICZENIE — import, duplikaty i uzgodnienie płatności',
    instruction:'To odrębne fikcyjne dane BONUSOWE, nie kwoty z polecenia lekcji. Zaimportuj ID jako tekst (nie jako liczbę). W kopii RAW wykryj podwójny dokument, zsumuj pięć unikalnych faktur, uzgodnij przelewy i pokaż pozostające należności. Nie usuwaj plików źródłowych.',
    tables:[
      {name:'RAW_FAKTURY — dane źródłowe',header:['ID źródłowe (tekst)','Nr faktury','Kontrahent','Data','Kwota (zł)'],rows:[
        ['000012345678901234','FIK/101','Mewa','2026-01-07','840,00'],
        ['000012345678901235','FIK/102','Las','2026-01-08','1250,00'],
        ['000012345678901236','FIK/103','Mewa','2026-01-15','620,00'],
        ['000012345678901237','FIK/104','Brzoza','2026-01-17','460,00'],
        ['000012345678901238','FIK/105','Las','2026-02-03','910,00'],
        ['000012345678901236','FIK/103','Mewa','2026-01-15','620,00']
      ]},
      {name:'RAW_BANK — fikcyjne przelewy',header:['ID przelewu','Nr faktury','Data przelewu','Wpływ (zł)'],rows:[
        ['B001','FIK/101','2026-01-20','840,00'],
        ['B002','FIK/102','2026-01-23','500,00'],
        ['B003','FIK/103','2026-01-29','620,00'],
        ['B004','FIK/104','2026-02-05','460,00'],
        ['B005','FIK/105','2026-02-12','500,00']
      ]}
    ],
    steps:[
      'Zapisz RAW bez modyfikowania źródłowych numerów i kwot.',
      'Porównaj dokumenty po numerze, kontrahencie, dacie i kwocie. Zaznacz uzasadnione duplikaty.',
      'Utwórz tabelę wynikową: wystawione — opłacone = należność; wykorzystaj SUMA.WARUNKÓW albo tabelę przestawną.',
      'Sprawdź sumy dokumentów i banku drugą, niezależną metodą.'
    ]
  },
  92:{
    title:'DODATKOWE ĆWICZENIE — tabela przestawna i odświeżanie',
    instruction:'To odrębny fikcyjny bonus, nie dane z polecenia lekcji. Zbuduj tabelę przestawną miesiąc × rodzaj, skontroluj duplikat źródła i zaktualizuj zakres po dodaniu wiersza majowego. Porównaj sumę tabeli z RAW.',
    tables:[
      {name:'ZESTAWIENIE_RAW — zdarzenia',header:['ID','Miesiąc','Rodzaj','Kontrahent','Kwota (zł)'],rows:[
        ['P01','2026-01','Sprzedaż','Mewa','750,00'],
        ['P02','2026-01','Zakup','Tęcza','250,00'],
        ['P03','2026-02','Sprzedaż','Las','900,00'],
        ['P04','2026-02','Zakup','Tęcza','600,00'],
        ['P05','2026-03','Sprzedaż','Mewa','1350,00'],
        ['P06','2026-03','Zakup','Dąb','780,00'],
        ['P07','2026-04','Sprzedaż','Las','1120,00'],
        ['P08','2026-04','Zakup','Dąb','350,00'],
        ['P03','2026-02','Sprzedaż','Las','900,00']
      ]},
      {name:'NOWY_REKORD — do dopisania po pierwszej tabeli przestawnej',header:['ID','Miesiąc','Rodzaj','Kontrahent','Kwota (zł)'],rows:[
        ['P09','2026-05','Sprzedaż','Mewa','480,00']
      ]}
    ],
    steps:[
      'Zachowaj całą tabelę RAW i oznacz potencjalny duplikat. Nie odejmuj nic bez sprawdzenia.',
      'Po kontroli utwórz osobną tabelę oczyszczoną i raport według miesiąca i rodzaju.',
      'Dopisz majowy rekord, rozszerz źródło i użyj Odśwież dla tabeli przestawnej.',
      'Uzgodnij sumy z arkuszem źródłowym po każdym odświeżeniu.'
    ]
  },
  93:{
    title:'DODATKOWE ĆWICZENIE — płynność przez cztery tygodnie',
    instruction:'Dane BONUSOWE są inne niż w zadaniu głównym. Start w banku: 8 500 zł. Rozpisz cztery tygodnie, sklasyfikuj każdy przepływ, oblicz saldo tygodniowe i sprawdź scenariusz przesunięcia wpływu FIK-3 o tydzień. Przepływ finansowania nie jest przychodem ze sprzedaży.',
    tables:[
      {name:'ZAPLANOWANE PRZEPŁYWY',header:['Tydzień','Data','Dowód','Rodzaj','Kategoria','Kwota (zł)'],rows:[
        ['1','2026-03-02','FIK-1','Wpływ','Operacyjne','5200,00'],
        ['1','2026-03-05','DOST-1','Wypływ','Operacyjne','2800,00'],
        ['2','2026-03-09','POŻ-1','Wpływ','Finansowe','4500,00'],
        ['2','2026-03-11','PŁACE-1','Wypływ','Operacyjne','3900,00'],
        ['3','2026-03-16','FIK-3','Wpływ','Operacyjne','4100,00'],
        ['3','2026-03-18','SPRZĘT-1','Wypływ','Inwestycyjne','2400,00'],
        ['4','2026-03-23','DOST-2','Wypływ','Operacyjne','1750,00'],
        ['4','2026-03-25','RATA-1','Wypływ','Finansowe','1250,00']
      ]}
    ],
    steps:[
      'Oddziel saldo otwarcia od wpływów i wypływów. Kwoty wydatków są podane jako dodatnia wartość do odjęcia.',
      'Policz saldo po każdym tygodniu i najniższy stan gotówki w planie.',
      'Zasymuluj przesunięcie FIK-3 z tygodnia 3 do 4 bez zmiany łącznej należności.',
      'Wytłumacz, dlaczego wpływ pożyczki zmienia bank, lecz nie jest przychodem ze sprzedaży.'
    ]
  },
  94:{
    title:'DODATKOWE ĆWICZENIE — marża i próg rentowności',
    instruction:'To osobny model bonusowy. Jednostkowa cena netto 240 zł, koszt zmienny 95 zł, miesięczne koszty stałe 15 950 zł. Uzupełnij wyniki dla czterech wolumenów. Nie wpisuj wartości końcowych z pamięci: użyj formuł i sprawdzenia odwrotnego.',
    tables:[
      {name:'ZAŁOŻENIA — tylko fikcyjne dane',header:['Parametr','Wartość','Jednostka'],rows:[
        ['Cena netto jednostki','240,00','zł/szt.'],
        ['Koszt zmienny jednostki','95,00','zł/szt.'],
        ['Koszty stałe okresu','15950,00','zł'],
      ]},
      {name:'SCENARIUSZE — pola wynikowe do samodzielnego obliczenia',header:['Sprzedane sztuki','Przychód (zł)','Koszty zmienne (zł)','Marża pokrycia (zł)','Koszty stałe (zł)','Wynik (zł)'],rows:[
        ['85','','','','',''],
        ['110','','','','',''],
        ['125','','','','',''],
        ['145','','','','','']
      ]}
    ],
    steps:[
      'Policz marżę na jednej sztuce i marżę procentową. Odróżnij ją od narzutu.',
      'Wyprowadź próg rentowności w sztukach. Jeśli wynik nie jest całkowity, ustal liczbę całych sztuk potrzebnych do pokrycia kosztów.',
      'Dla czterech wolumenów wylicz przychody, koszty i wynik. Użyj odwołań do komórek z założeniami.',
      'Dodaj scenariusz spadku sprzedaży o 15 sztuk oraz sprawdź, czy przepływy z banku są w ogóle znane.'
    ]
  }
});
export const bonusSpreadsheetTopic=topic=>Number.isInteger(topic)&&Object.hasOwn(EXTRA_SPREADSHEET_CASES,topic);
export function bonusSpreadsheetRows(topicNo){
 if(!bonusSpreadsheetTopic(topicNo))return [];
 const pack=EXTRA_SPREADSHEET_CASES[topicNo];
 const rows=[
  [],
  ['PRAKTYKA DODATKOWA — OSOBNY ZESTAW (BONUS)'],
  [pack.title],
  ['UWAGA',pack.instruction],
  ['Nie zastępuje zadania głównego','Dane bonusowe są inne niż w poleceniu lekcji. Oddaj samodzielne rozwiązanie obu ćwiczeń osobno, jeśli wykonasz bonus.']
 ];
 for(const t of pack.tables){
  rows.push([], [t.name],t.header,...t.rows);
 }
 rows.push([],['KROKI DO WYKONANIA'],...pack.steps.map((step,i)=>[String(i+1),step]));
 return rows;
}
