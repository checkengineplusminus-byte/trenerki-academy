#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
const root=process.argv[2]||'public';
const main=readFileSync(join(root,'academy/index.html'),'utf8');
const courses=JSON.parse(main.slice(main.indexOf('const COURSES=')+14,main.indexOf('];',main.indexOf('const COURSES='))+1));
assert.equal(courses.length,80);
const xml=readFileSync(join(root,'sitemap.xml'),'utf8');
const seen=new Set();
const escapeText=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const entries=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
assert(entries.length>=87,'Sitemap must include all courses and categories');
for(const u of entries){assert(!seen.has(u),'Duplicate sitemap URL '+u);seen.add(u)}
for(const c of courses){
 const path='academy/kursy/'+c.id+'.html';
 assert(existsSync(join(root,path)),'Missing SEO page: '+path);
 const html=readFileSync(join(root,path),'utf8');
 assert(html.includes('<html lang="pl"')&&html.includes('<h1>'),'Polish HTML/h1 missing '+c.id);
 assert(html.includes('<link rel="canonical" href="https://trenerki.com/'+path+'">'),'Bad canonical '+c.id);
 assert(html.includes('application/ld+json'),'Missing Course schema '+c.id);
 assert(seen.has('https://trenerki.com/'+path),'Not in sitemap '+c.id);
 assert(!html.includes('material_json')&&!html.includes('answer_key'),'Private learning data exposed '+c.id);
 const program=html.match(/<ol class="program">([\s\S]*?)<\/ol>/)?.[1]??'';
 assert.deepEqual([...program.matchAll(/<li>([^<]*)<\/li>/g)].map(match=>match[1].replaceAll('&#x27;',"'").replaceAll('&quot;','"')),
  c.outline.map(escapeText),'Public course program differs from the catalogue: '+c.id);
}
for(const slug of ['budownictwo','rzemioslo-i-hobby','technologie-i-logistyka','biznes-i-praca','rodzina-i-rozwoj','dom-i-codziennosc']){
 const p='academy/kategorie/'+slug+'.html';
 assert(existsSync(join(root,p))&&seen.has('https://trenerki.com/'+p),'Missing category '+p);
 const body=readFileSync(join(root,p),'utf8');
 assert(body.includes('ItemList')&&body.includes('<h1>'),'Bad category SEO '+p);
}
assert(!main.includes('class="catalog-more"'),'More buttons should not remain');
console.log('✓ 80 public SEO course pages, 6 category pages, Polish metadata, unique URLs and sitemap verified');

// Inspect the export, not only source JSX: metadata must precede hydration.
if(root!=='public'){
 for(const route of ['index.html','prezent.html','pomoc.html']){
  const html=readFileSync(join(root,route),'utf8');
  assert(/<html[^>]*lang="pl"/.test(html),'Wrong document language '+route);
  assert(/<title>[^<]+<\/title>/.test(html),'Missing initial title '+route);
  assert(/<meta[^>]*name="description"[^>]*content="[^"]+"/.test(html),'Missing initial description '+route);
 }
 console.log('✓ Entry, gifts and support include Polish language and metadata before JavaScript');
}
