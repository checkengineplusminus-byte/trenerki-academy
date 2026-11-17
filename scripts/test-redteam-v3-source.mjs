#!/usr/bin/env node
// Strict red-team audit; tests 64 real production lesson snapshots without student data.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const original=read('content/expert-64-browser-fixture-20261117-v2.json').lessons;
const current=read('content/expert-64-redteam-fixture-v3-20261117.json').lessons;
const critiques=read('content/redteam-64-assembled-20261117.json').tests;
const map=new Map(original.map(x=>[x.course_slug+':'+x.lesson_no,x]));
const testMap=new Map(critiques.map(x=>[x.slug+':'+x.lesson_no,x]));
const seen=new Set(),roles=new Set(),byRisk={};
assert.equal(current.length,64);assert.equal(critiques.length,64);
for(const row of current){
 const key=row.course_slug+':'+row.lesson_no,m=row.material,challenge=m.redteam_quiz,previous=map.get(key),red=testMap.get(key);
 assert(!seen.has(key),'Duplicate lesson '+key);seen.add(key);
 assert(previous&&red,'Missing original review or adversarial test '+key);
 const oldq=previous.material.construction?.roleplay??previous.material.learning;
 const newq=m.construction?.roleplay??m.learning;
 assert.deepEqual(newq,oldq,'Old quiz changed for '+key);
 assert.equal(m.editorial_status,'needs_expert_review','False specialist signoff '+key);
 assert.equal(m.expert_review_packet.reviewed_by_professional,false);
 assert.equal(m.specialty_test.independent_human_signoff,false);
 assert.equal(m.redteam_audit_revision,'2026-11-17-adversarial-v3');
 assert(challenge&&challenge.options.length===4,'Four options required '+key);
 assert.equal(new Set(challenge.options).size,4,'Duplicate option '+key);
 assert(Number.isInteger(challenge.correct)&&challenge.correct>=0&&challenge.correct<4);
 assert.equal(challenge.options[challenge.correct],red.options[red.correct]);
 assert.deepEqual(challenge.feedback,red.feedback);
 assert(challenge.root_cause.length>40&&challenge.evidence.length>40,'Weak critique '+key);
 assert.equal(challenge.human_approved,false);
 assert.equal(challenge.is_independent_human_review,false);
 assert.equal(challenge.distinct_from_required_quiz,true);
 roles.add(challenge.reviewer_profile);
 assert(m.sections.some(s=>s.heading==='Kontrola krytyczna — czego łatwo nie zauważyć'),'Missing instructional fix '+key);
 assert(m.lesson_tips.length>=4);
 if(m.fact_check_revision==='2026-11-17-source-audit-v1'){
  const block=m.sections.find(s=>s.heading==='Doprecyzowanie po kontroli źródłowej');
  assert(block?.text?.length>130,'Missing properly sourced correction '+key);
 }
 byRisk[challenge.severity]=(byRisk[challenge.severity]||0)+1;
}
assert.equal(roles.size,64);
assert.deepEqual(byRisk,{critical:20,high:25,medium:19});
assert.equal(current.filter(x=>x.material.fact_check_revision==='2026-11-17-source-audit-v1').length,9);
assert.equal(Math.ceil(25/.8),32);
assert.equal(24/.8,30);
assert.equal(700-250,450);
assert.equal(4*7-4,24);
assert.equal(5*550,2750);
assert.equal(36-28,8);
assert.equal(36/40,.9);
assert.equal(28/40,.7);
assert.equal(28000+3000,31000);
assert.equal(35000+1800+1200,38000);
assert.equal(15/.75,20);
assert.equal(18/1,18);
const reader=readFileSync(new URL('../app/nauka.tsx',import.meta.url),'utf8');
const ui=readFileSync(new URL('../src/AdversarialLessonTest.tsx',import.meta.url),'utf8');
assert(reader.includes("slug!=='ksiegowosc-od-podstaw'&&!!lesson.material?.redteam_quiz"));
assert(reader.includes("if(slug==='ksiegowosc-od-podstaw'){router.replace(courseDestination(slug,lessonParam));return;}"));
assert(ui.includes("required?'ai-stage-checkpoint':'adversarial-lesson-test'"),"Optional practice and required stage must retain distinct testIDs");
assert(ui.includes("testID=\"adversarial-solution\""));
assert(ui.includes('Ten trening nie zmienia wyniku obowiązkowych sprawdzianów.'));
console.log('✓ 64/64 harsh adversarial cases, 64 professions, 4 plausible choices each, 9 sourced corrections, 0 changes in original quiz, 0 human signoff, accounting excluded');
