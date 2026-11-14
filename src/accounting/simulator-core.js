/**
 * Pierwszy etap praktycznego miesiąca D01–D36: rozpoznawanie źródeł dokumentów.
 * Manifest (wraz z odpowiedziami) jest pobierany z chronionego Supabase, nie z repo.
 * Zaliczenie tej klasyfikacji NIE oznacza księgowania, zamknięcia miesiąca ani E2E.
 */
export const SCENARIO_ID='core-v3-firma-demo-2026-01-v1';
export const CLASS_KINDS=Object.freeze({
  formal:'Dokument formalny / organizacyjny',
  contract:'Umowa',
  acceptance:'Protokół odbioru',
  purchase:'Faktura zakupu',
  sale:'Faktura sprzedaży',
  correction:'Korekta',
  bank_in:'Wpływ na rachunek',
  bank_out:'Wydatek z rachunku',
  warehouse:'Dokument magazynowy',
  asset:'Majątek i odpisy',
  payroll:'Dokument płacowy',
  reconciliation:'Potwierdzenie salda',
  closing:'Zamknięcie okresu'
});
const isKind=k=>Object.prototype.hasOwnProperty.call(CLASS_KINDS,k);
export function readScenario(raw){
 const scenario=raw?.scenario??raw;
 if(!scenario||scenario.id!==SCENARIO_ID||!Array.isArray(scenario.documents)||scenario.documents.length!==36)
  throw new Error('Niekompletny lub niezgodny manifest miesiąca D01–D36.');
 const seen=new Set();
 for(const d of scenario.documents){
  if(!d||typeof d.id!=='string'||!/^D(?:0[1-9]|[12][0-9]|3[0-6])$/.test(d.id)||seen.has(d.id)||
     !/^2026-01-(?:0[1-9]|[12][0-9]|3[01])$/.test(d.date)||typeof d.title!=='string'||
     d.title.length<3||d.title.length>250||!isKind(d.kind)||!Number.isSafeInteger(d.amount_pln)||
     ((d.kind==='bank_in'||d.kind==='bank_out')&&d.amount_pln<0)||
     d.fictional!==true||d.source_verification!=='training_only')
   throw new Error('Niespójne dane dokumentu w manifeście ćwiczeniowym.');
  seen.add(d.id);
 }
 for(let n=1;n<=36;n++)if(!seen.has('D'+String(n).padStart(2,'0')))
  throw new Error('W manifeście brakuje dokumentu ćwiczeniowego.');
 return scenario;
}
export function readScenarioAnswers(state){
 const saved=state?.simulator_attempts_v1;
 if(saved?.scenario_id!==SCENARIO_ID||!saved.answers||typeof saved.answers!=='object'||Array.isArray(saved.answers))return {};
 return Object.fromEntries(Object.entries(saved.answers).filter(([id,k])=>/^D(?:0[1-9]|[12][0-9]|3[0-6])$/.test(id)&&isKind(k)));
}
export function checkScenarioAnswer(doc,kind){
 if(!doc||!isKind(doc.kind)||!isKind(kind))return {valid:false,correct:false,message:'Wybierz rodzaj dokumentu.'};
 const correct=kind===doc.kind;
 return {valid:true,correct,message:correct?
  'Rozpoznano prawidłowo. Następny etap to ustalenie skutku księgowego, a nie automatyczne księgowanie.':
  'Wróć do tytułu i daty dokumentu. Ustal, czy to zdarzenie źródłowe, wpływ lub wydatek bankowy, czy tylko potwierdzenie wcześniej ujętej operacji.'};
}
export function withScenarioAnswer(state,scenario,docId,kind){
 const docs=readScenario(scenario).documents;
 if(!docs.some(d=>d.id===docId)||!isKind(kind))throw new Error('Nieprawidłowy dokument lub wybór.');
 const answers={...readScenarioAnswers(state),[docId]:kind};
 return {...state,simulator_attempts_v1:{scenario_id:SCENARIO_ID,answers}};
}
export function scenarioSummary(scenario,answers={}){
 const docs=readScenario(scenario).documents;
 let attempted=0,correct=0,bankIn=0,bankOut=0;
 for(const d of docs){
  if(answers[d.id]!==undefined){attempted++;if(answers[d.id]===d.kind)correct++;}
  if(d.kind==='bank_in')bankIn+=d.amount_pln;
  if(d.kind==='bank_out')bankOut+=d.amount_pln;
 }
 return {total:36,attempted,correct,bankIn,bankOut,bankNet:bankIn-bankOut};
}


