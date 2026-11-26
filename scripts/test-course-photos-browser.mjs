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
  await ctx.route('https://upload.wikimedia.org/**',route=>route.fulfill({
   status:200,contentType:'image/svg+xml',headers:{'access-control-allow-origin':'*'},
   body:'<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1007"><rect width="1920" height="1007" fill="#edf1f5"/></svg>'
  }));
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
  // Verify all six thumbnails after they enter the viewport (not just one).
  const six=page.locator('#course-cards .course-card');
  await courseImages.evaluateAll(nodes=>nodes.forEach(img=>{img.loading='eager'}));
  await page.waitForFunction(()=>[...document.querySelectorAll('#course-cards img.card-photo')].length===6&&
   [...document.querySelectorAll('#course-cards img.card-photo')].every(img=>img.complete&&img.naturalWidth>0),null,{timeout:20000});
  const rendering=await six.evaluateAll(nodes=>nodes.map(card=>{
    const img=card.querySelector('img.card-photo');
    const media=card.querySelector('.card-media');
    const rect=card.getBoundingClientRect();
    return {id:card.dataset.courseId,opacity:getComputedStyle(img).opacity,mediaHeight:media.getBoundingClientRect().height,
      cardHeight:rect.height,photoReady:img.complete&&img.naturalWidth>0};
  }));
  assert(rendering.every(c=>c.photoReady&&c.opacity==='1'),name+': blank course covers '+JSON.stringify(rendering));
  if(name==='iphone')assert(rendering.every(c=>c.cardHeight<285),
    'Mobile cards are too tall: '+JSON.stringify(rendering));
  // The first visit shows a short featured list, but "Wszystkie" must reveal all offers.
  assert.equal(await six.count(),6,'Exactly six featured cards by default');
  await page.locator('.catalog-show-all').click();
  assert.equal(await six.count(),83,'The full public catalogue must remain discoverable');
  await page.locator('.category-tiles .category-tile').first().click();
  assert.equal(await six.count(),9,'Construction filter must show its 9 relevant courses');
  await page.locator('#chips .chip').first().click();
  assert.equal(await six.count(),83,'Wszystkie filter must not hide courses');
  await page.locator('.category-tiles .category-tile').first().click();
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
