/**
 * Fikcyjna lista płac: uzgodnienie wpisanego brutto, potrąceń i wypłaty.
 * Bez naliczania ustawowych składek, podatku, terminów ani wysyłek.
 * Oddzielny klucz zachowuje pełną zgodność ze starszą kartoteką pracowników.
 */
import {PERSONNEL_IDS,readPersonnelCases} from './personnel-practice.js';
const STORE='simulator_payroll_v1',SCENARIO='core-v3-payroll-training-2026-01-v1';
export const PAYROLL_FIELDS=Object.freeze({
 social_cents:'Składki społeczne pracownika – kwota z zadania',
 health_cents:'Składka zdrowotna – kwota z zadania',
 pit_cents:'Zaliczka PIT – kwota z zadania',
 other_cents:'Inne potrącenia – kwota z zadania',
 employer_extra_cents:'Dodatkowy koszt pracodawcy – kwota z zadania',
 paid_cents:'Kwota faktycznie oznaczona jako wypłacona w ćwiczeniu'
});
const nonnegative=n=>Number.isSafeInteger(n)&&n>=0&&n<=100000000;

/** Zestawienie jawnie wybranego wiersza FIKCYJNEGO wyciągu CSV.
 * Nie oznacza wykonania przelewu w banku ani powstania dekretu Wn/Ma.
 */
const BANK_ID=/^[A-Za-z0-9_/-]{1,100}$/;
const validBankId=id=>id===undefined||id===''||(typeof id==='string'&&BANK_ID.test(id));
function checkBankLink(state,c){
 const id=c?.bank_transaction_id||'';
 if(!id)return {status:'not_linked',actual_bank_verified:false};
 if(!validBankId(id)||!Number.isSafeInteger(c.paid_cents)||c.paid_cents<=0)
  return {status:'invalid_link',actual_bank_verified:false};
 const items=Array.isArray(state?.bank)?state.bank:[];
 const row=items.find(b=>b?.id===id);
 if(!row)return {status:'missing_bank_row',bank_id:id,actual_bank_verified:false};
 if(!Number.isSafeInteger(row.amount_cents)||row.amount_cents!==-c.paid_cents)
  return {status:'amount_mismatch',bank_id:id,actual_bank_verified:false};
 if(row.date!==c.paid_on)return {status:'date_mismatch',bank_id:id,actual_bank_verified:false};
 if(Array.isArray(state?.matches)&&state.matches.some(x=>x?.bank_id===id))
  return {status:'already_allocated_to_invoice',bank_id:id,actual_bank_verified:false};
 const raw=state?.[STORE]?.entries;
 if(raw&&typeof raw==='object'&&PERSONNEL_IDS.some(other=>other!==c.employee_id&&raw[other]?.bank_transaction_id===id))
  return {status:'duplicate_payroll_assignment',bank_id:id,actual_bank_verified:false};
 return {status:'matched_training_csv',bank_id:id,amount_cents:c.paid_cents,
  csv_row_date:row.date,actual_bank_verified:false,ledger_posted:false};
}
/**
 * Powiązanej pozycji CSV nie wolno następnie przypisać do faktury.
 * Kontrola jest symetryczna względem checkBankLink() w karcie płac.
 */
export function bankRowAvailableForInvoice(state,bankId){
 if(typeof bankId!=='string'||!BANK_ID.test(bankId)||!Array.isArray(state?.bank)||
    !state.bank.some(row=>row?.id===bankId))return false;
 const stored=state?.[STORE];
 if(stored?.scenario_id!==SCENARIO||!stored.entries||
    typeof stored.entries!=='object'||Array.isArray(stored.entries))return true;
 return !PERSONNEL_IDS.some(id=>stored.entries[id]?.bank_transaction_id===bankId);
}
export function payrollBankMatch(state,id){
 const c=readPayrollPractices(state)[id];
 if(!c)return {status:'no_payroll',actual_bank_verified:false};
 if(!eligibleEmployee(readPersonnelCases(state)[id],c))
  return {status:'personnel_stale',actual_bank_verified:false};
 return checkBankLink(state,c);
}

