import type {Point,Size,Camera} from './CadGeometry.ts';
export const A3_LANDSCAPE={widthMm:420,heightMm:297};
export function paperLengthMm(modelMm:number,scaleDenominator:number):number{
 if(!Number.isFinite(modelMm)||!Number.isFinite(scaleDenominator)||scaleDenominator<=0)throw new RangeError('Nieprawidłowy wymiar lub skala');
 return modelMm/scaleDenominator;
}
export function paperWindow(size:Size){
 const width=Math.max(1,size.width),height=Math.max(1,size.height);
 const h=Math.min(Math.max(1,height-26),Math.max(1,width-26)*A3_LANDSCAPE.heightMm/A3_LANDSCAPE.widthMm);
 const w=h*A3_LANDSCAPE.widthMm/A3_LANDSCAPE.heightMm;
 return {x:(width-w)/2,y:(height-h)/2,width:w,height:h,pixelsPerMm:w/A3_LANDSCAPE.widthMm};
}
export function layoutViewportCamera(size:Size,center:Point,scaleDenominator:number):Camera{
 if(!Number.isFinite(scaleDenominator)||scaleDenominator<=0)throw new RangeError('Nieprawidłowy mianownik');
 const window=paperWindow(size);
 return {center,unitsPerPixel:scaleDenominator/window.pixelsPerMm};
}
