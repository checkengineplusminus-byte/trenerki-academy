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
async function checkPartnerPanel(){
 const context=await browser.newContext({viewport:{width:1366,height:900},acceptDownloads:true});
 const page=await context.newPage();
 const user={id:'00000000-0000-4000-a000-000000000047',email:'partner@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};
 try{
  await page.addInitScript(({user})=>{
   localStorage.setItem('trenerki_ads_consent_v1','no');
   localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify({
    access_token:'synthetic-token',refresh_token:'synthetic-refresh',expires_at:Math.floor(Date.now()/1000)+3600,
    expires_in:3600,token_type:'bearer',user
   }));
  },{user});
  await page.route(url=>url.origin===origin&&url.pathname==='/partner',async route=>{
   const response=await route.fetch({url:origin+'/partner.html'});
   await route.fulfill({response});
  });
  await page.route(url=>url.hostname==='kcvvixcjuwglfvdpypzs.supabase.co',async route=>{
   const req=route.request(),url=new URL(req.url());
   const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'apikey,authorization,content-type,x-client-info','content-type':'application/json'};
   if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
   if(url.pathname==='/auth/v1/user')return route.fulfill({status:200,headers,body:JSON.stringify(user)});
   if(url.pathname==='/functions/v1/ta-affiliate')return route.fulfill({status:200,headers,body:JSON.stringify({
    ok:true,profile:{code:'TA000000000007',short_id:7,partner_type:'individual',legal_name:'Partner Próbny',
      status:'active',stripe_details_submitted:false,stripe_connected:false,stripe_payouts_enabled:false,
      stripe_transfers_enabled:false,payout_tax_status:'pending',terms_version:'2026-11-18-v2'},
    policy:{commission_percent:10,min_payout_grosze:30000,hold_days:30,payouts_live:false,terms_version:'2026-11-18-v2'},
    totals:{pending_grosze:0,approved_grosze:0,in_process_grosze:0,transferred_grosze:0,total_sales:0},
    transactions:[],payouts:[]
   })});
   return route.fulfill({status:200,headers,body:'[]'});
  });
  await page.goto(origin+'/partner',{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:'Polecaj wiedzę. Zarabiaj 10%.'}).waitFor();
  const input=page.getByRole('textbox',{name:'Twój link afiliacyjny'});
  await input.waitFor({timeout:15000});
  assert.equal(await input.inputValue(),'https://trenerki.com/7','Partner profile must prefer short link');
  const [svg]=await Promise.all([
   page.waitForEvent('download'),page.getByRole('link',{name:/Pobierz logo SVG/}).click()
  ]);
  assert.equal(svg.suggestedFilename(),'TRENERKI_Academy_logo.svg');
  const [png]=await Promise.all([
   page.waitForEvent('download',{timeout:15000}),page.getByRole('button',{name:'Pobierz logo PNG'}).click()
  ]);
  assert.equal(png.suggestedFilename(),'TRENERKI_Academy_logo.png');
  console.log('✓ Partner portal: /7, owner code kept private, logo SVG and PNG downloaded');
 }finally{await page.close();await context.close();}
}
try{
 await check('desktop','1',200);
 await check('mobile','15',200);
 await check('desktop','999',404);
 await check('mobile','000',400);
 await checkPartnerPanel();
}finally{await browser.close();}
