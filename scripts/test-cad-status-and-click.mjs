import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {polarTracking,objectSnapTracking} from '../src/CadTracking.ts';
import {nearestCadObjects} from '../src/CadSelection.ts';
const p=(x,y)=>({x,y});
test('F10 Polar guides mouse drawing near 45-degree steps without locking arbitrary points',()=>{
 const d=polarTracking(p(101,100),p(0,0),45);
 assert(d);
 assert.equal(d.label,'POLAR 45°');
 assert(Math.abs(d.point.x-d.point.y)<1e-6);
 assert.equal(polarTracking(p(100,40),p(0,0),45),undefined);
 assert.equal(polarTracking(p(100,40),p(0,0),0),undefined);
});
test('F11 OTrack projects horizontally or vertically from a captured snap',()=>{
 assert.deepEqual(objectSnapTracking(p(103,200),p(100,100),8),{point:p(100,200),label:'OTrack pion'});
 assert.deepEqual(objectSnapTracking(p(200,103),p(100,100),8),{point:p(200,100),label:'OTrack poziom'});
 assert.equal(objectSnapTracking(p(200,200),p(100,100),8),undefined);
});
test('a narrow mobile CAD canvas picks the closest real line even when hit targets overlap',()=>{
 const lines=[
  {id:4,kind:'line',layer:0,points:[p(0,0),p(300,0)]},
  {id:5,kind:'line',layer:0,points:[p(100,8),p(400,8)]}
 ];
 const hits=nearestCadObjects(lines,p(150,0),12);
 assert.deepEqual(hits.map(h=>h.id),[4,5],'Nearest geometry must outrank topmost transparent SVG hit path');
 assert.equal(nearestCadObjects(lines,p(150,8),12)[0].id,5);
 assert.deepEqual(nearestCadObjects(lines,p(500,500),12),[]);
});
test('a single left tap on thin CAD lines uses captured object ID and larger invisible hit target',()=>{
 const src=readFileSync(new URL('../src/CadCanvas.web.tsx',import.meta.url),'utf8');
 for(const bit of ['tapShape.current={pointerId:event.pointerId','onObjectTap?.(hit.shapeId,hit.remove,pointer(event.nativeEvent))',
  'data-cad-hit="true"','strokeWidth="18"','pointerEvents="stroke"'])assert(src.includes(bit),'Missing reliable click behavior: '+bit);
});
test('status bar has all basic AutoCAD precision toggles, left-click, and hold selection',()=>{
 const src=readFileSync(new URL('../src/CadWorkspace.web.tsx',import.meta.url),'utf8');
 for(const bit of ['testID="cad-status-bar"','testID="cad-hold-selection"','onObjectTap={selectOneById}',
   "id:'grid'","id:'snap'","id:'ortho'","id:'polar'","id:'osnap'","id:'otrack'","id:'dyn'",
   "id:'cycle'","id:'lwt'","id:'trans'","id:'annotation'","id:'clean'","id:'hold'",
   "case 'F10'","case 'F11'","polarTracking(point,latest,polarStep)","objectSnapTracking(raw,polarAnchor.current,baseTolerance)"
  ])assert(src.includes(bit),'Missing AutoCAD button or logic: '+bit);
});
test('status bar guidance has >= 18 distinct exercises and explicit 3D-only limitations',()=>{
 const guide=JSON.parse(readFileSync(new URL('../content/autocad-status-controls-2026.json',import.meta.url),'utf8'));
 assert(guide.items.length>=18);
 assert.equal(new Set(guide.items.map(s=>s.id)).size,guide.items.length);
 for(const item of guide.items){
  assert(item.meaning.length>60&&item.practice.length>40&&item.result.length>30);
  assert(['działa','podgląd','autodesk'].includes(item.level));
 }
 assert(guide.items.some(x=>x.id==='f4'&&x.level==='autodesk'));
 assert(guide.items.some(x=>x.id==='f5'&&x.level==='autodesk'));
});
