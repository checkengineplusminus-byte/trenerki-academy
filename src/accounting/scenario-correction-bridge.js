/**
 * Korekta D01-D36: istniejąca, SAMODZIELNIE ROZWIĄZANA dekretacja ucznia
 * -> jeden zatwierdzony zapis w tym samym fikcyjnym biurze.
 * Powiązanie z dokumentem pierwotnym pochodzi WYŁĄCZNIE z chronionego manifestu.
 * Bez faktury korygującej do obrotu, bez KSeF/JPK/UPO, bez kwalifikacji VAT.
 */
import {readScenario,readJournalAttempts,checkJournalAttempt,readScenarioAnswers} from './simulator-core.js';
import {inspectScenarioInvoiceBridge} from './scenario-invoice-bridge.js';
import {invoiceTotals,livePostings,validDate} from './lab-core-base.js';

const signature=lines=>Array.isArray(lines)?lines.map(l=>[
 String(l.account),String(l.debit),String(l.credit)
].join(':')).sort().join('|'):'invalid';
const periodOf=date=>validDate(date)?date.slice(0,7):null;
const fromAttempt=attempt=>(attempt?.lines||[]).map(l=>({
 account:l.account,debit:l.debit_cents,credit:l.credit_cents
}));
const correctionDocuments=scenario=>scenario.documents.filter(d=>d.kind==='correction');

function checkSource(state,scenario,doc,period){
 const original=scenario.documents.find(d=>
  d.id===doc.corrects_doc_id&&['sale','purchase'].includes(d.kind));
 if(!original||!period||periodOf(original.date)!==period||
   periodOf(doc.date)!==period||original.date>=doc.date||
   !Number.isSafeInteger(doc.amount_pln)||doc.amount_pln>=0)
  return {valid:false,code:'correction_private_source_missing_or_period'};
 const evidence=inspectScenarioInvoiceBridge(state,scenario,period);
 if(!evidence.verified_doc_ids.includes(original.id))
  return {valid:false,code:'correction_original_invoice_not_verified'};
 const invoiceId=state?.scenario_invoice_links_v1?.links?.[original.id];
 const invoice=Array.isArray(state?.invoices)?state.invoices.find(i=>i.id===invoiceId):null;
 if(!invoice||invoice.status!=='issued'||invoice.date!==original.date)
  return {valid:false,code:'correction_original_invoice_missing'};
 try{
  const originalGross=invoiceTotals(invoice).gross_cents;
  if(originalGross<Math.abs(doc.amount_pln*100)||originalGross<=0)
   return {valid:false,code:'correction_exceeds_original_invoice'};
 }catch{return {valid:false,code:'correction_invalid_original_amounts'};}
 const attempt=readJournalAttempts(state,scenario)[doc.id];
 if(readScenarioAnswers(state)[doc.id]!=='correction'||
   !checkJournalAttempt(scenario,doc.id,attempt).correct)
  return {valid:false,code:'correction_student_journal_not_verified'};
 const lines=fromAttempt(attempt);
 const expectedSigned=doc.amount_pln*100,settlement=original.kind==='sale'?'201':'202';
 const actualSigned=lines.filter(l=>l.account===settlement)
  .reduce((sum,l)=>sum+l.debit-l.credit,0);
 if(!Number.isSafeInteger(expectedSigned)||expectedSigned===0||
   actualSigned!==(original.kind==='sale'?expectedSigned:-expectedSigned))
  return {valid:false,code:'correction_model_settlement_amount_mismatch'};
 return {valid:true,original,invoice,lines};
}

export function withScenarioCorrectionJournal(state,rawScenario,docId){
 const scenario=readScenario(rawScenario),doc=correctionDocuments(scenario).find(d=>d.id===docId);
 if(!doc||!Array.isArray(state?.journals))
  throw new Error('Wybierz prawidłowy dowód korekty oraz otwórz swoje fikcyjne biuro.');
 const source=checkSource(state,scenario,doc,periodOf(doc.date));
 if(!source.valid)
  throw new Error('Najpierw powiąż i zaksięguj fakturę pierwotną, następnie samodzielnie rozwiąż Wn/Ma korekty. Kod: '+source.code);
 if(state.journals.some(j=>j.id==='SC_CORR_'+doc.id||
   j.source_id===doc.id&&j.source_type==='manual'))
  throw new Error('Korekta ma już zapis w historii. Nie księguj jej drugi raz.');
 const lines=source.lines.map(l=>({...l}));
 const journal={id:'SC_CORR_'+doc.id,status:'posted',date:doc.date,
  source_type:'manual',source_id:doc.id,
  memo:'Korekta szkoleniowa '+doc.id+' — bez wysyłki urzędowej',
  scenario_correction_ref:{
   doc_id:doc.id,original_doc_id:source.original.id,
   original_invoice_id:source.invoice.id
  },lines};
 return {...state,journals:[...state.journals,journal]};
}

/** Inspekcja odczytowa: nawet wynik passed nie oznacza poprawności prawnej. */
export function inspectScenarioCorrectionBridge(state,rawScenario,period=null){
 if(!rawScenario)return {status:'not_tested',passed:false,matched:0,total:0,
  verified_doc_ids:[],issues:[],legal_review:'not_tested'};
 let scenario;
 try{scenario=readScenario(rawScenario);}
 catch{return {status:'not_tested',passed:false,matched:0,total:0,
  verified_doc_ids:[],issues:[{code:'correction_manifest_invalid',invoice:'Dxx'}],
  legal_review:'not_tested'};}
 const docs=correctionDocuments(scenario),issues=[],verified_doc_ids=[];
 if(!docs.length)return {status:'not_tested',passed:false,matched:0,total:0,
  verified_doc_ids,issues,legal_review:'not_tested'};
 const live=Array.isArray(state?.journals)?livePostings(state):[];
 for(const doc of docs){
  const source=checkSource(state,scenario,doc,period);
  if(!source.valid){
   issues.push({code:source.code,invoice:doc.id});continue;
  }
  const entries=live.filter(j=>j.source_type==='manual'&&j.source_id===doc.id);
  const entry=entries[0],ref=entry?.scenario_correction_ref;
  if(entries.length!==1||entry.date!==doc.date||
    ref?.doc_id!==doc.id||ref?.original_doc_id!==source.original.id||
    ref?.original_invoice_id!==source.invoice.id||
    signature(entry.lines)!==signature(source.lines)){
   issues.push({code:'correction_missing_duplicate_or_wrong_posting',invoice:doc.id});continue;
  }
  verified_doc_ids.push(doc.id);
 }
 const passed=verified_doc_ids.length===docs.length&&issues.length===0;
 return {status:passed?'verified_training_sources':'needs_work',
  passed,matched:verified_doc_ids.length,total:docs.length,
  verified_doc_ids,issues,legal_review:'not_tested'};
}
