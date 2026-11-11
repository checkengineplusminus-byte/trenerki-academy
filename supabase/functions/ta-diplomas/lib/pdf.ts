import { PDFDocument, rgb, type PDFFont } from 'npm:pdf-lib@1.17.1';
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
 .replace(/^Ukończenie (?:prywatnego )?(?:kursu|programu)\s*:\s*/i,'')
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
 // Small academic emblem and restrained laurels.
 page.drawSvgPath('M0 16 L23 27 L46 16 L23 5 Z',{x:398,y:501,color:navy});
 page.drawSvgPath('M12 7 L12 -1 Q23 -8 34 -1 L34 7',{x:398,y:501,borderColor:navy,borderWidth:1.5});
 page.drawLine({start:{x:446,y:520},end:{x:446,y:495},thickness:1,color:gold});
 line(293,373,516,.65,lightGold);line(468,549,516,.65,lightGold);
 t('T R E N E R K I',center,476,19,display,navy);
 t('A  C  A  D  E  M  Y',center,457,8,body,gold);
 t(terms.heading,center,385,34,display,navy);
 line(309,394,367,.75,gold);line(448,533,367,.75,gold);
 page.drawSvgPath('M0 5 L5 10 L10 5 L5 0 Z',{x:416,y:362,color:gold});
 t(terms.lead,center,333,13,display,navy);
 fit(d.holder_name?.normalize('NFC')?.trim()||'—',281,29,672,2,display);
 line(204,638,267,.5,lightGold);
 t(terms.complete,center,238,12,body,muted);
 fit(cleanTitle(d,language),205,21,660,2,display);
 line(230,612,145,.65,lightGold);
 const date=new Intl.DateTimeFormat(language==='pl'?'pl-PL':'en-GB',
  {day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Warsaw'}).format(stamp);
 // Date and serial are kept visible even if the course title wraps.
 t(terms.date,274,124,8,body,muted);
 t(date,274,106,11.5,display,navy);
 t(terms.number,572,124,8,body,muted);
 t(d.certificate_no,572,106,11.5,display,navy);
 // Gold seal: decorative, not an official state seal.
 page.drawCircle({x:128,y:91,size:35,color:rgb(.92,.82,.57),borderWidth:1.6,borderColor:gold});
 page.drawCircle({x:128,y:91,size:27,borderWidth:.8,borderColor:gold});
 page.drawSvgPath('M0 11 L20 20 L40 11 L20 2 Z',{x:108,y:82,color:gold});
 page.drawLine({start:{x:110,y:77},end:{x:146,y:77},thickness:.9,color:gold});
 // A modest original stylized signature, anchored above the founder label.
 const signature='M0 4 C10 27 13 20 19 3 M5 13 C18 16 29 16 39 16 M25 6 C37 14 36 9 44 14 C50 18 48 6 53 10 C62 18 67 4 73 10 C79 15 83 8 87 9 C93 17 98 8 104 7 M106 5 C113 24 119 25 121 4 M112 13 C123 19 130 11 135 12 C144 22 143 6 150 9 C158 15 162 6 168 10 C176 17 184 7 190 8 M184 4 C198 9 202 7 211 5';
 page.drawSvgPath(signature,{x:523,y:64,scale:.85,borderColor:blueInk,borderWidth:1.65});
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
