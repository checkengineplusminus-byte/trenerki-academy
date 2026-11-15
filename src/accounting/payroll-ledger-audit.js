/**
 * Kontrola faktycznie zatwierdzonych dekretów płacowych w fikcyjnej pracowni.
 * Obejmuje WYŁĄCZNIE dekrety jawnie oznaczone payroll_ref. Starszych zapisów
 * bez takiego powiązania nie przypisujemy do pracowników przez domysł.
 * Nie oblicza PIT/ZUS, nie sprawdza prawa i nie zmienia danych kursanta.
 */
import {livePostings} from './lab-core-base.js';
import {PERSONNEL_IDS} from './personnel-practice.js';
import {readPayrollPractices,payrollJournalPreview} from './payroll-practice.js';

const lineSignature = rows => Array.isArray(rows) ? rows.map(row =>
  String(row.account) + ':' + String(row.debit ?? row.debit_cents) + ':' +
  String(row.credit ?? row.credit_cents)).sort().join('|') : 'invalid';
const endOfMonth = period => {
  const [year,month]=period.split('-').map(Number);
  return period+'-'+String(new Date(Date.UTC(year,month,0)).getUTCDate()).padStart(2,'0');
};
export function inspectPayrollLedger(state){
  if(!state||!Array.isArray(state.journals))return [];
  const issues=[],payroll=readPayrollPractices(state),byStage=new Map();
  const add=(code,text,id)=>issues.push({
    code,title:'Kontrola dekretów płacowych',text,
    entity:'journal',id,severity:'błąd'
  });
  for(const j of livePostings(state)){
    if(!Object.prototype.hasOwnProperty.call(j,'payroll_ref'))continue;
    const ref=j.payroll_ref;
    if(!ref||typeof ref!=='object'||Array.isArray(ref)||
      !PERSONNEL_IDS.includes(ref.employee_id)||
      !['accrual','payment'].includes(ref.stage)||
      typeof ref.period!=='string'||!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(ref.period)){
      add('payroll_ref_invalid','Dekret ma nieprawidłowe oznaczenie osoby, miesiąca lub etapu.',j.id);
      continue;
    }
    const key=[ref.employee_id,ref.period,ref.stage].join('|');
    byStage.set(key,[...(byStage.get(key)||[]),j.id]);
    const card=payroll[ref.employee_id];
    let preview;
    try{preview=payrollJournalPreview(state,ref.employee_id);}
    catch{preview={ready:false};}
    if(!card||card.period!==ref.period||!preview.ready){
      add('payroll_ledger_stale','Zapis płacowy nie odpowiada aktualnej fikcyjnej kartotece lub liście płac. Wymaga jawnego sprawdzenia i ewentualnego storna.',j.id);
      continue;
    }
    const planned=ref.stage==='accrual'?preview.accrual:preview.payment;
    if(!planned||!planned.balanced||planned.lines.length<2){
      add('payroll_ledger_source_missing','Dla tego etapu nie ma zgodnego planu; wypłata wymaga dopasowanego fikcyjnego CSV.',j.id);
      continue;
    }
    const correctDate=ref.stage==='accrual'?endOfMonth(card.period):card.paid_on;
    const correctSource=ref.stage==='accrual'
      ? j.source_type==='manual'&&(!j.source_id)
      : j.source_type==='bank'&&j.source_id===card.bank_transaction_id;
    if(j.date!==correctDate||!correctSource||lineSignature(j.lines)!==lineSignature(planned.lines)){
      add('payroll_ledger_mismatch','Dekret różni się od zapisanej listy płac: sprawdź datę, źródło, konta oraz kwoty Wn/Ma (bez automatycznej korekty).',j.id);
    }
  }
  for(const [key,ids] of byStage){
    if(ids.length>1)add('payroll_ledger_duplicate',
      'Ten sam pracownik, miesiąc i etap ma '+ids.length+' aktywne dekrety. Jeden koszt/wypłatę można ująć tylko raz; popraw jawnie.',ids[0]);
    const [employee,period,stage]=key.split('|');
    if(stage==='payment'&&!byStage.has([employee,period,'accrual'].join('|')))
      add('payroll_payment_before_accrual',
        'Wypłata jest zaksięgowana, ale brak aktywnego naliczenia wynagrodzenia dla tej osoby i miesiąca.',ids[0]);
  }
  return issues;
}
