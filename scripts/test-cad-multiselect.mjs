import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {selectCadWindow,mergeCadSelection,transformCadSelection,copyCadSelection} from '../src/CadSelection.ts';
import {snapPoint} from '../src/CadGeometry.ts';

const p=(x,y)=>({x,y});
const line=(id,a,b,layer=0)=>({id,kind:'line',points:[a,b],layer});
const rect=(id,a,b)=>({id,kind:'rect',points:[a,b],layer:0});
const shapes=[line(1,p(0,0),p(1000,0)),line(2,p(1000,0),p(1000,1000)),rect(3,p(1300,100),p(1500,300))];
test('left-to-right selects only entirely enclosed entities',()=>{
 const x=selectCadWindow(shapes,p(-30,-30),p(1050,300));
 assert.equal(x.direction,'window');
 assert.deepEqual(x.ids,[1]);
});
test('right-to-left crossing selects touched entities, including intersecting line with no endpoints inside',()=>{
 const x=selectCadWindow(shapes,p(1400,250),p(900,50));
 assert.equal(x.direction,'crossing');
 assert.deepEqual(x.ids,[2,3]);
});
test('Shift removes items from selection; normal clicks accumulate',()=>{
 const all=mergeCadSelection([],shapes.map(s=>s.id));
 assert.deepEqual(all,[1,2,3]);
 assert.deepEqual(mergeCadSelection(all,[2],true),[1,3]);
 assert.deepEqual(mergeCadSelection(all,[3]),[1,2,3]);
});
test('MOVE transforms all selected objects once without touching unselected geometry',()=>{
 const shifted=transformCadSelection(shapes,[1,2],pt=>p(pt.x+2000,pt.y-100));
 assert.deepEqual(shifted[0].points,[p(2000,-100),p(3000,-100)]);
 assert.deepEqual(shifted[1].points,[p(3000,-100),p(3000,900)]);
 assert.deepEqual(shifted[2],shapes[2]);
 assert.deepEqual(shapes[0].points,[p(0,0),p(1000,0)],'Source must not be mutated');
});
test('COPY gives each selected object a new stable ID',()=>{
 const c=copyCadSelection(shapes,[1,3],100);
 assert.deepEqual(c.newIds,[100,101]);
 assert.equal(c.shapes.length,5);
 assert.deepEqual(c.shapes[3].points,shapes[0].points);
 assert.equal(copyCadSelection(shapes,[1,2,3],200,5),undefined);
});
test('OSNAP modes are independently selectable',()=>{
 const segments=[line(10,p(0,0),p(1000,0)),line(11,p(500,-200),p(500,200))];
 assert.deepEqual(snapPoint(p(500,0),segments,10,['intersection'])?.point,p(500,0));
 assert.equal(snapPoint(p(500,0),segments,10,['endpoint']),undefined);
 assert.equal(snapPoint(p(500,0),segments,10,['midpoint'])?.label,'Środek odcinka');
 assert.equal(snapPoint(p(500,0),segments,10,['nearest'])?.label,'Najbliższy');
});
test('course reference covers menu, scale, fonts, selection, OSNAP, function keys and command aliases',()=>{
 const data=JSON.parse(readFileSync(new URL('../content/autocad-reference-2026.json',import.meta.url),'utf8'));
 assert(data.commands.length>=175&&data.tabs.length>=10&&data.shortcuts.length>=35);
 for(const id of ['select','scale','font','osnap','units','dimensions'])assert(data.walkthroughs.some(x=>x.id===id));
 for(const name of ['MOVE','COPY','SCALE','MTEXT','STYLE','OSNAP','DIMSTYLE','PLOT','XREF','LINE']){
  const covered=name==='OSNAP'?data.walkthroughs.some(x=>x.id==='osnap'):data.commands.some(x=>x.command===name);
  assert(covered,'Missing '+name);
 }
 const web=readFileSync(new URL('../src/CadWorkspace.web.tsx',import.meta.url),'utf8');
 for(const key of ['onWindowSelect={selectWindow}','selecting={tool===','label="Zaznacz wszystko · Ctrl+A"','testID="cad-osnap-settings"','testID="cad-layout-scale"','testID="cad-font-preview"'])
  assert(web.includes(key),'The real web studio does not expose '+key);
});
