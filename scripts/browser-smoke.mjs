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
  await page.screenshot({path:'/tmp/trenerki-'+name+'.png',fullPage:false});
  assert.equal(errors.length,0,'Browser JS errors: '+errors.join(' | '));
  console.log('✓ '+name+': searchable Anielka, personal AI reply, filtered catalog, visible SVG, course page and no overflow');
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
