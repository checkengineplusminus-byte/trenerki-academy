#!/usr/bin/env node
// End-to-end formula regression tests: live Excel grid + carpentry workshop.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('src/SpreadsheetFormula.ts');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {evaluateCell,parseSpreadsheetNumber}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const sheet=[
 ['Lp.','Usługa','Ilość','Cena','Wartość'],
 ['1','Malowanie','2','350','=C2*D2'],
 ['2','Materiały','3','120','=C3*D3'],
 ['3','Transport','1','150','=C4*D4'],
 ['','','','Razem','=SUM(E2:E4)'],
 ['','','','VAT 23%','=E5*0.23']
];
const exact=(cell,expected)=>assert.equal(evaluateCell(sheet,cell),expected,'Formula '+cell);
exact('E2','700');
exact('E3','360');
exact('E4','150');
exact('E5','1210');
exact('E6','278,3');
sheet[1][2]='4';
exact('E2','1400');
exact('E5','1910');
exact('E6','439,3');
sheet[1][4]='=C2*D3';
exact('E2','480'); // Must respect the exact row/column references, not hardcode D2.
sheet[1][4]='=$C$2*$D$2';
exact('E2','1400');
sheet[1][4]='=C2/(D2-D2)';
exact('E2','#DZIEL/0!');
sheet[1][4]='=E2';
exact('E2','#CYKL!');
sheet[1][4]='=SUM(E2:E4)';
exact('E2','#CYKL!');
sheet[1][4]='=C2*D2';
sheet[1][2]='1,5';
exact('E2','525');
assert.equal(parseSpreadsheetNumber('2,56'),2.56);
assert(Number.isNaN(parseSpreadsheetNumber('2,56 zł')));
console.log('✓ Excel: references, locale decimals, sums, dynamic recalc, error messages and cycle guard');
const carpentry=read('src/CarpentryPracticeLab.tsx');
const formulaMap=new Map([...carpentry.matchAll(/(\d+):\{title:[^\n]*\n[\s\S]*?calculate:v=>([^\n]+),\n  solution:/g)].map(m=>[Number(m[1]),new Function('v','return ('+m[2]+');')]));
assert.equal(formulaMap.size,6,'Six active calculation workshops required');
const approx=(id,values,expected)=>{
 const actual=formulaMap.get(id)(values);
 assert(Math.abs(actual-expected)<1e-9,'Incorrect carpentry formula for lesson '+id+': '+actual+' instead of '+expected);
};
approx(1,{thickness:40,width:200,length:4000,count:6},0.192);
approx(1,{thickness:40,width:200,length:4000,count:80},2.56);
approx(8,{a:2.4,b:3.2},4);
approx(18,{rpmMotor:1200,diamMotor:10,rpmMachine:2400},5);
approx(23,{wet:12.4,dry:10},24);
approx(30,{base:35,surcharge:18},41.3);
approx(37,{a:3,b:4},5);
assert(carpentry.includes('function explain(values:Record<string,number>,expected:number)'),'Solution must be computed from current values');
assert(carpentry.includes('Pokaż wynik i wzór dla tych danych'),'Users must be able to see actual calculated result');
assert(!carpentry.includes('{problem.solution}'),'Static solution must not appear when input values change');
console.log('✓ Carpentry: all six formulas, 80-board timber example = 2.56 m³, live worked solutions');