/**
 * Drugi etap D01–D36: samodzielne uzgodnienie przepływów bankowych.
 * Kwoty zapisujemy wyłącznie w groszach, a odpowiedzi liczymy z chronionego manifestu.
 * Ta próba NIE oznacza zaksięgowania wyciągu ani ukończenia symulatora.
 */
const BANK_KEYS=Object.freeze(['bank_in_cents','bank_out_cents','bank_net_cents']);
const isBankCents=value=>Number.isSafeInteger(value)&&Math.abs(value)<=100000000000;
function validBankExercise(x){
 return !!x&&BANK_KEYS.every(key=>isBankCents(x[key]))&&x.bank_in_cents>=0&&x.bank_out_cents>=0;
}
export function readBankExercise(state){
 const saved=state?.simulator_bank_exercise_v1;
 if(saved?.scenario_id!==SCENARIO_ID||!validBankExercise(saved))return null;
 return {bank_in_cents:saved.bank_in_cents,bank_out_cents:saved.bank_out_cents,
  bank_net_cents:saved.bank_net_cents,attempts:Number.isSafeInteger(saved.attempts)&&saved.attempts>0?saved.attempts:1};
}
export function withBankExercise(state,scenario,entry){
 readScenario(scenario);
 if(!validBankExercise(entry))throw new Error('Podaj trzy kwoty w PLN: wpływy i wypływy dodatnie oraz saldo netto ze znakiem.');
 const prev=readBankExercise(state);
 return {...state,simulator_bank_exercise_v1:{
  scenario_id:SCENARIO_ID,bank_in_cents:entry.bank_in_cents,bank_out_cents:entry.bank_out_cents,
  bank_net_cents:entry.bank_net_cents,attempts:Math.min(99999,(prev?.attempts||0)+1)}};
}
export function checkBankExercise(scenario,entry){
 const summary=scenarioSummary(scenario);
 if(!validBankExercise(entry))return {attempted:false,correct:false,consistent:false,checks:[]};
 const expected={bank_in_cents:summary.bankIn*100,bank_out_cents:summary.bankOut*100,
  bank_net_cents:summary.bankNet*100};
 const checks=BANK_KEYS.map(key=>({key,correct:entry[key]===expected[key]}));
 return {attempted:true,correct:checks.every(c=>c.correct),
  consistent:entry.bank_in_cents-entry.bank_out_cents===entry.bank_net_cents,checks};
}


/**
 * Etap 3 D01–D36: kursant samodzielnie dekretuje Wn/Ma.
 * Wzorcowe zapisy i plan kont są odczytywane wyłącznie z prywatnego manifestu
 * w Supabase. Ćwiczenie nie księguje dokumentów w rzeczywistym dzienniku,
 * nie oblicza VAT/ZUS/CIT i nie potwierdza końcowego odbioru kursu.
 */
