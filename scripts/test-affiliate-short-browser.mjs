#!/usr/bin/env node
// Synthetic, isolated browser audit. Never queries live users or performs a payment.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const origin=new URL(process.argv[2]||'http://127.0.0.1:8787').origin;
const fakeCode='TA000000000001';
const browser=await chromium.launch({headless:true});

async function check(mode,number,responseStatus){
 const context=await browser.newContext({viewport:mode==='mobile'?{width:390,height:844}:{width:1366,height:850}});
 const page=await context.newPage();
 let hits=0;
 try{
  await page.route(url=>url.origin===origin&&url.pathname==='/referral',async route=>{
   const response=await route.fetch({url:origin+'/referral.html'});
   await route.fulfill({response});
  });
  await page.route(url=>url.hostname==='kcvvixcjuwglfvdpypzs.supabase.co'&&url.pathname==='/functions/v1/ta-affiliate-resolve',async route=>{
   hits++;
   const url=new URL(route.request().url());
   assert.equal(url.searchParams.get('id'),String(number));
   await route.fulfill({
    status:responseStatus,
    contentType:'application/json',
    headers:{'access-control-allow-origin':'*','cache-control':'no-store'},
    body:JSON.stringify(responseStatus===200?{ok:true,ref:fakeCode}:{error:'partner_not_found'})
   });
  });
  // Never query production Supabase data during a synthetic browser test.
  await page.route(url=>url.hostname==='kcvvixcjuwglfvdpypzs.supabase.co'&&url.pathname.startsWith('/rest/v1/'),
   route=>route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'[]'}));
  const url=origin+'/referral?affiliateNumber='+number;
  await page.goto(url,{waitUntil:'domcontentloaded'});
  if(responseStatus===200&&/^\d+$/.test(String(number))){
   await page.waitForURL(target=>target.pathname==='/academy/index.html'&&target.searchParams.get('ref')===fakeCode,{timeout:13000});
   const actual=await page.evaluate(()=>typeof window.taAffiliateCode==='function'?window.taAffiliateCode():'');
   assert.equal(actual,fakeCode,'Legacy catalog must receive the signed 10% commission code');
   assert.equal(hits,1,'Public lookup should happen exactly once');
   console.log('✓ '+mode+' short referral resolved: /'+number+' → catalog → '+actual);
  }else{
   await page.getByText(/nie jest dostępny|nieprawidłowy/i).waitFor({timeout:13000});
   assert.equal(hits,responseStatus===400?0:1);
   assert.equal(page.url(),url,'Invalid partner must not be redirected to somebody else');
   console.log('✓ '+mode+' rejects invalid or suspended affiliate number '+number);
  }
 }finally{await page.close();await context.close();}
}
try{
 await check('desktop','1',200);
 await check('mobile','15',200);
 await check('desktop','999',404);
 await check('mobile','000',400);
}finally{await browser.close();}
