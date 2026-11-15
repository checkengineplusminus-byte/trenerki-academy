/**
 * Szkoleniowy PRZEGLĄD przygotowania rozliczenia jednego miesiąca.
 * Wyłącznie odczyt własnego, fikcyjnego biura. Nie tworzy JPK, pliku KSeF,
 * autentycznego UPO, deklaracji ani żądania HTTP do administracji.
 * Liczby to założenia istniejącego modelu, NIE kwalifikacja podatkowa.
 */
import {invoiceTotals,expectedInvoiceLines,livePostings} from './lab-core-base.js';
import {auditCompanyLifecycle} from './lifecycle-audit.js';

const monthOf=date=>typeof date==='string'&&/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(date)?date.slice(0,7):null;
const signature=lines=>lines.map(l=>l.account+':'+l.debit+':'+l.credit).sort().join('|');
const total=(items,pick)=>items.reduce((n,item)=>n+pick(item),0);
const isMoney=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000000000;

export function taxCloseTrainingAudit(raw,scenario=null){
 const state=raw||{},lifecycle=auditCompanyLifecycle(state,scenario);
 const period=lifecycle.period_scope.month,issued=(Array.isArray(state.invoices)?state.invoices:[])
   .filter(i=>i&&i.status==='issued'&&['sale','purchase'].includes(i.kind)&&!!period&&monthOf(i.date)===period);
 const posted=Array.isArray(state.journals)?livePostings(state):[];
 const issues=[],totals={sale_net_cents:0,sale_vat_cents:0,purchase_net_cents:0,purchase_vat_cents:0};
 let correctPostings=0;
 for(const i of issued){
  try{
   const t=invoiceTotals(i);
   if(![t.net_cents,t.tax_cents,t.gross_cents].every(isMoney)||
      t.net_cents!==i.net_cents||t.tax_cents!==i.tax_cents||t.gross_cents!==i.gross_cents)
    throw new Error('kwoty nie odpowiadają pozycjom dokumentu');
   if(i.kind==='sale'){totals.sale_net_cents+=t.net_cents;totals.sale_vat_cents+=t.tax_cents;}
   else{totals.purchase_net_cents+=t.net_cents;totals.purchase_vat_cents+=t.tax_cents;}
   const j=posted.filter(x=>x.source_type==='invoice'&&x.source_id===i.id);
   if(j.length!==1||monthOf(j[0].date)!==period){
    issues.push({code:'invoice_posting_missing_or_duplicate',invoice:i.number||i.id});continue;
   }
   const acquisition=j[0].asset_action==='acquire'&&i.kind==='purchase';
   if(acquisition){
    // Wartość początkowa majątku jest księgowana inaczej niż koszt usługi.
    // Ocena podatkowa prawa do odliczenia pozostaje poza tą symulacją.
    issues.push({code:'asset_purchase_requires_manual_tax_review',invoice:i.number||i.id});
    continue;
   }
   if(signature(j[0].lines)!==signature(expectedInvoiceLines(i))){
    issues.push({code:'invoice_journal_mismatch',invoice:i.number||i.id});continue;
   }
   correctPostings++;
  }catch{
   issues.push({code:'invalid_invoice_amounts',invoice:i.number||i.id});
  }
 }
 const periodPostings=posted.filter(j=>monthOf(j.date)===period);
 const ledgerBalanced=periodPostings.length>0&&periodPostings.every(j=>{
  if(!Array.isArray(j.lines)||!j.lines.length)return false;
  if(j.lines.some(l=>!Number.isSafeInteger(l.debit)||!Number.isSafeInteger(l.credit)||
   l.debit<0||l.credit<0||((l.debit>0)===(l.credit>0))))return false;
  return total(j.lines,l=>l.debit)===total(j.lines,l=>l.credit);
 });
 const bank=Array.isArray(state.bank)?state.bank.filter(b=>monthOf(b.date)===period):[];
 const bankStatementCents=total(bank,b=>b.amount_cents);
 const bankLedgerCents=total(periodPostings,j=>total(j.lines,l=>l.account==='130'?l.debit-l.credit:0));
 const bankBalanced=bank.length>0&&Number.isSafeInteger(bankStatementCents)&&
  Number.isSafeInteger(bankLedgerCents)&&bankStatementCents===bankLedgerCents;
 const steps=Object.fromEntries(lifecycle.steps.map(x=>[x.key,x.status]));
 const checks=[
  {key:'period',label:'Jeden miesiąc źródłowy',passed:!!period,detail:period||'Najpierw wystaw ćwiczeniowe dokumenty.'},
  {key:'sources',label:'Faktury zakupu i sprzedaży',passed:issued.some(i=>i.kind==='sale')&&issued.some(i=>i.kind==='purchase'),detail:issued.length+' dokumentów w miesiącu'},
  {key:'invoice_posting',label:'Jedno poprawne księgowanie każdej faktury',passed:issued.length>0&&correctPostings===issued.length&&issues.length===0,detail:correctPostings+'/'+issued.length+'; sprawdź wyjątki dotyczące majątku'},
  {key:'ledger',label:'Wn = Ma na każdym dekrecie miesiąca',passed:ledgerBalanced,detail:periodPostings.length+' aktywnych dekretów'},
  {key:'bank',label:'Bank z wyciągu = konto 130 w miesiącu',passed:bankBalanced,detail:'Porównanie kwot z fikcyjnego CSV oraz dziennika'},
  {key:'receivables',label:'Rozrachunki z płatnościami',passed:steps.bank==='passed_training',detail:'Wymagane prawidłowe konta i przypisanie obu faktur'},
  {key:'payroll_assets',label:'Kadry, płace i majątek w tym samym okresie',passed:steps.payroll==='passed_training'&&steps.asset==='passed_training',detail:'Wszystkie moduły muszą mieć własne zapisy; sam bilans nie wystarcza'}
 ];
 const vatDifferenceCents=totals.sale_vat_cents-totals.purchase_vat_cents;
 return {
  period:period||null,source_count:issued.length,
  figures:{...totals,vat_difference_cents:vatDifferenceCents,
   bank_statement_cents:bankStatementCents,bank_ledger_cents:bankLedgerCents},
  checks,issues,
  ready_for_training_review:checks.every(c=>c.passed),
  draft_documents:{
   ksef:{status:'NOT_SENT_TRAINING_REFERENCE_ONLY',source_invoice_count:issued.filter(i=>i.kind==='sale').length},
   jpk:{status:'NOT_GENERATED_NOT_SCHEMA_VALIDATED',totals_status:'TRAINING_MODEL_ONLY'},
   upo:{status:'NOT_ISSUED',explanation:'UPO powstaje wyłącznie po rzeczywistej właściwej wysyłce; ten kurs go nie wystawia.'}
  },
  completed:false,legal_review:'not_tested',authorized_e2e:'not_tested',
  disclaimer:'To kontrola fikcyjnych liczb i dokumentów. Nie tworzy ani nie wysyła KSeF/JPK, nie wyznacza terminu ustawowego, nie udaje UPO i nie zatwierdza rozliczenia.'
 };
}
