import { PDFDocument, LineCapStyle, LineJoinStyle, degrees, popGraphicsState, pushGraphicsState, rgb, setLineJoin, type PDFFont } from 'npm:pdf-lib@1.17.1';
import fontkit from 'npm:@pdf-lib/fontkit@1.1.1';
import { sans, serif } from './fonts.ts';

export type Diploma = {
 id: string; certificate_no: string; holder_name: string;
 title_pl: string; title_en: string; issued_at: string; is_demo: boolean;
};
export type DiplomaLanguage = 'pl'|'en';
const gold=rgb(.67,.49,.20);
const lightGold=rgb(.86,.75,.52);
const navy=rgb(.055,.10,.17);
const blueInk=rgb(.12,.23,.53);
const paper=rgb(.999,.998,.992);
const muted=rgb(.36,.36,.35);
const bytes=(b64:string)=>Uint8Array.from(atob(b64),x=>x.charCodeAt(0));

const copy={
 pl:{heading:'DYPLOM',lead:'Niniejszym potwierdza się, że',complete:'ukończył(a) kurs',
 date:'DATA UKOŃCZENIA',number:'NUMER DYPLOMU',founder:'Założyciel TRENERKI Academy',sample:'WZÓR — NIEWAŻNY'},
 en:{heading:'DIPLOMA',lead:'This certifies that',complete:'has successfully completed the course',
 date:'COMPLETION DATE',number:'DIPLOMA NUMBER',founder:'Founder, TRENERKI Academy',sample:'SAMPLE — NOT VALID'}
} as const;

