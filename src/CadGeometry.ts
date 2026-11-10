export type Point={x:number;y:number};
export type CadShape={
 id:number;kind:'line'|'poly'|'rect'|'circle'|'arc'|'dimension';points:Point[];layer:number;closed?:boolean;aligned?:boolean;fill?:'hatch'|'solid'
};
export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export const CAD_WIDTH=1000,CAD_HEIGHT=600;

export type Size={width:number;height:number};
export type Camera={center:Point;unitsPerPixel:number};
export const subtract=(a:Point,b:Point):Point=>({x:a.x-b.x,y:a.y-b.y});
export const add=(a:Point,b:Point):Point=>({x:a.x+b.x,y:a.y+b.y});
export const multiply=(p:Point,k:number):Point=>({x:p.x*k,y:p.y*k});
export const dot=(a:Point,b:Point)=>a.x*b.x+a.y*b.y;
export const cadNumber=(n:number)=>String(Number(n.toFixed(3)));
export const cadCoordinates=(p:Point)=>cadNumber(p.x)+', '+cadNumber(p.y);
export const worldPoint=(p:Point,camera:Camera,size:Size):Point=>({
 x:camera.center.x+(p.x-size.width/2)*camera.unitsPerPixel,
 y:camera.center.y+(size.height/2-p.y)*camera.unitsPerPixel,
});
export const screenPoint=(p:Point,camera:Camera,size:Size):Point=>({
 x:size.width/2+(p.x-camera.center.x)/camera.unitsPerPixel,
 y:size.height/2-(p.y-camera.center.y)/camera.unitsPerPixel,
});

export function zoomCamera(camera:Camera,size:Size,factor:number,anchor:Point){
 const unitsPerPixel=Math.max(0.00001,Math.min(1e7,camera.unitsPerPixel*factor));
 const fixed=worldPoint(anchor,camera,size);
 const offset=worldPoint(anchor,{center:{x:0,y:0},unitsPerPixel},size);
 return {center:subtract(fixed,offset),unitsPerPixel};
}

