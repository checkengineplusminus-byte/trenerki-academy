#!/usr/bin/env node
// Real Chromium geometry regression for every public course group.
// A green source test is NOT enough: cards must occupy distinct columns.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=(process.argv[2]||'http://127.0.0.1:8787').replace(/\/+$/,'');
const browser=await chromium.launch({headless:true});
const cases=[
 {name:'desktop',width:1440,height:960,cols:3,related:3},
 {name:'small-desktop',width:1100,height:900,cols:3,related:3},
 {name:'tablet',width:820,height:950,cols:2,related:2},
 {name:'phone',width:390,height:844,cols:1,related:1}
];
let failures=0;
for(const config of cases){
 const context=await browser.newContext({viewport:{width:config.width,height:config.height},
  isMobile:config.name==='phone',hasTouch:config.name==='phone'});
 const page=await context.newPage();
 try{
  const response=await page.goto(origin+'/academy/index.html',{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(response?.status(),200,'catalog route');
  await page.locator('#course-cards .course-card').first().waitFor();
  // Offline API fallback is supported; every published course must remain available.
  await page.locator('.catalog-show-all').click();
  await page.waitForFunction(()=>document.querySelectorAll('#course-cards .course-card').length>=83);
  const metrics=await page.locator('#course-cards .catalog-category-grid').evaluateAll(grids=>{
   return grids.map(grid=>{
    const cards=[...grid.querySelectorAll('.course-card')];
    const rects=cards.slice(0,3).map(card=>{
     const rect=card.getBoundingClientRect();
     const media=card.querySelector('.card-media')?.getBoundingClientRect();
     return {left:rect.left,top:rect.top,width:rect.width,height:rect.height,
      mediaWidth:media?.width||0,mediaHeight:media?.height||0,
      display:getComputedStyle(card).display};
    });
    const tracks=getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean);
    return {columns:tracks.length,cards:cards.length,rects,width:grid.getBoundingClientRect().width};
   });
  });
  assert(metrics.length>=6,'all six course categories rendered');
  for(const [i,g] of metrics.entries()){
   assert.equal(g.columns,config.cols,config.name+' group '+i+' track count: '+JSON.stringify(g));
   assert(g.rects.every(r=>r.width>110&&r.width<config.width),
    config.name+' group '+i+' unreasonable card widths');
   if(g.cards>=config.cols){
    const first=g.rects.slice(0,config.cols);
    assert(first.every(r=>Math.abs(r.top-first[0].top)<3),config.name+' cards must share row '+i);
    if(config.cols>1)assert(first.every((r,j)=>j===0||r.left>first[j-1].left+30),
     config.name+' cards must occupy distinct columns '+i);
   }
   if(config.cols>1)assert(g.rects[0]?.display==='flex',
     config.name+' desktop/tablet card should be vertically composed');
   else assert(g.rects[0]?.display==='grid',config.name+' mobile card should be compact');
  }
  const overflow=await page.evaluate(()=>({
   page:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,
   gold:getComputedStyle(document.querySelector('#course-cards .btn-inline')).backgroundImage,
   navy:getComputedStyle(document.querySelector('.header')).backgroundImage
  }));
  assert(overflow.page<=overflow.viewport+3,config.name+' horizontal overflow: '+JSON.stringify(overflow));
  assert(overflow.gold.includes('gradient'),config.name+' gold CTA missing');
  assert(overflow.navy.includes('gradient'),config.name+' navy header missing');
  await page.screenshot({path:'/tmp/trenerki-grid-'+config.name+'.png',fullPage:false});
  // Category/related courses follow the same responsive column count.
  const category=await page.goto(origin+'/academy/kategorie/biznes-i-praca.html',{waitUntil:'domcontentloaded'});
  assert.equal(category?.status(),200);
  await page.locator('header.ta-unified-header').waitFor();
  const related=await page.locator('main .related').evaluate(el=>({
   cols:getComputedStyle(el).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
   count:el.querySelectorAll('a').length
  }));
  assert(related.count>=3);
  assert.equal(related.cols,config.related,config.name+' category related-course grid: '+JSON.stringify(related));
  console.log('✓ '+config.name+': '+config.cols+' columns across '+metrics.length+
   ' catalog sections and '+config.related+' related-course columns');
 }catch(error){
  failures++;console.error('✗ '+config.name+': '+String(error.stack||error));
  try{await page.screenshot({path:'/tmp/trenerki-grid-'+config.name+'-error.png',fullPage:false})}catch{}
 }finally{await context.close();}
}
await browser.close();
if(failures)process.exit(1);
