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
 // Keep the handwritten signature above the rule and the printed name.
 const signatureStrokes=[
  // A and a compressed, connected first name.
  {weight:1.55,path:'M1 24 C9 26 14 16 20 7 C24 1 28 -1 30 2 C32 6 29 14 28 20 C27 25 31 25 37 19 C42 13 46 15 44 19 C42 24 36 25 36 21 C37 16 45 15 49 11 C54 6 54 2 51 3 C47 4 43 16 44 21 C45 25 50 22 55 17 C58 13 61 14 59 18 C62 16 65 16 67 17 C65 20 66 23 70 21 C74 19 77 15 81 15 C86 15 79 23 77 21 C75 19 81 16 85 17 C83 21 85 23 89 20 C93 17 97 14 100 16 C103 18 98 21 101 21 C104 21 107 19 109 18'},
  {weight:.98,path:'M13 17 C19 14 25 15 34 14 C39 14 41 13 45 12'},
  // F, a loose surname ligature and a rising exit stroke.
  {weight:1.55,path:'M112 9 C125 2 141 -1 157 3 C162 4 162 6 158 7 M140 3 C137 10 133 17 128 24 C126 28 120 29 120 25 C120 23 123 21 128 21 C136 21 145 19 151 12 C157 5 156 2 152 5 C147 9 142 20 146 23 C150 26 158 18 164 16 C169 15 170 18 166 21 C161 25 158 23 160 20 C162 17 169 16 172 17 C170 20 169 23 174 21 C178 19 181 15 186 15 C191 15 188 21 184 22 C180 23 179 20 182 18 C185 16 189 16 191 17 C188 24 186 31 180 34 C176 36 173 33 177 29 C182 24 191 23 196 19 C202 15 204 17 201 20 C198 23 195 22 196 20 C198 17 204 16 207 17 C205 21 207 23 214 19 C220 15 222 14 228 14'},
  {weight:.94,path:'M126 14 C133 11 142 12 149 11 M197 26 C207 25 219 21 233 21'},
 ];
 page.pushOperators(pushGraphicsState(),setLineJoin(LineJoinStyle.Round));
 for(const stroke of signatureStrokes){
  page.drawSvgPath(stroke.path,{x:523,y:100,scale:.79,borderColor:blueInk,borderWidth:stroke.weight,borderLineCap:LineCapStyle.Round});
 }
 page.pushOperators(popGraphicsState());
 line(507,717,68,.6,gold);
 t('Adrian Flaga',612,49,9,display,navy);
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
