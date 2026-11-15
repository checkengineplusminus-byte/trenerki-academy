import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readCadPoint,joinCadLines,fitDrawing,worldPoint,screenPoint} from '../src/CadGeometry.ts';
const line=(id,a,b,layer=0)=>({id,kind:'line',points:[a,b],layer});
const p=(x,y)=>({x,y});
test('LINE accepts actual millimetre coordinates and negative/relative points',()=>{
 assert.deepEqual(readCadPoint('0,0'),p(0,0));
 assert.deepEqual(readCadPoint('4000,3000'),p(4000,3000));
 assert.deepEqual(readCadPoint('@2000,0',p(500,800)),p(2500,800));
 assert.deepEqual(readCadPoint('-1000,-700'),p(-1000,-700));
 assert.deepEqual(readCadPoint('@4200,0',p(-1000,-700)),p(3200,-700));
});
test('JOIN turns exactly three touching LINEs into one closed polyline',()=>{
 const sides=[
  line(1,p(0,0),p(1000,0)),
  line(2,p(1000,0),p(500,800)),
  line(3,p(500,800),p(0,0))
 ];
 const joined=joinCadLines(sides,3);
 assert(joined);
 assert.deepEqual([...joined.sourceIds].sort(),[1,2,3]);
 assert.equal(joined.joined.kind,'poly');
 assert.equal(joined.joined.closed,true);
 assert.equal(joined.joined.points.length,3);
});
test('JOIN never merges unrelated or different-layer geometry',()=>{
 assert.equal(joinCadLines([line(1,p(0,0),p(100,0)),line(2,p(300,0),p(500,0))]),undefined);
 assert.equal(joinCadLines([line(1,p(0,0),p(100,0)),line(2,p(100,0),p(200,0),1)]),undefined);
});
test('camera fits 4000 x 3000 mm and converts mouse clicks back to CAD coordinates',()=>{
 const objects=[line(1,p(0,0),p(4000,0)),line(2,p(4000,0),p(4000,3000))];
 const size={width:860,height:516};
 const camera=fitDrawing(objects,size);
 for(const point of [p(0,0),p(4000,0),p(4000,3000)]){
  const screen=screenPoint(point,camera,size);
  const roundtrip=worldPoint(screen,camera,size);
  assert(Math.abs(point.x-roundtrip.x)<.0001);
  assert(Math.abs(point.y-roundtrip.y)<.0001);
 }
});
test('UI reconnects CAD workshop only to relevant lessons, independently of checkout or pricing',()=>{
 const app=awaitRead('app/nauka.tsx'),cad=awaitRead('src/CadWorkspace.tsx');
 assert(app.includes('<CadWorkspace key={'autocad-workshop-'+module} storageKey={userId}'));
 assert(app.includes("slug!=='autocad-skroty'&&<CourseIntroPhoto"));
 for(const fragment of ['testID="cad-command"','testID="cad-canvas"','joinCadLines(shapes,selected)','ZOOM E']) assert(cad.includes(fragment));
 const web=awaitRead('src/CadWorkspace.web.tsx');
 assert(web.includes("joinCadLines(visible,selected)"),'Expo Web implementation must recognize JOIN');
 assert(web.includes("['JOIN','J','PEDIT']"),'Web command entrypoint must support JOIN/PEDIT');
 assert(web.includes('Połącz linie · JOIN'),'JOIN must be available through ribbon');
});
function awaitRead(path){
 return readFileSync(new URL('../'+path,import.meta.url),'utf8');
}
