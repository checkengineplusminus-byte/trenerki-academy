#!/usr/bin/env node
// Every training card must use a genuinely distinct and meaningful illustration.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('public/academy/index.html');
const marker='const COURSES=';
const start=html.indexOf(marker)+marker.length;
assert(start>=marker.length,'Course catalog missing');
const courses=JSON.parse(html.slice(start,html.indexOf('];',start)+1));
assert.equal(courses.length,80,'Expected complete 80-course catalog');
assert.equal(new Set(courses.map(c=>c.id)).size,80,'Course IDs must be unique');
const ids=new Map(),bodies=new Map(),fingerprints=new Map();
for(let n=1;n<=5;n++){
 const raw=read('public/academy/course-icons-'+n+'.svg');
 assert(raw.includes('xmlns="http://www.w3.org/2000/svg"'),'Broken SVG namespace');
 assert(raw.includes('<defs>')&&raw.includes('</defs>'),'Sprite definitions missing');
 assert.equal((raw.match(/<g(?:\s|>)/g)||[]).length,(raw.match(/<\/g>/g)||[]).length,'Unbalanced SVG grouping in sprite '+n);
 const sprites=[...raw.matchAll(/<symbol id="course-([a-z0-9-]+)" viewBox="0 0 256 256">([\s\S]*?)<\/symbol>/g)];
 assert.equal(sprites.length,16,'Expected 16 illustrations in sprite '+n);
 for(const m of sprites){
  const slug=m[1],drawing=m[2];
  assert(!ids.has(slug),'Duplicate illustration ID '+slug);
  ids.set(slug,n);
  bodies.set(slug,drawing);
  const visual=drawing
   .replace(/<title>[\s\S]*?<\/title>/g,'')
   .replace(/<rect x="19" y="220"[\s\S]*?<\/text>/g,'')
   .replace(/<text[^>]*>[^<]*<\/text>/g,'');
  assert(!fingerprints.has(visual),'Same picture reused under different captions: '+fingerprints.get(visual)+' and '+slug);
  fingerprints.set(visual,slug);
 }
 console.log('✓ SVG set '+n+': 16 distinct illustrations');
}
assert.equal(ids.size,80,'80 unique illustration IDs required');
assert.equal(fingerprints.size,80,'80 distinct visual artworks required');
for(const c of courses)assert.equal(ids.get(c.id),c.iconBundle,'Missing/wrong icon for '+c.id);
const examples={
 'excel-skroty':'EXCEL','autocad-skroty':'RYSUNEK CAD','bdo':'ODPADY',
 'lepszy-cukiernik':'WYPIEKI','lepszy-kucharz':'KUCHNIA',
 'angielski-na-budowie':'ENGLISH','norweski-na-budowie':'NORSK',
 'niemiecki-na-budowie':'DEUTSCH','sap-ewm-magazyn':'SAP EWM',
 'blue-yonder-wms':'AUTOMATYKA','oracle-wms-cloud':'WMS CLOUD'
};
for(const [id,label] of Object.entries(examples)){
 assert(bodies.get(id).includes(label),'Missing subject cue for '+id);
}
assert(bodies.get('kolodziej').includes('stroke="#9a6138"'),'Wheelwright must show a wooden wheel');
assert(bodies.get('word-skroty').includes('>W</text>'),'Word must show a document icon');
assert(!html.includes('<span class="card-emoji" role="img"'),'Generic emoji cards must be absent');
assert(html.includes('class="course-icon-art"')&&html.includes('.svg#course-'));
assert(html.includes('@media(prefers-reduced-motion:reduce)'),'Reduced-motion support required');
console.log('✓ 80 course cards, 80 visually distinct drawings, 0 repeated marketing-only variants');
console.log('✓ Profession, software and construction-language semantic safeguards');
console.log('✓ No generic emoji cards; accessible motion controls preserved');
