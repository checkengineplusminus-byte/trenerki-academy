#!/usr/bin/env node
// 30/30 mission QA: checks actual source data independently of the answer key,
// types, units, alternative formulas, wrong attempts and the presented guidance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const json=path=>JSON.parse(read(path));
const src=ts.transpileModule(read('src/excelMissionAnswers.ts'),{
 compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}
}).outputText;
const {checkExcelMissionAnswer,excelResponsePresentation,parseExcelResponseNumber,parseExcelResponseCount}=await import(
 'data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const {missions}=json('content/excel-professional-missions.json');
const lessons=json('content/v2-excel-skroty.json').lessons;
const deep=json('content/excel-deep-lessons.json').lessons;
const bonus=json('content/excel-bonus-chapters.json').chapters;
const data=json('content/excel-analyst-data.json');
const regions=Object.groupBy(data.rows,x=>x.region);
const sums=Object.fromEntries(Object.entries(regions).map(([key,rows])=>[key,rows.reduce((s,r)=>s+r.quantity*r.netPrice,0)]));
const rev=data.rows.reduce((s,r)=>s+r.quantity*r.netPrice,0);
const margin=data.rows.reduce((s,r)=>s+r.quantity*(r.netPrice-r.unitCost),0);
const materialCost=data.rows.filter(x=>x.category==='Materiały').reduce((s,r)=>s+r.quantity*r.unitCost,0);
const expectedKinds=[
 'address','count','address','identifier','number','number','number','percent','file','number',
 'address','formula','percent','number','formula','number','file','name','number','number',
 'number','identifier','error','number','number','number','number','access','count','number'
];
test('30 zadania: każda odpowiedź, format, wskazówka i negatywny przypadek',()=>{
 assert.equal(missions.length,30);
 assert.equal(new Set(missions.map(m=>m.lesson_no)).size,30);
 for(let i=0;i<30;i++){
  const m=missions[i];assert.equal(m.lesson_no,i);
  assert(m.goal.length>=14&&m.scenario.length>=35&&m.sourceData.length>=20,'Brak kontekstu: '+i);
  assert(m.steps.length>=4&&m.steps.every(x=>x.length>=10),'Brak kroków: '+i);
  assert(m.hint.length>=12&&m.explanation.length>=15&&m.mistake.length>=12,'Brak dydaktyki: '+i);
  assert(m.reference.startsWith('https://support.microsoft.com/'),'Brak oryginalnego źródła: '+i);
  const p=excelResponsePresentation(m);
  assert.equal(p.kind,expectedKinds[i],'Nieprawidłowa etykieta odpowiedzi lekcji '+(i+1));
  assert(p.instruction.length>=45&&p.title.length>=15&&p.placeholder.length>=5);
  const good=checkExcelMissionAnswer(m,m.expected);
  assert.equal(good.correct,true,'Odpowiedź wzorcowa nie działa w '+(i+1)+': '+JSON.stringify(good));
  assert.equal(checkExcelMissionAnswer(m,'').correct,false,'Puste pole jest zaliczone '+(i+1));
  assert.equal(checkExcelMissionAnswer(m,'GARBAGE-NO-ANSWER').correct,false,'Śmieciowe dane zaliczone '+(i+1));
  assert.equal(checkExcelMissionAnswer(m,'=(D2:D4)').correct,false,'Niepełna formuła zaliczona '+(i+1));
  if(p.kind==='number'){
   assert.equal(checkExcelMissionAnswer(m,String(m.expected)+' zł').correct,true,'Brak zł w '+(i+1));
   assert.equal(checkExcelMissionAnswer(m,String(m.expected)+' PLN').correct,true,'Brak PLN w '+(i+1));
  }
  if(m.unit==='number'&&Number(m.expected)<0)
   assert.equal(checkExcelMissionAnswer(m,String(m.expected).replace('-','−')+' zł').correct,true,'Minus Unicode '+(i+1));
  if(m.unit==='number'&&Math.abs(Number(m.expected))>=1000)
   assert.equal(checkExcelMissionAnswer(m,Number(m.expected).toLocaleString('pl-PL',{minimumFractionDigits:2,maximumFractionDigits:2})+' zł').correct,true,'Polskie separator + zł '+(i+1));
  if(p.kind==='count'){
   assert.equal(checkExcelMissionAnswer(m,m.expected+' zł').correct,false,'Kwoty nie mogą być liczbą obiektów '+(i+1));
   assert.equal(checkExcelMissionAnswer(m,m.expected+(i===1?' arkusze':' błędy')).correct,true,'Polskie nazwy liczby obiektów '+(i+1));
  }
  if([7,12].includes(i)){
   assert.equal(checkExcelMissionAnswer(m,m.expected+'%').correct,true,'Wpis procentowy '+(i+1));
   assert.equal(checkExcelMissionAnswer(m,m.expected+' zł').correct,false,'Błędna jednostka dla procenta '+(i+1));
  }
 }
});
test('Każda poprawna alternatywa wzoru i niepełne SUMA',()=>{
 const cases=[
 [5,['=C2*D2','=D2*C2',' = c2 * d2 '],['=C2+D2','=C2*D3']],
 [6,['=SUMA(E2:E4)','=sum(e2:e4)','=E2+E3+E4'],['=SUM(E2:E3)','=SUMA(E2:E5)']],
 [9,['=3*350+360+150','=SUMA(E2:E4)'],['=2*350+360+150']],
 [11,['=C3*D3','=D3*C3'],['=C2*D2','=C3*D2']],
 [13,['=SUMA(E2:E5)','=1210+90'],['=SUMA(E2:E4)']],
 [14,['=C2*$H$2','=$H$2*C2'],['=C2*H2','=C2*$H2']],
 [18,['=700+360','=360+700'],['=700+150']],
 [23,['=Styczeń!B2+Luty!B2','=Luty!B2+Styczeń!B2'],['=Styczeń!B2+Marzec!B2']],
 [26,['=-5691*15%','=-(5691*15%)'],['=5691*15%']]
 ];
 for(const [i,good,bad]of cases){
  for(const response of good)assert(checkExcelMissionAnswer(missions[i],response).correct,'Powinna przejść '+i+' '+response);
  for(const response of bad)assert.equal(checkExcelMissionAnswer(missions[i],response).correct,false,'Zły wzór zaliczony '+i+' '+response);
 }
 for(const answer of ['SUMA','SUMA(E2:E4)','=(D2:E4)','=SUMA(E2:E9)']){
  const result=checkExcelMissionAnswer(missions[6],answer);
  assert.equal(result.correct,false,answer);
  assert.match(result.message,/wynik|formuł|liczb/i,'Brak dydaktycznej wskazówki '+answer);
 }
 assert.equal(checkExcelMissionAnswer(missions[3],'127').correct,false,'Nie trać zer w kodzie');
 assert.equal(checkExcelMissionAnswer(missions[8],'.xlsx').correct,true);
 assert.equal(checkExcelMissionAnswer(missions[27],'tylko do odczytu').correct,true);
});
test('Dane niezależne od klucza: wszystkie krytyczne zadania finansowe i import',()=>{
 assert.equal(data.rows.length,18);assert.equal(data.dirty.length,4);
 assert.equal(rev,28245);assert.equal(margin,9109);
 assert.equal(data.rows.filter(x=>x.region==='Północ'&&x.category==='Materiały')
  .reduce((s,r)=>s+r.quantity*r.netPrice,0),3125);
 assert.equal(sums.Centrum,9930);assert.equal(sums.Północ,8885);assert.equal(sums.Południe,9430);
 assert.equal(data.rows.find(r=>r.invoice==='FV-014').quantity*data.rows.find(r=>r.invoice==='FV-014').netPrice,1155);
 assert.equal(materialCost,5691);
 assert.equal(Math.round(-materialCost*.15*100)/100,-853.65);
 const cases={15:3125,17:'Centrum',20:9109,24:1155,25:28245,26:-853.65,28:4,29:28245};
 for(const [lesson,expected] of Object.entries(cases))
  assert.equal(String(missions[Number(lesson)].expected).replace(',','.'),String(expected),'Niezgodny wzorzec zadania '+lesson);
});
test('Wszystkie trzydziestolekcyjne materiały mają pytanie, poprawny wariant i objaśnienie',()=>{
 assert.equal(lessons.length,30);assert.equal(deep.length,30);
 for(let i=0;i<30;i++){
  const l=lessons[i],m=l.material.learning,d=deep[i];
  assert.equal(l.lesson_no,i);assert.equal(d.lesson_no,i);
  assert(m.question.length>=15&&m.explanation.length>=20);
  assert.equal(m.options.length,3);
  assert.equal(new Set(m.options).size,3);
  assert(Number.isInteger(m.correct)&&m.correct>=0&&m.correct<3);
  assert(m.options[m.correct]&&m.options[m.correct].length>=15);
  assert(m.feedback.length===3);
  assert(l.material.sections.length>=4&&d.sections.length>=4);
  assert(d.sections.every(x=>x.heading.length>10&&x.text.length>55));
 }
});
test('Dwanaście zadań dodatkowych: struktura, przykłady i odpowiedzi',()=>{
 assert.equal(bonus.length,12);
 for(const [i,ch]of bonus.entries()){
  assert(ch.id&&ch.task.length>=20&&ch.answer.length>=2&&ch.tip.length>=20,'Brak danych bonus '+i);
  assert(ch.sections.length>=2);
  assert(ch.sections.every(x=>x.heading&&x.text.length>70));
 }
});
test('UI: typ odpowiedzi wynika z zadania, nie z ogólnego placeholdera',()=>{
 const ui=read('src/ExcelProfessionalMission.tsx');
 assert(ui.includes("checkExcelMissionAnswer(mission,answer)"));
 assert(ui.includes('excelResponsePresentation(mission)'));
 assert(ui.includes('excel-mission-answer-instruction'));
 assert(ui.includes('excel-mission-answer-feedback'));
 assert(!ui.includes('Jaki wynik uzyskałeś?'),'Brak jednoznacznego typu odpowiedzi');
});
test('Parser liczb: zł, %, niepoprawne jednostki i tysiące',()=>{
 assert.equal(parseExcelResponseNumber('1 250,50 zł'),1250.5);
 assert.equal(parseExcelResponseNumber('1.250,50 PLN'),1250.5);
 assert.equal(parseExcelResponseNumber('1,250.50'),1250.5);
 assert.equal(parseExcelResponseNumber('−853,65 zł'),-853.65);
 assert.equal(parseExcelResponseNumber('15%',true),15);
 for(const s of ['1,2,3','SUMA(E2:E4)','abc zł','','1 kg','10%'])assert.equal(parseExcelResponseNumber(s),null,s);
 assert.equal(parseExcelResponseNumber('15 zł',true),null);
 assert.equal(parseExcelResponseCount('4 błędy'),4);
 assert.equal(parseExcelResponseCount('3 arkusze'),3);
 assert.equal(parseExcelResponseCount('3 zł'),null);
});
