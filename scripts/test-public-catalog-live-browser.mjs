import assert from 'node:assert/strict';
import {chromium} from 'playwright';
// Runs against the actual live public domain without an account.
const origin='https://trenerki.com', observations=[];
const browser=await chromium.launch({headless:true});
let failed=0;
try{
 for(const viewport of [{name:'desktop',width:1440,height:900},{name:'mobile',width:390,height:844}]){
  const context=await browser.newContext({viewport,locale:'pl-PL',serviceWorkers:'block'});
  const page=await context.newPage();
  const errors=[],requests=[];
  page.on('pageerror',e=>errors.push(String(e).slice(0,500)));
  page.on('requestfailed',r=>requests.push({url:r.url(),error:r.failure()?.errorText}));
  const url=origin+'/academy/index.html?catalog_live_browser_test='+Date.now();
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForSelector('#anielka-question',{timeout:15000});
  await page.waitForTimeout(2000);
  const boot=await page.evaluate(()=>({
   courseCount:typeof COURSES==='undefined'?null:COURSES.length,
   categoryIds:typeof publicCatalogCourses==='function'?publicCatalogCourses().filter(c=>c.id==='ai-bez-tajemnic'||c.id==='ksiegowosc-od-podstaw').map(c=>c.id):null,
   searchHook:typeof window.anielkaCatalogIds,
   cardCount:document.querySelectorAll('#course-cards .course-card').length,
   bodyIncludesAI:document.querySelector('#course-cards')?.textContent?.includes('AI bez tajemnic'),
   bodyIncludesAccount:document.querySelector('#course-cards')?.textContent?.includes('Księgowość od podstaw'),
   statusText:document.querySelector('#catalog-sync-note')?.textContent,
  }));
  const queries=['AI','sztuczna inteligencja','ChatGPT','księgowość','ksiegowosc'];
  const findings=[];
  for(const query of queries){
   await page.locator('#anielka-question').fill(query);
   await page.waitForTimeout(350);
   const entry=await page.evaluate(()=>({
    items:[...document.querySelectorAll('#course-cards .course-card')].map(c=>({id:c.dataset.courseId,title:c.querySelector('.card-title')?.textContent})),
    preview:document.querySelector('#anielka-peek')?.textContent?.slice(0,170),
    input:document.querySelector('#anielka-question')?.value,
    error:document.querySelector('#catalog-sync-note')?.textContent?.slice(0,100)
   }));
   const expected=/^(AI|ChatGPT|sztuczna inteligencja)$/.test(query)?'ai-bez-tajemnic':'ksiegowosc-od-podstaw';
   const match=entry.items.some(x=>x.id===expected);
   findings.push({query,expected,match,count:entry.items.length,items:entry.items.slice(0,8),preview:entry.preview});
   if(!match)failed++;
  }
  observations.push({viewport:viewport.name,url:page.url(),boot,findings,pageErrors:errors,
   failedRequests:requests.filter(x=>/academy|supabase/.test(x.url)).slice(0,12)});
  await context.close();
 }
}finally{await browser.close()}
console.log('TRENERKI_LIVE_PUBLIC_BROWSER_SEARCH',JSON.stringify(observations,null,2));
if(failed){console.error(failed+' anonymous public search cases failed');process.exitCode=1}
