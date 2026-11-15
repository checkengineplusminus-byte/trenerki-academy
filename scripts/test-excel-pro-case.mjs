import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const db=JSON.parse(get('content/excel-pro-case.json'));
const {inspectImport,proStats,parseIdentifiers,equalIdentifiers,strictNumber,validISODate}=await import('../src/excelProReview.ts');
const raw=[...db.valid,...db.untrusted],checked=inspectImport(raw,db.allowed.region);
const stats=proStats(checked.valid);
test('The professional case has 368 genuine rows and exactly 360 clean records',()=>{
 assert.equal(raw.length,368);
 assert.equal(db.valid.length,360);
 assert.equal(db.untrusted.length,8);
 assert.equal(checked.valid.length,360);
 assert.equal(checked.defects.length,8,JSON.stringify(checked.defects));
 assert.equal(new Set(checked.defects.map(d=>d.invoice)).size,8);
 assert.deepEqual(checked.defects.map(d=>d.invoice),['PRO-0044','PRO-0361','PRO-0362','PRO-0363','PRO-0364','PRO-0365','PRO-0366','PRO-0367']);
});
test('Import rejects duplicates, tampered quantities, blanks, calendar errors, unknown regions and negative cost',()=>{
 const reasons=checked.defects.flatMap(x=>x.reasons);
 for(const marker of ['duplicate invoice','invalid quantity','empty client','invalid unit price','invalid date','invalid region','invalid unit cost'])
  assert(reasons.includes(marker),'QA missing '+marker);
 assert.equal(validISODate('2026-02-30'),false);
 assert.equal(validISODate('2026-02-28'),true);
 assert.equal(validISODate('2026-11-15'),true);
 assert.equal(strictNumber('5x'),null);
 assert.equal(strictNumber('-50.00'),-50);
});
test('Annual model independently reconciles discounted net revenue and margin to clean inputs',()=>{
 assert.equal(stats.records,360);
 assert.equal(stats.revenue,2128968.5);
 assert.equal(stats.margin,703969.22);
 assert.equal(stats.quantity,4344);
 assert.equal(stats.discounted,262);
 assert.equal(Object.keys(stats.months).length,12);
 assert.equal(Object.keys(stats.regions).length,4);
 assert.equal(stats.regions['Południe'],546710.6);
 assert.equal(stats.months['2026-11'],232952.15);
 assert.equal(Object.values(stats.regions).reduce((a,b)=>Math.round((a+b)*100)/100,0),stats.revenue);
 assert.equal(Object.values(stats.months).reduce((a,b)=>Math.round((a+b)*100)/100,0),stats.revenue);
});
test('Senior audit requires finding ALL eight exact identifiers, not merely guessing count eight',()=>{
 const ids=checked.defects.map(x=>x.invoice);
 assert.equal(equalIdentifiers(ids.join(', '),ids),true);
 assert.equal(equalIdentifiers([...ids].reverse().join(';'),ids),true);
 assert.equal(equalIdentifiers(ids.slice(1).join(','),ids),false);
 assert.equal(equalIdentifiers(ids.join(',')+', PRO-9999',ids),false);
 assert.equal(equalIdentifiers('8',ids),false);
 assert.deepEqual(parseIdentifiers('pro-0361, pro-0362\nPRO-0361'),['PRO-0361','PRO-0362']);
});
test('Real Excel CSV has 368 data rows in UTF-8; does not label the eight anomalies',()=>{
 const csv=get('public/academy/assets/excel-professional-368-import.csv');
 const lines=csv.trim().split(/\r?\n/);
 assert.equal(lines.length,369);
 assert(csv.startsWith('\uFEFF'));
 assert(lines[0].includes('discountPct')&&lines[0].includes('unitCost'));
 assert(!lines[0].includes('issue'));
 assert.equal(lines.filter(x=>x.includes('"PRO-0044"')).length,2);
 assert(lines.some(x=>x.includes('"PRO-0361"')&&x.includes('"5x"')));
});
test('All six independent expert exercises are integrated in the last part of course',()=>{
 const ui=get('src/ExcelProCaseLab.tsx'),reader=get('src/LessonIllustratedSections.tsx'),intro=get('src/CourseIntro.tsx');
 for(const label of ['Audyt 8 błędów','Uzgodnij przychód','Marża po kosztach','Region lider','Miesiąc lider','Rabat i częstotliwość'])
  assert(ui.includes(label),'Missing expert challenge '+label);
 assert(ui.includes('inspectImport')&&ui.includes('proStats')&&ui.includes('equalIdentifiers'));
 assert(ui.includes('nie widzi pliku na Twoim komputerze'),'Must not pretend to inspect learner PC');
 assert(reader.includes("<ExcelProCaseLab/>"));
 assert(intro.includes('Bardziej złożone funkcje')&&intro.includes('X.WYSZUKAJ'),'Intro should signal advanced lessons without overwhelming beginners');
});
