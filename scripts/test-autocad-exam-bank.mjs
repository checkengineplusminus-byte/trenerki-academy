import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectCourseExamBank,examPhaseChoices} from '../supabase/functions/ta-exam/course-bank.mjs';
const lessons=JSON.parse(readFileSync(new URL('../content/autocad-real-program-2026-11-15.json',import.meta.url),'utf8')).lessons;
const questions=lessons.map(l=>({lesson_no:l.lesson_no,question:l.material.learning.question,
  question_options:l.material.learning.options,correct_option:l.material.learning.correct}));
const privateBank=Array.from({length:150},(_,n)=>({lesson_no:n%8,question:'old '+n,correct_option:0}));

test('AutoCAD exam uses all thirty current lesson questions, not an obsolete eight-lesson private bank',()=>{
 const bank=selectCourseExamBank('autocad-skroty',privateBank,questions);
 assert.equal(bank.length,30);
 assert.deepEqual(bank.map(q=>q.lesson_no),Array.from({length:30},(_,i)=>i));
 assert(bank.every(q=>q.question&&q.question_options.length>=3&&Number.isInteger(q.correct_option)));
});
test('incomplete current curriculum blocks exam instead of silently using old questions',()=>{
 const bank=selectCourseExamBank('autocad-skroty',privateBank,questions.slice(0,29));
 assert.deepEqual(bank,[]);
});
test('three opening questions come from three different thirds of the course',()=>{
 const bank=selectCourseExamBank('autocad-skroty',privateBank,questions);
 const history=[];
 for(let phase=0;phase<3;phase++){
  const eligible=examPhaseChoices('autocad-skroty',bank,history,'practice');
  assert.equal(eligible.length,10);
  assert(eligible.every(q=>Math.floor(q.lesson_no/10)===phase));
  history.push({lesson_no:eligible[0].lesson_no});
 }
 assert.equal(examPhaseChoices('autocad-skroty',bank,history,'practice').length,30);
});
test('final and extra questions assess the advanced third, never chapter 1–8',()=>{
 const bank=selectCourseExamBank('autocad-skroty',privateBank,questions);
 for(const phase of ['final','extra']){
  const pool=examPhaseChoices('autocad-skroty',bank,[{lesson_no:20}],phase);
  assert.equal(pool.length,10);
  assert(pool.every(q=>q.lesson_no>=20&&q.lesson_no<=29));
 }
});
test('all other 80 courses retain their current combined question banks',()=>{
 const p=selectCourseExamBank('excel-skroty',privateBank,questions);
 assert.equal(p.length,180);
 assert.deepEqual(examPhaseChoices('excel-skroty',p,[],'final'),p);
});
test('server selects phase-aware questions for launch, answers and resumed exams',()=>{
 const s=readFileSync(new URL('../supabase/functions/ta-exam/index.ts',import.meta.url),'utf8');
 assert.match(s,/selectCourseExamBank\(slug,privateBank,legacyBank\)/);
 assert.equal((s.match(/examPhaseChoices\(slug,bank,/g)||[]).length,3);
});
