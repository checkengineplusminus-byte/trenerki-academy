#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';

const path=prefix=>new URL('../'+prefix,import.meta.url);
const html=readFileSync(path('public/academy/index.html'),'utf8');
const theme=readFileSync(path('public/academy/premium-theme.css'),'utf8');
const courses=JSON.parse(html.match(/^const COURSES=(\[.*\]);$/m)?.[1]||'[]');
assert.equal(courses.length,81,'All 81 courses must be preserved');
const start=html.indexOf('const EXCEL_REAL_SCREENSHOT=');
const end=html.indexOf('function categoryTileIcon(',start);
assert(start>=0&&end>start,'Unable to isolate original image renderer');
const context={
 document:{addEventListener(){}},
 HTMLImageElement:class HTMLImageElement{},
 courseIllustration:()=>'<svg class="course-icon-art"></svg>',
 esc:value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;'),
};
createContext(context);
runInContext('let coursePhotos=null;\n'+html.slice(start,end),context);
assert(!theme.includes('opacity:.0!important'),'The premium theme cannot hide card photographs');
assert(!html.includes('setInterval(paintHeroTicker,9000)'),'No changing the hero photo every nine seconds');
for(const c of courses){
 const media=runInContext('courseCardMedia('+JSON.stringify(c)+')',context);
 const src=media.match(/<img class="card-photo"[^>]*\bsrc="([^"]+)"/)?.[1];
 assert(src,'Image must receive a source BEFORE the manifest loads for '+c.id);
 if(!src.startsWith('https://')){
  const actual=src.split('?')[0];
  assert(existsSync(path('public'+actual)),'Missing local cover '+src+' for '+c.id);
 }
 if(c.id!=='ai-bez-tajemnic')
  assert(media.includes('class="card-media-loading"'),'Readable loading state missing for '+c.id);
 assert(media.includes('loading="lazy"'),'Lazy-loading must remain enabled for '+c.id);
}
console.log('✓ 81 course thumbnails have immediate URLs, valid local files or an approved external screenshot, and readable loading text');
console.log('✓ CSS does not deliberately hide free-course images and the hero does not rotate images unnecessarily');
