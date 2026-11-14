/**
 * Pobierany przez kursanta RAPORT SZKOLENIOWY z fikcyjnego miesiąca D01–D36.
 * To tylko generator HTML do wydrukowania lokalnie, bez wysyłki, płatności
 * ani kwalifikacji podatkowej. Manifest pochodzi z chronionego Supabase.
 */
import {escapeHTML} from './lab-core-base.js';
import {readScenario,readScenarioAnswers,readJournalAttempts,readBankExercise,
 checkBankExercise,scenarioSummary,journalClosingPreview,auditMonthWorkflow,CLASS_KINDS} from './simulator-core.js';

const e=escapeHTML;
const currency=n=>(n/100).toLocaleString('pl-PL',{
 minimumFractionDigits:2,maximumFractionDigits:2})+' zł';

export function monthTrainingReportHTML(rawScenario,state){
 const scenario=readScenario(rawScenario);
 const audit=auditMonthWorkflow(scenario,state);
 if(!audit.training_consistent||audit.reference_integrity!=='passed')
  throw new Error('Raport można pobrać dopiero po rozwiązaniu i uzgodnieniu wszystkich 36 dokumentów.');
 const answers=readScenarioAnswers(state);
 const attempts=readJournalAttempts(state,scenario);
 const bank=checkBankExercise(scenario,readBankExercise(state));
 const cash=scenarioSummary(scenario);
 const closing=journalClosingPreview(scenario,attempts);
 const savedAt=new Date().toISOString().replace('T',' ').slice(0,16)+' UTC';
 const rows=scenario.documents.map(doc=>{
  const lines=attempts[doc.id]?.lines||[];
  const posting=lines.length
   ?lines.map(line=>e(line.account)+' — '+(line.debit_cents?
    'Wn '+e(currency(line.debit_cents)):'Ma '+e(currency(line.credit_cents)))).join(' / ')
   :'Brak dekretu — decyzja świadoma';
  return '<tr><td>'+e(doc.id)+'</td><td>'+e(doc.date)+'</td><td>'+
   e(doc.title)+'</td><td>'+e(CLASS_KINDS[answers[doc.id]]||'Nieznana')+
   '</td><td>'+posting+'</td></tr>';
 }).join('');
 const checks=audit.checks.map(check=>'<li>'+e(check.label)+': <strong>'+
  (check.passed?'Zgodne':'Wymaga poprawy')+'</strong></li>').join('');
 return [
  '<!doctype html><html lang="pl"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<title>Trenerki — raport ćwiczeniowy D01–D36</title>',
  '<style>body{font:14px/1.5 Arial,sans-serif;color:#173727;max-width:1100px;margin:26px auto;padding:20px}',
  'h1{font-size:26px}h2{margin-top:22px}.warning{border:2px solid #9c5534;padding:14px;font-weight:bold}',
  'table{width:100%;border-collapse:collapse;font-size:11px}th,td{border-bottom:1px solid #cbd6cb;padding:7px;text-align:left;vertical-align:top}',
  'th{background:#eaf2e5}tr{break-inside:avoid}small{color:#526957}@media print{body{margin:0;padding:9mm}table{font-size:9px}}</style>',
  '</head><body><div class="warning">TYLKO DANE FIKCYJNE — NIE JEST TO FAKTURA, DEKLARACJA, ',
  'ZATWIERDZONA KSIĘGOWOŚĆ ANI POTWIERDZENIE KWALIFIKACJI ZAWODOWYCH</div>',
  '<h1>Raport szkoleniowy: miesiąc D01–D36</h1>',
  '<p><strong>Firma fikcyjna:</strong> ',e(scenario.company||'Przedsiębiorstwo ćwiczeniowe'),
  ' · <strong>Okres:</strong> ',e(scenario.month||'2026-01'),
  ' · <strong>Wygenerowano:</strong> ',e(savedAt),'</p>',
  '<p>Sprawdzenie wewnętrzne: ',audit.passed,'/',audit.total,
  ' zgodnych etapów. Integralność wzorca: ',e(audit.reference_integrity),
  '. Jest to wyłącznie rezultat ćwiczenia na fikcyjnym modelu.</p>',
  '<h2>Uzgodnienie banku</h2><p>Wpływy: ',e(currency(cash.bankIn*100)),
  ' · Wypływy: ',e(currency(cash.bankOut*100)),
  ' · Zmiana rachunku: ',e(currency(cash.bankNet*100)),
  ' · Wynik zadania: ',bank.correct?'zgodny':'wymaga poprawy','.</p>',
  '<h2>Próbny bilans</h2><p>Wn: ',e(currency(closing.debit_cents)),
  ' · Ma: ',e(currency(closing.credit_cents)),
  ' · Aktywa: ',e(currency(closing.assets_cents)),
  ' · Zobowiązania: ',e(currency(closing.liabilities_cents)),
  ' · Kapitał z wynikiem: ',e(currency(closing.equity_cents)),'</p>',
  '<h2>Pięć kontroli szkoleniowych</h2><ol>',checks,'</ol>',
  '<h2>36 dokumentów i własne decyzje księgowe</h2>',
  '<table><thead><tr><th>ID</th><th>Data</th><th>Dokument</th><th>Rozpoznanie</th>',
  '<th>Własny dekret Wn/Ma</th></tr></thead><tbody>',rows,'</tbody></table>',
  '<p><small>Wszystkie dane są fikcyjne. Nie wykonano wysyłek do KSeF, JPK, banku ani urzędu.',
  ' Ten raport nie zastępuje opinii księgowego, sprawdzenia prawa, testu dwóch kont',
  ' ani niezależnego odtworzenia kopii zapasowej.</small></p>',
  '</body></html>'
 ].join('');
}
