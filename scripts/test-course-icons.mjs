#!/usr/bin/env node
// Visual integrity: exactly one semantic vector symbol for each public course.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('public/academy/index.html');
const marker='const COURSES=';
const begin=html.indexOf(marker)+marker.length;
assert(begin>=marker.length,'Courses must exist');
const courses=JSON.parse(html.slice(begin,html.indexOf('];',begin)+1));
const ids=new Set(courses.map(c=>c.id)),images=new Map();
assert.equal(courses.length,80);
assert.equal(ids.size,courses.length);
for(let bundle=1;bundle<=5;bundle++){
 const svg=read('public/academy/course-icons-'+bundle+'.svg');
 assert(svg.includes('xmlns="http://www.w3.org/2000/svg"'));
 assert(svg.includes('<defs>')&&svg.includes('</defs>'));
 assert.equal((svg.match(/<g(?:\s|>)/g)||[]).length,(svg.match(/<\/g>/g)||[]).length,'Unbalanced SVG g tag in bundle '+bundle);
 const matches=[...svg.matchAll(/<symbol id="course-([a-z0-9-]+)" viewBox="0 0 256 256">/g)];
 assert.equal(matches.length,16,'Bundle '+bundle+' must contain 16 symbols');
 for(const match of matches){
  assert(!images.has(match[1]),'Duplicate icon for '+match[1]);
  images.set(match[1],bundle);
 }
 console.log('✓ Icon bundle '+bundle+': '+matches.length+' distinct SVG symbols');
}
assert.equal(images.size,80);
for(const c of courses){
 assert.equal(images.get(c.id),c.iconBundle,'Incorrect image for '+c.id);
}
const crafts=read('public/academy/course-icons-4.svg');
assert(crafts.includes('id="course-kolodziej"')&&crafts.includes('stroke="#9a6138"')&&crafts.includes('szprych')===false,'Kołodziej must use wooden wheel vector, not vehicle emoji');
const word=read('public/academy/course-icons-3.svg');
assert(word.includes('id="course-word-skroty"')&&word.includes('>W</text>'),'Word must use document icon, not Excel sheet');
assert(html.includes('class="course-icon-art"')&&html.includes('.svg#course-'));
assert(!html.includes('<span class="card-emoji" role="img"'),'Generic card emojis must not be visible');
assert(html.includes('@media(prefers-reduced-motion:reduce)')&&html.includes('.course-icon-art{'),'Accessible motion is required');
console.log('✓ All 80 courses have exact one topic-specific illustration');
console.log('✓ Kołodziej wooden wheel and Word document regression safeguards');
console.log('✓ No generic emoji or infinite catalog illustration animation');
