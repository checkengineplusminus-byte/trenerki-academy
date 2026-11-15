import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const material=JSON.parse(readFileSync(new URL('../content/autocad-real-program-2026-11-15.json',import.meta.url),'utf8')).lessons;
const handbook=JSON.parse(readFileSync(new URL('../content/autocad-methodology-v2.json',import.meta.url),'utf8')).lessons;
const load=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('beginner: every AutoCAD lesson has a distinct concept, executable steps and a verification task',()=>{
 assert.equal(handbook.length,30);
 assert.equal(material.length,30);
 assert.equal(new Set(handbook.map(x=>x.heading)).size,30);
 assert.equal(new Set(handbook.map(x=>x.question)).size,30);
 for(let i=0;i<30;i++){
  const m=material[i].material,h=handbook[i];
  assert.equal(h.lesson_no,i);
  assert(h.heading.length>9&&h.concept.length>95,'Too shallow: '+i);
  assert(h.steps.length===3&&new Set(h.steps).size===3,'Missing differentiated steps: '+i);
  assert(h.steps.every(s=>s.length>35),'Too short to follow: '+i);
  assert(h.question.length>25,'No diagnostic question: '+i);
  assert(m.raw[1].length>70&&m.raw[3].length>60&&m.raw[4].length>60,'Missing original content: '+i);
  assert(m.learning.options.length===3,'Quiz must offer meaningful choices: '+i);
 }
});
test('editor: CAD numerical examples and self-checks agree on key facts',()=>{
 assert.match(handbook[5].steps.join(' '),/_JOIN/);
 assert.match(handbook[5].steps.join(' '),/_PEDIT/);
 assert.match(handbook[9].steps.join(' '),/5000 mm/);
 assert.match(handbook[17].steps.join(' '),/PDF/);
 assert.match(handbook[24].steps.join(' '),/1:50/);
 assert.match(handbook[29].steps.join(' '),/550 mm/);
 assert.match(material[29].material.raw[3],/550 mm/);
});
test('visitor: recurring AutoCAD screenshots removed from all lesson bodies',()=>{
 const visual=load('src/LessonIllustratedSections.tsx');
 const orientation=load('src/SoftwareOrientation.tsx');
 assert(!visual.includes("import AutoCADOriginalScreen"));
 assert(!visual.includes('<AutoCADOriginalScreen'));
 assert(orientation.includes("tab==='interface'"));
 assert(orientation.includes('<AutoCADOriginalScreen'));
 assert(orientation.includes("slug==='autocad-skroty'?<AutoCADOriginalScreen"));
 assert(load('app/nauka.tsx').includes("index===0&&slug!=='autocad-skroty'&&<CourseIntroPhoto"));
});
test('original interactive CAD drawing workspace is restored in relevant AutoCAD lessons',()=>{
 const src=load('app/nauka.tsx'),workspace=load('src/CadWorkspace.tsx');
 assert(src.includes('<CadWorkspace storageKey={userId}'));
 assert(workspace.includes('testID="cad-command"'));
 assert(workspace.includes('joinCadLines(shapes,selected)'));
});
test('old generic AutoCAD lab cannot repeat itself inside unrelated chapters',()=>{
 const shortcutUI=load('src/KeyboardLesson.tsx');
 assert(shortcutUI.includes("if(slug==='autocad-skroty'&&!valid.length)return null;"));
 assert(shortcutUI.includes("mode&&slug!=='autocad-skroty'&&<HandsOnLab"));
});
test('all courses have Start from beginning and review never deletes diplomas',()=>{
 const learn=load('app/nauka.tsx');
 const library=load('app/moje-kursy.tsx');
 assert(learn.includes('testID="start-course-from-beginning"'));
 assert(learn.includes('reviewMode'));
 assert(learn.includes("review:'1'"));
 assert(!/startFromBeginning\(\)[\s\S]{0,550}\.delete\(/.test(learn));
 assert(library.includes('testID={\'restart-course-\'+row.course_slug}'));
 assert(library.includes("lesson:'1',review:'1'"));
});
test('completed course banner and exam appear only on the final lesson',()=>{
 const src=load('app/nauka.tsx');
 assert(src.includes("progress===100&&index===items.length-1&&!reviewMode&&<FinalExam"));
 assert(src.includes("progress===100&&index===items.length-1&&!reviewMode&&<View testID=\"course-completed-last-page-only\""));
 assert(src.includes('coachOpen&&<GuidedDialogue'));
 assert(src.includes("index===0&&!!study&&<CourseStudyPlan"));
});
