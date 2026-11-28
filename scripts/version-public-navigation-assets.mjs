#!/usr/bin/env node
// Stamp shared public navigation assets with their actual file contents during
// web export. This avoids stale Safari cache after a menu or design release.
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';

const root=resolve(process.cwd(),'public','academy');
const {academyMenuMarkup,courseRelease,courseReleaseMarkup,courseReleaseSummaryMarkup}=createRequire(import.meta.url)('../public/academy/course-share.js');
const assets=['sitewide-premium.css','academy-course-menu.v1.css','course-share.css','course-share.js','brand-refresh.css','premium-theme.css'];
const hash=name=>createHash('sha256').update(readFileSync(join(root,name))).digest('hex').slice(0,12);

// course-share imports sitewide rules. Version that dependency first, so a
// sitewide change also changes the fingerprint of course-share.css.
const sharedPath=join(root,'course-share.css');
const originalShared=readFileSync(sharedPath,'utf8');
let imported=originalShared;
for(const name of ['sitewide-premium.css','academy-course-menu.v1.css']){
 const dependencyHash=hash(name),escaped=name.replaceAll('.','\\.');
 const pattern=new RegExp('(@import\\s+url\\(\\s*["\']?/academy/'+escaped+')(?:\\?v=[^"\'()]+)?(["\']?\\s*\\))','g');
 imported=imported.replace(pattern,(_,start,end)=>start+'?v='+dependencyHash+end);
 if(!imported.includes('/academy/'+name+'?v='+dependencyHash))throw new Error('Missing shared CSS import '+name);
}
if(imported!==originalShared)writeFileSync(sharedPath,imported);
const versions=Object.fromEntries(assets.map(name=>[name,hash(name)]));
const manifestPath=resolve(root,'../../src/navigationAssets.json');
const manifest=JSON.stringify({'academy-course-menu.v1.css':versions['academy-course-menu.v1.css']},null,2)+'\n';
writeFileSync(manifestPath,manifest);
const assetRefs=/((?:\bhref|\bsrc)\s*=\s*["'])\/academy\/(sitewide-premium\.css|academy-course-menu\.v1\.css|course-share\.css|course-share\.js|brand-refresh\.css|premium-theme\.css)(?:\?[^"']*)?(["'])/g;

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
 let result=original.replace(assetRefs,(_,start,name,end)=>{
  referenced++;
  return start+'/academy/'+name+'?v='+versions[name]+end;
 });
 // Static links remain usable before JavaScript loads and when it is disabled.
 if(result.includes('/academy/course-share.js')&&/<header\b/i.test(result)){
  // Keep the single search control while replacing the old home header.
  // render() moves it into the catalogue and back before replacing main HTML.
  const oldSearch=path.endsWith('/index.html')?result.match(/<header\b[^>]*>[\s\S]*?(<div class="anielka-nav-search">[\s\S]*?)(?=<div class="nav-actions">)/)?.[1]:null;
  result=result.replace(/(<meta\b[^>]*name=["']theme-color["'][^>]*content=["'])#[0-9a-f]{3,8}/gi,'$1#0c253c');
  result=result.replace(/<header\b[^>]*>[\s\S]*?<\/header>/i,'<header class="ta-course-header">'+academyMenuMarkup()+'</header>'+(oldSearch?'<div hidden data-academy-search-storage>'+oldSearch+'</div>':''));
 }
 if(path.endsWith('/index.html')){
  result=result.replace(/const ACCOUNTING_CATALOG=(\{[^\n]+\});/,(_,json)=>{
   const course=JSON.parse(json);course.release_notice=courseReleaseSummaryMarkup(course.id);
   return 'const ACCOUNTING_CATALOG='+JSON.stringify(course)+';';
  });
 }
 if(path.endsWith('/ksiegowosc-od-podstaw.html')){
  const notice=courseReleaseMarkup('ksiegowosc-od-podstaw');
  result=result.replace(/<aside class="ta-release-notice"[^>]*>[\s\S]*?<\/aside>/g,'');
  result=result.replace('<div class="row"><strong class="price">',notice+'<div class="row"><strong class="price">');
  result=result.replace('<a class="btn" href="/kup?course=ksiegowosc-od-podstaw">Kup kurs online',notice+'<a class="btn" href="/kup?course=ksiegowosc-od-podstaw">Kup kurs online');
 }
 if(path.includes('/kategorie/')){
  const release=courseRelease('ksiegowosc-od-podstaw');
  result=result.replace(/(<a href="\/academy\/ksiegowosc-od-podstaw\.html">)([\s\S]*?)(<\/a>)/g,(_,start,content,end)=>
   start+content.replace(/<span data-course-release[^>]*>[\s\S]*?<\/span>/g,'')+'<span data-course-release="ksiegowosc-od-podstaw" class="ta-release-summary">'+release.summary+'</span>'+end);
 }
 if(result!==original){writeFileSync(path,result);updated++;}
}
if(scanned<90||referenced<160)throw new Error('Insufficient public navigation coverage: '+scanned+' pages, '+referenced+' assets');
console.log('Navigation assets versioned: '+referenced+' references in '+scanned+' public pages ('+updated+' updated).');
