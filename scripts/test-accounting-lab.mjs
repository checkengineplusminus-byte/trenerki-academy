import test from 'node:test';
import assert from 'node:assert/strict';
import {EMPTY,cents,scaled,validDate,invoiceTotals,expectedInvoiceLines,journalTotals,parseBankCSV,BANK_TEMPLATE,balanceReport,inspect,invoiceHTML,reverseJournal} from '../src/accounting/lab-core.js';
const invoice=(kind='sale',unit=100000)=>({id:kind,kind,status:'issued',number:kind==='sale'?'CW/FV/1':'CW/ZAK/1',date:'2026-11-01',due:'2026-11-15',party:'Firma testowa',seller:'Moja firma',lines:[{label:'Usługa',qty_milli:1000,unit_cents:unit,tax_code:'23'}]});
test('Kwoty w groszach bez utraty 0,1 + 0,2',()=>assert.equal(cents('0,1')+cents('0,2'),30));
test('Polskie grupowanie i kwota ujemna',()=>assert.equal(cents('-1 234,56'),-123456));
test('Odrzucenie separatorów mieszanych i nadmiarowych miejsc',()=>{assert.throws(()=>cents('1.234,56'));assert.throws(()=>cents('1,005'));assert.throws(()=>cents('=1+2'));});
test('Ilość do trzech miejsc',()=>assert.equal(scaled('1,125',3),1125));
test('Rzeczywiste daty i lata przestępne',()=>{assert.equal(validDate('2026-02-29'),false);assert.equal(validDate('2028-02-29'),true);assert.equal(validDate('2026-13-01'),false);});
test('1000 netto + 230 VAT = 1230 brutto',()=>{const i=invoiceTotals(invoice());assert.equal(i.gross_cents,123000);assert.equal(i.tax_cents,23000);});
test('Zaokrąglenie pozycji pół grosza w górę',()=>{const i=invoice();i.lines[0].qty_milli=500;i.lines[0].unit_cents=1;assert.equal(invoiceTotals(i).net_cents,1);});
test('0, ZW i NP pozostają odrębnymi kodami',()=>{for(const code of ['0','ZW','NP']){const i=invoice();i.lines[0].tax_code=code;const out=invoiceTotals(i);assert.equal(out.tax_cents,0);assert.equal(out.lines[0].tax_code,code);}});
test('Brak sztucznej stawki podatku',()=>{const i=invoice();i.lines[0].tax_code='27';assert.throws(()=>invoiceTotals(i));});
test('Model księgowania faktury jest zbilansowany',()=>{for(const i of [invoice(),invoice('purchase',20000)]){const t=journalTotals({lines:expectedInvoiceLines(i)});assert.equal(t.debit,t.credit);assert.equal(t.debit,invoiceTotals(i).gross_cents);}});
test('Import szablonu CSV',()=>{const x=parseBankCSV(BANK_TEMPLATE);assert.equal(x.rows.length,2);assert.equal(x.errors.length,0);assert.equal(x.rows[1].amount_cents,-24600);});
test('Import BOM, cudzysłowów, średnika wewnątrz opisu',()=>{const x=parseBankCSV('\ufeffid;data;kwota;opis\r\nX;2026-11-01;12,50;"Opis; z ""cytatem"""\r\n');assert.equal(x.rows[0].description,'Opis; z "cytatem"');});
test('Import CSV rozdzielanego przecinkami',()=>assert.equal(parseBankCSV('id,data,kwota,opis\nX,2026-11-01,12.50,Opis').rows[0].amount_cents,1250));
test('Błędny dzień jest wskazany w wierszu',()=>{const x=parseBankCSV('id;data;kwota;opis\nX;2026-02-30;5;Opis');assert.equal(x.errors[0].row,2);assert.equal(x.rows.length,0);});
test('Identyczny import pomija duplikaty',()=>{const a=parseBankCSV(BANK_TEMPLATE).rows,b=parseBankCSV(BANK_TEMPLATE,a);assert.equal(b.rows.length,0);assert.equal(b.skipped,2);});
test('Ten sam identyfikator z inną kwotą jest błędem',()=>{const a=parseBankCSV(BANK_TEMPLATE).rows,b=parseBankCSV(BANK_TEMPLATE.replace('1230,00','1200,00'),a);assert.equal(b.errors.length,1);});
test('Odrzucenie uszkodzonego CSV i nadmiarowej kolumny',()=>{assert.throws(()=>parseBankCSV('id;data;kwota;opis\nA;2026-11-01;1;"brak'));assert.throws(()=>parseBankCSV('data;kwota;opis'));assert.equal(parseBankCSV('id;data;kwota;opis\nA;2026-11-01;1;X;Y').errors.length,1);});
test('Szkic nie jest ujmowany w obrotach',()=>{const s=EMPTY();s.journals.push({id:'j',status:'draft',lines:[{account:'130',debit:100,credit:0}]});assert.equal(balanceReport(s).debit,0);assert.ok(inspect(s).some(x=>x.severity==='błąd'));});
function fullScenario(){const s=EMPTY();s.invoices=[invoiceTotals(invoice()),invoiceTotals(invoice('purchase',20000))];s.bank=parseBankCSV(BANK_TEMPLATE).rows;s.matches=s.invoices.map((i,n)=>({id:'m'+n,invoice_id:i.id,bank_id:s.bank[n].id,amount_cents:i.gross_cents}));s.journals=s.invoices.map(i=>({id:'j'+i.id,status:'posted',date:i.date,source_type:'invoice',source_id:i.id,lines:expectedInvoiceLines(i)}));s.journals.push({id:'jb1',status:'posted',source_type:'bank',source_id:s.bank[0].id,lines:[{account:'130',debit:123000,credit:0},{account:'201',debit:0,credit:123000}]},{id:'jb2',status:'posted',source_type:'bank',source_id:s.bank[1].id,lines:[{account:'202',debit:24600,credit:0},{account:'130',debit:0,credit:24600}]});return s;}
test('Cały scenariusz: wynik 800, VAT 184, bank 984',()=>{const r=balanceReport(fullScenario());assert.equal(r.profit,80000);assert.equal(r.vat,18400);assert.equal(r.bank,98400);assert.equal(r.ledgerBank,98400);assert.equal(r.receivable,0);assert.equal(r.payable,0);assert.equal(r.debit,r.credit);});
test('Anielka nie zgłasza uwag do poprawnego scenariusza',()=>assert.equal(inspect(fullScenario()).length,0));
test('Równość Wn i Ma nie ukrywa błędnego konta',()=>{const s=fullScenario();s.journals[0].lines[1].account='800';assert.ok(inspect(s).some(x=>x.code==='invoice_accounts'));});
test('Ponowne zaliczenie przelewu do przychodów jest wykryte',()=>{const s=fullScenario();s.journals[2].lines[1].account='700';assert.ok(inspect(s).some(x=>x.code==='bank_accounts'));});
test('Storno zachowuje oryginał i odwraca sumy',()=>{const s=fullScenario(),j=s.journals[0],copy=JSON.stringify(j),r=reverseJournal(j,'2026-11-06');assert.equal(r.lines[0].credit,j.lines[0].debit);assert.equal(JSON.stringify(j),copy);s.journals.push(r);assert.ok(inspect(s).some(x=>x.code==='unposted_invoice'));});
test('Wydruk nie wykonuje HTML kontrahenta',()=>{const i=invoice();i.party='<script>alert(1)</script>';const html=invoiceHTML(i);assert.ok(!html.includes('<script>alert'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('DOKUMENT ĆWICZENIOWY'));});
test('Import z pustymi wierszami nie tworzy pustych transakcji',()=>assert.equal(parseBankCSV('\n'+BANK_TEMPLATE+'\n').rows.length,2));

import {SCENARIO_ID,CLASS_KINDS,readScenario,readScenarioAnswers,withScenarioAnswer,checkScenarioAnswer,scenarioSummary} from '../src/accounting/simulator-core.js';

const kinds=Object.keys(CLASS_KINDS);
const fakeManifest={id:SCENARIO_ID,documents:Array.from({length:36},(_,i)=>({
 id:'D'+String(i+1).padStart(2,'0'),date:'2026-01-15',title:'Fikcyjny dokument '+(i+1),
 kind:kinds[i%kinds.length],amount_pln:i+1,fictional:true,source_verification:'training_only'
}))};
test('Manifest 36 dokumentów: ID, źródła i brak duplikatów',()=>{
 assert.equal(readScenario(fakeManifest).documents.length,36);
 assert.throws(()=>readScenario({...fakeManifest,documents:fakeManifest.documents.slice(1)}));
 assert.throws(()=>readScenario({...fakeManifest,documents:[...fakeManifest.documents.slice(0,35),fakeManifest.documents[0]]}));
 assert.throws(()=>readScenario({...fakeManifest,documents:fakeManifest.documents.map((d,i)=>i===0?{...d,fictional:false}:d)}));
});
test('Błędne kategorie są odrzucane przed zapisem, odpowiedź na koncie jest izolowana od oryginału',()=>{
 const base={schema_version:1,invoices:[],bank:[],journals:[],matches:[]};
 assert.throws(()=>withScenarioAnswer(base,fakeManifest,'D01','admin'));
 assert.throws(()=>withScenarioAnswer(base,fakeManifest,'D37','formal'));
 const next=withScenarioAnswer(base,fakeManifest,'D01',fakeManifest.documents[0].kind);
 assert.equal(base.simulator_attempts_v1,undefined);
 assert.equal(readScenarioAnswers(next).D01,fakeManifest.documents[0].kind);
 assert.equal(checkScenarioAnswer(fakeManifest.documents[0],readScenarioAnswers(next).D01).correct,true);
 assert.equal(checkScenarioAnswer(fakeManifest.documents[0],'invalid').valid,false);
 assert.equal(readScenarioAnswers({...next,simulator_attempts_v1:{scenario_id:'inny',answers:{D01:'formal'}}}).D01,undefined);
});
test('Różne źródła dokumentów nie są traktowane jako drugie przepływy',()=>{
 const scenario={...fakeManifest,documents:fakeManifest.documents.map((d,i)=>i===0?{...d,kind:'bank_in',amount_pln:60000}:
 i===1?{...d,kind:'formal',amount_pln:60000}:i===2?{...d,kind:'bank_out',amount_pln:5000}:
 {...d,kind:'purchase',amount_pln:300})};
 const r=scenarioSummary(scenario);
 assert.equal(r.bankIn,60000);assert.equal(r.bankOut,5000);assert.equal(r.bankNet,55000);
 assert.equal(r.attempted,0);assert.equal(r.correct,0);
});
test('Odpowiedzi w prywatnym biurze można poprawiać bez oznaczania etapu jako ukończony',()=>{
 const base={schema_version:1,invoices:[],bank:[],journals:[],matches:[]};
 const a=withScenarioAnswer(base,fakeManifest,'D01','bank_out');
 const b=withScenarioAnswer(a,fakeManifest,'D01','formal');
 assert.equal(scenarioSummary(fakeManifest,readScenarioAnswers(a)).attempted,1);
 assert.equal(scenarioSummary(fakeManifest,readScenarioAnswers(a)).correct,0);
 assert.equal(scenarioSummary(fakeManifest,readScenarioAnswers(b)).correct,1);
 assert.equal(scenarioSummary(fakeManifest,readScenarioAnswers(b)).total,36);
});


import {readBankExercise,withBankExercise,checkBankExercise} from '../src/accounting/simulator-core.js';
const bankCase={...fakeManifest,documents:fakeManifest.documents.map((d,i)=>
 i===0?{...d,kind:'bank_in',amount_pln:94000}:
 i===1?{...d,kind:'bank_out',amount_pln:33900}:
 {...d,kind:'formal',amount_pln:94000})};
const bankAnswer={bank_in_cents:9400000,bank_out_cents:3390000,bank_net_cents:6010000};
test('Ćwiczenie bankowe liczy wyłącznie przelewy, nie faktury i inne dowody',()=>{
 const p=checkBankExercise(bankCase,bankAnswer);
 assert.equal(p.attempted,true);assert.equal(p.correct,true);
 assert.equal(p.consistent,true);assert.equal(p.checks.length,3);
});
test('Ćwiczenie rozróżnia błąd w jednej z trzech kwot',()=>{
 const p=checkBankExercise(bankCase,{...bankAnswer,bank_out_cents:3390001});
 assert.equal(p.correct,false);assert.equal(p.consistent,false);
 assert.deepEqual(p.checks.filter(x=>!x.correct).map(x=>x.key),['bank_out_cents']);
});
test('Niezgodne saldo netto nie przejdzie pomimo poprawnych wpływów i wypływów',()=>{
 const p=checkBankExercise(bankCase,{...bankAnswer,bank_net_cents:0});
 assert.equal(p.correct,false);assert.equal(p.consistent,false);
 assert.deepEqual(p.checks.filter(x=>!x.correct).map(x=>x.key),['bank_net_cents']);
});
test('Niedozwolone wartości i ujemne wypływy są odrzucane bez zapisu',()=>{
 const s=EMPTY();
 for(const wrong of [
  {...bankAnswer,bank_in_cents:-1},{...bankAnswer,bank_out_cents:-3390000},
  {...bankAnswer,bank_net_cents:NaN},{...bankAnswer,bank_in_cents:Infinity},
  {...bankAnswer,bank_in_cents:'94000'},{...bankAnswer,bank_out_cents:1e14}
 ])assert.throws(()=>withBankExercise(s,bankCase,wrong));
 assert.equal(readBankExercise(s),null);
});
test('Zapis uzgodnienia nie modyfikuje dziennika ani wcześniejszych klasyfikacji',()=>{
 const s=withScenarioAnswer(EMPTY(),bankCase,'D01','bank_in');
 const original=JSON.stringify(s);
 const next=withBankExercise(s,bankCase,bankAnswer);
 assert.equal(JSON.stringify(s),original);
 assert.equal(readScenarioAnswers(next).D01,'bank_in');
 assert.equal(next.journals.length,0);
 assert.deepEqual(readBankExercise(next),{...bankAnswer,attempts:1});
 const corrected=withBankExercise(next,bankCase,{...bankAnswer,bank_net_cents:0});
 assert.equal(readBankExercise(corrected).attempts,2);
 assert.equal(checkBankExercise(bankCase,readBankExercise(corrected)).correct,false);
 assert.equal(checkBankExercise(bankCase,readBankExercise(next)).correct,true);
});
test('Odczyt z innego manifestu lub uszkodzonego stanu nie jest zaliczany',()=>{
 const s=withBankExercise(EMPTY(),bankCase,bankAnswer);
 assert.equal(readBankExercise({...s,simulator_bank_exercise_v1:{
  ...s.simulator_bank_exercise_v1,scenario_id:'inna-firma'}}),null);
 assert.equal(readBankExercise({...s,simulator_bank_exercise_v1:{
  ...s.simulator_bank_exercise_v1,bank_in_cents:'94000'}}),null);
 assert.equal(checkBankExercise(bankCase,readBankExercise({})).attempted,false);
});
test('Ujemna zmiana banku może być poprawnym wynikiem',()=>{
 const month={...bankCase,documents:bankCase.documents.map((d,i)=>i===0?{...d,amount_pln:100}:i===1?{...d,amount_pln:250}:d)};
 const result=checkBankExercise(month,{bank_in_cents:10000,bank_out_cents:25000,bank_net_cents:-15000});
 assert.equal(result.correct,true);
});


import {readJournalPractice,readJournalAttempts,withJournalAttempt,checkJournalAttempt,journalPracticeSummary} from '../src/accounting/simulator-core.js';
const pair=(debit,credit,amount)=>[{account:debit,debit_cents:amount,credit_cents:0},{account:credit,debit_cents:0,credit_cents:amount}];
const sampleJournalManifest={...fakeManifest,journal_practice_v1:{
 version:1,currency:'PLN',accounts:{130:'Rachunek bankowy',800:'Kapitał własny',201:'Należności'},
 entries:Object.fromEntries(fakeManifest.documents.map((d,i)=>[d.id,{
  lines:i===0?pair('130','800',6000000):i===2?
   [...pair('201','800',1600000),...pair('130','201',800000)]:[],
  explanation:'Fikcyjne zadanie księgowe, bez potwierdzenia podatków.'
 }]))
}};
test('Wzorzec chroniony: dokładnie 36 kompletnych zbilansowanych dokumentów',()=>{
 const m=readJournalPractice(sampleJournalManifest);
 assert.equal(Object.keys(m.entries).length,36);
 assert.deepEqual(m.entries.D01.lines,pair('130','800',6000000));
 assert.equal(m.entries.D02.lines.length,0);
 assert.equal(journalPracticeSummary(sampleJournalManifest,{}).reference_posts,2);
});
test('Błędny klucz wzorcowy, nieznane konto i nierównowaga są blokowane',()=>{
 const copy=structuredClone(sampleJournalManifest);delete copy.journal_practice_v1.entries.D36;
 assert.throws(()=>readJournalPractice(copy));
 const unknown=structuredClone(sampleJournalManifest);unknown.journal_practice_v1.entries.D01.lines[0].account='999';
 assert.throws(()=>readJournalPractice(unknown));
 const unbalanced=structuredClone(sampleJournalManifest);unbalanced.journal_practice_v1.entries.D03.lines[0].debit_cents++;
 assert.throws(()=>readJournalPractice(unbalanced));
});
test('Kursant zapisuje prawidłowy dekret w osobnej przestrzeni bez zmiany dziennika',()=>{
 const base=EMPTY(),before=JSON.stringify(base),expected=sampleJournalManifest.journal_practice_v1.entries.D01.lines;
 const next=withJournalAttempt(base,sampleJournalManifest,'D01',expected);
 assert.equal(JSON.stringify(base),before);
 assert.equal(next.journals.length,0);
 assert.equal(checkJournalAttempt(sampleJournalManifest,'D01',readJournalAttempts(next,sampleJournalManifest).D01).correct,true);
 assert.equal(readJournalAttempts(next,sampleJournalManifest).D01.tries,1);
});
test('Dekret zbilansowany, ale na błędnych kontach nie zostaje zaliczony',()=>{
 const wrong=pair('130','201',6000000);
 const state=withJournalAttempt(EMPTY(),sampleJournalManifest,'D01',wrong);
 const result=checkJournalAttempt(sampleJournalManifest,'D01',readJournalAttempts(state,sampleJournalManifest).D01);
 assert.equal(result.balanced,true);assert.equal(result.correct,false);
});
test('Dekret Wn ≠ Ma pozostaje próbą wymagającą korekty',()=>{
 const wrong=[{account:'130',debit_cents:6000000,credit_cents:0}];
 const state=withJournalAttempt(EMPTY(),sampleJournalManifest,'D01',wrong);
 const result=checkJournalAttempt(sampleJournalManifest,'D01',readJournalAttempts(state,sampleJournalManifest).D01);
 assert.equal(result.balanced,false);assert.equal(result.correct,false);
});
test('Brak dekretu jest poprawny dla dowodu formalnego, a nie dla wpłaty',()=>{
 const a=withJournalAttempt(EMPTY(),sampleJournalManifest,'D02',[]);
 const b=withJournalAttempt(a,sampleJournalManifest,'D01',[]);
 const answers=readJournalAttempts(b,sampleJournalManifest);
 assert.equal(checkJournalAttempt(sampleJournalManifest,'D02',answers.D02).correct,true);
 assert.equal(checkJournalAttempt(sampleJournalManifest,'D01',answers.D01).correct,false);
 assert.deepEqual(journalPracticeSummary(sampleJournalManifest,answers),{total:36,attempted:2,correct:1,reference_posts:2});
});
test('Czterowierszowy rozrachunek zaliczki nie przechodzi po pominięciu części',()=>{
 const full=sampleJournalManifest.journal_practice_v1.entries.D03.lines;
 const a=withJournalAttempt(EMPTY(),sampleJournalManifest,'D03',full.slice(0,2));
 const b=withJournalAttempt(a,sampleJournalManifest,'D03',full);
 assert.equal(checkJournalAttempt(sampleJournalManifest,'D03',readJournalAttempts(a,sampleJournalManifest).D03).correct,false);
 assert.equal(checkJournalAttempt(sampleJournalManifest,'D03',readJournalAttempts(b,sampleJournalManifest).D03).correct,true);
 assert.equal(readJournalAttempts(b,sampleJournalManifest).D03.tries,2);
});
test('Nieprawidłowe i zbyt długie zapisy odrzucamy bez naruszania stanu',()=>{
 const base=EMPTY();
 for(const lines of [[{account:'999',debit_cents:5,credit_cents:0}],
 [{account:'130',debit_cents:5,credit_cents:5}],
 [{account:'130',debit_cents:-1,credit_cents:0}],
 [{account:'130',debit_cents:NaN,credit_cents:0}],
 Array(9).fill({account:'130',debit_cents:100,credit_cents:0})])
  assert.throws(()=>withJournalAttempt(base,sampleJournalManifest,'D01',lines));
 assert.throws(()=>withJournalAttempt(base,sampleJournalManifest,'D37',[]));
 assert.equal(base.simulator_journal_attempts_v1,undefined);
});
test('Zmiana scenariusza nie przejmuje zapisów innego wariantu',()=>{
 const next=withJournalAttempt(EMPTY(),sampleJournalManifest,'D01',pair('130','800',6000000));
 const changed={...next,simulator_journal_attempts_v1:{...next.simulator_journal_attempts_v1,scenario_id:'inna-firma'}};
 assert.deepEqual(readJournalAttempts(changed,sampleJournalManifest),{});
});


test('Test interfejsu: moduł pracowni importuje się bez błędu składni',async()=>{
 const ui=await import('../src/accounting/lab-ui.js');
 assert.equal(typeof ui.mountLab,'function');
});


import {journalClosingPreview} from '../src/accounting/simulator-core.js';
test('Pełny fikcyjny miesiąc 36 dekretów tworzy zgodny bilans bez podwójnych wpływów',()=>{
 const manifest=structuredClone(sampleJournalManifest);
 manifest.journal_practice_v1.reconciliation={
  bank:68000,receivables:8000,inventory:0,machine:0,trade_payables:0,loan:0,profit:0
 };
 let state=EMPTY();
 for(const d of manifest.documents)state=withJournalAttempt(state,manifest,d.id,manifest.journal_practice_v1.entries[d.id].lines);
 const report=journalClosingPreview(manifest,readJournalAttempts(state,manifest));
 assert.equal(report.progress.attempted,36);assert.equal(report.progress.correct,36);
 assert.equal(report.debit_cents,report.credit_cents);
 assert.equal(report.assets_cents,7600000);assert.equal(report.liabilities_cents,0);assert.equal(report.equity_cents,7600000);
 assert.equal(report.checks.length,7);assert.ok(report.checks.every(c=>c.matches));
 assert.equal(report.model_reconciled,true);
});
test('Bilans próbny nie przechodzi przy zbilansowanej, lecz błędnej dekretacji',()=>{
 const manifest=structuredClone(sampleJournalManifest);
 manifest.journal_practice_v1.reconciliation={bank:68000,receivables:8000,inventory:0,machine:0,trade_payables:0,loan:0,profit:0};
 let state=EMPTY();
 for(const d of manifest.documents)state=withJournalAttempt(state,manifest,d.id,
  d.id==='D01'?pair('130','201',6000000):manifest.journal_practice_v1.entries[d.id].lines);
 const report=journalClosingPreview(manifest,readJournalAttempts(state,manifest));
 assert.equal(report.progress.attempted,36);assert.equal(report.progress.correct,35);
 assert.equal(report.debit_cents,report.credit_cents);
 assert.equal(report.model_reconciled,false);
 assert.ok(report.checks.some(c=>!c.matches));
});
test('Niepełny miesiąc nie jest zamknięciem nawet przy równych stronach',()=>{
 const manifest=structuredClone(sampleJournalManifest);
 manifest.journal_practice_v1.reconciliation={bank:68000,receivables:8000,inventory:0,machine:0,trade_payables:0,loan:0,profit:0};
 const state=withJournalAttempt(EMPTY(),manifest,'D02',[]);
 const report=journalClosingPreview(manifest,readJournalAttempts(state,manifest));
 assert.equal(report.progress.attempted,1);assert.equal(report.model_reconciled,false);
});


import {auditMonthWorkflow,inspectReferenceMonth} from '../src/accounting/simulator-core.js';
function completeIntegratedFixture(){
 const manifest=structuredClone(sampleJournalManifest);
 manifest.documents=manifest.documents.map((d,i)=>({
  ...d,kind:i===0||i===2?'bank_in':'formal',amount_pln:i===0?60000:i===2?8000:0
 }));
 manifest.journal_practice_v1.reconciliation={
  bank:68000,receivables:8000,inventory:0,machine:0,trade_payables:0,loan:0,profit:0
 };
 let state=EMPTY();
 for(const doc of manifest.documents){
  state=withScenarioAnswer(state,manifest,doc.id,doc.kind);
  state=withJournalAttempt(state,manifest,doc.id,manifest.journal_practice_v1.entries[doc.id].lines);
 }
 state=withBankExercise(state,manifest,{bank_in_cents:6800000,bank_out_cents:0,bank_net_cents:6800000});
 return {manifest,state};
}
test('Etapy D01–D36: zgodność rozpoznania, banku, dziennika i bilansu',()=>{
 const {manifest,state}=completeIntegratedFixture();
 const audit=auditMonthWorkflow(manifest,state);
 assert.equal(audit.passed,5);
 assert.equal(audit.training_consistent,true);
 assert.equal(audit.bank_difference_cents,0);
 assert.equal(audit.real_two_account_e2e,'not_tested');
 assert.equal(audit.independent_restore,'not_tested');
});
test('Przekrojowa kontrola nie uznaje pustych lub częściowych prób',()=>{
 const {manifest}=completeIntegratedFixture();
 const audit=auditMonthWorkflow(manifest,EMPTY());
 assert.equal(audit.passed,0);
 assert.equal(audit.training_consistent,false);
 assert.equal(audit.bank_difference_cents,null);
});
test('Poprawne dekrety nie maskują błędnego wyliczenia wyciągu',()=>{
 const {manifest,state}=completeIntegratedFixture();
 const wrong=withBankExercise(state,manifest,{bank_in_cents:6800000,bank_out_cents:0,bank_net_cents:0});
 const audit=auditMonthWorkflow(manifest,wrong);
 assert.equal(audit.checks.find(x=>x.key==='bank').passed,false);
 assert.equal(audit.checks.find(x=>x.key==='journal').passed,true);
 assert.equal(audit.training_consistent,false);
});
test('Błędnie rozpoznany dokument blokuje zgodność pomimo poprawnego banku i bilansu',()=>{
 const {manifest,state}=completeIntegratedFixture();
 const wrong=withScenarioAnswer(state,manifest,'D01','sale');
 const audit=auditMonthWorkflow(manifest,wrong);
 assert.equal(audit.checks.find(x=>x.key==='classification').passed,false);
 assert.equal(audit.checks.find(x=>x.key==='closing').passed,true);
 assert.equal(audit.training_consistent,false);
});
test('Równe Wn/Ma nie wystarczą: wykrywana jest różnica banku z dokumentami',()=>{
 const {manifest,state}=completeIntegratedFixture();
 const changed=withJournalAttempt(state,manifest,'D03',pair('201','800',1600000));
 const audit=auditMonthWorkflow(manifest,changed);
 assert.equal(audit.checks.find(x=>x.key==='bank_vs_journal').passed,false);
 assert.equal(audit.bank_difference_cents,-800000);
 assert.equal(audit.training_consistent,false);
});

test('Wzorzec D01–D36: ruch bankowy jest przypisany do właściwych dokumentów',()=>{
 const {manifest,state}=completeIntegratedFixture();
 const reference=inspectReferenceMonth(manifest);
 assert.equal(reference.ok,true);
 assert.equal(reference.checked_documents,36);
 assert.deepEqual(reference.issues,[]);
 const audit=auditMonthWorkflow(manifest,state);
 assert.equal(audit.reference_integrity,'passed');
 assert.equal(audit.training_consistent,true);
});
test('Wykrywa przeniesienie wpływu do obcego dowodu mimo 5/5 zgodnych etapów ucznia',()=>{
 const {manifest}=completeIntegratedFixture();
 const wrong=structuredClone(manifest);
 const first=wrong.journal_practice_v1.entries.D01.lines;
 wrong.journal_practice_v1.entries.D01.lines=wrong.journal_practice_v1.entries.D02.lines;
 wrong.journal_practice_v1.entries.D02.lines=first;
 let state=EMPTY();
 for(const doc of wrong.documents){
  state=withScenarioAnswer(state,wrong,doc.id,doc.kind);
  state=withJournalAttempt(state,wrong,doc.id,wrong.journal_practice_v1.entries[doc.id].lines);
 }
 state=withBankExercise(state,wrong,{bank_in_cents:6800000,bank_out_cents:0,bank_net_cents:6800000});
 const audit=auditMonthWorkflow(wrong,state);
 assert.equal(audit.passed,5,'Stary wynik byłby myląco pozytywny');
 assert.equal(audit.reference_integrity,'blocked');
 assert.equal(audit.training_consistent,false);
 assert.ok(audit.reference_issues.some(issue=>issue.code==='bank_source_mismatch'&&issue.document_id==='D01'));
 assert.ok(audit.reference_issues.some(issue=>issue.code==='bank_source_mismatch'&&issue.document_id==='D02'));
});
test('Wzorzec z rozbieżną kwotą kontrolną nie może przejść kontroli',()=>{
 const {manifest}=completeIntegratedFixture();
 const wrong=structuredClone(manifest);
 wrong.journal_practice_v1.reconciliation.bank=68001;
 const quality=inspectReferenceMonth(wrong);
 assert.equal(quality.ok,false);
 assert.ok(quality.issues.some(issue=>issue.code==='reference_reconciliation_mismatch'&&issue.field==='bank'));
});
test('Ujemny fikcyjny wpływ lub wydatek jest odrzucony na wejściu',()=>{
 const {manifest}=completeIntegratedFixture();
 for(const k of ['bank_in','bank_out']){
  const wrong=structuredClone(manifest);
  wrong.documents[0].kind=k;wrong.documents[0].amount_pln=-1;
  assert.throws(()=>readScenario(wrong));
 }
});

test('Zamknięcie fikcyjnego miesiąca dopuszcza stratę, nie tylko zysk',()=>{
 const {manifest:base}=completeIntegratedFixture();
 const manifest=structuredClone(base);
 manifest.documents=manifest.documents.map(d=>({
  ...d,kind:d.id==='D01'?'bank_in':d.id==='D03'?'bank_out':'formal',
  amount_pln:d.id==='D01'?60000:d.id==='D03'?5000:0
 }));
 manifest.journal_practice_v1.accounts['400']='Koszty działalności (model)';
 manifest.journal_practice_v1.entries.D03.lines=pair('400','130',500000);
 manifest.journal_practice_v1.reconciliation={
  bank:55000,receivables:0,inventory:0,machine:0,trade_payables:0,loan:0,profit:-5000
 };
 let state=EMPTY();
 for(const doc of manifest.documents){
  state=withScenarioAnswer(state,manifest,doc.id,doc.kind);
  state=withJournalAttempt(state,manifest,doc.id,manifest.journal_practice_v1.entries[doc.id].lines);
 }
 state=withBankExercise(state,manifest,{bank_in_cents:6000000,bank_out_cents:500000,bank_net_cents:5500000});
 const closing=journalClosingPreview(manifest,readJournalAttempts(state,manifest));
 assert.equal(closing.progress.correct,36);
 assert.equal(closing.debit_cents,6500000);
 assert.equal(closing.credit_cents,6500000);
 assert.equal(closing.assets_cents,5500000);
 assert.equal(closing.equity_cents,5500000);
 assert.equal(closing.balance_diff_cents,0);
 assert.equal(closing.checks.find(c=>c.key==='profit').expected_cents,-500000);
 assert.equal(closing.checks.find(c=>c.key==='profit').matches,true);
 assert.equal(closing.model_reconciled,true);
 const audit=auditMonthWorkflow(manifest,state);
 assert.equal(audit.passed,5);
 assert.equal(audit.training_consistent,true);
 assert.equal(audit.reference_integrity,'passed');
});
test('Fałszywy zysk i ujemna należność nie przechodzą kontroli straty',()=>{
 const {manifest:base}=completeIntegratedFixture();
 const manifest=structuredClone(base);
 manifest.journal_practice_v1.reconciliation={
  bank:68000,receivables:8000,inventory:0,machine:0,trade_payables:0,loan:0,profit:-1
 };
 const loss=inspectReferenceMonth(manifest);
 assert.equal(loss.ok,false);
 assert.ok(loss.issues.some(i=>i.code==='reference_reconciliation_mismatch'&&i.field==='profit'));
 manifest.journal_practice_v1.reconciliation.profit=0;
 manifest.journal_practice_v1.reconciliation.receivables=-8000;
 const negativeAsset=inspectReferenceMonth(manifest);
 assert.equal(negativeAsset.ok,false);
 assert.ok(negativeAsset.issues.some(i=>i.code==='reference_reconciliation_mismatch'&&i.field==='receivables'));
});


import {PERSONNEL_FLAGS,readPersonnelCases,withPersonnelCase,personnelDraftReview,validPersonnelCase} from '../src/accounting/personnel-practice.js';
const fakeEmployee=(id='P01')=>({id,fictional_name:'Ola Przykładowa',contract_kind:'indefinite',
 signed_on:'2026-01-02',starts_on:'2026-01-05',ends_on:'',
 monthly_gross_cents:520000,workload_pct:100,notes:'Fikcyjne ćwiczenie.',document_drafts:{
 contract_draft:true,onboarding_draft:true,payroll_draft:false,
 exit_notice_draft:false,final_settlement_draft:false,handover_draft:false
 }});
test('Kadry: dwie osoby nie zmieniają faktur, banku ani dziennika',()=>{
 const initial=fullScenario(),snap=JSON.stringify(initial);
 const first=withPersonnelCase(initial,fakeEmployee());
 const second=withPersonnelCase(first,{...fakeEmployee('P02'),fictional_name:'Piotr Przykładowy',
  workload_pct:50,monthly_gross_cents:310000});
 assert.equal(JSON.stringify(initial),snap);
 assert.equal(readPersonnelCases(second).P01.monthly_gross_cents,520000);
 assert.equal(readPersonnelCases(second).P02.workload_pct,50);
 assert.deepEqual(second.invoices,initial.invoices);
 assert.deepEqual(second.bank,initial.bank);
 assert.deepEqual(second.journals,initial.journals);
});
test('Kadry: data odejścia dodaje listę trzech projektów do przygotowania',()=>{
 const c={...fakeEmployee('P02'),ends_on:'2026-01-28'};
 const review=personnelDraftReview(c);
 assert.equal(review.recorded,true);
 assert.equal(review.drafts_total,6);
 assert.equal(review.drafts_marked,2);
 assert.equal(review.missing.length,4);
 assert.equal(review.legal_review,'not_tested');
 assert.equal(review.actual_documents,'not_verified');
 const marked={...c,document_drafts:Object.fromEntries(Object.keys(PERSONNEL_FLAGS).map(k=>[k,true]))};
 assert.equal(personnelDraftReview(marked).missing.length,0);
 assert.equal(personnelDraftReview(marked).legal_review,'not_tested');
});
test('Kadry: nieprawdziwa data i zła kolejność zatrudnienia blokują zapis',()=>{
 const c=fakeEmployee();
 for(const changes of [{signed_on:'2026-02-30'},{signed_on:'2026-01-06'},
  {starts_on:'2026-01-03',ends_on:'2026-01-02'},{starts_on:'2026-13-01'}]){
  assert.equal(validPersonnelCase({...c,...changes}),false);
  assert.throws(()=>withPersonnelCase(EMPTY(),{...c,...changes}));
 }
});
test('Kadry: odrzucamy numery PESEL w imieniu, e-maile, ujemne kwoty i fałszywe flagi',()=>{
 const c=fakeEmployee();
 for(const changes of [{fictional_name:'Jan 90010112345'}, {fictional_name:'ola@example.com'},
  {monthly_gross_cents:-100},{workload_pct:0},{contract_kind:'unknown'},
  {document_drafts:{contract_draft:'yes'}},{notes:'X'.repeat(801)}]){
  assert.equal(validPersonnelCase({...c,...changes}),false);
 }
});
test('Kadry: ponowny zapis jednej osoby nie tworzy duplikatów',()=>{
 const a=withPersonnelCase(EMPTY(),fakeEmployee());
 const b=withPersonnelCase(a,{...fakeEmployee(),monthly_gross_cents:550000,notes:'Zmiana'});
 assert.deepEqual(Object.keys(readPersonnelCases(b)),['P01']);
 assert.equal(readPersonnelCases(b).P01.monthly_gross_cents,550000);
 assert.equal(readPersonnelCases(a).P01.monthly_gross_cents,520000);
});
test('Kadry: uszkodzony lub obcy scenariusz nie uzyskuje pozornego zaliczenia',()=>{
 const state=withPersonnelCase(EMPTY(),fakeEmployee());
 assert.deepEqual(readPersonnelCases({...state,simulator_personnel_v1:{
  ...state.simulator_personnel_v1,scenario_id:'inny'}}),{});
 const damaged=structuredClone(state);
 damaged.simulator_personnel_v1.cases.P01.starts_on='2026-02-31';
 assert.deepEqual(readPersonnelCases(damaged),{});
 assert.equal(personnelDraftReview(damaged.simulator_personnel_v1.cases.P01).recorded,false);
});

import {PAYROLL_FIELDS,payrollMath,validPayrollPractice,readPayrollPractices,withPayrollPractice,payrollReview,payrollPeriodSummary,payrollBankMatch,bankRowAvailableForInvoice,payrollJournalPreview} from '../src/accounting/payroll-practice.js';
const payrollCase=(id='P01')=>({
 employee_id:id,period:'2026-01',gross_cents:id==='P01'?520000:310000,
 social_cents:id==='P01'?60000:30000,health_cents:id==='P01'?35000:19000,
 pit_cents:id==='P01'?18000:10000,other_cents:0,
 employer_extra_cents:id==='P01'?90000:50000,
 paid_cents:id==='P01'?300000:251000,paid_on:'2026-01-31'
});
const payrollState=()=>{
 let a=withPersonnelCase(EMPTY(),fakeEmployee());
 a=withPersonnelCase(a,{...fakeEmployee('P02'),fictional_name:'Piotr Przykładowy',
  monthly_gross_cents:310000,workload_pct:50,ends_on:'2026-01-28'});
 return a;
};
test('Płace: brutto minus cztery potrącenia i wypłata daje saldo do zapłaty',()=>{
 const c=payrollCase();const m=payrollMath(c);
 assert.equal(m.deductions_cents,113000);
 assert.equal(m.net_cents,407000);
 assert.equal(m.outstanding_cents,107000);
 assert.equal(m.total_employer_cost_cents,610000);
 assert.equal(validPayrollPractice(c),true);
});
test('Płace: odrębne koszty pracodawcy nie pomniejszają netto',()=>{
 const c={...payrollCase(),employer_extra_cents:0};
 assert.equal(payrollMath(c).net_cents,407000);
 assert.equal(payrollMath(c).total_employer_cost_cents,520000);
});
test('Płace: prywatny zapis dwóch osób nie zmienia dokumentów finansowych',()=>{
 const state=payrollState(),snapshot=JSON.stringify(state);
 const a=withPayrollPractice(state,payrollCase('P01'));
 const b=withPayrollPractice(a,payrollCase('P02'));
 assert.equal(JSON.stringify(state),snapshot);
 assert.equal(Object.keys(readPayrollPractices(b)).length,2);
 assert.equal(payrollReview(b,'P02').net_cents,251000);
 assert.equal(payrollReview(b,'P02').outstanding_cents,0);
 assert.deepEqual(b.invoices,state.invoices);
 assert.deepEqual(b.journals,state.journals);
 assert.deepEqual(b.bank,state.bank);
 assert.equal(payrollReview(b,'P02').legal_rates,'not_verified');
 assert.equal(payrollReview(b,'P02').actual_bank_match,'not_tested');
});
test('Płace: nadmierne potrącenia, nadpłata i brak daty wypłaty są blokowane',()=>{
 const state=payrollState(),c=payrollCase();
 for(const wrong of [{...c,pit_cents:600000},{...c,paid_cents:500000},
  {...c,paid_on:''},{...c,social_cents:-1},{...c,period:'2026-13'}]){
  assert.equal(validPayrollPractice(wrong),false);
  assert.throws(()=>withPayrollPractice(state,wrong));
 }
});
test('Płace: okres poza umową i niepoprawna data wypłaty są odrzucane',()=>{
 const s=payrollState(),c=payrollCase('P02');
 assert.throws(()=>withPayrollPractice(s,{...c,period:'2026-02'}));
 assert.throws(()=>withPayrollPractice(s,{...c,period:'2025-12'}));
 assert.throws(()=>withPayrollPractice(s,{...c,paid_on:'2026-02-30'}));
 assert.throws(()=>withPayrollPractice(s,{...c,paid_on:'2025-12-31'}));
});
test('Płace: zmiana kwoty brutto w kartotece unieważnia zgodność szkicu',()=>{
 const a=withPayrollPractice(payrollState(),payrollCase('P01'));
 const changed=withPersonnelCase(a,{...readPersonnelCases(a).P01,monthly_gross_cents:530000});
 assert.equal(payrollReview(changed,'P01').recorded,true);
 assert.equal(payrollReview(changed,'P01').eligible,false);
 assert.throws(()=>withPayrollPractice(changed,payrollCase('P01')));
});
test('Płace: nadpisanie P01 zachowuje P02 i odrzuca nieprawidłowy scenariusz',()=>{
 const a=withPayrollPractice(withPayrollPractice(payrollState(),payrollCase('P01')),payrollCase('P02'));
 const next=withPayrollPractice(a,{...payrollCase('P01'),paid_cents:407000});
 assert.deepEqual(readPayrollPractices(next).P02,readPayrollPractices(a).P02);
 assert.equal(payrollReview(next,'P01').outstanding_cents,0);
 const other={...next,simulator_payroll_v1:{...next.simulator_payroll_v1,scenario_id:'other'}};
 assert.deepEqual(readPayrollPractices(other),{});
});
test('Płace: pusty HR nie może utworzyć listy płac; definicje pól są kompletne',()=>{
 assert.equal(Object.keys(PAYROLL_FIELDS).length,6);
 assert.throws(()=>withPayrollPractice(EMPTY(),payrollCase()));
 assert.equal(payrollReview(EMPTY(),'P01').recorded,false);
});

test('Płace: zestawienie płynności dwóch osób bez podwójnego liczenia potrąceń',()=>{
 const initial=payrollState(),before=JSON.stringify(initial);
 const a=withPayrollPractice(initial,payrollCase('P01'));
 const b=withPayrollPractice(a,payrollCase('P02'));
 const result=payrollPeriodSummary(b);
 assert.equal(JSON.stringify(initial),before);
 assert.deepEqual(result.excluded_employee_ids,[]);
 assert.equal(result.periods.length,1);
 const jan=result.periods[0];
 assert.equal(jan.period,'2026-01');
 assert.equal(jan.employee_count,2);
 assert.equal(jan.gross_cents,830000);
 assert.equal(jan.deductions_cents,172000);
 assert.equal(jan.net_cents,658000);
 assert.equal(jan.paid_cents,551000);
 assert.equal(jan.outstanding_cents,107000);
 assert.equal(jan.employer_extra_cents,140000);
 assert.equal(jan.total_employer_cost_cents,970000);
 assert.equal(jan.net_cents,jan.paid_cents+jan.outstanding_cents);
 assert.equal(result.bank_match,'not_tested');
 assert.equal(result.legal_rates,'not_verified');
});
test('Płace: różnych miesięcy nie sumujemy w jednej tabeli płynności',()=>{
 const first=withPayrollPractice(payrollState(),payrollCase('P01'));
 const p02=readPersonnelCases(first).P02;
 const extended=withPersonnelCase(first,{...p02,ends_on:'2026-02-28'});
 const state=withPayrollPractice(extended,{...payrollCase('P02'),period:'2026-02',paid_on:'2026-02-28'});
 const rows=payrollPeriodSummary(state).periods;
 assert.deepEqual(rows.map(x=>x.period),['2026-01','2026-02']);
 assert.deepEqual(rows.map(x=>x.employee_count),[1,1]);
 assert.equal(rows[0].outstanding_cents,107000);
 assert.equal(rows[1].outstanding_cents,0);
});
test('Płace: zmieniony pracownik wykluczony z płynności do czasu korekty',()=>{
 const base=payrollState();
 const a=withPayrollPractice(withPayrollPractice(base,payrollCase('P01')),payrollCase('P02'));
 const changed=withPersonnelCase(a,{...readPersonnelCases(a).P01,monthly_gross_cents:530000});
 const before=JSON.stringify(changed);
 const res=payrollPeriodSummary(changed);
 assert.deepEqual(res.excluded_employee_ids,['P01']);
 assert.equal(res.periods.length,1);
 assert.equal(res.periods[0].gross_cents,310000);
 assert.equal(JSON.stringify(changed),before);
});
test('Płace: pusty moduł nie udaje potwierdzenia przelewu',()=>{
 const data=payrollPeriodSummary(EMPTY());
 assert.deepEqual(data.periods,[]);
 assert.deepEqual(data.excluded_employee_ids,[]);
 assert.equal(data.cashflow_type,'declared_training_payments_not_bank_verified');
});


test('Płace/CSV: jawny wybór fikcyjnej operacji zgodnej z datą i kwotą',()=>{
 const original=payrollState();
 const bank=[{id:'CW-PAY-P01',date:'2026-01-31',amount_cents:-300000,description:'Fikcyjna wypłata P01'}];
 const state={...original,bank},before=JSON.stringify(state);
 const saved=withPayrollPractice(state,{...payrollCase('P01'),bank_transaction_id:'CW-PAY-P01'});
 assert.equal(JSON.stringify(state),before);
 assert.deepEqual(saved.bank,bank);
 assert.deepEqual(saved.invoices,state.invoices);
 assert.deepEqual(saved.journals,state.journals);
 assert.equal(payrollBankMatch(saved,'P01').status,'matched_training_csv');
 assert.equal(payrollBankMatch(saved,'P01').actual_bank_verified,false);
 assert.equal(payrollReview(saved,'P01').actual_bank_match,'not_tested');
 const summary=payrollPeriodSummary(saved).periods[0];
 assert.equal(summary.training_csv_matched_cents,300000);
 assert.equal(summary.training_csv_unmatched_cents,0);
 assert.equal(summary.outstanding_cents,107000);
});
test('Płace/CSV: nie zgodzą się data, kwota i znak operacji',()=>{
 const base=payrollState(),c={...payrollCase('P01'),bank_transaction_id:'CW-PAY-P01'};
 for(const bank of [
  [{id:'CW-PAY-P01',date:'2026-01-31',amount_cents:300000}],
  [{id:'CW-PAY-P01',date:'2026-01-31',amount_cents:-300001}],
  [{id:'CW-PAY-P01',date:'2026-02-01',amount_cents:-300000}],
  []])assert.throws(()=>withPayrollPractice({...base,bank},c));
 const ok=withPayrollPractice({...base,bank:[{id:'CW-PAY-P01',date:'2026-01-31',amount_cents:-300000}]},c);
 assert.equal(payrollBankMatch({...ok,bank:[]},'P01').status,'missing_bank_row');
 assert.equal(payrollBankMatch({...ok,bank:[{id:'CW-PAY-P01',date:'2026-01-30',amount_cents:-300000}]},'P01').status,'date_mismatch');
 assert.equal(payrollBankMatch({...ok,bank:[{id:'CW-PAY-P01',date:'2026-01-31',amount_cents:-299999}]},'P01').status,'amount_mismatch');
});
test('Płace/CSV: dowód rozliczony z fakturą nie jest drugi raz wypłatą',()=>{
 const state={...payrollState(),bank:[{id:'CW-PAY-P01',date:'2026-01-31',amount_cents:-300000}],
  matches:[{bank_id:'CW-PAY-P01',invoice_id:'F01',amount_cents:300000}]};
 assert.throws(()=>withPayrollPractice(state,{...payrollCase('P01'),bank_transaction_id:'CW-PAY-P01'}));
 const ok=withPayrollPractice({...state,matches:[]},{...payrollCase('P01'),bank_transaction_id:'CW-PAY-P01'});
 assert.equal(payrollBankMatch({...ok,matches:state.matches},'P01').status,'already_allocated_to_invoice');
});
test('Płace/CSV: dwie osoby nie mogą wybrać tego samego przelewu',()=>{
 const bank=[{id:'BANK-2510',date:'2026-01-31',amount_cents:-251000}];
 const first=withPayrollPractice({...payrollState(),bank},{...payrollCase('P01'),paid_cents:251000,bank_transaction_id:'BANK-2510'});
 assert.throws(()=>withPayrollPractice(first,{...payrollCase('P02'),bank_transaction_id:'BANK-2510'}));
 const other=withPayrollPractice(first,{...payrollCase('P02'),bank_transaction_id:''});
 assert.equal(payrollBankMatch(other,'P01').status,'matched_training_csv');
 assert.equal(payrollBankMatch(other,'P02').status,'not_linked');
 assert.equal(payrollPeriodSummary(other).periods[0].training_csv_unmatched_cents,251000);
});
test('Płace/CSV: stare karty działają bez nowego pola i bez pozornego przelewu',()=>{
 const s=withPayrollPractice(payrollState(),payrollCase('P01'));
 assert.equal(payrollBankMatch(s,'P01').status,'not_linked');
 assert.equal(payrollPeriodSummary(s).periods[0].training_csv_matched_cents,0);
 assert.equal(payrollPeriodSummary(s).periods[0].training_csv_unmatched_cents,300000);
 assert.equal(payrollReview(s,'P01').actual_bank_match,'not_tested');
 const zero={...payrollCase('P01'),paid_cents:0,paid_on:'',bank_transaction_id:'BANK-2510'};
 assert.equal(validPayrollPractice(zero),false);
});
test('Płace/CSV: zmiana kadrowa odbiera ważność dopasowania',()=>{
 const state=withPayrollPractice({...payrollState(),bank:[{id:'CW-PAY-P01',date:'2026-01-31',amount_cents:-300000}]},
  {...payrollCase('P01'),bank_transaction_id:'CW-PAY-P01'});
 const person=readPersonnelCases(state).P01;
 const changed=withPersonnelCase(state,{...person,monthly_gross_cents:530000});
 assert.equal(payrollBankMatch(changed,'P01').status,'personnel_stale');
 assert.deepEqual(payrollPeriodSummary(changed).excluded_employee_ids,['P01']);
 assert.equal(payrollPeriodSummary(changed).periods.length,0);
});

test('Płace/CSV: nie można ponownie rozliczyć wynagrodzenia w module faktur',()=>{
 const bank=[{id:'TRAIN-OUT-1',date:'2026-01-31',amount_cents:-300000,description:'fikcyjny'}];
 const original={...payrollState(),bank};
 assert.equal(bankRowAvailableForInvoice(original,'TRAIN-OUT-1'),true);
 const linked=withPayrollPractice(original,{...payrollCase('P01'),bank_transaction_id:'TRAIN-OUT-1'});
 assert.equal(bankRowAvailableForInvoice(linked,'TRAIN-OUT-1'),false);
 const cleared=withPayrollPractice(linked,{...payrollCase('P01'),bank_transaction_id:''});
 assert.equal(bankRowAvailableForInvoice(cleared,'TRAIN-OUT-1'),true);
 assert.equal(bankRowAvailableForInvoice(cleared,'NOT-IMPORTED'),false);
 assert.equal(bankRowAvailableForInvoice({...linked,bank:[]},'TRAIN-OUT-1'),false);
});


import {checkInvoiceBankMatch,withInvoiceBankMatch,inspectInvoiceBankMatches} from '../src/accounting/invoice-match.js';
const matchFixture=()=>{
 const sale=invoiceTotals(invoice('sale',100000)),purchase=invoiceTotals(invoice('purchase',20000));
 return {...EMPTY(),invoices:[sale,purchase],bank:[
  {id:'B-IN',date:'2026-11-05',amount_cents:123000,description:'Fikcyjny wpływ'},
  {id:'B-OUT',date:'2026-11-06',amount_cents:-24600,description:'Fikcyjny wypływ'}]};
};
test('Rozrachunki: poprawna częściowa wpłata i dopłata nie naruszają poprzedniego zapisu',()=>{
 const first=matchFixture(),snapshot=JSON.stringify(first);
 const a=withInvoiceBankMatch(first,{id:'m1',bank_id:'B-IN',invoice_id:'sale',amount_cents:23000});
 const b=withInvoiceBankMatch(a,{id:'m2',bank_id:'B-IN',invoice_id:'sale',amount_cents:100000});
 assert.equal(JSON.stringify(first),snapshot);
 assert.equal(a.matches.length,1);assert.equal(b.matches.length,2);
 assert.equal(checkInvoiceBankMatch(first,{id:'z',bank_id:'B-IN',invoice_id:'sale',amount_cents:123000}).invoice_remaining_cents,0);
 assert.deepEqual(inspectInvoiceBankMatches(b),[]);
});
test('Rozrachunki: zakup wymaga wypływu, sprzedaż wpływu; szkic faktury nie przechodzi',()=>{
 const s=matchFixture();
 assert.throws(()=>withInvoiceBankMatch(s,{id:'bad1',bank_id:'B-OUT',invoice_id:'sale',amount_cents:100}),/Wpłatę klienta/);
 assert.throws(()=>withInvoiceBankMatch(s,{id:'bad2',bank_id:'B-IN',invoice_id:'purchase',amount_cents:100}),/Zapłatę dostawcy/);
 const draft=structuredClone(s);draft.invoices[0].status='draft';
 assert.throws(()=>withInvoiceBankMatch(draft,{id:'bad3',bank_id:'B-IN',invoice_id:'sale',amount_cents:100}),/wystawioną fakturę/);
});
test('Rozrachunki: blokada nadpłaty faktury i większej kwoty niż pozostałość na banku',()=>{
 const s=matchFixture(),part=withInvoiceBankMatch(s,{id:'m1',bank_id:'B-IN',invoice_id:'sale',amount_cents:120000});
 assert.throws(()=>withInvoiceBankMatch(part,{id:'m2',bank_id:'B-IN',invoice_id:'sale',amount_cents:5000}),/przekracza/);
 const extra={...s,bank:[...s.bank,{id:'B-LARGE',date:'2026-11-07',amount_cents:200000,description:'Fikcyjny wpływ'}]};
 assert.throws(()=>withInvoiceBankMatch(extra,{id:'m1',bank_id:'B-LARGE',invoice_id:'sale',amount_cents:123001}),/przekracza/);
 assert.throws(()=>withInvoiceBankMatch(s,{id:'m1',bank_id:'B-OUT',invoice_id:'purchase',amount_cents:24601}),/przekracza/);
});
test('Rozrachunki: zero, ujemna kwota, NaN, powtórzony identyfikator i nieznana operacja są blokowane',()=>{
 const s=matchFixture();const good={id:'m1',bank_id:'B-IN',invoice_id:'sale',amount_cents:100};
 for(const amount_cents of [0,-1,NaN,100.5,Infinity])
  assert.throws(()=>withInvoiceBankMatch(s,{...good,amount_cents}));
 const a=withInvoiceBankMatch(s,good);
 assert.throws(()=>withInvoiceBankMatch(a,{...good,amount_cents:200}),/już istnieje/);
 assert.throws(()=>withInvoiceBankMatch(s,{...good,bank_id:'B-UNKNOWN'}),/istniejący przelew/);
});
test('Rozrachunki: przelew zarezerwowany dla wypłaty nie może być fakturą',()=>{
 let s=payrollState();
 s.bank=[{id:'PAY1',date:'2026-01-31',amount_cents:-300000,description:'Fikcyjna płaca'}];
 s=withPayrollPractice(s,{...payrollCase(),bank_transaction_id:'PAY1'});
 s.invoices=[invoiceTotals(invoice('purchase',300000))];
 assert.throws(()=>withInvoiceBankMatch(s,{id:'m1',bank_id:'PAY1',invoice_id:'purchase',amount_cents:300000}),/listy płac/);
});
test('Rozrachunki: historyczne błędne przypisania są widoczne w diagnostyce bez ich usuwania',()=>{
 const valid=matchFixture();
 const invalid={...valid,matches:[{id:'old',bank_id:'B-OUT',invoice_id:'sale',amount_cents:123000}]};
 const old=JSON.stringify(invalid);
 assert.equal(inspectInvoiceBankMatches(invalid).length,1);
 assert.equal(inspect(invalid).some(x=>x.code==='invalid_invoice_payment_match'),true);
 assert.equal(JSON.stringify(invalid),old);
 const duplicate={...valid,matches:[
  {id:'m1',bank_id:'B-IN',invoice_id:'sale',amount_cents:123000},
  {id:'m2',bank_id:'B-IN',invoice_id:'sale',amount_cents:100}]};
 assert.equal(inspectInvoiceBankMatches(duplicate).length,1);
 assert.deepEqual(inspectInvoiceBankMatches(valid),[]);
});


test('Płace: przykład dekretu Wn/Ma bilansuje brutto, netto i ręczne potrącenia',()=>{
 const state=withPayrollPractice(payrollState(),payrollCase());
 const before=JSON.stringify(state),p=payrollJournalPreview(state,'P01');
 assert.equal(p.ready,true);assert.equal(p.accrual.balanced,true);
 assert.equal(p.accrual.debit_cents,520000);
 assert.equal(p.accrual.credit_cents,520000);
 assert.equal(p.net_cents,407000);
 assert.equal(p.accrual.lines.find(x=>x.account==='404').debit_cents,520000);
 assert.equal(p.accrual.lines.find(x=>x.account==='231').credit_cents,407000);
 assert.equal(p.accrual.lines.find(x=>x.account==='229').credit_cents,95000);
 assert.equal(p.accrual.lines.find(x=>x.account==='220').credit_cents,18000);
 assert.equal(p.unclassified_employer_cost_cents,90000);
 assert.equal(p.payment,null);
 assert.equal(p.legal_verified,false);
 assert.equal(JSON.stringify(state),before);
});
test('Płace: plan zapisu bankowego powstaje tylko dla zgodnego fikcyjnego CSV',()=>{
 let state=payrollState();
 state.bank=[{id:'SALARY1',date:'2026-01-31',amount_cents:-300000,description:'Fikcyjne wynagrodzenie'}];
 const c={...payrollCase(),bank_transaction_id:'SALARY1'};
 state=withPayrollPractice(state,c);
 const preview=payrollJournalPreview(state,'P01');
 assert.equal(preview.payment_status,'matched_training_csv');
 assert.equal(preview.payment.balanced,true);
 assert.deepEqual(preview.payment.lines.map(x=>[x.account,x.debit_cents,x.credit_cents]),[
  ['231',300000,0],['130',0,300000]]);
 const invalid={...state,bank:[{...state.bank[0],amount_cents:-299999}]};
 assert.equal(payrollJournalPreview(invalid,'P01').payment,null);
});
test('Płace: bank nie pokazuje nieprzypisanego przelewu gdy jest zgodne powiązanie z listą płac',()=>{
 let state=payrollState();
 state.bank=[{id:'SALARY1',date:'2026-01-31',amount_cents:-300000,description:'Fikcyjny przelew'}];
 state=withPayrollPractice(state,{...payrollCase(),bank_transaction_id:'SALARY1'});
 const issues=inspect(state);
 assert.equal(issues.some(x=>x.code==='unmatched_bank'&&x.id==='SALARY1'),false);
 assert.equal(issues.some(x=>x.code==='unposted_bank'&&x.id==='SALARY1'),true);
});
test('Płace: księgowanie Wn 231 / Ma 130 zgadza się z fikcyjnym wyciągiem, nie tworzy drugiego kosztu',()=>{
 let state=payrollState();
 state.bank=[{id:'SALARY1',date:'2026-01-31',amount_cents:-300000,description:'Fikcyjna wypłata'}];
 state=withPayrollPractice(state,{...payrollCase(),bank_transaction_id:'SALARY1'});
 state.journals=[{id:'J-WAGE',status:'posted',date:'2026-01-31',source_type:'bank',
  source_id:'SALARY1',lines:[{account:'231',debit:300000,credit:0},{account:'130',debit:0,credit:300000}]}];
 const report=balanceReport(state);
 assert.equal(report.bank,-300000);assert.equal(report.ledgerBank,-300000);
 assert.equal(report.debit,report.credit);
 assert.equal(report.profit,0);
 assert.equal(inspect(state).some(x=>['payroll_bank_accounts','unmatched_bank','bank_difference','unposted_bank'].includes(x.code)),false);
});
test('Płace: przychód/koszt wynagrodzeń występuje przy liście płac, a nie przy samej wypłacie',()=>{
 let state=payrollState();
 state=withPayrollPractice(state,payrollCase());
 const p=payrollJournalPreview(state,'P01'),lines=p.accrual.lines.map(l=>({
  account:l.account,debit:l.debit_cents,credit:l.credit_cents
 }));
 state.journals=[{id:'J-GROSS',status:'posted',date:'2026-01-31',source_type:'manual',source_id:'',
  lines}];
 const report=balanceReport(state);
 assert.equal(report.profit,-520000);
 assert.equal(report.debit,520000);
 assert.equal(report.credit,520000);
 assert.equal(report.accounts.find(x=>x.code==='404').balance,520000);
});
test('Płace: błędny i podwójny dekret bankowy zostaje wskazany, nie skasowany',()=>{
 let state=payrollState();
 state.bank=[{id:'SALARY1',date:'2026-01-31',amount_cents:-300000,description:'Fikcyjna wypłata'}];
 state=withPayrollPractice(state,{...payrollCase(),bank_transaction_id:'SALARY1'});
 state.journals=[{id:'J-WRONG',status:'posted',date:'2026-01-31',source_type:'bank',
  source_id:'SALARY1',lines:[{account:'400',debit:300000,credit:0},{account:'130',debit:0,credit:300000}]}];
 const before=JSON.stringify(state);
 assert.ok(inspect(state).some(x=>x.code==='payroll_bank_accounts'));
 assert.equal(JSON.stringify(state),before);
 state.journals=[...state.journals,{...state.journals[0],id:'J-WRONG-2'}];
 assert.ok(inspect(state).some(x=>x.code==='payroll_bank_duplicate_journal'));
});
test('Płace: zmieniona kartoteka blokuje podpowiedź księgową i nie udaje zgodności',()=>{
 const state=withPayrollPractice(payrollState(),payrollCase());
 const changed=withPersonnelCase(state,{...fakeEmployee(),monthly_gross_cents:530000});
 const result=payrollJournalPreview(changed,'P01');
 assert.equal(result.ready,false);assert.equal(result.ledger_posted,false);
});


test('Duplikat dekretu aktywnej faktury jest wykrywany bez zmiany dziennika',()=>{
 const s=fullScenario(),before=JSON.stringify(s);
 s.journals.push({...s.journals[0],id:'drugi-zapis-faktury'});
 const snapshot=JSON.stringify(s);
 assert.ok(inspect(s).some(i=>i.code==='duplicate_invoice_posting'&&i.id==='sale'));
 assert.equal(JSON.stringify(s),snapshot);
 assert.notEqual(snapshot,before);
});
test('Duplikat dekretu jednego przelewu jest wykrywany nawet gdy oba Wn/Ma się bilansują',()=>{
 const s=fullScenario();
 s.journals.push({...s.journals[2],id:'drugi-zapis-bankowy'});
 assert.ok(inspect(s).some(i=>i.code==='duplicate_bank_posting'&&i.id===s.bank[0].id));
});
test('Osierocony dekret faktury i przelewu zgłasza brak dowodu',()=>{
 const s=fullScenario();
 s.journals.push({id:'obca-fv',status:'posted',source_type:'invoice',source_id:'NIE-ISTNIEJE',
  lines:[{account:'201',debit:100,credit:0},{account:'700',debit:0,credit:100}]});
 s.journals.push({id:'obcy-bank',status:'posted',source_type:'bank',source_id:'NIE-ISTNIEJE',
  lines:[{account:'130',debit:100,credit:0},{account:'201',debit:0,credit:100}]});
 const codes=inspect(s).map(i=>i.code);
 assert.ok(codes.includes('orphan_invoice_posting'));
 assert.ok(codes.includes('orphan_bank_posting'));
});
test('Jawne storno wyklucza zapis z aktywnych duplikatów',()=>{
 const s=fullScenario();
 s.journals.push({...s.journals[0],id:'drugi-zapis-faktury'});
 assert.ok(inspect(s).some(i=>i.code==='duplicate_invoice_posting'));
 s.journals.push({id:'storno-drugiego',status:'posted',reversal_of:'drugi-zapis-faktury',
  source_type:'manual',source_id:'',lines:s.journals[0].lines.map(x=>({account:x.account,debit:x.credit,credit:x.debit}))});
 assert.ok(!inspect(s).some(i=>i.code==='duplicate_invoice_posting'));
});