function cleanTitle(d:Diploma,language:DiplomaLanguage){
 return (language==='pl'?d.title_pl:d.title_en)
 .replace(/^Ukończenie (?:prywatnego )?(?:kursu(?: teoretycznego)?|szkolenia(?: teoretycznego)?|programu)\s*:\s*/i,'')
 .replace(/^(?:Completion of (?:the )?(?:private )?(?:course|programme)|Certificate of completion)\s*:\s*/i,'')
 .trim();
}
function wrap(text:string,font:PDFFont,size:number,maxWidth:number){
 const result:string[]=[];let line='';
 for(const word of text.trim().split(/\s+/)){
  const next=line?line+' '+word:word;
  if(line&&font.widthOfTextAtSize(next,size)>maxWidth){result.push(line);line=word}else line=next;
 }
 if(line)result.push(line);
 return result;
}
export async function buildDiplomaPdf(d:Diploma, language:DiplomaLanguage){
 const terms=copy[language];const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const [body,display]=await Promise.all([
   doc.embedFont(bytes(sans),{subset:true}),doc.embedFont(bytes(serif),{subset:true})
 ]);
 doc.setTitle(terms.heading+' '+d.certificate_no+' — TRENERKI Academy');
 doc.setAuthor('TRENERKI Academy');
 doc.setLanguage(language==='pl'?'pl-PL':'en-GB');
 const stamp=new Date(d.issued_at);if(!Number.isNaN(stamp.valueOf())){doc.setCreationDate(stamp);doc.setModificationDate(stamp);}
 const page=doc.addPage([842,595]);const center=421;
 const t=(value:string,x:number,y:number,size:number,font:PDFFont=body,color=navy)=>
  page.drawText(value,{x:x-font.widthOfTextAtSize(value,size)/2,y,size,font,color});
 const line=(x1:number,x2:number,y:number,width=.8,color=gold)=>page.drawLine({start:{x:x1,y},end:{x:x2,y},thickness:width,color});
 const fit=(value:string,y:number,base:number,maxWidth:number,maxLines=2,font:PDFFont=display)=>{
  let size=base;let lines=wrap(value,font,size,maxWidth);
  while(size>10&&(lines.length>maxLines||lines.some(v=>font.widthOfTextAtSize(v,size)>maxWidth))){size-=.6;lines=wrap(value,font,size,maxWidth);}
  const step=size+6;
  lines.forEach((item,i)=>t(item,center,y-i*step,size,font));
 };
 page.drawRectangle({x:0,y:0,width:842,height:595,color:paper});
 // The double hairline frame has large safe print margins.
 page.drawRectangle({x:23,y:20,width:796,height:555,borderWidth:1.1,borderColor:gold});
 page.drawRectangle({x:31,y:28,width:780,height:539,borderWidth:.45,borderColor:lightGold});
 for(const [x,dir] of [[36,1],[806,-1]] as const){
  page.drawLine({start:{x,y:562},end:{x:x+22*dir,y:562},thickness:1.3,color:gold});
  page.drawLine({start:{x,y:562},end:{x,y:540},thickness:1.3,color:gold});
  page.drawLine({start:{x,y:33},end:{x:x+22*dir,y:33},thickness:1.3,color:gold});
  page.drawLine({start:{x,y:33},end:{x,y:55},thickness:1.3,color:gold});
 }
 // Keep the academic emblem clear of the wordmark below it.
 page.drawSvgPath('M0 16 L23 27 L46 16 L23 5 Z',{x:398,y:534,color:navy});
 page.drawSvgPath('M12 7 L12 -1 Q23 -8 34 -1 L34 7',{x:398,y:534,borderColor:navy,borderWidth:1.5});
 page.drawLine({start:{x:444,y:518},end:{x:444,y:505},thickness:1,color:gold});
 line(293,373,516,.65,lightGold);line(468,549,516,.65,lightGold);
 t('T R E N E R K I',center,476,19,display,navy);
 t('A  C  A  D  E  M  Y',center,457,8,body,gold);
 t(terms.heading,center,385,31,display,navy);
 line(309,394,367,.75,gold);line(448,533,367,.75,gold);
 page.drawSvgPath('M0 5 L5 10 L10 5 L5 0 Z',{x:416,y:362,color:gold});
 t(terms.lead,center,333,13,display,navy);
 fit(d.holder_name?.normalize('NFC')?.trim()||'—',281,26,672,2,display);
 line(204,638,267,.5,lightGold);
 t(terms.complete,center,238,12,body,muted);
 fit(cleanTitle(d,language),205,19,660,2,display);
 line(230,612,145,.65,lightGold);
 const date=new Intl.DateTimeFormat(language==='pl'?'pl-PL':'en-GB',
  {day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Warsaw'}).format(stamp);
 // Date and serial are kept visible even if the course title wraps.
 t(terms.date,274,124,8,body,muted);
 t(date,274,106,11.5,display,navy);
 t(terms.number,572,124,8,body,muted);
 t(d.certificate_no,572,106,11.5,display,navy);
 // The issuer's company stamp uses both halves of the outer ring.
 const sealX=128,sealY=91,sealInk=rgb(.36,.25,.12);
 page.drawCircle({x:sealX,y:sealY,size:43,color:rgb(.977,.946,.847),borderWidth:1.15,borderColor:gold});
 page.drawCircle({x:sealX,y:sealY,size:40.9,borderWidth:.45,borderColor:lightGold});
 page.drawCircle({x:sealX,y:sealY,size:27.8,borderWidth:.7,borderColor:gold});
 const stampArc=(label:string,top:boolean)=>{
  const size=5.7,radius=top?33.4:37.3,tracking=.57,mid=top?Math.PI/2:3*Math.PI/2;
  const glyphs=Array.from(label,ch=>({ch,width:body.widthOfTextAtSize(ch,size)}));
  const span=glyphs.reduce((width,glyph)=>width+glyph.width,0)+(glyphs.length-1)*tracking;
  let advance=-span/2;
  for(const {ch,width} of glyphs){
   const angle=mid+(top?-1:1)*(advance+width/2)/radius;
   const slope=angle+(top?-Math.PI/2:Math.PI/2);
   page.drawText(ch,{
    x:sealX+radius*Math.cos(angle)-width/2*Math.cos(slope),
    y:sealY+radius*Math.sin(angle)-width/2*Math.sin(slope),
    size,font:body,color:sealInk,rotate:degrees(slope*180/Math.PI)
   });
   advance+=width+tracking;
  }
 };
 stampArc('TRENERKI SP. Z O.O.',true);
 stampArc('WARSZAWA · POLSKA',false);
 for(const x of [94,162])page.drawCircle({x,y:sealY,size:1.1,color:gold});
 line(120,136,105,.55,gold);
 t('NIP 5272961874',sealX,96,5.85,body,sealInk);
 t('KRS 0000907332',sealX,87.5,5.5,body,sealInk);
 t('REGON 389245852',sealX,79,5.35,body,sealInk);
 line(507,717,68,.6,gold);
 t('Adrian Flaga',612,49,9,display,navy);
 // Draw the ballpoint strokes last so the lower loop can touch the typeset name.
 const signatureStrokes=[
  {weight:1.12,path:'M0 26 C12 29 14 19 27 8 C35 1 42 -3 42 4 C43 10 33 22 34 26 C35 31 48 19 54 17 C60 15 56 22 52 24 C48 27 47 23 51 20 C54 17 61 14 64 8 C67 2 61 5 58 10 C53 19 58 28 63 24 C68 20 73 16 75 18 C78 19 70 26 75 25 C80 23 82 18 87 18 C92 18 84 25 89 24 C95 22 97 17 102 18 C106 19 102 24 108 22 C112 21 116 18 121 17'},
  {weight:.66,path:'M14 21 C22 17 32 17 44 15 C49 14 52 13 55 12'},
  {weight:1.17,path:'M115 13 C128 5 148 -1 166 2 C178 4 171 8 166 8 M149 3 C145 10 141 21 134 29 C130 34 123 33 124 29 C125 24 141 24 151 18 C158 14 166 5 163 3 C159 1 151 11 152 19 C152 28 163 26 171 19 C176 14 181 15 178 20 C174 26 169 27 172 21 C176 16 184 17 185 19 C184 23 179 25 185 25 C190 25 196 18 201 18 C205 19 200 25 205 23 C210 21 214 16 220 17 C225 18 227 17 232 14'},
  {weight:.82,path:'M134 16 C140 12 150 13 159 11 M193 22 C189 31 176 42 155 50 C143 55 129 58 115 57 C107 56 111 52 124 50 C143 45 163 43 183 39 C203 35 215 31 227 26'},
  {weight:.53,path:'M48 25 C51 25 55 22 57 21 M181 40 C192 38 202 36 211 32'},
 ];
 page.pushOperators(pushGraphicsState(),setLineJoin(LineJoinStyle.Round));
 for(const stroke of signatureStrokes){
  page.drawSvgPath(stroke.path,{x:523,y:99,scale:.79,borderColor:blueInk,borderWidth:stroke.weight,borderLineCap:LineCapStyle.Round});
 }
 page.pushOperators(popGraphicsState());
 // Deliberately half the usual 12-pt caption size.
 t(terms.founder,612,37,6,body,muted);
 if(d.is_demo){
  page.drawRectangle({x:309,y:14,width:224,height:18,color:rgb(.996,.92,.86)});
  t(terms.sample,center,19,9,body,rgb(.55,.24,.14));
 }
 return doc.save({addDefaultPage:false});
}
export function pdfBase64(data:Uint8Array){
 let binary='';for(let offset=0;offset<data.length;offset+=8192)binary+=String.fromCharCode(...data.subarray(offset,offset+8192));
 return btoa(binary);
}
export function diplomaFilename(d:Diploma,language:DiplomaLanguage){
 return 'TRENERKI-'+d.certificate_no.replace(/[^a-zA-Z0-9-]/g,'')+'-'+language+'.pdf';
}
