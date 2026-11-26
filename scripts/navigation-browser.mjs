#!/usr/bin/env node
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=(process.argv[2]||'http://127.0.0.1:8787').replace(/\/+$/,'');
const browser=await chromium.launch({headless:true});
let errors=[];
const routes=[
 '/academy/kursy/autocad-skroty.html',
 '/academy/kursy/excel-skroty.html',
 '/academy/kursy/zaufany-wolontariusz.html',
 '/academy/kursy/ai-bez-tajemnic.html',
 '/academy/ksiegowosc-od-podstaw.html',
 '/academy/kategorie/budownictwo.html',
 '/academy/kategorie/biznes-i-praca.html',
 '/academy/kategorie/technologie-i-logistyka.html'
];
for(const [type,viewport]of [['iphone',{width:390,height:844}],['tablet',{width:820,height:950}],['desktop',{width:1365,height:900}]]){
 const ctx=await browser.newContext({viewport,isMobile:type==='iphone',hasTouch:type==='iphone'});
 const page=await ctx.newPage();
 try{
  for(const route of routes){
   const resp=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:30000});
   assert.equal(resp?.status(),200,route+' status');
   const compact=type!=='desktop';
   const menu=page.locator('header.ta-unified-header details.ta-unified-menu');
   if(compact)await menu.locator('summary').click();
   const nav=page.locator('header.ta-unified-header '+(compact?'.ta-unified-mobile':'.ta-unified-desktop'));
   await nav.waitFor({state:'visible',timeout:8000});
   assert.equal(await nav.getByRole('link',{name:'Mój profil'}).getAttribute('href'),'/konto',route+' account');
   assert.equal(await nav.getByRole('link',{name:'Moje kursy'}).getAttribute('href'),'/moje-kursy',route+' library');
   assert.equal(await nav.getByRole('link',{name:'Kursy',exact:true}).getAttribute('href'),'/academy/index.html#kursy',route+' catalogue');
   assert.equal(await nav.getByRole('link',{name:'Dla firm'}).getAttribute('href'),'/firma',route+' company');
   assert.equal(await nav.getByRole('link',{name:'Nie jesteś sam'}).getAttribute('href'),'/pomoc',route+' help');
   assert(await nav.getByRole('link',{name:'Mój profil'}).isVisible(),route+' profile link visible');
   if(compact){
    await page.keyboard.press('Escape');
    assert.equal(await menu.getAttribute('open'),null,'Escape closes course navigation');
   }
   const bounds=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
   assert(bounds.scroll<=bounds.client+3,route+' horizontal overflow '+JSON.stringify(bounds));
  }
  const h=await page.goto(base+'/academy/index.html',{waitUntil:'domcontentloaded'});
  assert.equal(h?.status(),200);
  const acc=page.locator('header .demo-tag');
  assert.equal(await acc.getAttribute('href'),'/konto');
  assert.match(await acc.innerText(),/Moje konto/);
  if(type!=='desktop'){
   const menu=page.locator('header .mobile-nav');
   await menu.locator('summary').click();
   assert(await menu.getByRole('link',{name:'Moje konto'}).isVisible());
   assert.equal(await menu.getByRole('link',{name:'Dla firm'}).getAttribute('href'),'/firma');
   await page.keyboard.press('Escape');
   assert.equal(await menu.getAttribute('open'),null,'Escape closes the dropdown');
   await menu.locator('summary').click();
   await menu.getByRole('link',{name:'Przeglądaj kursy'}).click();
   assert.equal(await menu.getAttribute('open'),null,'Mobile menu must close after selection');
  }
  // Local static test server has no Expo Hosting route rewrite. Serve the
  // exported HTML while keeping /konto as the browser pathname.
  await page.route(base+'/konto',async route=>route.fulfill({response:await route.fetch({url:base+'/konto.html'})}));
  const profile=await page.goto(base+'/konto',{waitUntil:'domcontentloaded'});
  assert.equal(profile?.status(),200,'Account route must resolve through the Hosting rewrite');
  await page.getByText('Witaj ponownie!',{exact:false}).first().waitFor({state:'visible',timeout:16000});
  await page.getByPlaceholder('Adres e-mail').waitFor({state:'visible'});
  console.log('✓ '+type+': profile navigation on eight offers/categories, mobile catalogue menu, anonymous login');
  await page.screenshot({path:'/tmp/trenerki-nav-'+type+'.png',fullPage:false});
 }catch(error){
  errors.push(type+': '+String(error.stack||error));
  try{await page.screenshot({path:'/tmp/trenerki-nav-'+type+'-error.png',fullPage:false})}catch{}
 }finally{await ctx.close()}
}
await browser.close();
if(errors.length){for(const e of errors)console.error('❌ '+e);process.exit(1)}
