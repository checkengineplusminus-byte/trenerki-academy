/**
 * Independent Excel/LibreOffice worksheet for one existing TRENERKI accounting homework.
 * Only a blank LOCAL CSV is generated: no user answers, private workbook state or
 * assessment keys are sent, fetched or written to Supabase.
 */
export const WORKSHEET_VERSION=1;
export const SECTION_HEADERS=Object.freeze([
 ['Lp.','Dowód / zdarzenie','Data','Podmiot','Aktywo / Wn','Pasywo / Ma','Kwota (zł)','Uzasadnienie i kontrola'],
 ['Lp.','Numer dokumentu','Strona transakcji','Data zdarzenia','Kwota netto (zł)','VAT — założenie','Kwota VAT (zł)','Kwota brutto (zł)','Wniosek'],
 ['Lp.','Zdarzenie','Rodzaj podatku','Przychód (zł)','Koszt (zł)','Podstawa — model (zł)','Obliczenie','Źródło do sprawdzenia','Wniosek'],
 ['Lp.','Państwo / strona','Rodzaj transakcji','Dokument','Waluta','Kurs — założenie','Wartość (zł)','Warunek do sprawdzenia','Wniosek'],
 ['Lp.','Pracownik — fikcyjny identyfikator','Okres','Składnik wynagrodzenia','Brutto — model (zł)','Potrącenia — model (zł)','Netto — model (zł)','Dokument','Kontrola'],
 ['Lp.','Dowód / składnik','Data','Konto Wn','Konto Ma','Kwota (zł)','Saldo / stan','Różnica kontrolna','Wniosek'],
 ['Lp.','Podmiot / zdarzenie','Dokument','Rejestr / podstawa','Data','Kwota — model (zł)','Obowiązek do sprawdzenia','Wniosek'],
 ['Lp.','Branża / projekt','Dokument','Data','Przychód — model (zł)','Koszt — model (zł)','Wynik — model (zł)','Uzasadnienie'],
 ['Lp.','Platforma / źródło','Rodzaj transakcji','Dokument','Waluta','Wpływ (zł)','Koszt (zł)','Kwestia do sprawdzenia','Wniosek'],
 ['Lp.','Dokument / zadanie','Dane wejściowe','Wzór / działanie','Wynik','Kontrola odwrotna','Błąd / poprawka','Wniosek']
].map(columns=>Object.freeze(columns)));
const NOTES=Object.freeze([
 'Rozdziel własność jednostki, dokumenty i obie strony zapisu. Równość Wn i Ma nie wystarcza do potwierdzenia poprawności.',
 'Sprawdź dane stron i związek dokumentów z operacją. VAT oraz daty ustalaj w granicach założeń ćwiczenia.',
 'Nie przenoś wniosków podatkowych z przykładu na rzeczywistą sytuację. Zapisz warunki wymagające sprawdzenia w aktualnym źródle.',
 'Nie zgaduj miejsca opodatkowania. Zapisz status stron, kraj, warunki oraz źródło, zanim wykonasz obliczenie modelowe.',
 'Używaj wyłącznie fikcyjnych danych pracowników. Oddziel wynagrodzenie brutto, obliczenia modelowe i kwotę do wypłaty.',
 'Prowadź osobne dowody, konta, kwoty i kontrolę sald. Nie wpisuj dwa razy tego samego zdarzenia.',
 'Oddziel dane podmiotu, obowiązek i dowód. Zaznacz, czego nie da się rozstrzygnąć bez aktualnych dokumentów.',
 'Przyporządkuj przychody i koszty do właściwej branży lub projektu, nie tylko do jednego przelewu.',
 'Rozdziel wpływ z platformy, prowizję, dokument i walutę. Nie zakładaj automatycznie jednej stawki podatku.',
 'W Excelu wpisz własne działanie i wykonaj kontrolę wyniku. Nie traktuj szacunku jako udokumentowanego księgowania.'
]);
export function homeworkSheetSection(topicNo){
 if(!Number.isInteger(topicNo)||topicNo<1||topicNo>100)throw new Error('Nieprawidłowy numer tematu.');
 return Math.ceil(topicNo/10);
}
export function homeworkSheetFilename(topicNo){
 const section=homeworkSheetSection(topicNo);
 return 'trenerki-ksiegowosc-dzial-'+String(section).padStart(2,'0')+'-temat-'+String(topicNo).padStart(3,'0')+'.csv';
}
// Guard against spreadsheet formula injection, even when a source record changes.
export function csvSafeCell(value){
 const raw=String(value??'').replace(/[\u0000-\u001f\u007f\u2028\u2029]/g,' ').replace(/\s+/g,' ').trim().slice(0,6000);
 const safe=/^[=+\-@]/.test(raw)?"'"+raw:raw;
 return '"'+safe.replace(/"/g,'""')+'"';
}
export function buildHomeworkCsv(topicNo,title,practice){
 const section=homeworkSheetSection(topicNo);
 if(typeof title!=='string'||!title.trim()||
    !practice||typeof practice!=='object'||typeof practice.task!=='string'||practice.task.trim().length<20)
  throw new Error('Brakuje polecenia pracy domowej — nie twórz pustego arkusza.');
 const role=typeof practice.role==='string'?practice.role:'Uczeń TRENERKI';
 const rows=[
  ['TRENERKI Academy','Księgowość od podstaw — praca domowa'],
  ['Dział',String(section),'Temat',String(topicNo)+' — '+title],
  ['Twoja rola',role],
  ['Polecenie z lekcji',practice.task],
  ['Cel','Wykonaj własne obliczenia i wnioski na fikcyjnych danych. Nie kopiuj gotowego klucza odpowiedzi.'],
  ['1. Przygotuj','Przeczytaj polecenie i wypisz dokumenty, kwoty oraz założenia.'],
  ['2. Uzupełnij','Każdą operację lub element analizy umieść w osobnym wierszu. Dodawaj wiersze według potrzeby.'],
  ['3. Sprawdź','Oblicz wynik, sprawdź go drugą metodą i oznacz dane, których nie da się potwierdzić.'],
  ['4. Podsumuj','Napisz co obliczono, na jakich danych i co wymaga dodatkowego sprawdzenia.'],
  ['5. Oddaj','Zapisz arkusz na własnym urządzeniu. Następnie opisz kroki i wynik w pracy domowej na trenerki.com. Sam plik nie przesyła odpowiedzi.'],
  ['Wskazówka do działu',NOTES[section-1]],
  ['Bezpieczeństwo','Używaj wyłącznie fikcyjnych danych. Nie umieszczaj prawdziwych PESEL, NIP, rachunków, faktur ani danych pracowników.'],
  [],
  SECTION_HEADERS[section-1],
  ...Array.from({length:12},(_,i)=>[String(i+1)]),
  [],
  ['Samokontrola','Czy wykonano wszystkie elementy z polecenia?',''],
  ['Samokontrola','Czy każdą kwotę da się odtworzyć z danych wejściowych?',''],
  ['Samokontrola','Czy źródła, daty i operacje nie zostały zdublowane?',''],
  ['Samokontrola','Czy oddzielono wyliczenie ćwiczeniowe od niepotwierdzonych zasad podatkowych?',''],
  ['Podsumowanie ucznia','Wynik, sposób obliczenia i wnioski do opisania na stronie kursu.','']
 ];
 return '\ufeff'+rows.map(row=>row.map(csvSafeCell).join(';')).join('\r\n')+'\r\n';
}
