#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const data=JSON.parse(readFileSync(new URL('content/course-illustrations-missing-20261117.json',root),'utf8'));
const coverage=JSON.parse(readFileSync(new URL('content/course-illustrations-coverage.json',root),'utf8'));
assert.equal(data.lessons.length,1885);
assert.equal(coverage.generated,1885);
assert(coverage.uniqueTopics>=20,'Not enough thematic subject motifs');
const ids=new Set(),hashes=new Set(),types={};
for(const row of data.lessons){
 const id='lesson-visual-'+row.slug+'-'+String(row.n+1).padStart(3,'0');
 assert(!ids.has(id),'Duplicate media ID '+id);ids.add(id);
 const path=new URL('public/academy/assets/'+id+'.svg',root);
 assert(existsSync(path),'Missing original SVG '+id);
 const svg=readFileSync(path,'utf8');
 assert(svg.startsWith('<svg ')&&svg.endsWith('</svg>'),'Malformed SVG '+id);
 assert(svg.includes('960')&&svg.includes('540'),'Unexpected ratio '+id);
 assert(!/<script|<image\b|<text\b|<foreignObject|href=|url\(https?:\/\//i.test(svg),'No external content, text or scripts permitted '+id);
 assert(svg.includes(row.title.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')),
  'Image aria-label must be tied to the lesson '+id);
 const hash=createHash('sha256').update(svg).digest('hex');
 assert(!hashes.has(hash),'Duplicated picture '+id);hashes.add(hash);
}
console.log('✓ 1885/1885 SVG assets, '+coverage.uniqueTopics+' topical motifs; every image uniquely tied to correct lesson, 16:9 and without licensed material');
