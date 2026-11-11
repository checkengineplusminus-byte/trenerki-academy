import { PDFDocument } from 'npm:pdf-lib@1.17.1';
import { buildDiplomaPdf, type Diploma, type DiplomaLanguage } from '../supabase/functions/ta-diplomas/lib/pdf.ts';

function check(ok:unknown,message:string){ if(!ok)throw new Error(message); }
const example:Diploma={
 id:'00000000-0000-4000-8000-000000000001',
 certificate_no:'TRE-00000001',
 holder_name:'Zofia Żółkiewicz-Kowalska',
 title_pl:'Organizacja i koordynacja pracy brygady budowlanej',
 title_en:'Construction Crew Organization and Coordination',
 issued_at:'2026-11-11T08:00:00+01:00',
 is_demo:false
};
Deno.test('TRENERKI A4 PDF generated with Polish and English names', async()=>{
 for(const language of ['pl','en'] as DiplomaLanguage[]){
  const pdf=await buildDiplomaPdf(example,language);
  check(pdf.length>4000,language+' PDF empty');
  const head=new TextDecoder().decode(pdf.slice(0,5));
  check(head==='%PDF-',language+' invalid PDF signature');
  const parsed=await PDFDocument.load(pdf);
  check(parsed.getPageCount()===1,language+' wrong page count');
  const {width,height}=parsed.getPage(0).getSize();
  check(width===842&&height===595,language+' wrong A4 landscape page');
  check((parsed.getTitle()||'').includes('TRE-00000001'),language+' serial metadata missing');
 }
});
Deno.test('long learner and course names do not crash the print renderer',async()=>{
 const long={...example,holder_name:'Aleksandra Małgorzata Żółkiewicz-Kowalska Nowak',
 title_pl:'Zarządzanie strategiczne zespołami podczas zaawansowanych złożonych realizacji budowlanych i logistycznych',
 title_en:'Strategic Team Coordination in Advanced Construction Projects and Complex Logistics Environments'};
 for(const language of ['pl','en'] as DiplomaLanguage[]){
  const pdf=await buildDiplomaPdf(long,language);
  check((await PDFDocument.load(pdf)).getPageCount()===1,'Long '+language+' title rendered on wrong number of pages');
 }
});
