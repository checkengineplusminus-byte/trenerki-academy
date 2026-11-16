import test from 'node:test';
import assert from 'node:assert/strict';
import {SECTION_HEADERS,homeworkSheetSection,homeworkSheetFilename,csvSafeCell,buildHomeworkCsv} from '../src/accounting/homework-worksheet.js';
const valid={role:'Osoba sprawdzająca faktury',task:'Na danych fikcyjnych policz netto, VAT i brutto. Wpisz działania do tabeli, sprawdź wynik i opisz wnioski.',expected_output:'TAJNY KLUCZ WZORCOWY'};
test('Arkusze z 10 działów mają prawidłowe, zróżnicowane kolumny',()=>{
 assert.equal(SECTION_HEADERS.length,10);
 assert.equal(new Set(SECTION_HEADERS.map(x=>x.join('|'))).size,10);
 for(let i=1;i<=100;i++){
  const csv=buildHomeworkCsv(i,'Temat '+i,valid);
  assert.equal(homeworkSheetSection(i),Math.ceil(i/10));
  assert.match(homeworkSheetFilename(i),/^trenerki-ksiegowosc-dzial-\d\d-temat-\d\d\d\.csv$/);
  assert(csv.startsWith('\ufeff'));
  assert(csv.includes('Na danych fikcyjnych policz netto'));
  assert(csv.includes('Samokontrola'));
  assert(csv.includes(SECTION_HEADERS[homeworkSheetSection(i)-1][1]));
  assert(!csv.includes('TAJNY KLUCZ WZORCOWY'),'Klucz nie może być pobierany z arkuszem');
 }
});
test('CSV jest bezpieczny dla formuł w Excelu i nie dokleja nowych wierszy przez tekst źródłowy',()=>{
 const safe=csvSafeCell('  =HYPERLINK("https://example.test", "test")\r\nNIE ');
 assert(safe.startsWith('"\'=HYPERLINK'));
 assert(!safe.includes('\n'));
 assert.match(safe, /""https:\/\/example\.test""/);
 for(const dangerous of ['=1+1','+1+1','-HYPERLINK(A1)','@SUM(A1)']){
  assert(csvSafeCell(dangerous).startsWith('"\''));
 }
 assert.equal(csvSafeCell('1 230,50'),'"1 230,50"');
});
test('Nie tworzy pozornych arkuszy przy brakującym materiale lub błędnym temacie',()=>{
 for(const id of [0,-1,1.2,101,NaN,'7',null])assert.throws(()=>homeworkSheetSection(id));
 assert.throws(()=>buildHomeworkCsv(5,'',valid));
 assert.throws(()=>buildHomeworkCsv(5,'Temat',{}));
 assert.throws(()=>buildHomeworkCsv(5,'Temat',{task:'krótko'}));
});
test('Odpowiedzi uczniów i danych osobowych nigdy nie pobiera się do szablonu',()=>{
 const csv=buildHomeworkCsv(5,'Moje księgowania',{...valid,response:'TAJNA ODPOWIEDŹ',name:'Jan Nazwisko',email:'user@example.test'});
 for(const hidden of ['TAJNA ODPOWIEDŹ','Jan Nazwisko','user@example.test','TAJNY KLUCZ WZORCOWY'])assert(!csv.includes(hidden));
 assert(csv.includes('fikcyjnych danych'));
 assert(csv.includes('trenerki.com'));
});
