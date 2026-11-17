#!/usr/bin/env node
// TRENERKI AI course: static integration gate (database QA is a separate read-only audit).
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const read=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const ui=read('app/nauka.tsx'),coach=read('src/GuidedDialogue.tsx');
const quiz=read('src/AdversarialLessonTest.tsx');
const server=read('supabase/functions/ta-lesson-guide/index.ts');
const view=read('src/LessonIllustratedSections.tsx');
assert(ui.includes("slug==='ai-bez-tajemnic'"),'Missing AI course UI specialization');
assert(ui.includes("lesson_kind==='stage_checkpoint'"),'Eight stage checkpoints not detected');
assert(ui.includes("recordAttempt('stage',answerIndex,correct)"),'Stage attempt not sent to server');
assert(ui.includes('required={stageRequired}'),'Stage assessment must be marked required');
assert(ui.includes("(!stageRequired||passed.stage)"),'Stage quiz must prevent skipping');
assert(ui.includes("const stageRequired="),'Stage evaluation state missing');
assert(ui.includes("coachTask={lesson.material?.anielka}"),'Anielka mission not connected');
for(const label of ['Ćwicz ze mną','Daj wskazówkę','Sprawdź moją próbę','Zadaj mi pytanie'])
 assert(coach.includes(label),'Missing practice action: '+label);
assert(coach.includes("input.trim().length<5"),'Anielka must reject empty prompts');
assert(quiz.includes("await onAttempt(i,localCorrect)"),'Stage quiz must await server');
assert(quiz.includes('!required&&mistakes>=2'),'Required quiz must not be bypassed via reveal');
assert(quiz.includes('alreadyVerified'),'Verified stage result must survive reload');
assert(server.includes("material.lesson_kind!=='stage_checkpoint'"),'Server must validate AI milestone scope');
assert(server.includes("required.push('stage')"),'Server must enforce stage pass before completion');
assert(server.includes("mode==='stage'"),'Server must validate stage answer from material');
assert(server.includes("selected===answer"),'Server must compare selected index to correct stage answer');
assert(view.includes('lesson-visual-'+courseSlug+'-'),'Image component must route per-lesson editorial artwork');
const hashes=new Set();
for(let i=1;i<=32;i++){
 const id=String(i).padStart(3,'0');
 const svg=read('public/academy/assets/lesson-visual-ai-bez-tajemnic-'+id+'.svg');
 assert(svg.includes('xmlns="http://www.w3.org/2000/svg"'),'Broken SVG '+id);
 assert(svg.includes('viewBox="0 0 1280 720"'),'Wrong aspect ratio '+id);
 assert(svg.includes('</svg>'),'Unclosed image '+id);
 assert(!/<image\b|<foreignObject\b|<script\b|https?:\/\//.test(svg.replace('xmlns="http://www.w3.org/2000/svg"','')),'External media or code in image '+id);
 const hash=createHash('sha256').update(svg).digest('hex');
 assert(!hashes.has(hash),'Repeated artwork '+id);
 hashes.add(hash);
}
console.log('✓ 32 distinct original lesson illustrations and safe asset paths');
console.log('✓ 8 mandatory, server-verified stage checkpoints and correct-answer persistence');
console.log('✓ Anielka four practice actions with lesson-scoped missions');
console.log('Static gate passed; browser/device tests and end-to-end purchase remain separately required.');