export function readCadPoint(input:string,previous?:Point):Point|undefined{
 const match=/^([@#]?)([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*([,<])\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))$/.exec(input.trim());
 if(!match||(match[1]==='@'&&!previous))return;
 const a=Number(match[2]),b=Number(match[4]),theta=b*Math.PI/180;
 const delta=match[3]==='<'?{x:a*Math.cos(theta),y:a*Math.sin(theta)}:{x:a,y:b};
 const p=match[1]==='@'?add(previous!,delta):delta;
 if([p.x,p.y].every(n=>Number.isFinite(n)&&Math.abs(n)<=1e9))return p;
}

export function arcData([start,via,end]:Point[]){
 const u=subtract(via,start),v=subtract(end,start),det=2*(u.x*v.y-u.y*v.x);
 if(Math.abs(det)<1e-9)return;
 const center=add(start,{x:(dot(u,u)*v.y-dot(v,v)*u.y)/det,y:(u.x*dot(v,v)-v.x*dot(u,u))/det});
 const radius=distance(start,center);
 if(!Number.isFinite(radius)||radius>1e10)return;
 const angle=(p:Point)=>Math.atan2(p.y-center.y,p.x-center.x);
 const origin=angle(start),full=2*Math.PI,positive=(n:number)=>(n%full+full)%full;
 const extent=positive(angle(end)-origin);
 const sweep=positive(angle(via)-origin)<extent?extent:extent-full;
 return {center,radius,origin,sweep};
}

export function dimensionGeometry(shape:CadShape){
 const [a,b,placement]=shape.points,span=subtract(b,a);
 let p:Point,q:Point,value:number;
 if(shape.aligned){
  const length=distance(a,b),normal={x:-span.y/length,y:span.x/length};
  const shift=multiply(normal,dot(subtract(placement,a),normal));
  p=add(a,shift);q=add(b,shift);value=length;
 }else if(Math.abs(span.y)<1e-8||(Math.abs(span.x)>1e-8&&Math.abs(placement.y-(a.y+b.y)/2)>=Math.abs(placement.x-(a.x+b.x)/2))){
  p={x:a.x,y:placement.y};q={x:b.x,y:placement.y};value=Math.abs(span.x);
 }else{
  p={x:placement.x,y:a.y};q={x:placement.x,y:b.y};value=Math.abs(span.y);
 }
 const segments:[Point,Point][]=[[a,p],[b,q],[p,q]];
 return {segments,label:cadNumber(value),labelAt:multiply(add(p,q),.5)};
}

export function outline(shape:CadShape):Point[]{
 const [a,b]=shape.points;
 if(shape.kind==='rect')return [a,{x:b.x,y:a.y},b,{x:a.x,y:b.y}];
 if(shape.kind!=='arc')return shape.points;
 const arc=arcData(shape.points);
 if(!arc)return shape.points;
 const {center,radius,origin,sweep}=arc;
 return Array.from({length:49},(_,i)=>{
  const angle=origin+i*sweep/48;
  return {x:center.x+radius*Math.cos(angle),y:center.y+radius*Math.sin(angle)};
 });
}

export function isClosed(shape:CadShape){
 return shape.kind==='rect'||shape.kind==='circle'||!!shape.closed;
}

export function contains(shape:CadShape,point:Point){
 if(shape.kind==='circle')return distance(point,shape.points[0])<=distance(shape.points[0],shape.points[1]);
 if(!isClosed(shape))return false;
 const vertices=outline(shape);
 let inside=false;
 for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){
  const a=vertices[i],b=vertices[j];
  if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }
 return inside;
}

export function edges(shape:CadShape):[Point,Point][]{
 if(shape.kind==='dimension')return dimensionGeometry(shape).segments;
 const vertices=outline(shape);
 return vertices.slice(1).map((point,i):[Point,Point]=>[vertices[i],point]).concat(isClosed(shape)?[[vertices[vertices.length-1],vertices[0]]]:[]);
}

export function nearEdge(shape:CadShape,point:Point,tolerance:number){
 if(shape.kind==='circle')return Math.abs(distance(point,shape.points[0])-distance(shape.points[0],shape.points[1]))<=tolerance;
 return edges(shape).some(([a,b])=>{
  const dx=b.x-a.x,dy=b.y-a.y,span=dx*dx+dy*dy;
  const t=span?Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/span)):0;
  return distance(point,{x:a.x+t*dx,y:a.y+t*dy})<=tolerance;
 });
}

export function fillSegments(shape:CadShape,spacing:number,slope:number):[Point,Point][]{
 const parts:[Point,Point][]=[];
 if(shape.kind==='circle'){
  const [center,end]=shape.points,r=distance(center,end);
  // Intersect parallel lines y = slope * x + k with the circle in centered coordinates.
  const norm=1+slope*slope;
  for(let k=-r*Math.sqrt(norm)+spacing/2;k<r*Math.sqrt(norm);k+=spacing){
   const half=Math.sqrt(Math.max(0,r*r*norm-k*k))/norm,middle=-slope*k/norm;
   parts.push([middle-half,middle+half].map(x=>({x:center.x+x,y:center.y+slope*x+k})) as [Point,Point]);
  }
  return parts;
 }
 const limits=outline(shape).map(p=>p.y-slope*p.x),segments=edges(shape);
 for(let k=Math.min(...limits)+spacing/2;k<Math.max(...limits);k+=spacing){
  const xs:number[]=[];
  for(const [a,b] of segments){
   const m=a.y-slope*a.x,n=b.y-slope*b.x;
   if((m>k)!==(n>k))xs.push(a.x+(b.x-a.x)*(k-m)/(n-m));
  }
  xs.sort((a,b)=>a-b);
  for(let i=1;i<xs.length;i+=2)parts.push([{x:xs[i-1],y:slope*xs[i-1]+k},{x:xs[i],y:slope*xs[i]+k}]);
 }
 return parts;
}


