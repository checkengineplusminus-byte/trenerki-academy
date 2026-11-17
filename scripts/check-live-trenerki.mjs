#!/usr/bin/env node
// Read-only verification of real production website from GitHub-hosted internet runner.
// No credentials, cookies or student data. Do not confuse HTTP success with EAS deploy status.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const courses=JSON.parse(read('public/academy/index.html').match(/^const COURSES=(.+);$/m)[1]);
const origin='https://trenerki.com';
const issues=[],ok=[];
async function check(course){
 const path='/academy/kursy/'+course.id+'.html';
 const url=origin+path;
 try{
  const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(15000),headers:{accept:'text/html','cache-control':'no-cache','user-agent':'Trenerki-Public-ReadOnly-Release-Audit/1.0'}});
  const body=await r.text();
  const info=body.match(/<div class="info">([\s\S]*?)<\/div>/i)?.[1]||'';
  const captions=[...info.matchAll(/<span>([\s\S]*?)<\/span>/gi)].map(x=>x[1].replace(/<[^>]*>/g,'').trim());
  const count=captions.map(text=>text.match(/\b(\d+)\s+(?:lekcj[a-ząćęłńóśźż]*|dział[a-ząćęłńóśźż]*)/i)).find(Boolean)?.[1];
  const actual=count?Number(count):null,expected=course.outline.length;
  const hasProgram=(body.match(/<ol class="program">([\s\S]*?)<\/ol>/)||[])[1];
  const n=hasProgram?(hasProgram.match(/<li>/g)||[]).length:null;
  const result={slug:course.id,url,status:r.status,expected,actual,public_titles:n,content_bytes:body.length,final_url:r.url};
  if(r.status===200&&actual===expected&&n===expected&&r.url.startsWith('https://trenerki.com/'))ok.push(result);
  else issues.push(result);
 }catch(e){issues.push({slug:course.id,url,error:String(e).slice(0,300)});}
}
let idx=0;
await Promise.all(Array.from({length:8},async()=>{
 while(idx<courses.length)await check(courses[idx++]);
}));
const featured={};
for(const key of ['norweski-na-budowie','lepszy-cukiernik','ciesla-przygotowanie-czeladnicze','excel-skroty','zaufany-wolontariusz']){
 const r=ok.find(x=>x.slug===key)||issues.find(x=>x.slug===key);
 featured[key]=r||null;
}
try{
 const r=await fetch(origin+'/academy/index.html',{redirect:'follow',signal:AbortSignal.timeout(15000)});
 featured.catalogue={status:r.status,bodyHasCatalogue:(await r.text()).includes('const COURSES=')};
}catch(e){featured.catalogue={error:String(e).slice(0,200)};}
const report={checked_at:new Date().toISOString(),method:'HTTP GET from GitHub Actions internet runner, no login',site:origin,total:courses.length,success:ok.length,issues:issues.length,featured,problems:issues};
console.log('LIVE WEBSITE AUDIT:',JSON.stringify(report,null,2));
mkdirSync('/tmp/trenerki-course-audit',{recursive:true});
writeFileSync('/tmp/trenerki-course-audit/live.json',JSON.stringify(report,null,2)+'\n');
if(issues.length||featured.catalogue?.status!==200)process.exitCode=1;
