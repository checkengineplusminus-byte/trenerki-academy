import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.TRENERKI_PLAYWRIGHT_MODULE||'playwright');
const origin=new URL(process.argv[2]||'http://127.0.0.1:8789').origin;
const project='https://kcvvixcjuwglfvdpypzs.supabase.co';
const output=process.env.TRENERKI_GIFT_SCREENSHOTS||'/tmp/trenerki-gift-card-ui';
const user={id:'00000000-0000-4000-a000-000000000001',email:'owner@example.test',email_confirmed_at:'2026-11-13T00:00:00Z',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};
const issueRequests=[],resendRequests=[],pdfRequests=[],redeemRequests=[],batches=[],signInRequests=[],printRequests=[];
let authSignedIn=true,failFirstIssue=true,redeemError='wrong_email';
const pdfBase64=Buffer.from('%PDF-1.7\n% Mock payload for testing the download boundary.\n').toString('base64');
const browser=await chromium.launch({headless:true,...(process.env.TRENERKI_CHROMIUM_EXECUTABLE?{executablePath:process.env.TRENERKI_CHROMIUM_EXECUTABLE}:{})});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});
 await page.route(url=>url.origin!==origin&&url.origin!==project,route=>route.abort());
 await page.addInitScript(({user})=>{
  if(sessionStorage.getItem('gift-test-logged-out')!=='true')localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify({access_token:'test-token',refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}));
 },{user});
 await page.route(url=>url.origin===origin&&['/admin','/prezent','/konto'].includes(url.pathname),async route=>{
  const url=new URL(route.request().url());url.pathname+='.html';
  return route.fulfill({response:await route.fetch({url:url.href})});
 });
 // Every Supabase request is mocked; this test never issues a real voucher or email.
 await page.route(url=>url.origin===project,async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'apikey,authorization,content-type,x-client-info','access-control-allow-methods':'GET,POST,OPTIONS'};
  const json=(x,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(x)});
  if(req.method()==='OPTIONS')return route.fulfill({headers,status:204});
  if(path==='/auth/v1/user')return authSignedIn?json(user):json({message:'Auth session missing'},401);
  if(path==='/auth/v1/token'){
   signInRequests.push(req.postDataJSON());authSignedIn=true;
   return json({access_token:'test-token',refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user});
  }
  if(path.startsWith('/rest/v1/'))return json([]);
  if(path==='/functions/v1/ta-academy'){
   const body=req.postDataJSON();
   if(body.action==='whoami')return json({ok:true,is_admin:true});
   if(body.action==='admin_dashboard')return json({ok:true,users:[],counts:{users:1,courses:0,active_or_demo_access:0}});
   if(body.action==='my_gifts')return json({gifts:[]});
   if(body.action==='redeem_gift'){redeemRequests.push(body);return json({error:'test_requires_explicit_redemption'},409);}
   throw new Error('Unexpected academy action: '+body.action);
  }
  if(path==='/functions/v1/ta-admin-analytics'){
   const metric={new_users:0,purchases:0,gifts:0,revenue_grosze:0,unique_buyers:0};
   return json({ok:true,timezone:'Europe/Warsaw',totals:{users:1,purchases:0,gifts:0,revenue_grosze:0},today:metric,current_month:metric,current_year:metric,daily:[],monthly:[],yearly:[],orders:[]});
  }
  if(path==='/functions/v1/ta-gift-print'){
   const body=req.postDataJSON();assert.equal(body.action,'pdf');printRequests.push(body);
   return json({ok:true,pdf_base64:pdfBase64,filename:'TRENERKI-karta-z-kodu.pdf'});
  }
  if(path!=='/functions/v1/ta-credit')throw new Error('Unexpected backend request: '+path);
  const body=req.postDataJSON();
  if(body.action==='admin_list_promo')return json({ok:true,batches:[...batches].reverse()});
  if(body.action==='admin_issue_promo'){
   issueRequests.push(body);
   let batch=batches.find(item=>item.id===body.request_id);
   if(!batch){
    batch={id:body.request_id,recipient_email:body.recipient_email,amount_grosze:body.amount_grosze,quantity:body.quantity,transferable:body.transferable,created_at:'2026-11-13T10:00:00Z',recipient_email_sent_at:null,cards:Array.from({length:body.quantity},(_,i)=>{
     const code='TW-'+String(batches.length*10+i+1).padStart(16,'0');
     return {id:'00000000-0000-4000-a000-'+String(batches.length*10+i+1).padStart(12,'0'),code,link:'https://trenerki.com/prezent?code='+code,amount_grosze:body.amount_grosze,transferable:body.transferable,expires_at:'2029-11-13T10:00:00Z',status:'issued'};
    })};
    batches.push(batch);
   }
   if(failFirstIssue){
    failFirstIssue=false;
    // Mimics an uncertain transport/server result after the transaction committed.
    await new Promise(resolve=>setTimeout(resolve,180));
    return json({error:'temporary_error'},503);
   }
   return json({ok:true,batch_id:batch.id,recipient_email:batch.recipient_email,quantity:batch.quantity,total_grosze:batch.amount_grosze*batch.quantity,email_sent:!!batch.recipient_email_sent_at,cards:batch.cards});
  }
  if(body.action==='admin_resend_promo'){
   resendRequests.push(body);
   const batch=batches.find(item=>item.id===body.batch_id);assert.ok(batch);
   batch.recipient_email_sent_at='2026-11-13T10:05:00Z';
   return json({ok:true,email_sent:true});
  }
  if(body.action==='admin_card_pdf'){
   pdfRequests.push(body);assert.ok(batches.some(batch=>batch.cards.some(card=>card.id===body.card_id)));
   return json({ok:true,pdf_base64:pdfBase64,filename:'TRENERKI-karta-testowa.pdf'});
  }
  if(body.action==='redeem'){
   redeemRequests.push(body);
   return json({error:redeemError},redeemError==='wrong_email'?403:409);
  }
  throw new Error('Unexpected credit action: '+body.action);
 });
 async function openForm(){
  await page.getByText('Karta na kwotę',{exact:true}).click();
  assert.equal(await page.getByRole('radio',{name:'Do przekazania dalej'}).getAttribute('aria-checked'),'true','new admin cards must default to delivery-only transfer mode');
  await page.getByRole('textbox',{name:'Liczba kart',exact:true}).fill('3');
  await page.getByRole('textbox',{name:'Wartość jednej karty w złotych',exact:true}).fill('100');
  await page.getByRole('textbox',{name:'E-mail do wysyłki kart PDF',exact:true}).fill('foundation@example.test');
  await page.getByRole('textbox',{name:'Dedykacja na kartach',exact:true}).fill('Na nowe umiejętności!');
  await page.getByText('Łączna wartość: 300,00 zł',{exact:true}).waitFor();
 }
 await page.goto(origin+'/admin');
 await openForm();
 // Two synchronous clicks hit the same render; the ref lock must stop the second.
 await page.getByRole('button',{name:'Wystaw i wyślij karty PDF',exact:true}).evaluate(button=>{button.click();button.click();});
 await page.getByRole('alert').filter({hasText:'Nie udało się wykonać operacji.'}).waitFor();
 assert.equal(issueRequests.length,1,'double-click must create only one request');
 assert.equal(batches.length,1);
 assert.equal(issueRequests[0].quantity,3);assert.equal(issueRequests[0].amount_grosze,10000);assert.equal(issueRequests[0].transferable,true);
 // Reload loses React state but keeps the same request key in sessionStorage.
 await page.reload();await openForm();
 await page.getByRole('button',{name:'Wystaw i wyślij karty PDF',exact:true}).click();
 await page.getByText('Karty gotowe · 300,00 zł',{exact:true}).waitFor();
 assert.equal(issueRequests.length,2);assert.equal(issueRequests[1].request_id,issueRequests[0].request_id,'retry after reload must reuse the original request');
 assert.equal(batches.length,1,'retry must not create another batch');
 assert.equal(await page.getByRole('button',{name:'Pobierz PDF karty',exact:false}).count(),3);
 assert.equal(await page.getByRole('button',{name:'Ten pakiet jest już wystawiony',exact:true}).isDisabled(),true);
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Pobierz PDF karty 1',exact:true}).click()]);
 assert.equal(download.suggestedFilename(),'TRENERKI-karta-testowa.pdf');
 assert.equal(pdfRequests.length,1);
 await page.getByRole('button',{name:'Ponów wysyłkę tych samych kart',exact:true}).click();
 await page.getByText('Wiadomość z PDF-ami przyjęto do wysyłki na foundation@example.test.',{exact:true}).waitFor();
 assert.equal(resendRequests.length,1);assert.equal(resendRequests[0].batch_id,issueRequests[0].request_id);assert.equal(issueRequests.length,2,'resend must not issue cards');
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false,'mobile layout must not overflow horizontally');
 await mkdir(output,{recursive:true});await page.screenshot({path:output+'/admin-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Nowy pakiet →',exact:true}).click();
 await page.getByRole('button',{name:'Wystaw i wyślij karty PDF',exact:true}).click();
 await page.getByText('Karty gotowe · 300,00 zł',{exact:true}).waitFor();
 assert.equal(issueRequests.length,3);assert.notEqual(issueRequests[2].request_id,issueRequests[0].request_id,'an explicit new batch needs a new request ID');
 assert.equal(batches.length,2);
 await page.goto(origin+'/prezent');
 const code='TW-00000000 00000000 00000000 00000001';
 await page.getByRole('textbox',{name:'Kod karty podarunkowej',exact:true}).fill(code);
 await page.getByText('Odbierz prezent →',{exact:true}).click();
 await page.getByText('Ta karta jest przypisana do innego adresu e-mail. Zaloguj się na konto z adresem podanym na karcie lub w wiadomości.',{exact:true}).waitFor();
 assert.equal(redeemRequests[0].code,'TW-00000000000000000000000000000001','printed spaces must be ignored');
 redeemError='code_used_or_expired';
 await page.getByText('Odbierz prezent →',{exact:true}).click();
 await page.getByText('Ten kod został już odebrany lub stracił ważność. Jeśli karta była odebrana przez Ciebie, sprawdź saldo na swoim koncie.',{exact:true}).waitFor();
 assert.equal(redeemRequests.length,2);
 const samples=[
  {input:' ta-wgv9-znq8 gx6q-hkmx ',canonical:'TA-WGV9ZNQ8GX6QHKMX'},
  {input:'tw-eg0b-sm08 s7jd-4vfy',canonical:'TW-EG0BSM08S7JD4VFY'},
  {input:'ta-12345678 1234 4234-9234-123456789abc',canonical:'TA-12345678123442349234123456789ABC'},
  {input:'tw-12345678 1234 4234-9234-123456789abc',canonical:'TW-12345678123442349234123456789ABC'},
 ];
 for(const sample of samples){
  authSignedIn=false;
  await page.evaluate(()=>{
   sessionStorage.setItem('gift-test-logged-out','true');
   localStorage.removeItem('sb-kcvvixcjuwglfvdpypzs-auth-token');
  });
  await page.goto(origin+'/prezent?code='+encodeURIComponent(sample.input));
  const entered=page.getByRole('textbox',{name:'Kod karty podarunkowej',exact:true});
  await entered.waitFor();assert.equal(await entered.inputValue(),sample.canonical,'link must prefill new and legacy codes');
  assert.equal(redeemRequests.length,2,'opening a link must not redeem');
  await page.getByText('Odbierz prezent →',{exact:true}).click();
  await page.waitForURL(url=>url.pathname==='/konto'&&url.searchParams.get('gift')===sample.canonical);
  await page.getByText('Mam już konto — zaloguj',{exact:true}).click();
  await page.getByPlaceholder('Adres e-mail',{exact:true}).fill('recipient@example.test');
  await page.getByPlaceholder('Hasło (minimum 8 znaków)',{exact:true}).fill('test-password');
  await page.getByText('Zaloguj się',{exact:true}).click();
  await page.waitForURL(url=>url.pathname==='/prezent'&&url.searchParams.get('code')===sample.canonical);
  await entered.waitFor();assert.equal(await entered.inputValue(),sample.canonical,'login must retain the code');
  assert.equal(redeemRequests.length,2,'login must not automatically redeem');
  // Keep the session written by the actual auth client; the init script no longer seeds it.
  await page.reload();await entered.waitFor();assert.equal(await entered.inputValue(),sample.canonical);
  const [printed]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Pobierz PDF tego kodu',exact:true}).click()]);
  assert.equal(printed.suggestedFilename(),'TRENERKI-karta-z-kodu.pdf');
  assert.equal(printRequests.at(-1).code,sample.canonical);
  assert.equal(redeemRequests.length,2,'restoring a session and downloading must not redeem');
 }
 assert.equal(signInRequests.length,4);
 console.log('Gift card UI passed: default transfer mode, three-card batches, retry key and lock, PDF/resend, mobile layout, redemption errors; new and legacy TA/TW links through sign-in, persisted session and PDF without automatic redemption.');
}finally{await browser.close();}