export function fitDrawing(shapes:CadShape[],size:Size):Camera{
 const points=shapes.flatMap(s=>{
  if(s.kind==='dimension')return dimensionGeometry(s).segments.flat();
  if(s.kind!=='circle')return outline(s);
  const [center,end]=s.points,r=distance(center,end);
  return [{x:center.x-r,y:center.y-r},{x:center.x+r,y:center.y+r}];
 });
 if(!points.length)return {center:{x:2000,y:1400},unitsPerPixel:5000/Math.max(1,size.width)};
 const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
 const left=Math.min(...xs),right=Math.max(...xs),bottom=Math.min(...ys),top=Math.max(...ys);
 return {center:{x:(left+right)/2,y:(bottom+top)/2},unitsPerPixel:Math.max(0.00001,
  (right-left)/Math.max(1,size.width*.78),(top-bottom)/Math.max(1,size.height*.75))};
}

export function snapPoint(point:Point,shapes:CadShape[],tolerance:number){
 let nearest:{point:Point;label:string}|undefined,best=tolerance;
 const check=(candidate:Point,label:string)=>{
  const d=distance(point,candidate);
  if(d<best){best=d;nearest={point:candidate,label};}
 };
 for(const shape of shapes){
  if(shape.kind==='circle'){
   const [c,e]=shape.points,r=distance(c,e);
   check(c,'Środek');
   for(const offset of [{x:r,y:0},{x:-r,y:0},{x:0,y:r},{x:0,y:-r}])check(add(c,offset),'Kwadrant');
  }else if(shape.kind==='arc'){
   for(const p of shape.points)check(p,'Punkt łuku');
   const arc=arcData(shape.points);
   if(arc)check(arc.center,'Środek');
  }else if(shape.kind!=='dimension'){
   for(const p of outline(shape))check(p,'Koniec');
   for(const [a,b] of edges(shape))check(multiply(add(a,b),.5),'Środek odcinka');
  }
 }
 return nearest;
}

export function transformShape(shape:CadShape,transform:(point:Point)=>Point,preserveRect=true){
 if(shape.kind==='rect'&&!preserveRect)return {...shape,kind:'poly' as const,closed:true,points:outline(shape).map(transform)};
 return {...shape,points:shape.points.map(transform)};
}

export function offsetShape(shape:CadShape,amount:number,side:Point):CadShape|undefined{
 const [a,b]=shape.points;
 if(shape.kind==='line'){
  const length=distance(a,b),normal={x:(a.y-b.y)/length,y:(b.x-a.x)/length};
  const shift=multiply(normal,dot(subtract(side,a),normal)<0?-amount:amount);
  return transformShape(shape,p=>add(p,shift));
 }
 if(shape.kind==='circle'){
  const radius=distance(a,b),next=radius+(distance(a,side)<radius?-amount:amount);
  if(next>0)return {...shape,points:[a,{x:a.x+next,y:a.y}]};
 }
}

export function trimLine(target:CadShape,cutters:CadShape[],picked:Point):CadShape[]|undefined{
 if(target.kind!=='line')return;
 const [a,b]=target.points,v=subtract(b,a);
 const cross=(p:Point,q:Point)=>p.x*q.y-p.y*q.x;
 const cuts:number[]=[];
 for(const cutter of cutters){
  if(cutter.id===target.id||cutter.kind==='circle'||cutter.kind==='dimension')continue;
  for(const [c,d] of edges(cutter)){
   const w=subtract(d,c),divisor=cross(v,w);
   if(Math.abs(divisor)<1e-10)continue;
   const t=cross(subtract(c,a),w)/divisor,u=cross(subtract(c,a),v)/divisor;
   if(t>1e-8&&t<1-1e-8&&u>=0&&u<=1)cuts.push(t);
  }
 }
 if(!cuts.length)return;
 const t=dot(subtract(picked,a),v)/dot(v,v);
 const sorted=[...new Set(cuts)].sort((x,y)=>x-y);
 const lower=sorted.filter(cut=>cut<t).at(-1),upper=sorted.find(cut=>cut>=t);
 const parts:CadShape[]=[];
 if(lower!==undefined)parts.push({...target,points:[a,add(a,multiply(v,lower))]});
 if(upper!==undefined)parts.push({...target,points:[add(a,multiply(v,upper)),b]});
 return parts;
}