const JOURNAL_KEY='simulator_journal_attempts_v1';
const isJournalCent=n=>Number.isSafeInteger(n)&&n>=0&&n<=10000000000;
const journalId=id=>/^D(?:0[1-9]|[12][0-9]|3[0-6])$/.test(id);
function validJournalLines(lines,accounts){
 if(!Array.isArray(lines)||lines.length>8)return false;
 return lines.every(x=>x&&typeof x.account==='string'&&Object.prototype.hasOwnProperty.call(accounts,x.account)&&
  isJournalCent(x.debit_cents)&&isJournalCent(x.credit_cents)&&
  ((x.debit_cents>0&&x.credit_cents===0)||(x.credit_cents>0&&x.debit_cents===0)));
}
function journalTotalsCents(lines){
 return {debit:lines.reduce((s,x)=>s+x.debit_cents,0),
  credit:lines.reduce((s,x)=>s+x.credit_cents,0)};
}
const lineSignature=lines=>lines.map(x=>x.account+':'+x.debit_cents+':'+x.credit_cents).sort().join('|');
export function readJournalPractice(scenario){
 const data=readScenario(scenario);
 const practice=data.journal_practice_v1;
 if(!practice||practice.version!==1||practice.currency!=='PLN'||!practice.accounts||
  typeof practice.accounts!=='object'||Array.isArray(practice.accounts)||
  !practice.entries||typeof practice.entries!=='object'||Array.isArray(practice.entries)||
  Object.keys(practice.entries).length!==36)throw new Error('Brak kompletnego, chronionego wzorca dekretacji.');
 const accounts=practice.accounts;
 if(Object.keys(accounts).length<3||Object.entries(accounts).some(([k,v])=>!/^\d{3}$/.test(k)||typeof v!=='string'||v.length<2||v.length>120))
  throw new Error('Niepoprawny ćwiczeniowy plan kont.');
 for(const doc of data.documents){
  const task=practice.entries[doc.id];
  if(!task||typeof task.explanation!=='string'||task.explanation.length<15||
   !validJournalLines(task.lines,accounts))throw new Error('Niekompletny wzorzec dla '+doc.id+'.');
  const totals=journalTotalsCents(task.lines);
  if(totals.debit!==totals.credit)throw new Error('Niezbilansowany wzorzec dla '+doc.id+'.');
 }
 return practice;
}
export function readJournalAttempts(state,scenario){
 const practice=readJournalPractice(scenario);
 const saved=state?.[JOURNAL_KEY];
 if(saved?.scenario_id!==SCENARIO_ID||!saved.entries||typeof saved.entries!=='object'||Array.isArray(saved.entries))return {};
 return Object.fromEntries(Object.entries(saved.entries).filter(([id,entry])=>
  journalId(id)&&practice.entries[id]&&entry&&validJournalLines(entry.lines,practice.accounts)&&
  Number.isSafeInteger(entry.tries)&&entry.tries>=1&&entry.tries<=99999));
}
export function withJournalAttempt(state,scenario,docId,lines){
 const practice=readJournalPractice(scenario);
 if(!journalId(docId)||!practice.entries[docId]||!validJournalLines(lines,practice.accounts))
  throw new Error('Uzupełnij poprawne konta i kwoty Wn/Ma; do 8 wierszy na dokument.');
 const prev=readJournalAttempts(state,scenario);
 const ownLines=lines.map(x=>({account:x.account,debit_cents:x.debit_cents,credit_cents:x.credit_cents}));
 return {...state,[JOURNAL_KEY]:{scenario_id:SCENARIO_ID,entries:{...prev,
  [docId]:{lines:ownLines,tries:Math.min(99999,(prev[docId]?.tries||0)+1)}}}};
}
export function checkJournalAttempt(scenario,docId,entry){
 const practice=readJournalPractice(scenario);
 const reference=practice.entries[docId];
 if(!reference||!entry||!validJournalLines(entry.lines,practice.accounts))
  return {attempted:false,correct:false,balanced:false,debit_cents:0,credit_cents:0};
 const {debit,credit}=journalTotalsCents(entry.lines);
 return {attempted:true,correct:lineSignature(entry.lines)===lineSignature(reference.lines),
  balanced:debit===credit,debit_cents:debit,credit_cents:credit,
  no_entry:entry.lines.length===0};
}
export function journalPracticeSummary(scenario,attempts){
 const practice=readJournalPractice(scenario);
 let attempted=0,correct=0;
 for(const id of Object.keys(practice.entries)){
  const result=checkJournalAttempt(scenario,id,attempts?.[id]);
  if(result.attempted){attempted++;if(result.correct)correct++;}
 }
 return {total:36,attempted,correct,reference_posts:Object.values(practice.entries).filter(x=>x.lines.length>0).length};
}


