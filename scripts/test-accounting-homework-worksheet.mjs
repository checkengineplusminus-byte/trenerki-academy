import test from 'node:test';
import assert from 'node:assert/strict';
import {SECTION_HEADERS,TOPIC_HEADERS,homeworkSheetSection,homeworkSheetFilename,csvSafeCell,buildHomeworkCsv} from '../src/accounting/homework-worksheet.js';
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
  assert(csv.includes((TOPIC_HEADERS[i]||SECTION_HEADERS[homeworkSheetSection(i)-1])[1]));
  assert(!csv.includes('TAJNY KLUCZ WZORCOWY'),'Klucz nie może być pobierany z arkuszem');
 }
});
test('Temat 2: arkusz rejestruje trzy daty, powiązanie i duplikat dowodu',()=>{
 const csv=buildHomeworkCsv(2,'Dokumenty i daty',valid);
 assert.equal(TOPIC_HEADERS[2].length,10);
 for(const field of ['Data zdarzenia','Data dowodu','Data zapłaty','Okres ujęcia','Duplikat?','Powiązane ID operacji / dokumentu']){
  assert(csv.includes(field),'Brak kolumny: '+field);
 }
 assert(csv.includes('bez podwójnego księgowania'));
 assert(csv.includes('Brakującej daty nie zgaduj'));
 assert(!csv.includes('TAJNY KLUCZ WZORCOWY'));
});
test('Temat 4: arkusz rozdziela memoriał od przepływów',()=>{
 const csv=buildHomeworkCsv(4,'Przychody i wpływy',valid);
 assert.equal(TOPIC_HEADERS[4].length,11);
 for(const field of ['Okres wyniku','Okres przepływu','Przychód (zł)','Koszt (zł)','Wpływ (zł)','Wydatek (zł)','Wynik (zł)','Przepływ netto (zł)']){
  assert(csv.includes(field),'Brak kolumny: '+field);
 }
 assert(csv.includes('Wynik rachunkowy'));
 assert(csv.includes('wpływ bankowy nie oznacza automatycznie przychodu'));
 assert(!csv.includes('TAJNY KLUCZ WZORCOWY'));
});
test('Pozostałe 98 arkuszy zachowują nagłówki swoich działów',()=>{
 for(let topic=1;topic<=100;topic++){
  if(topic===2||topic===4)continue;
  const csv=buildHomeworkCsv(topic,'Temat '+topic,valid);
  assert(csv.includes(SECTION_HEADERS[homeworkSheetSection(topic)-1][1]),'Zmiana szablonu innego tematu '+topic);
  assert(!csv.includes('Wskazówka do tego tematu'),'Przeciek wskazówki tematycznej: '+topic);
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


test('Dodatkowe oryginalne zestawy danych w tematach 91–94 nie zastępują prac głównych', async ()=>{
 const {bonusSpreadsheetTopic,bonusSpreadsheetRows}=await import('../src/accounting/bonus-datasets.js');
 for(let topic=1;topic<=100;topic++){
  const extra=bonusSpreadsheetRows(topic),csv=buildHomeworkCsv(topic,'Temat '+topic,valid);
  assert.equal(bonusSpreadsheetTopic(topic),[91,92,93,94].includes(topic));
  if(topic<91||topic>94){
   assert.deepEqual(extra,[]);
   assert(!csv.includes('OSOBNY ZESTAW (BONUS)'));
  }else{
   assert(extra.length>=12,'Różne pakiety muszą mieć realne rekordy: '+topic);
   assert(csv.includes('PRAKTYKA DODATKOWA — OSOBNY ZESTAW (BONUS)'));
   assert(csv.includes('Dane bonusowe są inne niż w poleceniu lekcji'));
   assert(csv.includes('KROKI DO WYKONANIA'));
   assert(csv.includes('Samokontrola'));
   assert(!csv.includes('TAJNY KLUCZ WZORCOWY'));
  }
 }
 assert(buildHomeworkCsv(91,'Import',valid).includes('000012345678901234'));
 assert(buildHomeworkCsv(91,'Import',valid).includes('RAW_BANK'));
 assert(buildHomeworkCsv(92,'Pivot',valid).includes('NOWY_REKORD'));
 assert(buildHomeworkCsv(93,'Budżet',valid).includes('FIK-3'));
 assert(buildHomeworkCsv(94,'Rentowność',valid).includes('15950,00'));
});
test('Dodatkowe dane są lokalne, całkowicie fikcyjne i nie zawierają kluczy',async ()=>{
 const {EXTRA_SPREADSHEET_CASES}=await import('../src/accounting/bonus-datasets.js');
 assert.deepEqual(Object.keys(EXTRA_SPREADSHEET_CASES).sort(),['91','92','93','94']);
 for(const [topic,pack] of Object.entries(EXTRA_SPREADSHEET_CASES)){
  assert(pack.tables.length>=1 && pack.steps.length>=3);
  const instruction=pack.instruction.toLowerCase();
  assert(instruction.includes('fikcyj')||instruction.includes('bonus')||instruction.includes('model'));
  for(const t of pack.tables){
   assert(t.rows.length>0);
   for(const row of t.rows)assert.equal(row.length,t.header.length,topic+': '+t.name);
  }
  assert(!JSON.stringify(pack).includes('expected_output'));
  assert(!JSON.stringify(pack).includes('correctIndex'));
  assert(!JSON.stringify(pack).includes('odpowiedź poprawna'));
 }
});