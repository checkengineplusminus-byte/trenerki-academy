#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const compiled=ts.transpileModule(read('src/SpreadsheetFormula.ts'),{
 compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}
}).outputText;
const {parseSpreadsheetNumber,evaluateCell}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const checks=[['1 250,50 zł',1250.5],['1\u00a0250,50 PLN',1250.5],['2,56 zł',2.56],['0 zł',0],['-25,40 PLN',-25.4],['1250,50',1250.5]];
for(const [raw,expected] of checks)assert.equal(parseSpreadsheetNumber(raw),expected,'Niepoprawna kwota '+raw);
for(const raw of ['12,3 kg','abc zł','1,2,3 zł','4 000 cm','zł','PLN'])assert(Number.isNaN(parseSpreadsheetNumber(raw)),'Fałszywa liczba '+raw);
const sheet=[
 ['Lp.','Usługa','Ilość','Cena','Wartość'],
 ['1','Malowanie','2','350 zł','=C2*D2'],
 ['2','Materiały','3','120,50 PLN','=C3*D3'],
 ['3','Transport','1','1 250,50 zł','=C4*D4'],
 ['','','','Razem','=SUMA(E2:E4)'],
 ['','','','VAT 23%','=E5*0,23']
];
for(const [ref,expected] of [['E2','700'],['E3','361,5'],['E4','1250,5'],['E5','2312'],['E6','531,76']])assert.equal(evaluateCell(sheet,ref),expected,ref);
sheet[1][2]='4,5';assert.equal(evaluateCell(sheet,'E2'),'1575');
const ui=read('src/SpreadsheetWorkspace.tsx');
assert.match(ui,/Format zł · PLN/);
assert.match(ui,/currency:true/);
assert.match(ui,/Symbol zł jest formatem/);
const nav=read('app/nauka.tsx');
assert.match(nav,/\[data-testid="excel-workspace"\]/);
assert.match(nav,/scrollIntoView/);
console.log('PASS: PLN as numeric, formula recalculation, bad units, currency display, correct workshop target');