/**
 * Podgląd zamknięcia miesiąca z zapisów własnego ćwiczenia Wn/Ma.
 * Nie jest księgą rachunkową firmy i nie dokonuje zatwierdzenia E2E/podatków.
 */
export function journalClosingPreview(scenario,attempts={}){
 const model=readJournalPractice(scenario),progress=journalPracticeSummary(scenario,attempts);
 const signed=Object.create(null);
 let debit_cents=0,credit_cents=0;
 for(const id of Object.keys(model.entries)){
  const trial=attempts[id];
  if(!trial||!validJournalLines(trial.lines,model.accounts))continue;
  for(const row of trial.lines){
   signed[row.account]=(signed[row.account]||0)+row.debit_cents-row.credit_cents;
   debit_cents+=row.debit_cents;credit_cents+=row.credit_cents;
  }
 }
 const amt=key=>signed[key]||0;
 const actual={
  bank:amt('130'),receivables:amt('201'),inventory:amt('310'),
  machine:amt('010')+amt('070')+amt('079'),trade_payables:-amt('202'),
  loan:-amt('240'),profit:-amt('700')-amt('400')-amt('401')-amt('404')-amt('751')
 };
 for(const key of Object.keys(actual))if(Object.is(actual[key],-0))actual[key]=0;
 const assets_cents=actual.bank+actual.receivables+actual.inventory+actual.machine;
 const liabilities_cents=actual.trade_payables+actual.loan;
 const equity_cents=-amt('800')+actual.profit;
 const balance_diff_cents=assets_cents-liabilities_cents-equity_cents;
 const labels={bank:'Bank',receivables:'Należności handlowe',inventory:'Materiały w magazynie',
  machine:'Maszyna netto',trade_payables:'Zobowiązania wobec dostawców',
  loan:'Pozostały kapitał pożyczki',profit:'Wynik przed podatkiem (model)'};
 const checks=Object.entries(labels).map(([key,label])=>{
  const expected=model.reconciliation?.[key];
  const validExpected=Number.isSafeInteger(expected)&&expected>=0&&expected<=1000000000;
  return {key,label,actual_cents:actual[key],expected_cents:validExpected?expected*100:null,
   matches:validExpected&&actual[key]===expected*100};
 });
 const balanced=debit_cents===credit_cents&&balance_diff_cents===0;
 return {progress,checks,debit_cents,credit_cents,assets_cents,liabilities_cents,equity_cents,
  balance_diff_cents,balanced,
  model_reconciled:progress.correct===36&&balanced&&checks.every(x=>x.matches)};
}



/**
 * Niezależna bramka integralności szkoleniowego wzorca D01-D36.
 * Weryfikuje każdy dowód bankowy, nie tylko sumę miesiąca: źródło gotówki
 * musi odpowiadać ruchowi konta 130 w tym SAMYM dokumencie.
 * Nie ocenia prawa, podatków ani jakości pracy prawdziwego księgowego.
 */
