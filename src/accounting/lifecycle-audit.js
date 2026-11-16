/**
 * Fikcyjne biuro — odczytowa ścieżka kontroli między modułami.
 * Oznaczenie etapu oznacza TYLKO wykonanie zapisanych czynności ucznia.
 * Styczeń D01–D36 i listopadowe biuro są odrębnymi symulacjami.
 * Żaden wynik nie zastępuje KSeF/JPK/UPO, autoryzowanego E2E ani recenzji.
 */
import {livePostings,expectedInvoiceLines,invoiceTotals,validDate} from './lab-core-base.js';
import {prepareCompany} from './identity-core.js';
import {PERSONNEL_IDS,readPersonnelCases} from './personnel-practice.js';
import {readPayrollPractices,payrollLifecycleChecklist} from './payroll-practice.js';
import {inspectPayrollLedger} from './payroll-ledger-audit.js';
import {assetsControl,assetPosition,acquisitionLines} from './assets-core.js';
import {inspectInvoiceBankMatches} from './invoice-match.js';
import {gradeFinalPractice} from './final-practice.js';
import {auditMonthWorkflow} from './simulator-core.js';

const signature=lines=>lines.map(l=>l.account+':'+l.debit+':'+l.credit).sort().join('|');
// Okres szkoleniowy wynika z miesiąca wystawienia zapisanych faktur.
// Nie jest to data podatkowa ani ustawowy termin zapłaty.
const monthOf=date=>validDate(date)?date.slice(0,7):null;

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
 // Wznowiony stan biura może zawierać niezweryfikowaną flagę 'ready'.
 // Kontrola jest odczytowa i nie poprawia automatycznie danych kursanta.
 let companyReady=false;
 try{
   const checked=prepareCompany(s.company,'ready');
   companyReady=s.company?.status==='ready'&&
     checked.record_system!=='unconfirmed'&&checked.vat_status!=='unconfirmed';
 }catch{companyReady=false;}
 add('company','Karta fikcyjnej jednostki',
   companyReady,
   companyReady?'Dane i założenia ewidencji/VAT sprawdzone w modelu; rejestracja urzędowa niepotwierdzona.':
   'Sprawdź nazwę, adres, syntetyczny NIP, rodzaj jednostki i wybierz ewidencję oraz VAT w karcie firmy ćwiczeniowej.',null,'/dane-biura');
 function postingForInvoice(i){
   try{
     const totals=invoiceTotals(i);
     if(totals.gross_cents!==i.gross_cents||totals.net_cents!==i.net_cents||
         totals.tax_cents!==i.tax_cents)return false;
     const items=posted.filter(j=>j.source_type==='invoice'&&j.source_id===i.id);
     if(items.length!==1)return false;
     const entry=items[0];
     // Dekret musi należeć do miesiąca faktury, nie tylko mieć zgodne kwoty.
     if(monthOf(entry.date)!==monthOf(i.date))return false;
     if(i.kind==='purchase'&&entry.asset_action==='acquire'){
       const a=(Array.isArray(s.assets)?s.assets:[]).find(a=>
        a.id===entry.asset_id&&a.invoice_id===i.id&&a.status==='active');
       return !!a&&signature(entry.lines)===signature(acquisitionLines(a,s));
     }
     return signature(entry.lines)===signature(expectedInvoiceLines(i));
   }catch{return false;}
 }
 const issued=invoices.filter(i=>i?.status==='issued'&&['purchase','sale'].includes(i.kind));
 const allIssuedDatesValid=issued.every(i=>validDate(i.date));
 const periods=[...new Set(issued.map(i=>monthOf(i.date)).filter(Boolean))].sort();
 const period=periods.at(-1)||null;
 const sales=issued.filter(i=>i.kind==='sale'&&monthOf(i.date)===period&&postingForInvoice(i));
 const purchases=issued.filter(i=>i.kind==='purchase'&&monthOf(i.date)===period&&postingForInvoice(i));
 const periodInvoices=issued.filter(i=>monthOf(i.date)===period);
 // Dwie poprawne faktury nie mogą ukryć trzeciej, wystawionej bez dekretu.
 const allPeriodInvoicesPosted=!!period&&periodInvoices.length>0&&periodInvoices.every(postingForInvoice);
 const invoicesReady=validShape&&allIssuedDatesValid&&sales.length>0&&purchases.length>0&&allPeriodInvoicesPosted;
 add('invoices','Zakup i sprzedaż z jednym prawidłowym dekretem',
   invoicesReady,
   invoicesReady?'Wszystkie wystawione faktury okresu '+period+' mają dokładnie jeden zgodny dekret.':
   'Uzgodnij każdą wystawioną fakturę zakupu i sprzedaży z jednym poprawnym dekretem w jej miesiącu.',
   'invoices');
 function paid(i){
   if(!period||monthOf(i.date)!==period)return false;
   const links=matches.filter(m=>m?.invoice_id===i.id&&Number.isSafeInteger(m.amount_cents)&&m.amount_cents>0);
   if(!links.length||links.reduce((n,m)=>n+m.amount_cents,0)!==i.gross_cents)return false;
   return links.every(m=>{
     const b=bank.find(b=>b?.id===m.bank_id);
     if(!b||monthOf(b.date)!==period||!Number.isSafeInteger(b.amount_cents)||
       (i.kind==='sale'?b.amount_cents<=0:b.amount_cents>=0))return false;
     const entries=posted.filter(j=>j.source_type==='bank'&&j.source_id===b.id);
     const expected=b.amount_cents>0
       ?[{account:'130',debit:b.amount_cents,credit:0},{account:'201',debit:0,credit:b.amount_cents}]
       :[{account:'202',debit:-b.amount_cents,credit:0},{account:'130',debit:0,credit:-b.amount_cents}];
     return entries.length===1&&signature(entries[0].lines)===signature(expected);
   });
 }
 let matchesClean=false;
 try{matchesClean=validShape&&inspectInvoiceBankMatches(s).length===0;}catch{matchesClean=false;}
 const allBankDatesValid=bank.every(b=>validDate(b?.date));
 const periodBank=bank.filter(b=>monthOf(b?.date)===period);
 const bankIds=new Set();
 // Każdy wiersz CSV tego okresu ma dokładnie jeden dekret z odpowiadającą
 // kwotą na 130. Dwie uzgodnione faktury nie ukrywają trzeciego przelewu.
 const bankSourcesCovered=!!period&&periodBank.length>0&&periodBank.every(b=>{
   const id=typeof b?.id==='string'?b.id.trim():'';
   if(!id||bankIds.has(id)||!Number.isSafeInteger(b.amount_cents)||
     b.amount_cents===0||Math.abs(b.amount_cents)>1000000000000)return false;
   bankIds.add(id);
   const entries=posted.filter(j=>j.source_type==='bank'&&j.source_id===id);
   // Data dekretu musi być datą WŁASNEGO wiersza CSV, a nie tylko
   // dowolnym dniem w tym samym miesiącu.
   if(entries.length!==1||entries[0].date!==b.date||
     !Array.isArray(entries[0].lines))return false;
   const line130=entries[0].lines.filter(l=>l.account==='130');
   return line130.length===1&&line130[0].debit===Math.max(0,b.amount_cents)&&
     line130[0].credit===Math.max(0,-b.amount_cents);
 });
 const noUnmatched130=posted.filter(j=>monthOf(j.date)===period).every(j=>{
   const touches130=Array.isArray(j.lines)&&j.lines.some(l=>l.account==='130');
   return !touches130||(j.source_type==='bank'&&bankIds.has(j.source_id));
 });
 const bankReady=invoicesReady&&allBankDatesValid&&matchesClean&&bankSourcesCovered&&
   noUnmatched130&&sales.some(paid)&&purchases.some(paid);
 add('bank','CSV, rozrachunki i osobne dekrety bankowe',bankReady,
   bankReady?'Każdy fikcyjny wiersz CSV okresu ma jeden zgodny dekret bankowy, z uzgodnionymi fakturami.':
   'Sprawdź wszystkie przelewy CSV, daty, kwoty i konta 130 oraz rozrachunki faktur.',
   'matches');
 let payrollReady=false;
 try{
   const people=readPersonnelCases(s),cases=readPayrollPractices(s);
   const healthy=inspectPayrollLedger(s).length===0;
   payrollReady=healthy&&PERSONNEL_IDS.every(id=>{
     const person=people[id],c=cases[id],check=payrollLifecycleChecklist(s,id);
     if(!person||!c||c.period!==period||!check.ready_for_training_review)return false;
     return ['accrual','payment'].every(stage=>
       posted.filter(j=>j.payroll_ref?.employee_id===id&&
         j.payroll_ref?.period===c.period&&j.payroll_ref?.stage===stage).length===1);
   })&&PERSONNEL_IDS.some(id=>monthOf(people[id]?.ends_on)===period);
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
     return !!(period&&p.acquisition&&monthOf(p.acquisition.date)===period&&
       p.depreciations.some(j=>j.asset_period===period)&&p.disposal?.source_id&&
       monthOf(p.disposal.date)===period);
   });
 }catch{assetsReady=false;}
 add('asset','Majątek: zakup, amortyzacja i sprzedaż',
   assetsReady,assetsReady?'Zapisane przyjęcie, odpis i sprzedaż z wyksięgowaniem; formalna kontrola podatkowa osobno.':
   'Przejdź do kartoteki majątku; nie wystarczy sam zakup lub sam harmonogram amortyzacji.',
   null,'/majatek-ksiegowy');
 let monthReady=false;
 try{
   const model=scenario?.scenario??scenario;
   const samePeriod=!!period&&(!model?.month||model.month===period)&&
     Array.isArray(model.documents)&&model.documents.length===36&&
     model.documents.every(d=>monthOf(d.date)===period);
   monthReady=samePeriod&&auditMonthWorkflow(scenario,s).training_consistent===true;
 }catch{monthReady=false;}
 add('month','D01–D36: decyzje, bank, dekretacja, uzgodnienie',
   monthReady,monthReady?'D01–D36 uzgodnione w tym samym miesiącu ćwiczeniowym co biuro; nadal brak powiązania każdego źródła z dziennikiem.':
   'Rozwiąż 36 dokumentów i pięć kontroli, ale pamiętaj: ich miesiąc musi być zgodny z okresem faktur, banku i płac biura.',
   'simulator');
 const practice=gradeFinalPractice(s);
 add('final_practice','Końcowy sprawdzian: 8 pytań ze zrozumienia księgowości',
   practice.passed,
   practice.passed?'Osiem odpowiedzi poprawnych w prywatnym biurze; to zaliczenie powtórki, nie całego kursu ani potwierdzenie prawa podatkowego.':
   'Otwórz Zestawienia i rozwiąż osiem końcowych pytań. Wynik: '+practice.correct+'/'+practice.total+'. Własny wynik nie zastępuje pełnej kontroli źródeł.',
   'report');
 steps.push({key:'tax_and_close',
   label:'Pełne zamknięcie jednego okresu, KSeF/JPK/UPO',
   status:'not_implemented',detail:'Brak kompletnego jednego procesu przez wszystkie moduły i pełnej symulacji rozliczeń. Nie wolno oznaczyć tego jako zaliczone.',
   tab:'report',href:null});
 const finished_training_stages=steps.filter(x=>x.status==='passed_training').length;
 return {steps,finished_training_stages,stage_count:steps.length,
   completed:false,period_scope:{month:period,date_basis:'invoice_issue_date_training_only',
     seen_invoice_months:periods,jan_scenario_separate:true},
   integrated_full_cycle:'not_tested',
   real_two_account_e2e:'not_tested',legal_review:'not_tested',
   warning:'Okres dokumentów biura: '+(period||'nieustalony')+
     '. Oddzielny moduł D01–D36: '+(scenario?.month||'2026-01')+
     '. Etapy innych miesięcy nie zaliczają wybranego okresu. Nawet gdy daty pokrywają się, są to dwa osobne ćwiczenia, nie jedno zamknięcie księgowe.'};
}
