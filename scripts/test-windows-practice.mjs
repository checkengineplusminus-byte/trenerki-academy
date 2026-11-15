import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const book=JSON.parse(read('content/windows-practice-missions.json'));
const missions=book.lessons;
const renderer=read('src/LessonIllustratedSections.tsx');
const lab=read('src/WindowsPracticeMission.tsx');
const keyboard=read('src/KeyboardLesson.tsx');
const desktop=read('src/WindowsDesktopLab.tsx');
const support=read('src/windowsShortcutSupport.ts');
test('Premium Windows: all 30 lessons have exactly one professional mission',()=>{
 assert.equal(book.course_slug,'windows-skroty');
 assert.equal(missions.length,30);
 assert.deepEqual(missions.map(m=>m.lesson_no),Array.from({length:30},(_,i)=>i));
 assert.equal(new Set(missions.map(m=>m.goal)).size,30);
});
test('Every lesson includes instructions, objective evidence, mistake, actual-PC variant, and current Microsoft source',()=>{
 for(const m of missions){
  assert(m.persona.length>=5,'Persona missing for lesson '+m.lesson_no);
  assert(m.goal.length>=16,'Goal too short for lesson '+m.lesson_no);
  assert(m.scenario.length>=30,'Scenario too generic for lesson '+m.lesson_no);
  assert(m.steps.length>=3&&m.steps.length<=5,'Steps missing for lesson '+m.lesson_no);
  assert(m.steps.every(s=>s.length>=12 && !/^(zrób coś|przejdź dalej|ćwicz sam|sprawdź to)[.!]?$/i.test(s.trim())),'Vague steps for lesson '+m.lesson_no);
  assert(m.evidence.length>=45,'No concrete evidence for lesson '+m.lesson_no);
  assert(m.pitfall.length>=35,'No credible misconception for lesson '+m.lesson_no);
  assert(m.real_pc.length>=32,'Real Windows exercise missing for lesson '+m.lesson_no);
  assert(/^https:\/\/support\.microsoft\.com\//.test(m.source),'Microsoft verification source missing for lesson '+m.lesson_no);
 }
});
test('Course content spans five or more distinct professional perspectives',()=>{
 assert(new Set(missions.map(m=>m.persona)).size>=15);
 for(const word of ['księg','budow','inżyn','IT','biur']){
  assert(missions.some(m=>(m.persona+' '+m.goal).toLocaleLowerCase('pl').includes(word.toLocaleLowerCase('pl'))),'Missing viewpoint: '+word);
 }
});
test('Missions are actually connected to the live lesson renderer without touching accounting routing',()=>{
 assert.match(renderer,/import WindowsPracticeMission from '\.\/WindowsPracticeMission'/);
 assert.match(renderer,/courseSlug==='windows-skroty'&&<WindowsPracticeMission key=\{lessonNo\} lessonNo=\{lessonNo\}/);
 assert.match(lab,/workbook\.lessons\.find\(item=>item\.lesson_no===lessonNo\)/);
 assert.match(lab,/Porównaj rozwiązanie z kryterium/);
 assert.match(lab,/Trenerki nie może stwierdzić/);
 assert.doesNotMatch(lab,/\.from\('ta_learning_progress'\)/);
});
test('The real Windows and the simulated desktop are explicitly different learning routes',()=>{
 assert.match(lab,/Nauka i symulacja/);
 assert.match(lab,/Na moim komputerze/);
 assert.match(lab,/Funkcje bezpieczeństwa, chmury i systemu/);
 assert.match(keyboard,/canSimulateWindowsShortcut\(active\.combo\)/);
 assert.match(keyboard,/Tego skrótu nie symulujemy/);
 assert.match(desktop,/Skrótów systemowych celowo nie przechwytujemy/);
});
test('Simulator supports left/right desktop switch and snap as distinct operations',()=>{
 assert.match(desktop,/case 'WIN\+←':moveWindow\('left'\)/);
 assert.match(desktop,/case 'WIN\+→':moveWindow\('right'\)/);
 assert.match(desktop,/k==='WIN\+CTRL\+←'/);
 assert.match(desktop,/k==='WIN\+CTRL\+→'/);
 assert.match(support,/Win\+Ctrl\+←/);
 assert.match(support,/Win\+←/);
});
test('Safety guard: no secret capture, no claims of verified real-PC actions',()=>{
 assert.match(lab,/Nie wpisuj danych osobowych/);
 assert.match(lab,/To samokontrola/);
 assert.match(lab,/nie jest wysyłana ani zapisywana jako zaliczenie/);
 assert(!missions.some(m=>/wpisz (swoje|prawdziwe) hasło/i.test(m.real_pc)));
});
