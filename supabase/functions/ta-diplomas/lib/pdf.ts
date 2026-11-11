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
 // Gold seal: decorative, not an official state seal.
 page.drawCircle({x:128,y:91,size:35,color:rgb(.92,.82,.57),borderWidth:1.6,borderColor:gold});
 page.drawCircle({x:128,y:91,size:27,borderWidth:.8,borderColor:gold});
 page.drawSvgPath('M0 11 L20 20 L40 11 L20 2 Z',{x:108,y:82,color:gold});
 page.drawLine({start:{x:110,y:77},end:{x:146,y:77},thickness:.9,color:gold});
 // Keep the handwritten signature above the rule and the printed name.
 const signature=[
  // Adrian
  'M2 24 C8 20 13 9 19 4 C21 2 22 3 23 6 L27 19 C28 22 29 22 31 20 M9 17 C14 17 20 16 26 16',
  'M30 21 C32 20 33 15 37 15 C41 15 38 21 35 22 C31 23 31 19 34 16 C36 14 38 15 40 15 C42 10 43 4 46 3 C48 2 46 8 44 13 C41 19 40 23 44 21',
  'C47 20 48 16 50 15 C52 13 53 15 52 17 C54 17 55 16 57 16 C55 19 55 23 59 21 C62 20 64 17 65 15 C64 18 62 22 66 22 C68 21 69 19 71 18 M65 11 L65.8 10',
  'M69 20 C72 16 74 14 78 15 C82 16 77 22 74 22 C70 23 70 20 72 17 C74 14 77 14 80 15 C78 19 77 23 81 21 C84 20 86 17 87 15 L86 21 C89 16 92 14 95 15 C98 16 92 22 96 22 C98 21 101 20 103 18',
  // Flaga
  'M112 7 C119 4 132 3 144 4 M129 4 C126 10 124 17 120 24 M120 13 C124 12 131 12 137 12',
  'M127 22 C133 21 136 16 139 11 C142 6 146 3 148 4 C150 6 145 13 140 17 C138 19 138 23 143 21 C146 20 148 16 152 15 C156 14 159 16 157 19 C155 22 151 23 149 21 C147 18 151 14 158 15 C156 19 155 23 160 21',
  'C163 19 166 15 170 15 C174 15 176 17 173 20 C171 23 166 23 165 21 C163 18 167 14 174 15 C172 21 170 27 165 31 C161 34 157 33 158 30 C159 27 163 25 172 22',
  'C177 20 178 16 182 15 C186 14 189 16 187 19 C185 22 181 23 179 21 C177 18 182 14 188 15 C186 19 186 22 191 21 C197 21 202 17 209 17',
 ].join(' ');
 page.drawSvgPath(signature,{x:523,y:100,scale:.85,borderColor:blueInk,borderWidth:1.65});
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
