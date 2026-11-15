#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const shortcuts=JSON.parse(read('content/excel-shortcuts-encyclopedia.json'));
const catalog=JSON.parse(read('content/excel-function-index-2026.json'));
const deep=JSON.parse(read('content/excel-function-deep-guide.json'));
test('70 kluczowych skrótów ma indywidualne wyjaśnienia, efekt i ćwiczenie',()=>{
 assert.equal(shortcuts.count,70);
 assert.equal(shortcuts.shortcuts.length,shortcuts.count);
 assert.equal(new Set(shortcuts.shortcuts.map(x=>x.combo)).size,shortcuts.count);
 for(const x of shortcuts.shortcuts){
  assert(x.combo&&x.title&&x.lessonNo>=0&&x.lessonNo<=29);
  for(const field of ['before','after','why','practice','pitfall','platform'])
   assert(typeof x[field]==='string'&&x[field].length>=20, 'Brak wyjaśnienia '+x.combo+' '+field);
 }
 for(const x of ['Ctrl+S','Ctrl+C','Ctrl+V','Ctrl+Z','Ctrl+T','F4','Alt+=','Ctrl+Shift+L','F11','Alt+F1','Ctrl+1','Ctrl+P','Ctrl+Home','Ctrl+End'])
  assert(shortcuts.shortcuts.some(s=>s.combo===x),'Brak '+x);
});
test('514 funkcji w spisie i 66 szczegółowo opracowanych bez podawania pozorów kompletności',()=>{
 assert.equal(catalog.functions.length,514);
 assert.equal(deep.lessons.length,66);
 assert.equal(new Set(deep.lessons.map(x=>x.code)).size,66);
 const names=new Map(catalog.functions.map(x=>[x.code,x.name]));
 for(const x of deep.lessons){
  assert.equal(names.get(x.code),x.name, 'Niezgodna nazwa '+x.code);
  for(const f of ['syntax','example','result','argumentsExplanation','walkthrough','pitfall','exercise','source'])
   assert(typeof x[f]==='string'&&x[f].length>=(f==='result'?1:4),'Niepełna karta '+x.code+' '+f);
  assert(x.guidedSteps.length>=3);
  assert(x.example.startsWith('='),'Formuła bez znaku =: '+x.code);
  assert(x.source.startsWith('https://support.microsoft.com/'));
 }
 for(const code of ['IF','AND','OR','IFERROR','SUM','ROUND','MOD','PRODUCT','AVERAGE','MIN','MAX','COUNTIF','SUMIF','MODE','VLOOKUP','HLOOKUP','XLOOKUP','INDIRECT','INDEX','MATCH','LEN','MID','PROPER','CLEAN','CONCATENATE','WEEKDAY','TODAY','NOW','DATE','PMT','PV','NPV']){
  assert(deep.lessons.some(x=>x.code===code), 'Brak rozpisanej funkcji '+code);
 }
 assert.equal(names.get('XLOOKUP'),'X.WYSZUKAJ');
 assert.equal(names.get('FILTER'),'FILTR');
 assert.equal(names.get('SQRT'),'PIERWIASTEK');
});
test('agregacje, tabele, wykresy i scenariusze odpowiadają prawdziwym obliczeniom',async()=>{
 const js=ts.transpileModule(read('src/excelVisualMath.ts'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const m=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
 const rows=m.sampleVisualRows.map(x=>({...x}));
 assert.equal(m.excelVisualTotal(rows),830);
 assert.deepEqual(m.excelVisualAggregate(rows,'region','revenue').map(x=>[x.key,x.value]),[['Północ',140],['Centrum',240],['Południe',450]]);
 assert.deepEqual(m.excelVisualAggregate(rows,'month','revenue').map(x=>[x.key,x.value]),[['Styczeń',200],['Luty',360],['Marzec',270]]);
 assert.deepEqual(m.excelVisualAggregate(rows,'category','revenue').map(x=>[x.key,x.value]),[['Materiały',590],['Usługi',240]]);
 assert.equal(m.excelVisualAggregate(rows,'category','count').reduce((v,x)=>v+x.value,0),6);
 assert.equal(m.excelVisualAggregate(rows,'region','quantity').reduce((v,x)=>v+x.value,0),18);
 rows[0].qty='5';
 assert.equal(m.excelVisualTotal(rows),950);
 assert.equal(m.excelVisualAggregate(rows,'region','revenue')[0].value,260);
 rows[0].qty='5 zł';
 assert.equal(m.excelVisualValid(rows),false);
 assert(Number.isNaN(m.excelVisualTotal(rows)));
 assert.deepEqual(m.excelVisualAggregate(rows,'region','revenue'),[]);
});
test('spis funkcji i 70 skrótów widoczny na każdej lekcji, praktyczne diagramy faktycznie używane',()=>{
 const page=read('app/nauka.tsx'),master=read('src/ExcelMasterGuide.tsx'),
  details=read('src/ExcelFunctionDetails.tsx'),short=read('src/ExcelShortcutsDirectory.tsx'),chart=read('src/ExcelVisualPractices.tsx');
 assert.match(page,/index>0&&<ExcelMasterGuide/);
 assert.match(page,/index===0&&slug==='excel-skroty'&&<ExcelMasterGuide/);
 assert.match(page,/\[9,15,17,18,20,25,26,29\]\.includes\(module\).*<ExcelVisualPractices/);
 assert.match(master,/excel-shortcuts-open-button/);
 assert.match(master,/excel-functions-open-button/);
 assert.match(master,/ExcelShortcutsDirectory/);
 assert.match(master,/ExcelFunctionDetails/);
 assert.match(details,/argumentsExplanation/);
 assert.match(details,/guidedSteps/);
 assert.match(short,/excel-shortcuts-search/);
 for(const x of ['excel-visual-source-table','excel-visual-chart','excel-visual-pivot-stale','excel-visual-total','excel-visual-answer'])
  assert(chart.includes(x),'Brakuje '+x);
 assert.match(chart,/setFilter\(x\);setSelected\(''\);setFeedback\(''\);setAnswer\(''\);if\(pivotMode\)\{setPivot\(null\)/);
 assert(page.includes("ta_enrollments"),'Protected course authorization is missing');
});
