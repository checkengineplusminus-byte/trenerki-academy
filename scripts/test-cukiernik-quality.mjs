#!/usr/bin/env node
// Independent source-level course quality gate; never changes course or user data.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const all=JSON.parse(read('content/cukiernik-pro-20261117.json'));
assert.equal(all.course_slug,'lepszy-cukiernik');
assert.equal(all.lessons.length,50);
assert.deepEqual(all.lessons.map(l=>l.lesson_no),Array.from({length:50},(_,i)=>i));
assert.equal(new Set(all.lessons.map(l=>l.title_pl)).size,50);
assert.equal(new Set(all.lessons.map(l=>l.material.curiosity)).size,50);
const lessonTitles=all.lessons.map(l=>l.title_pl);
for(const lesson of all.lessons){
 const m=lesson.material,i=lesson.lesson_no;
 assert.equal(m.pastry_revision,'2026-11-17-pro-v1', 'revision '+i);
 assert(m.sections.length>=7, 'not enough teaching sections '+i);
 assert(m.sections.some(x=>/histori/i.test(x.heading)), 'missing history '+i);
 assert(m.sections.some(x=>/zadanie domowe/i.test(x.heading)), 'missing homework section '+i);
 assert(m.sections.some(x=>/ratowa|błęd|nie tak|pogotowie/i.test(x.heading)), 'missing error recovery '+i);
 assert(m.curiosity.length>60, 'missing contextual curiosity '+i);
 assert(m.homework?.instructions?.length>60, 'missing real homework '+i);
 assert(m.learning?.options?.length>=3,'missing quiz '+i);
 assert(Number.isInteger(m.learning?.correct) && m.learning.correct>=0 && m.learning.correct<m.learning.options.length,'invalid quiz answer '+i);
 assert.equal(new Set(m.learning.options).size,m.learning.options.length,'duplicate choices '+i);
 assert(m.sections.every(s=>s.heading?.trim() && s.text?.length>60),'empty teaching explanation '+i);
 const picture='public/academy/assets/'+m.illustration+'.svg';
 assert.equal(m.illustration,'cukiernik-ilustracja-'+String(i+1).padStart(2,'0'),'image mapping '+i);
 assert(existsSync(new URL(picture,root)), 'missing image '+i);
 const art=read(picture);
 assert(art.startsWith('<svg ')&&art.endsWith('</svg>'),'invalid SVG wrapper '+i);
 assert(!/<text\b|<image\b|https?:\/\//.test(art.replace('http://www.w3.org/2000/svg','')),'image must be original and captionless '+i);
}
const catalog=read('public/academy/index.html'),seo=read('public/academy/kursy/lepszy-cukiernik.html');
function entry(id,course=false){
 const key=course?'"id":"'+id+'",':'"'+id+'":{',pos=catalog.indexOf(key);
 assert(pos>=0,'entry missing '+id);
 const start=course?catalog.lastIndexOf('{',pos):pos+key.length-1;
 let quote=false,escaped=false,depth=0;
 for(let i=start;i<catalog.length;i++){
  const c=catalog[i];
  if(quote){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quote=false;continue}
  if(c==='"'){quote=true;continue}
  if(c==='{')depth++;
  if(c==='}'&&--depth===0)return JSON.parse(catalog.slice(start,i+1));
 }
 throw new Error('unclosed entry');
}
assert.deepEqual(entry('lepszy-cukiernik',true).outline,lessonTitles);
assert.deepEqual(entry('lepszy-cukiernik').module_titles,lessonTitles);
assert.equal((seo.match(/<ol class="program">([\s\S]*?)<\/ol>/)?.[1].match(/<li>/g)||[]).length,50);
assert(seo.includes('50 lekcji'));
assert(read('src/LessonIllustratedSections.tsx').includes('pastrySvg'));
console.log('✓ CUCIERNIK: 50 lessons, 50 unique original SVGs, 50 homework tasks, 50 histories, correct quizzes, 50 catalog entries');
