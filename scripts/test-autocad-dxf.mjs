import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
function read(filename){
 const raw=readFileSync(new URL('../public/academy/assets/'+filename,import.meta.url),'ascii');
 assert.match(raw,/0\nSECTION\n2\nHEADER\n9\n\$ACADVER\n1\nAC1015\n/);
 assert.match(raw,/9\n\$INSUNITS\n70\n4\n/);
 assert(raw.endsWith('0\nEOF\n'));
 const lines=raw.trim().split('\n'),entries=[];
 for(let i=0;i+1<lines.length;i+=2)entries.push([+lines[i],lines[i+1]]);
 const shapes=[];
 for(let i=0;i<entries.length;i++){
  if(entries[i][0]!==0||!['LINE','CIRCLE'].includes(entries[i][1]))continue;
  const entity={type:entries[i][1],props:{}};
  while(++i<entries.length&&entries[i][0]!==0)entity.props[entries[i][0]]=entries[i][1];
  i--;shapes.push(entity);
 }
 return shapes;
}
const coord=(s,code)=>Number(s.props[code]);
test('triangle is exactly three separate line entities, not an imitation of AutoCAD',()=>{
 const shapes=read('autocad-triangle-lines.dxf');
 assert.equal(shapes.length,3);assert(shapes.every(s=>s.type==='LINE'));
 const pts=shapes.map(s=>[coord(s,10),coord(s,20),coord(s,11),coord(s,21)]);
 assert.deepEqual(pts,[[0,0,1000,0],[1000,0,500,800],[500,800,0,0]]);
});
test('room is a 4000 by 3000 mm rectangle',()=>{
 const shapes=read('autocad-room-4000x3000.dxf');
 assert.equal(shapes.length,4);assert(shapes.every(s=>s.type==='LINE'));
 const xs=shapes.flatMap(s=>[coord(s,10),coord(s,11)]),ys=shapes.flatMap(s=>[coord(s,20),coord(s,21)]);
 assert.equal(Math.max(...xs)-Math.min(...xs),4000);
 assert.equal(Math.max(...ys)-Math.min(...ys),3000);
});
test('panel A has 600 by 350 outline and two R10 holes',()=>{
 const shapes=read('autocad-panel-A.dxf');
 assert.equal(shapes.filter(s=>s.type==='LINE').length,4);
 const holes=shapes.filter(s=>s.type==='CIRCLE');
 assert.equal(holes.length,2);
 assert.deepEqual(holes.map(h=>[coord(h,10),coord(h,20),coord(h,40)]),[[50,50,10],[550,50,10]]);
});
