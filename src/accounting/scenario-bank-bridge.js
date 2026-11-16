/**
 * Most odczytowy D01–D36 -> rzeczywisty import fikcyjnego CSV i aktywne dekrety
 * na TYM SAMYM prywatnym koncie. Manifest i wzorcowa dekretacja pozostają
 * w chronionym Supabase. Nie importuje, nie księguje i nie zalicza kursu.
 * Weryfikuje pochodzenie, datę, kwotę, konto 130 i pozostałe konta ćwiczenia.
 * Wynik nie jest kontrolą podatkową, bankową ani potwierdzeniem KSeF/JPK/UPO.
 */
import {readScenario,readJournalPractice} from './simulator-core.js';
import {livePostings} from './lab-core-base.js';

const bankKind=k=>k==='bank_in'||k==='bank_out';
const cents=n=>Number.isSafeInteger(n)&&n>0&&n<=1000000000000;
const sign=d=>d.kind==='bank_in'?1:-1;
const validLine=(line,debitKey,creditKey)=>line&&typeof line.account==='string'&&
 Number.isSafeInteger(line[debitKey])&&Number.isSafeInteger(line[creditKey])&&
 line[debitKey]>=0&&line[creditKey]>=0&&
 ((line[debitKey]>0&&line[creditKey]===0)||(line[creditKey]>0&&line[debitKey]===0));
const signature=(lines,d,c)=>lines.map(l=>l.account+':'+l[d]+':'+l[c]).sort().join('|');
const empty=(status,issues=[])=>({passed:false,status,matched:0,total:0,verified_doc_ids:[],issues,
 legal_review:'not_tested',real_bank_confirmation:false});

/** Tylko odczyt. Nie wolno uznać samego CSV ani poprawnego quizu za dekret. */
export function inspectScenarioBankBridge(state,rawScenario,period=null){
 if(!rawScenario)return empty('not_tested');
 let scenario,practice;
 try{
  scenario=readScenario(rawScenario);
  practice=readJournalPractice(scenario);
 }catch{return empty('manifest_or_private_postings_invalid',
  [{code:'scenario_bank_private_model_invalid',invoice:'D01–D36'}]);}
 const docs=scenario.documents.filter(d=>bankKind(d.kind));
 if(!docs.length)return empty('no_bank_documents');
 const rows=Array.isArray(state?.bank)?state.bank:[],
  journals=Array.isArray(state?.journals)?state.journals:[],
  issues=[],verified_doc_ids=[];
 let posted;
 try{posted=livePostings({journals});}
 catch{return {...empty('invalid_workspace',[{code:'scenario_bank_journal_state_invalid',invoice:'D01–D36'}]),
  total:docs.length};}
 const wantedPeriod=period??scenario.month;
 for(const doc of docs){
  const fail=code=>issues.push({code,invoice:doc.id});
  const amount=doc.amount_pln*100;
  if(!cents(amount)||doc.date.slice(0,7)!==wantedPeriod){
   fail('scenario_bank_amount_or_period_invalid');continue;
  }
  // ID Dxx jest tym samym ID we wzorcu, CSV i dzienniku.
  const found=rows.filter(b=>b?.id===doc.id);
  const source=found[0];
  if(found.length!==1||source?.date!==doc.date||
     source?.amount_cents!==sign(doc)*amount||
     source?.description!==doc.id+' — '+doc.title){
   fail('scenario_bank_csv_missing_duplicate_or_mismatch');continue;
  }
  const entries=posted.filter(j=>j?.source_type==='bank'&&j.source_id===doc.id);
  const entry=entries[0],lines=entry?.lines;
  if(entries.length!==1||entry?.date!==doc.date||!Array.isArray(lines)||
     lines.length===0||lines.length>8||!lines.every(l=>validLine(l,'debit','credit'))){
   fail('scenario_bank_posting_missing_duplicate_or_invalid');continue;
  }
  const debit=lines.reduce((sum,l)=>sum+l.debit,0),
   credit=lines.reduce((sum,l)=>sum+l.credit,0),
   movement=lines.filter(l=>l.account==='130').reduce((sum,l)=>sum+l.debit-l.credit,0);
  if(!Number.isSafeInteger(debit)||debit!==credit||movement!==sign(doc)*amount){
   fail('scenario_bank_posting_unbalanced_or_wrong_130');continue;
  }
  const expected=practice.entries[doc.id]?.lines;
  if(!Array.isArray(expected)||!expected.length||
     !expected.every(l=>validLine(l,'debit_cents','credit_cents'))||
     signature(lines,'debit','credit')!==signature(expected,'debit_cents','credit_cents')){
   fail('scenario_bank_posting_differs_from_private_model');continue;
  }
  verified_doc_ids.push(doc.id);
 }
 // Nie można przypisać identyfikatora Dxx niebankowego dowodu do banku.
 for(const row of rows){
  if(/^D(?:0[1-9]|[12][0-9]|3[0-6])$/.test(row?.id||'')&&
     !docs.some(d=>d.id===row.id))issues.push({code:'scenario_bank_nonbank_document_imported',invoice:row.id});
 }
 const passed=verified_doc_ids.length===docs.length&&issues.length===0;
 return {passed,status:passed?'verified_training_sources':'needs_work',
  matched:verified_doc_ids.length,total:docs.length,verified_doc_ids,issues,
  legal_review:'not_tested',real_bank_confirmation:false};
}
