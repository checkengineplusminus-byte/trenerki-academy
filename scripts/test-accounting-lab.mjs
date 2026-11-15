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
test('Zatwierdzony niezbilansowany dekret jest zgłaszany i nie zmienia danych',()=>{const s=EMPTY();s.journals.push({id:'j-unbalanced',status:'posted',source_type:'manual',source_id:'',lines:[{account:'130',debit:10000,credit:0},{account:'800',debit:0,credit:9000}]});const before=JSON.stringify(s);assert.ok(inspect(s).some(x=>x.code==='posted_unbalanced'&&x.id==='j-unbalanced'&&x.severity==='błąd'));assert.equal(JSON.stringify(s),before);});
test('Ujemna kwota zatwierdzonego dekretu jest wyraźnie wykrywana',()=>{const s=EMPTY();s.journals.push({id:'j-negative',status:'posted',source_type:'manual',source_id:'',lines:[{account:'130',debit:-100,credit:0},{account:'800',debit:0,credit:100}]});assert.ok(inspect(s).some(x=>x.code==='posted_invalid_amount'&&x.id==='j-negative'));});
test('Poprawny dekret nie otrzymuje fałszywego alarmu o niezbilansowaniu',()=>{const s=EMPTY();s.journals.push({id:'j-correct',status:'posted',source_type:'manual',source_id:'',lines:[{account:'130',debit:10000,credit:0},{account:'800',debit:0,credit:10000}]});assert.equal(inspect(s).filter(x=>['posted_unbalanced','posted_invalid_amount'].includes(x.code)).length,0);});

function fullScenario(){const s=EMPTY();s.invoices=[invoiceTotals(invoice()),invoiceTotals(invoice('purchase',20000))];s.bank=parseBankCSV(BANK_TEMPLATE).rows;s.matches=s.invoices.map((i,n)=>({id:'m'+n,invoice_id:i.id,bank_id:s.bank[n].id,amount_cents:i.gross_cents}));s.journals=s.invoices.map(i=>({id:'j'+i.id,status:'posted',date:i.date,source_type:'invoice',source_id:i.id,lines:expectedInvoiceLines(i)}));s.journals.push({id:'jb1',status:'posted',date:s.bank[0].date,source_type:'bank',source_id:s.bank[0].id,lines:[{account:'130',debit:123000,credit:0},{account:'201',debit:0,credit:123000}]},{id:'jb2',status:'posted',date:s.bank[1].date,source_type:'bank',source_id:s.bank[1].id,lines:[{account:'202',debit:24600,credit:0},{account:'130',debit:0,credit:24600}]});return s;}
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


