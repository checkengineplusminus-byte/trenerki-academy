import React,{useEffect,useId,useRef,useState} from 'react';
import {dimensionGeometry,distance,outline,screenPoint,type CadShape,type Camera,type Point,type Size} from './CadGeometry';

export type SceneObject={shape:CadShape;color:string;selected?:boolean;preview?:boolean};
type Props={
 size:Size;camera:Camera;objects:SceneObject[];grid:boolean;pan:boolean;layout:boolean;selecting?:boolean;lineweight?:boolean;transparency?:boolean;
 cursor?:Point;snap?:Point;prompt?:string;
 onMove:(point?:Point)=>void;onPick:(point:Point,shift?:boolean)=>void;onObjectTap?:(id:number,remove:boolean)=>void;onWindowSelect?:(start:Point,end:Point,remove:boolean)=>void;onPan:(delta:Point)=>void;
 onZoom:(factor:number,at:Point)=>void;onFinish:()=>void;
};

export default function CadCanvas({size,camera,objects,grid,pan,layout,selecting=false,lineweight=false,transparency=false,cursor,snap,prompt,onMove,onPick,onObjectTap,onWindowSelect,onPan,onZoom,onFinish}:Props){
 const surface=useRef<SVGSVGElement>(null);
 const drag=useRef<{id:number;point:Point}|null>(null);
 const selectionDrag=useRef<{id:number;start:Point;end:Point;remove:boolean}|null>(null);
 const tapShape=useRef<{pointerId:number;shapeId:number;remove:boolean}|null>(null);
 const [selectionWindow,setSelectionWindow]=useState<{start:Point;end:Point}|null>(null);
 const hatch=useId();
 const project=(point:Point)=>screenPoint(point,camera,size);
 const w=Math.max(1,size.width),h=Math.max(1,size.height);
 const origin=project({x:0,y:0});
 const step=Math.pow(10,Math.floor(Math.log10(65*camera.unitsPerPixel)))/camera.unitsPerPixel;
 const gridStep=step<23?step*5:step;
 const gridX=(origin.x%gridStep+gridStep)%gridStep,gridY=(origin.y%gridStep+gridStep)%gridStep;
 const line=(a:Point,b:Point,props:React.SVGProps<SVGLineElement>={})=><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} {...props}/>;
 function pointer(event:Pick<PointerEvent,'clientX'|'clientY'>){
  const rect=surface.current!.getBoundingClientRect();
  return {x:(event.clientX-rect.left)*w/rect.width,y:(event.clientY-rect.top)*h/rect.height};
 }
 useEffect(()=>{
  const node=surface.current;
  if(!node||layout)return;
  function zoom(event:WheelEvent){event.preventDefault();onZoom(event.deltaY<0?.8:1.25,pointer(event));}
  node.addEventListener('wheel',zoom,{passive:false});
  return ()=>node.removeEventListener('wheel',zoom);
 },[layout,onZoom,w,h]);
 function object({shape,color,selected,preview}:SceneObject){
  const [a,b]=shape.points;
  const stroke=layout?'#263849':preview?'#e9b66d':selected?'#91d8ff':color;
  const fill=shape.fill==='solid'?(layout?'#ced9df':'#4c7584'):shape.fill==='hatch'?'url(#'+hatch+')':'none';
  const attrs={'data-cad-object':preview?'preview':String(shape.id),stroke,fill,strokeWidth:selected?2.8:lineweight?2.8:1.65,
   strokeDasharray:preview?'6 4':undefined,opacity:transparency?.68:1};
  if(shape.kind==='circle'){
   const center=project(a);
   const radius=distance(a,b)/camera.unitsPerPixel;
   return <g key={shape.id} data-cad-object={preview?'preview':String(shape.id)}>
    <circle cx={center.x} cy={center.y} r={radius} {...attrs}/>
    {!preview&&<circle data-cad-hit="true" data-cad-object={String(shape.id)} cx={center.x} cy={center.y} r={radius}
     fill="none" stroke="transparent" strokeWidth="18" pointerEvents="stroke"/>}
   </g>;
  }
  if(shape.kind==='dimension'){
   const dim=dimensionGeometry(shape),p=project(dim.labelAt);
   return <g key={shape.id} data-cad-object={preview?'preview':String(shape.id)} stroke={stroke} strokeWidth="1.25">
    {dim.segments.map(([a1,b1],i)=>line(project(a1),project(b1),{key:i,strokeDasharray:preview?'5 3':undefined}))}
    <text x={p.x} y={p.y-7} fill={stroke} stroke="none" textAnchor="middle" fontSize="12">{dim.label}</text>
   </g>;
  }
  const points=outline(shape).map(p=>{const s=project(p);return s.x+','+s.y;}).join(' ');
  const poly=shape.kind==='rect'||shape.closed;
  return <g key={shape.id} data-cad-object={preview?'preview':String(shape.id)}>
   {poly?<polygon points={points} {...attrs}/>:<polyline points={points} {...attrs}/>}
   {!preview&&(poly?<polygon data-cad-hit="true" data-cad-object={String(shape.id)} points={points}
       stroke="transparent" strokeWidth="18" fill="none" pointerEvents="stroke"/>:
     <polyline data-cad-hit="true" data-cad-object={String(shape.id)} points={points}
       stroke="transparent" strokeWidth="18" fill="none" pointerEvents="stroke"/>)}
  </g>;
 }
 return <svg ref={surface} data-testid="cad-canvas" aria-label={layout?'Podgląd arkusza':'Pole rysunku Model'}
  viewBox={'0 0 '+w+' '+h} tabIndex={0}
  style={{display:'block',width:'100%',height:'100%',touchAction:'none',background:layout?'#e0e6ea':'#172530',cursor:layout?'default':pan?'grab':'crosshair',outlineColor:'#75c7f5'}}
  onContextMenu={event=>{if(!layout){event.preventDefault();onFinish();}}}
  onPointerDown={event=>{
   if(layout||event.button>1)return;
   surface.current?.focus({preventScroll:true});
   if(pan||event.button===1){
    event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);
    drag.current={id:event.pointerId,point:pointer(event.nativeEvent)};
   }else if(selecting&&event.button===0){
    // Capture a tap at pointer-down so a quick release selects immediately.
    // A transparent 18px hit path makes thin CAD lines tappable without long pressing.
    event.currentTarget.setPointerCapture(event.pointerId);
    const nearest=(event.target as Element).closest('[data-cad-object]')?.getAttribute('data-cad-object');
    const id=nearest&&nearest!=='preview'?Number(nearest):NaN;
    if(Number.isInteger(id))tapShape.current={pointerId:event.pointerId,shapeId:id,remove:event.shiftKey};
    else{
     event.preventDefault();
     const start=pointer(event.nativeEvent);
     selectionDrag.current={id:event.pointerId,start,end:start,remove:event.shiftKey};
    }
   }
  }}
  onPointerMove={event=>{
   if(layout)return;
   const p=pointer(event.nativeEvent);
   if(drag.current?.id===event.pointerId){onPan({x:p.x-drag.current.point.x,y:p.y-drag.current.point.y});drag.current.point=p;}
   else if(selectionDrag.current?.id===event.pointerId){
    selectionDrag.current.end=p;
    if(Math.hypot(p.x-selectionDrag.current.start.x,p.y-selectionDrag.current.start.y)>4)
     setSelectionWindow({start:selectionDrag.current.start,end:p});
   }else onMove(p);
  }}
  onPointerUp={event=>{
   if(layout)return;
   if(drag.current?.id===event.pointerId){drag.current=null;return;}
   if(tapShape.current?.pointerId===event.pointerId){
    const hit=tapShape.current;tapShape.current=null;onObjectTap?.(hit.shapeId,hit.remove);return;
   }
   const p=pointer(event.nativeEvent);
   if(selectionDrag.current?.id===event.pointerId){
    const box=selectionDrag.current;selectionDrag.current=null;setSelectionWindow(null);
    if(Math.hypot(p.x-box.start.x,p.y-box.start.y)>5)onWindowSelect?.(box.start,p,box.remove);
    else onPick(p,box.remove);
    return;
   }
   if(event.button===0)onPick(p,event.shiftKey);
  }}
  onPointerCancel={()=>{drag.current=null;tapShape.current=null;selectionDrag.current=null;setSelectionWindow(null);onMove(undefined);}}
  onPointerLeave={()=>{if(!drag.current)onMove(undefined);}}>
  <defs><pattern id={hatch} width="11" height="11" patternUnits="userSpaceOnUse"><path d="M-3 3 3-3 M0 11 11 0 M8 14 14 8" stroke={layout?'#81949b':'#759caa'} strokeWidth="1"/></pattern></defs>
  {layout?<g><rect x="12" y="10" width={w-24} height={h-20} fill="#fff" stroke="#bac8d0"/><rect x="23" y="21" width={w-46} height={h-42} fill="none" stroke="#d5dfe5"/>
   <text x={w-29} y={h-28} textAnchor="end" fill="#455e72" fontSize="11">Arkusz 1 · Model 2D</text></g>:grid&&<g stroke="#2b3f4c" strokeWidth="1">
    {Array.from({length:Math.ceil(w/gridStep)},(_,i)=>line({x:gridX+i*gridStep,y:0},{x:gridX+i*gridStep,y:h},{key:'x'+i}))}
    {Array.from({length:Math.ceil(h/gridStep)},(_,i)=>line({x:0,y:gridY+i*gridStep},{x:w,y:gridY+i*gridStep},{key:'y'+i}))}
   </g>}
  {!layout&&<g stroke="#395463" strokeWidth="1">
   {origin.y>=0&&origin.y<=h&&line({x:0,y:origin.y},{x:w,y:origin.y})}
   {origin.x>=0&&origin.x<=w&&line({x:origin.x,y:0},{x:origin.x,y:h})}
  </g>}
  {objects.map(object)}
  {selectionWindow&&!layout&&(()=>{
   const a=selectionWindow.start,b=selectionWindow.end,crossing=b.x<a.x;
   return <rect data-testid="cad-selection-window" x={Math.min(a.x,b.x)} y={Math.min(a.y,b.y)}
    width={Math.abs(b.x-a.x)} height={Math.abs(b.y-a.y)} pointerEvents="none"
    fill={crossing?'#78d79b':'#7bbdff'} fillOpacity=".18"
    stroke={crossing?'#7dd59c':'#83c8ff'} strokeWidth="1.5" strokeDasharray={crossing?'5 4':undefined}/>;
  })()}
  {!layout&&<g transform={'translate(17 '+(h-17)+')'} fill="#abc0ca" stroke="#abc0ca" strokeWidth="1">
   <path d="M0-24V0H25" fill="none"/><text x="27" y="3" stroke="none" fontSize="10">X</text><text x="-4" y="-27" stroke="none" fontSize="10">Y</text>
  </g>}
  {!layout&&cursor&&!pan&&<g stroke="#a8c9d9" opacity=".9" fill="none">
   {line({x:cursor.x-13,y:cursor.y},{x:cursor.x+13,y:cursor.y})}
   {line({x:cursor.x,y:cursor.y-13},{x:cursor.x,y:cursor.y+13})}
   <rect x={cursor.x-3} y={cursor.y-3} width="6" height="6"/>
  </g>}
  {snap&&<rect x={snap.x-5} y={snap.y-5} width="10" height="10" stroke="#b6ef83" strokeWidth="2" fill="none"/>}
  {cursor&&prompt&&<text x={Math.min(cursor.x+12,w-135)} y={Math.max(cursor.y-12,16)} fill="#e8f3f8" stroke="#172530"
   strokeWidth="4" paintOrder="stroke" fontSize="11" fontFamily="monospace">{prompt}</text>}
 </svg>;
}
