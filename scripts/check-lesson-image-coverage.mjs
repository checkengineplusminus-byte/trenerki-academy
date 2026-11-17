#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const target=JSON.parse(readFileSync(new URL('content/course-illustrations-missing-20261117.json',root),'utf8')).lessons;
const fixture=JSON.parse(readFileSync(new URL('content/lesson-original-art-ui-fixture-20261117.json',root),'utf8')).lessons;
assert.equal(target.length,1885);
assert.equal(fixture.length,73);
const keys=new Set();
for(const row of target){
 const key=row.slug+'/'+row.n;
 assert(!keys.has(key), 'Duplicate: '+key);keys.add(key);
 const name='lesson-visual-'+row.slug+'-'+String(row.n+1).padStart(3,'0')+'.svg';
 const file=new URL('public/academy/assets/'+name,root);
 assert(existsSync(file),'Missing '+name);
}
for(const row of fixture){
 assert(keys.has(row.course_slug+'/'+row.lesson_no),'Unknown lesson '+row.course_slug+'/'+row.lesson_no);
 assert.equal(row.material.illustration,'lesson-visual-'+row.course_slug+'-'+String(row.lesson_no+1).padStart(3,'0'));
}
const renderer=readFileSync(new URL('src/LessonIllustratedSections.tsx',root),'utf8');
assert(renderer.includes("const editorialSvg=illustration==='lesson-visual-'+courseSlug+'-'+String(lessonNo+1).padStart(3,'0');"));
assert(renderer.includes('(pastrySvg||editorialSvg)?16/9'));
console.log('✓ 1885 original diagrams, unique source IDs, exact image-to-lesson mapping and 73 first-image fixtures');
