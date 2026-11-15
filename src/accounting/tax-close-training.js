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
 // The aggregate on account 130 can balance even when a CSV row was never posted:
 // a compensating manual journal or two wrong bank postings could hide the gap.
 // Audit every fictional CSV row against exactly one effective, dated source journal.
 const bankCoverageIssues=[],bankIds=new Set();
 if(period){
  for(const row of bank){
   const id=typeof row?.id==='string'?row.id:'';
   if(!id||bankIds.has(id)||!Number.isSafeInteger(row.amount_cents)||
      row.amount_cents===0||Math.abs(row.amount_cents)>1000000000000){
    bankCoverageIssues.push({code:'invalid_or_duplicate_bank_row',invoice:id||'(brak ID)'});
    continue;
   }
   bankIds.add(id);
   const sourceEntries=posted.filter(j=>j.source_type==='bank'&&j.source_id===id);
   if(sourceEntries.length!==1){
    bankCoverageIssues.push({code:'bank_row_missing_or_duplicate_posting',invoice:id});
    continue;
   }
   const entry=sourceEntries[0];
   const bankLines=Array.isArray(entry.lines)?entry.lines.filter(l=>l.account==='130'):[];
   if(monthOf(entry.date)!==period||bankLines.length!==1||
      bankLines[0].debit!==Math.max(0,row.amount_cents)||
      bankLines[0].credit!==Math.max(0,-row.amount_cents)){
    bankCoverageIssues.push({code:'bank_source_amount_or_period_mismatch',invoice:id});
   }
  }
  for(const entry of periodPostings){
   if(Array.isArray(entry.lines)&&entry.lines.some(l=>l.account==='130')&&
      (entry.source_type!=='bank'||!bankIds.has(entry.source_id))){
    bankCoverageIssues.push({code:'bank_ledger_entry_without_period_csv',invoice:entry.id||'(brak ID)'});
   }
  }
 }
 const bankCovered=bank.length>0&&bankCoverageIssues.length===0&&bankIds.size===bank.length;
 // Wynik i płynność są dwoma RÓŻNYMI odczytami tego samego okresu.
 // Wartości z modelowego planu kont, bez uznawania ich za podstawę PIT/CIT/VAT.
 const periodMovement=account=>total(periodPostings,j=>
  total(Array.isArray(j.lines)?j.lines:[],l=>l.account===account?l.debit-l.credit:0));
 const revenueCents=-periodMovement('700');
 const expenseCents=['400','401','404','761'].reduce((n,account)=>n+periodMovement(account),0);
 const resultCents=revenueCents-expenseCents;
 const cashInCents=total(bank,row=>Math.max(0,row.amount_cents));
 const cashOutCents=total(bank,row=>Math.max(0,-row.amount_cents));
 const moneyInputsSafe=[revenueCents,expenseCents,resultCents,cashInCents,cashOutCents]
  .every(Number.isSafeInteger);
 const trainingResult={
  revenue_cents:moneyInputsSafe?revenueCents:null,
  expense_cents:moneyInputsSafe?expenseCents:null,
  profit_or_loss_cents:moneyInputsSafe?resultCents:null,
  result_label:!moneyInputsSafe?'nieprawidłowe dane':resultCents<0?'strata modelowa':resultCents>0?'zysk modelowy':'wynik zerowy',
  bank_inflow_cents:moneyInputsSafe?cashInCents:null,
  bank_outflow_cents:moneyInputsSafe?cashOutCents:null,
  bank_net_movement_cents:moneyInputsSafe?cashInCents-cashOutCents:null,
  status:moneyInputsSafe&&ledgerBalanced&&bankCovered?'source_reconciled_training':'incomplete_model',
  explanation:'Wynik modelu: konto 700 minus 400/401/404/761. Przepływ banku: wpływy minus wypływy CSV. To NIE jest saldo otwarcia ani dochód podatkowy.'
 };
 // Spójny wykaz dokumentów źródłowych dla fikcyjnego zamknięcia i recenzji.
 // Numery zakupów od różnych dostawców mogą się powtarzać.
 const sourceIdentityIssues=[],sourceIds=new Set(),documentKeys=new Set();
 const source_inventory=issued.map(i=>{
  const id=typeof i.id==='string'?i.id.trim():'';
  const number=typeof i.number==='string'?i.number.trim():'';
  const party=String(i.kind==='purchase'?i.party??'':i.seller??'').trim();
  if(!id||sourceIds.has(id))sourceIdentityIssues.push({code:'source_id_missing_or_duplicate',invoice:number||id||'(brak ID)'});
  if(id)sourceIds.add(id);
  if(!number)sourceIdentityIssues.push({code:'source_invoice_number_missing',invoice:id||'(brak ID)'});
  if(number&&party){
   const key=[i.kind,party.toLocaleLowerCase('pl-PL'),number.toLocaleLowerCase('pl-PL')].join('|');
   if(documentKeys.has(key))sourceIdentityIssues.push({code:'source_invoice_number_duplicate_for_party',invoice:number});
   documentKeys.add(key);
  }
  let amounts=null;
  try{const v=invoiceTotals(i);
   if(v.net_cents===i.net_cents&&v.tax_cents===i.tax_cents&&v.gross_cents===i.gross_cents)amounts=v;
  }catch{}
  return {id,number,kind:i.kind,date:i.date,
   net_cents:amounts?.net_cents??null,vat_cents:amounts?.tax_cents??null,
   gross_cents:amounts?.gross_cents??null,
   journal_count:posted.filter(j=>j.source_type==='invoice'&&j.source_id===i.id).length,
   legal_qualification:'not_tested'};
 });
 // W tym fikcyjnym modelu każda faktura musi mieć ślad na kontach 221/222.
 // NIE oznacza to jednak odliczenia VAT ani kwalifikacji podatkowej.
 const vatLedgerSalesCents=-periodMovement('222');
 const vatLedgerPurchasesCents=periodMovement('221');
 const vatLedgerValid=[vatLedgerSalesCents,vatLedgerPurchasesCents].every(Number.isSafeInteger);
 const vatLedgerMatches=!!period&&issued.length>0&&vatLedgerValid&&
  vatLedgerSalesCents===totals.sale_vat_cents&&vatLedgerPurchasesCents===totals.purchase_vat_cents;
 if(!vatLedgerMatches&&!!period&&issued.length>0)
  sourceIdentityIssues.push({code:'model_vat_ledger_does_not_match_invoices',invoice:period});
 const steps=Object.fromEntries(lifecycle.steps.map(x=>[x.key,x.status]));
 const checks=[
  {key:'period',label:'Jeden miesiąc źródłowy',passed:!!period,detail:period||'Najpierw wystaw ćwiczeniowe dokumenty.'},
  {key:'sources',label:'Faktury zakupu i sprzedaży',passed:issued.some(i=>i.kind==='sale')&&issued.some(i=>i.kind==='purchase'),detail:issued.length+' dokumentów w miesiącu'},
  {key:'source_identity',label:'Unikalne faktury źródłowe w miesiącu',
   passed:issued.length>0&&sourceIdentityIssues.length===0,
   detail:sourceIdentityIssues.length+' powtórzonych ID / numerów tej samej strony'},
  {key:'invoice_posting',label:'Jedno poprawne księgowanie każdej faktury',passed:issued.length>0&&correctPostings===issued.length&&issues.length===0,detail:correctPostings+'/'+issued.length+'; sprawdź wyjątki dotyczące majątku'},
  {key:'ledger',label:'Wn = Ma na każdym dekrecie miesiąca',passed:ledgerBalanced,detail:periodPostings.length+' aktywnych dekretów'},
  {key:'vat_model_vs_ledger',label:'VAT faktur = konta 221/222 tego samego miesiąca',
   passed:vatLedgerMatches,
   detail:'konto 222 '+vatLedgerSalesCents+' gr / faktury '+totals.sale_vat_cents+
    ' gr; konto 221 '+vatLedgerPurchasesCents+' gr / faktury '+totals.purchase_vat_cents+
    ' gr. To kontrola ćwiczeniowa, nie kwalifikacja VAT'},
  {key:'bank',label:'Bank z wyciągu = konto 130 w miesiącu',passed:bankBalanced,detail:'Porównanie kwot z fikcyjnego CSV oraz dziennika'},
  {key:'bank_sources',label:'Każdy wiersz CSV ma jeden zgodny dekret źródłowy',passed:bankCovered,
   detail:bank.length+' wierszy okresu; '+bankCoverageIssues.length+' rozbieżności (w tym daty, ID, kwoty i nieopisane księgowania 130)'},
  {key:'receivables',label:'Rozrachunki z płatnościami',passed:steps.bank==='passed_training',detail:'Wymagane prawidłowe konta i przypisanie obu faktur'},
  {key:'payroll_assets',label:'Kadry, płace i majątek w tym samym okresie',passed:steps.payroll==='passed_training'&&steps.asset==='passed_training',detail:'Wszystkie moduły muszą mieć własne zapisy; sam bilans nie wystarcza'},
  // Odbiór rozliczenia jednego biura nie może bazować na odrębnym ćwiczeniu
  // D01–D36 z innego miesiąca ani pominąć dokumentu otwarcia firmy.
  {key:'company_opening',label:'Karta firmy i dane otwarcia w tym samym biurze',
   passed:steps.company==='passed_training',
   detail:'Wymagana zapisana karta fikcyjnej firmy; ćwiczenie nie jest rejestracją urzędową'},
  {key:'scenario_same_period',label:'36 dokumentów i zamknięcie z TEGO miesiąca',
   passed:!!period&&steps.month==='passed_training'&&
    (scenario?.scenario??scenario)?.documents?.length===36&&
    (scenario.scenario??scenario).documents.every(d=>monthOf(d.date)===period)&&
    (!(scenario.scenario??scenario).month||(scenario.scenario??scenario).month===period),
   detail:'D01–D36 i faktury, bank, kadry oraz majątek muszą dotyczyć tego samego miesiąca ('+(period||'nieustalonego')+'). Osobny styczeń nie zamyka listopada'}
 ];
 const vatDifferenceCents=totals.sale_vat_cents-totals.purchase_vat_cents;
 return {
  period:period||null,source_count:issued.length,
  vat_ledger:{sales_cents:vatLedgerSalesCents,purchases_cents:vatLedgerPurchasesCents,matching:vatLedgerMatches,
   review:'not_tested'},
  figures:{...totals,vat_difference_cents:vatDifferenceCents,
   bank_statement_cents:bankStatementCents,bank_ledger_cents:bankLedgerCents},
  checks,issues:[...issues,...sourceIdentityIssues,...bankCoverageIssues],source_inventory,review_notes,training_result:trainingResult,
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
 const fin=r.training_result;
 const fm=n=>n===null?'BRAK WIARYGODNYCH DANYCH':money(n);
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
  '<p>VAT według aktywnych dekretów: 222 — ',escape(money(r.vat_ledger.sales_cents)),
  '; 221 — ',escape(money(r.vat_ledger.purchases_cents)),
  '; zgodność z fakturami: ',r.vat_ledger.matching?'TAK, WYŁĄCZNIE W MODELU':'NIE — WYJAŚNIJ ROZBIEŻNOŚĆ','.</p>',
  '<h2>Wykaz źródłowych faktur do weryfikacji</h2>',
  '<p>Wyłącznie źródła z miesiąca. Liczba dekretów nie oznacza ich prawidłowości ani kwalifikacji prawnej VAT.</p>',
  '<table><thead><tr><th>Dokument</th><th>Rodzaj</th><th>Data</th><th>Netto</th><th>VAT</th><th>Brutto</th><th>Dekrety</th></tr></thead><tbody>',
  r.source_inventory.map(i=>'<tr><td>'+escape(i.number||i.id)+'</td><td>'+escape(i.kind)+'</td><td>'+escape(i.date)+'</td><td>'+
   escape(fm(i.net_cents))+'</td><td>'+escape(fm(i.vat_cents))+'</td><td>'+escape(fm(i.gross_cents))+'</td><td>'+i.journal_count+'</td></tr>').join(''),
  '</tbody></table>',
  '<h2>Wynik i przepływy pieniężne okresu — wyłącznie model</h2>',
  '<p>Przychody 700: ',escape(fm(fin.revenue_cents)),
  '; koszty 400/401/404/761: ',escape(fm(fin.expense_cents)),
  '; ',escape(fin.result_label),': ',escape(fm(fin.profit_or_loss_cents)),'</p>',
  '<p>Wpływy CSV: ',escape(fm(fin.bank_inflow_cents)),
  '; wypływy CSV: ',escape(fm(fin.bank_outflow_cents)),
  '; zmiana banku bez salda otwarcia: ',escape(fm(fin.bank_net_movement_cents)),'</p>',
  '<p>Wiarygodność danych: ',escape(fin.status),
  '. Wynik księgowy nie jest przepływem gotówki; nie jest też podstawą PIT/CIT.</p>',
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
