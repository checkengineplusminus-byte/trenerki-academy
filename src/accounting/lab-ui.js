import {ACCOUNTS,EMPTY,uid,money,decimal,cents,scaled,invoiceTotals,expectedInvoiceLines,journalTotals,balanceReport,inspect,reverseJournal,parseBankCSV,BANK_TEMPLATE,escapeHTML as e,invoiceHTML} from './lab-core.js';
import {normalizeLabTab} from './lab-navigation.js';
import {CLASS_KINDS,readScenario,readScenarioAnswers,checkScenarioAnswer,withScenarioAnswer,scenarioSummary,readBankExercise,withBankExercise,checkBankExercise,readJournalPractice,readJournalAttempts,withJournalAttempt,checkJournalAttempt,journalPracticeSummary,journalClosingPreview,auditMonthWorkflow,inspectReferenceMonth,scenarioBankCSV} from './simulator-core.js';
import {PERSONNEL_IDS,PERSONNEL_FLAGS,readPersonnelCases,withPersonnelCase,personnelDraftReview} from './personnel-practice.js';
import {PAYROLL_FIELDS,readPayrollPractices,withPayrollPractice,payrollReview,payrollPeriodSummary,payrollBankMatch,bankRowAvailableForInvoice,payrollJournalPreview,payrollJournalDraft,payrollLifecycleChecklist} from './payroll-practice.js';
import {withInvoiceBankMatch} from './invoice-match.js';
import {prepareLabInvoice,identityInvoiceHTML} from './identity-core.js';
import {inspectWorkspaceBackup} from './backup-recovery.js';
import {monthTrainingReportHTML} from './month-training-report.js';
import {auditCompanyLifecycle} from './lifecycle-audit.js';
import {taxCloseTrainingAudit,taxCloseTrainingReportHTML} from './tax-close-training.js';
import {FINAL_PRACTICE_QUESTIONS,readFinalPractice,withFinalPracticeAnswers,gradeFinalPractice} from './final-practice.js';
import {inspectScenarioInvoiceBridge,withScenarioInvoiceLink} from './scenario-invoice-bridge.js';
import {inspectScenarioCorrectionBridge,withScenarioCorrectionJournal} from './scenario-correction-bridge.js';
const css=`.tlab{font:15px/1.55 system-ui,sans-serif;color:#183c2b;background:#f6f8f0;min-height:100vh;padding:24px}.tlab *{box-sizing:border-box}.tlab main{max-width:1280px;margin:auto}.tlab h1{font-size:clamp(28px,4vw,44px);line-height:1.15;margin:12px 0}.tlab h2{font-size:22px;margin:0 0 14px}.tlab h3{font-size:17px;margin:0 0 8px}.tlab a{color:inherit}.tlab header{background:#183c2b;color:#fff;border-radius:22px;padding:28px;margin:18px 0}.tlab .eyebrow{font-size:12px;font-weight:800;letter-spacing:1.5px}.tlab .muted{color:#627567;font-size:13px}.tlab header .muted{color:#c9dcc9}.tlab .card{background:white;border:1px solid #dbe5d5;border-radius:16px;padding:20px;margin:14px 0}.tlab .notice{background:#edf3df;border-left:4px solid #6c8e47;padding:14px;border-radius:9px}.tlab .error{background:#fff0e9;color:#8d331f;border-left:4px solid #a3462b;padding:14px;border-radius:9px;white-space:pre-wrap}.tlab .grid{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:20px}.tlab .row{display:flex;flex-wrap:wrap;gap:12px;align-items:end}.tlab .row>*{flex:1;min-width:120px}.tlab label{display:block;font-size:13px;font-weight:700;margin-bottom:4px}.tlab input,.tlab select,.tlab textarea{font:inherit;color:inherit;background:white;border:1px solid #bbceb6;border-radius:9px;padding:10px;max-width:100%;width:100%}.tlab textarea{min-height:90px}.tlab input:focus,.tlab select:focus,.tlab button:focus-visible{outline:3px solid #adc793;outline-offset:2px}.tlab button{font:inherit;font-weight:700;cursor:pointer;border:1px solid #bbceb6;background:#edf4e4;color:#183c2b;border-radius:9px;padding:10px 14px}.tlab button.primary{background:#183c2b;color:white;border-color:#183c2b}.tlab button:disabled{opacity:.45;cursor:not-allowed}.tlab .actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.tlab nav{display:flex;flex-wrap:wrap;gap:7px;margin:16px 0}.tlab nav button.active{background:#183c2b;color:white}.tlab .scroll{overflow:auto;max-width:100%}.tlab table{border-collapse:collapse;width:100%;font-size:13px}.tlab th,.tlab td{padding:10px 8px;text-align:left;border-bottom:1px solid #e5ecdf;vertical-align:top}.tlab th{background:#eff4e8;white-space:nowrap}.tlab td.amount,.tlab th.amount{text-align:right;white-space:nowrap}.tlab .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.tlab .stat{background:#edf4e4;border-radius:12px;padding:14px}.tlab .stat strong{display:block;font-size:23px}.tlab .pill{display:inline-block;border-radius:15px;background:#edf4e4;padding:3px 9px;font-size:12px;font-weight:700}.tlab .hint{border-top:1px solid #dbe5d5;padding:14px 0}.tlab .hint p{font-size:13px;margin:4px 0}.tlab details{margin:12px 0}.tlab summary{cursor:pointer;font-weight:700}.tlab .line{display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:8px;margin:10px 0;align-items:end}.tlab .journal-line{display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;margin:10px 0;align-items:end}.tlab .small{font-size:12px}.tlab ol{padding-left:22px}.tlab aside{align-self:start}.tlab .grid>*{min-width:0}.tlab .scroll table{min-width:510px}.tlab .status{min-height:28px;font-size:13px}.tlab fieldset{border:0;margin:0;padding:0;min-width:0}.tlab pre{white-space:pre-wrap;word-break:break-word;font-size:12px}.tlab .empty{padding:25px;text-align:center;color:#627567}@media(max-width:980px){.tlab .grid{grid-template-columns:1fr}.tlab aside{order:2}}@media(max-width:600px){.tlab{padding:12px}.tlab header{padding:22px 18px}.tlab .card{padding:14px}.tlab .stats{grid-template-columns:1fr}.tlab .line,.tlab .journal-line{grid-template-columns:1fr 1fr}.tlab .line>div:first-child,.tlab .journal-line>div:first-child{grid-column:1/-1}.tlab nav button{font-size:13px;padding:9px}.tlab h2{font-size:20px}}`;
export const formatReviewMoney=value=>Number.isSafeInteger(value)?money(value):'BRAK WIARYGODNYCH DANYCH';
const tabs={start:'Twoja rola',simulator:'Miesiąc firmy D01–D36',personnel:'Kadry — dwie osoby',payroll:'Lista płac — ćwiczenie',invoices:'Faktury',bank:'Wyciąg bankowy',journal:'Dziennik Wn/Ma',matches:'Rozrachunki',report:'Zestawienia',history:'Historia'};
const invBlank=(name,kind='sale',number=1,period='2026-11')=>({id:uid(),kind,number:`CW/${kind==='sale'?'FV':'ZAK'}/${number}`,party:'',party_address:'',party_nip:'',party_kind:'business',seller:name,date:period+'-01',due:period+'-15',lines:[{label:'Usługa ćwiczeniowa',qty:'1',price:kind==='sale'?'1000,00':'200,00',code:'23'}]});
const journalBlank=(period='2026-11')=>({id:uid(),date:period+'-01',memo:'',source_type:'manual',source_id:'',lines:[{account:'201',debit:'0',credit:'0'},{account:'700',debit:'0',credit:'0'}]});
const input=(group,key,label,value,type='text',extra='')=>`<div><label for="${group}-${key}">${e(label)}</label><input id="${group}-${key}" data-group="${group}" data-field="${key}" type="${type}" value="${e(value)}" ${extra}></div>`;
const select=(group,key,label,value,options)=>`<div><label for="${group}-${key}">${e(label)}</label><select id="${group}-${key}" data-group="${group}" data-field="${key}">${options.map(([v,n])=>`<option value="${e(v)}" ${v===value?'selected':''}>${e(n)}</option>`).join('')}</select></div>`;
const button=(action,label,id='',cls='')=>`<button type="button" data-action="${action}" data-id="${e(id)}" class="${cls}">${e(label)}</button>`;
const download=(name,text,type='application/json')=>{const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
export function mountLab(root,db,initialTab='start'){
 let disposed=false,user=null,workspaces=[],ws=null,tab=normalizeLabTab(initialTab),busy=false,canWrite=false,status='Sprawdzam zapisane biura…',error='',preview=null,history=[],answer='',drafts={},localWarning='',scenario=null,scenarioDoc='D01',scenarioError='',bankDraft=null,journalDoc='D01',journalDrafts={},hrSelected='P01',hrDraft=null,payrollDraft=null,conflictSnapshot=null,backupPreview=null;
 const key=()=>`trenerki-lab-draft-v1:${user?.id}:${ws?.id}`;
 const trainingPeriod=()=>typeof scenario?.month==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(scenario.month)?scenario.month:'2026-11';
 function blankDrafts(){return {invoice:invBlank(ws.name,'sale',ws.state.invoices.filter(i=>i.kind==='sale').length+1,trainingPeriod()),journal:journalBlank(trainingPeriod()),match:{bank_id:'',invoice_id:'',amount:''},question:{text:''}};}
 function restoreDrafts(){drafts=blankDrafts();try{const raw=localStorage.getItem(key());if(raw){const old=JSON.parse(raw);if(old?.invoice?.lines&&old?.journal?.lines)drafts={...drafts,...old};}}catch{localWarning='Nie udało się odczytać lokalnego szkicu. Dane zapisane w bazie pozostają dostępne.';}}
 function keepDrafts(){try{localStorage.setItem(key(),JSON.stringify(drafts));}catch{localWarning='Przeglądarka nie zapisuje lokalnego szkicu. Użyj przycisku „Zapisz szkic”, aby zachować formularz w bazie.';}}
 async function load(){
  try{const auth=await db.auth.getUser();user=auth.data?.user;if(!user){status='Zaloguj się, aby otworzyć swoje biuro.';return;}
   const [list,access]=await Promise.all([db.from('ta_accounting_lab_workspaces').select('id,name,version,updated_at').order('updated_at',{ascending:false}),db.rpc('ta_accounting_overview')]);
   if(list.error)throw list.error;workspaces=list.data||[];canWrite=!access.error;status=canWrite?'Wybierz firmę lub utwórz nowe biuro ćwiczeniowe.':'Brak aktywnego dostępu do pracowni. Zapisane wcześniej dane możesz odczytać i wyeksportować.';
   if(canWrite){
     const result=await db.from('ta_accounting_core_materials_v3').select('material').eq('topic_no',96).maybeSingle();
     try {
      if(result.error)throw result.error;
      const candidate=readScenario(result.data?.material);
      // Odbiór wzorca PRZED pierwszym ćwiczeniem, nie dopiero po 36 zapisach.
      // Kontrola jest tylko odczytem; nie modyfikuje prób kursanta.
      const reference=inspectReferenceMonth(candidate);
      if(!reference.ok){
       scenario=null;
       scenarioError='Wzorzec D01–D36 zawiera niespójności techniczne ('+reference.issues.length+
        '). Nie rozpoczynaj tego miesiąca i zgłoś problem TRENERKI. Twoje wcześniejsze zapisy biura pozostają dostępne.';
      }else{scenario=candidate;scenarioError='';}
     }catch{
      scenario=null;
      scenarioError='Nie udało się pobrać i sprawdzić kompletnego, chronionego manifestu D01–D36. Dotychczasowa pracownia działa niezależnie.';
     }
    }
    if(workspaces.length)await open(workspaces[0].id);
  }catch(x){error=x.message||'Nie udało się wczytać biura.';}finally{render();}
 }
 async function open(id){
  const r=await db.from('ta_accounting_lab_workspaces').select('*').eq('id',id).single();
  if(r.error)throw r.error;
  if(disposed)return;
  ws=r.data;preview=null;history=[];answer='';restoreDrafts();bankDraft=null;
  journalDrafts={};scenarioDoc='D01';journalDoc='D01';
  hrSelected='P01';hrDraft=null;payrollDraft=null;
  // Po ponownym zalogowaniu lub wyborze biura wróć do pierwszego brakującego
  // dowodu na danym etapie. Tylko odczyt; bez automatycznych zapisów do bazy.
  if(scenario){
   try{
    scenarioDoc=nextUnresolvedDocument('D36','classification')?.id||'D01';
    journalDoc=nextUnresolvedDocument('D36','journal')?.id||'D01';
   }catch{
    scenarioDoc='D01';journalDoc='D01';
   }
  }
  status=`Odczytano zapis z bazy · wersja ${ws.version}`;
 }
 async function commit(next){
  if(!canWrite)throw new Error('Brak aktywnego dostępu do zapisu.');
  const r=await db.rpc('ta_accounting_lab_save',{workspace_id:ws.id,expected_version:ws.version,next_state:next});
  if(r.error){
   if(r.error.code==='40001'){
    // Utrwal tylko w pamięci karty to, czego serwer nie przyjął.
    // Nie nadpisuj nowszej wersji i nie przechowuj całego biura w localStorage.
    conflictSnapshot={user_id:user?.id,workspace_id:ws.id,expected_version:ws.version,
     captured_at:new Date().toISOString(),next_state:JSON.parse(JSON.stringify(next))};
    throw new Error('Zapis odrzucony: inne okno ma nowszą wersję. Twoje niezapisane dane można teraz pobrać do pliku. Pobierz kopię PRZED odświeżeniem i porównaj zmiany; nie wykonujemy automatycznego nadpisania.');
   }
   throw new Error(r.error.message||'Nie udało się zapisać danych.');
  }
  if(disposed)return;ws=r.data;workspaces=workspaces.map(w=>w.id===ws.id?{...w,version:ws.version,updated_at:ws.updated_at}:w);status=`Zapisano w bazie · wersja ${ws.version} · ${new Date(ws.updated_at).toLocaleTimeString('pl-PL')}`;history=[];answer='';
 }
 function table(headers,rows){return `<div class="scroll"><table><thead><tr>${headers.map(h=>`<th>${e(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;}
 function invoices(){const d=drafts.invoice;
  return `<section class="card"><h2>Faktury sprzedaży i zakupu</h2><p class="muted">Tworzysz dokumenty fikcyjne. 0%, ZW i NP to odrębne kody. Wybrana stawka jest założeniem zadania, nie automatyczną kwalifikacją podatkową.</p><div class="actions">${button('new-sale','Nowa sprzedaż')}${button('new-purchase','Nowy zakup')}</div><form data-form="invoice"><fieldset ${!canWrite||busy?'disabled':''}><div class="row">${input('invoice','number','Numer ćwiczeniowy',d.number,'text','maxlength="64"')}${input('invoice','party',d.kind==='sale'?'Fikcyjny nabywca':'Fikcyjny dostawca',d.party,'text','maxlength="120"')}</div><div class="row">${input('invoice','party_address','Adres fikcyjnego kontrahenta',d.party_address||'','text','maxlength="200"')}${input('invoice','party_nip','Fikcyjny NIP (bez NIP dla konsumenta)',d.party_nip||'','text','inputmode="numeric" maxlength="20"')}${select('invoice','party_kind','Rodzaj nabywcy',d.kind==='purchase'?'business':d.party_kind||'business',d.kind==='purchase'?[['business','Dostawca — firma']]:[['business','Firma'],['consumer','Konsument']])}</div><div class="row">${input('invoice','date','Data dokumentu',d.date,'date')}${input('invoice','due','Termin płatności',d.due,'date')}</div>${d.lines.map((l,n)=>`<div class="line">${input('invoice',`lines.${n}.label`,'Opis',l.label,'text','maxlength="200"')}${input('invoice',`lines.${n}.qty`,'Ilość',l.qty,'text','inputmode="decimal"')}${input('invoice',`lines.${n}.price`,'Cena netto',l.price,'text','inputmode="decimal"')}${select('invoice',`lines.${n}.code`,'Kod VAT',l.code,['23','8','5','0','ZW','NP'].map(v=>[v,v]))}${button('remove-invoice-line','Usuń',String(n))}</div>`).join('')}<div class="actions">${button('add-invoice-line','Dodaj pozycję')}<button type="submit" name="intent" value="draft">Zapisz szkic</button><button class="primary" type="submit" name="intent" value="issued">Wystaw w ćwiczeniu</button></div></fieldset></form><p class="notice">Pełne powiązanie faktury z jedną firmą wymaga najpierw sprawdzonej <a href="/dane-biura">karty firmy</a>, adresu kontrahenta i NIP firmy. Bez karty jest to wyłącznie starsze ćwiczenie podstawowe, niezaliczane do pełnego zamknięcia miesiąca.</p><p class="small muted">Pola formularza są zapisywane lokalnie na tym urządzeniu. „Zapisz szkic” lub „Wystaw” zapisuje dokument na koncie. Wystawionego dokumentu nie nadpisujemy.</p></section><section class="card"><h2>Zapisane dokumenty (${ws.state.invoices.length})</h2>${ws.state.invoices.length?table(['Numer / data','Kontrahent','Netto / VAT / brutto','Status','Działania'],ws.state.invoices.map(i=>`<tr><td>${e(i.number)}<br>${e(i.date)}</td><td>${e(i.party)}</td><td class="amount">${money(i.net_cents)}<br>${money(i.tax_cents)}<br><strong>${money(i.gross_cents)}</strong></td><td>${i.status==='issued'?'Wystawiony':'Szkic'}</td><td>${i.status==='draft'?button('edit-invoice','Otwórz szkic',i.id):button('journal-invoice','Zaksięguj',i.id)} ${button('print-invoice','Podgląd / druk',i.id)}</td></tr>`)):'<p class="empty">Pierwsza faktura pojawi się tutaj po zapisaniu.</p>'}</section>`;
 }
 function bank(){return `<section class="card"><h2>Import wyciągu ćwiczeniowego</h2><p>Najpierw wybierz plik, sprawdź podgląd i dopiero potem zapisz operacje. Format: <strong>id;data;kwota;opis</strong>. Wpływy dodatnie, wydatki ujemne; waluta PLN.</p><p class="notice">Używaj fikcyjnych danych, nie rzeczywistych wyciągów klientów. Plik jest odczytywany w przeglądarce; do Twojej bazy trafiają tylko zatwierdzone pozycje. Nie łączymy się z bankiem.</p><div class="actions">${button('template','Pobierz przykładowy CSV')}</div><label for="lab-file">Wybierz CSV (maks. 1 MB)</label><input id="lab-file" type="file" accept=".csv,text/csv" ${!canWrite||busy?'disabled':''}>${preview?`<h3>Podgląd: ${preview.rows.length} nowych, ${preview.skipped} identycznych pominiętych</h3>${preview.errors.length?`<div class="error">${preview.errors.slice(0,15).map(x=>`Wiersz ${x.row}: ${e(x.message)}`).join('<br>')}<br>Import jest zablokowany do poprawienia błędów.</div>`:''}${table(['ID','Data','Opis','Kwota'],preview.rows.slice(0,20).map(b=>`<tr><td>${e(b.id)}</td><td>${e(b.date)}</td><td>${e(b.description)}</td><td class="amount">${money(b.amount_cents)}</td></tr>`))}<p class="small">Podgląd pokazuje pierwszych 20 nowych operacji.</p><button data-action="import-bank" ${preview.errors.length||!preview.rows.length||!canWrite?'disabled':''} class="primary">Zatwierdź import ${preview.rows.length} pozycji</button>`:''}</section><section class="card"><h2>Zapisane operacje (${ws.state.bank.length})</h2>${table(['ID / data','Opis','Kwota','Działanie'],ws.state.bank.map(b=>`<tr><td>${e(b.id)}<br>${e(b.date)}</td><td>${e(b.description)}</td><td class="amount">${money(b.amount_cents)}</td><td>${button('journal-bank','Zaksięguj',b.id)}</td></tr>`))}</section>`;}
 function journal(){const d=drafts.journal;const source=ws.state.invoices.find(i=>i.id===d.source_id),expected=source?expectedInvoiceLines(source):null;
  return `<section class="card"><h2>Dziennik Wn / Ma</h2><p class="muted">Plan kont jest dydaktyczny. Równe strony nie gwarantują właściwego konta. Szkic może zawierać błąd; zatwierdzony zapis musi się bilansować.</p>${button('new-journal','Nowy zapis ręczny')}<form data-form="journal"><fieldset ${!canWrite||busy?'disabled':''}><p>Źródło: <strong>${e(d.source_type==='manual'?'zapis ręczny':d.source_type==='invoice'?'faktura '+(source?.number||d.source_id):'bank '+d.source_id)}</strong></p><div class="row">${input('journal','date','Data księgowania',d.date,'date')}${input('journal','memo','Opis zapisu',d.memo,'text','maxlength="300"')}</div>${d.lines.map((l,n)=>`<div class="journal-line">${select('journal',`lines.${n}.account`,'Konto',l.account,Object.entries(ACCOUNTS).map(([v,n])=>[v,v+' — '+n]))}${input('journal',`lines.${n}.debit`,'Wn (zł)',l.debit,'text','inputmode="decimal"')}${input('journal',`lines.${n}.credit`,'Ma (zł)',l.credit,'text','inputmode="decimal"')}${button('remove-journal-line','Usuń',String(n))}</div>`).join('')}<div class="actions">${button('add-journal-line','Dodaj wiersz')}<button type="submit" name="intent" value="draft">Zapisz szkic</button><button type="submit" name="intent" value="posted" class="primary">Sprawdź i zatwierdź</button></div></fieldset></form>${expected?`<details><summary>Anielka: pokaż tok rozwiązania dla tego modelu</summary><p>Zakładamy zwykłą sprzedaż usług lub zakup usługi kosztowej z pełnym odliczeniem VAT. Nie stosuj tego schematu automatycznie do zapasów, środków trwałych i innych wyjątków.</p>${table(['Konto','Wn','Ma'],expected.map(l=>`<tr><td>${l.account} — ${e(ACCOUNTS[l.account])}</td><td>${money(l.debit)}</td><td>${money(l.credit)}</td></tr>`))}</details>`:''}</section><section class="card"><h2>Zapisane księgowania</h2>${ws.state.journals.map(j=>{const t=journalTotals(j);return `<details><summary>${e(j.date)} · ${e(j.memo||j.id)} · ${j.status==='posted'?'zatwierdzony':'szkic'} · Wn ${money(t.debit)} / Ma ${money(t.credit)}</summary>${table(['Konto','Wn','Ma'],j.lines.map(l=>`<tr><td>${l.account} — ${e(ACCOUNTS[l.account])}</td><td>${money(l.debit)}</td><td>${money(l.credit)}</td></tr>`))}${j.status==='draft'?button('edit-journal','Otwórz szkic',j.id):!j.reversal_of&&!ws.state.journals.some(r=>r.reversal_of===j.id)?button('reverse','Wykonaj storno',j.id):'<p class="small">Powiązane storno zachowano w historii.</p>'}</details>`}).join('')||'<p class="empty">Zapisz pierwszy szkic księgowania.</p>'}</section>`;
 }
 function matches(){const s=ws.state,d=drafts.match;const due=i=>i.gross_cents-s.matches.filter(m=>m.invoice_id===i.id).reduce((a,m)=>a+m.amount_cents,0),remain=b=>Math.abs(b.amount_cents)-s.matches.filter(m=>m.bank_id===b.id).reduce((a,m)=>a+m.amount_cents,0);
  return `<section class="card"><h2>Powiąż przelew z fakturą</h2><p class="muted">Możesz częściowo rozliczać faktury i dzielić przelew, ale łączna kwota nie może przekroczyć wartości faktury ani operacji bankowej. Wpływ (+) dotyczy sprzedaży, wydatek (−) zakupu. Przypisanie zapłaty nie zastępuje księgowania w dzienniku.</p><form data-form="match"><fieldset ${!canWrite||busy?'disabled':''}><div class="row">${select('match','bank_id','Operacja bankowa',d.bank_id,[['','Wybierz operację'],...s.bank.filter(b=>remain(b)>0&&bankRowAvailableForInvoice(s,b.id)).map(b=>[b.id,`${b.id}: ${money(b.amount_cents)}; pozostało ${money(remain(b))}`])])}${select('match','invoice_id','Faktura',d.invoice_id,[['','Wybierz fakturę'],...s.invoices.filter(i=>i.status==='issued'&&due(i)>0).map(i=>[i.id,`${i.number}: pozostało ${money(due(i))}`])])}${input('match','amount','Przypisywana kwota (zł)',d.amount,'text','inputmode="decimal"')}</div><div class="actions"><button type="submit" class="primary">Zapisz powiązanie</button></div></fieldset></form></section><section class="card"><h2>Pozostałe salda</h2>${table(['Faktura','Rodzaj','Brutto','Pozostało'],s.invoices.filter(i=>i.status==='issued').map(i=>`<tr><td>${e(i.number)}</td><td>${i.kind==='sale'?'Należność':'Zobowiązanie'}</td><td>${money(i.gross_cents)}</td><td>${money(due(i))}</td></tr>`))}<h3>Powiązane płatności</h3>${table(['Bank','Faktura','Kwota','Korekta przypisania'],s.matches.map(m=>`<tr><td>${e(m.bank_id)}</td><td>${e(s.invoices.find(i=>i.id===m.invoice_id)?.number||m.invoice_id)}</td><td>${money(m.amount_cents)}</td><td>${button('unmatch','Cofnij powiązanie',m.id)}</td></tr>`))}</section>`;
 }
 function report(){
  const audit=taxCloseTrainingAudit(ws.state,scenario),fin=audit.training_result;
  const reviewed=audit.checks.filter(c=>c.passed).length;
  const pending=audit.next_actions[0];
  const r=balanceReport(ws.state);
  const hasPostings=Array.isArray(ws.state.journals)&&ws.state.journals.some(j=>j.status==='posted');
  const firstAction=!pending?'':pending.href
   ?'<p class="actions"><a href="'+e(pending.href)+'">Otwórz pierwszy brakujący etap: '+e(pending.title)+'</a></p>'
   :pending.tab?'<div class="actions">'+button('tab','Przejdź dalej: '+pending.title,pending.tab,'primary')+'</div>':'';
  const rawLedger=hasPostings
   ?'<details><summary>Rozwiń roboczy dziennik kont i obroty Wn / Ma</summary>'+
    '<p class="muted">To techniczny widok zapisanych dekretów, również storn. Równe sumy Wn i Ma nie potwierdzają prawidłowości źródeł, kompletności miesiąca, podatków ani rozrachunków.</p>'+
    table(['Konto','Obroty Wn','Obroty Ma','Saldo Wn','Saldo Ma'],
      r.accounts.filter(a=>a.debit!==0||a.credit!==0).map(a=>
       '<tr><td>'+e(a.code)+' — '+e(a.name)+'</td><td>'+money(a.debit)+
       '</td><td>'+money(a.credit)+'</td><td>'+money(Math.max(0,a.balance))+
       '</td><td>'+money(Math.max(0,-a.balance))+'</td></tr>'))+
    '<p>Robocze obroty: Wn '+money(r.debit)+'; Ma '+money(r.credit)+
    (r.debit===r.credit?' (kwoty równe, ale niezatwierdzone źródłowo).':' (różnica — przejrzyj dekrety).')+
    '</p></details>'
   :'<p class="notice">Nie ma jeszcze zatwierdzonych dekretów. Najpierw wystaw fikcyjne dokumenty i wykonaj zapisy Wn/Ma. Brak dokumentów to nie wynik 0 zł.</p>';
  return '<section class="card"><h2>Wynik ćwiczenia — bez zgadywania</h2>'+
   '<p class="'+(audit.ready_for_training_review?'notice':'error')+'"><strong>Kontrole techniczne: '+
     reviewed+'/'+audit.checks.length+'.</strong> '+
     (audit.ready_for_training_review
       ?'Dane fikcyjnego miesiąca można przekazać do niezależnego przeglądu. To nie jest zamknięcie urzędowe.'
       :'Część źródeł lub etapów jest niegotowa. Liczby poniżej pojawią się dopiero po ich uzgodnieniu.')+
   '</p><div class="stats">'+
    '<div class="stat">Wynik ćwiczeniowy (nie podatek)<strong>'+formatReviewMoney(fin.profit_or_loss_cents)+'</strong></div>'+
    '<div class="stat">Różnica VAT w modelu (nie do zapłaty)<strong>'+formatReviewMoney(audit.figures.vat_difference_cents)+'</strong></div>'+
    '<div class="stat">Zmiana banku z CSV (bez salda otwarcia)<strong>'+formatReviewMoney(fin.bank_net_movement_cents)+'</strong></div>'+
   '</div><p class="muted">BRAK WIARYGODNYCH DANYCH oznacza brak potwierdzonych źródeł, nie wartość zerową. Rozrachunki, podatki i wynik mogą wymagać dodatkowych dokumentów oraz niezależnej kontroli.</p>'+
   firstAction+rawLedger+'</section>';
 }

 function taxAndCloseCard(){
  const audit=taxCloseTrainingAudit(ws.state,scenario),f=audit.figures,fin=audit.training_result;
  const checks=audit.checks.map(x=>'<tr><td>'+e(x.label)+'</td><td>'+
    (x.passed?'Zgodne w modelu':'Do wykonania')+'</td><td>'+e(x.detail)+'</td></tr>');
  const important=audit.next_actions.slice(0,3).map(x=>'<li><strong>'+e(x.title)+'</strong> — '+e(x.instruction)+
    (x.href?'<p><a href="'+e(x.href)+'">Otwórz właściwe miejsce ćwiczenia</a></p>':
     x.tab?'<p>'+button('tab','Przejdź do ćwiczenia',x.tab)+'</p>':'')+'</li>').join('');
  const issues=audit.issues.map(x=>'<li>'+e(x.code)+' — '+e(x.invoice)+'</li>').join('');
  return '<section class="card"><span class="pill">SZKIC ROZLICZENIA · BEZ WYSYŁKI</span>'+
   '<h2>Jeden miesiąc: kontrola przed KSeF / JPK / UPO</h2>'+
   '<p class="error"><strong>Żaden dokument urzędowy nie został utworzony ani wysłany.</strong> '+
    e(audit.disclaimer)+'</p>'+
   '<p><strong>Okres ćwiczeniowy:</strong> '+e(audit.period||'nieustalony')+
    ' · <strong>Faktury:</strong> '+audit.source_count+'</p>'+
   '<div class="stats"><div class="stat">Sprzedaż netto<strong>'+formatReviewMoney(f.sale_net_cents)+'</strong></div>'+
    '<div class="stat">VAT z fikcyjnych faktur sprzedaży<strong>'+formatReviewMoney(f.sale_vat_cents)+'</strong></div>'+
    '<div class="stat">VAT z fikcyjnych faktur zakupu<strong>'+formatReviewMoney(f.purchase_vat_cents)+'</strong></div></div>'+
   '<p class="notice">Różnica VAT z dokumentów modelu: <strong>'+formatReviewMoney(f.vat_difference_cents)+
    '</strong>. To nie jest deklaracja ani wynik podatkowy bez kwalifikacji prawnej.</p>'+
   '<p class="'+(audit.vat_ledger.matching?'notice':'error')+'">VAT w dzienniku: 222 — '+formatReviewMoney(audit.vat_ledger.matching?audit.vat_ledger.sales_cents:null)+
    ', 221 — '+formatReviewMoney(audit.vat_ledger.matching?audit.vat_ledger.purchases_cents:null)+
    '. '+(audit.vat_ledger.matching?'Kwoty zgodne z fakturami w modelu.':'Różnica z fakturami — nie przechodź do recenzji.')+
    ' Kwalifikację podatkową sprawdza osobno księgowy.</p>'+
   '<h3>Od czego zacząć? Twoje trzy najbliższe kroki</h3>'+
   (important?'<ol>'+important+'</ol><p class="muted">Wszystkich nierozwiązanych kontroli: '+audit.next_actions.length+'. Pełna lista jest poniżej.</p>':
    '<p class="notice">Kontrole modelu zaliczone; nie jest to odbiór księgowy ani wysyłka do urzędu.</p>')+
   '<h3>Wynik i płynność — jeden okres fikcyjnej firmy</h3>'+
   '<p class="muted">Przychody z konta 700, koszty z kont 400/401/404/761. Przepływy z CSV; '+
    'bez salda otwarcia, kwalifikacji podatkowej i rzeczywistej wysyłki. '+
    (fin.status==='source_reconciled_training'?'Wszystkie źródła ćwiczenia uzgodnione; nadal wymagana recenzja.'
    :fin.status==='bank_and_journal_reconciled_training'?'Bank i dziennik są zgodne; pozostałe dokumenty i moduły wymagają kontroli.'
    :'Dane wymagają uzgodnienia.')+'</p>'+
   table(['Kontrola okresu','Kwota w modelu'],[
    '<tr><td>Przychody</td><td>'+formatReviewMoney(fin.revenue_cents)+'</td></tr>',
    '<tr><td>Koszty</td><td>'+formatReviewMoney(fin.expense_cents)+'</td></tr>',
    '<tr><td>'+e(fin.result_label)+'</td><td>'+formatReviewMoney(fin.profit_or_loss_cents)+'</td></tr>',
    '<tr><td>Wpływy bankowe CSV</td><td>'+formatReviewMoney(fin.bank_inflow_cents)+'</td></tr>',
    '<tr><td>Wypływy bankowe CSV</td><td>'+formatReviewMoney(fin.bank_outflow_cents)+'</td></tr>',
    '<tr><td>Zmiana banku w okresie</td><td>'+formatReviewMoney(fin.bank_net_movement_cents)+'</td></tr>'
   ])+
   '<h3>Wykaz źródeł miesiąca</h3><p class="muted">Liczba dekretów nie potwierdza poprawności ani prawa do odliczenia VAT.</p>'+
   table(['Numer','Rodzaj','Data','Netto','VAT','Brutto','Dekrety'],audit.source_inventory.map(i=>
    '<tr><td>'+e(i.number||i.id)+'</td><td>'+e(i.kind)+'</td><td>'+e(i.date)+'</td>'+
    '<td>'+(i.net_cents===null?'brak':money(i.net_cents))+'</td>'+
    '<td>'+(i.vat_cents===null?'brak':money(i.vat_cents))+'</td>'+
    '<td>'+(i.gross_cents===null?'brak':money(i.gross_cents))+'</td><td>'+i.journal_count+'</td></tr>'))+
   '<h3>Sprawdź dane przed przejściem do kolejnego ćwiczenia</h3>'+
   table(['Warunek','Wynik szkoleniowy','Następny krok'],checks)+
   (issues?'<details><summary>Wykryte problemy w dokumentach ('+audit.issues.length+
     ')</summary><ul>'+issues+'</ul></details>':'')+
   (audit.review_notes.length?'<p class="muted">'+e(audit.review_notes.join(' '))+'</p>':'')+
   '<h3>Dokumenty urzędowe — wyłącznie etapy edukacyjne</h3>'+
   table(['Etap','Status','Co to oznacza'],[
    '<tr><td>KSeF</td><td>NIE WYSŁANO</td><td>Wyłącznie liczba faktur sprzedaży: '+
     audit.draft_documents.ksef.source_invoice_count+'; brak pliku i identyfikatora KSeF</td></tr>',
    '<tr><td>JPK</td><td>NIE WYGENEROWANO</td><td>Sumy ćwiczeniowe, bez obowiązującego schematu i weryfikacji pól</td></tr>',
    '<tr><td>UPO</td><td>NIE WYDANO</td><td>Nie wolno udawać potwierdzenia odbioru urzędowego</td></tr>'
   ])+
   '<p class="'+(audit.ready_for_training_review?'notice':'error')+'">'+
    (audit.ready_for_training_review?'Dane modelu gotowe do odrębnej recenzji. Nie jest to zamknięcie urzędowe.':
    'Najpierw uzupełnij brakujące etapy. Rozliczenia urzędowe i prawne pozostają poza tą wersją symulacji.')+
   '</p><div class="actions">'+button('tax-close-export','Pobierz raport kontrolny do druku (HTML)')+'</div></section>';
 }

 function finalPracticeCard(){
  const grade=gradeFinalPractice(ws.state),answers=readFinalPractice(ws.state);
  const close=taxCloseTrainingAudit(ws.state,scenario);
  const questions=FINAL_PRACTICE_QUESTIONS.map((q,n)=>{
   const id='final-practice-'+q.id;
   const input=q.kind==='choice'
    ?'<select id="'+id+'" name="'+q.id+'" required><option value="">Wybierz odpowiedź</option>'+
      q.options.map((option,i)=>'<option value="'+i+'" '+(answers[q.id]===String(i)?'selected':'')+'>'+e(option)+'</option>').join('')+'</select>'
    :'<input id="'+id+'" name="'+q.id+'" type="text" inputmode="decimal" maxlength="30" value="'+e(answers[q.id]||'')+'" placeholder="Wpisz kwotę w złotych, np. 984" required>';
   return '<div class="hint"><label for="'+id+'">'+(n+1)+'. '+e(q.title)+': '+e(q.question)+'</label>'+input+'</div>';
  }).join('');
  const result=grade.attempted?'<p class="'+(grade.passed?'notice':'error')+'"><strong>Własny sprawdzian: '+grade.correct+'/'+grade.total+
    ' poprawnych.</strong> '+(grade.passed?'Wszystkie odpowiedzi w tym ćwiczeniu są poprawne.':'Przeczytaj wyjaśnienia i popraw odpowiedzi.')+'</p>'+
    grade.cases.filter(c=>c.attempted).map(c=>
      '<details><summary>'+e(c.title)+' — '+(c.correct?'poprawnie':'wymaga poprawy')+'</summary><p>'+e(c.why)+'</p></details>').join(''):'';
  const scope=grade.passed&&close.ready_for_training_review
    ?'<p class="notice">Ćwiczenie końcowe i kontrole fikcyjnego miesiąca przeszły. Możesz pobrać raport do niezależnego przeglądu; nie jest to dyplom ani urzędowe zamknięcie.</p>'
    :'<p class="muted">Do samodzielnego domknięcia nauki wymagane są dwie oddzielne rzeczy: poprawny sprawdzian (8 pytań) oraz komplet kontroli fikcyjnego miesiąca ('+
       close.checks.filter(c=>c.passed).length+'/'+close.checks.length+'). Braki można poprawiać bez kasowania danych biura.</p>';
  return '<section class="card" data-testid="accounting-final-practice"><span class="pill">POWTÓRKA KOŃCOWA · 8 PYTAŃ</span>'+
   '<h2>Samodzielny sprawdzian księgowego</h2><p>Przećwicz rozumienie dokumentów, banku, Wn/Ma, VAT, majątku i korekt. To zadanie prywatne, bez wysyłania dokumentów do urzędów. Odpowiedzi zostają zapisane w Twoim biurze po kliknięciu przycisku. Nie stanowi automatycznie zaliczenia kursu ani dyplomu.</p>'+
   '<form data-form="final-practice"><fieldset '+(!canWrite||busy?'disabled':'')+'>'+questions+
   '<div class="actions"><button type="submit" class="primary">Sprawdź i zapisz osiem odpowiedzi</button></div></fieldset></form>'+
   result+scope+'</section>';
 }

 function lifecycleRoadmap(){
  const audit=auditCompanyLifecycle(ws.state,scenario);
  const labels={passed_training:'Zapisane i sprawdzone w ćwiczeniu',needs_work:'Do wykonania',not_implemented:'Brak pełnej funkcji'};
  // Każdy etap prowadzi do istniejącego modułu, także ostatni, którego
  // część urzędowa NIE jest zaimplementowana. Przycisk otwiera tylko raport.
  const go=step=>{
   if(step.status==='passed_training')return '<span class="muted">Etap już sprawdzony</span>';
   const label=step.status==='not_implemented'?'Zobacz kontrolę szkoleniową':'Otwórz etap';
   if(step.href)return '<a href="'+e(step.href)+'">'+e(label)+'</a>';
   if(step.tab)return button('tab',label,step.tab);
   return '<span class="muted">Brak samodzielnego ekranu</span>';
  };
  const rows=audit.steps.map((step,index)=>
   '<tr><td>'+(index+1)+'. '+e(step.label)+'</td><td>'+e(labels[step.status])+
   '</td><td>'+e(step.detail)+'</td><td>'+go(step)+'</td></tr>');
  const next=audit.steps.find(x=>x.status==='needs_work'||x.status==='not_implemented');
  const jump=next?.href?'<a href="'+e(next.href)+'">Otwórz kolejny etap →</a>':
   next?.tab?button('tab',next.status==='not_implemented'?
    'Zobacz kontrolę szkoleniową — bez wysyłki':'Otwórz kolejny etap',next.tab,'primary'):'';
  return '<section class="card"><h2>Jedna ścieżka: co naprawdę jest zrobione?</h2>'+
   '<p><strong>'+audit.finished_training_stages+'/'+audit.stage_count+'</strong> elementów praktyki potwierdzonych na podstawie zapisów. To nie jest procent gotowości kursu ani odbiór księgowy.</p>'+
   '<p class="notice"><strong>Okres biura:</strong> '+e(audit.period_scope.month||'nieustalony')+
   ' (miesiąc daty wystawienia faktur; tylko umowa zadania, nie kwalifikacja podatkowa). Zakup, sprzedaż, zapłaty, płace i majątek są zaliczane wyłącznie w ramach wskazanego miesiąca.</p>'+
   table(['Etap','Status','Co oznacza','Działanie'],rows)+
   '<p class="error">'+e(audit.warning)+'</p>'+
   '<p class="muted">Zamknięcie, KSeF/JPK/UPO, prawdziwy E2E dwóch kont, RLS, recenzja eksperta i odtworzenie backupu wymagają osobnych testów.</p>'+
   (jump?'<div class="actions">'+jump+'</div>':'')+'</section>';
 }
 function start(){return lifecycleRoadmap()+ `<section class="card"><span class="pill">Rola: księgowy małej firmy usługowej</span><h2>Twój pierwszy okres w biurze</h2><p>Okres ćwiczeniowy: <strong>${e(trainingPeriod())}</strong>. Prowadzisz fikcyjną firmę usługową. Właściciel zostawił Ci sprzedaż, zakup i dwa przelewy. Twoim zadaniem jest wystawić dokument, zaksięgować go, rozliczyć zapłatę i uzgodnić wynik.</p><ol><li><strong>Sprzedaż:</strong> fikcyjny klient kupił usługę za 1000 zł netto; w zadaniu przyjmij VAT 23%. Wystaw CW/FV/1 na 1230 zł.</li><li><strong>Zakup usługi:</strong> fikcyjny dostawca naliczył 200 zł netto i 46 zł VAT. W zadaniu przyjmujemy pełne odliczenie. Dokument CW/ZAK/1: 246 zł.</li><li><strong>Dziennik:</strong> zapisz obie operacje po Wn i Ma. Najpierw możesz zapisać szkic.</li><li><strong>Bank:</strong> pobierz przykładowy CSV, sprawdź go i zaimportuj. Powiąż +1230 zł ze sprzedażą, a −246 zł z zakupem.</li><li><strong>Rozliczenie:</strong> zaksięguj przelewy oddzielnie. Uzgodnij bank, należności, zobowiązania, wynik i VAT ćwiczeniowy.</li></ol><details><summary>Sprawdź oczekiwany wynik po wykonaniu wszystkich kroków</summary><p>Bank 984 zł; wynik modelu 800 zł; VAT ćwiczeniowy 184 zł; należności i zobowiązania 0 zł. Równość stron nie zastępuje sprawdzenia kont.</p></details><div class="actions">${button('tab','Rozpocznij od faktury','invoices','primary')}${button('template','Pobierz wyciąg do zadania')}</div></section><section class="card"><h3>Co zostaje na Twoim koncie?</h3><p>Każda zapisana faktura, pozycja wyciągu, księgowanie i powiązanie płatności. Do tego wersja zapisu oraz historia zmian. Powrót do biura odczytuje Twoją bazę, a nie zaczyna zadania od zera.</p><p class="muted">Pracownia jest odrębna od prawdziwej księgowości. Nie wysyła faktur do kontrahentów, KSeF, banku ani urzędu. Karta płac jest ćwiczeniem z ręcznie wpisywanymi potrąceniami, nie naliczeniem ZUS/PIT. Rzeczywiste deklaracje, korekty faktur i inne waluty nie są obsługiwane.</p></section>`;}

 function bankExercise(){
  if(!scenario||!ws)return '';
  const saved=readBankExercise(ws.state),result=checkBankExercise(scenario,saved);
  const val=key=>bankDraft?bankDraft[key]:(saved?decimal(saved[key]):'');
  const feedback=result.attempted?'<p class="'+(result.correct?'notice':'error')+'">'+
   e(result.correct?'Wszystkie trzy kwoty się zgadzają. To zaliczenie uzgodnienia przepływów, nie księgowań ani zamknięcia miesiąca.':
   'Sprawdź sumy. '+result.checks.filter(x=>!x.correct).map(x=>({
    bank_in_cents:'Wpływy: pomiń faktury i dokumenty formalne.',
    bank_out_cents:'Wypływy: zlicz przelewy wychodzące jako dodatnią sumę.',
    bank_net_cents:'Zmiana banku: wpływy minus wypływy.'
   })[x.key]).join(' ')+(result.consistent?'':' Dodatkowo wpisane sumy nie spełniają równania wpływy − wypływy = zmiana banku.'))+
   '</p>':'<p class="muted">Oblicz najpierw samodzielnie, a następnie zapisz trzy kwoty do sprawdzenia.</p>';
  return '<section class="card"><span class="pill">ETAP 2 · UZGODNIENIE BANKU</span><h2>Wylicz zmianę stanu rachunku</h2>'+
   '<p>Przejrzyj 36 dokumentów. Do sum wpływów i wypływów wliczaj wyłącznie potwierdzone operacje bankowe. Same faktury, umowy, magazyn i naliczenia nie stanowią ponownego przepływu. Wpisz sumy dodatnie, a zmianę rachunku ze znakiem. To nie jest saldo końcowe — nie znamy salda otwarcia.</p>'+
   '<div class="row"><div><label for="sim-bank-in">Wpływy łącznie (PLN)</label><input id="sim-bank-in" type="text" inputmode="decimal" autocomplete="off" placeholder="0,00" value="'+e(val('bank_in_cents'))+'"></div>'+
   '<div><label for="sim-bank-out">Wypływy łącznie (PLN, dodatnio)</label><input id="sim-bank-out" type="text" inputmode="decimal" autocomplete="off" placeholder="0,00" value="'+e(val('bank_out_cents'))+'"></div>'+
   '<div><label for="sim-bank-net">Zmiana rachunku (PLN)</label><input id="sim-bank-net" type="text" inputmode="decimal" autocomplete="off" placeholder="0,00" value="'+e(val('bank_net_cents'))+'"></div></div>'+
   '<div class="actions">'+button('sim-bank-save','Sprawdź i zapisz uzgodnienie','','primary')+'</div>'+feedback+
   '<p class="notice">Powiąż D01–D36 z biurem: pobierz fikcyjny CSV z ID Dxx, zaimportuj go do zakładki Wyciąg bankowy i zaksięguj każdy przelew. Pracuj w jednym okresie.</p>'+
   '<div class="actions">'+button('sim-bank-csv','Pobierz CSV D01–D36')+button('tab','Otwórz import CSV','bank')+'</div>'+
   '<p class="small muted">Próby zapisane na koncie: '+(saved?.attempts||0)+'. Zapis używa kontroli wersji i nie zmienia zaksięgowanych operacji w dzienniku. Nadal wymagany jest test na dwóch zalogowanych kontach.</p></section>';
 }


 function getJournalDraft(id){
  if(!Object.prototype.hasOwnProperty.call(journalDrafts,id)){
   const saved=readJournalAttempts(ws.state,scenario)[id];
   journalDrafts[id]=saved?.lines.length?saved.lines.map(x=>({account:x.account,debit:decimal(x.debit_cents),credit:decimal(x.credit_cents)})):
    [{account:'',debit:'0',credit:'0'},{account:'',debit:'0',credit:'0'}];
  }
  return journalDrafts[id];
 }
 function nextUnresolvedDocument(current,stage){
  if(!scenario||!ws)return null;
  const docs=scenario.documents;
  if(!Array.isArray(docs)||!docs.length)return null;
  let needsWork;
  if(stage==='journal'){
   const attempts=readJournalAttempts(ws.state,scenario);
   needsWork=d=>!checkJournalAttempt(scenario,d.id,attempts[d.id]).correct;
  }else{
   const answers=readScenarioAnswers(ws.state);
   needsWork=d=>answers[d.id]!==d.kind;
  }
  const start=docs.findIndex(d=>d.id===current)+1;
  return docs.slice(start).find(needsWork)||docs.slice(0,start).find(needsWork)||null;
 }
 function journalPractice(){
  if(!scenario||!ws)return '';
  let model,attempts;
  try{model=readJournalPractice(scenario);attempts=readJournalAttempts(ws.state,scenario);}
  catch{return '<section class="card"><h2>Etap 3 · Dekretacja Wn/Ma</h2><p class="error">Model ćwiczeniowy nie jest kompletny. Poprzednie etapy pozostają dostępne.</p></section>';}
  const summary=journalPracticeSummary(scenario,attempts),doc=scenario.documents.find(d=>d.id===journalDoc)||scenario.documents[0];
  const saved=attempts[doc.id],checked=checkJournalAttempt(scenario,doc.id,saved),draft=getJournalDraft(doc.id);
  const accountOptions=Object.entries(model.accounts);
  const options=scenario.documents.map(d=>'<option value="'+e(d.id)+'" '+(d.id===doc.id?'selected':'')+'>'+e(d.id+' · '+d.title)+'</option>').join('');
  const fields=draft.map((line,i)=>'<div class="journal-line">'+
   '<div><label for="sim-j-account-'+i+'">Konto Wn lub Ma</label><select id="sim-j-account-'+i+'" data-jline="'+i+'" data-jfield="account">'+
   '<option value="">Wybierz konto</option>'+accountOptions.map(([id,label])=>'<option value="'+e(id)+'" '+(id===line.account?'selected':'')+'>'+e(id+' · '+label)+'</option>').join('')+'</select></div>'+
   '<div><label for="sim-j-debit-'+i+'">Wn (PLN)</label><input id="sim-j-debit-'+i+'" data-jline="'+i+'" data-jfield="debit" inputmode="decimal" value="'+e(line.debit)+'"></div>'+
   '<div><label for="sim-j-credit-'+i+'">Ma (PLN)</label><input id="sim-j-credit-'+i+'" data-jline="'+i+'" data-jfield="credit" inputmode="decimal" value="'+e(line.credit)+'"></div>'+
   button('sim-journal-remove','Usuń wiersz',String(i))+'</div>').join('');
  const totals=checked.attempted?'Suma Wn '+money(checked.debit_cents)+' · Ma '+money(checked.credit_cents)+'. ':'';
  const feedback=checked.attempted?'<p class="'+(checked.correct?'notice':'error')+'">'+e(totals+
   (checked.correct?'Prawidłowy dekret w uproszczonym modelu. ' + model.entries[doc.id].explanation:
    !checked.balanced?'Zapis nie jest zbilansowany. Sprawdź strony Wn i Ma.':
    'Strony są równe, ale konto, kwota lub liczba zapisów nie odpowiadają zdarzeniu. Sprawdź, czy nie księgujesz drugi raz przelewu, zaliczki albo dokumentu informacyjnego.'))+'</p>':'<p class="muted">Ustal wpływ zdarzenia na konta. Nie każdy dokument wymaga dekretu.</p>';
  const rows=scenario.documents.map(d=>{const a=attempts[d.id],r=checkJournalAttempt(scenario,d.id,a);return '<tr><td>'+e(d.id)+'</td><td>'+e(d.title)+'</td><td>'+(!r.attempted?'Niepróbowany':r.correct?'Poprawnie':'Do korekty')+'</td></tr>';});
  return '<section class="card"><span class="pill">ETAP 3 · DZIENNIK Wn/Ma W SYMULACJI</span><h2>Zadekretuj dokumenty D01–D36</h2>'+
   '<p>Wybierz konto, stronę Wn lub Ma i kwotę dla każdego wiersza. Wn i Ma muszą się równoważyć, ale sama równość nie wystarczy. To oddzielne ćwiczenie: nie dopisuje automatycznie operacji do Twojego głównego dziennika i nie wysyła nic do urzędów.</p>'+
   '<p class="notice">Odpowiedzi zapisane: <strong>'+summary.attempted+'/36</strong> · poprawne dekrety: <strong>'+summary.correct+'/36</strong>. W modelu '+summary.reference_posts+' dokumentów ma zapis księgowy, a reszta pełni rolę dowodu lub zestawienia.</p>'+
   '<p class="small muted">Po poprawnej dekretacji przejdziesz do następnego niezaliczonego dowodu. W razie błędu pozostaniesz przy bieżącym zadaniu.</p>'+ 
   '<p class="small muted">Fikcyjny plan kont i kwoty bez VAT oraz prawnych naliczeń ZUS/CIT. Nie stosuj tych dekretów do prawdziwej firmy. Wymagana recenzja księgowego i test na dwóch kontach.</p>'+
   '<label for="sim-journal-doc">Wybierz dokument</label><select id="sim-journal-doc">'+options+'</select>'+
   '<div class="card"><h3>'+e(doc.id+' · '+doc.title)+'</h3><p>Data '+e(doc.date)+' · kwota dokumentu '+money(doc.amount_pln*100)+'.</p>'+fields+
   '<div class="actions">'+button('sim-journal-add','Dodaj wiersz')+button('sim-journal-save','Sprawdź i zapisz dekret',doc.id,'primary')+
   button('sim-journal-none','Brak księgowania dla tego dowodu',doc.id)+'</div>'+feedback+
   '<p class="small muted">Wersjonowany zapis na koncie. Liczba prób dokumentu: '+(saved?.tries||0)+'. W razie konfliktu dwóch okien pobierz najnowszy stan.</p></div>'+
   '<details><summary>Lista 36 dokumentów i status dekretacji</summary>'+table(['Dokument','Treść','Status'],rows)+'</details>'+
   '<p class="muted">Następny etap: samodzielne zamknięcie miesiąca, rozrachunki i bilans po pełnym księgowaniu; obecne ćwiczenie nie stanowi jeszcze kompletnego E2E.</p></section>';
 }


 function closingScreen(){
  if(!scenario||!ws)return '';
  let result;
  try{result=journalClosingPreview(scenario,readJournalAttempts(ws.state,scenario));}
  catch{return '';}
  if(result.progress.attempted<36)return '<section class="card"><span class="pill">ETAP 4 · ZAMKNIĘCIE</span><h2>Uzgodnij miesiąc</h2><p>Najpierw zapisz decyzję Wn/Ma lub świadomy brak księgowania dla wszystkich 36 dowodów. Wtedy zobaczysz własne zestawienie obrotów i sald oraz różnice względem modelu.</p><p class="muted">Pozostało dokumentów: '+(36-result.progress.attempted)+'. Ten etap nie jest jeszcze zaliczeniem kursu.</p></section>';
  const rows=result.checks.map(x=>'<tr><td>'+e(x.label)+'</td><td class="amount">'+money(x.actual_cents)+'</td><td class="amount">'+(x.expected_cents===null?'Brak wzorca':money(x.expected_cents))+'</td><td>'+(!x.matches?'Do wyjaśnienia':'Zgodne')+'</td></tr>');
  return '<section class="card"><span class="pill">ETAP 4 · RAPORT KONTROLNY MIESIĄCA</span><h2>Twój próbny bilans i wynik</h2>'+
   '<p>Raport powstaje wyłącznie z Twoich zapisów D01–D36. Zestawienie pokazuje model dydaktyczny bez podatków i nie stanowi sprawozdania finansowego ani zgłoszenia do urzędu.</p>'+
   table(['Pozycja','Z Twoich dekretów','Cel fikcyjnego modelu','Ocena'],rows)+
   '<p class="small">Suma zapisów Wn: '+money(result.debit_cents)+' · Ma: '+money(result.credit_cents)+
   '. Aktywa: '+money(result.assets_cents)+' · zobowiązania: '+money(result.liabilities_cents)+
   ' · kapitał z wynikiem: '+money(result.equity_cents)+'. Różnica bilansowa: '+money(result.balance_diff_cents)+'.</p>'+
   '<p class="'+(result.model_reconciled?'notice':'error')+'">'+e(result.model_reconciled?
    'Wszystkie 36 decyzji i liczby są zgodne z fikcyjnym modelem. To nie jest jeszcze zatwierdzony wynik księgowy ani egzamin końcowy.':
    'Wykryto różnice. Wróć do błędnych dokumentów i popraw konta, strony lub kwoty. Równe sumy Wn/Ma nie gwarantują prawidłowego rozrachunku.')+'</p>'+
   '<p class="muted">Pełny cykl nadal wymaga niezależnego odbioru, testu dwóch kont, kontroli prawnej, początkującego kursanta i odtworzenia backupu.</p></section>';
 }

 function integratedAuditScreen(){
   if(!scenario||!ws)return '';
   let audit;
   try{audit=auditMonthWorkflow(scenario,ws.state);}catch{return '<section class="card"><h2>Etap 5 · Kontrola przekrojowa</h2><p class="error">Brak kompletnych danych ćwiczeniowych. Pozostałe etapy nadal są dostępne.</p></section>';}
   const sourceOK=audit.reference_integrity==='passed';
   const rows=[
    ...audit.checks.map(x=>'<tr><td>'+e(x.label)+'</td><td>'+(x.passed?'Zgodne':'Wymaga pracy')+'</td><td>'+e(x.detail)+'</td></tr>'),
    '<tr><td>Integralność wzorca D01–D36</td><td>'+(sourceOK?'Zweryfikowany technicznie':'Zablokowany')+
    '</td><td>'+e(sourceOK?'Dokumenty źródłowe, konto bankowe 130 i uzgodnienia wzorca są spójne w modelu. Nie jest to przegląd podatkowy ani E2E.':
     'Wykryto '+audit.reference_issues.length+' niespójności wzorca. To nie jest błąd kursanta; zgłoś problem i zachowaj swoje próby.')+'</td></tr>'
   ];
   return '<section class="card"><span class="pill">ETAP 5 · KONTROLA PRZEKROJOWA</span><h2>Czy wszystkie etapy pokazują ten sam miesiąc?</h2>'+
    '<p>Sprawdzamy razem: klasyfikację, przepływy bankowe, dekrety Wn/Ma, zgodność banku z dziennikiem i próbne zamknięcie. Równe strony Wn/Ma nie oznaczają jeszcze poprawnych dokumentów ani zgodności z wyciągiem.</p>'+
    table(['Kontrola','Stan','Co sprawdzić'],rows)+
    '<p class="'+(audit.training_consistent?'notice':'error')+'">'+e(audit.training_consistent?
      'Wewnętrzne etapy są zgodne ('+audit.passed+'/'+audit.total+'). To wyłącznie wynik szkoleniowy, nie ukończenie księgowości ani zatwierdzony egzamin.':
      (audit.reference_integrity==='blocked'?
       'Wzorcowy miesiąc zawiera niespójności i nie może być zaliczony. To problem materiału, nie Twoich odpowiedzi; zgłoś go do TRENERKI. Próby pozostają zapisane.':
       'Zgodnych etapów: '+audit.passed+'/'+audit.total+'. Popraw wskazane różnice przed oceną całości.'))+'</p>'+
    (audit.training_consistent?'<div class="actions">'+button('sim-month-report','Pobierz i wydrukuj raport miesiąca (HTML)')+'</div>':'')+
    '<p class="small muted">Etapy korzystają z osobno zapisanych prób, nie zatwierdzają operacji w rzeczywistym dzienniku. E2E dwóch kont: niewykonany. Odbiór księgowo-prawny: oczekuje. Niezależny test odtworzenia backupu: niewykonany. Bez wysyłki do urzędu, KSeF czy banku.</p></section>';
 }


 function personnel(){
  if(!ws)return '';
  const saved=readPersonnelCases(ws.state),chosen=PERSONNEL_IDS.includes(hrSelected)?hrSelected:'P01';
  const x=hrDraft?.id===chosen?hrDraft:saved[chosen]||{
   id:chosen,fictional_name:'',contract_kind:'indefinite',signed_on:'',starts_on:'',ends_on:'',
   monthly_gross_cents:0,workload_pct:100,notes:'',document_drafts:{}
  };
  const check=personnelDraftReview(saved[chosen]);
  const people=PERSONNEL_IDS.map(id=>{
   const employee=saved[id],r=personnelDraftReview(employee);
   return '<li><strong>'+e(id)+'</strong> — '+e(employee?.fictional_name||'bez zapisu')+
    (r.recorded?' · projekty '+r.drafts_marked+'/'+r.drafts_total:'')+'</li>';
  }).join('');
  const contracts=[['indefinite','Umowa o pracę — czas nieokreślony'],['fixed','Umowa o pracę — czas określony']]
   .map(([v,label])=>'<option value="'+v+'" '+(x.contract_kind===v?'selected':'')+'>'+e(label)+'</option>').join('');
  const flags=Object.entries(PERSONNEL_FLAGS).map(([key,label])=>
   '<label><input type="checkbox" data-hr-flag="'+e(key)+'" '+(x.document_drafts?.[key]?'checked':'')+' /> '+e(label)+' (szkic)</label>'
  ).join('');
  return '<section class="card"><span class="pill">ETAP KADROWY · WERSJA ROBOCZA</span>'+
   '<h2>Przyjmij dwie fikcyjne osoby, a potem zakończ jedną umowę</h2>'+
   '<p>Wybierz P01 lub P02. Wpisz datę podpisania i rozpoczęcia pracy, kwotę, wymiar oraz opcjonalną datę zakończenia. Sprawdź kolejność zdarzeń i przygotuj projekty dokumentów osobno dla każdej osoby. Nie ma tu automatycznych obliczeń PIT, ZUS, ekwiwalentu urlopu ani ustawowych terminów.</p>'+
   '<p class="error">Tylko wymyślone dane. Nie wpisuj prawdziwych nazwisk, PESEL, NIP, numerów rachunków ani dokumentacji pracowników. Nic nie jest wysyłane do urzędu.</p>'+
   '<div class="actions">'+PERSONNEL_IDS.map(id=>button('hr-select','Osoba '+id,id,chosen===id?'active':'')).join('')+'</div>'+
   '<ul>'+people+'</ul>'+
   '<label for="hr-name">Fikcyjne imię i nazwisko</label><input id="hr-name" value="'+e(x.fictional_name)+'" placeholder="Ola Przykładowa" maxlength="80" />'+
   '<label for="hr-contract">Rodzaj ćwiczebnej umowy</label><select id="hr-contract">'+contracts+'</select>'+
   '<div class="row">'+
   '<div><label for="hr-signed">Podpisano</label><input type="date" id="hr-signed" value="'+e(x.signed_on)+'" /></div>'+
   '<div><label for="hr-start">Rozpoczęcie pracy</label><input type="date" id="hr-start" value="'+e(x.starts_on)+'" /></div>'+
   '<div><label for="hr-end">Zakończenie (opcjonalne)</label><input type="date" id="hr-end" value="'+e(x.ends_on)+'" /></div></div>'+
   '<div class="row">'+
   '<div><label for="hr-gross">Fikcyjne brutto / miesiąc, PLN</label><input id="hr-gross" inputmode="decimal" value="'+e(x.monthly_gross_cents?decimal(x.monthly_gross_cents):'')+'" placeholder="5200,00" /></div>'+
   '<div><label for="hr-load">Wymiar ćwiczeniowy</label><select id="hr-load">'+
   [25,50,75,100].map(n=>'<option value="'+n+'" '+(x.workload_pct===n?'selected':'')+'>'+n+'%</option>').join('')+'</select></div></div>'+
   '<h3>Lista projektów dokumentów</h3><p class="small muted">Zaznaczenie znaczy „przygotowałem projekt”, nie „urząd zaakceptował” ani „sprawdzone prawnie”.</p>'+
   '<div class="hr-flags">'+flags+'</div>'+
   '<label for="hr-notes">Notatki z ćwiczenia (bez danych osobowych)</label>'+
   '<textarea id="hr-notes" maxlength="800" rows="3">'+e(x.notes)+'</textarea>'+
   '<div class="actions">'+button('hr-save','Sprawdź daty i zapisz w biurze',chosen,'primary')+'</div>'+
   (check.recorded?'<p class="notice">Zapis P'+e(chosen.slice(1))+' — projekty '+check.drafts_marked+'/'+check.drafts_total+
    '. '+(check.missing.length?'Brakuje: '+e(check.missing.map(k=>PERSONNEL_FLAGS[k]).join(', ')):'Wszystkie znaczniki projektów zaznaczone')+'</p>':
    '<p class="muted">Ta osoba nie została jeszcze zapisana.</p>')+
   '<p class="small muted">Dokumenty faktyczne NOT_VERIFIED; kontrola prawna NOT_TESTED; E2E dwóch kont NOT_TESTED. Każda osoba ma osobny zapis we własnym biurze; istniejące faktury, bank i dekrety są nienaruszone.</p></section>';
 }

 function payroll(){
  if(!ws)return '';
  const people=readPersonnelCases(ws.state),saved=readPayrollPractices(ws.state);
  const chosen=PERSONNEL_IDS.includes(hrSelected)?hrSelected:'P01',person=people[chosen];
  const previous=saved[chosen],review=payrollReview(ws.state,chosen);
  const liquidity=payrollPeriodSummary(ws.state);
  const lifecycle=PERSONNEL_IDS.map(id=>payrollLifecycleChecklist(ws.state,id));
  const lifecycleStateLabels={recorded:'Kartoteka zapisana',missing:'Brak zapisu',
   blocked:'Najpierw wykonaj wcześniejszy etap',pending:'Wymaga działania',
   marked_by_student:'Szkic oznaczony przez ucznia',arithmetically_consistent:'Zgodne liczbowo',
   stale:'Nieaktualne dane',csv_matched:'Zgodne z fikcyjnym CSV',
   amount_reconciled:'Wypłata netto uzgodniona',not_applicable:'Nie dotyczy tego przypadku'};
  const lifecycleRows=lifecycle.flatMap(person=>person.steps.map(step=>'<tr><td>'+e(person.employee_id)+'</td><td>'+e(step.label)+'</td><td>'+e(lifecycleStateLabels[step.status]||'Wymaga kontroli')+'</td><td>'+e(step.detail)+'</td></tr>'));
  const lifecycleNext=lifecycle.map(person=>'<p><strong>'+e(person.employee_id)+':</strong> '+e(person.next_action)+'</p>').join('');
   const posting=payrollJournalPreview(ws.state,chosen);
  const current=payrollDraft?.employee_id===chosen?payrollDraft:previous||{
   employee_id:chosen,period:person?.starts_on?.slice(0,7)||'2026-01',
   gross_cents:person?.monthly_gross_cents||0,social_cents:0,health_cents:0,pit_cents:0,
   other_cents:0,employer_extra_cents:0,paid_cents:0,paid_on:'',bank_transaction_id:''
  };
  const rows=PERSONNEL_IDS.map(id=>{
   const c=saved[id],r=payrollReview(ws.state,id);
   return '<tr><td>'+e(id)+' · '+e(people[id]?.fictional_name||'brak osoby')+'</td>'+
    '<td>'+(c?e(c.period):'brak')+'</td><td>'+(c?money(c.gross_cents):'—')+'</td>'+
    '<td>'+(c?money(r.net_cents):'—')+'</td><td>'+(c?money(r.outstanding_cents):'—')+'</td>'+
    '<td>'+e(c?(r.eligible?'spójne liczbowo, prawo niezweryfikowane':'wymaga aktualizacji kartoteki'):'do wykonania')+'</td></tr>';
  });
  const bankOptions=(Array.isArray(ws.state.bank)?ws.state.bank:[]).filter(item=>Number.isSafeInteger(item?.amount_cents)&&item.amount_cents<0)
    .map(item=>'<option value="'+e(item.id)+'" '+(item.id===current.bank_transaction_id?'selected':'')+'>'+e(item.id)+' · '+e(item.date)+' · '+money(item.amount_cents)+'</option>').join('');
   const bankStatusNames={not_linked:'bez dopasowania',matched_training_csv:'zgodne z fikcyjnym CSV',
    missing_bank_row:'brak pozycji CSV',amount_mismatch:'różna kwota',
    date_mismatch:'różne daty',already_allocated_to_invoice:'pozycja rozliczona z fakturą',
    duplicate_payroll_assignment:'ta sama pozycja dla dwóch osób',
    personnel_stale:'kartoteka zmieniona',no_payroll:'brak karty płac'};
   const bankReview=payrollBankMatch(ws.state,chosen);
   const liquidityRows=liquidity.periods.map(period=>'<tr><td>'+e(period.period)+'</td>'+
   '<td>'+period.employee_count+'</td><td>'+money(period.gross_cents)+'</td>'+
   '<td>'+money(period.net_cents)+'</td><td>'+money(period.paid_cents)+'</td>'+
   '<td>'+money(period.outstanding_cents)+'</td>'+ '<td>'+money(period.training_csv_matched_cents)+'</td>'+
   '<td>'+money(period.total_employer_cost_cents)+'</td></tr>');
  const amountFields=Object.entries(PAYROLL_FIELDS).map(([key,label])=>
   '<div><label for="pay-'+e(key)+'">'+e(label)+' (PLN)</label>'+
   '<input id="pay-'+e(key)+'" inputmode="decimal" value="'+e(decimal(current[key]||0))+'" /></div>').join('');
  return '<section class="card"><span class="pill">ETAP PŁACOWY · WYŁĄCZNIE FIKCYJNA SYMULACJA</span>'+
   '<h2>Oblicz netto, przelew i pozostałą należność dla dwóch osób</h2>'+
   '<p>Najpierw zapisz pracowników w zakładce Kadry. Przepisz kwoty potrąceń ze swojego <strong>fikcyjnego</strong> zadania, bez zgadywania stawek. Sprawdzenie oblicza netto = brutto − potrącenia, saldo do wypłaty = netto − oznaczona wypłata oraz koszt pracodawcy = brutto + dodatkowy koszt płatnika. Wynik nie jest listą płac sporządzoną zgodnie z ustawami.</p>'+
   '<p class="error">Nie wpisuj prawdziwych pracowników ani kwot z ich dokumentacji. Nie obliczamy tutaj obowiązujących składek ZUS/PIT, nie rejestrujemy rzeczywistego przelewu, nie generujemy deklaracji ani nie wysyłamy dokumentów.</p>'+
   '<div class="actions">'+PERSONNEL_IDS.map(id=>button('payroll-select','Osoba '+id,id,id===chosen?'active':'')).join('')+'</div>'+
   (person?
    '<p class="notice">Kartoteka '+e(chosen)+': '+e(person.fictional_name)+
    ' · fikcyjne miesięczne brutto '+money(person.monthly_gross_cents)+
    ' · od '+e(person.starts_on)+(person.ends_on?' do '+e(person.ends_on):' (bez daty zakończenia)')+'</p>'+
    '<div class="row"><div><label for="pay-period">Miesiąc rozliczenia</label>'+
    '<input type="month" id="pay-period" value="'+e(current.period)+'" /></div>'+
    '<div><label>Brutto z kartoteki (nieedytowalne)</label><p><strong>'+money(person.monthly_gross_cents)+'</strong></p></div></div>'+
    '<div class="row">'+amountFields+'</div>'+
    '<div><label for="pay-paid_on">Data ćwiczebnej wypłaty (gdy wypłacono ponad 0)</label>'+
    '<input type="date" id="pay-paid_on" value="'+e(current.paid_on||'')+'" /></div>'+
     '<div><label for="pay-bank_transaction_id">Wybierz jedną pozycję fikcyjnego CSV (opcjonalnie)</label>'+
     '<select id="pay-bank_transaction_id"><option value="">Bez powiązania z wyciągiem</option>'+bankOptions+'</select>'+
     '<p class="small muted">Zaimportuj fikcyjny CSV w zakładce Wyciąg bankowy. Pozycja musi mieć tę samą datę i ujemną kwotę równą oznaczonej wypłacie. Jeden ID nie może służyć fakturze i wynagrodzeniu lub dwóm osobom. To nie jest potwierdzenie prawdziwego banku.</p></div>'+
    '<div class="actions">'+button('payroll-save','Sprawdź bilans i zapisz w prywatnym biurze',chosen,'primary')+'</div>'+
    (review.recorded?'<p class="'+(review.eligible?'notice':'error')+'">Miesiąc '+e(review.payroll_month)+
     ' · potrącenia '+money(review.deductions_cents)+
     ' · netto '+money(review.net_cents)+
     ' · jeszcze do wypłaty '+money(review.outstanding_cents)+
     ' · całkowity koszt modelowy '+money(review.total_employer_cost_cents)+
     '. '+e(review.message)+' CSV: '+e(bankStatusNames[bankReview.status]||bankReview.status)+'.</p>':'<p class="muted">Brak zapisanego rozrachunku. Wpisz fikcyjne dane liczbowe.</p>')
    :'<p class="error">Nie zapisano jeszcze tej osoby w Kadrach. Najpierw utwórz jej fikcyjną kartotekę.</p>')+
   '<h3>Plan dekretacji Wn/Ma — samodzielnie przepisz do dziennika</h3>'+
    '<p class="small muted">To tylko edukacyjna propozycja i przykład planu kont, nie zapis księgowy ani naliczenie składek lub podatku. Sprawdź odbiorców potrąceń i dokumenty źródłowe.</p>'+
    (posting.ready?
     '<h4>Lista płac – ujęcie miesięcznego brutto i ręcznych potrąceń</h4>'+
     table(['Konto i rola','Wn','Ma'],posting.accrual.lines.map(l=>
      '<tr><td>'+e(l.account)+' — '+e(l.label)+'</td><td>'+money(l.debit_cents)+'</td><td>'+money(l.credit_cents)+'</td></tr>'))+
     '<p>Kontrola stron Wn '+money(posting.accrual.debit_cents)+' = Ma '+
      money(posting.accrual.credit_cents)+': '+(posting.accrual.balanced?'zgodne':'do wyjaśnienia')+'.</p>'+
     (posting.payment?'<h4>Wyłącznie gdy wypłata jest dopasowana do fikcyjnego CSV</h4>'+
      table(['Konto i rola','Wn','Ma'],posting.payment.lines.map(l=>
       '<tr><td>'+e(l.account)+' — '+e(l.label)+'</td><td>'+money(l.debit_cents)+'</td><td>'+money(l.credit_cents)+'</td></tr>'))+
      '<p class="small muted">Propozycja dekretu bankowego, a nie już zaksięgowany przelew. Wybierz właściwy dowód w Dzienniku Wn/Ma.</p>'
      :'<p class="error">Brak poprawnego dopasowania wypłaty do fikcyjnego CSV: nie pokazujemy planu księgowania płatności. Wprowadź fikcyjny wyciąg i zweryfikuj datę/kwotę.</p>')+
     (posting.unclassified_employer_cost_cents>0?'<p class="small muted">Dodatkowy koszt pracodawcy '+
      money(posting.unclassified_employer_cost_cents)+
      ' pozostaje bez propozycji konta: najpierw ustal, czego dotyczy i jaka podstawa dokumentowa go potwierdza.</p>':'')+
     '<p class="small muted">Przeniesienie otwiera szkic: sprawdź konta i potwierdź zapis dopiero w Dzienniku. Nie naliczamy automatycznie ZUS/PIT.</p>'+
     button('payroll-to-journal','Przenieś naliczenie jako szkic Wn/Ma',chosen+':accrual')+
     (posting.payment?button('payroll-to-journal','Przenieś wypłatę CSV jako szkic Wn/Ma',chosen+':payment'):'')+
     button('tab','Otwórz pusty dziennik','journal')
    :'<p class="error">'+e(posting.reason)+'</p>')+
    '<h3>Pełniejsza ścieżka: zatrudnienie → płace → CSV → odejście</h3>'+
   '<p>Sprawdź, czego brakuje w kolejnych czynnościach dwóch fikcyjnych pracowników. Zielona kontrola liczb lub zaznaczony szkic nie są potwierdzeniem legalności dokumentów, prawdziwej wypłaty ani końca całego kursu.</p>'+
   table(['Osoba','Etap','Stan ćwiczenia','Co sprawdzić lub zrobić'],lifecycleRows)+lifecycleNext+
   '<p class="small muted">Prawo i formularze: kontrola niewykonana; prawdziwy bank: niezweryfikowany; zapisy Wn/Ma: nie są zatwierdzane przez ten raport; test dwóch zalogowanych kont: niewykonany. Raport tylko odczytuje Twoje fikcyjne biuro, bez zmiany faktur, banku i postępu.</p>'+
   '<h3>Podsumowanie dwóch osób</h3>'+table(['Osoba','Miesiąc','Brutto','Netto','Pozostało','Status'],rows)+
   '<h3>Płynność wypłat według miesiąca</h3>'+
   table(['Miesiąc','Osoby','Brutto','Netto','Oznaczone wypłaty','Pozostało do wypłaty','Powiązane z fikcyjnym CSV','Całkowity koszt modelowy'],liquidityRows)+
   (liquidity.excluded_employee_ids.length?'<p class="error">Nie wliczono nieaktualnych kart płac: '+e(liquidity.excluded_employee_ids.join(', '))+'. Popraw kartoteki przed sumowaniem.</p>':'')+
   '<p class="small muted">Zestawienie grupuje tylko zgodne karty płac i nie łączy okresów. Powiązanie z fikcyjnym CSV sprawdza datę, kwotę i jednorazowość ID. Nie weryfikuje prawdziwego banku, nie księguje przelewu i nie zastępuje rachunku ani dowodu. Potrącenia i koszt pracodawcy nie są automatyczną kalkulacją ZUS/PIT.</p>'+
   '<p class="small muted">Wpisane potrącenia to założenia ćwiczenia, nie obliczone stawki. Bank: NOT_TESTED; prawo pracy, ZUS i PIT: NOT_VERIFIED; dwa konta: NOT_TESTED; odtworzenie kopii: NOT_TESTED. Wersjonowanie i kontrola konfliktu korzystają z istniejącego prywatnego zapisu biura.</p></section>';
 }

 function simulator(){
  if(!scenario)return '<section class="card"><h2>Miesiąc firmy D01–D36</h2><p class="error">'+e(scenarioError||'Zaloguj się i uzyskaj dostęp do kursu, aby otworzyć symulator.')+'</p></section>';
  const docs=scenario.documents,doc=docs.find(d=>d.id===scenarioDoc)||docs[0];
  const answers=readScenarioAnswers(ws.state),summary=scenarioSummary(scenario,answers);
  const previous=answers[doc.id],checked=previous?checkScenarioAnswer(doc,previous):null;
  const docList=docs.map(d=>'<option value="'+e(d.id)+'" '+(d.id===doc.id?'selected':'')+'>'+e(d.id+' · '+d.title)+'</option>').join('');
  const kindList='<option value="">Wybierz rodzaj dokumentu</option>'+Object.entries(CLASS_KINDS).map(([kind,label])=>'<option value="'+e(kind)+'" '+(previous===kind?'selected':'')+'>'+e(label)+'</option>').join('');
  const rows=docs.map(d=>'<tr><td>'+e(d.id)+'</td><td>'+e(d.date)+'</td><td>'+e(d.title)+'</td><td>'+(!answers[d.id]?'Niepróbowany':answers[d.id]===d.kind?'Rozpoznany':'Do poprawy')+'</td></tr>');
  return '<section class="card"><span class="pill">STYCZEŃ 2026 · FIKCYJNA SPÓŁKA</span><h2>Rozpoznaj 36 dokumentów z jednego miesiąca</h2>'+
   '<p>To pierwszy działający etap praktyki: rozpoznanie źródła, a nie kompletne księgowanie ani egzamin. Wszystkie odpowiedzi zapisują się w Twoim prywatnym biurze po naciśnięciu przycisku. Nie wysyłamy nic do banku, KSeF ani urzędu.</p>'+
   '<p class="notice">Odpowiedzi zapisane: <strong>'+summary.attempted+'/36</strong> · poprawnie rozpoznane: <strong>'+summary.correct+'/36</strong>. Nie stanowi to odbioru pełnego symulatora D01–D36.</p>'+
   '<p class="small muted">Po poprawnej odpowiedzi przejdziesz do następnego dokumentu wymagającego pracy. Błędna odpowiedź pozostaje na ekranie do poprawienia.</p>'+ 
   '<label for="sim-doc">Wybierz dokument</label><select id="sim-doc">'+docList+'</select>'+
   '<div class="card"><h3>'+e(doc.id+' · '+doc.title)+'</h3><p>Data: '+e(doc.date)+' · kwota modelowa: '+money(doc.amount_pln*100)+'. Zastanów się, co ten dowód potwierdza. Sam przelew nie jest ponownym przychodem ani kosztem.</p>'+
   '<label for="sim-kind">Jaka jest rola tego dokumentu?</label><select id="sim-kind">'+kindList+'</select><div class="actions">'+
   button('sim-save','Sprawdź i zapisz na koncie',doc.id,'primary')+'</div>'+
   (checked?'<p class="'+(checked.correct?'notice':'error')+'">'+e(checked.correct?'Poprawnie. ':'Spróbuj ponownie. ')+e(checked.message)+'</p>':'')+'</div>'+
   '<details><summary>Spis 36 dokumentów i status Twoich prób</summary>'+table(['ID','Data','Dowód','Klasyfikacja'],rows)+'</details>'+
   '<p class="muted">Następny etap: samodzielnie uzgodnij wpływy, wypływy i zmianę rachunku w ćwiczeniu poniżej. Nie traktuj tej zmiany jako salda końcowego ani wyniku podatkowego.</p>'+ 
   '</section>';
 }

 function invoiceBridgeCard(){
  if(!scenario||!ws)return '';
  const docs=scenario.documents.filter(d=>d.kind==='purchase'||d.kind==='sale');
  if(!docs.length)return '';
  const result=inspectScenarioInvoiceBridge(ws.state,scenario,auditCompanyLifecycle(ws.state,scenario).period_scope.month);
  const existing=ws.state.scenario_invoice_links_v1?.scenario_id===scenario.id?
   (ws.state.scenario_invoice_links_v1.links||{}):{};
  const rows=docs.map(d=>{
   const compatible=ws.state.invoices.filter(i=>i.status==='issued'&&i.kind===d.kind&&
    i.date===d.date&&i.gross_cents===d.amount_pln*100);
   const current=existing[d.id]||'';
   const opts='<option value="">Wybierz własną fakturę</option>'+
    compatible.map(i=>'<option value="'+e(i.id)+'" '+(current===i.id?'selected':'')+'>'+
      e(i.number+' · '+i.date+' · '+money(i.gross_cents))+'</option>').join('');
   const done=result.verified_doc_ids.includes(d.id);
   return '<tr><td>'+e(d.id)+' · '+e(d.kind==='purchase'?'Zakup':'Sprzedaż')+'</td>'+
    '<td>'+e(d.date)+' · '+money(d.amount_pln*100)+'</td>'+
    '<td><label for="bridge-'+e(d.id)+'">Faktura z Twojego biura</label>'+
    '<select id="bridge-'+e(d.id)+'" '+(!canWrite?'disabled':'')+'>'+opts+'</select>'+
    button('sim-invoice-link-save','Powiąż z dowodem '+d.id,d.id)+'</td>'+
    '<td>'+(done?'Faktura i aktywny dekret sprawdzone':current?'Sprawdź dekret / źródło':'Brak powiązania')+'</td></tr>';
  });
  return '<section class="card"><span class="pill">MOST D01–D36 · FAKTURY</span>'+
   '<h2>Powiąż dokumenty zakupu i sprzedaży z własnym dziennikiem</h2>'+
   '<p>Teraz dokument modelowy musi mieć odpowiadającą mu <strong>wystawioną fakturę o tej samej dacie, rodzaju i kwocie brutto</strong> oraz jeden aktywny, zgodny dekret Wn/Ma. To przyjęta umowa zadania, nie automatyczna kwalifikacja VAT ani rzeczywista faktura. Nie wolno wykorzystać jednej faktury do dwóch dowodów.</p>'+
   '<p class="notice">Źródła potwierdzone: <strong>'+result.matched+'/'+result.total+
   '</strong>. Zapisanie powiązania NIE zastępuje zaksięgowania. Korekty i zamknięcie urzędowe nadal są do wykonania.</p>'+
   table(['Dowód','Kwota i data modelu','Wybierz źródło','Status'],rows)+
   '<div class="actions">'+button('tab','Otwórz faktury','invoices')+
   button('tab','Otwórz dziennik Wn/Ma','journal')+'</div>'+
   '<p class="small muted">Wybierz istniejącą fikcyjną fakturę zgodną z kwotą modelową. Gdy lista jest pusta, najpierw wystaw dokument w zakładce Faktury i zaksięguj go w Dzienniku. Wybór jest zapisywany wyłącznie w Twoim biurze pod kontrolą wersji i RLS.</p></section>';
 }

 function correctionBridgeCard(){
  if(!scenario||!ws)return '';
  const docs=scenario.documents.filter(d=>d.kind==='correction');
  if(!docs.length)return '';
  const period=auditCompanyLifecycle(ws.state,scenario).period_scope.month;
  const result=inspectScenarioCorrectionBridge(ws.state,scenario,period);
  const rows=docs.map(d=>{
   const passed=result.verified_doc_ids.includes(d.id);
   return '<tr><td>'+e(d.id)+' · '+e(d.date)+'</td>'+
    '<td>'+money(d.amount_pln*100)+'</td>'+
    '<td>'+(passed?'Sprawdzony dekret szkoleniowy':
      'Najpierw powiąż fakturę pierwotną i samodzielnie rozwiąż Wn/Ma w Dzienniku D01–D36')+'</td>'+
    '<td>'+button('sim-correction-post','Przenieś poprawną próbę '+d.id,d.id)+'</td></tr>';
  });
  return '<section class="card"><span class="pill">MOST D01–D36 · KOREKTY</span>'+
   '<h2>Korekta oparta na Twoim dokumencie i własnej dekretacji</h2>'+
   '<p>W ćwiczeniu masz samodzielnie rozpoznać korektę oraz poprawnie ująć jej skutek Wn/Ma. '+
   'Powiązanie z dokumentem pierwotnym jest sprawdzane według prywatnego scenariusza. '+
   'Zapis tworzy wyłącznie osobny dekret w Twoim fikcyjnym biurze, bez modyfikowania starej faktury.</p>'+
   '<p class="notice">Powiązane i sprawdzone: '+result.matched+'/'+result.total+
   '. Nie jest to faktura korygująca do obrotu, JPK, KSeF, UPO ani zatwierdzona kwalifikacja VAT.</p>'+
   table(['Dowód','Zmiana modelowa','Status','Przenieś dekret'],rows)+
   '<p class="small muted">Najpierw zakończ klasyfikację i dekretację dowodu korekty oraz powiązanie jej faktury pierwotnej. '+
   'Zapis ma kontrolę wersji i nie pozwala dodać tej samej korekty dwukrotnie.</p></section>';
 }
 function coach(){const order={'błąd':0,'uwaga':1,'wskazówka':2};const list=inspect(ws.state).sort((a,b)=>(order[a.severity]??3)-(order[b.severity]??3));return `<aside class="card"><span class="eyebrow">ANIELKA · KONTROLA ĆWICZENIA</span><h2>Sprawdźmy Twoją pracę</h2><p class="muted">Wskazuję różnice i podpowiadam tok rozwiązania. Nie zmieniam za Ciebie dokumentów.</p>${!list.length?'<p class="notice">Nie widzę problemów objętych kontrolami tego modelu. To nie jest pełna kontrola podatkowa ani potwierdzenie ukończenia całego kursu.</p>':list.slice(0,12).map(h=>`<div class="hint"><span class="pill">${e(h.severity)}</span><h3>${e(h.title)}</h3><p>${e(h.text)}</p></div>`).join('')}${list.length>12?`<p class="small">Łącznie ${list.length} uwag. Kolejne pojawią się po uporządkowaniu pierwszych.</p>`:''}<details><summary>Jak działa sprawdzanie?</summary><p class="small">Kontrole kwot i stron są wykonywane według reguł tego scenariusza. Nie dobierają aktualnej stawki VAT do dowolnego produktu. Dalsza rozmowa z Anielką nie blokuje pracy i nie zatwierdza za Ciebie zapisów.</p></details><form data-form="coach"><label for="question-text">Zapytaj o błąd w swoim ćwiczeniu</label><textarea id="question-text" data-group="question" data-field="text" maxlength="700" placeholder="Np. Dlaczego zapłata nie jest drugą sprzedażą?">${e(drafts.question.text)}</textarea><div class="actions"><button type="submit" ${!canWrite||busy?'disabled':''}>Poproś o wyjaśnienie</button></div></form>${answer?`<p class="notice">${e(answer).replace(/\n/g,'<br>')}</p>`:''}</aside>`;}
 function conflictNotice(){
  const c=conflictSnapshot;
  if(!c||c.user_id!==user?.id||c.workspace_id!==ws?.id)return '';
  return '<section class="card"><p class="error">Wykryto konflikt wersji: ostatni zapis nie został przyjęty. Pobierz kopię niezapisanych zmian, zanim odświeżysz biuro. Nie łączymy danych automatycznie.</p><div class="actions">'+
   button('download-conflict','Pobierz niezapisane zmiany')+'</div></section>';
 }
 function recoveryPanel(){
  if(!user)return '';
  const copy=backupPreview?.owner_id===user.id?backupPreview:null;
  return '<section class="card"><h3>Odzyskaj biuro z własnej kopii JSON</h3>'+
   '<p class="muted">Najpierw sprawdzamy plik lokalnie. Odzyskanie tworzy NOWE biuro na tym samym koncie, nie nadpisuje istniejących danych. To nie jest niezależne odtworzenie backupu serwera.</p>'+
   '<label for="lab-backup-file">Wybierz kopię pobraną wcześniej z TRENERKI</label>'+
   '<input id="lab-backup-file" type="file" accept=".json,application/json" '+(!canWrite||busy?'disabled':'')+'>'+
   (copy?'<p class="notice">Sprawdzona kopia: '+e(copy.original_name)+
    ', wersja '+e(String(copy.source_version))+'. Faktury: '+copy.counts.invoices+
    ', operacje bankowe: '+copy.counts.bank+', dekrety: '+copy.counts.journals+
    ', powiązania: '+copy.counts.matches+'. Odtworzenie nie zmienia starego biura.</p>'+
    '<div class="actions">'+button('restore-copy','Utwórz NOWE biuro z kopii','','primary')+'</div>':'')+
   '</section>';
 }
 function render(){if(disposed)return;
  root.innerHTML=`<style>${css}</style><div class="tlab"><main><div class="row"><a href="/moje-kursy">← Moje kursy</a><a href="/academy/index.html">Trenerki</a></div><header><span class="eyebrow">PRACOWNIA KSIĘGOWOŚCI · WŁASNA FIRMA ĆWICZENIOWA</span><h1>Wejdź do swojego biura.</h1><p>Dokumenty, wyciągi, księgowania i rozliczenia — wykonujesz pracę księgowego, a Anielka pomaga zrozumieć błędy.</p><p class="muted">Wersja ćwiczeniowa 1 · tylko dane fikcyjne · PLN</p></header><div class="status" role="status" aria-live="polite">${e(busy?'Trwa zapis lub odczyt…':status)}</div>${error?`<div class="error" role="alert">${e(error)}</div>`:''}${localWarning?`<p class="error">${e(localWarning)}</p>`:''}${conflictNotice()}${!user?'<section class="card"><a href="/konto">Zaloguj się do swojego konta</a></section>':`<section class="card"><div class="row"><div><label for="workspace">Twoje firmy</label><select id="workspace" ${busy?'disabled':''}><option value="">Wybierz biuro</option>${workspaces.map(w=>`<option value="${e(w.id)}" ${ws?.id===w.id?'selected':''}>${e(w.name)} · zapis ${w.version}</option>`).join('')}</select></div><div><label for="new-name">Nowa fikcyjna firma</label><input id="new-name" maxlength="100" placeholder="Np. Studio Przykład" ${!canWrite||busy?'disabled':''}></div><div>${button('create','Utwórz biuro','','primary')}</div></div>${ws?`<div class="actions">${button('refresh','Pobierz najnowszy zapis')}${button('export','Pobierz kopię swojej bazy')}</div>`:''}</section>${recoveryPanel()}${ws?`<nav aria-label="Działy pracowni">${Object.entries(tabs).map(([id,title])=>button('tab',title,id,tab===id?'active':'')).join('')}</nav><div class="grid"><div>${({start,simulator:()=>simulator()+invoiceBridgeCard()+correctionBridgeCard()+bankExercise()+journalPractice()+closingScreen()+integratedAuditScreen(),personnel,payroll,invoices,bank,journal,matches,report:()=>report()+taxAndCloseCard()+finalPracticeCard(),history:()=>`<section class="card"><h2>Historia zapisów</h2><p class="muted">Ostatnie 50 zapisów. Historia jest zapisywana w tej samej bazie; nie zastępuje zewnętrznej kopii zapasowej.</p>${table(['Wersja','Kiedy','Zakres zmian'],history.map(h=>`<tr><td>${h.version}</td><td>${e(new Date(h.created_at).toLocaleString('pl-PL'))}</td><td>${['invoices','bank','journals','matches'].map((k,n)=>`${['Faktury','Bank','Dziennik','Powiązania'][n]}: ${(h.changes[k]||[]).length}`).join(' · ')}</td></tr>`))}</section>`}[tab]||start)()}</div>${coach()}</div>`:''}`}</main></div>`;
  if(busy)root.querySelectorAll('button').forEach(b=>b.disabled=true);
  if(!canWrite)root.querySelectorAll('[data-action="create"],[data-action="reverse"],[data-action="unmatch"],[data-action="sim-save"],[data-action="sim-invoice-link-save"],[data-action="sim-correction-post"],[data-action="sim-bank-save"],[data-action="hr-save"],[data-action="payroll-save"],[data-action="payroll-to-journal"],[data-action="sim-journal-save"],[data-action="sim-journal-none"],[data-action="sim-journal-add"],[data-action="sim-journal-remove"]').forEach(b=>b.disabled=true);
 }
 async function run(fn){if(busy)return;busy=true;error='';render();try{await fn();}catch(x){error=x.message||'Operacja nie powiodła się. Formularz pozostaje zapisany lokalnie.';}finally{busy=false;render();}}
 function currentInvoice(statusValue){return prepareLabInvoice(drafts.invoice,ws.state.company,statusValue);}
 function currentJournal(statusValue){const d=drafts.journal;return {...d,status:statusValue,lines:d.lines.map(l=>({account:l.account,debit:cents(l.debit||'0'),credit:cents(l.credit||'0')}))};}
 const replace=(arr,x)=>arr.some(y=>y.id===x.id)?arr.map(y=>y.id===x.id?x:y):[...arr,x];
 async function submit(event){const form=event.target.closest('[data-form]');if(!form)return;event.preventDefault();const intent=event.submitter?.value;
  const finalPracticeInput=form.dataset.form==='final-practice'?Object.fromEntries(new FormData(form).entries()):null;
  await run(async()=>{
   if(form.dataset.form==='invoice'){const i=currentInvoice(intent||'draft');await commit({...ws.state,invoices:replace(ws.state.invoices,i)});drafts.invoice=invBlank(ws.name,i.kind,ws.state.invoices.filter(x=>x.kind===i.kind).length+1,trainingPeriod());keepDrafts();}
   if(form.dataset.form==='journal'){const j=currentJournal(intent||'draft');await commit({...ws.state,journals:replace(ws.state.journals,j)});drafts.journal=journalBlank(trainingPeriod());keepDrafts();}
   if(form.dataset.form==='final-practice'){
    if(!canWrite||!ws)throw new Error('Dostęp do prywatnego biura jest wymagany.');
    await commit(withFinalPracticeAnswers(ws.state,finalPracticeInput));
    status='Odpowiedzi końcowego ćwiczenia zapisane. Sprawdź wynik i wyjaśnienia, nie jest to dyplom.';
   }
   if(form.dataset.form==='match'){const d=drafts.match;if(!d.bank_id||!d.invoice_id)throw new Error('Wybierz przelew i fakturę.');const m={id:uid(),bank_id:d.bank_id,invoice_id:d.invoice_id,amount_cents:cents(d.amount)};await commit(withInvoiceBankMatch(ws.state,m));drafts.match={bank_id:'',invoice_id:'',amount:''};keepDrafts();}
   if(form.dataset.form==='coach'){const q=drafts.question.text.trim();if(q.length<4)throw new Error('Napisz pytanie o konkretne ćwiczenie.');const r=await db.functions.invoke('ta-accounting-coach',{body:{workspace_id:ws.id,question:q}});if(r.error||!r.data?.answer)throw new Error('Rozmowa jest chwilowo niedostępna. Kontrole obok nadal działają; możesz kontynuować ćwiczenie.');answer=r.data.answer;}
  });
 }
 async function click(event){const b=event.target.closest('[data-action]');if(!b||b.disabled||busy)return;const a=b.dataset.action,id=b.dataset.id;
  if(a==='tab'){tab=id;if(tab==='history')await run(async()=>{const r=await db.from('ta_accounting_lab_events').select('version,created_at,changes').eq('workspace_id',ws.id).order('version',{ascending:false}).limit(50);if(r.error)throw r.error;history=r.data||[];});else render();return;}
  if(a==='hr-select'){
    if(PERSONNEL_IDS.includes(id)){hrSelected=id;hrDraft=null;payrollDraft=null;render();}
    return;
   }
   if(a==='hr-save'){
    const field=k=>root.querySelector('#hr-'+k)?.value||'';
    const rawGross=field('gross').trim();
    const flags=Object.fromEntries(Object.keys(PERSONNEL_FLAGS).map(k=>[k,!!root.querySelector('[data-hr-flag="'+k+'"]')?.checked]));
    let amount=0;
    try{amount=rawGross?cents(rawGross):0;}
    catch{error='Podaj poprawną kwotę brutto, np. 5200,00.';render();return;}
    const candidate={id:hrSelected,fictional_name:field('name').trim(),
     contract_kind:field('contract'),signed_on:field('signed'),starts_on:field('start'),
     ends_on:field('end'),monthly_gross_cents:amount,
     workload_pct:Number(field('load')),notes:field('notes'),document_drafts:flags};
    hrDraft=candidate;
    await run(async()=>{
     if(!canWrite)throw new Error('Brak dostępu do zapisu ćwiczenia.');
     await commit(withPersonnelCase(ws.state,candidate));hrDraft=null;
    });
    return;
   }

  if(a==='payroll-select'){
   if(PERSONNEL_IDS.includes(id)){hrSelected=id;payrollDraft=null;render();}
   return;
  }
  if(a==='payroll-to-journal'){
   try{
    if(!canWrite||!ws)throw new Error('Otwórz uprawnione biuro ćwiczeniowe.');
    const [personId,stage]=id.split(':');
    const card=readPayrollPractices(ws.state)[personId];
    if(!card)throw new Error('Najpierw zapisz fikcyjną kartę płac.');
    const existing=(ws.state.journals||[]).find(j=>j.status==='draft'&&
      j.payroll_ref?.employee_id===personId&&j.payroll_ref?.period===card.period&&j.payroll_ref?.stage===stage);
    if(existing)throw new Error('Ten etap ma już zapisany szkic. Otwórz go w Dzienniku Wn/Ma, aby nie utracić swoich zmian.');
    const draft=payrollJournalDraft(ws.state,personId,stage,uid());
    drafts.journal={...draft,lines:draft.lines.map(l=>({
      account:l.account,debit:decimal(l.debit),credit:decimal(l.credit)
    }))};
    tab='journal';keepDrafts();render();
   }catch(x){error=x.message||'Nie udało się przygotować szkicu płacowego.';render();}
   return;
  }
  if(a==='payroll-save'){
   const person=readPersonnelCases(ws.state)[hrSelected];
   if(!person){error='Najpierw utwórz fikcyjnego pracownika w Kadrach.';render();return;}
   const get=k=>root.querySelector('#pay-'+k)?.value?.trim()||'';
   const fields=Object.fromEntries(Object.keys(PAYROLL_FIELDS).map(k=>[k,get(k)]));
   let candidate;
   try{candidate={employee_id:hrSelected,period:get('period'),
    gross_cents:person.monthly_gross_cents,paid_on:get('paid_on'),bank_transaction_id:get('bank_transaction_id'),
    ...Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,cents(v||'0')]))};}
   catch {error='Podaj liczby w złotych, np. 600,00, bez ujemnych kwot.';render();return;}
   payrollDraft=candidate;
   await run(async()=>{if(!canWrite)throw new Error('Brak uprawnienia do prywatnego biura.');
    await commit(withPayrollPractice(ws.state,candidate));payrollDraft=null;});
   return;
  }
   if(a==='sim-save'){
    const choice=root.querySelector('#sim-kind')?.value||'';
    await run(async()=>{
     if(!canWrite||!scenario)throw new Error('Ten etap wymaga dostępu do kursu.');
     const current=scenario.documents.find(d=>d.id===id);
     await commit(withScenarioAnswer(ws.state,scenario,id,choice));
     if(current&&choice===current.kind){
      const next=nextUnresolvedDocument(id,'classification');
      if(next)scenarioDoc=next.id;
     }
    });
    return;
   }
   if(a==='sim-invoice-link-save'){
    const invoiceId=root.querySelector('#bridge-'+id)?.value||'';
    await run(async()=>{
     if(!canWrite||!scenario||!ws)throw new Error('Brak dostępu do własnego biura i scenariusza.');
     await commit(withScenarioInvoiceLink(ws.state,scenario,id,invoiceId));
     status='Powiązano fikcyjną fakturę. Oddzielnie sprawdzany jest aktywny dekret.';
    });
    return;
   }
   if(a==='sim-correction-post'){
    await run(async()=>{
     if(!canWrite||!scenario||!ws)throw new Error('Otwórz uprawnione, fikcyjne biuro oraz scenariusz.');
     await commit(withScenarioCorrectionJournal(ws.state,scenario,id));
     status='Zaksięgowano Twoją poprawną próbę korekty jako osobny dekret szkoleniowy. Bez wysyłki do urzędu.';
    });
    return;
   }
   if(a==='sim-bank-save'){
    const values={bank_in_cents:root.querySelector('#sim-bank-in')?.value.trim()||'',
     bank_out_cents:root.querySelector('#sim-bank-out')?.value.trim()||'',
     bank_net_cents:root.querySelector('#sim-bank-net')?.value.trim()||''};
    bankDraft={...values};
    await run(async()=>{
     if(!canWrite||!scenario)throw new Error('Ten etap wymaga dostępu do kursu.');
     const data={bank_in_cents:cents(values.bank_in_cents),bank_out_cents:cents(values.bank_out_cents),
      bank_net_cents:cents(values.bank_net_cents)};
     await commit(withBankExercise(ws.state,scenario,data));bankDraft=null;
    });
    return;
   }

   if(a==='sim-journal-add'){
    const draft=getJournalDraft(journalDoc);if(draft.length<8)draft.push({account:'',debit:'0',credit:'0'});render();return;
   }
   if(a==='sim-journal-remove'){
    const draft=getJournalDraft(journalDoc);if(draft.length>1&&Number.isInteger(Number(id)))draft.splice(Number(id),1);render();return;
   }
   if(a==='sim-journal-save'||a==='sim-journal-none'){
    const selected=journalDoc,draft=getJournalDraft(selected).map(x=>({...x}));
    await run(async()=>{
     if(!canWrite||!scenario)throw new Error('Zapis wymaga dostępu do kursu i biura.');
     let lines=[];
     if(a==='sim-journal-save'){
      lines=draft.map(x=>({account:x.account,debit_cents:cents(x.debit||'0'),credit_cents:cents(x.credit||'0')}))
       .filter(x=>x.account||x.debit_cents||x.credit_cents);
      if(!lines.length)throw new Error('Aby potwierdzić brak dekretu, wybierz osobny przycisk. W przeciwnym razie uzupełnij konta i kwoty.');
     }
     await commit(withJournalAttempt(ws.state,scenario,selected,lines));
     const attempts=readJournalAttempts(ws.state,scenario);
     if(checkJournalAttempt(scenario,selected,attempts[selected]).correct){
      const next=nextUnresolvedDocument(selected,'journal');
      if(next)journalDoc=next.id;
     }
    });
    return;
   }
   if(a==='tax-close-export'){
    await run(async()=>{
     if(!ws)throw new Error('Raport wymaga otwarcia własnego, fikcyjnego biura.');
     const html=taxCloseTrainingReportHTML(ws.state,scenario);
     download('trenerki-kontrola-okresu-'+(taxCloseTrainingAudit(ws.state,scenario).period||'brak')+'.html',
      html,'text/html;charset=utf-8');
     status='Pobrano tylko szkoleniowy raport do druku i recenzji; niczego nie wysłano.';
    });
    return;
   }
   if(a==='sim-month-report'){
    await run(async()=>{
     if(!ws||!scenario)throw new Error('Raport wymaga pełnego, fikcyjnego miesiąca.');
     const html=monthTrainingReportHTML(scenario,ws.state);
     download('trenerki-raport-miesiaca-D01-D36.html',html,'text/html;charset=utf-8');
     status='Pobrano raport wyłącznie szkoleniowy. Otwórz plik HTML i wybierz Drukuj.';
    });
    return;
   }
   if(a==='download-conflict'){
    const c=conflictSnapshot;
    if(!c||c.user_id!==user?.id||c.workspace_id!==ws?.id){
     error='Nie ma niezapisanej kopii dla bieżącego konta i biura.';render();return;
    }
    download('trenerki-konflikt-'+c.workspace_id+'.json',JSON.stringify({
     format:'trenerki-unsaved-conflict-v1',workspace_id:c.workspace_id,
     expected_version:c.expected_version,captured_at:c.captured_at,
     next_state:c.next_state
    },null,2));
    status='Pobrano kopię niezapisanych zmian. Możesz porównać ją z najnowszym zapisem z bazy.';
    render();return;
   }
   if(a==='sim-bank-csv'){
    await run(async()=>{
     if(!scenario||!ws)throw new Error('Najpierw otwórz własne, fikcyjne biuro i scenariusz D01–D36.');
     download('trenerki-D01-D36-wyciag-2026-01.csv',String.fromCharCode(65279)+scenarioBankCSV(scenario),'text/csv;charset=utf-8');
     status='Pobrano tylko fikcyjny CSV; niczego nie wysłano do banku.';
    });
    return;
   }
   if(a==='template'){download('wyciag-cwiczeniowy.csv','\uFEFF'+BANK_TEMPLATE.replaceAll('2026-11',trainingPeriod()),'text/csv;charset=utf-8');return;}
  if(a==='export'){download('trenerki-biuro-'+ws.id+'.json',JSON.stringify({format:'trenerki-lab-backup-v1',exported_at:new Date().toISOString(),workspace:ws},null,2));return;}
  if(a==='restore-copy'){
    const copy=backupPreview;
    if(!canWrite||!user||!copy||copy.owner_id!==user.id){
     error='Najpierw wybierz i sprawdź własną kopię JSON na aktywnym koncie.';render();return;
    }
    if(typeof window.confirm!=='function'||!window.confirm('Utworzyć osobne biuro „'+copy.imported_name+'” z własnej kopii? Żadne istniejące biuro nie zostanie nadpisane.'))return;
    await run(async()=>{
     if(copy.owner_id!==user?.id||!canWrite)throw new Error('Zmieniło się konto lub uprawnienia. Wczytaj plik ponownie.');
     const created=await db.from('ta_accounting_lab_workspaces').insert({name:copy.imported_name}).select('*').single();
     if(created.error||!created.data)throw new Error(created.error?.message||'Nie udało się utworzyć nowego biura.');
     const fresh=created.data;
     if(fresh.user_id!==user.id||!Number.isSafeInteger(fresh.version))
      throw new Error('Nie potwierdzono właściciela nowego biura. Zatrzymano odtwarzanie.');
     const saved=await db.rpc('ta_accounting_lab_save',{
      workspace_id:fresh.id,expected_version:fresh.version,next_state:copy.state
     });
     if(saved.error||!saved.data)throw new Error('Utworzono puste biuro, ale przywrócenie danych zostało odrzucone przez kontrolę serwera. Stare biura nie zostały zmienione. '+(saved.error?.message||''));
     if(saved.data.id!==fresh.id||saved.data.user_id!==user.id||
        saved.data.version!==fresh.version+1)throw new Error('Odtworzenie nie przeszło kontroli właściciela i wersji. Nie oznaczono go jako udane.');
     ws=saved.data;workspaces=[{id:ws.id,name:ws.name,version:ws.version,updated_at:ws.updated_at},...workspaces];
     backupPreview=null;tab='start';restoreDrafts();
     status='Kopia odzyskana do osobnego biura · wersja '+ws.version+'. Oryginalne biura pozostały bez zmian.';
    });
    return;
   }
  if(a==='print-invoice'){const i=ws.state.invoices.find(x=>x.id===id),w=window.open('','_blank');if(!w){error='Przeglądarka zablokowała podgląd. Zezwól na nowe okno dla tej strony.';render();return;}w.opener=null;w.document.open();w.document.write(i?.identity_version===1?identityInvoiceHTML(i):invoiceHTML(i));w.document.close();return;}
  if(a==='create'){const name=root.querySelector('#new-name').value.trim();await run(async()=>{if(!canWrite)throw new Error('Pracownia wymaga aktywnego dostępu do kursu.');if(name.length<2)throw new Error('Wpisz nazwę fikcyjnej firmy.');const r=await db.from('ta_accounting_lab_workspaces').insert({name}).select('*').single();if(r.error)throw r.error;ws=r.data;workspaces.unshift({id:ws.id,name:ws.name,version:ws.version,updated_at:ws.updated_at});restoreDrafts();tab='start';status='Biuro utworzone i zapisane na Twoim koncie.';});return;}
  if(a==='refresh'){await run(()=>open(ws.id));return;}
  if(a==='import-bank'){await run(async()=>{if(!preview||preview.errors.length)throw new Error('Najpierw popraw błędy importu.');await commit({...ws.state,bank:[...ws.state.bank,...preview.rows]});preview=null;});return;}
  if(a==='reverse'){const original=ws.state.journals.find(j=>j.id===id),date=window.prompt('Data osobnego storna (RRRR-MM-DD). Oryginał pozostanie bez zmian.',original.date);if(date===null)return;await run(()=>commit({...ws.state,journals:[...ws.state.journals,reverseJournal(original,date)]}));return;}
  if(a==='unmatch'){await run(()=>commit({...ws.state,matches:ws.state.matches.filter(m=>m.id!==id)}));return;}
  if(a==='new-sale'||a==='new-purchase'){const kind=a==='new-sale'?'sale':'purchase';drafts.invoice=invBlank(ws.name,kind,ws.state.invoices.filter(i=>i.kind===kind).length+1,trainingPeriod());tab='invoices';}
  if(a==='edit-invoice'){const i=ws.state.invoices.find(i=>i.id===id);drafts.invoice={...i,party_kind:i.party_kind||'business',party_address:i.counterparty_identity?.address||'',party_nip:i.counterparty_identity?.nip||'',lines:i.lines.map(l=>({label:l.label,qty:String(l.qty_milli/1000).replace('.',','),price:decimal(l.unit_cents),code:l.tax_code}))};}
  if(a==='new-journal'){drafts.journal=journalBlank(trainingPeriod());tab='journal';}
  if(a==='edit-journal'){const j=ws.state.journals.find(j=>j.id===id);drafts.journal={...j,lines:j.lines.map(l=>({account:l.account,debit:decimal(l.debit),credit:decimal(l.credit)}))};tab='journal';}
  if(a==='journal-invoice'||a==='journal-bank'){const isInvoice=a==='journal-invoice',source=(isInvoice?ws.state.invoices:ws.state.bank).find(x=>x.id===id);drafts.journal={...journalBlank(),date:source.date,memo:isInvoice?source.number:source.id,source_type:isInvoice?'invoice':'bank',source_id:id};tab='journal';}
  if(a==='add-invoice-line'&&drafts.invoice.lines.length<20)drafts.invoice.lines.push({label:'',qty:'1',price:'0',code:'23'});
  if(a==='remove-invoice-line'&&drafts.invoice.lines.length>1)drafts.invoice.lines.splice(Number(id),1);
  if(a==='add-journal-line'&&drafts.journal.lines.length<20)drafts.journal.lines.push({account:'222',debit:'0',credit:'0'});
  if(a==='remove-journal-line'&&drafts.journal.lines.length>1)drafts.journal.lines.splice(Number(id),1);
  keepDrafts();render();
 }
 function inputEvent(event){const t=event.target;if(t.dataset.jline!==undefined&&ws&&scenario){const i=Number(t.dataset.jline),key=t.dataset.jfield;const d=getJournalDraft(journalDoc);if(d[i]&&['account','debit','credit'].includes(key))d[i][key]=t.value;return;}if(['sim-bank-in','sim-bank-out','sim-bank-net'].includes(t.id)){const key={'sim-bank-in':'bank_in_cents','sim-bank-out':'bank_out_cents','sim-bank-net':'bank_net_cents'}[t.id];const prev=readBankExercise(ws.state);bankDraft={bank_in_cents:prev?decimal(prev.bank_in_cents):'',bank_out_cents:prev?decimal(prev.bank_out_cents):'',bank_net_cents:prev?decimal(prev.bank_net_cents):'',...(bankDraft||{})};bankDraft[key]=t.value;return;}if(!t.dataset.group||!ws)return;let obj=drafts[t.dataset.group];const path=t.dataset.field.split('.');for(const part of path.slice(0,-1))obj=obj[part];obj[path.at(-1)]=t.value;keepDrafts();}
 async function changeEvent(event){const t=event.target;if(t.dataset.jline!==undefined&&ws&&scenario){const i=Number(t.dataset.jline),key=t.dataset.jfield;const d=getJournalDraft(journalDoc);if(d[i]&&['account','debit','credit'].includes(key))d[i][key]=t.value;return;}if(t.id==='sim-doc'&&scenario){scenarioDoc=t.value;render();return;}if(t.id==='sim-journal-doc'&&scenario){journalDoc=t.value;render();return;}if(t.id==='workspace'&&t.value)await run(()=>open(t.value));if(t.id==='lab-backup-file'&&t.files?.[0]){const f=t.files[0];await run(async()=>{backupPreview=null;if(!canWrite||!user)throw new Error('Wymagane aktywne konto z dostępem do pracowni.');if(f.size>1000000)throw new Error('Limit kopii JSON wynosi 1 MB.');backupPreview=inspectWorkspaceBackup(await f.text(),user.id);status='Plik sprawdzony lokalnie. Potwierdź osobne odzyskanie albo wybierz inny plik.';});return;}if(t.id==='lab-file'&&t.files?.[0]){const f=t.files[0];await run(async()=>{if(f.size>1000000)throw new Error('Limit pliku wynosi 1 MB.');preview=parseBankCSV(await f.text(),ws.state.bank);});}}
 const leave=ev=>{if(busy){ev.preventDefault();ev.returnValue='';}};
 root.addEventListener('click',click);root.addEventListener('submit',submit);root.addEventListener('input',inputEvent);root.addEventListener('change',changeEvent);window.addEventListener('beforeunload',leave);
 render();void load();
 return ()=>{disposed=true;root.removeEventListener('click',click);root.removeEventListener('submit',submit);root.removeEventListener('input',inputEvent);root.removeEventListener('change',changeEvent);window.removeEventListener('beforeunload',leave);root.innerHTML='';};
}
