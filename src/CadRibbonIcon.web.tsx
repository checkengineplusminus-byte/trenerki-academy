import React from 'react';

type ToolIcon='line'|'poly'|'circle'|'arc'|'rect'|'hatch'|'move'|'copy'|'rotate'|'mirror'|'trim'|'scale'|'offset'|'join'|'erase'|'layer'|'dimlinear'|'dimaligned'|'dist'|'pan'|'zoom'|'select'|'text'|'block';
export default function CadRibbonIcon({tool,size=28}:{tool:ToolIcon;size?:number}){
 const ink='#dbe8ef',a='#8ccdec',b='#e8ba7c';
 const common={fill:'none',stroke:ink,strokeWidth:1.8,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
 const drawn=(()=>{
  switch(tool){
   case 'line':return <><line x1="5" y1="24" x2="25" y2="5" stroke={a} strokeWidth="2.4"/><circle cx="5" cy="24" r="2.3" fill={b}/><circle cx="25" cy="5" r="2.3" fill={b}/></>;
   case 'poly':return <><polyline points="3,23 11,11 19,20 27,5" stroke={a} strokeWidth="2.3" fill="none"/>{[[3,23],[11,11],[19,20],[27,5]].map(([x,y],i)=><rect key={i} x={x-1.6} y={y-1.6} width="3.2" height="3.2" fill={b}/>)}</>;
   case 'circle':return <><circle cx="15" cy="15" r="10.5" stroke={a} strokeWidth="2" fill="none"/><path d="M15 10v10M10 15h10" {...common}/></>;
   case 'arc':return <><path d="M5 24A19 19 0 0 1 25 7" stroke={a} strokeWidth="2.2" fill="none"/><circle cx="5" cy="24" r="2" fill={b}/><circle cx="25" cy="7" r="2" fill={b}/></>;
   case 'rect':return <><rect x="4" y="6" width="22" height="18" stroke={a} strokeWidth="2" fill="none"/><circle cx="4" cy="6" r="1.7" fill={b}/><circle cx="26" cy="24" r="1.7" fill={b}/></>;
   case 'hatch':return <><rect x="5" y="5" width="20" height="20" {...common}/>{[3,9,15,21,27].map(n=><line key={n} x1={Math.max(5,n)} y1="25" x2={Math.min(25,n+17)} y2="5" stroke={a} strokeWidth="1.4"/>)}</>;
   case 'move':return <><path d="M15 3v24M3 15h24M11 7l4-4 4 4M11 23l4 4 4-4M7 11l-4 4 4 4M23 11l4 4-4 4" stroke={a} strokeWidth="1.7" fill="none"/><circle cx="15" cy="15" r="2.5" fill={b}/></>;
   case 'copy':return <><rect x="4" y="9" width="17" height="17" stroke={a} fill="none" strokeWidth="1.8"/><rect x="9" y="4" width="17" height="17" stroke={b} fill="none" strokeWidth="1.8"/></>;
   case 'rotate':return <><path d="M22 8A11 11 0 1 0 25 18" stroke={a} strokeWidth="2.2" fill="none"/><path d="M23 3l-1 7-7-1" {...common}/><circle cx="15" cy="15" r="2" fill={b}/></>;
   case 'mirror':return <><path d="M15 2v26" stroke={b} strokeWidth="1.5" strokeDasharray="3 3"/><polyline points="12,7 5,15 12,23 12,7" fill="none" stroke={a} strokeWidth="2"/><polyline points="18,7 25,15 18,23 18,7" fill="none" stroke={ink} strokeWidth="2"/></>;
   case 'trim':return <><path d="M5 5l20 20M5 25L25 5" stroke={a} strokeWidth="2"/><circle cx="8" cy="19" r="4" {...common}/><circle cx="19" cy="21" r="4" {...common}/></>;
   case 'scale':return <><rect x="4" y="16" width="10" height="10" stroke={b} fill="none" strokeWidth="1.7"/><path d="M14 6h12v12M10 19L24 5M19 5h5v5" stroke={a} fill="none" strokeWidth="2"/></>;
   case 'offset':return <><path d="M5 24L23 6M10 27L27 10" stroke={a} fill="none" strokeWidth="2"/><path d="M10 9l5 5" stroke={b} fill="none" strokeWidth="1.4"/></>;
   case 'join':return <><polyline points="5,24 14,14 25,5" fill="none" stroke={a} strokeWidth="2.2"/><circle cx="5" cy="24" r="2" fill={b}/><circle cx="25" cy="5" r="2" fill={b}/><circle cx="14" cy="14" r="3" fill="none" stroke={b}/></>;
   case 'erase':return <><path d="M5 20L16 5 27 14 16 26H10z" stroke={a} fill="#617583" strokeWidth="1.5"/><path d="M12 11l10 9" stroke={b} strokeWidth="2"/></>;
   case 'layer':return <><path d="M4 11L15 4l11 7-11 7zM4 16l11 7 11-7M4 21l11 7 11-7" {...common}/><path d="M4 11l11 7 11-7" stroke={a} fill="none" strokeWidth="2"/></>;
   case 'dimlinear':return <><path d="M5 8v16M25 8v16M5 16h20M5 16l4-3v6zM25 16l-4-3v6z" stroke={a} fill="none" strokeWidth="1.5"/><text x="15" y="11" fontSize="7" textAnchor="middle" fill={b}>100</text></>;
   case 'dimaligned':return <><path d="M5 24L25 7M3 20l4 8M23 3l4 8" stroke={a} strokeWidth="1.8" fill="none"/><text x="15" y="11" fontSize="7" textAnchor="middle" fill={b}>45</text></>;
   case 'dist':return <><path d="M4 24L26 6M4 20v7h7M19 3h7v7" {...common}/><path d="M9 18l12-9" stroke={a} strokeWidth="2"/></>;
   case 'pan':return <><path d="M8 15V9q0-3 3-3 2 0 2 2v3-6q0-3 3-3 2 0 2 3v7-5q0-3 3-3 2 0 2 3v13q0 7-8 7-6 0-9-5l-3-6q-2-4 1-5 2-1 4 3" {...common}/></>;
   case 'zoom':return <><circle cx="13" cy="13" r="9" stroke={a} fill="none" strokeWidth="2"/><path d="M20 20l8 8M13 8v10M8 13h10" {...common}/></>;
   case 'select':return <><rect x="4" y="4" width="22" height="22" stroke={a} strokeDasharray="4 3" fill="none"/><path d="M14 11v13l4-5 5 2z" fill={b}/></>;
   case 'text':return <><text x="15" y="23" fontSize="24" fontWeight="bold" textAnchor="middle" fill={a}>A</text></>;
   case 'block':return <><rect x="4" y="4" width="10" height="10" {...common}/><rect x="16" y="4" width="10" height="10" {...common}/><rect x="10" y="16" width="10" height="10" {...common}/></>;
  }
 })();
 return <svg xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true" width={size} height={size} viewBox="0 0 30 30" style={{flexShrink:0,display:'block'}}>{drawn}</svg>;
}
