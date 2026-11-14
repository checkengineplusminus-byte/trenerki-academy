import {ACCOUNTS as BASE_ACCOUNTS,balanceReport as baseReport,inspect as baseInspect,livePostings} from './lab-core-base.js';
import {ASSET_ACCOUNTS,assetsControl,acquisitionLines} from './assets-core.js';
import {inspectInvoiceBankMatches} from './invoice-match.js';
import {PERSONNEL_IDS} from './personnel-practice.js';
import {readPayrollPractices,payrollBankMatch} from './payroll-practice.js';
export const ACCOUNTS={...BASE_ACCOUNTS,...ASSET_ACCOUNTS};
export function balanceReport(s){
 const out=baseReport(s),map=Object.fromEntries(Object.entries(ACCOUNTS).sort(([a],[b])=>a.localeCompare(b)).map(([code,name])=>[code,{code,name,debit:0,credit:0,balance:0}]));
 for(const j of s.journals.filter(j=>j.status==='posted'))for(const l of j.lines){const a=map[l.account];if(!a)throw new Error('Nieznane konto w zestawieniu.');a.debit+=l.debit;a.credit+=l.credit;a.balance=a.debit-a.credit;if(!Number.isSafeInteger(a.debit)||!Number.isSafeInteger(a.credit))throw new Error('Obroty przekraczają dokładny zakres tego modelu.');}
 const accounts=Object.values(map),debit=accounts.reduce((n,a)=>n+a.debit,0),credit=accounts.reduce((n,a)=>n+a.credit,0);
 if(!Number.isSafeInteger(debit)||!Number.isSafeInteger(credit))throw new Error('Suma obrotów przekracza zakres modelu.');
 return {...out,accounts,debit,credit,profit:0-map['700'].balance-map['400'].balance-map['404'].balance-map['401'].balance-map['761'].balance,assetCost:map['010'].balance,assetAccumulated:0-map['071'].balance,assetCarrying:map['010'].balance+map['071'].balance};
}
export function inspect(s){
 const acquisitions=livePostings(s).filter(j=>j.asset_action==='acquire'&&(s.assets||[]).some(a=>a.id===j.asset_id&&a.status==='active'));
 const cleared=new Set(acquisitions.filter(j=>{try{const a=s.assets.find(a=>a.id===j.asset_id);return JSON.stringify(j.lines.map(l=>[l.account,l.debit,l.credit]))===JSON.stringify(acquisitionLines(a,s).map(l=>[l.account,l.debit,l.credit]));}catch{return false;}}).map(j=>j.id));
 const payroll=readPayrollPractices(s);
 const salaryBank=new Map(PERSONNEL_IDS.filter(id=>payroll[id]&&
  payrollBankMatch(s,id).status==='matched_training_csv')
  .map(id=>[payroll[id].bank_transaction_id,payroll[id].paid_cents]));
 const payrollIssues=[];
 const posted=livePostings(s);
 for(const [bankId,amount] of salaryBank){
  const documents=posted.filter(j=>j.source_type==='bank'&&j.source_id===bankId);
  if(documents.length>1)payrollIssues.push({code:'payroll_bank_duplicate_journal',
   title:'Podwójny dekret fikcyjnej wypłaty',
   text:'Dla jednej operacji płacowej zapisano więcej niż jeden aktywny dekret. Sprawdź źródła.',
   entity:'bank',id:bankId,severity:'błąd'});
  if(documents.length===1){
   const booked={};
   for(const row of documents[0].lines){
    booked[row.account]=(booked[row.account]||0)+row.debit-row.credit;
   }
   if(Object.entries(booked).some(([k,v])=>v!==0&&!['231','130'].includes(k))||
      booked['231']!==amount||booked['130']!==-amount)
    payrollIssues.push({code:'payroll_bank_accounts',
     title:'Wypłata nie rozlicza wynagrodzenia',
     text:'Dla fikcyjnej wypłaty w modelu sprawdź Wn 231 i Ma 130. Dopasowanie CSV nie jest ponownym kosztem wynagrodzeń.',
     entity:'bank',id:bankId,severity:'błąd'});
  }
 }
 return [...baseInspect(s).filter(i=>
   !(i.code==='invoice_accounts'&&cleared.has(i.id))&&
   !(i.code==='unmatched_bank'&&salaryBank.has(i.id))),
   ...assetsControl(s),...inspectInvoiceBankMatches(s),...payrollIssues];
}
