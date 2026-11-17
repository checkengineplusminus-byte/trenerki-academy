#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const items=JSON.parse(readFileSync(new URL('../content/course-illustrations-missing-20261117.json',import.meta.url),'utf8')).lessons;
const origin='https://trenerki.com';
const failed=[],ok=[];let at=0;
async function worker(){
 while(at<items.length){
  const row=items[at++],id='lesson-visual-'+row.slug+'-'+String(row.n+1).padStart(3,'0');
  try{
   const response=await fetch(origin+'/academy/assets/'+id+'.svg',{headers:{'cache-control':'no-cache'},signal:AbortSignal.timeout(16000)});
   const body=await response.text();
   if(response.status===200&&body.includes('<svg')&&body.includes('960')&&body.includes('540')&&body.includes(row.title.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')))ok.push(id);
   else failed.push({id,status:response.status,bodyBytes:body.length});
  }catch(e){failed.push({id,error:String(e).slice(0,180)})}
 }
}
await Promise.all(Array.from({length:18},worker));
const summary={checked:new Date().toISOString(),origin,total:items.length,passed:ok.length,failed:failed.length,problems:failed.slice(0,50)};
console.log('OFFICIAL DOMAIN AUDIT:',JSON.stringify(summary,null,2));
mkdirSync('/tmp/trenerki-images',{recursive:true});
writeFileSync('/tmp/trenerki-images/live-audit.json',JSON.stringify(summary,null,2)+'\n');
assert.equal(ok.length,1885,'All image files must be present at the official site');
assert.equal(failed.length,0,'Missing or mismatched illustrations');
