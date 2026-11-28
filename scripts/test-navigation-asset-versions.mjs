#!/usr/bin/env node
// Verify that the exported static HTML references the assets deployed with it.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
const root=resolve(process.cwd(),'public','academy');
const assets=['sitewide-premium.css','academy-course-menu.v1.css','course-share.css','course-share.js','brand-refresh.css','premium-theme.css'];
const versions=Object.fromEntries(assets.map(name=>[name,createHash('sha256').update(readFileSync(join(root,name))).digest('hex').slice(0,12)]));
const css=readFileSync(join(root,'course-share.css'),'utf8');
assert(css.includes('/academy/sitewide-premium.css?v='+versions['sitewide-premium.css']),'CSS import must use current sitewide hash');
assert(css.includes('/academy/academy-course-menu.v1.css?v='+versions['academy-course-menu.v1.css']),'CSS import must use current menu hash');
const manifest=JSON.parse(readFileSync('src/navigationAssets.json','utf8'));
assert.equal(manifest['academy-course-menu.v1.css'],versions['academy-course-menu.v1.css'],'The app and public offers must use the same menu stylesheet');
function* html(dir){
 for(const entry of readdirSync(dir,{withFileTypes:true})){
  const path=join(dir,entry.name);
  if(entry.isDirectory())yield* html(path);
  else if(entry.isFile()&&entry.name.endsWith('.html'))yield path;
 }
}
let pages=0,refs=0;
const pattern=/((?:\bhref|\bsrc)\s*=\s*["'])\/academy\/(sitewide-premium\.css|academy-course-menu\.v1\.css|course-share\.css|course-share\.js|brand-refresh\.css|premium-theme\.css)(?:\?([^"']*))?(["'])/g;
for(const path of html(root)){
 pages++;
 const source=readFileSync(path,'utf8');
 for(const hit of source.matchAll(pattern)){
  refs++;
  assert.equal(hit[3],'v='+versions[hit[2]],'Outdated '+hit[2]+' in '+path);
 }
}
assert(pages>=90&&refs>=160,'Every public course and category must use versioned shared assets');
console.log('✓ '+refs+' fresh public asset links in '+pages+' academy HTML pages');
