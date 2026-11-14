/**
 * Praktyka kadrowa: dwie fikcyjne osoby, chronologia i szkice dokumentów.
 * Nie oblicza PIT/ZUS, nie weryfikuje prawa i nie wysyła do urzędów.
 * Dane pozostają w prywatnym, wersjonowanym stanie biura ćwiczeniowego.
 */
export const PERSONNEL_IDS=Object.freeze(['P01','P02']);
export const PERSONNEL_FLAGS=Object.freeze({
 contract_draft:'Projekt umowy i warunków',
 onboarding_draft:'Projekt dokumentów przyjęcia',
 payroll_draft:'Projekt listy płac i rozrachunku',
 exit_notice_draft:'Projekt dokumentu zakończenia umowy',
 final_settlement_draft:'Projekt rozliczenia końcowego',
 handover_draft:'Projekt przekazania i listy spraw'
});
const STORE='simulator_personnel_v1',SCENARIO='core-v3-personnel-training-2026-01-v1';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const validDate=x=>{
 if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;
 const [y,m,d]=x.split('-').map(Number);
 if(y<2000||y>2100||m<1||m>12||d<1||d>31)return false;
 const n=new Date(Date.UTC(y,m-1,d));
 return n.getUTCFullYear()===y&&n.getUTCMonth()===m-1&&n.getUTCDate()===d;
};
const validName=x=>typeof x==='string'&&x.trim().length>=2&&x.trim().length<=80&&
 /^[\p{L} .'-]+$/u.test(x.trim())&&!/[@0-9]/.test(x);
const validFlags=f=>!!f&&typeof f==='object'&&!Array.isArray(f)&&
 Object.keys(f).every(k=>own(PERSONNEL_FLAGS,k)&&typeof f[k]==='boolean');
export function validPersonnelCase(c){
 return !!c&&typeof c==='object'&&!Array.isArray(c)&&PERSONNEL_IDS.includes(c.id)&&
  validName(c.fictional_name)&&['indefinite','fixed'].includes(c.contract_kind)&&
  validDate(c.signed_on)&&validDate(c.starts_on)&&c.signed_on<=c.starts_on&&
  (c.ends_on===''||(validDate(c.ends_on)&&c.ends_on>=c.starts_on))&&
  Number.isSafeInteger(c.monthly_gross_cents)&&c.monthly_gross_cents>0&&c.monthly_gross_cents<=100000000&&
  Number.isInteger(c.workload_pct)&&c.workload_pct>=10&&c.workload_pct<=100&&
  validFlags(c.document_drafts)&&typeof c.notes==='string'&&c.notes.length<=800;
}
export function readPersonnelCases(state){
 const stored=state?.[STORE];
 if(!stored||stored.scenario_id!==SCENARIO||!stored.cases||typeof stored.cases!=='object'||Array.isArray(stored.cases))return {};
 return Object.fromEntries(Object.entries(stored.cases).filter(([id,c])=>
  PERSONNEL_IDS.includes(id)&&c?.id===id&&validPersonnelCase(c)).map(([id,c])=>[id,{
   ...c,document_drafts:{...c.document_drafts}
  }]));
}
export function withPersonnelCase(state,entry){
 if(!validPersonnelCase(entry))throw new Error('Sprawdź fikcyjne imię, kolejność dat, kwotę brutto, wymiar i pola dokumentów.');
 const prev=readPersonnelCases(state);
 const safe={...entry,fictional_name:entry.fictional_name.trim(),notes:entry.notes.trim(),
  document_drafts:{...entry.document_drafts}};
 return {...state,[STORE]:{scenario_id:SCENARIO,cases:{...prev,[entry.id]:safe}}};
}
export function personnelDraftReview(entry){
 if(!validPersonnelCase(entry))return {recorded:false,drafts_total:0,drafts_marked:0,
  missing:[],legal_review:'not_tested',actual_documents:'not_verified'};
 const required=['contract_draft','onboarding_draft','payroll_draft',
  ...(entry.ends_on?['exit_notice_draft','final_settlement_draft','handover_draft']:[])];
 const missing=required.filter(k=>entry.document_drafts[k]!==true);
 return {recorded:true,drafts_total:required.length,drafts_marked:required.length-missing.length,
  missing,legal_review:'not_tested',actual_documents:'not_verified',
  message:'Znaczniki szkiców to deklaracja kursanta, nie kontrola dokumentu ani prawa pracy.'};
}
