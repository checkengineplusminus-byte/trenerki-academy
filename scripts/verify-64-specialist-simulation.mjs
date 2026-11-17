#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const dir=new URL('../',import.meta.url);
const r=JSON.parse(readFileSync(new URL('content/testy-64-specjalistow-20261117.json',dir),'utf8')).reviews;
const old=JSON.parse(readFileSync(new URL('content/expert-64-browser-fixture-20261117.json',dir),'utf8')).lessons;
const map=new Map(old.map(x=>[x.course_slug+':'+x.lesson_no,x]));
assert.equal(r.length,64);
assert.equal(new Set(r.map(x=>x.slug+':'+x.lesson_no)).size,64);
assert.equal(new Set(r.map(x=>x.reviewer_profile)).size,64);
for(const t of r){
 const row=map.get(t.slug+':'+t.lesson_no);
 assert(row&&row.material.editorial_status==='needs_expert_review');
 const q=row.material.construction?.roleplay||row.material.learning;
 assert(q&&q.options[q.correct]===t.previous_quiz.correct_text);
 assert(t.advanced_case.length>=60&&t.expected_resolution.length>=70&&t.required_fix.length>=70);
 assert.equal(t.human_signoff,false);
 assert.equal(t.independent_specialist_signoff,'pending_external_professional');
}
console.log('✓ 64 distinct specialist lenses / 64 advanced scenarios / 64 specific corrections; original 64 quiz keys verified and external human approval not misrepresented');
