import test from 'node:test';
import assert from 'node:assert/strict';
import {accountingExamReadiness,accountingExamBank} from '../supabase/functions/ta-exam/accounting.mjs';
import {examPhaseChoices} from '../supabase/functions/ta-exam/course-bank.mjs';
import {SCENARIO_ID,withScenarioAnswer,withBankExercise,withJournalAttempt} from '../src/accounting/simulator-core.js';

// Invented zero-activity training month, without any paid lesson content.
const documents=Array.from({length:36},(_,index)=>({
 id:'D'+String(index+1).padStart(2,'0'),date:'2026-01-15',
 title:'Fikcyjny dowód '+(index+1),kind:'formal',amount_pln:0,
 fictional:true,source_verification:'training_only'
}));
const scenario={id:SCENARIO_ID,documents,journal_practice_v1:{
 version:1,currency:'PLN',accounts:{130:'Bank',800:'Kapitał',201:'Należności'},
 entries:Object.fromEntries(documents.map(row=>[row.id,{lines:[],explanation:'Fikcyjny dowód bez księgowania.'}])),
 reconciliation:{bank:0,receivables:0,inventory:0,machine:0,trade_payables:0,loan:0,profit:0}
}};
let state={schema_version:1,invoices:[],bank:[],journals:[],matches:[]};
for(const document of documents){
 state=withScenarioAnswer(state,scenario,document.id,'formal');
 state=withJournalAttempt(state,scenario,document.id,[]);
}
state=withBankExercise(state,scenario,{bank_in_cents:0,bank_out_cents:0,bank_net_cents:0});
const materials=Array.from({length:100},(_,index)=>({topic_no:index+1,material:{
 ...(index===95?{scenario}:{}),
 exercises:Array.from({length:8},(_,n)=>n===0?
  {id:'q'+n,type:'choice',prompt:'Fikcyjna decyzja '+index,choices:['Tak','Nie','Sprawdzę'],correctIndex:2,explanation:'Zbierz dane.'}:
  {id:'q'+n,type:'number',expected:n})
}}));
const answers=materials.flatMap(row=>row.material.exercises.map((q,index)=>({
 topic_no:row.topic_no,exercise_id:q.id,answer:String(index===0?2:index)
})));
const homeworks=materials.map(row=>({topic_no:row.topic_no,version:1,
 response:'Fikcyjna samodzielna praca ucznia. '.repeat(5),submitted_at:'2026-11-27T10:00:00Z'}));
const workspaces=[{state}];
const ready=(m=materials,a=answers,h=homeworks,w=workspaces)=>accountingExamReadiness(m,a,h,w);

test('800 current answers, 100 submissions and a reconciled month unlock the exam',()=>{
 assert.deepEqual(ready(),{completed:100,total:100,month_complete:true,ready:true});
});
test('a wrong current answer blocks the exam despite 800 stored rows',()=>{
 const wrong=answers.map((row,index)=>index===799?{...row,answer:'999'}:row);
 assert.equal(ready(materials,wrong).completed,99);
 assert.equal(ready(materials,wrong).ready,false);
});
test('a missing topic, duplicate material or an exercise removed from the curriculum blocks readiness',()=>{
 assert.equal(ready(materials.slice(1)).ready,false);
 assert.equal(ready([...materials.slice(1),materials[1]]).ready,false);
 const incomplete=structuredClone(materials);incomplete[0].material.exercises.pop();
 assert.equal(ready(incomplete).ready,false);
});
test('stored answers for old IDs do not replace missing current answers',()=>{
 const old=[...answers.slice(0,-1),{topic_no:100,exercise_id:'obsolete',answer:'7'}];
 assert.equal(ready(materials,old).ready,false);
});
test('unsubmitted or incomplete homework cannot unlock a topic',()=>{
 assert.equal(ready(materials,answers,homeworks.slice(1)).completed,99);
 const draft=homeworks.map((row,index)=>index===0?{...row,submitted_at:null}:row);
 assert.equal(ready(materials,answers,draft).ready,false);
});
test('800 answers and homework do not replace the practical month',()=>{
 assert.equal(ready(materials,answers,homeworks,[]).ready,false);
 const incomplete=structuredClone(state);delete incomplete.simulator_attempts_v1.answers.D36;
 assert.equal(ready(materials,answers,homeworks,[{state:incomplete}]).ready,false);
});
test('a valid saved month can be found after another unfinished workspace',()=>{
 assert.equal(ready(materials,answers,homeworks,[{state:{}},...workspaces]).ready,true);
});
test('authored three-option questions retain their correct answer and final-topic attribution',()=>{
 const bank=accountingExamBank(materials);
 assert.equal(bank.length,100);assert.equal(bank[0].correct_option,2);
 assert.deepEqual(bank[0].question_options,['Tak','Nie','Sprawdzę']);
 assert(bank.filter(row=>row.advanced).every(row=>row.lesson_no>=90));
});
test('invalid choices and ambiguous keys are excluded from the exam bank',()=>{
 const broken=structuredClone(materials.slice(0,3));
 broken[0].material.exercises[0].correctIndex=99;
 broken[1].material.exercises[0].choices=['Tak','Tak','Nie'];
 broken[2].material.exercises[0].choices=['Tak','', 'Nie'];
 assert.equal(accountingExamBank(broken).length,0);
});
test('practice questions span new sections and final questions come from the final section',()=>{
 const bank=accountingExamBank(materials);
 const practice=examPhaseChoices('ksiegowosc-od-podstaw',bank,[{lesson_no:0}], 'practice');
 assert(practice.every(row=>row.lesson_no>=10));
 for(const phase of ['final','extra']){
  assert(examPhaseChoices('ksiegowosc-od-podstaw',bank,[],phase).every(row=>row.lesson_no>=90));
 }
});
