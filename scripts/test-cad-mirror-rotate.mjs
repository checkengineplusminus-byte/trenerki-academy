import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mirrorCadPoint,mirrorCadSelection,rotateCadSelection} from '../src/CadSelection.ts';
const p=(x,y)=>({x,y});
const line=(id,a,b,layer=0)=>({id,kind:'line',layer,points:[a,b]});
const rect=(id,a,b)=>({id,kind:'rect',layer:0,points:[a,b]});
const almost=(actual,expected)=>assert(Math.abs(actual-expected)<1e-7,`expected ${expected} got ${actual}`);
test('ROTATE +90° around 0,0 preserves lengths and turns counterclockwise',()=>{
 const shapes=[line(1,p(100,0),p(300,0)),line(2,p(0,50),p(0,150))];
 const after=rotateCadSelection(shapes,[1],p(0,0),90);
 almost(after[0].points[0].x,0);almost(after[0].points[0].y,100);
 almost(after[0].points[1].x,0);almost(after[0].points[1].y,300);
 assert.deepEqual(after[1],shapes[1],'unselected object is not rotated');
 assert.deepEqual(shapes[0].points[0],p(100,0),'rotation cannot mutate original arrays');
});
test('ROTATE negative angle and group rotate around a nonzero base point',()=>{
 const original=[line(1,p(30,20),p(40,20)),line(2,p(40,20),p(40,50))];
 const updated=rotateCadSelection(original,[1,2],p(20,20),-90);
 almost(updated[0].points[0].x,20);almost(updated[0].points[0].y,10);
 almost(updated[1].points[1].x,50);almost(updated[1].points[1].y,0);
});
test('MIRROR uses two points as its reflection axis',()=>{
 assert.deepEqual(mirrorCadPoint(p(10,20),p(0,0),p(0,100)),p(-10,20));
 assert.deepEqual(mirrorCadPoint(p(10,20),p(0,0),p(100,0)),p(10,-20));
 assert.equal(mirrorCadPoint(p(1,2),p(2,2),p(2,2)),undefined,'zero-length mirror axis must be rejected');
});
test('MIRROR defaults to keeping source objects, gives copies fresh IDs',()=>{
 const original=[line(1,p(10,20),p(30,40)),line(2,p(40,50),p(70,60))];
 const mirrored=mirrorCadSelection(original,[1,2],p(0,0),p(0,100),false,100);
 assert(mirrored);
 assert.equal(mirrored.shapes.length,4);
 assert.deepEqual(mirrored.ids,[100,101]);
 assert.deepEqual(mirrored.shapes[2].points,[p(-10,20),p(-30,40)]);
 assert.deepEqual(mirrored.shapes[3].points,[p(-40,50),p(-70,60)]);
 assert.deepEqual(original[0].points,[p(10,20),p(30,40)]);
});
test('MIRROR Y replaces original geometry; rectangles become polylines for non-orthogonal axes',()=>{
 const r=rect(4,p(0,0),p(100,40));
 const out=mirrorCadSelection([r],[4],p(0,0),p(100,100),true,8);
 assert(out);
 assert.equal(out.shapes.length,1);
 assert.equal(out.shapes[0].id,4);
 assert.equal(out.shapes[0].kind,'poly');
 assert.equal(out.shapes[0].closed,true);
 assert.equal(out.shapes[0].points.length,4);
});
test('MIRROR does not silently exceed 400-object workshop limit',()=>{
 const group=[line(1,p(1,0),p(2,0)),line(2,p(2,0),p(3,0))];
 assert.equal(mirrorCadSelection(group,[1,2],p(0,0),p(0,1),false,100,3),undefined);
});
test('active Expo web studio has mirror two-point choice, rotate and original-style Home ribbon with accessible controls',()=>{
 const src=readFileSync(new URL('../src/CadWorkspace.web.tsx',import.meta.url),'utf8');
 const icons=readFileSync(new URL('../src/CadRibbonIcon.web.tsx',import.meta.url),'utf8');
 for(const text of [
  "mirrorAxis?:[Point,Point]",'performMirror(false)','performMirror(true)',
  "['N','NO','NIE','']", "['Y','YES','T','TAK']",
  'performRotate(angle)','performRotate(number)',"mirrorCadSelection(drawing.shapes",
  'testID="cad-ribbon"','testID="cad-home-ribbon"','Draw / Rysuj','Modify / Zmień','Layers / Warstwy',
 ]) assert(src.includes(text),'Missing function/UI '+text);
 for(const t of ['rotate','mirror','move','copy','line','layer'])assert(icons.includes("case '"+t+"'"));
});
