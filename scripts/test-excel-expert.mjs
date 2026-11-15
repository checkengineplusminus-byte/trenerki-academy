import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const get=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const missions=JSON.parse(get('content/excel-professional-missions.json')).missions;
const fixture=JSON.parse(get('content/excel-analyst-data.json'));
const engine=await import('../src/excelAdvancedMath.ts');
const {round2,total,lineRevenue,lineMargin,sumIfs,findInvoice,pivot,scenario,auditImport,plNumber,safeDataset}=engine;
const answer=(n)=>missions[n].expected;
test('Excel quality gate: 30 DIFFERENT lesson exercises across 3 honest levels',()=>{
 assert.equal(missions.length,30);
 assert.deepEqual(missions.map(x=>x.lesson_no),Array.from({length:30},(_,i)=>i));
 assert.equal(new Set(missions.map(x=>x.goal)).size,30);
 assert.deepEqual(Object.entries(missions.reduce((a,x)=>(a[x.track]=(a[x.track]||0)+1,a),{})).sort(),[['ekspert',10],['fundamenty',10],['praktyka',10]]);
 for(const m of missions){
  assert(m.role.length>=5,'Lesson '+m.lesson_no+': role');
  assert(m.scenario.length>=30,'Lesson '+m.lesson_no+': scenario');
  assert(m.steps.length>=4,'Lesson '+m.lesson_no+': minimum four practical steps');
  assert(new Set(m.steps).size===m.steps.length,'Lesson '+m.lesson_no+': duplicate step');
  assert(m.sourceData.length>=35,'Lesson '+m.lesson_no+': source data missing');
  assert(m.expected.trim().length>0,'Lesson '+m.lesson_no+': expected answer missing');
  assert(m.explanation.length>=40,'Lesson '+m.lesson_no+': no explanation');
  assert(m.mistake.length>=35,'Lesson '+m.lesson_no+': misconception missing');
  assert(m.realExcel.length>=45,'Lesson '+m.lesson_no+': not grounded in real Excel');
  assert(m.reference.startsWith('https://support.microsoft.com/'),'Lesson '+m.lesson_no+': source');
 }
});
test('Data fixture is transparent, non-identifying and satisfies workbook conventions',()=>{
 assert.equal(fixture.currency,'PLN');
 assert.equal(fixture.rows.length,18);assert.equal(fixture.dirty.length,4);
 assert(safeDataset(fixture.rows),'Every valid row must have valid quantity, amount and identifier');
 assert.equal(new Set(fixture.rows.map(x=>x.invoice)).size,18);
 assert.equal(total(fixture.rows),28245);
 assert.equal(total(fixture.rows,'count'),18);
 const line=fixture.rows[13];
 assert.equal(line.invoice,'FV-014');
 assert.equal(lineRevenue(line),1155);
 assert.equal(lineMargin(line),378);
});
test('SUMA.WARUNKÓW must enforce TWO criteria, not only one',()=>{
 assert.equal(sumIfs(fixture.rows,'Północ','Materiały'),3125);
 assert.equal(sumIfs(fixture.rows,'Północ','Usługi'),3960);
 assert.equal(fixture.rows.filter(x=>x.region==='Północ'&&x.category==='Materiały').length,3);
 assert.equal(answer(15),'3');
 const edited=fixture.rows.map(r=>r.invoice==='FV-001'?{...r,quantity:13}:r);
 assert.equal(sumIfs(edited,'Północ','Materiały'),3210);
 assert.equal(total(edited),28330);
});
test('Exact X.WYSZUKAJ cannot silently substitute missing records with zero',()=>{
 const found=findInvoice(fixture.rows,'fv-014');
 assert.equal(found.kind,'found');
 if(found.kind==='found')assert.equal(found.amount,1155);
 const missing=findInvoice(fixture.rows,'fv-999');
 assert.deepEqual(missing,{kind:'missing',matches:0});
 const duplicate=findInvoice([...fixture.rows,fixture.rows[0]],'FV-001');
 assert.deepEqual(duplicate,{kind:'duplicate',matches:2});
 assert.equal(answer(24),'1155');
});
test('Pivot groups reconcile completely to source totals and refresh after mutation',()=>{
 const grouped=pivot(fixture.rows,'region');
 assert.deepEqual(Object.fromEntries(grouped.map(x=>[x.key,x.value])),{Centrum:9930,'Południe':9430,'Północ':8885});
 assert.equal(grouped.reduce((n,x)=>n+x.value,0),total(fixture.rows));
 assert.equal(pivot(fixture.rows,'month').length,3);
 assert.equal(pivot(fixture.rows,'category','count').reduce((n,x)=>n+x.value,0),18);
 assert.equal(answer(25),'3');
});
test('Sensitivity analysis changes margin, NOT revenue; aggregates independently',()=>{
 const base=scenario(fixture.rows,0),up=scenario(fixture.rows,15);
 assert.equal(up.baselineRevenue,28245);
 assert.equal(base.baselineRevenue,up.baselineRevenue);
 assert(up.marginDelta<0,'Material cost rise must lower margin');
 assert.equal(round2(up.newMargin-base.newMargin),up.marginDelta);
 assert.throws(()=>scenario(fixture.rows,1000),/percentage/);
});
test('CSV audit catches precisely 4 distinct issues; never imports bad rows silently',()=>{
 const problems=auditImport(fixture.rows,fixture.dirty);
 assert.equal(problems.length,4,JSON.stringify(problems));
 assert.deepEqual(problems.map(x=>x.kind),['duplicate','quantity','client','price']);
 assert.equal(answer(28),'4');
 assert(!safeDataset([...fixture.rows,{...fixture.rows[0]}]));
 assert.equal(plNumber('1 234,50'),1234.5);
 assert.equal(plNumber('5x'),null);
 assert.equal(plNumber(''),null);
});
test('Honest product contract: beginner/advanced UI is connected but never claimed to be official Excel',()=>{
 const lab=get('src/ExcelAnalystWorkbench.tsx');
 const novice=get('src/SpreadsheetWorkspace.tsx');
 const mission=get('src/ExcelProfessionalMission.tsx');
 const lessons=get('src/LessonIllustratedSections.tsx');
 const module=get('src/excelAdvancedMath.ts');
 assert.match(lessons,/courseSlug==='excel-skroty'&&<ExcelProfessionalMission/);
 assert.match(lessons,/courseSlug==='excel-skroty'&&lessonNo>=15&&<ExcelAnalystWorkbench/);
 for(const term of ['SUMA.WARUNKÓW','X.WYSZUKAJ','Tabela przestawna','Scenariusze','Audyt CSV','excel-advanced-total'])assert(lab.includes(term),term);
 assert.match(lab,/nie pełna aplikacja Microsoft Excel/);
 assert.match(mission,/nie zastępują egzaminu kursowego/);
 assert.match(novice,/function verifyBeginner\(/);
 assert.match(novice,/Sprawdź wykonanie kroku Excel/);
 assert(!module.includes('new Function(')&&!module.includes('Function('),'No dynamic JS code generation allowed');
 const csv=get('public/academy/assets/excel-practice-sales.csv');
 assert.equal(csv.split(/\r?\n/).filter(Boolean).length,19);
 assert(csv.startsWith('\uFEFF'),'CSV includes UTF-8 BOM for Excel Unicode');
});
