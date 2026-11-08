#!/usr/bin/env node
// TRENERKI Academy — static consistency gate, no external dependencies.
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const fail=m=>{console.error('❌ '+m);process.exitCode=1};
const ok=m=>console.log('✓ '+m);
function extractJSON(source,declaration,open,close){
 const s=declaration+'=',start=source.indexOf(s);
 if(start===-1)throw new Error('Missing '+declaration);
 let p=start+s.length;
 if(source[p]!==open)throw new Error('Unexpected JSON data for '+declaration);
 let depth=0,quoted=false,escape=false;
 for(let i=p;i<source.length;i++){
  const c=source[i];
  if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;continue}
  if(c==='"')quoted=true;else if(c===open)depth++;else if(c===close&&--depth===0)return JSON.parse(source.slice(p,i+1));
 }
 throw new Error('Unclosed JSON '+declaration);
}
try{
 const page=read('public/academy/index.html');
 const courses=extractJSON(page,'const COURSES','[',']');
 const previews=extractJSON(page,'const PREVIEWS','{','}');
 const additions=JSON.parse(read('public/academy/course-additions.json'));
 const checkout=read('app/kup.tsx'),academy=read('src/academyApi.ts'),gift=read('app/prezent.tsx'),admin=read('app/admin.tsx'),progress=read('app/nauka.tsx');
 const scriptStart=page.lastIndexOf('<script>'),scriptEnd=page.lastIndexOf('</script>');
 if(scriptStart<0||scriptEnd<0)fail('HTML script missing');
 else{new Script(page.slice(scriptStart+8,scriptEnd),{filename:'academy-index.js'});ok('Homepage JavaScript syntax');}
 if(courses.length===36&&new Set(courses.map(c=>c.id)).size===36)ok('36 unique courses');else fail('Course count or duplicate slug');
 for(const c of courses){
  if(!Array.isArray(c.outline)||c.outline.length!==8)fail(c.id+': eight-module syllabus missing');
  if(!previews[c.id]||!['curiosity','scenario','outcome_1','outcome_2','outcome_3'].every(k=>typeof previews[c.id][k]==='string'&&previews[c.id][k].length>20))fail(c.id+': missing life-based preview');
 }
 if(Object.keys(previews).length===36&&additions.length===21)ok('36 practical previews and 21 added courses');else fail('Preview/addition count mismatch');
 const price=new Map(courses.map(c=>[c.id,c.price]));
 for(const [id,expected] of [['excel-skroty',10],['autocad-skroty',10],['swiety-mikolaj',0],['lepszy-tata',99],['lepsza-mama',99]]){
  if(price.get(id)!==expected)fail('Price mismatch '+id);else ok(id+' '+expected+' PLN');
 }
 if(!page.includes('Cześć, to ja Anielka!'))fail('Anielka greeting missing');
 for(const stale of ['Testy + egzamin','Przed egzaminem czeka Cię','Czytasz, podejmujesz decyzję, zapisujesz rozwiązanie i rozwiązujesz krótki quiz']){
  if(page.includes(stale))fail('Misleading unfinished-feature promise: '+stale);
 }
 if(!checkout.includes("academyAction('demo_checkout'")||checkout.includes("ta-create-checkout")||!checkout.includes('TRYB TESTOWY'))fail('Checkout not strictly marked DEMO');else ok('No-charge test purchasing');
 if(!gift.includes("academyAction('create_gift'")||!gift.includes("academyAction('redeem_gift'")||!gift.includes('swiety-mikolaj'))fail('Gift card redemption/sharing missing');else ok('Gift card flow');
 if(!admin.includes("academyAction('admin_dashboard'")||!admin.includes('Jakość kursów'))fail('Protected administration or editorial view missing');else ok('Administrator content-review dashboard');
 if(!progress.includes(".in('status',['active','demo'])")||!progress.includes('reviewStatus'))fail('Demo entitlement or student editorial warnings missing');else ok('Demo lesson access and learner guidance');
 if(!academy.includes("functions.invoke('ta-academy'"))fail('Protected backend integration missing');
 if(/service_role|stripe_secret_key/i.test(checkout+academy+gift+admin))fail('Server secret name exposed in frontend, review required');
 if(!process.exitCode)console.log('All static integrity checks passed.');
}catch(e){fail(String(e?.stack||e))}