export function inspectReferenceMonth(scenario){
 const data=readScenario(scenario),model=readJournalPractice(data);
 const issues=[];
 for(const doc of data.documents){
  const bankLines=model.entries[doc.id].lines.filter(line=>line.account==='130');
  const actual=bankLines.reduce((sum,line)=>sum+line.debit_cents-line.credit_cents,0);
  const expected=(doc.kind==='bank_in'?1:doc.kind==='bank_out'?-1:0)*doc.amount_pln*100;
  if(!Number.isSafeInteger(expected)||!Number.isSafeInteger(actual)){
   issues.push({code:'bank_amount_out_of_range',document_id:doc.id});
  }else if(actual!==expected){
   issues.push({code:'bank_source_mismatch',document_id:doc.id});
  }
 }
 if(!model.reconciliation||typeof model.reconciliation!=='object'||Array.isArray(model.reconciliation)){
  issues.push({code:'missing_reference_reconciliation'});
 }else{
  const referenceAttempts=Object.fromEntries(data.documents.map(doc=>[doc.id,{
   lines:model.entries[doc.id].lines,tries:1
  }]));
  const closing=journalClosingPreview(data,referenceAttempts);
  if(closing.progress.correct!==36||!closing.balanced)issues.push({code:'reference_not_balanced'});
  for(const check of closing.checks)if(!check.matches)
   issues.push({code:'reference_reconciliation_mismatch',field:check.key});
 }
 return {ok:issues.length===0,issues,checked_documents:data.documents.length};
}

/**
 * Przekrojowa kontrola czterech ćwiczeń D01–D36.
 * Czyta tylko zapisane odpowiedzi ucznia i prywatny manifest; niczego nie zatwierdza.
 * Zgodność szkoleniowa NIE zastępuje pracy w rzeczywistym dzienniku, E2E ani podatków.
 */
export function auditMonthWorkflow(scenario,state={}){
 const data=readScenario(scenario);
 const classification=scenarioSummary(data,readScenarioAnswers(state));
 const bank=checkBankExercise(data,readBankExercise(state));
 const journal=journalClosingPreview(data,readJournalAttempts(state,data));
 const reference=inspectReferenceMonth(data);
 const completeJournal=journal.progress.attempted===36;
 const statementNetCents=scenarioSummary(data).bankNet*100;
 const journalBankCents=journal.checks.find(x=>x.key==='bank')?.actual_cents??null;
 const bankDifferenceCents=completeJournal&&journalBankCents!==null?journalBankCents-statementNetCents:null;
 const checks=[
  {key:'classification',label:'Rozpoznanie 36 dowodów',
   passed:classification.correct===36,
   detail:classification.correct+'/36 poprawnych; '+classification.attempted+'/36 zapisanych'},
  {key:'bank',label:'Wpływy, wypływy i zmiana banku',
   passed:bank.correct,detail:bank.attempted?(bank.correct?'Wyniki zgodne z dokumentami':'Sprawdź trzy kwoty i znaki'):'Brak zapisanej próby'},
  {key:'journal',label:'Dekretacja lub świadomy brak zapisu',
   passed:journal.progress.correct===36,
   detail:journal.progress.correct+'/36 poprawnych; '+journal.progress.attempted+'/36 zapisanych'},
  {key:'bank_vs_journal',label:'Rachunek bankowy z dziennika a dowody',
   passed:completeJournal&&bankDifferenceCents===0,
   detail:!completeJournal?'Najpierw zapisz wszystkie 36 decyzji Wn/Ma':
    bankDifferenceCents===0?'Zgodne':'Różnica '+(bankDifferenceCents/100).toFixed(2)+' PLN; zweryfikuj bank i podwójne księgowanie'},
  {key:'closing',label:'Bilans, rozrachunki i wynik fikcyjnego modelu',
   passed:journal.model_reconciled,
   detail:journal.model_reconciled?'Model uzgodniony':'Do uzgodnienia, nie jest to wynik podatkowy'}
 ];
 return {checks,passed:checks.filter(x=>x.passed).length,total:checks.length,
  training_consistent:checks.every(x=>x.passed)&&reference.ok,bank_difference_cents:bankDifferenceCents,
  reference_integrity:reference.ok?'passed':'blocked',reference_issues:reference.issues,
  legal_review:'pending',real_two_account_e2e:'not_tested',independent_restore:'not_tested'};
}
