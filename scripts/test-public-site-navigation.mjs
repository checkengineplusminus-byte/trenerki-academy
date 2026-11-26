#!/usr/bin/env node
// Source gate: every non-redirect public page loads exactly one shared nav.
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
const root=resolve('public/academy');
function* html(dir){
 for(const entry of readdirSync(dir,{withFileTypes:true})){
  const path=join(dir,entry.name);
  if(entry.isDirectory())yield* html(path);
  else if(entry.isFile()&&entry.name.endsWith('.html'))yield path;
 }
}
const excluded=new Set(['index.html','kursy/zaufany-wolontariusz-nauka.html']);
let pages=0,covered=0;
for(const path of html(root)){
 pages++;
 const rel=relative(root,path).replaceAll('\\','/');
 if(excluded.has(rel))continue;
 const s=readFileSync(path,'utf8');
 for(const ext of ['js','css']){
  const asset='/academy/course-share.'+ext;
  assert(s.includes(asset),rel+' missing shared navigation '+ext);
  assert.equal(s.split(asset).length-1,1,rel+' loads navigation '+ext+' multiple times');
 }
 covered++;
}
assert(pages>=100&&covered>=98,'Expected all standalone academy pages, not just featured courses');
const js=readFileSync(join(root,'course-share.js'),'utf8');
const css=readFileSync(join(root,'course-share.css'),'utf8');
for(const route of ['/academy/index.html#kursy','/firma','/moje-kursy','/konto','/pomoc'])
 assert(js.includes(route),'Missing shared route: '+route);
assert(js.includes('ta-unified-menu')&&js.includes("event.key==='Escape'"),'Accessible mobile dropdown missing');
assert(css.includes('body.ta-shell-active > header:not(.ta-unified-header)'),'Duplicate legacy headers must be hidden');
assert(css.includes('@media(max-width:940px)'),'Mobile/tablet breakpoint missing');
const app=readFileSync(resolve('app/_layout.tsx'),'utf8');
assert(app.includes('function SiteAccountHeader'),'Expo header missing');
assert(app.includes('<SiteAccountHeader signedIn={signedIn}/>'),'Expo account pages missing header');
assert(app.includes('function HelpHeader()'),'Help screen must read an authenticated session');
assert(app.includes('<HelpHeader/>'),'Help page must use session-aware navigation');
assert(!app.includes('<SiteAccountHeader signedIn={false}/>'),'Help must not always show sign-in to logged-in learners');
console.log('✓ '+covered+'/'+pages+' public pages share the same navigation; catalogue and learning redirect are intentional exceptions');
console.log('✓ Public/mobile links, preserved single header, Expo account navigation verified');
