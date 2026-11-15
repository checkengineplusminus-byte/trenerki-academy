/**
 * Fikcyjne biuro — odczytowa ścieżka kontroli między modułami.
 * Oznaczenie etapu oznacza TYLKO wykonanie zapisanych czynności ucznia.
 * Styczeń D01–D36 i listopadowe biuro są odrębnymi symulacjami.
 * Żaden wynik nie zastępuje KSeF/JPK/UPO, autoryzowanego E2E ani recenzji.
 */
import {livePostings,expectedInvoiceLines,invoiceTotals} from './lab-core-base.js';
import {PERSONNEL_IDS,readPersonnelCases} from './personnel-practice.js';
import {readPayrollPractices,payrollLifecycleChecklist} from './payroll-practice.js';
import {inspectPayrollLedger} from './payroll-ledger-audit.js';
import {assetsControl,assetPosition} from './assets-core.js';
import {auditMonthWorkflow} from './simulator-core.js';

const signature=lines=>lines.map(l=>l.account+':'+l.debit+':'+l.credit).sort().join('|');

export function auditCompanyLifecycle(state,scenario=null){
 const s=state||{},invoices=Array.isArray(s.invoices)?s.invoices:[],
       bank=Array.isArray(s.bank)?s.bank:[],
       journals=Array.isArray(s.journals)?s.journals:[],
       matches=Array.isArray(s.matches)?s.matches:[];
 const validShape=Array.isArray(s.invoices)&&Array.isArray(s.bank)&&
   Array.isArray(s.journals)&&Array.isArray(s.matches);
 const posted=validShape?livePostings(s):[];
 const steps=[];
 const add=(key,label,passed,detail,tab=null,href=null)=>steps.push({
   key,label,status:passed?'passed_training':'needs_work',detail,tab,href
 });
 add('company','Karta fikcyjnej jednostki',
   s.company?.status==='ready',
   s.company?.status==='ready'?'Karta jednostki zapisana i wewnętrznie sprawdzona; rejestracja urzędowa niepotwierdzona.':
   'Uzupełnij i zapisz kartę firmy ćwiczeniowej.',null,'/dane-biura');
 function postingForInvoice(i){
   try{
     const totals=invoiceTotals(i);
     if(totals.gross_cents!==i.gross_cents||totals.net_cents!==i.net_cents||
         totals.tax_cents!==i.tax_cents)return false;
     const items=posted.filter(j=>j.source_type==='invoice'&&j.source_id===i.id);
     return items.length===1&&signature(items[0].lines)===signature(expectedInvoiceLines(i));
   }catch{return false;}
 }
 const issued=invoices.filter(i=>i?.status==='issued'&&['purchase','sale'].includes(i.kind));
 const sales=issued.filter(i=>i.kind==='sale'&&postingForInvoice(i));
 const purchases=issued.filter(i=>i.kind==='purchase'&&postingForInvoice(i));
 add('invoices','Zakup i sprzedaż z jednym prawidłowym dekretem',
   validShape&&sales.length>0&&purchases.length>0,
   sales.length&&purchases.length?'Wykryto prawidłowo zdekretowany zakup i sprzedaż.':
   'Zapisz fakturę zakupu i sprzedaży; każdą wystaw i zaksięguj dokładnie raz.',
   'invoices');
 function paid(i){
   const links=matches.filter(m=>m?.invoice_id===i.id&&Number.isSafeInteger(m.amount_cents)&&m.amount_cents>0);
   if(!links.length||links.reduce((n,m)=>n+m.amount_cents,0)!==i.gross_cents)return false;
   return links.every(m=>{
     const b=bank.find(b=>b?.id===m.bank_id);
     if(!b||!Number.isSafeInteger(b.amount_cents)||
       (i.kind==='sale'?b.amount_cents<=0:b.amount_cents>=0))return false;
     const entries=posted.filter(j=>j.source_type==='bank'&&j.source_id===b.id);
     return entries.length===1&&entries[0].lines.some(l=>
       l.account==='130'&&
       (b.amount_cents>0?l.debit===b.amount_cents:l.credit===-b.amount_cents));
   });
 }
 const bankReady=validShape&&sales.some(paid)&&purchases.some(paid);
 add('bank','CSV, rozrachunki i osobne dekrety bankowe',bankReady,
   bankReady?'Powiązania zakup/sprzedaż mają zgodne wpływy i wypływy z dekretami.':
   'Uzgodnij obie faktury z fikcyjnym CSV oraz oddzielnie zaksięguj wpływ i wydatek.',
   'matches');
 let payrollReady=false;
 try{
   const people=readPersonnelCases(s),cases=readPayrollPractices(s);
   const healthy=inspectPayrollLedger(s).length===0;
   payrollReady=healthy&&PERSONNEL_IDS.every(id=>{
     const person=people[id],c=cases[id],check=payrollLifecycleChecklist(s,id);
     if(!person||!c||!check.ready_for_training_review)return false;
     return ['accrual','payment'].every(stage=>
       posted.filter(j=>j.payroll_ref?.employee_id===id&&
         j.payroll_ref?.period===c.period&&j.payroll_ref?.stage===stage).length===1);
   })&&PERSONNEL_IDS.some(id=>!!people[id]?.ends_on);
 }catch{payrollReady=false;}
 add('payroll','Kadry, dwie listy płac, CSV i zakończenie umowy',
   payrollReady,payrollReady?'Dwie fikcyjne osoby: projekty dokumentów i aktywne dekrety bez wykrytych niespójności.':
   'Uzupełnij obie kartoteki, projekty dokumentów, płace, wypłaty i dekrety; przećwicz odejście co najmniej jednej osoby.',
   'payroll');
 let assetsReady=false;
 try{
   assetsReady=assetsControl(s).length===0&&Array.isArray(s.assets)&&s.assets.some(a=>{
     if(a.status!=='active')return false;
     const p=assetPosition(a,s);
     return !!(p.acquisition&&p.depreciations.length>0&&p.disposal?.source_id);
   });
 }catch{assetsReady=false;}
 add('asset','Majątek: zakup, amortyzacja i sprzedaż',
   assetsReady,assetsReady?'Zapisane przyjęcie, odpis i sprzedaż z wyksięgowaniem; formalna kontrola podatkowa osobno.':
   'Przejdź do kartoteki majątku; nie wystarczy sam zakup lub sam harmonogram amortyzacji.',
   null,'/majatek-ksiegowy');
 let monthReady=false;
 try{monthReady=!!scenario&&auditMonthWorkflow(scenario,s).training_consistent===true;}
 catch{monthReady=false;}
 add('month','D01–D36: decyzje, bank, dekretacja, uzgodnienie',
   monthReady,monthReady?'Odrębny fikcyjny styczeń D01–D36 uzgodniony szkoleniowo; nie połączono go z biurem listopadowym.':
   'Rozwiąż 36 dokumentów i pięć kontroli fikcyjnego stycznia w symulatorze.',
   'simulator');
 steps.push({key:'tax_and_close',
   label:'Pełne zamknięcie jednego okresu, KSeF/JPK/UPO',
   status:'not_implemented',detail:'Brak kompletnego jednego procesu przez wszystkie moduły i pełnej symulacji rozliczeń. Nie wolno oznaczyć tego jako zaliczone.',
   tab:'report',href:null});
 const finished_training_stages=steps.filter(x=>x.status==='passed_training').length;
 return {steps,finished_training_stages,stage_count:steps.length,
   completed:false,integrated_full_cycle:'not_tested',
   real_two_account_e2e:'not_tested',legal_review:'not_tested',
   warning:'Model D01–D36 dotyczy stycznia 2026, a pierwsze biuro — listopada 2026. To odrębne ćwiczenia, nie ukończony jeden okres.'};
}