test('Konflikt CAS daje pobranie niezapisanego stanu bez nadpisywania nowszej wersji',async()=>{
 const {mountLab}=await import('../src/accounting/lab-ui.js');
 const originalWindow=globalThis.window,originalDocument=globalThis.document;
 const originalStorage=globalThis.localStorage;
 const originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL;
 const wsFixture={id:'synthetic-lab',name:'Fikcyjna firma',version:3,
  updated_at:'2026-11-14T12:00:00Z',state:EMPTY()};
 const root={innerHTML:'',handlers:{},addEventListener(k,cb){this.handlers[k]=cb;},
  removeEventListener(k){delete this.handlers[k];},querySelectorAll(){return [];}};
 let saves=0,exportedBlob=null,clicked=false;
 globalThis.window={addEventListener(){},removeEventListener(){}};
 globalThis.localStorage={getItem(){return null;},setItem(){}};
 globalThis.document={createElement(){return {href:'',download:'',click(){clicked=true;}}}};
 URL.createObjectURL=b=>{exportedBlob=b;return 'blob:synthetic';};
 URL.revokeObjectURL=()=>{};
 const db={
  auth:{getUser:async()=>({data:{user:{id:'synthetic-user'}}})},
  rpc:async(name,args)=>{
   if(name==='ta_accounting_overview')return {data:{},error:null};
   if(name==='ta_accounting_lab_save'){
    saves++;
    assert.equal(args.expected_version,3);
    assert.equal(args.workspace_id,wsFixture.id);
    return {data:null,error:{code:'40001',message:'concurrent version'}};
   }
   throw new Error('Unexpected RPC '+name);
  },
  from(table){
   return {select(){return this;},eq(){return this;},
    order:async()=>({data:[{id:wsFixture.id,name:wsFixture.name,version:wsFixture.version,updated_at:wsFixture.updated_at}],error:null}),
    single:async()=>({data:wsFixture,error:null}),
    maybeSingle:async()=>({data:null,error:{message:'no manifest for test'}})};
  }
 };
 let dispose=()=>{};
 try{
  dispose=mountLab(root,db);
  await new Promise(resolve=>setImmediate(resolve));
  assert.match(root.innerHTML,/synthetic-lab|Fikcyjna firma/);
  await root.handlers.submit({target:{closest:()=>({dataset:{form:'journal'}})},
   submitter:{value:'draft'},preventDefault(){}});
  assert.equal(saves,1);
  assert.equal(wsFixture.version,3);
  assert.equal(wsFixture.state.journals.length,0);
  assert.match(root.innerHTML,/Pobierz niezapisane zmiany/);
  assert.match(root.innerHTML,/Zapis odrzucony/);
  await root.handlers.click({target:{closest:()=>({
   disabled:false,dataset:{action:'download-conflict',id:''}
  })}});
  assert.equal(clicked,true);
  const backup=JSON.parse(await exportedBlob.text());
  assert.equal(backup.format,'trenerki-unsaved-conflict-v1');
  assert.equal(backup.workspace_id,wsFixture.id);
  assert.equal(backup.expected_version,3);
  assert.equal(backup.next_state.journals.length,1);
  assert.equal(backup.next_state.journals[0].status,'draft');
  assert.equal(wsFixture.state.journals.length,0);
 }finally{
  dispose();
  if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;
  if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
  if(originalStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=originalStorage;
  URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;
 }
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


import {auditMonthWorkflow,inspectReferenceMonth,scenarioBankCSV} from '../src/accounting/simulator-core.js';
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
import {monthTrainingReportHTML} from '../src/accounting/month-training-report.js';
test('Raport D01–D36 pobiera się dopiero po pełnym uzgodnieniu modelu',()=>{
 const {manifest,state}=completeIntegratedFixture();
 const html=monthTrainingReportHTML(manifest,state);
 assert.match(html,/RAPORT SZKOLENIOWY|Raport szkoleniowy/);
 assert.ok(html.includes('TYLKO DANE FIKCYJNE'));
 assert.ok(html.includes('68\u00a0000,00')||html.includes('68 000,00')||html.includes('68&#8239;000,00'));
 assert.equal((html.match(/<tr><td>D\d\d/g)||[]).length,36);
 assert.ok(html.includes('nie zastępuje opinii księgowego'));
 assert.throws(()=>monthTrainingReportHTML(manifest,EMPTY()));
 const partial=withScenarioAnswer(EMPTY(),manifest,'D01','bank_in');
 assert.throws(()=>monthTrainingReportHTML(manifest,partial));
});
test('Raport nie wykonuje HTML ani skryptów pochodzących z dokumentów',()=>{
 const {manifest,state}=completeIntegratedFixture();
 const polluted=structuredClone(manifest);
 polluted.documents[0].title='<script>alert(9)</script>';
 polluted.company='<img src=x onerror=alert(9)>';
 const html=monthTrainingReportHTML(polluted,state);
 assert.ok(!html.includes('<script>alert'));
 assert.ok(!html.includes('<img src=x'));
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(html.includes('&lt;img'));
});

test('Etapy D01–D36: zgodność rozpoznania, banku, dziennika i bilansu',()=>{
 const {manifest,state}=completeIntegratedFixture();
 const audit=auditMonthWorkflow(manifest,state);
 assert.equal(audit.passed,5);
 assert.equal(audit.training_consistent,true);
 assert.equal(audit.bank_difference_cents,0);
 assert.equal(audit.real_two_account_e2e,'not_tested');
 assert.equal(audit.independent_restore,'not_tested');
});
test('D01-D36: pełny fikcyjny miesiąc przeżywa serializację stanu bez utraty pięciu kontroli',()=>{
 const {manifest,state}=completeIntegratedFixture(),before=JSON.stringify(state);
 const restored=JSON.parse(before);
 const result=auditMonthWorkflow(manifest,restored);
 assert.equal(result.passed,5);
 assert.equal(result.training_consistent,true);
 assert.equal(result.bank_difference_cents,0);
 assert.equal(result.real_two_account_e2e,'not_tested');
 assert.equal(JSON.stringify(state),before);
 const changed=withScenarioAnswer(restored,manifest,'D01','sale');
 assert.equal(auditMonthWorkflow(manifest,changed).training_consistent,false);
 assert.equal(JSON.stringify(state),before,'Nowa próba nie może zmieniać wcześniejszego stanu');
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
test('D01-D36: kompensujące ruchy Wn/Ma na banku nie ukrywają fałszywego obrotu',()=>{
 const {manifest}=completeIntegratedFixture(),wrong=structuredClone(manifest);
 wrong.journal_practice_v1.entries.D01.lines.push(
  {account:'130',debit_cents:100,credit_cents:0},
  {account:'130',debit_cents:0,credit_cents:100}
 );
 const reference=inspectReferenceMonth(wrong);
 assert.equal(reference.ok,false);
 assert.ok(reference.issues.some(i=>i.code==='bank_gross_direction_mismatch'&&i.document_id==='D01'));
 let state=EMPTY();
 for(const d of wrong.documents){
  state=withScenarioAnswer(state,wrong,d.id,d.kind);
  state=withJournalAttempt(state,wrong,d.id,wrong.journal_practice_v1.entries[d.id].lines);
 }
 state=withBankExercise(state,wrong,{bank_in_cents:6800000,bank_out_cents:0,bank_net_cents:6800000});
 const audit=auditMonthWorkflow(wrong,state);
 assert.equal(audit.passed,5,'Niezmieniona suma nie może wystarczyć do odbioru wzorca');
 assert.equal(audit.training_consistent,false);
 assert.equal(audit.reference_integrity,'blocked');
});
test('D01-D36: dokument formalny nie może mieć ukrytych, znoszących się obrotów banku',()=>{
 const {manifest}=completeIntegratedFixture(),wrong=structuredClone(manifest);
 wrong.journal_practice_v1.entries.D02.lines=[
  {account:'130',debit_cents:150,credit_cents:0},
  {account:'130',debit_cents:0,credit_cents:150}
 ];
 const reference=inspectReferenceMonth(wrong);
 assert.equal(reference.ok,false);
 assert.ok(reference.issues.some(i=>i.code==='unexpected_bank_posting'&&i.document_id==='D02'));
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

import {PAYROLL_FIELDS,payrollMath,validPayrollPractice,readPayrollPractices,withPayrollPractice,payrollReview,payrollPeriodSummary,payrollBankMatch,bankRowAvailableForInvoice,payrollJournalPreview,payrollJournalDraft,payrollLifecycleChecklist} from '../src/accounting/payroll-practice.js';
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


test('Nie można uznać dekretu szkicu faktury za zaksięgowaną wystawioną fakturę',()=>{
 const s=fullScenario();
 s.invoices[0].status='draft';
 const before=JSON.stringify(s);
 const issues=inspect(s);
 assert.ok(issues.some(x=>x.code==='posting_unissued_invoice'&&x.id==='jsale'));
 assert.equal(JSON.stringify(s),before,'audyt nie zmienia zapisów kursanta');
 s.invoices[0].status='issued';
 assert.equal(inspect(s).some(x=>x.code==='posting_unissued_invoice'),false);
});
test('Zapis nie może dotyczyć faktury o nieznanym statusie',()=>{
 const s=fullScenario();
 s.invoices[1].status='cancelled';
 assert.ok(inspect(s).some(x=>x.code==='posting_unissued_invoice'&&x.id==='jpurchase'));
});


test('Cykl kadrowo-płacowy: puste biuro pokazuje brak kroków, a nie kompletność',()=>{
 const initial=EMPTY(),snap=JSON.stringify(initial),r=payrollLifecycleChecklist(initial,'P01');
 assert.equal(r.ready_for_training_review,false);
 assert.equal(r.steps.find(x=>x.key==='personnel').status,'missing');
 assert.equal(r.steps.find(x=>x.key==='payroll').status,'blocked');
 assert.equal(r.legal_review,'not_tested');
 assert.equal(r.real_bank,'not_verified');
 assert.equal(r.ledger_posted,false);
 assert.equal(r.real_e2e,'not_tested');
 assert.equal(JSON.stringify(initial),snap);
});
test('Cykl kadrowo-płacowy: prawidłowe obliczenia nie zastępują dokumentów i przelewu',()=>{
 const state=withPayrollPractice(payrollState(),payrollCase('P01'));
 const result=payrollLifecycleChecklist(state,'P01');
 assert.equal(result.steps.find(x=>x.key==='documents').status,'pending');
 assert.equal(result.steps.find(x=>x.key==='payroll').status,'arithmetically_consistent');
 assert.equal(result.steps.find(x=>x.key==='bank').status,'pending');
 assert.equal(result.steps.find(x=>x.key==='settlement').status,'pending');
 assert.equal(result.ready_for_training_review,false);
});
test('Cykl kadrowo-płacowy: po dopasowaniu fikcyjnego CSV i netto nadal brak statusu E2E',()=>{
 const bank=[{id:'SALARY-FULL',date:'2026-01-31',amount_cents:-407000}];
 let state=withPayrollPractice({...payrollState(),bank},{
  ...payrollCase('P01'),paid_cents:407000,bank_transaction_id:'SALARY-FULL'});
 const before=JSON.stringify(state);
 const partial=payrollLifecycleChecklist(state,'P01');
 assert.equal(partial.steps.find(x=>x.key==='bank').status,'csv_matched');
 assert.equal(partial.steps.find(x=>x.key==='settlement').status,'amount_reconciled');
 assert.equal(partial.ready_for_training_review,false,'Zaznaczenie dokumentów to osobny etap');
 state=withPersonnelCase(state,{...readPersonnelCases(state).P01,
  document_drafts:{...readPersonnelCases(state).P01.document_drafts,payroll_draft:true}});
 const r=payrollLifecycleChecklist(state,'P01');
 assert.equal(r.ready_for_training_review,true,'Tylko gotowość do recenzji ćwiczenia');
 assert.equal(r.legal_review,'not_tested');
 assert.equal(r.actual_documents,'not_verified');
 assert.equal(r.ledger_posted,false);
 assert.equal(r.real_e2e,'not_tested');
 assert.equal(JSON.stringify(withPayrollPractice({...payrollState(),bank},{
  ...payrollCase('P01'),paid_cents:407000,bank_transaction_id:'SALARY-FULL'})),before);
});
test('Cykl kadrowo-płacowy: odejście wymaga trzech dodatkowych projektów, nie udaje odprawy',()=>{
 let state=payrollState();
 state.bank=[{id:'SALARY-EXIT',date:'2026-01-31',amount_cents:-251000}];
 state=withPayrollPractice(state,{...payrollCase('P02'),bank_transaction_id:'SALARY-EXIT'});
 const before=payrollLifecycleChecklist(state,'P02');
 assert.equal(before.steps.find(x=>x.key==='exit').status,'pending');
 assert.equal(before.ready_for_training_review,false);
 const person=readPersonnelCases(state).P02;
 state=withPersonnelCase(state,{...person,document_drafts:Object.fromEntries(Object.keys(PERSONNEL_FLAGS).map(k=>[k,true]))});
 const after=payrollLifecycleChecklist(state,'P02');
 assert.equal(after.steps.find(x=>x.key==='exit').status,'marked_by_student');
 assert.equal(after.ready_for_training_review,true);
 assert.equal(after.actual_documents,'not_verified');
 assert.equal(after.real_bank,'not_verified');
});
test('Cykl kadrowo-płacowy: zmieniona umowa odbiera zgodność płac i banku',()=>{
 const s=withPayrollPractice(payrollState(),payrollCase('P01'));
 const state=withPersonnelCase(s,{...readPersonnelCases(s).P01,monthly_gross_cents:530000});
 const before=JSON.stringify(state),result=payrollLifecycleChecklist(state,'P01');
 assert.equal(result.steps.find(x=>x.key==='payroll').status,'stale');
 assert.equal(result.steps.find(x=>x.key==='bank').status,'blocked');
 assert.equal(result.steps.find(x=>x.key==='settlement').status,'blocked');
 assert.equal(result.ready_for_training_review,false);
 assert.equal(JSON.stringify(state),before);
});

test('Płace do dziennika: szkic naliczenia nie księguje automatycznie',()=>{
 const s=withPayrollPractice(payrollState(),payrollCase('P01')),before=JSON.stringify(s);
 const d=payrollJournalDraft(s,'P01','accrual','J-PAY-ACCRUAL');
 assert.equal(d.status,'draft');assert.equal(d.source_type,'manual');assert.equal(d.date,'2026-01-31');
 assert.deepEqual(d.payroll_ref,{employee_id:'P01',period:'2026-01',stage:'accrual'});
 assert.equal(d.lines.reduce((n,l)=>n+l.debit-l.credit,0),0);
 assert.equal(d.lines.find(l=>l.account==='404').debit,520000);
 assert.equal(d.lines.find(l=>l.account==='231').credit,407000);
 assert.equal(JSON.stringify(s),before);
 assert.throws(()=>payrollJournalDraft({...s,journals:[{...d,status:'posted'}]},'P01','accrual','J2'),/już zaksięgowano/);
});
test('Płace do dziennika: wypłata z CSV nie tworzy drugiego kosztu, storno odblokowuje',()=>{
 let s=payrollState();
 s.bank=[{id:'SALARY1',date:'2026-01-31',amount_cents:-300000,description:'Fikcyjna wypłata'}];
 s=withPayrollPractice(s,{...payrollCase(),bank_transaction_id:'SALARY1'});
 const d=payrollJournalDraft(s,'P01','payment','J-PAY-BANK');
 assert.equal(d.status,'draft');assert.equal(d.source_type,'bank');assert.equal(d.source_id,'SALARY1');
 assert.deepEqual(d.lines,[{account:'231',debit:300000,credit:0},{account:'130',debit:0,credit:300000}]);
 assert.equal(d.lines.some(l=>l.account==='404'),false);
 const posted={...d,status:'posted'};
 assert.equal(balanceReport({...s,journals:[posted]}).ledgerBank,-300000);
 assert.throws(()=>payrollJournalDraft({...s,journals:[posted]},'P01','payment','J2'),/już zaksięgowano/);
 const reversed={id:'REV',status:'posted',date:'2026-01-31',source_type:'manual',source_id:'',
  reversal_of:posted.id,lines:posted.lines.map(l=>({account:l.account,debit:l.credit,credit:l.debit}))};
 assert.equal(payrollJournalDraft({...s,journals:[posted,reversed]},'P01','payment','J3').status,'draft');
 assert.throws(()=>payrollJournalDraft({...s,bank:[]},'P01','payment','J4'),/wymaga fikcyjnego CSV/);
});
test('Płace do dziennika: nieznany pracownik, etap i identyfikator są odrzucane',()=>{
 const s=withPayrollPractice(payrollState(),payrollCase());
 assert.throws(()=>payrollJournalDraft(s,'P03','accrual','J1'));
 assert.throws(()=>payrollJournalDraft(s,'P01','tax','J1'));
 assert.throws(()=>payrollJournalDraft(s,'P01','accrual','nie poprawne id'));
});

import {inspectPayrollLedger} from '../src/accounting/payroll-ledger-audit.js';

test('Integracja płac: poprawne naliczenie w dzienniku ma 0 dodatkowych błędów',()=>{
  const s=withPayrollPractice(payrollState(),payrollCase());
  const draft=payrollJournalDraft(s,'P01','accrual','ACCRUAL-1');
  const changed={...s,journals:[{...draft,status:'posted'}]};
  const snapshot=JSON.stringify(changed);
  assert.deepEqual(inspectPayrollLedger(changed),[]);
  assert.equal(JSON.stringify(changed),snapshot);
});
test('Integracja płac: zbilansowane, ale fałszywe potrącenie nie przechodzi kontroli',()=>{
  const s=withPayrollPractice(payrollState(),payrollCase());
  const draft=payrollJournalDraft(s,'P01','accrual','ACCRUAL-1');
  const wrong={...draft,status:'posted',lines:draft.lines.map(x=>({...x}))};
  wrong.lines.find(x=>x.account==='404').debit+=100;
  wrong.lines.find(x=>x.account==='231').credit+=100;
  const issues=inspectPayrollLedger({...s,journals:[wrong]});
  assert.ok(issues.some(x=>x.code==='payroll_ledger_mismatch'));
});
test('Integracja płac: niewłaściwy miesiąc i podwójne naliczenie są wykrywane',()=>{
  const s=withPayrollPractice(payrollState(),payrollCase());
  const draft=payrollJournalDraft(s,'P01','accrual','ACCRUAL-1');
  const posted={...draft,status:'posted'};
  const duplicate={...posted,id:'ACCRUAL-2'};
  const changed={...s,journals:[posted,duplicate]};
  assert.ok(inspectPayrollLedger(changed).some(x=>x.code==='payroll_ledger_duplicate'));
  const stale={...s,journals:[{...posted,payroll_ref:{...posted.payroll_ref,period:'2025-12'}}]};
  assert.ok(inspectPayrollLedger(stale).some(x=>x.code==='payroll_ledger_stale'));
  assert.deepEqual(inspectPayrollLedger({...s,journals:[{...posted,payroll_ref:null}]}).map(x=>x.code),['payroll_ref_invalid']);
});
test('Integracja płac: sam przelew nie zalicza naliczenia; poprawna para przechodzi',()=>{
  let s=payrollState();
  s={...s,bank:[{id:'SALARY1',date:'2026-01-31',amount_cents:-300000,description:'Fikcyjny przelew'}]};
  s=withPayrollPractice(s,{...payrollCase(),bank_transaction_id:'SALARY1'});
  const accrual={...payrollJournalDraft(s,'P01','accrual','ACCRUAL-1'),status:'posted'};
  const payment={...payrollJournalDraft(s,'P01','payment','PAYMENT-1'),status:'posted'};
  assert.ok(inspectPayrollLedger({...s,journals:[payment]}).some(x=>x.code==='payroll_payment_before_accrual'));
  const both={...s,journals:[accrual,payment]};
  assert.deepEqual(inspectPayrollLedger(both),[]);
  assert.equal(inspect(both).some(x=>['payroll_ledger_mismatch','payroll_payment_before_accrual'].includes(x.code)),false);
  assert.ok(inspectPayrollLedger({...s,journals:[accrual,{...payment,source_id:'OTHER'}]})
    .some(x=>x.code==='payroll_ledger_mismatch'));
});
test('Integracja płac: storno nie tworzy fałszywego duplikatu',()=>{
  const s=withPayrollPractice(payrollState(),payrollCase());
  const posted={...payrollJournalDraft(s,'P01','accrual','ACCRUAL-1'),status:'posted'};
  const reversed={id:'REV-1',status:'posted',date:posted.date,source_type:'manual',source_id:'',
    reversal_of:posted.id,lines:posted.lines.map(l=>({account:l.account,debit:l.credit,credit:l.debit}))};
  assert.deepEqual(inspectPayrollLedger({...s,journals:[posted,reversed]}),[]);
});


import {auditCompanyLifecycle} from '../src/accounting/lifecycle-audit.js';

test('Ścieżka firmy: pusty stan nie udaje ukończenia',()=>{
 const r=auditCompanyLifecycle(EMPTY(),null);
 assert.equal(r.steps.length,7);
 assert.equal(r.finished_training_stages,0);
 assert.equal(r.completed,false);
 assert.equal(r.integrated_full_cycle,'not_tested');
 assert.equal(r.steps.at(-1).status,'not_implemented');
});
test('Ścieżka: faktury i bank rozpoznane, ale bez kadr i majątku nie ma pełnego cyklu',()=>{
 const s=fullScenario(),r=auditCompanyLifecycle(s,null);
 assert.equal(r.steps.find(x=>x.key==='invoices').status,'passed_training');
 assert.equal(r.steps.find(x=>x.key==='bank').status,'passed_training');
 assert.equal(r.steps.find(x=>x.key==='payroll').status,'needs_work');
 assert.equal(r.steps.find(x=>x.key==='asset').status,'needs_work');
 assert.equal(r.completed,false);
});
test('Ścieżka: trzeci wiersz CSV bez własnego dekretu blokuje etap bankowy',()=>{
 const s=fullScenario();
 s.bank.push({id:'EXTRA-ROW',date:'2026-11-20',amount_cents:5000,description:'Fikcyjny wpływ bez dekretu'});
 const before=JSON.stringify(s),r=auditCompanyLifecycle(s);
 assert.equal(r.steps.find(x=>x.key==='invoices').status,'passed_training');
 assert.equal(r.steps.find(x=>x.key==='bank').status,'needs_work');
 assert.equal(JSON.stringify(s),before);
});
test('Ścieżka: ręczny dekret konta 130 bez wiersza CSV blokuje zaliczenie banku',()=>{
 const s=fullScenario();
 s.journals.push({id:'MANUAL-130',date:'2026-11-20',status:'posted',source_type:'manual',source_id:'',
  lines:[{account:'130',debit:500,credit:0},{account:'800',debit:0,credit:500}]});
 assert.equal(auditCompanyLifecycle(s).steps.find(x=>x.key==='bank').status,'needs_work');
});
test('Ścieżka: dekret CSV z obcego miesiąca nie zalicza banku',()=>{
 const s=fullScenario();s.journals.find(j=>j.id==='jb1').date='2026-10-02';
 const r=auditCompanyLifecycle(s);
 assert.equal(r.steps.find(x=>x.key==='invoices').status,'passed_training');
 assert.equal(r.steps.find(x=>x.key==='bank').status,'needs_work');
});
test('Ścieżka: sam poprawny przelew bez dekretu banku nie wystarcza',()=>{
 const s=fullScenario();s.journals=s.journals.filter(j=>j.source_type!=='bank');
 const r=auditCompanyLifecycle(s,null);
 assert.equal(r.steps.find(x=>x.key==='invoices').status,'passed_training');
 assert.equal(r.steps.find(x=>x.key==='bank').status,'needs_work');
});
test('Ścieżka: zasymulowane dokumenty D01-D36 bez wzorca księgowań nie dostają zaliczenia',()=>{
 const r=auditCompanyLifecycle(fullScenario(),fakeManifest);
 assert.equal(r.steps.find(x=>x.key==='month').status,'needs_work');
 assert.equal(r.steps.at(-1).status,'not_implemented');
 assert.equal(r.real_two_account_e2e,'not_tested');
});


test('Ścieżka: zbilansowane, ale błędne konto banku nie zalicza rozrachunków',()=>{
 const s=fullScenario();
 s.journals.find(j=>j.id==='jb1').lines[1].account='700';
 const r=auditCompanyLifecycle(s,null);
 assert.equal(r.steps.find(x=>x.key==='bank').status,'needs_work');
 assert.equal(r.completed,false);
});

test('Jeden okres: sprzedaż i zakup z różnych miesięcy nie zaliczają faktur',()=>{
 const s=fullScenario();
 s.invoices[0].date='2026-10-01';
 const r=auditCompanyLifecycle(s,null);
 assert.equal(r.period_scope.month,'2026-11');
 assert.deepEqual(r.period_scope.seen_invoice_months,['2026-10','2026-11']);
 assert.equal(r.steps.find(x=>x.key==='invoices').status,'needs_work');
 assert.equal(r.steps.find(x=>x.key==='bank').status,'needs_work');
});
test('Jeden okres: prawidłowy dekret przelewu z innego miesiąca nie zalicza banku',()=>{
 const s=fullScenario();
 s.bank[0].date='2026-12-05';
 const r=auditCompanyLifecycle(s,null);
 assert.equal(r.period_scope.month,'2026-11');
 assert.equal(r.steps.find(x=>x.key==='invoices').status,'passed_training');
 assert.equal(r.steps.find(x=>x.key==='bank').status,'needs_work');
});
test('Jeden okres: obie faktury przesunięte na grudzień wymagają grudniowych przelewów',()=>{
 const s=fullScenario();
 for(const invoice of s.invoices)invoice.date='2026-12-01';
 // Przeniesienie okresu wymaga również dekretów faktur z grudnia.
 for(const entry of s.journals.filter(j=>j.source_type==='invoice'))entry.date='2026-12-01';
 const r=auditCompanyLifecycle(s,null);
 assert.equal(r.period_scope.month,'2026-12');
 assert.equal(r.steps.find(x=>x.key==='invoices').status,'passed_training');
 assert.equal(r.steps.find(x=>x.key==='bank').status,'needs_work');
});
test('Jeden okres: dodatkowe faktury późniejszego miesiąca rozpoczynają nowy okres',()=>{
 const s=fullScenario();
 s.invoices.push({...s.invoices[0],id:'new-period',number:'CW/FV/12',date:'2026-12-01'});
 const r=auditCompanyLifecycle(s,null);
 assert.equal(r.period_scope.month,'2026-12');
 assert.equal(r.steps.find(x=>x.key==='invoices').status,'needs_work');
 assert.equal(r.finished_training_stages,0);
 assert.equal(r.integrated_full_cycle,'not_tested');
});


import {taxCloseTrainingAudit} from '../src/accounting/tax-close-training.js';
import {inspectScenarioInvoiceBridge,withScenarioInvoiceLink} from '../src/accounting/scenario-invoice-bridge.js';
test('Zamknięcie szkoleniowe: sumy VAT z istniejącego miesiąca, bez wysyłki KSeF/JPK/UPO',()=>{
 const state=fullScenario();
 for(const j of state.journals.filter(x=>x.source_type==='bank'))j.date=state.bank.find(b=>b.id===j.source_id).date;
 const before=JSON.stringify(state),r=taxCloseTrainingAudit(state);
 assert.equal(r.period,'2026-11');
 assert.equal(r.figures.sale_vat_cents,23000);
 assert.equal(r.figures.purchase_vat_cents,4600);
 assert.equal(r.figures.vat_difference_cents,18400);
 assert.equal(r.figures.bank_statement_cents,98400);
 assert.equal(r.figures.bank_ledger_cents,98400);
 assert.equal(r.checks.find(x=>x.key==='invoice_posting').passed,true);
 assert.equal(r.checks.find(x=>x.key==='bank').passed,true);
 assert.equal(r.checks.find(x=>x.key==='payroll_assets').passed,false);
 assert.equal(r.ready_for_training_review,false);
 assert.equal(r.draft_documents.ksef.status,'NOT_SENT_TRAINING_REFERENCE_ONLY');
 assert.equal(r.draft_documents.jpk.status,'NOT_GENERATED_NOT_SCHEMA_VALIDATED');
 assert.equal(r.draft_documents.upo.status,'NOT_ISSUED');
 assert.equal(r.completed,false);
 assert.equal(JSON.stringify(state),before);
});
test('Zamknięcie szkoleniowe nie zalicza faktury bez księgowania lub innego miesiąca',()=>{
 const s=fullScenario();
 s.journals=s.journals.filter(j=>j.source_id!==s.invoices[0].id);
 assert.equal(taxCloseTrainingAudit(s).checks.find(x=>x.key==='invoice_posting').passed,false);
 const other=fullScenario();other.bank[0].date='2026-12-01';
 assert.equal(taxCloseTrainingAudit(other).checks.find(x=>x.key==='bank').passed,false);
 assert.equal(taxCloseTrainingAudit(other).ready_for_training_review,false);
});
test('Zamknięcie szkoleniowe wykrywa zbilansowany, ale niewłaściwy dekret i niezbilansowanie',()=>{
 const s=fullScenario();s.journals.find(j=>j.source_type==='invoice'&&j.source_id==='sale').lines[1].account='800';
 const r=taxCloseTrainingAudit(s);
 assert.equal(r.checks.find(x=>x.key==='invoice_posting').passed,false);
 const bad=fullScenario();bad.journals[0].lines[0].debit++;
 assert.equal(taxCloseTrainingAudit(bad).checks.find(x=>x.key==='ledger').passed,false);
});
test('Puste ćwiczenie nie generuje fałszywego UPO, wyniku podatkowego ani ukończenia',()=>{
 const r=taxCloseTrainingAudit(EMPTY());
 assert.equal(r.source_count,0);
 assert.equal(r.period,null);
 assert.equal(r.ready_for_training_review,false);
 assert.equal(r.completed,false);
 assert.equal(r.legal_review,'not_tested');
 assert.equal(r.authorized_e2e,'not_tested');
 assert.equal(r.draft_documents.upo.status,'NOT_ISSUED');
});


import {acquisitionLines as assetAcquisitionLines} from '../src/accounting/assets-core.js';
test('Zakup środka trwałego: zgodny dekret 010/221/202 jest technicznie rozpoznany bez zatwierdzenia VAT',()=>{
 const s=fullScenario(),invoice=s.invoices.find(i=>i.kind==='purchase');
 const asset={id:'A1',inventory_no:'CW/INW/1',name:'Fikcyjna maszyna',category:'machine',
  invoice_id:invoice.id,in_service_date:'2026-11-02',start_month:'2026-11',months:12,
  residual_cents:0,deductible_bps:10000,status:'active'};
 s.assets=[asset];
 const posting=s.journals.find(j=>j.source_type==='invoice'&&j.source_id===invoice.id);
 posting.lines=assetAcquisitionLines(asset,s);
 posting.asset_id=asset.id;posting.asset_action='acquire';
 for(const j of s.journals.filter(x=>x.source_type==='bank'))j.date=s.bank.find(b=>b.id===j.source_id).date;
 const r=taxCloseTrainingAudit(s);
 assert.equal(r.issues.length,0);
 assert.equal(r.checks.find(x=>x.key==='invoice_posting').passed,true);
 assert.ok(r.review_notes.some(x=>x.includes('010/221/202')));
 assert.equal(r.figures.purchase_vat_cents,4600);
 assert.equal(r.legal_review,'not_tested');
 assert.equal(r.draft_documents.jpk.status,'NOT_GENERATED_NOT_SCHEMA_VALIDATED');
 assert.equal(r.completed,false);
});
test('Zakup środka trwałego z błędnym kontem nie dostaje szkoleniowego zaliczenia',()=>{
 const s=fullScenario(),invoice=s.invoices.find(i=>i.kind==='purchase');
 const asset={id:'A1',inventory_no:'CW/INW/1',name:'Fikcyjna maszyna',category:'machine',
  invoice_id:invoice.id,in_service_date:'2026-11-02',start_month:'2026-11',months:12,
  residual_cents:0,deductible_bps:10000,status:'active'};
 s.assets=[asset];
 const j=s.journals.find(j=>j.source_type==='invoice'&&j.source_id===invoice.id);
 j.lines=assetAcquisitionLines(asset,s);j.lines[0].account='400';j.asset_id=asset.id;j.asset_action='acquire';
 const r=taxCloseTrainingAudit(s);
 assert.equal(r.checks.find(x=>x.key==='invoice_posting').passed,false);
 assert.ok(r.issues.some(x=>x.code==='asset_acquisition_posting_mismatch'));
});


import {taxCloseTrainingReportHTML} from '../src/accounting/tax-close-training.js';
test('Lokalny raport kontrolny do recenzji zawiera kwoty i jawne NIE WYSŁANO',()=>{
 const s=fullScenario(),html=taxCloseTrainingReportHTML(s);
 assert.match(html,/BRAK WYSYŁKI URZĘDOWEJ/);
 assert.match(html,/184,00 PLN/);
 assert.match(html,/KSeF: NIE WYSŁANO/);
 assert.match(html,/JPK: NIE WYGENEROWANO/);
 assert.match(html,/UPO: NIE WYDANO/);
 assert.match(html,/Odbiór eksperta: NIE PRZEPROWADZONO/);
 assert.ok(!html.includes('<form'));
});
test('Lokalny raport nie wykonuje HTML z nieprawidłowej faktury i nie mutuje danych',()=>{
 const s=fullScenario();
 s.invoices[0].number='<script>alert(1)</script>';
 s.journals=s.journals.filter(j=>j.source_id!==s.invoices[0].id);
 const before=JSON.stringify(s),html=taxCloseTrainingReportHTML(s);
 assert.ok(!html.includes('<script>alert(1)</script>'));
 assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
 assert.equal(JSON.stringify(s),before);
});


test('Ścieżka życia firmy rozpoznaje prawidłowe przyjęcie majątku zamiast zwykłego kosztu',()=>{
 const s=fullScenario(),invoice=s.invoices.find(i=>i.kind==='purchase');
 const card={id:'LIFE-A1',inventory_no:'CW/INW/11',name:'Maszyna fikcyjna',category:'machine',
  invoice_id:invoice.id,in_service_date:'2026-11-02',start_month:'2026-11',
  months:12,residual_cents:0,deductible_bps:10000,status:'active'};
 s.assets=[card];
 const j=s.journals.find(j=>j.source_type==='invoice'&&j.source_id===invoice.id);
 j.lines=assetAcquisitionLines(card,s);j.asset_action='acquire';j.asset_id=card.id;
 const before=JSON.stringify(s),audit=auditCompanyLifecycle(s,null);
 assert.equal(audit.steps.find(x=>x.key==='invoices').status,'passed_training');
 assert.equal(audit.steps.find(x=>x.key==='asset').status,'needs_work');
 assert.equal(audit.steps.at(-1).status,'not_implemented');
 assert.equal(audit.completed,false);
 assert.equal(JSON.stringify(s),before);
});
test('Ścieżka firmy nie zalicza zakupionego środka trwałego z błędnym kontem',()=>{
 const s=fullScenario(),invoice=s.invoices.find(i=>i.kind==='purchase');
 const card={id:'LIFE-A1',inventory_no:'CW/INW/11',name:'Maszyna fikcyjna',category:'machine',
  invoice_id:invoice.id,in_service_date:'2026-11-02',start_month:'2026-11',
  months:12,residual_cents:0,deductible_bps:10000,status:'active'};
 s.assets=[card];
 const j=s.journals.find(j=>j.source_type==='invoice'&&j.source_id===invoice.id);
 j.lines=assetAcquisitionLines(card,s);j.asset_action='acquire';j.asset_id=card.id;
 j.lines[0].account='400';
 assert.equal(auditCompanyLifecycle(s,null).steps.find(x=>x.key==='invoices').status,'needs_work');
});

test('Kontrola CSV: każdy wyciąg ma własny aktywny dekret bankowy (bez danych prawdziwych)',()=>{
 const s=fullScenario();
 for(const j of s.journals.filter(j=>j.source_type==='bank'))j.date=s.bank.find(b=>b.id===j.source_id).date;
 const before=JSON.stringify(s),r=taxCloseTrainingAudit(s);
 assert.equal(r.checks.find(x=>x.key==='bank').passed,true);
 assert.equal(r.checks.find(x=>x.key==='bank_sources').passed,true);
 assert.equal(r.issues.filter(x=>x.code.startsWith('bank_')).length,0);
 assert.equal(r.ready_for_training_review,false,'Kadry i majątek nadal wymagają przebiegu');
 assert.equal(JSON.stringify(s),before);
});
test('Kontrola CSV: ręczny dekret 130 nie maskuje braku księgowania wiersza wyciągu',()=>{
 const s=fullScenario();
 for(const j of s.journals.filter(j=>j.source_type==='bank'))j.date=s.bank.find(b=>b.id===j.source_id).date;
 s.bank.push({id:'EXTRA-CSV',date:'2026-11-18',amount_cents:500});
 s.journals.push({id:'MANUAL-MASK',date:'2026-11-18',status:'posted',source_type:'manual',source_id:'',
  lines:[{account:'130',debit:500,credit:0},{account:'800',debit:0,credit:500}]});
 const r=taxCloseTrainingAudit(s);
 assert.equal(r.checks.find(x=>x.key==='bank').passed,true,'Zwykła suma maskuje brak');
 assert.equal(r.checks.find(x=>x.key==='bank_sources').passed,false);
 assert.ok(r.issues.some(x=>x.code==='bank_row_missing_or_duplicate_posting'&&x.invoice==='EXTRA-CSV'));
 assert.ok(r.issues.some(x=>x.code==='bank_ledger_entry_without_period_csv'&&x.invoice==='MANUAL-MASK'));
 assert.equal(r.checks.find(x=>x.key==='invoice_posting').passed,true,
  'Błędy CSV nie są mylone z kontrolą samych faktur');
 assert.equal(r.ready_for_training_review,false);
});
test('Kontrola CSV: błędna data, duplikat, kwota i storno nie przechodzą',()=>{
 const s=fullScenario();
 for(const j of s.journals.filter(j=>j.source_type==='bank'))j.date=s.bank.find(b=>b.id===j.source_id).date;
 const wrongDate=structuredClone(s);wrongDate.journals.find(j=>j.id==='jb1').date='2026-12-01';
 assert.equal(taxCloseTrainingAudit(wrongDate).checks.find(c=>c.key==='bank_sources').passed,false);
 const wrongAmount=structuredClone(s);
 wrongAmount.journals.find(j=>j.id==='jb1').lines[0].debit+=1;
 wrongAmount.journals.find(j=>j.id==='jb1').lines[1].credit+=1;
 assert.ok(taxCloseTrainingAudit(wrongAmount).issues.some(x=>x.code==='bank_source_amount_or_period_mismatch'));
 const duplicate=structuredClone(s);duplicate.journals.push({...duplicate.journals.find(j=>j.id==='jb1'),id:'jb1-again'});
 assert.ok(taxCloseTrainingAudit(duplicate).issues.some(x=>x.code==='bank_row_missing_or_duplicate_posting'));
 const reversed=structuredClone(s),orig=reversed.journals.find(j=>j.id==='jb1');
 reversed.journals.push({...reverseJournal(orig,'2026-11-25'),id:'REV-JB1'});
 assert.equal(taxCloseTrainingAudit(reversed).checks.find(c=>c.key==='bank_sources').passed,false);
});

test('Wynik i płynność w jednej firmie to odrębne wielkości z tego samego miesiąca',()=>{
 const s=fullScenario();
 for(const j of s.journals.filter(j=>j.source_type==='bank'))j.date=s.bank.find(b=>b.id===j.source_id).date;
 const before=JSON.stringify(s),r=taxCloseTrainingAudit(s),f=r.training_result;
 assert.equal(f.revenue_cents,100000);assert.equal(f.expense_cents,20000);
 assert.equal(f.profit_or_loss_cents,80000);assert.equal(f.result_label,'zysk modelowy');
 assert.equal(f.bank_inflow_cents,123000);assert.equal(f.bank_outflow_cents,24600);
 assert.equal(f.bank_net_movement_cents,98400);
 assert.notEqual(f.profit_or_loss_cents,f.bank_net_movement_cents);
 assert.equal(f.status,'source_reconciled_training');
 assert.equal(r.completed,false);assert.equal(JSON.stringify(s),before);
});
test('Koszt bez zapłaty może dać stratę, a CSV nadal pokazuje dodatni przepływ banku',()=>{
 const s=fullScenario();
 for(const j of s.journals.filter(j=>j.source_type==='bank'))j.date=s.bank.find(b=>b.id===j.source_id).date;
 s.journals.push({id:'EXPENSE-NOV',date:'2026-11-15',source_type:'manual',source_id:'',status:'posted',
  lines:[{account:'400',debit:200000,credit:0},{account:'202',debit:0,credit:200000}]});
 const r=taxCloseTrainingAudit(s),f=r.training_result;
 assert.equal(f.result_label,'strata modelowa');assert.equal(f.profit_or_loss_cents,-120000);
 assert.equal(f.bank_net_movement_cents,98400);assert.equal(r.completed,false);
 const html=taxCloseTrainingReportHTML(s);
 assert.match(html,/strata modelowa/);assert.match(html,/1.*200,00 PLN|1.*200,00/);
 assert.match(html,/nie jest przepływem gotówki/);
});
test('Wynik miesięczny nie miesza kosztów z poprzedniego okresu ani nie deklaruje podatku',()=>{
 const s=fullScenario();
 for(const j of s.journals.filter(j=>j.source_type==='bank'))j.date=s.bank.find(b=>b.id===j.source_id).date;
 s.journals.push({id:'EXPENSE-OCT',date:'2026-10-31',source_type:'manual',source_id:'',status:'posted',
  lines:[{account:'400',debit:999999,credit:0},{account:'202',debit:0,credit:999999}]});
 const f=taxCloseTrainingAudit(s).training_result;
 assert.equal(f.profit_or_loss_cents,80000);
 assert.equal(f.status,'source_reconciled_training');
 assert.match(f.explanation,/NIE jest saldo otwarcia ani dochód podatkowy/);
 const html=taxCloseTrainingReportHTML(s);
 assert.match(html,/To nie jest JPK|TO NIE JEST JPK/);
});

import {planAcquisition as lifecycleAcquire,planDepreciation as lifecycleDepreciate,
 planSale as lifecycleSell} from '../src/accounting/assets-core.js';

/** Jedna fikcyjna firma, jeden miesiąc: źródłowe dokumenty, CSV, kadry,
 * płace, majątek, sprzedaż środka, bilans i 36 odrębnych ćwiczeń.
 * Nic nie trafia do Supabase; brak stawek prawnych, KSeF/JPK/UPO i logowania.
 */
function fictionalFullCompanyMonth(){
 const {manifest,state:practice}=completeIntegratedFixture();
 let s=payrollState();
 s.company={schema_version:1,status:'ready',fictional:true,entity_type:'jdg',
  record_system:'books',vat_status:'active',
  identity:{legal_name:'Fikcyjna Firma do Testów',nip:'9000000016',regon:'',
   krs:'',address:'ul. Przykładowa 1, 00-001 Testowo',country:'PL'}};
 for(const id of ['P01','P02']){
  s=withPersonnelCase(s,{...readPersonnelCases(s)[id],
   document_drafts:Object.fromEntries(Object.keys(PERSONNEL_FLAGS).map(key=>[key,true]))});
 }
 const sale=invoiceTotals({...invoice('sale'),date:'2026-01-03',due:'2026-01-15'});
 const purchase=invoiceTotals({...invoice('purchase',20000),date:'2026-01-02',due:'2026-01-15'});
 const equipment=invoiceTotals({id:'equipment',kind:'purchase',status:'issued',
  number:'TEST/MACHINE/01',date:'2026-01-02',due:'2026-01-15',party:'Fikcyjny dostawca',
  seller:'Fikcyjna firma',lines:[{label:'Maszyna testowa',qty_milli:1000,
   unit_cents:1200000,tax_code:'23'}]});
 const sold=invoiceTotals({id:'machine-sale',kind:'sale',status:'issued',
  number:'TEST/MACHINE/SALE',date:'2026-01-31',due:'2026-02-14',party:'Fikcyjny klient',
  seller:'Fikcyjna firma',lines:[{label:'Sprzedaż TEST/MACHINE/A',qty_milli:1000,
   unit_cents:800000,tax_code:'23'}]});
 s.invoices=[sale,purchase,equipment,sold].map(i=>({...i,identity_version:1,
  own_identity:{...s.company.identity},
  counterparty_identity:{legal_name:'Fikcyjny kontrahent',nip:'9000000022',regon:'',
   krs:'',address:'ul. Fikcyjna 2, 00-002 Testowo',country:'PL'}}));
 const imported=parseBankCSV(BANK_TEMPLATE).rows.map((row,index)=>({...row,
  date:index===0?'2026-01-05':'2026-01-06'}));
 s.bank=[...imported,
  {id:'WAGE-A',date:'2026-01-31',amount_cents:-407000,description:'Fikcyjna pensja P01'},
  {id:'WAGE-B',date:'2026-01-31',amount_cents:-251000,description:'Fikcyjna pensja P02'}];
 s.matches=[{id:'M-SALE',invoice_id:sale.id,bank_id:imported[0].id,amount_cents:sale.gross_cents},
  {id:'M-PURCHASE',invoice_id:purchase.id,bank_id:imported[1].id,amount_cents:purchase.gross_cents}];
 s.journals=[sale,purchase,sold].map(i=>({
  id:'J-'+i.id,status:'posted',date:i.date,source_type:'invoice',
  source_id:i.id,lines:expectedInvoiceLines(i)}));
 s.journals.push({id:'J-B-IN',date:imported[0].date,status:'posted',source_type:'bank',
  source_id:imported[0].id,lines:[{account:'130',debit:123000,credit:0},
   {account:'201',debit:0,credit:123000}]},
  {id:'J-B-OUT',date:imported[1].date,status:'posted',source_type:'bank',
   source_id:imported[1].id,lines:[{account:'202',debit:24600,credit:0},
    {account:'130',debit:0,credit:24600}]});
 s=lifecycleAcquire(s,{id:'ASSET-A',inventory_no:'TEST/MACHINE/A',
  name:'Maszyna fikcyjna',category:'machine',invoice_id:equipment.id,
  in_service_date:'2026-01-03',start_month:'2026-01',
  months:12,residual_cents:0,deductible_bps:10000,status:'draft'},'J-ASSET-ACQUIRE').state;
 s=lifecycleDepreciate(s,'ASSET-A','J-ASSET-DEPR').state;
 s=lifecycleSell(s,'ASSET-A','machine-sale','2026-01-31','J-ASSET-SALE').state;
 for(const [id,bankId,paid] of [['P01','WAGE-A',407000],['P02','WAGE-B',251000]]){
  s=withPayrollPractice(s,{...payrollCase(id),paid_cents:paid,bank_transaction_id:bankId});
  const accrual=payrollJournalDraft(s,id,'accrual','J-'+id+'-ACCRUAL');
  s.journals.push({...accrual,status:'posted'});
  const payment=payrollJournalDraft(s,id,'payment','J-'+id+'-PAYMENT');
  s.journals.push({...payment,status:'posted'});
 }
 for(const [key,value] of Object.entries(practice))
  if(key.startsWith('simulator_'))s[key]=structuredClone(value);
 return {manifest,state:s};
}
test('PEŁNY PRZEKRÓJ FIKCYJNY: styczeń 2026 łączy dokumenty, CSV, dwie płace, odejście, aktywa, sprzedaż, bilans i D01-D36',()=>{
 const {manifest,state}=fictionalFullCompanyMonth(),before=JSON.stringify(state);
 const lifecycle=auditCompanyLifecycle(state,manifest);
 const byKey=Object.fromEntries(lifecycle.steps.map(x=>[x.key,x.status]));
 assert.deepEqual(Object.fromEntries(Object.entries(byKey).filter(([k])=>k!=='tax_and_close')),
  {company:'passed_training',invoices:'passed_training',bank:'passed_training',
   payroll:'passed_training',asset:'passed_training',month:'passed_training'});
 assert.equal(byKey.tax_and_close,'not_implemented','Nie udajemy KSeF/JPK/UPO');
 const tax=taxCloseTrainingAudit(state,manifest);
 assert.equal(tax.period,'2026-01');
 assert.equal(tax.ready_for_training_review,false,'D01-D36 nie ma jeszcze powiązania ze źródłem bankowym');
 assert.equal(tax.checks.find(x=>x.key==='scenario_bank_ledger').passed,false);
 assert.equal(tax.checks.find(x=>x.key==='bank_sources').passed,true);
 assert.equal(tax.checks.find(x=>x.key==='payroll_assets').passed,true);
 assert.equal(tax.training_result.result_label,'strata modelowa');
 assert.equal(tax.training_result.status,'source_reconciled_training');
 assert.equal(tax.completed,false);
 assert.equal(lifecycle.completed,false);
 assert.equal(lifecycle.integrated_full_cycle,'not_tested');
 assert.equal(tax.authorized_e2e,'not_tested');
 assert.equal(JSON.stringify(state),before,'Audyt ma być odczytowy');
});

function fixtureWithTrainingBankSources(){
 const {manifest,state}=fictionalFullCompanyMonth(),parsed=parseBankCSV(scenarioBankCSV(manifest));
 assert.deepEqual(parsed.errors,[]);
 for(const row of parsed.rows){
  const n=Math.abs(row.amount_cents);
  state.bank.push(row);
  state.journals.push({id:'J-'+row.id+'-SOURCE',date:row.date,status:'posted',
   source_type:'bank',source_id:row.id,lines:row.amount_cents>0?
   [{account:'130',debit:n,credit:0},{account:'800',debit:0,credit:n}]:
   [{account:'800',debit:n,credit:0},{account:'130',debit:0,credit:n}]});
 }
 return {manifest,state,bankRows:parsed.rows};
}

function linkedScenarioInvoicesFixture(){
 const {manifest,state}=fixtureWithTrainingBankSources();
 const model=structuredClone(manifest);
 const spec=[['D04','purchase',900],['D05','purchase',1000],['D08','purchase',2000],
  ['D09','purchase',4000],['D13','sale',1600],['D15','sale',1400]];
 for(const [id,kind,amount] of spec){
  const d=model.documents.find(d=>d.id===id);
  Object.assign(d,{kind,amount_pln:amount});
 }
 return {manifest:model,state,spec};
}
test('MOST fakturowy D01-D36: sześć niezależnych źródeł uzgadnia faktury i dekrety',()=>{
 const {manifest,spec}=linkedScenarioInvoicesFixture();
 let state=linkedScenarioInvoicesFixture().state;
 const first=spec[0],d=manifest.documents.find(x=>x.id===first[0]);
 const issue=(id,kind,amount,date)=>invoiceTotals({id:'SCEN-'+id,kind,status:'issued',
  number:'TEST/SOURCE/'+id,date,due:date,party:'Fikcyjny kontrahent',seller:'Fikcyjna spółka',
  lines:[{label:'Model '+id,qty_milli:1000,unit_cents:amount*100,tax_code:'0'}]});
 const firstInvoice=issue(first[0],first[1],first[2],d.date);
 state.invoices.push(firstInvoice);
 const before=JSON.stringify(state);
 state=withScenarioInvoiceLink(state,manifest,first[0],firstInvoice.id);
 assert.equal(JSON.stringify(state.invoices),JSON.stringify(JSON.parse(before).invoices),'Powiązanie nie zmienia faktur');
 assert.equal(inspectScenarioInvoiceBridge(state,manifest,'2026-01').matched,0,'Bez dekretu nie zalicza');
 state.journals.push({id:'SOURCE-'+first[0],status:'posted',date:d.date,
  source_type:'invoice',source_id:firstInvoice.id,lines:expectedInvoiceLines(firstInvoice)});
 assert.equal(inspectScenarioInvoiceBridge(state,manifest,'2026-01').matched,1);
 for(const [id,kind,amount] of spec.slice(1)){
  const doc=manifest.documents.find(x=>x.id===id),i=issue(id,kind,amount,doc.date);
  state.invoices.push(i);
  state.journals.push({id:'SOURCE-'+id,status:'posted',date:doc.date,
   source_type:'invoice',source_id:i.id,lines:expectedInvoiceLines(i)});
  state=withScenarioInvoiceLink(state,manifest,id,i.id);
 }
 const inspect=inspectScenarioInvoiceBridge(state,manifest,'2026-01');
 assert.equal(inspect.total,6);assert.equal(inspect.matched,6);
 assert.equal(inspect.passed,true);
 assert.equal(inspect.issues.length,0);
 const review=taxCloseTrainingAudit(state,manifest);
 assert.equal(review.checks.find(c=>c.key==='scenario_invoice_ledger').passed,true);
 assert.equal(review.scenario_invoice_bridge.matched,6);
 assert.equal(review.completed,false,'Nawet po źródłach KSeF/JPK/UPO nie są zakończone');
});
test('MOST fakturowy: duplikat, data, kwota, stornowany dekret i szkic są odrzucane',()=>{
 const {manifest,state:base,spec}=linkedScenarioInvoicesFixture();
 const [id,kind,amount]=spec[0],doc=manifest.documents.find(x=>x.id===id);
 const good=invoiceTotals({id:'A',kind,status:'issued',number:'FIK/A',date:doc.date,due:doc.date,
  party:'Fikcyjny kontrahent',seller:'Fikcyjna firma',
  lines:[{label:'Test',qty_milli:1000,unit_cents:amount*100,tax_code:'0'}]});
 const state={...base,invoices:[...base.invoices,good]};
 assert.throws(()=>withScenarioInvoiceLink(state,manifest,'D99',good.id));
 assert.throws(()=>withScenarioInvoiceLink({...state,invoices:[...base.invoices,{...good,date:'2026-01-31'}]},manifest,id,good.id));
 assert.throws(()=>withScenarioInvoiceLink({...state,invoices:[...base.invoices,{...good,gross_cents:1234}]},manifest,id,good.id));
 const link=withScenarioInvoiceLink(state,manifest,id,good.id);
 assert.equal(inspectScenarioInvoiceBridge(link,manifest,'2026-01').matched,0);
 const journal={id:'SOURCE-'+id,date:doc.date,status:'posted',source_type:'invoice',source_id:good.id,lines:expectedInvoiceLines(good)};
 const passed={...link,journals:[...base.journals,journal]};
 assert.equal(inspectScenarioInvoiceBridge(passed,manifest,'2026-01').matched,1);
 const draft={...passed,journals:[...base.journals,{...journal,status:'draft'}]};
 assert.equal(inspectScenarioInvoiceBridge(draft,manifest,'2026-01').matched,0);
 const reversed={...passed,journals:[...passed.journals,{id:'REV-SOURCE',date:doc.date,status:'posted',source_type:'manual',source_id:'',reversal_of:journal.id,
  lines:journal.lines.map(l=>({...l,debit:l.credit,credit:l.debit}))}]};
 assert.equal(inspectScenarioInvoiceBridge(reversed,manifest,'2026-01').matched,0);
 const duplicate={...passed,journals:[...passed.journals,{...journal,id:'DOUBLE'}]};
 assert.ok(inspectScenarioInvoiceBridge(duplicate,manifest,'2026-01').issues.some(x=>x.code==='scenario_invoice_posting_missing_duplicate_or_wrong_date'));
 const wrongAccount={...passed,journals:[...base.journals,{...journal,lines:[{account:'400',debit:amount*100,credit:0},{account:'201',debit:0,credit:amount*100}]}]};
 assert.equal(inspectScenarioInvoiceBridge(wrongAccount,manifest,'2026-01').matched,0);
});
test('MOST D01-D36: bankowy CSV z dokumentow jest importowalny i unikalny',()=>{
 const {manifest}=fictionalFullCompanyMonth(),csv=scenarioBankCSV(manifest);
 const parsed=parseBankCSV(csv);
 assert.deepEqual(parsed.errors,[]);
 assert.deepEqual(parsed.rows.map(x=>x.id),['D01','D03']);
 assert.equal(parsed.rows.length,2);
 const repeated=parseBankCSV(csv,parsed.rows);
 assert.equal(repeated.rows.length,0);
 assert.equal(repeated.skipped,2);
});
test('MOST D01-D36: osobne dekrety źródeł CSV umożliwiają TYLKO szkoleniową recenzję',()=>{
 const {manifest,state}=fixtureWithTrainingBankSources(),before=JSON.stringify(state);
 const r=taxCloseTrainingAudit(state,manifest);
 assert.equal(r.checks.find(c=>c.key==='scenario_bank_ledger').passed,true);
 assert.equal(r.scenario_bank_bridge.matched,2);
 assert.equal(r.ready_for_training_review,false,'Most bankowy nie oznacza jeszcze powiązania faktur Dxx');
 assert.equal(r.checks.find(c=>c.key==='scenario_invoice_ledger').passed,false);
 assert.equal(r.completed,false);
 assert.equal(r.draft_documents.upo.status,'NOT_ISSUED');
 assert.equal(JSON.stringify(state),before);
});
test('MOST D01-D36: brak CSV lub dekretu i podwójny dekret blokują weryfikację',()=>{
 const {manifest,state,bankRows}=fixtureWithTrainingBankSources();
 const missing=structuredClone(state);
 missing.bank=missing.bank.filter(b=>b.id!==bankRows[0].id);
 assert.ok(taxCloseTrainingAudit(missing,manifest).issues.some(x=>
  x.code==='scenario_bank_csv_missing_duplicate_or_mismatch'));
 const noPosting=structuredClone(state);
 noPosting.journals=noPosting.journals.filter(j=>j.source_id!==bankRows[0].id);
 assert.equal(taxCloseTrainingAudit(noPosting,manifest).checks.find(c=>c.key==='scenario_bank_ledger').passed,false);
 const twice=structuredClone(state),j=twice.journals.find(j=>j.source_id===bankRows[0].id);
 twice.journals.push({...j,id:'DOUBLE'});
 assert.ok(taxCloseTrainingAudit(twice,manifest).issues.some(x=>
  x.code==='scenario_bank_journal_missing_duplicate_or_period'));
});
test('MOST D01-D36: błędna kwota albo inna data nie przechodzą mimo równych sum',()=>{
 const {manifest,state,bankRows}=fixtureWithTrainingBankSources();
 const wrongAmount=structuredClone(state);
 wrongAmount.bank.find(b=>b.id===bankRows[0].id).amount_cents+=100;
 assert.equal(taxCloseTrainingAudit(wrongAmount,manifest).checks.find(c=>c.key==='scenario_bank_ledger').passed,false);
 const wrongDay=structuredClone(state);
 wrongDay.journals.find(j=>j.source_id===bankRows[0].id).date='2026-01-30';
 assert.equal(taxCloseTrainingAudit(wrongDay,manifest).checks.find(c=>c.key==='scenario_bank_ledger').passed,false);
});

test('PRZEKRÓJ: trzecia niezaksięgowana faktura nie może ukryć się za dwiema poprawnymi',()=>{
 const {manifest,state}=fictionalFullCompanyMonth();
 const extra=invoiceTotals({...invoice('sale',30000),id:'EXTRA-SALE',number:'CW/FV/EXTRA',date:'2026-01-17'});
 state.invoices.push({...extra,identity_version:1,own_identity:{...state.company.identity}});
 const before=JSON.stringify(state),life=auditCompanyLifecycle(state,manifest);
 assert.equal(life.steps.find(x=>x.key==='invoices').status,'needs_work');
 assert.equal(life.steps.find(x=>x.key==='bank').status,'needs_work');
 assert.equal(taxCloseTrainingAudit(state,manifest).checks.find(x=>x.key==='invoice_posting').passed,false);
 assert.equal(JSON.stringify(state),before);
});
test('PRZEKRÓJ: faktura i dekret w różnych miesiącach nie zaliczają dokumentów',()=>{
 const {manifest,state}=fictionalFullCompanyMonth();
 state.journals.find(j=>j.source_type==='invoice'&&j.source_id==='sale').date='2026-02-03';
 const life=auditCompanyLifecycle(state,manifest);
 assert.equal(life.steps.find(x=>x.key==='invoices').status,'needs_work');
 assert.equal(life.steps.find(x=>x.key==='bank').status,'needs_work');
 assert.equal(taxCloseTrainingAudit(state,manifest).checks.find(x=>x.key==='invoice_posting').passed,false);
});
test('PRZEKRÓJ: oddzielny styczeń D01-D36 nie zamyka faktur i biura z lutego',()=>{
 const {manifest,state}=fictionalFullCompanyMonth();
 assert.equal(auditMonthWorkflow(manifest,state).training_consistent,true);
 const wrong=structuredClone(state);
 wrong.invoices.find(i=>i.id==='sale').date='2026-02-03';
 const life=auditCompanyLifecycle(wrong,manifest);
 assert.equal(life.period_scope.month,'2026-02');
 assert.equal(life.steps.find(x=>x.key==='month').status,'needs_work');
 assert.equal(taxCloseTrainingAudit(wrong,manifest).checks.find(x=>x.key==='scenario_same_period').passed,false);
});
test('PRZEKRÓJ: usterka dekretu wypłaty blokuje gotowość, mimo poprawnego bilansu Wn/Ma',()=>{
 const {manifest,state}=fictionalFullCompanyMonth();
 const wrong=structuredClone(state);
 const bankEntry=wrong.journals.find(j=>j.id==='J-P01-PAYMENT');
 bankEntry.lines[0].account='202';
 const tax=taxCloseTrainingAudit(wrong,manifest),life=auditCompanyLifecycle(wrong,manifest);
 assert.equal(tax.checks.find(x=>x.key==='bank').passed,true,'Sama suma 130 nic nie wykrywa');
 assert.equal(tax.checks.find(x=>x.key==='payroll_assets').passed,false);
 assert.equal(tax.ready_for_training_review,false);
 assert.equal(life.steps.find(x=>x.key==='payroll').status,'needs_work');
});
test('PRZEKRÓJ: storno sprzedaży środka trwałego zatrzymuje cykl bez zmiany źródłowych danych',()=>{
 const {manifest,state}=fictionalFullCompanyMonth(),wrong=structuredClone(state);
 const entry=wrong.journals.find(j=>j.id==='J-ASSET-SALE');
 wrong.journals.push({id:'REV-ASSET-SALE',date:entry.date,status:'posted',
  reversal_of:entry.id,source_type:'manual',source_id:'',
  lines:entry.lines.map(l=>({account:l.account,debit:l.credit,credit:l.debit}))});
 const before=JSON.stringify(wrong),life=auditCompanyLifecycle(wrong,manifest),tax=taxCloseTrainingAudit(wrong,manifest);
 assert.equal(life.steps.find(x=>x.key==='asset').status,'needs_work');
 assert.equal(tax.checks.find(x=>x.key==='payroll_assets').passed,false);
 assert.equal(tax.ready_for_training_review,false);
 assert.equal(JSON.stringify(wrong),before);
});

test('Zamknięcie miesiąca wymaga zapisanej karty firmy, nie tylko udanych księgowań',()=>{
 const {manifest,state}=fictionalFullCompanyMonth(),withoutCompany=structuredClone(state);
 delete withoutCompany.company;
 const result=taxCloseTrainingAudit(withoutCompany,manifest);
 assert.equal(result.checks.find(c=>c.key==='company_opening').passed,false);
 assert.equal(result.ready_for_training_review,false);
 assert.equal(result.completed,false);
});
test('Przekrój: sama flaga ready nie potwierdza otwarcia, NIP i wyboru ewidencji/VAT',()=>{
 const {manifest,state}=fictionalFullCompanyMonth(),before=JSON.stringify(state);
 const variants=[
  {status:'ready',fictional:true},
  {...state.company,identity:{...state.company.identity,nip:'9000000017'}},
  {...state.company,record_system:'unconfirmed'},
  {...state.company,vat_status:'unconfirmed'}
 ];
 for(const company of variants){
  const broken={...state,company};
  const audit=auditCompanyLifecycle(broken,manifest);
  const report=taxCloseTrainingAudit(broken,manifest);
  assert.equal(audit.steps.find(x=>x.key==='company').status,'needs_work');
  assert.equal(report.checks.find(x=>x.key==='company_opening').passed,false);
  assert.equal(report.ready_for_training_review,false);
  assert.equal(report.completed,false);
 }
 assert.equal(JSON.stringify(state),before,'Odczytowa kontrola nie zmienia danych');
});
test('Jeden miesiąc: fikcyjny styczeń D01–D36 nie zalicza innego okresu biura',()=>{
 const {manifest,state}=fictionalFullCompanyMonth();
 const mismatch={...manifest,month:'2026-11'};
 const result=taxCloseTrainingAudit(state,mismatch);
 assert.equal(result.period,'2026-01');
 assert.equal(result.checks.find(c=>c.key==='scenario_same_period').passed,false);
 assert.equal(result.ready_for_training_review,false);
 assert.equal(result.draft_documents.upo.status,'NOT_ISSUED');
});
test('Scenariusz bez zapisanych odpowiedzi nie zastępuje pracy z 36 dowodami',()=>{
 const {manifest,state}=fictionalFullCompanyMonth(),withoutAttempts=structuredClone(state);
 for(const key of Object.keys(withoutAttempts))if(key.startsWith('simulator_'))delete withoutAttempts[key];
 const result=taxCloseTrainingAudit(withoutAttempts,manifest);
 assert.equal(result.checks.find(c=>c.key==='scenario_same_period').passed,false);
 assert.equal(result.ready_for_training_review,false);
});
test('Powiązanie firmy z dokumentami: obcy NIP we własnej migawce blokuje przegląd',()=>{
 const {manifest,state}=fictionalFullCompanyMonth(),copy=structuredClone(state);
 copy.invoices[0].own_identity.nip='9000000022';
 const review=taxCloseTrainingAudit(copy,manifest);
 assert.equal(review.checks.find(c=>c.key==='company_opening').passed,true);
 assert.equal(review.checks.find(c=>c.key==='company_invoice_identity').passed,false);
 assert.ok(review.issues.some(x=>x.code==='invoice_own_identity_mismatch'));
 assert.equal(review.ready_for_training_review,false);
 assert.equal(review.completed,false);
});
test('Powiązanie firmy z dokumentami: starsza faktura bez migawki pozostaje niezweryfikowana',()=>{
 const {manifest,state}=fictionalFullCompanyMonth(),copy=structuredClone(state);
 delete copy.invoices[0].identity_version;
 delete copy.invoices[0].own_identity;
 const review=taxCloseTrainingAudit(copy,manifest);
 assert.equal(review.checks.find(c=>c.key==='company_invoice_identity').passed,false);
 assert.match(review.checks.find(c=>c.key==='company_invoice_identity').detail,/bez zapisanej tożsamości: 1/);
 assert.equal(review.ready_for_training_review,false);
 assert.equal(review.completed,false);
});
test('Pełen fikcyjny cykl dopuszcza wyłącznie recenzję, nie zamknięcie urzędowe',()=>{
 const {manifest,state}=fictionalFullCompanyMonth(),before=JSON.stringify(state);
 const r=taxCloseTrainingAudit(state,manifest);
 assert.equal(r.checks.find(c=>c.key==='company_opening').passed,true);
 assert.equal(r.checks.find(c=>c.key==='scenario_same_period').passed,true);
 assert.equal(r.ready_for_training_review,false);
 assert.equal(r.checks.find(x=>x.key==='scenario_bank_ledger').passed,false);
 assert.equal(r.completed,false);
 assert.equal(r.draft_documents.ksef.status,'NOT_SENT_TRAINING_REFERENCE_ONLY');
 assert.equal(r.draft_documents.jpk.status,'NOT_GENERATED_NOT_SCHEMA_VALIDATED');
 assert.equal(r.draft_documents.upo.status,'NOT_ISSUED');
 assert.equal(JSON.stringify(state),before);
});

test('Kontrola rozliczenia wykrywa dwie faktury o tym samym identyfikatorze',()=>{
 const s=fullScenario(),first=s.invoices[0];s.invoices.push({...first,number:'FV/NOWA'});
 const r=taxCloseTrainingAudit(s);
 assert.equal(r.checks.find(x=>x.key==='source_identity').passed,false);
 assert.ok(r.issues.some(x=>x.code==='source_id_missing_or_duplicate'));
 assert.equal(r.source_inventory.length,3);
 assert.equal(r.ready_for_training_review,false);
});
test('Różni dostawcy mogą mieć powtarzające się numery faktur zakupowych',()=>{
 const s=fullScenario(),purchase=s.invoices.find(i=>i.kind==='purchase');
 s.invoices.push({...purchase,id:'OTHER-PURCHASE',party:'Inny fikcyjny dostawca'});
 const r=taxCloseTrainingAudit(s);
 assert.equal(r.checks.find(x=>x.key==='source_identity').passed,true);
 assert.equal(r.source_inventory.length,3);
 assert.equal(r.checks.find(x=>x.key==='invoice_posting').passed,false);
});
test('Raport do recenzji pokazuje identyfikowalne faktury i koduje niebezpieczny HTML',()=>{
 const s=fullScenario();s.invoices[0].number='<script>oops</script>';
 const r=taxCloseTrainingAudit(s),html=taxCloseTrainingReportHTML(s);
 assert.equal(r.source_inventory.length,2);
 assert.match(html,/Wykaz źródłowych faktur/);
 assert.match(html,/&lt;script&gt;oops&lt;\/script&gt;/);
 assert.ok(!html.includes('<script>'));
 assert.match(html,/Dekrety/);
 assert.match(html,/NIE WYSŁANO/);
});

test('VAT w jednym okresie: źródło faktur musi odpowiadać kontom 221 i 222',()=>{
 const s=fullScenario();
 for(const j of s.journals.filter(j=>j.source_type==='bank'))j.date=s.bank.find(b=>b.id===j.source_id).date;
 const result=taxCloseTrainingAudit(s);
 assert.equal(result.vat_ledger.sales_cents,23000);
 assert.equal(result.vat_ledger.purchases_cents,4600);
 assert.equal(result.vat_ledger.matching,true);
 assert.equal(result.checks.find(x=>x.key==='vat_model_vs_ledger').passed,true);
 assert.equal(result.vat_ledger.review,'not_tested');
});
test('Nadmiarowy VAT 222 nie może być ukryty przez zbilansowany dekret',()=>{
 const s=fullScenario();s.journals.push({id:'MANUAL-VAT',date:'2026-11-20',status:'posted',source_type:'manual',source_id:'',
 lines:[{account:'400',debit:500,credit:0},{account:'222',debit:0,credit:500}]});
 const r=taxCloseTrainingAudit(s);
 assert.equal(r.checks.find(x=>x.key==='ledger').passed,true);
 assert.equal(r.checks.find(x=>x.key==='vat_model_vs_ledger').passed,false);
 assert.ok(r.issues.some(x=>x.code==='model_vat_ledger_does_not_match_invoices'));
 assert.equal(r.ready_for_training_review,false);
});
test('VAT z obcego okresu nie zmienia bieżącej zgodności źródeł z dziennikiem',()=>{
 const s=fullScenario();s.journals.push({id:'OCT-VAT',date:'2026-10-10',status:'posted',source_type:'manual',source_id:'',
 lines:[{account:'221',debit:700,credit:0},{account:'202',debit:0,credit:700}]});
 const r=taxCloseTrainingAudit(s);
 assert.equal(r.vat_ledger.matching,true);
 assert.equal(r.issues.some(x=>x.code==='model_vat_ledger_does_not_match_invoices'),false);
});

test('Zamknięcie nie akceptuje 31 listopada w fakturze pomimo poprawnego prefiksu RRRR-MM',()=>{
 const s=fullScenario();s.invoices[0].date='2026-11-31';
 const r=taxCloseTrainingAudit(s);
 assert.equal(r.period,'2026-11');
 assert.equal(r.checks.find(x=>x.key==='calendar_dates').passed,false);
 assert.ok(r.issues.some(x=>x.code==='source_invoice_invalid_calendar_date'));
 assert.equal(r.ready_for_training_review,false);
});
test('Zamknięcie wykrywa niemożliwy dzień na wyciągu i brak daty zatwierdzonego dekretu',()=>{
 const s=fullScenario();s.bank[0].date='2026-11-31';
 s.journals.find(j=>j.id==='jb1').date='';
 const r=taxCloseTrainingAudit(s);
 assert.equal(r.checks.find(x=>x.key==='calendar_dates').passed,false);
 assert.ok(r.issues.some(x=>x.code==='bank_invalid_calendar_date'));
 assert.ok(r.issues.some(x=>x.code==='posted_journal_invalid_calendar_date'));
});
test('Ważne daty z różnych okresów nie są błędem daty w audycie kalendarza',()=>{
 const {manifest,state}=fictionalFullCompanyMonth(),a=taxCloseTrainingAudit(state,manifest);
 assert.equal(a.checks.find(c=>c.key==='calendar_dates').passed,true);
 const s=structuredClone(state);
 s.journals.push({id:'LAST_YEAR',date:'2025-12-31',status:'posted',source_type:'manual',source_id:'',
  lines:[{account:'400',debit:100,credit:0},{account:'202',debit:0,credit:100}]});
 assert.equal(taxCloseTrainingAudit(s,manifest).checks.find(c=>c.key==='calendar_dates').passed,true);
});

test('Ścieżka firmy odmawia zaliczenia nieistniejącej daty na fakturze',()=>{
 const s=fullScenario();s.invoices.find(i=>i.kind==='purchase').date='2026-11-31';
 const r=auditCompanyLifecycle(s);
 assert.equal(r.period_scope.month,'2026-11');
 assert.equal(r.steps.find(x=>x.key==='invoices').status,'needs_work');
 assert.equal(r.steps.find(x=>x.key==='bank').status,'needs_work');
 assert.equal(r.completed,false);
});
test('Ścieżka firmy nie zalicza banku z datą 31 listopada',()=>{
 const s=fullScenario();s.bank[0].date='2026-11-31';
 const r=auditCompanyLifecycle(s);
 assert.equal(r.steps.find(x=>x.key==='bank').status,'needs_work');
 assert.equal(taxCloseTrainingAudit(s).checks.find(x=>x.key==='calendar_dates').passed,false);
});


import {inspectWorkspaceBackup} from '../src/accounting/backup-recovery.js';
const BACKUP_OWNER='00000000-0000-4000-a000-000000000111';
const BACKUP_OTHER='00000000-0000-4000-a000-000000000112';
const BACKUP_ORIGINAL='00000000-0000-4000-a000-000000000113';
const BACKUP_COPY='00000000-0000-4000-a000-000000000114';
function syntheticOwnBackup(){
 return JSON.stringify({format:'trenerki-lab-backup-v1',exported_at:'2026-11-15T08:00:00Z',
  workspace:{id:BACKUP_ORIGINAL,user_id:BACKUP_OWNER,version:7,name:'Fikcyjne Biuro',
   state:{...EMPTY(),invoices:[{id:'FAKE1',kind:'sale',status:'draft'}]}}});
}
test('Kopia biura: walidacja właściciela, wersji i liczników bez zapisu',()=>{
 const input=syntheticOwnBackup(),snap=JSON.parse(input);
 const parsed=inspectWorkspaceBackup(input,BACKUP_OWNER);
 assert.equal(parsed.imported_name,'Fikcyjne Biuro (odzyskane)');
 assert.equal(parsed.owner_id,BACKUP_OWNER);
 assert.equal(parsed.source_workspace_id,BACKUP_ORIGINAL);
 assert.equal(parsed.source_version,7);
 assert.deepEqual(parsed.counts,{invoices:1,bank:0,journals:0,matches:0});
 assert.deepEqual(JSON.parse(input),snap);
 assert.throws(()=>inspectWorkspaceBackup(input,BACKUP_OTHER),/innego konta/);
});
test('Kopia biura: odrzucone nieznane, niepełne i złośliwe pliki',()=>{
 const good=JSON.parse(syntheticOwnBackup());
 for(const patch of [
  obj=>{obj.format='trenerki-unsaved-conflict-v1';},
  obj=>{obj.workspace.state.schema_version=99;},
  obj=>{delete obj.workspace.state.bank;},
  obj=>{obj.workspace.user_id=BACKUP_OTHER;},
  obj=>{obj.workspace.version=0;},
  obj=>{Object.defineProperty(obj.workspace.state,'__proto__',{value:{admin:true},enumerable:true});}
 ]){
  const candidate=structuredClone(good);
  patch(candidate);
  assert.throws(()=>inspectWorkspaceBackup(JSON.stringify(candidate),BACKUP_OWNER));
 }
 assert.throws(()=>inspectWorkspaceBackup('{broken',BACKUP_OWNER));
 assert.throws(()=>inspectWorkspaceBackup('x'.repeat(1000001),BACKUP_OWNER));
});
test('Kopia biura: odtworzenie do NOWEGO biura wymaga zgody i nie rusza oryginału',async()=>{
 const {mountLab}=await import('../src/accounting/lab-ui.js');
 const prevWindow=globalThis.window,prevLocal=globalThis.localStorage;
 const original={id:BACKUP_ORIGINAL,user_id:BACKUP_OWNER,name:'Fikcyjne Biuro',
  version:3,updated_at:'2026-11-15T07:00:00Z',state:EMPTY()};
 const before=JSON.stringify(original);
 const root={innerHTML:'',handlers:{},addEventListener(k,fn){this.handlers[k]=fn;},
  removeEventListener(k){delete this.handlers[k];},querySelectorAll(){return [];}};
 let inserted=0,saved=0,mayConfirm=false,newRecord=null;
 globalThis.window={confirm:()=>mayConfirm,addEventListener(){},removeEventListener(){}};
 globalThis.localStorage={getItem(){return null;},setItem(){}};
 const db={
  auth:{getUser:async()=>({data:{user:{id:BACKUP_OWNER}}})},
  rpc:async(name,args)=>{
   if(name==='ta_accounting_overview')return {data:{},error:null};
   if(name==='ta_accounting_lab_save'){
    assert.equal(args.workspace_id,BACKUP_COPY);
    assert.equal(args.expected_version,1);
    assert.equal(args.next_state.invoices.length,1);
    saved++;
    newRecord={...newRecord,state:args.next_state,version:2};
    return {data:newRecord,error:null};
   }
   throw new Error('unexpected RPC '+name);
  },
  from(table){
   assert.ok(['ta_accounting_lab_workspaces','ta_accounting_core_materials_v3','ta_accounting_lab_events'].includes(table));
   return {
    newName:null,idFilter:null,
    select(){return this;},
    eq(k,v){this.idFilter=v;return this;},
    order:async()=>({data:[{id:original.id,name:original.name,version:original.version,
       updated_at:original.updated_at}],error:null}),
    maybeSingle:async()=>({data:null,error:{message:'Synthetic protected lesson unavailable'}}),
    insert(payload){this.newName=payload.name;return this;},
    single:async function(){
     if(this.newName){
      inserted++;
      newRecord={id:BACKUP_COPY,user_id:BACKUP_OWNER,name:this.newName,
       version:1,updated_at:'2026-11-15T08:00:00Z',state:EMPTY()};
      return {data:newRecord,error:null};
     }
     return {data:original,error:null};
    }
   };
  }
 };
 let dispose=()=>{};
 try{
  dispose=mountLab(root,db);
  await new Promise(resolve=>setImmediate(resolve));
  await root.handlers.change({target:{
   id:'lab-backup-file',dataset:{},files:[{size:syntheticOwnBackup().length,text:async()=>syntheticOwnBackup()}]
  }});
  assert.match(root.innerHTML,/Utwórz NOWE biuro z kopii/);
  const event={target:{closest:()=>({disabled:false,dataset:{action:'restore-copy',id:''}})}};
  await root.handlers.click(event);
  assert.equal(inserted,0,'Bez potwierdzenia niczego nie tworzymy');
  mayConfirm=true;
  await root.handlers.click(event);
  assert.equal(inserted,1);
  assert.equal(saved,1);
  assert.equal(newRecord.state.invoices[0].id,'FAKE1');
  assert.equal(newRecord.id,BACKUP_COPY);
  assert.equal(newRecord.version,2);
  assert.match(root.innerHTML,/Kopia odzyskana do osobnego biura/);
  assert.equal(JSON.stringify(original),before);
 }finally{
  dispose();
  if(prevWindow===undefined)delete globalThis.window;else globalThis.window=prevWindow;
  if(prevLocal===undefined)delete globalThis.localStorage;else globalThis.localStorage=prevLocal;
 }
});

import {prepareLabInvoice} from '../src/accounting/identity-core.js';
test('Biuro: wystawienie z gotowej karty firmy zachowuje w fakturze dane stron i miesiąc',()=>{
 const company={schema_version:1,status:'ready',fictional:true,entity_type:'jdg',record_system:'books',
  vat_status:'active',identity:{legal_name:'Fikcyjna Firma do Testów',nip:'9000000016',
   regon:'',krs:'',address:'ul. Przykładowa 1, 00-001 Testowo',country:'PL'}};
 const draft={id:'INVOICE-INTEGRATION-1',kind:'sale',number:'CW/FV/TEST1',
  party:'Fikcyjny kontrahent',party_address:'ul. Przykładowa 2, 00-002 Testowo',
  party_nip:'9000000022',party_kind:'business',seller:'Fikcyjna Firma do Testów',
  date:'2026-01-15',due:'2026-01-20',
  lines:[{label:'Test integracyjny',qty:'1',price:'1000,00',code:'23'}]};
 const before=JSON.stringify({company,draft});
 const issued=prepareLabInvoice(draft,company,'issued');
 assert.equal(issued.identity_version,1);
 assert.equal(issued.own_identity.nip,'9000000016');
 assert.equal(issued.counterparty_identity.nip,'9000000022');
 assert.equal(issued.date,'2026-01-15');
 assert.equal(issued.gross_cents,123000);
 assert.equal(JSON.stringify({company,draft}),before,'Brak mutacji danych formularza i firmy');
});
test('Biuro: z gotową firmą brak adresu lub zły NIP nabywcy blokuje wystawienie',()=>{
 const company={schema_version:1,status:'ready',entity_type:'jdg',record_system:'books',
  vat_status:'active',identity:{legal_name:'Fikcyjna Firma',nip:'9000000016',
  regon:'',krs:'',address:'Fikcyjna 1, Testowo',country:'PL'}};
 const draft={id:'INVOICE-NEGATIVE',kind:'purchase',number:'CW/ZAK/TEST1',
  party:'Fikcyjny dostawca',party_address:'',party_nip:'9000000022',
  party_kind:'business',seller:'Fikcyjna Firma',
  date:'2026-01-15',due:'2026-01-18',
  lines:[{label:'Materiał testowy',qty:'1',price:'200,00',code:'23'}]};
 assert.throws(()=>prepareLabInvoice(draft,company,'issued'),/adres/i);
 assert.throws(()=>prepareLabInvoice({...draft,party_address:'Fikcyjna 2',party_nip:'1234567890'},company,'issued'),/NIP/i);
 assert.throws(()=>prepareLabInvoice({...draft,party_address:'Fikcyjna 2'}, {...company,identity:{...company.identity,nip:'1234567890'}},'issued'),/NIP/i);
});
test('Biuro: brak karty firmy nadal pozwala na szkic i zwykły model, ale bez fałszywego powiązania',()=>{
 const d={id:'LEGACY-1',kind:'sale',number:'CW/FV/LEGACY',party:'Test',
  seller:'Testowa Firma',date:'2026-01-15',due:'2026-01-31',
  lines:[{label:'Szkic',qty:'1',price:'100,00',code:'0'}]};
 const issued=prepareLabInvoice(d,null,'issued');
 assert.equal(issued.identity_version,undefined);
 assert.equal(prepareLabInvoice(d,null,'draft').status,'draft');
});
