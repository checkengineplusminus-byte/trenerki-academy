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
 const individualGuides=JSON.parse(read('content/course-guides-individual.json'));
 const craftGuides=JSON.parse(read('content/craft-guides-individual.json'));
 const staticIntroductions=read('src/CourseIntro.tsx');
 const introSlugs=new Set([...staticIntroductions.matchAll(/^\s*'([a-z0-9-]+)':\s*\{/gm)].map(x=>x[1]));
 const expandedSlugs=new Set(['norweski-na-budowie','angielski-na-budowie','niemiecki-na-budowie',
 'mierz-ponad-sily','opieka-seniorzy','wsparcie-adhd','poznaj-siebie','mocny-charakter','nie-lubie-ludzi',
 'zaczynam-od-zera','obowiazki-domowe','lepszy-cukiernik','lepszy-kucharz','jak-kupic-samochod',
 'google-ads-promocja','facebook-ads-promocja']);
 const thirtyLessonSlugs=new Set(['windows-skroty','excel-skroty','autocad-skroty','word-skroty']);
 const logisticsSlugs=new Set(['axapta-dynamics-magazyn','sap-ewm-magazyn','oracle-wms-cloud','manhattan-active-wms','blue-yonder-wms','infor-wms','ongoing-wms','astro-consafe-wms','sap-tm-transport']);
 const checkout=read('app/kup.tsx'),academy=read('src/academyApi.ts'),gift=read('app/prezent.tsx'),admin=read('app/admin.tsx'),progress=read('app/nauka.tsx');
 const scriptStart=page.lastIndexOf('<script>'),scriptEnd=page.lastIndexOf('</script>');
 if(scriptStart<0||scriptEnd<0)fail('HTML script missing');
 else{new Script(page.slice(scriptStart+8,scriptEnd),{filename:'academy-index.js'});ok('Homepage JavaScript syntax');}
 if(courses.length===15+additions.length&&courses.length>=69&&new Set(courses.map(c=>c.id)).size===courses.length)ok(courses.length+' unique courses');else fail('Course count or duplicate slug');
 for(const c of courses){
  const expected=(logisticsSlugs.has(c.id)||thirtyLessonSlugs.has(c.id))?30:expandedSlugs.has(c.id)?12:8;
  if(!Array.isArray(c.outline)||c.outline.length!==expected)fail(c.id+': expected '+expected+' lessons');
  const guide=individualGuides[c.id]||craftGuides[c.id];
  if(!introSlugs.has(c.id)&&(!guide||!['what','first','result','boundary'].every(k=>typeof guide[k]==='string'&&guide[k].length>=30)))
    fail(c.id+': missing specific course guide');
  if(!previews[c.id]||!['curiosity','scenario','outcome_1','outcome_2','outcome_3'].every(k=>typeof previews[c.id][k]==='string'&&previews[c.id][k].length>20))fail(c.id+': missing life-based preview');
 }
 if(Object.keys(previews).length===courses.length&&additions.length===courses.length-15)ok(courses.length+' practical previews and '+additions.length+' added courses');else fail('Preview/addition count mismatch');
 const uniqueGuides=Object.keys(individualGuides).concat(Object.keys(craftGuides));
 if(uniqueGuides.length!==courses.length-introSlugs.size||new Set(uniqueGuides).size!==uniqueGuides.length)fail('Course guides missing or duplicated');else ok(courses.length+' individual course introductions covered');
 const price=new Map(courses.map(c=>[c.id,c.price]));
 for(const [id,expected] of [['excel-skroty',10],['autocad-skroty',10],['word-skroty',10],['windows-skroty',10],['swiety-mikolaj',0],['lepszy-tata',99],['lepsza-mama',99],['nie-marnuj-jedzenia',29.99],['trawnik-jestem-ogrodnikiem',29.99],['angielski-na-budowie',149],['norweski-na-budowie',149],['niemiecki-na-budowie',149]]){
  if(price.get(id)!==expected)fail('Price mismatch '+id);else ok(id+' '+expected+' PLN');
 }
 if(!page.includes('Cześć, to ja Anielka!'))fail('Anielka greeting missing');
 const history=JSON.parse(read('content/traditional-crafts-20-20261108.json')).courses;
 if(history.length!==20)fail('Expected 20 traditional crafts');
 for(const item of history){
  const p=previews[item.id];
  if(!p?.history||!('ended_year' in p.history)||!p.history.note||!p.history.source_url)fail(item.id+': historical evidence metadata missing');
  if(p?.history?.ended_year&&!p.history.source_url)fail(item.id+': ungrounded historical teaching end date');
 }
 if(!page.includes('Rzemiosło dawniej i dziś'))fail('Missing natural history of crafts');
 if(page.includes('Ostatni potwierdzony rok:')||page.includes('Sprawdź źródło historyczne'))fail('Technical research notes exposed to learners');
 if(courses.some(c=>!Number.isFinite(c.price)||c.price<0))fail('Catalog includes a missing or invalid price');
 const construction=['norweski-na-budowie','angielski-na-budowie','niemiecki-na-budowie'];
 for(const slug of construction){
  const course=courses.find(c=>c.id===slug);
  if(!course||course.outline.length!==12)fail(slug+': needs 12 chapters from first day to end of shift');
  if(!course?.outline?.[0]?.toLowerCase().includes('zera'))fail(slug+': should start from zero');
 }
 const languageViewer=read('src/ConstructionLesson.tsx');
 if(!languageViewer.includes('speechSynthesis')||!languageViewer.includes('roleplay')||!languageViewer.includes('academy/illustrations/'))fail('Pronunciation, illustrated scenes or interactive exercise missing');
 if(!progress.includes('finishLesson')||!progress.includes('setModule(next)')||!progress.includes('ConstructionLesson'))fail('Auto-advance from completed lesson missing');
 const dashboard=read('app/moje-kursy.tsx');
 if(dashboard.includes('*12.5')||!dashboard.includes('lessonCount'))fail('Progress calculation must use real lesson counts');
 const shortcutModules=['word','autocad','excel','windows'];
 const component=read('src/KeyboardLesson.tsx');
 for(const name of shortcutModules){
  const lessons=JSON.parse(read('content/keyboard-'+name+'.json'));
  const total=lessons.reduce((n,l)=>n+(l.material?.shortcuts?.length||0),0);
  if(lessons.length!==8||total<40)fail(name+': expected 8 modules and >=40 keyboard examples');
  for(const l of lessons){
   if(!l.material?.shortcuts?.every(x=>x.keys?.length&&x.before&&x.after&&x.tip&&x.kind))fail(name+': shortcut missing keys, before/after or tip');
   if(!l.material?.references?.length)fail(name+': reference missing');
  }
  if(!courses.some(c=>c.id===name+'-skroty'))fail(name+': course missing from catalog');
  else ok(name+' has '+total+' illustrated shortcuts');
 }
 const handsOn=read('src/HandsOnLab.tsx');
 if(!component.includes('HandsOnLab')||!component.includes('runId={runId}')||!handsOn.includes('setRows(')||!handsOn.includes('setShapes(')||!handsOn.includes("mode==='excel'"))fail('Hands-on Excel and AutoCAD workbench not connected');
 else ok('Excel and AutoCAD visual practice connected to every command execution');
 if(!component.includes('function Keycap')||!component.includes('SoftwarePlayground')||!component.includes('runCommand')||!component.includes('SPRAWDŹ, CZY ROZUMIESZ')||!progress.includes('<KeyboardLesson'))fail('Interactive keyboard simulator missing');
 else ok('Protected lessons include working simulated Word and AutoCAD keyboard actions');
 for(const stale of ['Testy + egzamin','Przed egzaminem czeka Cię','Czytasz, podejmujesz decyzję, zapisujesz rozwiązanie i rozwiązujesz krótki quiz']){
  if(page.includes(stale))fail('Misleading unfinished-feature promise: '+stale);
 }
 if(!checkout.includes("academyAction('demo_checkout'")||checkout.includes("ta-create-checkout")||!checkout.includes('TRYB TESTOWY'))fail('Checkout not strictly marked DEMO');else ok('No-charge test purchasing');
 if(!gift.includes("academyAction('create_gift'")||!gift.includes("academyAction('redeem_gift'")||!gift.includes('swiety-mikolaj'))fail('Gift card redemption/sharing missing');else ok('Gift card flow');
 if(!admin.includes("academyAction('admin_dashboard'")||!admin.includes('Jakość kursów'))fail('Protected administration or editorial view missing');else ok('Administrator content-review dashboard');
 if(!progress.includes(".in('status',['active','demo'])")||!progress.includes("setDone(")||!checkout.includes("review_status"))fail('Demo access, saved progress or editorial warnings missing');else ok('Demo lessons, progress and pre-purchase editorial review checks');
 const sandbox=read('src/SoftwarePlayground.tsx'),cases=read('src/CaseLesson.tsx');
 if(!sandbox.includes('mode===\'cad\'')||!sandbox.includes('mode===\'windows\'')||!sandbox.includes('isExcel')||!sandbox.includes('isWord'))fail('Virtual software screens missing');
 if(!cases.includes('onPassed')||!progress.includes('const canFinish='))fail('Graded lesson checkpoint missing');
 if(!progress.includes('ta_learning_attempts')||!progress.includes("recordAttempt('case'")||!progress.includes("recordAttempt('construction'")||!progress.includes("recordAttempt('keyboard'"))fail('All graded exercise categories must save individual attempts');
 if(page.includes("lekcji i ćwiczenia</span>'"))fail('Literal lesson-count bug in cards');
 if(!academy.includes("functions.invoke('ta-academy'"))fail('Protected backend integration missing');
 if(/service_role|stripe_secret_key/i.test(checkout+academy+gift+admin))fail('Server secret name exposed in frontend, review required');
 if(!process.exitCode)console.log('All static integrity checks passed.');
}catch(e){fail(String(e?.stack||e))}
