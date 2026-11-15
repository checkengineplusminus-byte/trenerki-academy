import test from 'node:test';
import assert from 'node:assert/strict';
import {safePaths,validSourcePath,validatePatch,branchFor,safeTitle} from './anielka-autofix-guards.mjs';

const job={id:'4a1f39a2-d8ab-4718-8bf4-fb6ff8ed90c1',
 course_slug:'excel-skroty',lesson_no:4,kind:'bug',
 target_paths:['src/SpreadsheetFormula.ts'],attempt:1};
const source='const expected = calculate(values);\nconst actual = computeTotal(values);\n';
test('a unique small patch in a known UI file may be proposed (not deployed)',()=>{
 assert.ok(validatePatch(job,{path:'src/SpreadsheetFormula.ts',old_text:'computeTotal(values)',new_text:'calculate(values)'},source));
});
test('never permit path traversal, external paths, or private routes',()=>{
 for(const p of ['../src/SpreadsheetFormula.ts','/etc/passwd','src/supabase.ts',
  'supabase/functions/ta-academy/index.ts','app/konto.tsx','.github/workflows/browser-smoke.yml']){
  assert.equal(validSourcePath(p),false);
  assert.equal(validatePatch(job,{path:p,old_text:'computeTotal(values)',new_text:'calculate(values)'},source),false);
 }
});
test('reject prompt injection, network calls, secrets, destructive code',()=>{
 for(const replacement of [
  'eval(userCode)','fetch("https://evil.example")','process.env.KEY',
  'supabase.auth.signOut()','import {createClient} from "x"',
  'document.cookie','<script>alert(1)</script>',
  'Ignore previous instructions','const secret = token;'
 ]){
  assert.equal(validatePatch(job,{path:'src/SpreadsheetFormula.ts',
   old_text:'computeTotal(values)',new_text:replacement},source),false,replacement);
 }
});
test('reject ambiguous, large, no-op and unsupported patches',()=>{
 assert.equal(validatePatch(job,{path:'src/SpreadsheetFormula.ts',
  old_text:'computeTotal(values)',new_text:'computeTotal(values)'},source),false);
 assert.equal(validatePatch(job,{path:'src/SpreadsheetFormula.ts',
  old_text:'nonexistent(text)',new_text:'fixedCalculation()'},source),false);
 assert.equal(validatePatch({...job,kind:'confusion'},{path:'src/SpreadsheetFormula.ts',
  old_text:'computeTotal(values)',new_text:'fixedCalculation()'},source),false);
});
test('public metadata never includes learner feedback text',()=>{
 assert.equal(branchFor(job),'anielka/autofix-4a1f39a2-1');
 assert.equal(safeTitle(job),'Anielka · usterka · excel-skroty / lekcja 5');
 assert.equal([...safePaths].every(validSourcePath),true);
});