const validDate=x=>{
 if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;
 const [y,m,d]=x.split('-').map(Number);
 if(y<2000||y>2100||m<1||m>12||d<1||d>31)return false;
 const v=new Date(Date.UTC(y,m-1,d));
 return v.getUTCFullYear()===y&&v.getUTCMonth()===m-1&&v.getUTCDate()===d;
};
const validPeriod=p=>typeof p==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(p)&&Number(p.slice(0,4))>=2000&&Number(p.slice(0,4))<=2100;
export function payrollMath(c){
 const deductions_cents=c.social_cents+c.health_cents+c.pit_cents+c.other_cents;
 return {deductions_cents,net_cents:c.gross_cents-deductions_cents,
   outstanding_cents:c.gross_cents-deductions_cents-c.paid_cents,
   total_employer_cost_cents:c.gross_cents+c.employer_extra_cents};
}
export function validPayrollPractice(c){
 if(!c||typeof c!=='object'||Array.isArray(c)||!PERSONNEL_IDS.includes(c.employee_id)||!validPeriod(c.period))return false;
 if(!nonnegative(c.gross_cents)||!c.gross_cents||
  !Object.keys(PAYROLL_FIELDS).every(k=>nonnegative(c[k])))return false;
 const m=payrollMath(c);
 return Number.isSafeInteger(m.total_employer_cost_cents)&&
  m.deductions_cents<=c.gross_cents&&c.paid_cents<=m.net_cents&&
  validBankId(c.bank_transaction_id)&&(!c.bank_transaction_id||c.paid_cents>0)&&
  typeof c.paid_on==='string'&&
  (c.paid_cents===0?c.paid_on==='':validDate(c.paid_on));
}
function eligibleEmployee(person,c){
 return person&&c.gross_cents===person.monthly_gross_cents&&
  c.period>=person.starts_on.slice(0,7)&&
  (!person.ends_on||c.period<=person.ends_on.slice(0,7))&&
  (!c.paid_on||c.paid_on>=person.starts_on);
}
export function readPayrollPractices(state){
 const v=state?.[STORE];if(!v||v.scenario_id!==SCENARIO||!v.entries||
  typeof v.entries!=='object'||Array.isArray(v.entries))return {};
 return Object.fromEntries(Object.entries(v.entries).filter(([id,c])=>
  PERSONNEL_IDS.includes(id)&&c?.employee_id===id&&validPayrollPractice(c))
  .map(([id,c])=>[id,{...c}]));
}
export function withPayrollPractice(state,c){
 if(!validPayrollPractice(c))throw new Error('Kwoty, daty i suma potrąceń są nieprawidłowe. Sprawdź brutto, netto, wypłatę i miesiąc.');
 const people=readPersonnelCases(state);
 if(!eligibleEmployee(people[c.employee_id],c))
  throw new Error('Najpierw zapisz osobę w Kadrach. Miesiąc musi obejmować czas umowy, a brutto odpowiadać kartotece.');
 if(c.bank_transaction_id&&checkBankLink(state,c).status!=='matched_training_csv')
  throw new Error('Wybierz inną pozycję fikcyjnego CSV: data, kwota i kierunek muszą być zgodne, a identyfikator niewykorzystany.');
 return {...state,[STORE]:{scenario_id:SCENARIO,
  entries:{...readPayrollPractices(state),[c.employee_id]:{...c}}}};
}
export function payrollReview(state,id){
 const c=readPayrollPractices(state)[id],person=readPersonnelCases(state)[id];
 if(!c)return {recorded:false,actual_bank_match:'not_tested',
   legal_rates:'not_verified',official_forms:'not_generated'};
 const m=payrollMath(c);
 const eligible=!!eligibleEmployee(person,c);
 return {...m,recorded:true,eligible,payroll_month:c.period,
  actual_bank_match:'not_tested',training_bank_match:payrollBankMatch(state,id).status,
  legal_rates:'not_verified',official_forms:'not_generated',approved_payroll:false,
  message:eligible?'Bilans zadania liczbowego. Kwoty składek/PIT wprowadzono ręcznie, nie wyliczono według prawa.':
    'Zmieniono kartotekę albo daty. Popraw kartę płac przed uznaniem jej za spójną.'};
}

/**
 * Zestawienie środków potrzebnych do wypłat z zapisanych ćwiczeń.
 * Nie łączy różnych miesięcy, odrzuca rozrachunki niezgodne z kartoteką,
 * nie odczytuje banku ani nie udaje potwierdzenia wypłaty czy stawek.
 * Odczyt wyłącznie; nie modyfikuje istniejącego stanu użytkownika.
 */
export function payrollPeriodSummary(state){
 const cases=readPayrollPractices(state),people=readPersonnelCases(state);
 const groups=new Map(),excluded_employee_ids=[];
 for(const id of PERSONNEL_IDS){
  const c=cases[id];
  if(!c)continue;
  if(!eligibleEmployee(people[id],c)){excluded_employee_ids.push(id);continue;}
  if(!groups.has(c.period))groups.set(c.period,{
   period:c.period,employee_count:0,gross_cents:0,deductions_cents:0,
   net_cents:0,paid_cents:0,outstanding_cents:0,employer_extra_cents:0,
   training_csv_matched_cents:0,training_csv_unmatched_cents:0,
   total_employer_cost_cents:0
  });
  const x=groups.get(c.period),m=payrollMath(c);
  x.employee_count++;
  x.gross_cents+=c.gross_cents;
  x.deductions_cents+=m.deductions_cents;
  x.net_cents+=m.net_cents;
  x.paid_cents+=c.paid_cents;
  if(payrollBankMatch(state,id).status==='matched_training_csv')x.training_csv_matched_cents+=c.paid_cents;
  else x.training_csv_unmatched_cents+=c.paid_cents;
  x.outstanding_cents+=m.outstanding_cents;
  x.employer_extra_cents+=c.employer_extra_cents;
  x.total_employer_cost_cents+=m.total_employer_cost_cents;
 }
 return {periods:[...groups.values()].sort((a,b)=>a.period.localeCompare(b.period)),
  excluded_employee_ids,bank_match:'not_tested',legal_rates:'not_verified',
  cashflow_type:'declared_training_payments_not_bank_verified'};
}
