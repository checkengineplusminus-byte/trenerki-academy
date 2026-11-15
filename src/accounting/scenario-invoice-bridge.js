/**
 * Fikcyjny most D01-D36 -> faktury i AKTYWNE dekrety tej samej prywatnej firmy.
 * Manifest oraz jego rozwiązania pozostają w chronionym Supabase.
 * To kontrola pochodzenia dowodu szkoleniowego, NIE kwalifikacja VAT/KSeF/JPK.
 */
import {readScenario} from './simulator-core.js';
import {invoiceTotals,expectedInvoiceLines,livePostings,validDate} from './lab-core-base.js';
import {acquisitionLines} from './assets-core.js';

const supported=doc=>doc.kind==='purchase'||doc.kind==='sale';
const sig=lines=>Array.isArray(lines)?lines.map(l=>String(l.account)+':'+String(l.debit)+':'+String(l.credit)).sort().join('|'):'invalid';
const periodOf=date=>validDate(date)?date.slice(0,7):null;
const matchesSource=(invoice,doc)=>{
 if(!invoice||invoice.status!=='issued'||invoice.kind!==doc.kind||invoice.date!==doc.date)return false;
 const cents=doc.amount_pln*100;
 if(!Number.isSafeInteger(cents)||cents<=0)return false;
 try{
  const amounts=invoiceTotals(invoice);
  return amounts.gross_cents===cents&&amounts.gross_cents===invoice.gross_cents&&
   amounts.net_cents===invoice.net_cents&&amounts.tax_cents===invoice.tax_cents;
 }catch{return false;}
};
function validateLinkState(state,scenario){
 const candidate=state?.scenario_invoice_links_v1;
 if(candidate==null)return {};
 if(candidate.scenario_id!==scenario.id||!candidate.links||typeof candidate.links!=='object'||
    Array.isArray(candidate.links))return {};
 return candidate.links;
}
/** Jawne przypisanie przez ucznia — nie zapisuje nic bez wywołania istniejącego RPC. */
export function withScenarioInvoiceLink(state,rawScenario,docId,invoiceId){
 const scenario=readScenario(rawScenario);
 if(!Array.isArray(state?.invoices)||!Array.isArray(state?.journals))throw new Error('Otwórz kompletne, własne biuro.');
 const doc=scenario.documents.find(d=>d.id===docId&&supported(d));
 if(!doc)throw new Error('Wybierz fakturę zakupu albo sprzedaży z D01–D36.');
 const invoice=state.invoices.find(i=>i?.id===invoiceId);
 if(!matchesSource(invoice,doc))throw new Error('Dokument musi być wystawiony, z właściwym rodzajem, datą oraz kwotą BRUTTO równą modelowemu dowodowi Dxx. Nie dobieramy tu automatycznie VAT.');
 const previous=validateLinkState(state,scenario);
 if(Object.entries(previous).some(([other,id])=>other!==docId&&id===invoiceId))
  throw new Error('Jedna faktura nie może być źródłem dwóch różnych dowodów Dxx.');
 return {...state,scenario_invoice_links_v1:{scenario_id:scenario.id,links:{...previous,[docId]:invoiceId}}};
}
/** Wyłącznie odczyt: 6 przykładowych dokumentów (lub tyle, ile definiuje manifest). */
export function inspectScenarioInvoiceBridge(state,rawScenario,period=null){
 if(!rawScenario)return {passed:false,status:'not_tested',matched:0,total:0,issues:[],verified_doc_ids:[]};
 let scenario;
 try{scenario=readScenario(rawScenario);}
 catch{return {passed:false,status:'not_tested',matched:0,total:0,issues:[{code:'scenario_invoice_manifest_invalid',invoice:'D01–D36'}],verified_doc_ids:[]};}
 const docs=scenario.documents.filter(supported),links=validateLinkState(state,scenario),
  invoices=Array.isArray(state?.invoices)?state.invoices:[],
  posted=Array.isArray(state?.journals)?livePostings(state):[];
 const issues=[],verified_doc_ids=[],seenInvoices=new Set();
 for(const doc of docs){
  const id=links[doc.id],inv=invoices.find(i=>i?.id===id);
  if(typeof id!=='string'||!id||!matchesSource(inv,doc)||periodOf(doc.date)!==period){
   issues.push({code:'scenario_invoice_source_not_linked_or_mismatch',invoice:doc.id});continue;
  }
  if(seenInvoices.has(id)){
   issues.push({code:'scenario_invoice_reused_for_two_documents',invoice:doc.id});continue;
  }
  seenInvoices.add(id);
  const journals=posted.filter(j=>j.source_type==='invoice'&&j.source_id===id);
  if(journals.length!==1||journals[0].date!==doc.date||periodOf(journals[0].date)!==period){
   issues.push({code:'scenario_invoice_posting_missing_duplicate_or_wrong_date',invoice:doc.id});continue;
  }
  let expected;
  try{
   if(inv.kind==='purchase'&&journals[0].asset_action==='acquire'){
    const asset=(Array.isArray(state?.assets)?state.assets:[]).find(a=>
      a.id===journals[0].asset_id&&a.invoice_id===id&&a.status==='active');
    expected=asset?acquisitionLines(asset,state):null;
   }else expected=expectedInvoiceLines(inv);
  }catch{expected=null;}
  if(!expected||sig(expected)!==sig(journals[0].lines)){
   issues.push({code:'scenario_invoice_posting_accounts_or_amount_mismatch',invoice:doc.id});continue;
  }
  verified_doc_ids.push(doc.id);
 }
 const passed=docs.length>0&&verified_doc_ids.length===docs.length&&issues.length===0;
 return {passed,status:!docs.length?'not_tested':passed?'verified_training_sources':'needs_work',
  matched:verified_doc_ids.length,total:docs.length,issues,verified_doc_ids};
}
