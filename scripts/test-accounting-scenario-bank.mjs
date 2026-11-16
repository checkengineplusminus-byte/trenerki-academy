import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectScenarioBankBridge} from '../src/accounting/scenario-bank-bridge.js';
import {SCENARIO_ID,scenarioBankCSV} from '../src/accounting/simulator-core.js';
import {parseBankCSV} from '../src/accounting/lab-core-base.js';

// TYLKO wymyślone dane, bez zawartości płatnego kursu i kluczy odpowiedzi.
const id=n=>'D'+String(n).padStart(2,'0');
const lines=(debit,credit,c)=>[
 {account:debit,debit_cents:c,credit_cents:0},
 {account:credit,debit_cents:0,credit_cents:c}
];
const docs=Array.from({length:36},(_,n)=>({
 id:id(n+1),date:'2026-01-'+String(Math.min(n+1,28)).padStart(2,'0'),
 title:'Wymyślony dowód do testów '+id(n+1),
 kind:n===0?'bank_in':n===1?'bank_out':'formal',
 amount_pln:n===0?100:n===1?30:0,
 fictional:true,source_verification:'training_only'
}));
const entries=Object.fromEntries(docs.map((d,n)=>[d.id,{
 lines:n===0?lines('130','800',10000):n===1?lines('202','130',3000):[],
 explanation:'Syntetyczne ćwiczenie kontroli źródła. Nie dotyczy księgowania rzeczywistego.'
}]));
const manifest={id:SCENARIO_ID,month:'2026-01',documents:docs,
 journal_practice_v1:{version:1,currency:'PLN',
 accounts:{'130':'Modelowy bank','800':'Modelowy kapitał','202':'Modelowi dostawcy'},
 entries}};
const originalLines=doc=>entries[doc].lines.map(l=>({
 account:l.account,debit:l.debit_cents,credit:l.credit_cents
}));
const makeState=()=>({
 bank:parseBankCSV(scenarioBankCSV(manifest)).rows,
 journals:['D01','D02'].map(d=>({
  id:'j-'+d,date:docs[Number(d.slice(1))-1].date,source_type:'bank',
  source_id:d,status:'posted',lines:originalLines(d)
 }))
});
const inspect=(s,m=manifest,period='2026-01')=>inspectScenarioBankBridge(s,m,period);
test('D01 i D02: źródło CSV oraz aktywne Wn/Ma zgodne z chronionym wzorcem',()=>{
 const s=makeState(),before=JSON.stringify(s),v=inspect(s);
 assert.equal(v.passed,true);assert.equal(v.matched,2);assert.equal(v.total,2);
 assert.deepEqual(v.verified_doc_ids,['D01','D02']);
 assert.equal(v.real_bank_confirmation,false);assert.equal(v.legal_review,'not_tested');
 assert.equal(JSON.stringify(s),before,'kontrola nie zmienia danych ucznia');
});
test('Sam import bez księgowania nie zalicza mostu',()=>{
 const s=makeState();s.journals=[];
 assert.equal(inspect(s).matched,0);
 assert.equal(inspect(s).passed,false);
});
test('Brak importu i duplikaty Dxx nie mogą udawać dowodu bankowego',()=>{
 const s=makeState();s.bank=s.bank.filter(b=>b.id!=='D01');
 assert.equal(inspect(s).matched,1);
 const duplicate=makeState();duplicate.bank.push({...duplicate.bank[0]});
 assert.equal(inspect(duplicate).matched,1);
});
test('Podobna kwota bez poprawnego podpisu, daty i znaku jest odrzucana',()=>{
 for(const patch of [{description:'inny opis'},{date:'2026-01-03'},
  {amount_cents:10000},{amount_cents:-2999}]){
  const s=makeState();s.bank[1]={...s.bank[1],...patch};
  assert.equal(inspect(s).matched,1);
 }
});
test('Duplikat dekretu, brak dekretu i błędna data nie przechodzą',()=>{
 const a=makeState();a.journals.push({...a.journals[0],id:'duplikat'});
 assert.equal(inspect(a).matched,1);
 const b=makeState();b.journals[0].date='2026-01-03';
 assert.equal(inspect(b).matched,1);
 const c=makeState();c.journals.pop();
 assert.equal(inspect(c).matched,1);
});
test('Zbilansowany, ale nieprawidłowy rozrachunek NIE przechodzi',()=>{
 const s=makeState();s.journals[1].lines[0].account='800';
 assert.equal(inspect(s).matched,1);
 assert.equal(inspect(s).issues[0].code,'scenario_bank_posting_differs_from_private_model');
});
test('Równe Wn/Ma bez prawidłowego 130 NIE przechodzi',()=>{
 const s=makeState();s.journals[0].lines[0].account='202';
 assert.equal(inspect(s).matched,1);
 assert.equal(inspect(s).issues[0].code,'scenario_bank_posting_unbalanced_or_wrong_130');
});
test('Niezbilansowany dekret nie daje pozytywnego wyniku',()=>{
 const s=makeState();s.journals[0].lines[0].debit=9999;
 assert.equal(inspect(s).matched,1);
});
test('Storno aktywnego źródła blokuje zatwierdzenie banku',()=>{
 const s=makeState();s.journals.push({
  id:'storno',date:'2026-01-02',source_type:'manual',source_id:'',
  reversal_of:'j-D01',status:'posted',lines:originalLines('D01')
 });
 assert.equal(inspect(s).matched,1);
});
test('Okres biura musi odpowiadać okresowi modelu',()=>{
 assert.equal(inspect(makeState(),manifest,'2026-02').matched,0);
});
test('Nie można importować jako przelew formalnego dokumentu D03',()=>{
 const s=makeState();s.bank.push({
  id:'D03',date:docs[2].date,amount_cents:100,description:'D03 — nie-przelew'
 });
 assert.equal(inspect(s).passed,false);
 assert.equal(inspect(s).matched,2);
});
test('Uszkodzony prywatny manifest kończy się blokadą, bez rzucania wyjątków',()=>{
 assert.equal(inspect(makeState(),{...manifest,documents:docs.slice(1)}).passed,false);
 assert.equal(inspect(makeState(),{...manifest,journal_practice_v1:null}).passed,false);
 assert.equal(inspect(makeState(),null).status,'not_tested');
});

test('Długi opis lub znak nowej linii są zgodne z bezpiecznym obcięciem CSV',()=>{
 const custom={...manifest,documents:docs.map((d,n)=>n===0?
  {...d,title:'Wymyślona długa nazwa '+('A'.repeat(220))+'\nX'}:d)};
 const state=makeState();
 state.bank=parseBankCSV(scenarioBankCSV(custom)).rows;
 assert.equal(state.bank[0].description.length,245);
 assert.equal(inspect(state,custom).passed,true);
});
