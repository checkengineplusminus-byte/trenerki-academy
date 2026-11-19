import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {OFFICIAL_FORMS,officialFormFor,officialFormUrl} from '../src/accounting/official-forms.js';
import {LAB_TABS} from '../src/accounting/lab-navigation.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('App-like accounting lab has one selected work area and consistent icon navigation',()=>{
 const lab=read('src/accounting/lab-ui.js');
 assert.equal(Object.keys(OFFICIAL_FORMS).length>10,true);
 for(const id of LAB_TABS){
  assert.match(lab,new RegExp(id+":\\{icon:"));
 }
 assert.match(lab,/labTileNav/);
 assert.match(lab,/labTileIcon/);
 assert.match(lab,/labActiveTop/);
 assert.match(lab,/labWorkspace/);
 assert.match(lab,/quickCoaching\\[tab\\]/);
 assert.match(lab,/a==='coach-question'/);
 assert.match(lab,/data-lab-current/);
 assert.match(lab,/scroll-snap-type:x mandatory/);
 assert.match(lab,/labSteps/);
 assert.match(lab,/<details class="card"><summary>📚 Rozwiń pełne instrukcje/);
 assert.ok(lab.includes("db.rpc('ta_accounting_lab_save'"),'Original CAS save must remain');
 assert.ok(lab.includes("expected_version:ws.version"),'Must retain optimistic lock');
});
test('Ministry originals remain authentic PDF/download links, not rewritten as tax returns',()=>{
 const list=['PIT-37','PIT-36L','PIT-11','PIT-4R','CIT-8','CIT-8/O','VAT-R','VAT-UE','VAT-8'];
 for(const code of list){
  const f=officialFormFor(code);
  assert(f,'Missing popular official form '+code);
  assert(officialFormUrl(f,false)?.startsWith('https://podatki.gov.pl/'));
 }
 assert(officialFormFor('CIT-8').pdf.startsWith('https://www.gov.pl/attachment/'));
 assert(officialFormFor('CIT-8/O').pdf.endsWith('.pdf'));
 assert.equal(officialFormUrl({source:'https://attacker.example/forged.pdf'}),null);
 assert.equal(officialFormUrl({source:'javascript:alert(1)'}),null);
 const screen=read('app/formularze-ksiegowego.tsx');
 assert.match(screen,/OfficialFormsPanel/);
 assert.match(screen,/Otwórz oryginał na stronie MF/);
 assert.match(screen,/React.createElement\\('iframe' as any/);
 assert.match(screen,/Ćwicz w Trenerki/);
 assert.match(screen,/ta_accounting_form_save/);
 assert.match(screen,/p_expected_version:base/);
 assert.match(screen,/p_inputs:snapshot/);
});
test('Form fields and lesson steps do not duplicate numbered headings',()=>{
 const lesson=read('src/LessonIllustratedSections.tsx');
 const extras=read('src/CourseLessonExtras.tsx');
 const forms=read('app/formularze-ksiegowego.tsx');
 assert.match(lesson,/displayHeading\\(section.heading\\)/);
 assert.match(lesson,/replace\\(/);
 assert.match(extras,/tip\\.replace\\(/);
 assert.match(forms,/String\\(v.title\\)\\.replace\\(/);
});
test('Anielka can review PDF/CSV/TXT/XLSX voluntarily without server file storage',()=>{
 const ui=read('src/accounting/lab-ui.js'),edge=read('supabase/functions/ta-accounting-file-review/index.ts');
 for(const check of [
  'id="lab-anielka-file"','id="lab-file-consent"',"a==='coach-file-review'","fileReview=result.data",
  "db.functions.invoke('ta-accounting-file-review'","acceptedMime","window.addEventListener('beforeunload',leave)"
 ])assert(ui.includes(check),'Missing UI safety detail '+check);
 for(const check of [
  'allowedOrigins','input.consent!==true',"auth.getUser(token)","client.rpc('ta_accounting_overview')",
  "eq('user_id',user.id)","verify","store:false","file_stored:false","file_too_large",
  "file_type_not_allowed","personal_data_detected","request_count","input_file","input_text"
 ])if(check==='verify')continue;else assert(edge.includes(check),'Missing backend control '+check);
 assert(!ui.includes('SUPABASE_SERVICE_ROLE_KEY'));
 assert(!ui.includes('OPENAI_API_KEY'));
 assert(!edge.includes("storage.from("));
 assert(!edge.includes("ta_accounting_lab_save"));
});
