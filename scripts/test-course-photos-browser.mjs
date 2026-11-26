#!/usr/bin/env node
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.argv[2]||'http://127.0.0.1:8787').replace(/\/+$/,'');
const browser=await chromium.launch({headless:true});
let bad=false;
for(const [name,viewport] of [['iphone',{width:390,height:844}],['desktop',{width:1365,height:900}]]){
 const ctx=await browser.newContext({viewport,isMobile:name==='iphone',hasTouch:name==='iphone'});
 const page=await ctx.newPage();
 try{
  // Simulate a slow manifest: photo URL must still be populated immediately.
  await page.route('**/academy/course-photo-manifest.json',async route=>{
   await new Promise(resolve=>setTimeout(resolve,1500));
   await route.continue();
  });
  // Slow down one visible course image to inspect the loading fallback.
  await page.route('**/academy/photos/ongoing-wms.webp**',async route=>{
   await new Promise(resolve=>setTimeout(resolve,2000));
   await route.continue();
  });
  await page.route('**/rest/v1/**',route=>route.fulfill({status:503,contentType:'application/json',body:'[]'}));
  const r=await page.goto(base+'/academy/index.html',{waitUntil:'domcontentloaded'});
  assert.equal(r?.status(),200);
  const card=page.locator('.free-starter-grid .course-card[data-course-id="zaufany-wolontariusz"]');
  const photo=card.locator('img.card-photo');
  const waiting=card.locator('.card-media-loading');
  await card.waitFor({state:'attached'});
  assert.match(await photo.getAttribute('src'),/ongoing-wms\.webp/);
  assert.equal(await waiting.isVisible(),true,'Loading title must show before image is ready');
  assert.match(await waiting.innerText(),/Zaufany wolontariusz/);
  await page.waitForFunction(()=>{
    const media=document.querySelector('.free-starter-grid [data-course-id="zaufany-wolontariusz"] .card-media');
    return !!media?.classList.contains('has-course-photo');
  },null,{timeout:20000});
  assert.equal(await photo.evaluate(el=>el.naturalWidth>0),true);
  assert.equal(await photo.evaluate(el=>getComputedStyle(el).opacity),'1','Loaded photo must be visible');
  assert.equal(await waiting.isVisible(),false,'Loading title should disappear after successful image load');
  assert.equal(await page.locator('#course-cards .course-card').count(),6);
  const courseImages=page.locator('#course-cards img.card-photo');
  const missing=await courseImages.evaluateAll(nodes=>nodes.filter(img=>!img.getAttribute('src')).map(x=>x.dataset.coursePhoto));
  assert.deepEqual(missing,[],'No course may wait for a manifest before receiving its photo URL');
  const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  assert(size.scroll<=size.client+3,'No horizontal overflow');
  await page.screenshot({path:'/tmp/trenerki-course-photo-'+name+'.png',fullPage:true});
  console.log('✓ '+name+': photo remains readable while loading, becomes visible, no manifest dependency');
 }catch(error){
  bad=true;console.error('✗ '+name+': '+(error.stack||error));
  try{await page.screenshot({path:'/tmp/trenerki-course-photo-'+name+'-error.png'})}catch{}
 }finally{await ctx.close()}
}
await browser.close();
if(bad)process.exitCode=1;
