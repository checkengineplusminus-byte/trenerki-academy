import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readCadDirectDistance,readCadPoint,dimensionGeometry,distance} from '../src/CadGeometry.ts';
const p=(x,y)=>({x,y});
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('LINE accepts 1000 numeric, relative and polar coordinates',()=>{
 assert.deepEqual(readCadDirectDistance('1000',p(0,0)),p(1000,0));
 assert.deepEqual(readCadDirectDistance(' 1000 ',p(500,100)),p(1500,100));
 assert.deepEqual(readCadDirectDistance('1000',p(0,0),p(0,1)),p(0,1000));
 assert.deepEqual(readCadDirectDistance('1000',p(0,0),p(-1,0)),p(-1000,0));
 assert.deepEqual(readCadDirectDistance('-1000',p(0,0),p(1,0)),p(-1000,0));
 assert.deepEqual(readCadDirectDistance('600',p(1200,0),p(1200,-1),true),p(1200,-600));
 assert.deepEqual(readCadDirectDistance('600',p(1200,0),p(10,2000),true),p(1200,600));
 assert.deepEqual(readCadDirectDistance('1000',p(20,20),p(20,20)),p(1020,20));
 const d=readCadDirectDistance('1000',p(0,0),p(1,1));
 assert(Math.abs(distance(p(0,0),d)-1000)<1e-8);
 assert.deepEqual(readCadDirectDistance('1000',undefined),undefined);
 assert.deepEqual(readCadDirectDistance('1000,0',p(0,0)),undefined);
 assert.deepEqual(readCadDirectDistance('0',p(0,0)),undefined);
 assert.deepEqual(readCadDirectDistance('9999999999999',p(0,0)),undefined);
 const polar=readCadPoint('@1000<90',p(0,0));
 assert(Math.abs(polar.x)<1e-8&&Math.abs(polar.y-1000)<1e-8);
});
test('DIM measures aligned length; DIMLINEAR projects horizontal and vertical; DIST remains independent',()=>{
 const a=p(0,0),b=p(1000,600);
 const aligned=dimensionGeometry({id:1,kind:'dimension',layer:0,points:[a,b,p(500,800)],aligned:true});
 const horizontal=dimensionGeometry({id:2,kind:'dimension',layer:0,points:[a,b,p(500,800)]});
 const vertical=dimensionGeometry({id:3,kind:'dimension',layer:0,points:[a,b,p(1200,300)]});
 assert.equal(aligned.label,'1166.19');
 assert.equal(horizontal.label,'1000');
 assert.equal(vertical.label,'600');
 assert.equal(dimensionGeometry({id:4,kind:'dimension',layer:0,points:[p(0,0),p(1000,0),p(500,200)],aligned:true}).label,'1000');
 assert(Math.abs(distance(a,b)-Math.sqrt(1360000))<1e-8);
});
test('web and mobile exercises route numerical distance and DIM/DIST into live geometry',()=>{
 const web=read('src/CadWorkspace.web.tsx'),mobile=read('src/CadWorkspace.tsx');
 for(const [name,content] of [['web',web],['mobile',mobile]]){
  for(const token of ['readCadDirectDistance','dimensionGeometry','DIM','DIST','dimlinear','dimaligned','testID="cad-command"'])
   assert(content.includes(token),name+' missing '+token);
 }
 assert(web.includes("if(command==='DIM'||command==='DIMENSION')"));
 assert(web.includes("if(lessonNo===16)"));
 assert(web.includes("Zaliczone ćwiczenie geometrii"));
 assert(mobile.includes("distanceDirection"));
 assert(read('app/nauka.tsx').includes('<AutoCADHomework'));
 assert(read('app/nauka.tsx').includes('<AutoCADPrecisionGuide'));
});
test('30 distinct homeworks have specific work steps, expected results and private save',()=>{
 const h=JSON.parse(read('content/autocad-homework-2026.json'));
 assert.equal(h.lessonCount,30);assert.equal(h.assignments.length,30);
 assert.equal(new Set(h.assignments.map(x=>x.title)).size,30);
 for(let i=0;i<30;i++){
  const x=h.assignments[i];
  assert.equal(x.lesson_no,i);
  assert(['warsztat','mix','autocad'].includes(x.mode));
  assert.equal(x.steps.length,3);
  assert(x.steps.every(s=>s.length>70),'lesson '+(i+1)+' has weak step');
  assert(x.expected.length>70&&x.evidence.length>40&&x.commonMistake.length>50);
  assert(x.minutes>=18);
 }
 const ui=read('src/AutoCADHomework.tsx');
 for(const token of ["ta_autocad_homework","upsert(", "eq('user_id',userId)","eq('lesson_no',lessonNo)",'testID="autocad-homework-save"'])
  assert(ui.includes(token),'missing '+token);
 const sql=read('database/patches/20261116_autocad_private_homework.sql');
 for(const token of ['ENABLE ROW LEVEL SECURITY','GRANT SELECT, INSERT, UPDATE, DELETE','FOR SELECT TO authenticated','FOR UPDATE TO authenticated','WITH CHECK ((SELECT auth.uid())=user_id)','REVOKE ALL'])
  assert(sql.includes(token),'missing private RLS rule '+token);
});
