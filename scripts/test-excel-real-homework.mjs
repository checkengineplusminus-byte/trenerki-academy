#!/usr/bin/env node
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const lessons=JSON.parse(read('content/excel-real-homework-30.json'));
const sales=JSON.parse(read('content/excel-analyst-data.json')).rows;
const authored=JSON.parse(read('content/excel-professional-missions.json')).missions;
const reviewerIds=['formulas','data','analytics','pedagogy','ux'];
function importedModule(path){
 return ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
}
const core=importedModule('src/excelMissionAnswers.ts');
const coreUrl='data:text/javascript;base64,'+Buffer.from(core).toString('base64');
const homeworkJS=importedModule('src/excelHomeworkAnswers.ts').replaceAll("from './excelMissionAnswers'","from '"+coreUrl+"'");
const {checkExcelHomeworkAnswer,homeworkLabel,homeworkPlaceholder}=await import('data:text/javascript;base64,'+Buffer.from(homeworkJS).toString('base64'));
const every=lessons.lessons;

test('Wszystkie 30 pełnych, niezależnych zadań do samodzielnej pracy w Excelu',()=>{
 assert.equal(lessons.total,30);
 assert.equal(every.length,30);
 assert.equal(authored.length,30);
 assert.deepEqual(every.map(x=>x.lessonNo),Array.from({length:30},(_,i)=>i));
 assert.equal(new Set(every.map(x=>x.title)).size,30);
 assert.equal(new Set(every.map(x=>x.filename)).size,30);
 for(const h of every){
  assert(h.title.length>=18&&h.goal.length>=35,'Słaby cel lekcji '+h.lessonNo);
  assert(h.example.length>=55&&h.why.length>=38,'Brak przykładu '+h.lessonNo);
  assert(h.steps.length>=5&&h.steps.every(s=>s.length>=40),'Brak instrukcji krok po kroku '+h.lessonNo);
  assert(h.checks.length>=3&&h.checks.every(s=>s.length>=30),'Brak kontroli '+h.lessonNo);
  assert(h.mistakes.length>=2&&h.mistakes.every(s=>s.length>=35),'Brak pułapek '+h.lessonNo);
  assert(h.delivery.length>=42&&h.delivery.includes('Trenerki-Excel-'),'Brak pliku do zachowania '+h.lessonNo);
  assert(h.starter.file.startsWith('/academy/assets/'),'Błędna ścieżka pliku '+h.lessonNo);
  assert(h.filename.endsWith('.xlsx')&&h.minutes>=10&&h.minutes<=55,'Zły format lub czas '+h.lessonNo);
  assert(reviewerIds.includes(h.review),'Brak recenzenta zakresu '+h.lessonNo);
  const backing=read('public'+h.starter.file);
  assert(backing.includes(';')&&backing.length>50,'Pusty CSV '+h.starter.file);
  assert(homeworkLabel(h.kind).length>=15&&homeworkPlaceholder(h.kind).length>=5);
  const correct=checkExcelHomeworkAnswer(h,h.expected);
  assert.equal(correct.correct,true,'Wzorcowa odpowiedź nie przechodzi '+h.lessonNo+' '+JSON.stringify(correct));
  assert.equal(checkExcelHomeworkAnswer(h,'').correct,false,'Puste zadanie zaliczone '+h.lessonNo);
  assert.equal(checkExcelHomeworkAnswer(h,'=SUMA(A1:A3)').correct,false,'Formuła w złym polu '+h.lessonNo);
  assert.equal(checkExcelHomeworkAnswer(h,'BEZSENSOWNA ODPOWIEDŹ').correct,false,'Śmieci zaliczone '+h.lessonNo);
 }
});
test('Prawdziwe pliki CSV dostępne: BOM UTF-8, średnik, przykłady liczb i zera w ID',()=>{
 const basic=read('public/academy/assets/excel-homework-basics.csv').replace(/^\uFEFF/,'').trim().split(/\r?\n/);
 const codes=read('public/academy/assets/excel-homework-codes.csv').replace(/^\uFEFF/,'').trim().split(/\r?\n/);
 assert.equal(basic[0].split(';').length,5);
 assert.equal(basic.length,6);
 assert.equal(codes[0].split(';').length,4);
 assert.equal(codes.length,5);
 assert(basic.includes('Farba;Materiały;2;350;'));
 assert(basic.includes('Taśma;Materiały;3;120;'));
 assert(codes.some(x=>x.startsWith('00073;')));
 assert(read('public/academy/assets/excel-practice-sales.csv').includes('FV-014'));
 assert(read('public/academy/assets/excel-practice-errors.csv').includes('5x'));
 assert(read('public/academy/assets/excel-professional-368-import.csv').includes('PRO-0367'));
 assert.equal(every[29].bonusStarter.file,'/academy/assets/excel-professional-368-import.csv');
 assert.equal(every[28].comparisonStarter.file,'/academy/assets/excel-practice-sales.csv');
 assert(read('public'+every[28].comparisonStarter.file).includes('FV-015'));
});
test('Sprawdzanie odpowiedzi: kwoty, procenty, kody, adresy, PDF, separator i błędy',()=>{
 const home=i=>every[i],yes=(i,v)=>assert.equal(checkExcelHomeworkAnswer(home(i),v).correct,true,'Powinno przejść '+i+' '+v);
 const no=(i,v)=>assert.equal(checkExcelHomeworkAnswer(home(i),v).correct,false,'Nie może przejść '+i+' '+v);
 for(const i of [4,5,6,9,12,13,14,15,18,19,20,24,25,26,29]){
  yes(i,home(i).expected+' zł');
  yes(i,home(i).expected+' PLN');
 }
 yes(7,'37,5%');yes(7,'37.5');no(7,'37,5 zł');no(7,'0,375%');
 yes(1,'4 arkusze');yes(16,'1 strona');yes(28,'4 błędy');no(1,'4 zł');no(28,'4 zł');
 yes(8,'.xlsx');yes(8,'xlsx');no(8,'csv');
 yes(3,'00073');no(3,'73');yes(22,'#DIV/0!');yes(22,'#DZIEL/0!');
 yes(11,'=C3*D3');no(11,'C3*D3');yes(23,'3970 zł');
 yes(27,'tylko do odczytu');yes(27,'może wyświetlać');no(27,'edycja');
 no(5,'=C2*D2');no(6,'SUMA');no(15,'=SUMA.WARUNKÓW(A1:A9)');
});
test('Niezależne obliczenia domowych zadań eksperckich na prawdziwych rekordach',()=>{
 const revenue=sales.reduce((n,x)=>n+x.quantity*x.netPrice,0);
 const margin=sales.reduce((n,x)=>n+x.quantity*(x.netPrice-x.unitCost),0);
 const cost=sales.reduce((n,x)=>n+x.quantity*x.unitCost,0);
 const northMaterials=sales.filter(x=>x.region==='Północ'&&x.category==='Materiały')
   .reduce((n,x)=>n+x.quantity*x.netPrice,0);
 const months=Object.groupBy(sales,x=>x.month);
 const leader=Object.entries(months).map(([month,rows])=>({month,sum:rows.reduce((n,x)=>n+x.quantity*x.netPrice,0)})).sort((a,b)=>b.sum-a.sum)[0];
 const materialsCost=sales.filter(x=>x.category==='Materiały').reduce((n,x)=>n+x.quantity*x.unitCost,0);
 const audited=sales.find(x=>x.invoice==='FV-014');
 assert.equal(sales.length,18);
 assert.equal(revenue,28245);assert.equal(margin,9109);assert.equal(cost,19136);
 assert.equal(Number(every[20].expected),cost);
 assert.equal(Number(every[15].expected),northMaterials+85);
 assert.equal(every[17].expected,leader.month);
 assert.equal(leader.sum,9775);
 assert.equal(Number(every[24].expected),audited.quantity*audited.netPrice);
 assert.equal(Number(every[25].expected),revenue+85);
 assert.equal(Number(every[26].expected),Math.round((margin-materialsCost*.2)*100)/100);
 assert.equal(Number(every[29].expected),revenue);
});
test('5 niezależnych perspektyw eksperckich: każda ma mierzalne kryteria, bez udawania opinii ludzi',()=>{
 const set=new Set(lessons.reviewRubric.map(x=>x.id));
 assert.equal(set.size,5);
 assert.deepEqual([...set].sort(),reviewerIds.slice().sort());
 for(const r of lessons.reviewRubric)assert(r.role.length>10&&r.focus.length>40&&r.source.length>10,'Słaba rubryka '+r.id);
 for(const reviewer of lessons.reviewRubric){
  const selected=every.filter(x=>x.review===reviewer.id);
  assert(selected.length>=1,reviewer.id+' bez sprawdzanych lekcji');
  assert(selected.every(x=>x.steps.length>=5&&x.checks.length>=3));
 }
 assert(every.filter(x=>x.kind==='formula').length>=1);
 assert(every.filter(x=>x.kind==='number').length>=10);
 assert(every.filter(x=>x.starter.file.includes('sales')).length>=6);
 assert(every.filter(x=>x.delivery.toLowerCase().includes('pdf')).length>=2);
 assert(/nie odczytuje ani nie ocenia lokalnego XLSX/i.test(lessons.note),'Brak uczciwego ograniczenia');
});
test('Dostęp do prac domowych na każdym ekranie oraz rzeczywiste pobieranie',()=>{
 const mount=read('src/LessonIllustratedSections.tsx'),ui=read('src/ExcelRealHomework.tsx');
 assert(mount.includes("courseSlug==='excel-skroty'&&<ExcelRealHomework"));
 for(const id of ['excel-real-homework-','excel-homework-toggle','excel-homework-download','excel-homework-answer','excel-homework-check','excel-homework-feedback','excel-homework-step-','excel-homework-criterion-','excel-homework-solution'])
  assert(ui.includes(id),'Brak testowalnego elementu '+id);
 assert(ui.includes('download'),"Brak realnego linku do plików CSV");
 assert(ui.includes('checkExcelHomeworkAnswer(item,answer)'));
 assert(ui.includes('Nie odczytujemy pliku XLSX'),'Nie wolno twierdzić, że sprawdzamy plik użytkownika');
 assert(!ui.includes("supabase.from("),'Bez zmiany zapisanych zaliczeń użytkownika');
});
