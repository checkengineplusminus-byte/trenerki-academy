import {contains,distance,edges,outline,transformShape,type CadShape,type Point} from './CadGeometry';

export type WindowDirection='window'|'crossing';
type Box={left:number;right:number;bottom:number;top:number};
const box=(a:Point,b:Point):Box=>({left:Math.min(a.x,b.x),right:Math.max(a.x,b.x),bottom:Math.min(a.y,b.y),top:Math.max(a.y,b.y)});
const inside=(p:Point,b:Box)=>p.x>=b.left&&p.x<=b.right&&p.y>=b.bottom&&p.y<=b.top;
function segmentCrosses(a:Point,b:Point,r:Box){
 const dx=b.x-a.x,dy=b.y-a.y;
 let lower=0,upper=1;
 for(const [p,q] of [[-dx,a.x-r.left],[dx,r.right-a.x],[-dy,a.y-r.bottom],[dy,r.top-a.y]]){
  if(Math.abs(p)<1e-12){if(q<0)return false;continue;}
  const t=q/p;
  if(p<0)lower=Math.max(lower,t);
  else upper=Math.min(upper,t);
  if(lower>upper)return false;
 }
 return true;
}
function points(shape:CadShape):Point[]{
 if(shape.kind==='circle'){
  const [c,rim]=shape.points,r=distance(c,rim);
  return [{x:c.x-r,y:c.y-r},{x:c.x+r,y:c.y+r}];
 }
 return outline(shape);
}
export function selectCadWindow(shapes:CadShape[],start:Point,end:Point):{ids:number[];direction:WindowDirection}{
 const selection=box(start,end),direction:WindowDirection=end.x>=start.x?'window':'crossing';
 const center={x:(selection.left+selection.right)/2,y:(selection.bottom+selection.top)/2};
 const ids=shapes.filter(shape=>{
  const pts=points(shape);
  if(!pts.length)return false;
  if(direction==='window')return pts.every(p=>inside(p,selection));
  if(pts.some(p=>inside(p,selection)))return true;
  if(shape.kind==='circle'){
   const [c,rim]=shape.points,r=distance(c,rim);
   const closest={x:Math.max(selection.left,Math.min(c.x,selection.right)),y:Math.max(selection.bottom,Math.min(c.y,selection.top))};
   return distance(c,closest)<=r;
  }
  return edges(shape).some(([a,b])=>segmentCrosses(a,b,selection))||contains(shape,center);
 }).map(shape=>shape.id);
 return {ids,direction};
}
export function mergeCadSelection(previous:number[],chosen:number[],remove=false):number[]{
 const combined=new Set(previous);
 for(const id of chosen){if(remove)combined.delete(id);else combined.add(id);}
 return [...combined];
}
export function transformCadSelection(shapes:CadShape[],ids:number[],fn:(p:Point)=>Point){
 const chosen=new Set(ids);
 return shapes.map(shape=>chosen.has(shape.id)?transformShape(shape,fn):shape);
}
export function copyCadSelection(shapes:CadShape[],ids:number[],nextId:number,max=400):
 {shapes:CadShape[];newIds:number[];nextId:number}|undefined{
 const selected=shapes.filter(s=>ids.includes(s.id));
 if(!selected.length||shapes.length+selected.length>max)return;
 const copied=selected.map(s=>({...s,id:nextId++}));
 return {shapes:[...shapes,...copied],newIds:copied.map(s=>s.id),nextId};
}
