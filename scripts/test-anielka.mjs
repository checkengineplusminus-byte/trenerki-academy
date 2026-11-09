#!/usr/bin/env node
// Regression smoke tests for the public Anielka course finder, no external API.
import {readFileSync} from 'node:fs';
import {Script,createContext} from 'node:vm';
import assert from 'node:assert/strict';
const text=readFileSync(new URL('../public/academy/index.html',import.meta.url),'utf8');
const begin=text.indexOf('const COURSES=');
assert(begin>=0,'Courses must be present in the public HTML');
const start=begin+'const COURSES='.length,end=text.indexOf('];',start)+1;
const COURSES=JSON.parse(text.slice(start,end));
const categories=new Set(COURSES.map(x=>x.cat));
assert.equal(COURSES.length,80,'80 courses, including Ciesla');
assert.equal(categories.size,6,'Exactly six main sections');
assert.equal(COURSES.filter(c=>c.id==='ciesla-przygotowanie-czeladnicze')[0]?.outline?.length,63);
for(const id of ['angielski-na-budowie','norweski-na-budowie','niemiecki-na-budowie','ciesla-przygotowanie-czeladnicze']){
 assert.equal(COURSES.find(c=>c.id===id)?.cat,'Budownictwo',id+' should be in Budownictwo');
}
const ui={out:{innerHTML:'',scrollIntoView(){}},question:{value:''}};
const env={COURSES,document:{addEventListener(){},getElementById(id){return id==='anielka-output'?ui.out:id==='anielka-question'?ui.question:null;}},window:{},console};
createContext(env);
const source=readFileSync(new URL('../public/academy/anielka-search.js',import.meta.url),'utf8');
new Script(source,{filename:'anielka-search.js'}).runInContext(env);
const testCases=[
 ['Chcę zostać cieślą, umieć czytać więźby','ciesla-przygotowanie-czeladnicze'],
 ['Chcę się nauczyć Excela','excel-skroty'],
 ['Jak dobrze mówić po norwesku na budowie?','norweski-na-budowie'],
 ['Chcę robić projekty w AutoCAD','autocad-skroty'],
 ['Jak być lepszym tatą?','lepszy-tata'],
 ['Chcę kupić używany samochód','jak-kupic-samochod']
];
for(const [query,expected] of testCases){
 const r=env.window.anielkaFindCourses(query);
 assert.equal(r.primary?.id,expected,'Wrong match for '+query);
 const ids=[r.primary,...r.similar,r.bonus].filter(Boolean).map(c=>c.id);
 assert.equal(ids.length,new Set(ids).size,'Duplicate recommendation for '+query);
 assert(ids.length>=3,'Should offer other courses too: '+query);
 console.log('✓ '+query+' → '+r.primary.title+' + '+(ids.length-1)+' alternatives');
}
env.window.anielkaShowRecommendations('</div><script>alert(1)</script>');
assert(ui.out.innerHTML.includes('&lt;script&gt;'),'Questions must be HTML-escaped');
assert(!ui.out.innerHTML.includes('<script>alert(1)</script>'),'Unsafe markup inserted');
console.log('✓ Anielka input escaping and mobile-independent DOM integration');
