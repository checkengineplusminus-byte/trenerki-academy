import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen=readFileSync(new URL('../app/temat-ksiegowosci.tsx',import.meta.url),'utf8');

import {accountingSupplements} from '../src/accounting/topic-supplements.js';

test('Both homework formats retain their instructions and distinct deliverables',()=>{
 const {homework}=accountingSupplements({practice:{homework:[{task:'First task',deliverable:'A table'}]},
   homework:[{task:'First task',deliverable:'A table'},{title:'Compare entries',instructions:['Find the reference','Explain the discrepancy'],expected_output:'Model answer'}]});
 assert.equal(homework.length,2);
 assert.equal(homework[0].deliverable,'A table');
 assert.deepEqual(homework[1].paragraphs,['Find the reference','Explain the discrepancy']);
 assert.equal(homework[1].answer,'Model answer');
 assert.match(screen,/extras\.homework\.map/);
 assert.match(screen,/Dodatkowe polecenia/);
 assert.match(screen,/hasHomework&&!!h\.answer/);
});

test('The reader adds distinct workshops and facts, including incomplete legacy data',()=>{
 const {workshops,facts}=accountingSupplements({examples:[{steps:['Read the invoice']}],
  workshops:[{title:'Already shown',steps:['01. Read the invoice']},{title:'Check totals',steps:['Count the rows'],result:'Two'},{steps:null}],
  sections:[{curiosity:{text:'A known fact.'}}],facts:[{text:'A known fact'},{title:'Note',text:'One new fact.',source_url:'https://example.test/document'},{text:'One new fact'}]});
 assert.equal(workshops.length,1);
 assert.equal(workshops[0].result,'Two');
 assert.deepEqual(facts.map(f=>f.text),['One new fact.']);
 assert.deepEqual(accountingSupplements(null),{workshops:[],homework:[],facts:[]});
});

test('Extra homework lives inside the existing authenticated course reader and uses its submission',()=>{
 const start=screen.indexOf('{m.practice&&<View style={s.practice}>');
 const extra=screen.indexOf('Dodatkowe polecenia');
 const input=screen.indexOf('accessibilityLabel="Rozwiązanie pracy domowej"');
 assert.ok(start>=0&&input>start&&extra>input,'Answer field must be shown immediately before optional expanded instructions');
 assert.match(screen,/saveHomework\(true\)/);
 assert.doesNotMatch(screen,/dangerouslySetInnerHTML/);
});
