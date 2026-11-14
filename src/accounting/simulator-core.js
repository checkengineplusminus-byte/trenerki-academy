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
