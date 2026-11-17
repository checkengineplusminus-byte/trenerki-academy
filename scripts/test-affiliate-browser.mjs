#!/usr/bin/env node
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const origin=new URL(process.argv[2]||'http://127.0.0.1:8788').origin;
const api='https://kcvvixcjuwglfvdpypzs.supabase.co';
const code='TA012345ABCDEF';
const user={id:'00000000-0000-4000-a000-000000000211',email:'test-affiliate@example.test',
 aud:'authenticated',role:'authenticated',email_confirmed_at:'2026-11-17T08:00:00Z',app_metadata:{},user_metadata:{}};
const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'apikey,authorization,content-type,x-client-info,accept-profile,content-profile,prefer',
 'access-control-allow-methods':'GET,POST,OPTIONS'};
async function exported(page){
 await page.route(url=>url.origin===origin&&['/partner','/konto'].includes(url.pathname),async route=>{
  const target=origin+new URL(route.request().url()).pathname+'.html';
  const response=await route.fetch({url:target});
  await route.fulfill({response});
 });
}
async function runBrowser(browser,device){
 const context=await browser.newContext({viewport:device==='phone'?{width:390,height:844}:{width:1365,height:860},hasTouch:device==='phone',isMobile:device==='phone'});
 const page=await context.newPage();
 try{
  await exported(page);
  await page.route(url=>url.origin===api,route=>{
    if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
    return route.fulfill({status:401,headers,contentType:'application/json',body:JSON.stringify({message:'no active session'})});
  });
  await page.goto(origin+'/academy/index.html?ref='+code,{waitUntil:'domcontentloaded'});
  const affiliate=page.locator('a.academy-footer__affiliate');
  await affiliate.waitFor();
  assert.equal(await affiliate.getAttribute('href'),'/academy/program-afiliacyjny.html');
  await affiliate.evaluate(node=>node.scrollIntoView());
  const animation=await affiliate.evaluate(node=>getComputedStyle(node).animationName);
  assert.notEqual(animation,'none','Affiliate callout should pulse for users who permit motion');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await affiliate.evaluate(node=>getComputedStyle(node).animationName),'none','Reduce-motion must disable pulsing');
  const buying=page.locator('article.course-card .btn-buy-card').filter({hasText:'Kup kurs'}).first();
  await buying.waitFor({timeout:18000});
  const courseId=await buying.locator('xpath=ancestor::article[1]').getAttribute('data-course-id');
  assert(courseId,'Paid course card missing unique ID');
  await buying.click();
  await page.waitForURL(url=>url.pathname==='/konto'&&url.searchParams.get('ref')===code&&url.searchParams.get('course')===courseId,{timeout:10000});
  console.log('✓ '+device+' public visitor: 10% footer, reduced motion and referral passed to account');
  await page.goto(origin+'/academy/program-afiliacyjny.html');
  await page.getByRole('link',{name:/Zostań partnerem/}).waitFor();
  await page.getByRole('link',{name:/Potrzebujesz pomocy/}).waitFor();
  await page.goto(origin+'/academy/regulamin-afiliacyjny.html');
  await page.getByText('PIT-11',{exact:false}).first().waitFor();
  await page.goto(origin+'/academy/prywatnosc-afiliacja.html');
  await page.getByText('Stripe Connect',{exact:false}).first().waitFor();
  console.log('✓ '+device+' legal, privacy and required help pages loaded');
 }finally{await page.close();await context.close();}
}
async function partnerRegistration(){
 const context=await chromium.launch({headless:true});
 const page=await context.newPage({viewport:{width:390,height:844}});
 let registered=false, registrationAttempts=0;
 try{
  await exported(page);
  await page.addInitScript(user=>{
   localStorage.setItem('trenerki_ads_consent_v1','no');
   localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify({
     access_token:'test-only',refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user
   }));
  },user);
  await page.route(url=>url.origin===api,async route=>{
   const req=route.request(),path=new URL(req.url()).pathname;
   const json=(obj,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(obj)});
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
   if(path==='/auth/v1/user')return json(user);
   if(path==='/functions/v1/ta-affiliate'){
    const body=req.postDataJSON();
    if(body.action==='status'){
     if(!registered)return json({error:'not_registered'},404);
     return json({ok:true,profile:{code,legal_name:'Tester Partner',partner_type:'individual',status:'active',
       stripe_connected:false,stripe_details_submitted:false,stripe_payouts_enabled:false,stripe_transfers_enabled:false,
       payout_tax_status:'pending',terms_version:'2026-11-17-v1'},
       policy:{commission_percent:10,min_payout_grosze:15000,hold_days:30,payouts_live:false,terms_version:'2026-11-17-v1'},
       totals:{pending_grosze:0,approved_grosze:0,in_process_grosze:0,transferred_grosze:0,total_sales:0},
       transactions:[],payouts:[]});
    }
    if(body.action==='register'){
     registrationAttempts++;
     assert.equal(body.partner_type,'individual');
     assert.equal(body.adult_confirmed,true);
     assert.equal(body.privacy_acknowledged,true);
     assert.equal(body.terms_accepted,true);
     assert.equal(body.tax_residency,'PL');
     registered=true;return json({ok:true,code,registration:true});
    }
    return json({error:'onboarding_pending'},409);
   }
   if(path.startsWith('/rest/v1/'))return json([]);
   return json({});
  });
  await page.goto(origin+'/partner',{waitUntil:'domcontentloaded'});
  const name=page.getByRole('textbox',{name:'Imię i nazwisko albo nazwa firmy'});
  await name.waitFor({timeout:12000});
  await name.fill('Tester Partner');
  for(const label of [/Potwierdzam, że mam ukończone 18 lat/,/Zapoznałem\(-am\) się z regulaminem/,/Zapoznałem\(-am\) się z informacją/]){
    await page.getByRole('checkbox',{name:label}).click();
  }
  await page.getByRole('button',{name:'Załóż konto partnerskie'}).click();
  await page.getByText('Twój panel partnerski').waitFor({timeout:12000});
  assert.equal(registrationAttempts,1,'Partner may register exactly once');
  assert.equal(await page.getByRole('textbox',{name:'Twój link afiliacyjny'}).inputValue(),
   'https://trenerki.com/academy/index.html?ref='+code);
  await page.getByText(/Wypłaty programu oczekują/).waitFor();
  console.log('✓ simulated mobile user: authenticated registration, legal checkboxes, code, earnings and payout hold');
 }finally{await page.close();await context.close();}
}
const chrome=await chromium.launch({headless:true}),safari=await webkit.launch({headless:true});
try{
 await runBrowser(chrome,'desktop');
 await runBrowser(safari,'phone');
 await partnerRegistration();
}finally{await chrome.close();await safari.close();}
