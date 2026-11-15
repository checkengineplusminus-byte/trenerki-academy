import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {examReadiness} from '../supabase/functions/ta-exam/readiness.mjs';

const course=Array.from({length:30},(_,lesson_no)=>({lesson_no}));
const code=readFileSync(new URL('../supabase/functions/ta-exam/index.ts',import.meta.url),'utf8');

test('a missing lesson blocks the final exam',()=>{
 assert.deepEqual(examReadiness(course,course.slice(0,29)),{completed:29,total:30,ready:false});
});
test('obsolete and duplicate rows never substitute a missing lesson',()=>{
 const rows=[...course.slice(0,29),{lesson_no:29+900},{lesson_no:0}];
 assert.deepEqual(examReadiness(course,rows),{completed:29,total:30,ready:false});
});
test('all distinct current lesson IDs unlock the exam',()=>{
 assert.deepEqual(examReadiness(course,[...course].reverse()),{completed:30,total:30,ready:true});
});
test('an empty curriculum is not a completed course',()=>{
 assert.deepEqual(examReadiness([],[{lesson_no:0}]),{completed:0,total:0,ready:false});
});
test('old certificates and passed sessions are checked AFTER current readiness',()=>{
 const readyGuard=code.indexOf("if(!ready){");
 const oldDiploma=code.indexOf("if(existingCert&&");
 const session=code.indexOf("const recoveryQuery=");
 assert(readyGuard>0&&oldDiploma>readyGuard&&session>oldDiploma,'Previous award must not bypass current curriculum');
});
