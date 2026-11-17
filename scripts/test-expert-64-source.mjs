#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const {lessons}=read('content/expert-64-browser-fixture-20261117.json');
const revisions=[...read('content/expert-flag-revisions-part1-20261117.json').rows,...read('content/expert-flag-revisions-part2-20261117.json').rows];
const lookup=new Map(revisions.map(r=>[r.slug+':'+r.no,r]));
assert.equal(lessons.length,64);assert.equal(lookup.size,64);
assert.equal(new Set(lessons.map(x=>x.course_slug)).size,8);
for(const row of lessons){
 const key=row.course_slug+':'+row.lesson_no,source=lookup.get(key),m=row.material;
 assert(source,'Missing original proposed revision '+key);
 assert.equal(m.editorial_status,'needs_expert_review','do not claim human approval '+key);
 assert.equal(m.editorial_revision,'2026-11-17-64-practical-v1');
 assert.equal(m.expert_review_packet.status,'requires_external_professional_review');
 assert.equal(m.expert_review_packet.reviewed_by_professional,false);
 const sec=m.sections||[];
 assert(sec.length>=6,'missing original and enrichment '+key);
 const a=sec.at(-2),b=sec.at(-1);
 assert.equal(a.heading,'Doprecyzowanie praktyczne');
 assert.equal(b.heading,'Ćwiczenie diagnostyczne z kryterium odbioru');
 assert.equal(a.text,source.explanation);
 assert.equal(b.text,source.exercise);
 assert(m.illustration&&typeof m.illustration==='string','No illustration assigned '+key);
 const q=m.construction?.roleplay??m.learning;
 assert(q&&Array.isArray(q.options)&&q.options.length>=3,'No check question '+key);
 assert(Number.isInteger(q.correct)&&q.correct>=0&&q.correct<q.options.length,'Invalid correct answer '+key);
 assert.equal(new Set(q.options).size,q.options.length);
}
console.log('✓ 64/64 flagged lessons with correct detailed appendices, complete quiz, illustration, preserved pending human review');
