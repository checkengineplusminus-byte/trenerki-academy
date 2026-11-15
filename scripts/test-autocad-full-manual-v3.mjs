import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {paperLengthMm,paperWindow,layoutViewportCamera} from '../src/CadScale.ts';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const main=JSON.parse(read('content/autocad-real-program-2026-11-15.json'));
const manual=JSON.parse(read('content/autocad-complete-lessons-v3.json'));
const tasks=JSON.parse(read('content/autocad-practice-assignments-v3.json'));
const uploaded=JSON.parse(read('content/autocad-source-aliases-2026.json'));
const baseline=JSON.parse(read('content/autocad-reference-2026.json'));
const words=s=>String(s||'').trim().split(/\s+/).filter(Boolean).length;
const countSection=section=>(section.paragraphs||[]).reduce((sum,x)=>sum+words(x),0)
 +(section.walk||[]).reduce((sum,x)=>sum+words(x.instruction)+words(x.why)+words(x.check),0)
 +(section.commands||[]).reduce((sum,x)=>sum+words(x.heading)+words(x.explanation)+words(x.procedure)+words(x.case)+words(x.environment),0);

test('30 fully documented CAD lessons have more than an A4 page of actually authored instructions',()=>{
 assert.equal(manual.lessonBooks.length,30);
 assert.equal(main.lessons.length,30);
 assert.equal(tasks.assignments.length,30);
 const headings=new Set();
 for(let i=0;i<30;i++){
  const chapter=manual.lessonBooks[i];
  assert.equal(chapter.lesson_no,i);
  assert.equal(chapter.title,main.lessons[i].title_pl);
  assert(chapter.sections.length>=8,'Missing sections in chapter '+(i+1));
  const total=chapter.sections.reduce((n,s)=>n+countSection(s),0);
  assert(total>=520,'Insufficient material in chapter '+(i+1)+': '+total+' words');
  assert(chapter.estimatedWords===total,'Chapter '+(i+1)+' is missing some rendered content');
  const keys=chapter.sections.flatMap(x=>x.commands||[]);
  assert(keys.length>=5,'Missing individual command explanations chapter '+(i+1));
  assert(keys.every(x=>x.explanation.length>20&&x.procedure.length>55&&x.case.length>45));
  const headingsThis=chapter.sections.map(x=>x.heading);
  assert.equal(new Set(headingsThis).size,headingsThis.length);
  assert(chapter.sections.some(x=>x.heading==='Ciekawostka z praktyki'));
  assert(chapter.verifiedCuriosity===main.lessons[i].material.curiosity);
  headings.add(chapter.title);
 }
 assert.equal(headings.size,30);
});
test('every one of the 30 workshop pages has a unique task with typed commands and numeric criteria',()=>{
 const titles=new Set();
 for(let i=0;i<30;i++){
  const item=tasks.assignments[i];
  assert.equal(item.lesson_no,i);
  assert(item.title.length>20&&item.task.length>100,'Too shallow workshop task '+(i+1));
  assert(item.expected.length>65,'Missing numeric result guidance '+(i+1));
  assert(item.typing.length===3,'Interactive sequence required '+(i+1));
  assert(['line','rect','circle'].includes(item.targetKind));
  titles.add(item.task);
 }
 assert.equal(titles.size,30);
 const learn=read('app/nauka.tsx');
 assert(learn.includes("slug==='autocad-skroty'&&<CadWorkspace key={'autocad-workshop-'+module}"));
 assert(!learn.includes("slug==='autocad-skroty'&&cadWorkshopLessons.has(module)&&<CadWorkspace"));
 const web=read('src/CadWorkspace.web.tsx');
 for(const value of ['testID="cad-assigned-exercise"','Sprawdź moje ćwiczenie','Rozpocznij zadanie tej lekcji',
  'currentAssignment.typing','originalShapes.some','paperLengthMm(5000,layoutScale)'])
  assert(web.includes(value),'No checked task or numeric geometry requirement: '+value);
});
test('all supplied AutoCAD shortcut and alias rows are in an auditable source appendix',()=>{
 assert(uploaded.sourceRowCount>=222);
 assert.equal(uploaded.entries.length,uploaded.sourceRowCount);
 assert(uploaded.additionalDistinctCommands>=110);
 assert(uploaded.keyboard.length>=45);
 const merged=new Set([...baseline.commands.map(x=>x.command),...uploaded.entries.map(x=>x.command)]);
 assert(merged.size>=290,'The command encyclopedia silently lost entries');
 for(const command of ['PAN','MOVE','SCALE','MIRROR','ROTATE','DIMSTYLE','DATALINKUPDATE','ANALYSISZEBRA'])
  assert(merged.has(command),'Missing supplied command '+command);
 assert(uploaded.entries.find(x=>x.command==='PAN').note.includes('przesuwa widok'));
 assert(uploaded.keyboard.find(x=>x.keys==='CTRL+D').note.includes('Autodesk'));
 const ref=read('src/AutoCADReferenceGuide.tsx');
 assert(ref.includes("Aliasy A–Z")&&ref.includes("allCommands.length"));
 assert(ref.includes("autocad-command-detail"));
});
test('layout scaling is mathematically consistent with a real A3 sheet and leaves model coordinates unchanged',()=>{
 assert.equal(paperLengthMm(5000,50),100);
 assert.equal(paperLengthMm(5000,100),50);
 assert.equal(paperLengthMm(4000,20),200);
 assert.throws(()=>paperLengthMm(50,0));
 const size={width:900,height:600},bounds=paperWindow(size);
 assert(Math.abs(bounds.width/bounds.height-420/297)<1e-8);
 const c50=layoutViewportCamera(size,{x:0,y:0},50),c100=layoutViewportCamera(size,{x:0,y:0},100);
 assert.equal(c100.unitsPerPixel,c50.unitsPerPixel*2);
 assert.deepEqual(c50.center,{x:0,y:0});
 const ui=read('src/CadWorkspace.web.tsx'),canvas=read('src/CadCanvas.web.tsx');
 for(const token of ['cad-viewport-scale-menu','Skala rzutni · 1:','Custom Scale','standardScales',
  'layoutViewportCamera(size','testID="cad-layout-scale"'])assert(ui.includes(token));
 assert(canvas.includes("paperWindow(size)")&&canvas.includes("clipPath={layout?"));
});
