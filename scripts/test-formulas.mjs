#!/usr/bin/env node
// End-to-end formula regression tests: live Excel grid + carpentry workshop.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const load=async file=>{
 const js=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
};
const {evaluateCell,parseSpreadsheetNumber,shiftFormula,cycleCellReference}=await load('src/SpreadsheetFormula.ts');
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
assert.equal(shiftFormula('=C2*$D$2',2,0),'=C4*$D$2');
assert.equal(shiftFormula('=C2*$D2+C$2',1,1),'=D3*$D3+D$2');
assert.equal(shiftFormula('=SUMA(E2:E4)',0,1),'=#ADR!');
assert.equal(shiftFormula('Wartość E2',2,2),'Wartość E2');
assert.equal(cycleCellReference('=C2*D2',2),'=$C$2*D2');
assert.equal(cycleCellReference('=$C$2*D2',2),'=C$2*D2');
assert.equal(cycleCellReference('=C$2*D2',2),'=$C2*D2');
assert.equal(cycleCellReference('=$C2*D2',2),'=C2*D2');
sheet[4][4]='= SUMA( E2:E4 )';
exact('E5','1035');
sheet[2][4]='W toku';
exact('E5','675');
console.log('✓ Excel: relative/mixed/absolute fill, reference cycling, whitespace, text in SUM ranges');

const {calculateCarpentry,examples,explainCarpentry,readCarpentryNumber,sampleValues}=await load('src/CarpentryCalculations.ts');
assert.equal(Object.keys(examples).length,6);
for(const [input,expected] of [['40',40],['200',200],['4000',4000],['80',80],['2,56',2.56],[' 4 000 ',4000]]){
 assert.equal(readCarpentryNumber(input),expected,'Rejected valid measurement: '+input);
}
assert(Number.isNaN(readCarpentryNumber('')));
assert(Number.isNaN(readCarpentryNumber('2,56 m³')));
for(const [id,result] of [[1,0.192],[8,4],[18,5],[23,24],[56,41.3],[58,5]]){
 const input=sampleValues(examples[id]);
 const out=calculateCarpentry(examples[id],input);
 assert(Math.abs(out.value-result)<1e-9,'Incorrect carpentry formula for lesson '+id);
 assert(explainCarpentry(id,out.values,out.value).includes(examples[id].unit));
}
const timber=examples[1];
const alternate=calculateCarpentry(timber,{...sampleValues(timber),count:'80'});
assert.equal(alternate.value,2.56);
assert.match(explainCarpentry(1,alternate.values,alternate.value),/80 = 2,56 m³/);
assert.match(calculateCarpentry(timber,{...sampleValues(timber),count:'2,5'}).error,/całkowitą/);
assert.equal(calculateCarpentry(examples[23],{wet:'10',dry:'10'}).value,0);
assert.match(calculateCarpentry(examples[23],{wet:'8',dry:'10'}).error,/masa/i);
assert.equal(calculateCarpentry(examples[56],{base:'125,5',surcharge:'0'}).value,125.5);
console.log('✓ Carpentry: six formulas, custom inputs, localized decimals, 80-board volume and validation');

const {readCadPoint,edges,contains,fillSegments,distance}=await load('src/CadGeometry.ts');
assert.deepEqual(readCadPoint('120.5, 100'),{x:120.5,y:100});
assert.deepEqual(readCadPoint('@250,-10',{x:100,y:100}),{x:350,y:90});
assert.equal(readCadPoint('@2,3'),undefined);
const rect={id:1,kind:'rect',layer:0,points:[{x:100,y:100},{x:600,y:400}]};
assert.equal(edges(rect).length,4);
assert.equal(contains(rect,{x:300,y:200}),true);
assert.equal(contains(rect,{x:50,y:200}),false);
const circle={...rect,kind:'circle',points:[{x:250,y:250},{x:300,y:250}]};
const poly={...rect,kind:'poly',closed:true,points:[{x:100,y:100},{x:600,y:100},{x:300,y:400}]};
for(const shape of [rect,circle,poly]){
 const fill=fillSegments(shape,20,1);
 assert(fill.length>1);
 for(const [a,b] of fill){
  assert(distance(a,b)>0);
  assert(contains(shape,{x:(a.x+b.x)/2,y:(a.y+b.y)/2}));
 }
}
console.log('✓ CAD: typed points, exact outlines and hatch clipped to three geometry types');
