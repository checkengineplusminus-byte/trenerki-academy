/**
 * Szkoleniowy PRZEGLĄD przygotowania rozliczenia jednego miesiąca.
 * Wyłącznie odczyt własnego, fikcyjnego biura. Nie tworzy JPK, pliku KSeF,
 * autentycznego UPO, deklaracji ani żądania HTTP do administracji.
 * Liczby to założenia istniejącego modelu, NIE kwalifikacja podatkowa.
 */
import {invoiceTotals,expectedInvoiceLines,livePostings} from './lab-core-base.js';
import {auditCompanyLifecycle} from './lifecycle-audit.js';
import {acquisitionLines} from './assets-core.js';

const monthOf=date=>typeof date==='string'&&/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(date)?date.slice(0,7):null;
const signature=lines=>lines.map(l=>l.account+':'+l.debit+':'+l.credit).sort().join('|');
const total=(items,pick)=>items.reduce((n,item)=>n+pick(item),0);
const isMoney=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000000000;

export function taxCloseTrainingAudit(raw,scenario=null){
 const state=raw||{},lifecycle=auditCompanyLifecycle(state,scenario);
 const period=lifecycle.period_scope.month,issued=(Array.isArray(state.invoices)?state.invoices:[])
   .filter(i=>i&&i.status==='issued'&&['sale','purchase'].includes(i.kind)&&!!period&&monthOf(i.date)===period);
 const posted=Array.isArray(state.journals)?livePostings(state):[];
 const issues=[],review_notes=[],totals={sale_net_cents:0,sale_vat_cents:0,purchase_net_cents:0,purchase_vat_cents:0};
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
    const asset=(Array.isArray(state.assets)?state.assets:[]).find(a=>
      a.id===j[0].asset_id&&a.invoice_id===i.id&&a.status==='active');
    if(!asset||signature(j[0].lines)!==signature(acquisitionLines(asset,state))){
     issues.push({code:'asset_acquisition_posting_mismatch',invoice:i.number||i.id});continue;
    }
    // Zakup majątku poprawny w tym modelu nie jest zwykłym kosztem usługi.
    // Ujęcie prawa do odliczenia podatku VAT wymaga osobnej recenzji człowieka.
    correctPostings++;
    review_notes.push('Zakup majątku '+(i.number||i.id)+': dekret 010/221/202 zgodny z kartą; odliczenie VAT wymaga recenzji.');
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
  checks,issues,review_notes,
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


/** Raport do lokalnego druku i przekazania ekspertowi. Bez prawdziwego formularza. */
export function taxCloseTrainingReportHTML(state,scenario=null){
 const r=taxCloseTrainingAudit(state,scenario);
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=n=>(n/100).toLocaleString('pl-PL',{minimumFractionDigits:2,maximumFractionDigits:2})+' PLN';
 const body=r.checks.map(c=>'<tr><td>'+escape(c.label)+'</td><td>'+
  (c.passed?'Zgodne w modelu':'Do uzupełnienia')+'</td><td>'+escape(c.detail)+'</td></tr>').join('');
 const issues=r.issues.map(x=>'<li>'+escape(x.code)+' — '+escape(x.invoice)+'</li>').join('');
 const notes=r.review_notes.map(x=>'<li>'+escape(x)+'</li>').join('');
 return [
  '<!doctype html><html lang="pl"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1">',
  '<title>Trenerki — przegląd szkoleniowy okresu</title>',
  '<style>body{font:14px/1.5 Arial,sans-serif;max-width:980px;margin:auto;padding:22px;color:#183c2b}',
  'table{border-collapse:collapse;width:100%}th,td{text-align:left;border:1px solid #c8d8c3;padding:9px;vertical-align:top}',
  '.warning{border:3px solid #aa503e;padding:16px;font-weight:bold}h1{font-size:24px}',
  '@media print{body{padding:8mm;font-size:11px}}</style></head><body>',
  '<div class="warning">WYŁĄCZNIE FIKCYJNE DANE. BRAK WYSYŁKI URZĘDOWEJ. ',
  'TO NIE JEST JPK, PLIK KSeF, UPO ANI DEKLARACJA PODATKOWA.</div>',
  '<h1>Raport kontrolny — przygotowanie rozliczenia okresu</h1>',
  '<p>Okres ćwiczeniowy: <strong>',escape(r.period||'nieustalony'),'</strong>; dokumenty: ',r.source_count,'</p>',
  '<p>Sprzedaż netto: ',escape(money(r.figures.sale_net_cents)),
  '; VAT z dokumentów sprzedaży: ',escape(money(r.figures.sale_vat_cents)),
  '; VAT z dokumentów zakupu: ',escape(money(r.figures.purchase_vat_cents)),
  '; różnica modelowa: ',escape(money(r.figures.vat_difference_cents)),'</p>',
  '<h2>Kontrole wykonane przez model</h2><table><thead><tr><th>Warunek</th><th>Stan</th><th>Opis</th></tr></thead><tbody>',
  body,'</tbody></table>',
  '<h2>Wyjątki wymagające wyjaśnienia</h2>',issues?'<ul>'+issues+'</ul>':'<p>Brak błędów dokumentowych wykrytych przez ten zakres testów.</p>',
  '<h2>Uwagi do sprawdzenia przez księgowego</h2>',notes?'<ul>'+notes+'</ul>':'<p>Niezależna recenzja prawna nadal jest wymagana.</p>',
  '<h2>Status etapów urzędowych</h2><p>KSeF: NIE WYSŁANO. JPK: NIE WYGENEROWANO W SCHEMACIE URZĘDOWYM. UPO: NIE WYDANO.</p>',
  '<p>',escape(r.disclaimer),'</p>',
  '<p>Odbiór eksperta: NIE PRZEPROWADZONO. Test dwóch rzeczywistych kont: NIE PRZEPROWADZONO. ',
  'Niezależne odtworzenie backupu: NIE PRZEPROWADZONO.</p>',
  '</body></html>'
 ].join('');
}
