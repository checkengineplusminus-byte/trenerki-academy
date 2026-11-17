#!/usr/bin/env node
// TRENERKI: comprehensive public-source audit of ALL 81 ordinary courses.
// The separately managed official accounting course is explicitly excluded.
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('public/academy/index.html');
const match=html.match(/^const COURSES=(.+);$/m);
if(!match)throw new Error('Missing course catalogue');
const courses=JSON.parse(match[1]);
const photoManifest=JSON.parse(read('public/academy/course-photo-manifest.json')).courses;
const findings=[],counts={},meta=[];
const expected=81;
if(courses.length!==expected)findings.push({type:'catalogue_count',expected,actual:courses.length});
if(new Set(courses.map(c=>c.id)).size!==courses.length)findings.push({type:'duplicate_slug'});
for(const c of courses){
 const slug=c.id,path='public/academy/kursy/'+slug+'.html';
 const n=Array.isArray(c.outline)?c.outline.length:0;
 counts[slug]=n;
 if(n<30)findings.push({type:'short_curriculum',slug,expected:30,actual:n});
}
const root=new URL('../',import.meta.url);
const exists=p=>existsSync(new URL(p,root));
for(const c of courses){
 const slug=c.id,path='public/academy/kursy/'+slug+'.html';
 if(!exists(path)){findings.push({type:'missing_public_course_page',slug});continue;}
 const source=read(path),n=counts[slug];
 const badge=source.match(/<span>(\d+)\s+lekcj[ieó]+<\/span>/i);
 const found=badge?Number(badge[1]):null;
 if(found!==n)findings.push({type:'lesson_badge_mismatch',slug,expected:n,actual:found});
 const list=source.match(/<ol class="program">([\s\S]*?)<\/ol>/);
 const items=list?(list[1].match(/<li>/g)||[]).length:null;
 if(items!==n)findings.push({type:'public_outline_mismatch',slug,expected:n,actual:items});
 const price=source.match(/Cena katalogowa:\s*([\d\s,.]+)\s*zł/i);
 const shown=price?Math.round(Number(price[1].replace(/\s/g,'').replace(',','.'))*100):null;
 if(shown!==c.price*100)findings.push({type:'price_badge_mismatch',slug,expected:c.price*100,actual:shown});
 if(!source.includes('href="https://trenerki.com/academy/kursy/'+slug+'.html"'))
 findings.push({type:'missing_canonical',slug});
 const photo=photoManifest[slug];
 if(!photo)findings.push({type:'missing_photo_manifest',slug});
 else if(!exists('public/academy/photos/'+photo.file))findings.push({type:'photo_file_missing',slug,file:photo.file});
 const header=source.match(/<h1>(.*?)<\/h1>/s)?.[1]||'';
 if(header!==c.title)findings.push({type:'title_mismatch',slug,expected:c.title,actual:header});
 meta.push({slug,lessons:n,price:c.price,photo:photo?.file||'',publicBadge:found,programItems:items});
}
const report={checked_at:'2026-11-17',scope:'81 ordinary public courses — excluding accounting',courses_checked:courses.length,expected_courses:expected,total_lessons:Object.values(counts).reduce((a,b)=>a+b,0),photo_assets_checked:meta.length,findings};
console.log('STATIC AUDIT:',JSON.stringify(report,null,2));
mkdirSync('/tmp/trenerki-course-audit',{recursive:true});
writeFileSync('/tmp/trenerki-course-audit/static.json',JSON.stringify(report,null,2)+'\n');
if(process.argv.includes('--strict')&&findings.length)process.exitCode=1;
