#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('katalog funkcji: 514 pozycji, linki Microsoft, nazwy unikatowe',()=>{
 const data=JSON.parse(read('content/excel-function-index-2026.json'));
 assert.equal(data.count,514);
 assert.equal(data.functions.length,514);
 assert(data.functions.every(x=>typeof x.what==='string'&&x.what.length>=20),'Każda funkcja musi mieć własny opis');
 assert(data.functions.filter(x=>x.example).length>=40,'Przyklady ważnych funkcji powinny działać i być zachowane');
 assert.equal(new Set(data.functions.map(x=>x.code)).size,514);
 assert(data.functions.every(x=>x.url.startsWith('https://support.microsoft.com/')));
 for(const id of ['IF','AND','OR','IFERROR','SUM','ROUND','MOD','AVERAGE','COUNTIF','SUMIF','VLOOKUP','HLOOKUP','XLOOKUP','INDEX','MATCH','LEN','MID','TODAY','NOW','DATE','PMT','NPV','PV','FILTER','UNIQUE','SORT','LAMBDA','LET','XIRR']){
  assert(data.functions.some(x=>x.code===id),'Brak funkcji '+id);
 }
});
test('plan kursu: 39 rozdziałów, trzy poziomy i zadania',()=>{
 const data=JSON.parse(read('content/excel-master-syllabus.json'));
 assert.equal(data.chapterCount,39);
 assert.equal(data.chapters.length,39);
 assert.deepEqual([...new Set(data.chapters.map(x=>x.level))],['Podstawy','Praktyka','Zaawansowane']);
 assert(data.chapters.every(x=>x.explanation.length>70&&x.steps.length>=3&&x.example.length>20&&x.assignment.length>20));
 for(const topic of ['PDF','tabele przestawne','Power Query','waluta','wykres','JEŻELI','PMT','wierszy','kolumn']){
  assert(data.chapters.some(x=>(x.title+' '+x.explanation+' '+x.example).toLocaleLowerCase('pl-PL').includes(topic.toLocaleLowerCase('pl-PL'))),'Brak tematu '+topic);
 }
});
test('UI: rozdziały, indeks, PDF i ochrony lekcji',()=>{
 const ui=read('src/ExcelMasterGuide.tsx');
 const page=read('app/nauka.tsx');
 const route=read('app/_layout.tsx');
 assert.match(ui,/excel-master-function-search/);
 assert.match(ui,/excel-pdf-check/);
 assert.match(ui,/print-rows-with-column-headers-on-top-of-every-page/);
 assert.match(page,/<ExcelMasterGuide lessonNo=\{module\}\/>/);
 assert.match(page,/index>0&&<ExcelMasterGuide/);
 assert.match(ui,/ExcelShortcutsDirectory/);
 assert.match(ui,/ExcelFunctionDetails/);
 assert.match(page,/supabase\.auth\.getUser\(\)/);
 assert.match(page,/ta_enrollments/);
 assert.match(route,/<Stack\.Protected guard=\{signedIn\}/);
});
