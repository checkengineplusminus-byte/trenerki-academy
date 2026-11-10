export type Point={x:number;y:number};
export type CadShape={
 id:number;kind:'line'|'poly'|'rect'|'circle';points:Point[];layer:number;closed?:boolean;fill?:'hatch'|'solid'
};
export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export const CAD_WIDTH=1000,CAD_HEIGHT=600;

export function readCadPoint(input:string,previous?:Point):Point|undefined{
 const match=/^(@?)(-?(?:\d+(?:\.\d*)?|\.\d+))\s*,\s*(-?(?:\d+(?:\.\d*)?|\.\d+))$/.exec(input.trim());
 if(!match||(match[1]&&!previous))return;
 const x=Number(match[2])+(match[1]?previous!.x:0);
 const y=Number(match[3])+(match[1]?previous!.y:0);
 if(Number.isFinite(x)&&Number.isFinite(y))return {x,y};
}

export function outline(shape:CadShape):Point[]{
 if(shape.kind!=='rect')return shape.points;
 const [a,b]=shape.points;
 return [a,{x:b.x,y:a.y},b,{x:a.x,y:b.y}];
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
