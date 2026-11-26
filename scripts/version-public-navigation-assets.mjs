#!/usr/bin/env node
// Stamp shared public navigation assets with their actual file contents during
// web export. This avoids stale Safari cache after a menu or design release.
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';

const root=resolve(process.cwd(),'public','academy');
const assets=['sitewide-premium.css','course-share.css','course-share.js','brand-refresh.css','premium-theme.css'];
const hash=name=>createHash('sha256').update(readFileSync(join(root,name))).digest('hex').slice(0,12);

// course-share imports sitewide rules. Version that dependency first, so a
// sitewide change also changes the fingerprint of course-share.css.
const sharedPath=join(root,'course-share.css');
const originalShared=readFileSync(sharedPath,'utf8');
const sitewideHash=hash('sitewide-premium.css');
const imported=originalShared.replace(/(@import\s+url\(\s*["']?\/academy\/sitewide-premium\.css)(?:\?v=[^"'()]+)?(["']?\s*\))/g,
 (_,start,end)=>start+'?v='+sitewideHash+end);
if(imported===originalShared&&!originalShared.includes('sitewide-premium.css?v='+sitewideHash)){
 throw new Error('The shared sitewide CSS import was not found');
}
if(imported!==originalShared)writeFileSync(sharedPath,imported);
const versions=Object.fromEntries(assets.map(name=>[name,hash(name)]));
const assetRefs=/((?:\bhref|\bsrc)\s*=\s*["'])\/academy\/(sitewide-premium\.css|course-share\.css|course-share\.js|brand-refresh\.css|premium-theme\.css)(?:\?[^"']*)?(["'])/g;

function* htmlFiles(dir){
 for(const item of readdirSync(dir,{withFileTypes:true})){
  const path=join(dir,item.name);
  if(item.isDirectory())yield* htmlFiles(path);
  else if(item.isFile()&&item.name.endsWith('.html'))yield path;
 }
}
let scanned=0,referenced=0,updated=0;
for(const path of htmlFiles(root)){
 scanned++;
 const original=readFileSync(path,'utf8');
 const result=original.replace(assetRefs,(_,start,name,end)=>{
  referenced++;
  return start+'/academy/'+name+'?v='+versions[name]+end;
 });
 if(result!==original){writeFileSync(path,result);updated++;}
}
if(scanned<90||referenced<160)throw new Error('Insufficient public navigation coverage: '+scanned+' pages, '+referenced+' assets');
console.log('Navigation assets versioned: '+referenced+' references in '+scanned+' public pages ('+updated+' updated).');
