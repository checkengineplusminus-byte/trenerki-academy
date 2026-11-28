// Actual exported UI; all account, pricing and payment replies are fictional.
// This never charges a card, sends mail or changes a real learner's access.
import assert from 'node:assert/strict';
import {chromium,firefox,webkit} from 'playwright';
const origin=new URL(process.argv[2]||'http://127.0.0.1:8787').origin;
assert.match(origin,/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/);
const profiles=[
 ['chromium',1920,1080,false],['chromium',1440,900,false],
 ['chromium',1280,800,false],['chromium',1024,768,true],
 ['chromium',360,740,true],['chromium',412,915,true],
 ['firefox',1366,768,false],['firefox',375,812,false],
 ['webkit',390,844,true],['webkit',820,1180,true]
].filter(([engine,width])=>(!process.env.TRENERKI_TEST_ENGINE||engine===process.env.TRENERKI_TEST_ENGINE)&&(!process.env.TRENERKI_TEST_WIDTH||width===Number(process.env.TRENERKI_TEST_WIDTH)));
const api='https://kcvvixcjuwglfvdpypzs.supabase.co';
const accounting='ksiegowosc-od-podstaw',other='ai-bez-tajemnic';
const fakeUser={id:'00000000-0000-4000-a000-000000000401',email:'checkout@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};
let checks=0;
for(const [engine,width,height,touch] of profiles){
 const browser=await({chromium,firefox,webkit})[engine].launch({headless:true,...(engine==='chromium'&&process.env.TRENERKI_TEST_EXECUTABLE?{executablePath:process.env.TRENERKI_TEST_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width,height},hasTouch:touch,serviceWorkers:'block',reducedMotion:width===360?'reduce':'no-preference'});
 await context.addInitScript(user=>{
  localStorage.setItem('trenerki_ads_consent_v1','no');
  localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify({access_token:'synthetic-token',refresh_token:'synthetic-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}));
 },fakeUser);
 const state={slug:accounting,checkoutCalls:0,creditCalls:0};
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.origin===origin){
   if(req.isNavigationRequest()&&url.pathname==='/kup')return route.fulfill({response:await route.fetch({url:origin+'/kup.html'})});
   return route.continue();
  }
  if(url.origin!==api)return route.abort();
  const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
  const reply=(json,status=200)=>route.fulfill({headers,json,status});
  if(req.method()==='OPTIONS')return route.fulfill({headers,status:204});
  if(url.pathname==='/auth/v1/user')return reply(fakeUser);
  const table=url.pathname.split('/').at(-1);
  if(table==='ta_courses'){
   if(!url.searchParams.get('slug'))return reply([],503);
   return reply([{slug:state.slug,title_pl:state.slug===accounting?'Księgowość od podstaw':'AI bez tajemnic',description_pl:'Fikcyjny opis do próby formularza.',category_pl:'Próba',price_grosze:state.slug===accounting?99900:3999}]);
  }
  if(table==='ta_course_previews')return reply([]);
  if(table==='ta_enrollments')return reply([]);
  if(table==='ta_effective_course_price')return reply({effective_price_grosze:state.slug===accounting?99900:3999});
  if(table==='ta-credit'){
   const body=req.postDataJSON();assert.equal(body.action,'balance','Test must not spend a real or fictional wallet');
   state.creditCalls++;return reply({ok:true,available_grosze:0});
  }
  if(table==='ta-create-checkout'){
   state.checkoutCalls++;assert.equal(req.postDataJSON().course_slug,accounting);
   return reply({error:'payments_not_configured'},503);
  }
  if(table==='ta-academy')return reply({ok:true,is_admin:false});
  return reply([]);
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
 let signature;
 async function menu(){
  const nav=page.locator('[data-academy-shortcuts]');await nav.waitFor();
  assert.equal(await nav.count(),1,'Only one shared header');
  const current=await nav.locator('.ta-academy-links a').evaluateAll(nodes=>nodes.map(a=>[a.textContent,a.getAttribute('href')]));
  if(signature)assert.deepEqual(current,signature);else signature=current;
  const account=nav.locator('.ta-academy-profile');assert.equal(await account.innerText(),'Moje konto');assert.equal(await account.getAttribute('href'),'/konto');
  if(width<=1070){
   const disclosure=nav.locator('details'),toggle=disclosure.locator('summary');await toggle.click();
   assert(await disclosure.getByRole('link',{name:'Moje kursy',exact:true}).isVisible());
   await page.keyboard.press('Escape');assert.equal(await disclosure.getAttribute('open'),null);
   assert(await toggle.evaluate(el=>el===document.activeElement),'Escape returns focus to Menu');
  }else assert(await nav.locator('.ta-academy-links').isVisible());
  assert(await account.isVisible());
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),'No horizontal overflow');
 }
 try{
  await page.goto(origin+'/academy/index.html');await page.locator('#course-cards .course-card').first().waitFor();await menu();
  assert.equal(await page.locator('#anielka-question').count(),1,'Search survives the shared header');
  assert(await page.locator('#anielka-question').isVisible());
  await page.goto(origin+'/academy/index.html?course=excel-skroty');await page.locator('.course-heading').waitFor();await menu();
  assert.equal(await page.locator('#anielka-question').count(),1,'Legacy course navigation preserves exactly one search control');
  assert(await page.locator('#anielka-question').isVisible(),'Search remains usable while viewing a course');
  await page.goto(origin+'/academy/index.html');await page.locator('#course-cards .course-card').first().waitFor();
  const card=page.locator('[data-course-id="'+accounting+'"]');
  const disclosure=card.locator('[data-course-release]');await disclosure.waitFor();assert.match(await disclosure.innerText(),/wzór testowy/);
  await card.getByRole('link',{name:'Zobacz program →',exact:true}).click();await menu();
  const firstNotice=page.locator('.hero [data-course-release]');assert.match(await firstNotice.innerText(),/wzór testowy/);
  assert.equal(await page.getByRole('link',{name:'Kup kurs',exact:true}).getAttribute('href'),'/kup?course='+accounting,'Paid access stays paid');
  await page.getByText('Tak, kwota przelewu zgadza się z sumą faktur.',{exact:true}).click();
  await page.getByText('Sprawdź drugą odpowiedź.',{exact:false}).waitFor();
  await page.getByText('Mam przypuszczenie. Sprawdzę, za co przyszedł przelew.',{exact:true}).click();
  await page.getByText('Bank umie dodawać, ale intencji klienta jeszcze nie czyta.',{exact:false}).waitFor();
  await page.goto(origin+'/academy/kategorie/biznes-i-praca.html');await menu();
  const category=page.locator('main a[href="/academy/ksiegowosc-od-podstaw.html"]');assert.match(await category.innerText(),/wzór testowy/);
  await page.goto(origin+'/academy/kursy/autocad-skroty.html');await menu();
  assert.equal(await page.locator('[data-course-release]').count(),0,'Other courses must not receive the accounting notice');
  await page.goto(origin+'/kup?course='+accounting);await page.getByTestId('course-release-notice').waitFor();await menu();
  assert.match(await page.getByTestId('course-release-notice').innerText(),/wzór testowy/);
  const pay=page.getByRole('button',{name:'Przejdź do płatności Stripe →',exact:true});assert.equal(await pay.isEnabled(),false);
  const consent=page.getByRole('checkbox');assert.equal(await consent.count(),2,'No added consent or hidden acceptance requirement');
  await consent.nth(0).click();await consent.nth(1).click();assert(await pay.isEnabled());
  await pay.click();await page.getByRole('alert').waitFor();
  const message=await page.getByRole('alert').innerText();assert.match(message,/Nie pobrano pieniędzy/);assert.doesNotMatch(message,/konfiguracj|cztery|LIVE|klucz/);
  assert.equal(state.checkoutCalls,1);assert.equal(await page.getByTestId('course-release-notice').count(),1);
  state.slug=other;await page.goto(origin+'/kup?course='+other);await page.getByText('Cena katalogowa:',{exact:false}).waitFor();await menu();
  assert.equal(await page.getByTestId('course-release-notice').count(),0,'Do not mislabel unrelated courses as provisional');
  assert.deepEqual(errors,[]);assert.equal(state.checkoutCalls,1);checks++;
  console.log('✓ '+engine+' '+width+'×'+height+': shared menu, unique search, paid offer, working mini-lesson, release notice before payment and safe payment error');
 }catch(error){console.error(engine,width,page.url());console.error(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>innerWidth+3).slice(0,12).map(el=>({tag:el.tagName,class:el.className,right:el.getBoundingClientRect().right}))));await page.screenshot({path:'/tmp/trenerki-public-release-'+engine+'-'+width+'-error.png',fullPage:true}).catch(()=>{});throw error;}
 finally{await context.close();await browser.close();}
}
// The public disclosure and menu are also usable before JavaScript executes.
const browser=await chromium.launch({headless:true,...(process.env.TRENERKI_TEST_EXECUTABLE?{executablePath:process.env.TRENERKI_TEST_EXECUTABLE}:{})});
const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),page=await context.newPage();
try{
 await page.goto(origin+'/academy/ksiegowosc-od-podstaw.html');
 assert.match(await page.locator('.hero [data-course-release]').innerText(),/wzór testowy/);
 const nav=page.locator('[data-academy-shortcuts]');await nav.locator('summary').click();
 assert(await nav.getByRole('link',{name:'Moje kursy',exact:true}).isVisible());
 assert.equal(await nav.getByRole('link',{name:'Kursy',exact:true}).getAttribute('href'),'/academy/index.html#kursy');
 await nav.locator('summary').click();
 await page.getByText('Tak, kwota przelewu zgadza się z sumą faktur.',{exact:true}).click();
 await page.getByText('Sprawdź drugą odpowiedź.',{exact:false}).waitFor();
 await page.getByText('Mam przypuszczenie. Sprawdzę, za co przyszedł przelew.',{exact:true}).click();
 await page.getByText('Bank umie dodawać, ale intencji klienta jeszcze nie czyta.',{exact:false}).waitFor();
 checks++;
}finally{await context.close();await browser.close();}
console.log(JSON.stringify({checks,profiles:profiles.length,real_accounts:false,real_charges:false,email_delivery:false,physical_device:false}));
