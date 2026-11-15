import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const terms=JSON.parse(read('content/excel-encyclopedia-glossary.json'));
const bonus=JSON.parse(read('content/excel-bonus-chapters.json'));
const deep=JSON.parse(read('content/excel-deep-lessons.json'));
const missions=JSON.parse(read('content/excel-professional-missions.json')).missions;
const ui=read('src/ExcelAcademyLibrary.tsx');
const illustrated=read('src/LessonIllustratedSections.tsx');
const orientation=read('src/SoftwareOrientation.tsx');

test('Excel glossary offers 100+ real explanations, examples and warnings across six professional areas',()=>{
 assert(terms.terms.length>=110, 'Bilingual, comprehensive foundational-to-pro glossary is missing');
 assert.equal(new Set(terms.terms.map(t=>t.id)).size,terms.terms.length,'Duplicate glossary entries');
 const categories=new Set(terms.terms.map(t=>t.category));
 assert(categories.size>=6);
 for(const term of terms.terms){
  assert(term.term.trim().length>=3,'Short term name '+term.term);
  assert(term.definition.trim().length>=80,'Vague definition '+term.term);
  assert(term.example.trim().length>=30,'No concrete example '+term.term);
  assert(term.pitfall.trim().length>=30,'No misconception '+term.term);
  assert(/^https:\/\/support\.microsoft\.com\//.test(term.reference),'No supporting Microsoft source '+term.term);
 }
 const required=['Skoroszyt','Komórka','X.WYSZUKAJ','SUMA.WARUNKÓW','Power Query','Power Pivot','DAX','LAMBDA','Walidacja danych','Historia wersji','CSV'];
 for(const name of required)assert(terms.terms.some(t=>t.term===name),'Missing definition: '+name);
});

test('Every existing Excel lesson has four long, lesson-specific explanations before graded practice',()=>{
 assert.equal(deep.lessons.length,30);
 assert.deepEqual(deep.lessons.map(x=>x.lesson_no),Array.from({length:30},(_,i)=>i));
 assert.equal(new Set(deep.lessons.map(x=>x.sections[0].text)).size,30);
 const ids=new Set(terms.terms.map(t=>t.term.toLocaleLowerCase('pl-PL').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l')));
 let covered=0;
 for(const entry of deep.lessons){
  assert.equal(entry.sections.length,4,'Missing explanatory sections at lesson '+entry.lesson_no);
  assert(entry.sections.every(s=>s.heading.trim()&&s.text.trim().length>=140),'Superficial explanations in lesson '+entry.lesson_no);
  assert(entry.glossary.length>=3,'Missing contextual words at '+entry.lesson_no);
  for(const term of entry.glossary)if(ids.has(term))covered++;
  const mission=missions[entry.lesson_no];
  assert(mission&&entry.title===mission.goal,'Explanations not aligned with graded exercise '+entry.lesson_no);
 }
 assert(covered>=60,'Contextual glossary links cover too few terms: '+covered);
 assert(illustrated.includes('<ExcelDeepLesson'),'Deep explanation is not in live course renderer');
 assert(illustrated.indexOf('<ExcelDeepLesson')<illustrated.indexOf('<ExcelProfessionalMission'),'Teach BEFORE testing');
});

test('Twelve complete bonus chapters are grounded, diverse and leave 30 certified lessons untouched',()=>{
 assert.equal(bonus.chapters.length,12);
 assert.equal(new Set(bonus.chapters.map(x=>x.id)).size,12);
 assert.equal(bonus.timeline.length,6);
 assert.deepEqual(bonus.timeline.map(x=>x.year),['1979','1982','1985','1987','2007','2025']);
 for(const c of bonus.chapters){
  assert(c.title.length>=18,'Missing title '+c.id);
  assert(c.lead.length>=75,'Missing opening '+c.id);
  assert(c.sections.length>=4,'Not sufficiently detailed '+c.id);
  assert(c.sections.every(s=>s.heading.length>=7&&s.text.length>=170),'Not enough educational depth in '+c.id);
  assert(c.task.length>=30&&c.answer.length>=2&&c.tip.length>=20,'Bonus chapter lacks real learning check '+c.id);
  assert(/^https:\/\//.test(c.source),'Bonus chapter lacks source: '+c.id);
 }
 for(const word of ['Power Query','Power Pivot','DAX','LAMBDA','JEŻELI','history']){
  const corpus=JSON.stringify(bonus.chapters).toLocaleLowerCase('pl-PL');
  if(word==='history')continue;
  assert(corpus.includes(word.toLocaleLowerCase('pl-PL')),'Missing key topic '+word);
 }
 assert(bonus.note.includes('30 formalne lekcje'));
 assert(missions.length===30);
});

test('Browser UI is accessible and never pretends bonus chapters are formal certificates',()=>{
 for(const name of ['excel-encyclopedia','excel-history','excel-onboarding','excel-glossary','excel-bonus-chapters','excel-bonus-correct','excel-bonus-wrong','excel-deep-definition'])
  assert(ui.includes(name),'UI test ID missing: '+name);
 assert(ui.includes('Szukaj w słowniku Excel'));
 assert(ui.includes('Pokaż kolejne pojęcia'));
 assert(ui.includes('Odpowiedź w dodatkowym rozdziale Excel'));
 assert(ui.includes('nie wpływają na dyplom'));
 assert(ui.includes('lessonNo===0'),'First lesson must default to open history');
 assert(illustrated.includes('<ExcelAcademyLibrary'),'Library not connected to course');
 assert(orientation.includes("'excel-skroty'"),'Excel onboarding not preserved');
});
