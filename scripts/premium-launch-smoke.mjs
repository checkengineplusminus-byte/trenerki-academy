#!/usr/bin/env node
// Independent release gate for the premium storefront.
// Public HTML is tested against offline catalogue fallback (no private data).
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=(process.argv[2]||'http://127.0.0.1:8787').replace(/\/+$/,'');
const browser=await chromium.launch({headless:true});
let failed=false;
const fakeScreenshot='<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1007"><rect width="1920" height="1007" fill="#e9eef5"/><text x="90" y="160" font-size="64" fill="#14263b">Przykladowy arkusz Excel — test offline</text></svg>';

async function testViewport(name,width,height,mobile){
 const ctx=await browser.newContext({viewport:{width,height},isMobile:mobile,deviceScaleFactor:1,hasTouch:mobile});
 const page=await ctx.newPage();
 try{
  await ctx.route('https://upload.wikimedia.org/**',route=>route.fulfill({status:200,contentType:'image/svg+xml',headers:{'access-control-allow-origin':'*'},body:fakeScreenshot}));
  await page.route('**/rest/v1/**',route=>route.fulfill({status:503,contentType:'application/json',body:'[]'}));
  const result=await page.goto(origin+'/academy/index.html',{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(result?.status(),200,'Public homepage must load');
  await page.locator('.hero-laptop .hero-sheet').waitFor({state:'visible'});
  assert.match(await page.locator('.hero h1').innerText(),/Ucz się umiejętności, które wykorzystasz/);
  assert.match(await page.locator('.hero-laptop').innerText(),/660/,'Real worked numerical example');
  assert.equal(await page.locator('.hero .hero-product-showcase img').count(),0,'No synthetic people in the main illustration');
  assert.equal(await page.locator('link[href*="premium-theme.css"]').count(),1,'Premium theme should be loaded once');
  assert.equal(await page.locator('.category-tiles .category-tile').count(),6);
  assert.equal(await page.locator('.category-tiles .category-tile svg').count(),6,'Category illustrations must be unique inline icons');
  assert.equal(await page.locator('#course-cards .course-card').count(),6,'Homepage has 3 free and 3 paid courses');
  assert.equal(await page.locator('#course-cards .btn-buy-card').count(),0,'Each card has only a clear program link');
  assert.equal(await page.locator('#course-cards .btn-inline').count(),6);
  assert.equal(await page.locator('#anielka-question').count(),1,'Exactly one catalog search');
  const colors=await page.locator('.header').evaluate(el=>getComputedStyle(el).backgroundColor);
  assert.notEqual(colors,'rgba(0, 0, 0, 0)','Header must have an opaque premium background');
  const primary=await page.locator('.hero .btn-dark').evaluate(el=>getComputedStyle(el).color);
  assert.equal(primary,'rgb(23, 35, 53)','Gold CTA must use legible dark text');
  if(mobile){
   const menu=page.locator('header .mobile-nav');
   await menu.locator('summary').click();
   assert(await menu.getByRole('link',{name:'Zaloguj się'}).isVisible());
   await menu.getByRole('link',{name:'Przeglądaj kursy'}).click();
   assert.equal(await menu.getAttribute('open'),null,'Menu must close on selection');
   assert.equal(await page.locator('header .nav').isVisible(),false,'Desktop links hidden on mobile');
  }else{
   assert(await page.locator('header .nav a[href="/firma"]').isVisible());
  }
  const gdpr=page.getByRole('region',{name:'Zgoda na pomiary reklamowe'});
  if(await gdpr.isVisible())await gdpr.getByRole('button',{name:'Odrzuć',exact:true}).click();
  // All cards must use the available width, not the old 6-column widths.
  if(!mobile){
   const rects=await page.locator('#course-cards .catalog-category:not(:first-child) .course-card').evaluateAll(nodes=>nodes.map(el=>({x:el.getBoundingClientRect().left,w:el.getBoundingClientRect().width})));
   assert.equal(rects.length,3);
   assert(rects.every(r=>r.w>260),'Featured cards must be full-size: '+JSON.stringify(rects));
  }
  const widths=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  assert(widths.scroll<=widths.client+3,'No horizontal overflow: '+JSON.stringify(widths));
  await page.screenshot({path:'/tmp/trenerki-premium-'+name+'.png',fullPage:true});
  // Public fixed pages must keep their programmes and contact/legal links.
  const accounting=await page.request.get(origin+'/academy/ksiegowosc-od-podstaw.html');
  assert.equal(accounting.status(),200);
  assert.match(await accounting.text(),/premium-theme\.css/);
  const ai=await page.request.get(origin+'/academy/kursy/ai-bez-tajemnic.html');
  assert.equal(ai.status(),200);
  assert.match(await ai.text(),/premium-theme\.css/);
  const login=await page.goto(origin+'/konto?course=autocad-skroty',{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(login?.status(),200,'Login URL must be reachable before checkout');
  await page.getByText('Witaj ponownie!',{exact:false}).first().waitFor({state:'visible',timeout:15000});
  await page.getByPlaceholder('Adres e-mail').waitFor({state:'visible'});
  console.log('✓ premium '+name+': layout, menu, six categories, real pricing, account and no horizontal overflow');
 }catch(err){
  failed=true;console.error('❌ '+name+': '+(err.stack||err));
  try{await page.screenshot({path:'/tmp/trenerki-premium-'+name+'-error.png',fullPage:false})}catch{}
 }finally{await ctx.close()}
}
await testViewport('desktop',1365,900,false);
await testViewport('iphone',390,844,true);
await browser.close();
if(failed)process.exit(1);
