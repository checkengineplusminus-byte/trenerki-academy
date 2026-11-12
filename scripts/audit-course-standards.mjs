#!/usr/bin/env node
// TRENERKI editorial dashboard: reporting only, never silently fill courses with placeholder lessons.
// Protect the completed catalogue against accidental removal of chapters.
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../public/academy/index.html',import.meta.url),'utf8');
const start=html.indexOf('const COURSES=');
if(start<0)throw new Error('Course data missing from catalog');
const open=html.indexOf('[',start),end=html.indexOf('];',open);
if(open<0||end<0)throw new Error('Catalog JSON malformed');
const courses=JSON.parse(html.slice(open,end+1));
if(courses.length!==81)throw new Error('Expected 81 courses, found '+courses.length);
const min=30;
const incomplete=[];
for(const course of courses){
 if(!course.id||!Array.isArray(course.outline))throw new Error('Missing curriculum: '+course?.id);
 const n=course.outline.length;
 if(n<8)throw new Error('Severe loss of content in '+course.id+' ('+n+' chapters)');
 if(new Set(course.outline.map(x=>String(x).trim().toLocaleLowerCase('pl'))).size!==n)
  throw new Error('Duplicate chapter titles: '+course.id);
 if(n<min)incomplete.push({slug:course.id,existing:n,missing:min-n,category:course.cat});
}
const count=new Map();for(const c of incomplete)count.set(c.category,(count.get(c.category)||0)+1);
console.log('TRENERKI — wymaganie: minimum '+min+' rzetelnych rozdziałów/kurs');
console.log('Kursów: '+courses.length+' | zgodnych: '+(courses.length-incomplete.length)+' | wymagających rozbudowy: '+incomplete.length);
console.log('Brakujących rozdziałów łącznie: '+incomplete.reduce((a,c)=>a+c.missing,0));
for(const [cat,n] of count)console.log(' • '+cat+': '+n+' kursów do rozbudowy');
console.log('Audyt metadanych nie dowodzi poprawności pytań ani istnienia backupu.');
if(process.argv.includes('--enforce')&&incomplete.length){
 console.error('❌ Nie spełniono progu jakości: '+incomplete.length+' kursów');
 process.exitCode=1;
}
