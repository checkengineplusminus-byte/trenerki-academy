import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {arithmeticMistakes,draftGuidance} from '../src/accounting/homework-feedback.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Wrong math in homework gets a clear, immediate correction',()=>{
 const d=draftGuidance('2+2=7');
 assert.equal(d.kind,'math_error');
 assert.equal(d.blocksSubmit,true);
 assert.match(d.message,/wynik to 4, nie 7/);
 assert.equal(arithmeticMistakes('2+2=4').length,0);
 assert.equal(arithmeticMistakes('5*6=29').length,1);
 assert.equal(arithmeticMistakes('2,5+1,5=4').length,0);
 assert.equal(arithmeticMistakes('15/3=5').length,0);
 assert.equal(arithmeticMistakes('10/3=3,33').length,0);
});
test('Short or empty drafts are explained, not called wrong exam answers',()=>{
 assert.equal(draftGuidance('').kind,'empty');
 const short=draftGuidance('Moja próba: najpierw sprawdzam NIP i dane nabywcy.');
 assert.equal(short.kind,'short');
 assert.ok(short.remaining>0);
 const valid=draftGuidance('Sprawdziłem osobno dane JDG i spółki, dokumenty, właściwy rejestr i osobę reprezentującą. Przygotowałem dwie teczki i zapisałem, które faktury dotyczą każdego podmiotu. Przed wpisem do ksiąg potwierdzę daty i nabywców.');
 assert.equal(valid.blocksSubmit,false);
 assert.equal(valid.kind,'needs_review');
});
test('Account lesson Anielka does not bypass server grading or saved-version authority',()=>{
 const screen=read('app/temat-ksiegowosci.tsx');
 const backend=read('supabase/functions/ta-accounting-lesson-coach/index.ts');
 for(const text of ["askAnielka('hint')","askAnielka('review')","draftGuidance(homeworkText)","ta-accounting-lesson-coach","coachMessage?.mode==='review'","saveHomework(true)"])
  assert.ok(screen.includes(text),'Missing learner interaction: '+text);
 assert.ok(screen.includes("const nextReady=sectionProgress?.passed===true&&hasHomework;"));
 assert.ok(screen.includes("supabase.rpc('ta_accounting_core_homework_save'"));
 assert.ok(screen.includes("p_expected_version:homeworkVersion(homework)"));
 assert.ok(backend.includes("client.rpc('ta_accounting_overview')"));
 assert.ok(backend.includes("auth.getUser(token)"));
 assert.ok(backend.includes(".eq('topic_no',topic)"));
 assert.ok(backend.includes("store:false"));
 assert.ok(!screen.includes('SUPABASE_SERVICE_ROLE_KEY'));
 assert.ok(!screen.includes('OPENAI_API_KEY'));
 assert.ok(!backend.includes("from('ta_certificates')"));
});
test('Feedback button remains usable even if the work is shorter than 120 characters',()=>{
 const screen=read('app/temat-ksiegowosci.tsx');
 assert.match(screen,/onPress=\{\(\)=>void askAnielka\('review'\)\}/);
 assert.match(screen,/onPress=\{\(\)=>void askAnielka\('hint'\)\}/);
 assert.match(screen,/homeworkCanSubmit\(homeworkText\)/);
 assert.match(screen,/draftCheck\.blocksSubmit/);
 assert.match(screen,/currentCoachMessage\.reply/);
});
