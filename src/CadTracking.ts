import type {Point} from './CadGeometry.ts';
export type CadTrackingResult={point:Point;label:string};
/** Polar tracking is a guide near configured angles, not an unconditional angle lock. */
export function polarTracking(cursor:Point,origin:Point,step=45,tolerance=8):CadTrackingResult|undefined{
 if(!Number.isFinite(step)||step<=0||step>180)return;
 const dx=cursor.x-origin.x,dy=cursor.y-origin.y;
 const length=Math.hypot(dx,dy);if(length<1e-9)return;
 const rawAngle=Math.atan2(dy,dx)*180/Math.PI;
 const snappedAngle=Math.round(rawAngle/step)*step;
 if(Math.abs(rawAngle-snappedAngle)>tolerance)return;
 const rad=snappedAngle*Math.PI/180;
 return {point:{x:origin.x+length*Math.cos(rad),y:origin.y+length*Math.sin(rad)},label:'POLAR '+snappedAngle+'°'};
}
/** Object snap tracking: follow axes projected from a previously observed OSNAP point. */
export function objectSnapTracking(cursor:Point,snap:Point,tolerance:number):CadTrackingResult|undefined{
 if(tolerance<=0||!Number.isFinite(tolerance))return;
 const x=Math.abs(cursor.x-snap.x),y=Math.abs(cursor.y-snap.y);
 if(x<tolerance&&y>=tolerance)return {point:{x:snap.x,y:cursor.y},label:'OTrack pion'};
 if(y<tolerance&&x>=tolerance)return {point:{x:cursor.x,y:snap.y},label:'OTrack poziom'};
 return;
}
