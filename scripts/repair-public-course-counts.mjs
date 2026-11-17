#!/usr/bin/env node
// One-time reviewable repair of public course cards; never touches accounting content.
// Preserves all titles, programs, prices, checkout links, and custom course details.
import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
const courses=JSON.parse(read('public/academy/index.html').match(/^const COURSES=(.+);$/m)[1]);
if(courses.length!==81)throw Error('Expected 81 independent course listings');
const patch=[],errors=[];
for(const course of courses){
 const path='public/academy/kursy/'+course.id+'.html',src=read(path);
 const m=src.match(/<div class="info">([\s\S]*?)<\/div>/i),p=src.match(/<ol class="program">([\s\S]*?)<\/ol>/);
 const n=course.outline.length;
 if(!m||!p){errors.push(course.id+': missing public info/program');continue}
 const current=(p[1].match(/<li>/g)||[]).length;
 if(current!==n){errors.push(course.id+': public outline has '+current+' / '+n);continue}
 const info=m[1];
 const spans=[...info.matchAll(/<span>([\s\S]*?)<\/span>/gi)];
 const hit=spans.map(x=>({whole:x[0],label:x[1],number:x[1].match(/\b(\d+)\s+(?:lekcj[a-ząćęłńóśźż]*|dział[a-ząćęłńóśźż]*)/i)})).find(x=>x.number);
 const existing=hit?Number(hit.number[1]):null;
 if(existing===n)continue;
 const desired=n+' lekcji';
 const nextInfo=hit?info.replace(hit.whole,'<span>'+desired+'</span>'):'<span>'+desired+'</span>'+info;
 const next=src.replace(m[0],m[0].replace(info,nextInfo));
 if(next===src){errors.push(course.id+': no correction generated');continue}
 patch.push({path,oldCount:existing,newCount:n,content:next});
}
if(errors.length)throw Error('Unsafe public correction: '+errors.join('; '));
console.log('Public course count corrections:',JSON.stringify(patch.map(x=>({page:x.path,from:x.oldCount,to:x.newCount})),null,2));
console.log('Total fixed: '+patch.length+' of '+courses.length+' public pages');
if(!process.argv.includes('--check'))for(const entry of patch)writeFileSync(new URL(entry.path,root),entry.content);
