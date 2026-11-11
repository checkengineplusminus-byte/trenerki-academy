import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import '../public/academy/support-routing.js';

const {route}=globalThis.TrenerkiSupport;
const examples=[
 ['Mam depresję i nie mam z kim porozmawiać','kryzys',false],
 ['Mam myśli samobójcze, mam plan','kryzys',true],
 ['Nie chcę już żyć','kryzys',false],
 ['Mam 15 lat i chcę się zabić','mlodzi',true],
 ['Mąż mnie bije','przemoc',false],
 ['Partner właśnie mnie bije','przemoc',true],
 ['Moje dziecko jest krzywdzone','rodzina',false],
 ['Nie umiem przestać pić','uzaleznienia',false],
 ['Grozi mi eksmisja i nie mam pieniędzy na jedzenie','finanse',false],
 ['Okradziono mnie','przestepstwo',false],
 ['Dziecko nie oddycha',undefined,true],
];
for(const [input,category,urgent] of examples){
 const result=route(input);
 assert(result,input);
 assert.equal(result.categories[0],category,input);
 assert.equal(result.urgent,urgent,input);
 if(urgent)assert.match(result.text,/112/);
}
for(const input of ['Szukam kursu o depresji','depresja','Potrzebuję pomocy z Excelem','Mam pytanie o kurs','Fikcyjna scenka: „chcę się zabić”']){
 assert.equal(route(input),null,input);
}
assert.equal(route('Co mogę zrobić?',route('Partner właśnie mnie bije')).urgent,true);

const root=new URL('../public/academy/',import.meta.url);
const pages=readdirSync(root,{recursive:true}).filter(path=>path.endsWith('.html'));
for(const path of pages){
 const html=readFileSync(new URL(path,root),'utf8');
 if(path==='index.html'){
  assert.match(html,/<header\b[^>]*>.*<div class="nav-actions"><a class="nav-help" href="\/pomoc"[^>]*>.*?<\/a><a class="demo-tag" href="\/konto"/s);
 }else{
  assert.match(html,/<footer\b[^>]*>.*href="\/pomoc"/s,path);
 }
}
assert.match(readFileSync(new URL('../public/sitemap.xml',import.meta.url),'utf8'),/<loc>https:\/\/trenerki\.com\/pomoc<\/loc>/);
console.log(`✓ 11 scenarios, 5 non-crisis queries, contextual follow-up, sitemap and help links on ${pages.length} public pages`);
