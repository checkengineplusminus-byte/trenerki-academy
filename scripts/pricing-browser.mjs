#!/usr/bin/env node
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const root=(process.argv[2]||'http://127.0.0.1:8787').replace(/\/+$/,'');
const browser=await chromium.launch({headless:true});
try{
 for(const size of [{width:390,height:844},{width:1440,height:900}]){
  const ctx=await browser.newContext({viewport:size,locale:'pl-PL'}),page=await ctx.newPage();
  const errors=[];page.on('pageerror',err=>errors.push(err.message));page.setDefaultTimeout(13000);
  await page.route('**/rest/v1/**',route=>route.fulfill({status:503,contentType:'application/json',body:'[]'}));
  await page.goto(root+'/academy/index.html',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('.excel-free-intro').count(),0,'No duplicate Excel banner at the top');
  assert.equal(await page.locator('header .nav a[href*="excel"]').count(),0,'No extra Excel navigation tab');
  const freeCards=page.locator('#course-cards .free-starter-grid .course-card');
  assert.deepEqual(await freeCards.evaluateAll(nodes=>nodes.map(node=>node.dataset.courseId)),['excel-skroty','zaufany-wolontariusz','swiety-mikolaj']);
  assert.deepEqual(await freeCards.locator('.price').allTextContents(),['GRATIS','GRATIS','GRATIS']);
  assert.equal(await page.locator('#course-cards .course-card').count(),12);
  if(size.width>=621)assert(await freeCards.evaluateAll(nodes=>nodes.every(node=>Math.abs(node.getBoundingClientRect().top-nodes[0].getBoundingClientRect().top)<3)),'Three free courses must be side by side');
  await freeCards.first().getByRole('button',{name:'Odbierz za darmo'}).waitFor();
  await page.locator('.category-tile[data-course-category="budownictwo"]').click();
  await page.locator('#course-cards .course-card[data-course-id="brygadzista"]').getByText(/155 zł/).waitFor();
  const dims=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  assert(dims.scroll<=dims.client+3,'Mobile horizontal overflow '+JSON.stringify(dims));
  await page.goto(root+'/academy/kursy/excel-skroty.html',{waitUntil:'domcontentloaded'});
  await page.getByText('Bezpłatny kurs: 0 zł').waitFor();
  assert((await page.getByRole('link',{name:'Odbierz bezpłatny kurs Excel'}).getAttribute('href')).includes('course=excel-skroty'));
  await page.goto(root+'/academy/kursy/brygadzista.html',{waitUntil:'domcontentloaded'});
  await page.getByText('Cena katalogowa: 155 zł').waitFor();
  await page.goto(root+'/academy/kategorie/technologie-i-logistyka.html',{waitUntil:'domcontentloaded'});
  await page.getByRole('link',{name:/Excel od zera do analizy danych.*0 zł/}).waitFor();
  assert.deepEqual(errors,[],'No JavaScript errors');
  console.log('✓ '+size.width+'px: free course trio, no separate Excel banner, paid prices and SEO consistent');
  await ctx.close();
 }
}finally{await browser.close();}
