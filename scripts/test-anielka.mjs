#!/usr/bin/env node
// Anielka main navigation search: immediate results, no forced unrelated "bonuses".
import {readFileSync} from 'node:fs';
import {Script,createContext} from 'node:vm';
import assert from 'node:assert/strict';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const text=read('public/academy/index.html');
const start=text.indexOf('const COURSES=')+'const COURSES='.length,end=text.indexOf('];',start)+1;
const COURSES=JSON.parse(text.slice(start,end));
assert.equal(COURSES.length,80);
assert.equal(new Set(COURSES.map(c=>c.cat)).size,6);
assert.equal(COURSES.find(c=>c.id==='ciesla-przygotowanie-czeladnicze').outline.length,63);
assert(text.includes('id="anielka-question"'),'Primary Anielka navigation input is required');
assert(text.includes('id="anielka-peek"'),'Inline search suggestions required');
assert(!text.includes('id="anielka-form"'),'Secondary search form must be absent');
assert(!text.includes('id="course-search"'),'Duplicate search input must be absent');
assert(!text.includes('anielka-examples'),'Hardcoded example chips must be absent');
const handlers={};
const ui={out:{innerHTML:'',scrollIntoView(){}},peek:{innerHTML:''},question:{value:''}};
const env={COURSES,document:{addEventListener(name,fn){handlers[name]=fn;},getElementById(id){return id==='anielka-output'?ui.out:id==='anielka-peek'?ui.peek:id==='anielka-question'?ui.question:null;}},window:{},console,searchCourses(q){env.filtered=q}};
createContext(env);
new Script(read('public/academy/anielka-search.js'),{filename:'anielka-search.js'}).runInContext(env);
const cases=[
 ['Chcę zostać cieślą, umieć czytać więźby','ciesla-przygotowanie-czeladnicze'],
 ['Chcę się nauczyć Excela','excel-skroty'],
 ['Jak dobrze mówić po norwesku na budowie?','norweski-na-budowie'],
 ['Chcę robić projekty w AutoCAD','autocad-skroty'],
 ['Jak być lepszym tatą?','lepszy-tata'],
 ['Chcę kupić używany samochód','jak-kupic-samochod'],
 ['Jak robić beczki z drewna','bednarz'],
 ['Chcę bezpiecznie prowadzić pasiekę','pasieka'],
 ['Chcę pracować na programie SAP EWM','sap-ewm-magazyn'],
 ['Chcę nauczyć się niemieckiego na budowie','niemiecki-na-budowie']
];
for(const [q,id] of cases){
 const found=env.window.anielkaFindCourses(q);
 assert.equal(found.primary?.id,id,'Wrong match '+q);
 const proposals=[found.primary,...found.similar,found.bonus].filter(Boolean);
 assert.equal(proposals.length,new Set(proposals.map(c=>c.id)).size,'Duplicate suggestions');
 assert.equal(found.bonus,null,'Never force unrelated bonus courses');
 console.log('✓ '+q+' → '+id);
}
env.window.anielkaShowRecommendations('Chcę uczyć się Excela');
assert(ui.out.innerHTML.includes('excel-skroty'),'Dynamic result should link to Excel');
assert.equal(env.filtered,'Chcę uczyć się Excela');
assert(ui.peek.innerHTML.includes('excel-skroty'),'Instant navigation suggestion missing');
env.window.anielkaShowRecommendations('zzzz qwerty 3198');
assert(!ui.out.innerHTML.includes('data-anielka-course='),'No random offers on unknown question');
env.window.anielkaShowRecommendations('</div><script>alert(1)</script>');
assert(!ui.out.innerHTML.includes('<script>alert(1)</script>'),'Unsafe HTML inserted');
assert(ui.out.innerHTML.includes('Nie będę proponować przypadkowego'),'Unknown intent must produce useful clarification');
assert.equal(typeof handlers.input,'function');
const event={target:{id:'anielka-question',value:'Chcę pracować jako kowal'}};
handlers.input(event);
assert(ui.peek.innerHTML.includes('kowal-tradycja'),'Search should react while typing, with no button');
console.log('✓ One-field Anielka UX, live suggestions, safe HTML and no unrelated sales pressure');
