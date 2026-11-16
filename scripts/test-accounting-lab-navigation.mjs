import test from 'node:test';
import assert from 'node:assert/strict';
import {LAB_TABS,LAB_TAB_NAMES,normalizeLabTab,recommendedLabTab} from '../src/accounting/lab-navigation.js';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Dokładnie 10 istniejących modułów i bezpieczna normalizacja z URL',()=>{
 assert.equal(LAB_TABS.length,10);
 assert.equal(new Set(LAB_TABS).size,10);
 assert.deepEqual(Object.keys(LAB_TAB_NAMES).sort(),[...LAB_TABS].sort());
 for(const value of ['__proto__','constructor','<script>','history;delete','',null,42,[],{}])assert.equal(normalizeLabTab(value),'start');
 for(const tab of LAB_TABS)assert.equal(normalizeLabTab(tab),tab);
});
test('Każdy z 100 tematów trafia do istniejącego modułu',()=>{
 for(let t=1;t<=100;t++)assert(LAB_TABS.includes(recommendedLabTab(t)));
 for(const [t,tab] of [[1,'start'],[3,'report'],[5,'journal'],[11,'invoices'],
  [19,'bank'],[20,'matches'],[24,'invoices'],[25,'report'],[39,'bank'],
  [42,'personnel'],[44,'payroll'],[47,'personnel'],[52,'report'],
  [71,'invoices'],[79,'report'],[81,'bank'],[86,'bank'],[87,'matches'],
  [91,'report'],[96,'simulator'],[99,'simulator'],[100,'report']]){
  assert.equal(recommendedLabTab(t),tab,'Temat '+t);
 }
});
test('Praktyka po kliknięciu zachowuje RLS i nie udaje automatycznego zaliczenia',()=>{
 const topic=file('app/temat-ksiegowosci.tsx');
 const lab=file('src/accounting/lab-ui.js');
 const page=file('app/biuro-ksiegowe.web.tsx');
 assert(topic.includes('recommendedLabTab(topic)'));
 assert(topic.includes("pathname:'/biuro-ksiegowe'"));
 assert(lab.includes("export function mountLab(root,db,initialTab='start')"));
 assert(lab.includes("tab=normalizeLabTab(initialTab)"));
 assert(page.includes('normalizeLabTab'));
 assert(lab.includes("rpc('ta_accounting_lab_save'"));
 assert(!topic.includes("from('ta_certificates').insert"));
});
