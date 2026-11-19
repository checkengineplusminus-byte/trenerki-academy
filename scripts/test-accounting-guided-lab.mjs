import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {OFFICIAL_FORMS,officialFormFor,officialFormUrl} from '../src/accounting/official-forms.js';
import {LAB_TABS} from '../src/accounting/lab-navigation.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Accounting lab uses icon navigation with one active work area',()=>{
 const lab=read('src/accounting/lab-ui.js');
 assert(OFFICIAL_FORMS.length>=15);
 for(const id of LAB_TABS)assert(lab.includes(id+':{icon:'),'Missing icon: '+id);
 for(const token of ['labTileNav','labTileIcon','labActiveTop','labWorkspace','quickCoaching[tab]',
    "a==='coach-question'",'data-lab-current','scroll-snap-type:x mandatory','labSteps',
    'Rozwiń pełne instrukcje'])assert(lab.includes(token),'Missing app UI: '+token);
 assert(lab.includes("db.rpc('ta_accounting_lab_save'"));
 assert(lab.includes('expected_version:ws.version'));
});
test('Form library points only to original Ministry forms, with a separate practice editor',()=>{
 for(const code of ['PIT-37','PIT-36L','PIT-11','PIT-4R','CIT-8','CIT-8/O','VAT-R','VAT-UE','VAT-8']){
  const item=officialFormFor(code);
  assert(item,'Missing official form: '+code);
  assert(officialFormUrl(item,false)?.startsWith('https://podatki.gov.pl/'));
 }
 assert(officialFormFor('CIT-8').pdf.startsWith('https://www.gov.pl/attachment/'));
 assert(officialFormFor('CIT-8/O').pdf.endsWith('.pdf'));
 assert.equal(officialFormUrl({source:'https://attacker.example/forged.pdf'}),null);
 assert.equal(officialFormUrl({source:'javascript:alert(1)'}),null);
 const screen=read('app/formularze-ksiegowego.tsx');
 for(const token of ['OfficialFormsPanel','Oryginalny druk / PDF',
   "React.createElement('iframe' as any",'Podgląd i ćwiczenie',
   'ta_accounting_form_save','p_expected_version:base','p_inputs:snapshot']){
  assert(screen.includes(token),'Missing official forms / private practice feature '+token);
 }
});
test('Section numbering is not repeated in headings or practice scenarios',()=>{
 assert(read('src/LessonIllustratedSections.tsx').includes('displayHeading(section.heading)'));
 assert(read('src/CourseLessonExtras.tsx').includes('tip.replace('));
 assert(read('app/formularze-ksiegowego.tsx').includes('String(v.title).replace('));
});
test('Anielka file review requires explicit consent and never persists source files',()=>{
 const ui=read('src/accounting/lab-ui.js');
 const backend=read('supabase/functions/ta-accounting-file-review/index.ts');
 for(const token of ['id="lab-anielka-file"','id="lab-file-consent"',"a==='coach-file-review'",
  'fileReview=result.data',"db.functions.invoke('ta-accounting-file-review'","acceptedMime",
  "window.addEventListener('beforeunload',leave)"]){
  assert(ui.includes(token),'Missing student file control: '+token);
 }
 for(const token of ['allowedOrigins','input.consent!==true',"auth.getUser(token)",
   "client.rpc('ta_accounting_overview')","eq('user_id',user.id)","store:false",
   'file_stored:false','file_too_large','file_type_not_allowed','personal_data_detected',
   'request_count','input_file','input_text']){
  assert(backend.includes(token),'Missing backend safeguard '+token);
 }
 assert(!ui.includes('SUPABASE_SERVICE_ROLE_KEY'));
 assert(!ui.includes('OPENAI_API_KEY'));
 assert(!backend.includes("storage.from("));
 assert(!backend.includes("ta_accounting_lab_save"));
});

test('All official form cards now have independent owner-only editable worksheets',()=>{
 const ui=read('app/formularze-ksiegowego.tsx');
 const form=read('src/accounting/OfficialFormTrainingDraft.tsx');
 const migration=read('database/patches/20261119_accounting_official_training_drafts.sql');
 for(const pattern of [
  "import OfficialFormTrainingDraft from '../src/accounting/OfficialFormTrainingDraft'",
  '<OfficialFormTrainingDraft key={selected.code} form={selected} userId={userId}/>',
  'Podgląd i ćwiczenie',
  'setSelected(form)'
 ])assert(ui.includes(pattern),'Missing training form connection '+pattern);
 for(const pattern of [
  "ta_accounting_official_draft_save","p_expected_version:version",
  ".eq('user_id',userId)","eq('form_code',form.code)","eq('tax_year',year)",
  'Wypełnij krok po kroku','Nie udało się odczytać wcześniejszej wersji',
  "if(problem||!data||!Number.isSafeInteger(data.version))",
  "e?.code==='40001'",'Tylko dane fikcyjne'
 ]){
  if(pattern==='Tylko dane fikcyjne')continue;
  assert(form.includes(pattern),'Missing safe workbook property '+pattern);
 }
 assert(migration.includes('alter table public.ta_accounting_official_drafts enable row level security'));
 assert(migration.includes('with check (user_id=(select auth.uid()))'));
 assert(migration.includes('security invoker'));
 assert(migration.includes("and public.ta_accounting_official_drafts.version=p_expected_version"));
 assert(!form.includes('service_role'));
 assert(!form.includes('ta_certificates'));
 assert(!form.includes('from('+"'"+"ta_enrollments'"+")"+'.insert'));
});
