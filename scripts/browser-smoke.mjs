#!/usr/bin/env node
// Real Chromium rendering of Expo-exported Academy at desktop and mobile sizes.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const root=(process.argv[2]||'http://127.0.0.1:8787').replace(/\/+$/,'');
const browser=await chromium.launch({headless:true});
let problems=[];
async function verify(name,viewport,isMobile){
 const ctx=await browser.newContext({viewport,isMobile,deviceScaleFactor:1,hasTouch:isMobile});
 const page=await ctx.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/rest/v1/**',route=>route.fulfill({status:503,contentType:'application/json',body:'[]'}));
 await page.route('**/functions/v1/ta-anielka',route=>route.fulfill({
  status:200,contentType:'application/json',
  headers:{'access-control-allow-origin':'*','access-control-allow-headers':'apikey,content-type'},
  body:JSON.stringify({ok:true,answer:'Ponieważ chcesz używać Excela do kosztorysów w pracy, zacznij od komórek, formuł mnożenia i sumy. Potem wykonaj własny kosztorys. Czy pracowałeś już w arkuszu?',candidate_ids:['excel-skroty']})
 }));
 try{
  const r=await page.goto(root+'/academy/index.html',{waitUntil:'domcontentloaded',timeout:30000});
  assert(r&&r.status()===200,'Academy HTML route failed');
  const field=page.locator('#anielka-question');
  await field.waitFor({state:'visible'});
  const prices=await page.evaluate(()=>COURSES.map(c=>({slug:c.id,price:c.price})));
  assert.equal(prices.length,80,'Public catalogue should contain all courses');
  assert.deepEqual(prices.filter(c=>c.price===0).map(c=>c.slug),['swiety-mikolaj']);
  assert.equal(Math.min(...prices.filter(c=>c.price>0).map(c=>c.price)),99);
  const sections=page.locator('#course-cards .catalog-category');
  assert((await sections.count())>=4,'Courses must be grouped into clear subject sections');
  const initialCounts=await sections.evaluateAll(nodes=>nodes.map(section=>section.querySelectorAll('.course-card').length));
  const pageSize=await page.evaluate(()=>catalogPageSize());
  assert(initialCounts.every(count=>count>=1&&count<=pageSize),'Show one responsive row of courses per category');
  const initialVisible=await page.locator('#course-cards .btn-buy-card').count();
  assert(initialVisible>0&&initialVisible<80,'The compact catalogue must not display all 80 courses before expansion');
  const firstMore=page.locator('#course-cards .catalog-more').first();
  assert(await firstMore.count(),'Sections must offer a way to reveal more courses');
  await firstMore.click();
  assert((await page.locator('#course-cards .btn-buy-card').count())>initialVisible,'Pokaż kolejne must reveal more courses');
  // Expand all categories to ensure every course is still reachable and purchasable.
  await page.evaluate(()=>{
   for(const category of catalogRenderCategories)catalogVisibleByCategory[category]=1000;
   updateCatalog();
  });
  assert.equal(await page.locator('#course-cards .btn-buy-card').count(),80,'All 80 courses must remain available after expansion');
  assert.equal(await page.locator('#course-search').count(),0,'Duplicate search field');
  assert.equal(await page.locator('#anielka-form').count(),0,'Secondary Anielka form');
  assert.equal(await page.locator('.anielka-examples').count(),0,'Hardcoded example prompts');
  assert.equal(await page.locator('#anielka-question').count(),1,'Search field must be unique');
  await field.fill('Chcę używać Excela do kosztorysów w pracy');
  await page.locator('#anielka-peek [data-anielka-course="excel-skroty"]').waitFor({timeout:7000});
  const count=await page.locator('#course-cards .course-card').count();
  assert(count>=1&&count<80,'Course recommendations must actually filter the catalog');
  await page.waitForFunction(()=>document.querySelector('#anielka-peek p')?.textContent?.includes('Ponieważ chcesz używać Excela'),{timeout:9000});
  const icon=page.locator('#course-cards .course-icon-art').first();
  assert(await icon.count(),'Course icon missing');
  const usable=await icon.evaluate(node=>{
   try{const b=node.getBBox();return b.width>0&&b.height>0;}catch{return false;}
  });
  assert(usable,'SVG course icon is not rendered');
  const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  assert(width.scroll<=width.client+3,'Horizontal overflow: '+JSON.stringify(width));
  await page.locator('#anielka-peek [data-anielka-course="excel-skroty"]').click();
  await page.waitForFunction(()=>new URL(location.href).searchParams.get('course')==='excel-skroty',{timeout:6000});
  await page.waitForTimeout(200);
  assert((await page.locator('body').innerText()).includes('Excel'),'Course details did not open');
  // Main navigation search must still function from the course detail page.
  // It must navigate to the catalog and expose the new individual recommendation.
  await field.fill('Chcę kupić używany samochód');
  await page.locator('#anielka-peek [data-anielka-course="jak-kupic-samochod"]').waitFor({timeout:7000});
  await page.waitForFunction(()=>new URL(location.href).searchParams.has('course')===false,{timeout:6000});
  await page.locator('#course-cards .course-card').first().waitFor({state:'visible',timeout:6000});
  assert((await page.locator('#anielka-output').innerText()).includes('samochód'),'Anielka forgot to render search results when leaving a course');
  await page.locator('#anielka-peek [data-anielka-course="jak-kupic-samochod"]').click();
  await page.waitForFunction(()=>new URL(location.href).searchParams.get('course')==='jak-kupic-samochod',{timeout:6000});
  const fullText=await page.locator('body').innerText();
  assert(fullText.includes('samochód'),'Second course did not open from the navigation search');
  if(!isMobile){
   // Every single course program must open and paint without throwing.
   const all=await page.evaluate(()=>COURSES.map(c=>({id:c.id,title:c.title})));
   assert.equal(all.length,80);
   for(const course of all){
    const result=await page.evaluate(id=>{
     openCourse(id,false);
     return {title:document.title,body:document.querySelector('#app')?.textContent?.length||0};
    },course.id);
    assert(result.title.includes(course.title),'Incorrect course detail title: '+course.id);
    assert(result.body>150,'Course detail is empty: '+course.id);
   }
   console.log('✓ desktop: all 80 course detail screens render with correct course titles');
  }
  await page.screenshot({path:'/tmp/trenerki-'+name+'.png',fullPage:false});
  assert.equal(errors.length,0,'Browser JS errors: '+errors.join(' | '));
  console.log('✓ '+name+': Anielka searches from home AND course detail, opens both courses, no JS errors or overflow');
 }catch(error){
  await page.screenshot({path:'/tmp/trenerki-'+name+'-error.png',fullPage:true}).catch(()=>{});
  problems.push(name+': '+String(error.message||error));
 }finally{await ctx.close();}
}
try{
 await verify('desktop',{width:1365,height:840},false);
 await verify('iphone',{width:390,height:844},true);
}finally{await browser.close();}
if(problems.length){for(const p of problems)console.error('❌ '+p);process.exitCode=1;}
