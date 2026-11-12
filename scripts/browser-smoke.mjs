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
  const help=page.locator('header .nav-help');
  assert.equal(await help.getAttribute('href'),'/pomoc');
  await help.waitFor({state:'visible'});
  assert.equal(await help.locator('small').innerText(),'Bezpłatna pomoc');
  assert.equal(await help.locator('.nav-help-heart').innerText(),'❤️');
  const supportStyle=await help.evaluate(el=>{
   const menuStyle=getComputedStyle(document.querySelector('header .nav a'));
   const style=getComputedStyle(el);
   const copy=el.querySelector('.nav-help-copy');
   return {matched:['fontFamily','fontSize','fontWeight','color'].every(key=>style[key]===menuStyle[key]),
    stacked:getComputedStyle(copy).display==='grid',
    small:parseFloat(getComputedStyle(copy.querySelector('small')).fontSize)<parseFloat(style.fontSize)};
  });
  assert.deepEqual(supportStyle,{matched:true,stacked:true,small:true});
  const account=page.locator('header .demo-tag');
  const helpBounds=await help.boundingBox(),accountBounds=await account.boundingBox();
  assert(helpBounds&&accountBounds,'Help and account links must both be visible');
  assert(accountBounds.x>=helpBounds.x+helpBounds.width&&accountBounds.x-helpBounds.x-helpBounds.width<=20,'Help must be immediately to the left of My account');
  assert(Math.abs(helpBounds.y+helpBounds.height/2-accountBounds.y-accountBounds.height/2)<=2,'Help and account must share a row');
  for(const neighbor of [field,account]){
   const bounds=await neighbor.boundingBox();
   assert(helpBounds&&bounds);
   const overlap=helpBounds.x<bounds.x+bounds.width&&helpBounds.x+helpBounds.width>bounds.x&&
    helpBounds.y<bounds.y+bounds.height&&helpBounds.y+helpBounds.height>bounds.y;
   assert(!overlap,'Help link overlaps a neighboring control');
  }
  const footer=page.locator('footer.academy-footer');
  await footer.waitFor({state:'visible'});
  const footerHelp=footer.locator('.academy-footer__help');
  assert.equal(await footerHelp.getAttribute('href'),'/pomoc');
  await footer.getByRole('link',{name:'Kontakt i reklamacje',exact:true}).waitFor({state:'visible'});
  await footer.getByRole('link',{name:'Regulamin',exact:true}).waitFor({state:'visible'});
  await footer.getByRole('link',{name:'Polityka prywatności',exact:true}).waitFor({state:'visible'});
  assert.match(await footer.innerText(),/NIP 5272961874/,'Company registration details must be visible');
  const staff=footer.getByRole('link',{name:'Panel personelu',exact:true});
  assert.equal(await staff.getAttribute('href'),'/admin');
  assert.equal((await staff.innerText()).trim(),'','Staff access should be visible only as an icon');
  assert(await staff.locator('.academy-footer__gear').evaluate(el=>
   el.getBoundingClientRect().width===14&&getComputedStyle(el).clipPath.startsWith('polygon')),
   'Staff access icon must render at its intended size');
  const credit=footer.locator('.developer-credit');
  assert.match(await credit.innerText(),/Website created by\s+www\.adrianflaga\.com/);
  assert.equal(await credit.getByRole('link',{name:'www.adrianflaga.com',exact:true}).getAttribute('href'),'https://www.adrianflaga.com/');
  const cursor=credit.locator('.terminal-cursor');
  assert.equal(await cursor.getAttribute('aria-hidden'),'true');
  assert.deepEqual(await cursor.evaluate(el=>{
   const animation=el.getAnimations().find(item=>item.animationName==='academy-cursor-blink');
   if(!animation)return null;
   animation.pause();
   animation.currentTime=100;
   const visible=getComputedStyle(el).opacity;
   animation.currentTime=700;
   const hidden=getComputedStyle(el).opacity;
   animation.play();
   return {visible,hidden};
  }),{visible:'1',hidden:'0'},'The signature cursor must visibly blink');
  const consent=page.getByRole('region',{name:'Zgoda na pomiary reklamowe'});
  if(await consent.isVisible())await consent.getByRole('button',{name:'Odrzuć',exact:true}).click();
  const cookieSettings=footer.locator('.academy-footer__utility').getByRole('button',{name:'Ustawienia plików cookie',exact:true});
  await cookieSettings.click();
  await consent.waitFor({state:'visible'});
  await consent.getByRole('button',{name:'Odrzuć',exact:true}).click();
  const readHeart=locator=>locator.evaluate(el=>({
   heart:getComputedStyle(el,'::before').animationName,
   halo:getComputedStyle(el,'::after').animationName,
   copyDecoration:getComputedStyle(el.closest('a')).textDecorationLine,
  }));
  const headerHeart=help.locator('.nav-help-heart');
  assert.equal((await readHeart(headerHeart)).heart,'none','The support heart should be calm at rest');
  if(!isMobile){
   await help.hover();
   assert.equal((await readHeart(headerHeart)).heart,'academy-heartbeat');
   assert.equal((await readHeart(headerHeart)).halo,'academy-heart-halo');
   assert.equal(await help.locator('.nav-help-copy').evaluate(el=>getComputedStyle(el).textDecorationLine),'none');
   await account.focus();
   await page.keyboard.press('Shift+Tab');
   assert(await help.evaluate(el=>el.matches(':focus-visible')),'Keyboard navigation must visibly focus the support link');
   await page.emulateMedia({reducedMotion:'reduce'});
   assert.deepEqual(await readHeart(headerHeart),{heart:'none',halo:'none',copyDecoration:'none'});
   assert.deepEqual(await cursor.evaluate(el=>{
    const style=getComputedStyle(el);
    return {animation:style.animationName,opacity:style.opacity};
   }),{animation:'none',opacity:'1'},'Reduced motion must leave the signature cursor steadily visible');
   await page.emulateMedia({reducedMotion:'no-preference'});
   await footerHelp.hover();
   const footerHeart=footerHelp.locator('.support-heart');
   assert.equal((await readHeart(footerHeart)).heart,'academy-heartbeat');
   assert.equal((await readHeart(footerHeart)).copyDecoration,'none');
  }
  const footerWidth=await footer.evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth}));
  assert(footerWidth.scroll<=footerWidth.client+2,'Footer overflows: '+JSON.stringify(footerWidth));
  await footer.screenshot({path:'/tmp/trenerki-'+name+'-footer.png'});
  await field.waitFor({state:'visible'});
  const prices=await page.evaluate(()=>COURSES.map(c=>({slug:c.id,price:c.price})));
  assert.equal(prices.length,81,'Public catalogue should contain all courses');
  assert.deepEqual(prices.filter(c=>c.price===0).map(c=>c.slug).sort(),['swiety-mikolaj','zaufany-wolontariusz']);
  assert.equal(Math.min(...prices.filter(c=>c.price>0).map(c=>c.price)),99);
  assert.equal(await page.locator('.category-tiles .category-tile').count(),6,'Six clickable category cards must appear on homepage');
  assert.equal(await page.locator('#course-cards .course-card').count(),12,'Homepage should show twelve featured courses');
  assert.equal(await page.locator('#course-cards .course-card .card-title').first().innerText(),'Zaufany wolontariusz');
  assert.doesNotMatch(await page.locator('#course-cards').innerText(),/\b\d+\s*(?:lekcj\w*|godz\w*|minut\w*)/i,'Cards should omit lesson counts and duration');
  assert.doesNotMatch(await page.locator('.hero').innerText(),/\b\d+\s+lekcj\w*/i,'Hero should omit lesson counts');
  assert.equal(await page.locator('.catalog-more').count(),0,'No more-courses buttons');
  await page.locator('.category-tiles .category-tile').first().click();
  assert.equal(await page.locator('#course-cards .course-card').count(),9,'Selecting construction must show all nine courses');
  await page.locator('.category-tiles .category-tile').nth(1).click();
  assert.equal(await page.locator('#course-cards .course-card').count(),25,'Craft category must show all twenty-five courses');
  await page.locator('#chips .chip').first().click();
  assert.equal(await page.locator('#course-cards .course-card').count(),12,'All categories should return to featured discovery view');
  assert.equal(await page.locator('#course-search').count(),0,'Duplicate search field');
  assert.equal(await page.locator('#anielka-form').count(),0,'Secondary Anielka form');
  assert.equal(await page.locator('.anielka-examples').count(),0,'Hardcoded example prompts');
  assert.equal(await page.locator('#anielka-question').count(),1,'Search field must be unique');
  await field.fill('Chcę używać Excela do kosztorysów w pracy');
  await page.locator('#anielka-peek [data-anielka-course="excel-skroty"]').waitFor({timeout:7000});
  const count=await page.locator('#course-cards .course-card').count();
  assert(count>=1&&count<prices.length,'Course recommendations must actually filter the catalog');
  await field.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#anielka-output')?.textContent?.includes('Ponieważ chcesz używać Excela'),{timeout:9000});
  const icon=page.locator('#course-cards .course-icon-art').first();
  assert(await icon.count(),'Course icon missing');
  const usable=await icon.evaluate(node=>{
   try{const b=node.getBBox();return b.width>0&&b.height>0;}catch{return false;}
  });
  assert(usable,'SVG course icon is not rendered');
  const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  assert(width.scroll<=width.client+3,'Horizontal overflow: '+JSON.stringify(width));
  await page.locator('#anielka-output [data-anielka-course="excel-skroty"]').first().click();
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
   assert.equal(all.length,81);
   for(const course of all){
    const result=await page.evaluate(id=>{
     openCourse(id,false);
     return {title:document.title,body:document.querySelector('#app')?.textContent?.length||0};
    },course.id);
    assert(result.title.includes(course.title),'Incorrect course detail title: '+course.id);
    assert(result.body>150,'Course detail is empty: '+course.id);
   }
   console.log('✓ desktop: all '+all.length+' course detail screens render with correct course titles');
  }
  await page.goto(root+'/academy/index.html',{waitUntil:'domcontentloaded'});
  let submitted=0;
  page.on('request',request=>{if(request.method()==='POST'&&request.url().includes('/ta-anielka'))submitted++;});
  await field.fill('Mam myśli samobójcze i mam plan');
  await field.press('Enter');
  await page.locator('#anielka-output a[href="tel:112"]').waitFor();
  assert.equal(await page.locator('#anielka-output [data-anielka-course]').count(),0,'A crisis response must never sell a course');
  await page.locator('#anielka-output a[href="/pomoc#kryzys"]').waitFor();
  await page.waitForTimeout(1800);
  assert.equal(submitted,0,'Recognized crisis text must stay on the device');
  await page.route(root+'/pomoc',async route=>route.fulfill({response:await route.fetch({url:root+'/pomoc.html'})}));
  const support=await page.goto(root+'/pomoc',{waitUntil:'domcontentloaded'});
  assert.equal(support?.status(),200,'Public help route must render');
  await page.getByRole('heading',{name:'Potrzebujesz pomocy? Nie jesteś sam'}).waitFor();
  assert.equal(await page.title(),'Bezpłatna pomoc i telefony zaufania – Trenerki.com');
  const appHelp=page.locator('footer.ta-app-footer .ta-app-footer-help');
  await appHelp.waitFor({state:'visible'});
  assert.equal(await appHelp.getAttribute('href'),'/pomoc');
  // A flex item blockifies an inline-flex child's computed display.
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('footer.ta-app-footer')).backgroundColor==='rgb(16, 40, 32)',null,{timeout:10000});
  assert.match(await appHelp.evaluate(el=>getComputedStyle(el).display),/^(?:inline-)?flex$/);
  if(!isMobile){
   await appHelp.hover();
   assert.equal(await appHelp.locator('.ta-app-footer-heart-fill').evaluate(el=>getComputedStyle(el).animationName),'ta-app-heart-beat');
   assert.equal(await appHelp.evaluate(el=>getComputedStyle(el).textDecorationLine),'none');
  }
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.support-grid')).display==='grid');
  assert.equal(await page.locator('.support-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),isMobile?1:2);
  await page.getByRole('button',{name:'Uzależnienia',exact:true}).focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelectorAll('.support-category').length===1&&document.querySelector('#uzaleznienia'));
  assert.equal(await page.locator('a[href="tel:112"]').count(),1,'Emergency number must stay visible under filtering');
  const supportWidth=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  assert(supportWidth.scroll<=supportWidth.client+3,'Public help page horizontal overflow');
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
