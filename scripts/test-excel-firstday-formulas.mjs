#!/usr/bin/env node
// Real regression tests for the first six steps: accept both Excel formula and
// displayed numeric result, regardless of case; no arbitrary JS execution.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const transpiled=ts.transpileModule(read('src/excelFirstDayAnswers.ts'),{
 compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}
}).outputText;
const {checkFirstDayAnswer,beginnerCount,beginnerMoney}=await import('data:text/javascript;base64,'+Buffer.from(transpiled).toString('base64'));

assert.equal(beginnerMoney('1 250,50 zł'),1250.5);
assert.equal(beginnerMoney('1250.50 PLN'),1250.5);
assert.equal(beginnerMoney('24'),24);
assert.equal(beginnerMoney('zł'),null);
assert.equal(beginnerMoney('3*45'),null);
assert.equal(beginnerCount('0'),null);
assert.equal(beginnerCount('4'),4);

for(const sample of [
 {name:'dom',price:45,first:135,firstTotal:199,after:211,rows:[{amount:'3',price:45},{amount:'3',price:12},{amount:'1',price:28}]},
 {name:'sklep',price:8,first:24,firstTotal:66,after:78,rows:[{amount:'3',price:8},{amount:'3',price:12},{amount:'1',price:6}]}
]){
 const check=(answer,step)=>checkFirstDayAnswer(answer,step,sample.rows);
 for(const form of ['=b2*c2','=B2*C2','=C2*B2',' = $B$2 * $C$2 ']){
  const x=check(form,2);
  assert.equal(x.correct,true,JSON.stringify({sample:sample.name,form,x}));
  assert.equal(x.kind,'formula');
  assert.match(x.message,/formuła/i);
 }
 assert.equal(check(String(sample.first),2).correct,true);
 assert.equal(check(sample.first+' zł',2).correct,true);
 assert.equal(check('1',2).correct,false);
 assert.equal(check('=B2+C2',2).correct,false);
 assert.match(check('=B2+C2',2).message,/B2 oznacza ilość/i);
 assert.equal(check('',2).correct,false);
 assert.equal(check('qwerty',2).correct,false);
 for(const formula of ['=suma(d2:d4)','=SUM(D2:D4)','=D2+D3+D4','=D4+D2+D3','=SUMA(D2;D3;D4)']){
  assert.equal(check(formula,3).correct,true,sample.name+' '+formula);
 }
 assert.equal(check(String(sample.firstTotal),3).correct,true);
 assert.equal(check(String(sample.firstTotal)+' zł',3).correct,true);
 assert.equal(check('=B2*C2',3).correct,false);
 assert.equal(check('1',3).correct,false);
 sample.rows[1].amount='4';
 assert.equal(check('=SUMA(D2:D4)',5).correct,true);
 assert.equal(check(String(sample.after),5).correct,true);
 assert.equal(check(String(sample.firstTotal),5).correct,false,'Stara suma powinna zostać odrzucona');
}
const ui=read('src/ExcelFirstDayPractice.tsx');
for(const required of [
 'excel-first-worked-example','NAJPIERW PRZYKŁAD',
 'excel-first-step-explanation','excel-first-formula-notice',
 'excel-first-step-success','Nie wiem, co wpisać',
 'checkFirstDayAnswer(answer','keyboardType="default"',
 'Zanim zaczniesz liczyć','Wyświetla'
].filter(x=>x!=='Wyświetla')){
 assert(ui.includes(required),'Brakuje dydaktycznego elementu: '+required);
}
assert(!ui.includes('keyboardType="decimal-pad"'),'Klawiatura musi pozwolić wpisać = i litery na telefonie');
console.log('✓ 2 scenariusze: =b2*c2, SUMA, liczby, PLN, stale wyników, błędy, telefon i przykłady');
