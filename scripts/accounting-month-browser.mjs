#!/usr/bin/env node
/**
 * Real Chromium + entirely fictional local API for the D01–D36 training UI.
 * Strictly NO live Supabase authentication, RLS override, bank calls or purchases.
 * Full browser interaction: classification, bank, Wn/Ma, closing, reload, CAS conflict.
 * This is NOT an authorized two-account E2E, tax review or independent restore.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readScenario,inspectReferenceMonth,auditMonthWorkflow} from '../src/accounting/simulator-core.js';
const origin=new URL(process.argv[2]||'http://127.0.0.1:8787').origin;
assert.match(origin,/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/,'Only a localhost Expo export is allowed.');
const api='https://kcvvixcjuwglfvdpypzs.supabase.co';
const user={id:'00000000-0000-4000-a000-000000000011',email:'fictional-month@example.test',
 aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};
const cors={'access-control-allow-origin':origin,
 'access-control-allow-headers':'apikey,authorization,content-type,x-client-info,accept-profile,content-profile,prefer',
 'access-control-allow-methods':'GET,POST,OPTIONS'};
const id=n=>'D'+String(n).padStart(2,'0');
const entry=(debit,credit,amount)=>[
 {account:debit,debit_cents:amount,credit_cents:0},
 {account:credit,debit_cents:0,credit_cents:amount}
];
function scenario(){
 // Completely invented entries: 29 training postings, 16 bank documents,
 // 7 nonposting documents. No paid course content or real clients.
 const events=[
  ['bank_in',100000,'130','800',100000], // fictitious capital
  ['purchase',9000,'310','202',9000], // material invoice
  ['bank_out',9000,'202','130',9000],
  ['sale',15000,'201','700',15000],
  ['bank_in',12000,'130','201',12000],
  ['purchase',1000,'400','202',1000],
  ['bank_out',1000,'202','130',1000],
  ['sale',8000,'201','700',8000],
  ['bank_in',8000,'130','201',8000],
  ['payroll',7000,'404','231',7000],
  ['bank_out',5500,'231','130',5500],
  ['bank_out',1500,'231','130',1500],
  ['asset',12000,'010','202',12000],
  ['bank_out',12000,'202','130',12000],
  ['warehouse',6000,'401','310',6000],
  ['bank_in',10000,'130','240',10000],
  ['bank_out',2000,'240','130',2000],
  ['bank_out',200,'751','130',200],
  ['bank_out',100,'400','130',100],
  ['sale',12000,'201','700',12000],
  ['bank_in',10000,'130','201',10000],
  ['correction',-2000,'700','201',2000],
  ['bank_out',2000,'400','130',2000],
  ['asset',1000,'400','070',1000],
  ['bank_out',600,'400','130',600],
  ['bank_in',5000,'130','240',5000],
  ['warehouse',3000,'310','202',3000],
  ['purchase',500,'400','202',500],
  ['purchase',300,'400','202',300]
 ];
 for(let n=30;n<=36;n++)events.push(['formal',0,null,null,0]);
 const documents=events.map(([kind,amount],i)=>({
  id:id(i+1),date:'2026-01-'+String(Math.min(i+1,28)).padStart(2,'0'),
  title:'Fikcyjny dowód testowy '+id(i+1),kind,amount_pln:amount,
  fictional:true,source_verification:'training_only'
 }));
 const entries=Object.fromEntries(events.map(([kind,amount,debit,credit,value],i)=>[
  id(i+1),{lines:debit?entry(debit,credit,value*100):[],
   explanation:'Fikcyjny wzorzec rachunkowy bez VAT, ZUS i realnych zobowiązań.'}
 ]));
 const model={id:'core-v3-firma-demo-2026-01-v1',month:'2026-01',version:1,
  currency:'PLN',company:'Fikcyjna Spółka Testowa',fictional:true,documents,
  journal_practice_v1:{version:1,currency:'PLN',
   accounts:{'130':'Bank szkoleniowy','800':'Kapitał szkoleniowy','240':'Pożyczka szkoleniowa',
    '201':'Należności','310':'Materiały','010':'Maszyna','070':'Umorzenie','079':'Odpis',
    '202':'Dostawcy','700':'Sprzedaż','400':'Koszty','401':'Zużycie','404':'Płace',
    '751':'Odsetki','231':'Wynagrodzenia szkoleniowe'},
   entries,reconciliation:{bank:111100,receivables:3000,inventory:6000,machine:11000,
    trade_payables:3800,loan:13000,profit:14300}}
 };
 assert.equal(readScenario(model).documents.length,36);
 assert.deepEqual(inspectReferenceMonth(model),{ok:true,issues:[],checked_documents:36});
 return model;
}
const manifest=scenario();
const initial=()=>({id:'00000000-0000-4000-a000-000000000012',user_id:user.id,
 name:'Fikcyjna Spółka Testowa',version:1,updated_at:'2026-11-14T12:00:00Z',
 state:{schema_version:1,invoices:[],bank:[],journals:[],matches:[]}});
const browser=await chromium.launch({headless:true});let checks=0;
async function pass(name,work){await work();checks++;console.log('OK '+checks+' — '+name);}
async function fixture(viewport){
 const context=await browser.newContext({viewport,acceptDownloads:true,serviceWorkers:'block'});
 await context.addInitScript(({user})=>{
  localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify({
   access_token:'synthetic-local-token-never-accepted-by-a-server',
   refresh_token:'synthetic-local-refresh',expires_at:Math.floor(Date.now()/1000)+3600,
   expires_in:3600,token_type:'bearer',user}));
 },{user});
 const page=await context.newPage();
 let workspace=initial(),saves=0;const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route(url=>url.origin!==origin&&url.origin!==api,route=>route.fulfill({status:200,body:''}));
 await page.route(url=>url.origin===origin&&url.pathname==='/biuro-ksiegowe',
  async route=>{const response=await route.fetch({url:origin+'/biuro-ksiegowe.html'});
   await route.fulfill({response});});
 await page.route(url=>url.origin===api,async route=>{
  const request=route.request(),url=new URL(request.url());
  const reply=(body,status=200)=>route.fulfill({status,headers:cors,
   contentType:'application/json',body:JSON.stringify(body)});
  if(request.method()==='OPTIONS')return route.fulfill({headers:cors,status:204});
  if(url.pathname==='/auth/v1/user')return reply(user);
  if(url.pathname==='/auth/v1/logout')return reply({});
  if(url.pathname==='/rest/v1/rpc/ta_accounting_overview')
   return reply({is_editor:true,active_program:{sections:10,topics:100},published:false});
  if(url.pathname==='/rest/v1/ta_accounting_core_materials_v3')
   return reply({material:{scenario:manifest}});
  if(url.pathname==='/rest/v1/ta_accounting_lab_workspaces')
   return reply(url.searchParams.has('id')?workspace:[{
    id:workspace.id,name:workspace.name,version:workspace.version,updated_at:workspace.updated_at}]);
  if(url.pathname==='/rest/v1/rpc/ta_accounting_lab_save'){
   const sent=request.postDataJSON();
   if(sent.workspace_id!==workspace.id||sent.expected_version!==workspace.version)
    return reply({code:'40001',message:'Wersja już zmieniona w drugim oknie.'},409);
   workspace={...workspace,state:sent.next_state,version:workspace.version+1,
    updated_at:new Date().toISOString()};
   saves++;return reply(workspace);
  }
  return reply([]);
 });
 return {page,context,errors,model:()=>workspace,saves:()=>saves,
  bump:()=>{workspace={...workspace,version:workspace.version+1};}};
}
async function saved(f,prior){
 await f.page.waitForFunction(v=>{
  const t=document.querySelector('[role="status"]')?.textContent||'';
  return t.includes('wersja '+v);
 },prior+1,{timeout:15000});
 assert.equal(f.model().version,prior+1);
}
const tab=page=>page.locator('button[data-action="tab"][data-id="simulator"]');
const choose=(page,selector,value)=>page.locator(selector).selectOption(value);
try{
 const f=await fixture({width:1280,height:960});
 await f.page.goto(origin+'/biuro-ksiegowe');
 await tab(f.page).waitFor();
 await tab(f.page).click();
 await f.page.getByRole('heading',{name:'Rozpoznaj 36 dokumentów z jednego miesiąca'}).waitFor();
 await pass('Pierwszy etap udostępnia 36 fikcyjnych dokumentów',async()=>{
  assert.equal(await f.page.locator('#sim-doc option').count(),36);
  assert.equal(await f.page.locator('#sim-journal-doc option').count(),36);
  assert.deepEqual(f.errors,[]);
 });
 await pass('Klasyfikacja D01–D36 zapisuje rzeczywiście 36 odpowiedzi przez UI',async()=>{
  for(const d of manifest.documents){
   await choose(f.page,'#sim-doc',d.id);
   await choose(f.page,'#sim-kind',d.kind);
   const prior=f.model().version;
   await f.page.locator('button[data-action="sim-save"]').click();
   await saved(f,prior);
  }
  assert.equal(Object.keys(f.model().state.simulator_attempts_v1.answers).length,36);
  assert.equal(f.saves(),36);
 });
 await pass('Kwoty bankowe 145 000/33 900/111 100 są zapisane jako ćwiczenie, nie dekret',async()=>{
  await f.page.locator('#sim-bank-in').fill('145000,00');
  await f.page.locator('#sim-bank-out').fill('33900,00');
  await f.page.locator('#sim-bank-net').fill('111100,00');
  const prior=f.model().version;
  await f.page.locator('button[data-action="sim-bank-save"]').click();
  await saved(f,prior);
  assert.equal(f.model().state.simulator_bank_exercise_v1.bank_net_cents,11110000);
  assert.equal(f.model().state.journals.length,0);
 });
 await pass('36 decyzji Wn/Ma przez interfejs: 29 dekretów i 7 świadomych braków',async()=>{
  for(const d of manifest.documents){
   await choose(f.page,'#sim-journal-doc',d.id);
   if(manifest.journal_practice_v1.entries[d.id].lines.length){
    const source=manifest.journal_practice_v1.entries[d.id].lines;
    for(const [i,row] of source.entries()){
     await choose(f.page,'[data-jline="'+i+'"][data-jfield="account"]',row.account);
     await f.page.locator('[data-jline="'+i+'"][data-jfield="debit"]')
      .fill((row.debit_cents/100).toFixed(2).replace('.',','));
     await f.page.locator('[data-jline="'+i+'"][data-jfield="credit"]')
      .fill((row.credit_cents/100).toFixed(2).replace('.',','));
    }
   }
   const prior=f.model().version;
   await f.page.locator('button[data-action="'+
    (manifest.journal_practice_v1.entries[d.id].lines.length?'sim-journal-save':'sim-journal-none')+'"]').click();
   await saved(f,prior);
  }
  const entries=f.model().state.simulator_journal_attempts_v1.entries;
  assert.equal(Object.keys(entries).length,36);
  assert.equal(Object.values(entries).filter(x=>x.lines.length>0).length,29);
  assert.equal(f.model().state.journals.length,0);
 });
 await pass('Kontrola przekrojowa i zamknięcie miesiąca przechodzą 5/5',async()=>{
  const audit=auditMonthWorkflow(manifest,f.model().state);
  assert.equal(audit.training_consistent,true);
  assert.equal(audit.passed,5);
  assert.equal(audit.reference_integrity,'passed');
  assert.equal(audit.bank_difference_cents,0);
  assert.equal(f.saves(),73);
  assert.match(await f.page.locator('body').innerText(),/Wewnętrzne etapy są zgodne \(5\/5\)/);
 });
 await pass('Pełny stan po odświeżeniu strony odtwarza 36/36 odpowiedzi',async()=>{
  await f.page.reload();
  await tab(f.page).waitFor();
  await tab(f.page).click();
  await f.page.waitForFunction(()=>document.querySelector('#sim-doc option')?.value==='D01');
  const audit=auditMonthWorkflow(manifest,f.model().state);
  assert.equal(audit.training_consistent,true);
  assert.match(await f.page.locator('body').innerText(),/Wewnętrzne etapy są zgodne \(5\/5\)/);
 });
 await pass('Błędna klasyfikacja dokumentu blokuje odbiór, poprawa przywraca 5/5',async()=>{
  await choose(f.page,'#sim-doc','D02');
  await choose(f.page,'#sim-kind','sale');
  let prior=f.model().version;
  await f.page.locator('button[data-action="sim-save"]').click();
  await saved(f,prior);
  let audit=auditMonthWorkflow(manifest,f.model().state);
  assert.equal(audit.training_consistent,false);
  assert.equal(audit.checks.find(x=>x.key==='classification').passed,false);
  assert.equal(audit.checks.find(x=>x.key==='closing').passed,true);
  await choose(f.page,'#sim-kind','purchase');
  prior=f.model().version;
  await f.page.locator('button[data-action="sim-save"]').click();
  await saved(f,prior);
  audit=auditMonthWorkflow(manifest,f.model().state);
  assert.equal(audit.training_consistent,true);
 });
 await pass('Błędne saldo banku jest wykrywane, ale nie niszczy dekretów',async()=>{
  await f.page.locator('#sim-bank-net').fill('111099,00');
  let prior=f.model().version;
  await f.page.locator('button[data-action="sim-bank-save"]').click();
  await saved(f,prior);
  let audit=auditMonthWorkflow(manifest,f.model().state);
  assert.equal(audit.training_consistent,false);
  assert.equal(audit.checks.find(x=>x.key==='bank').passed,false);
  assert.equal(Object.keys(f.model().state.simulator_journal_attempts_v1.entries).length,36);
  await f.page.locator('#sim-bank-net').fill('111100,00');
  prior=f.model().version;
  await f.page.locator('button[data-action="sim-bank-save"]').click();
  await saved(f,prior);
  audit=auditMonthWorkflow(manifest,f.model().state);
  assert.equal(audit.training_consistent,true);
 });
 await pass('Zły dekret Wn/Ma zostaje wskazany i po korekcie znów mamy 5/5',async()=>{
  await choose(f.page,'#sim-journal-doc','D01');
  await choose(f.page,'[data-jline="1"][data-jfield="account"]','201');
  let prior=f.model().version;
  await f.page.locator('button[data-action="sim-journal-save"]').click();
  await saved(f,prior);
  let audit=auditMonthWorkflow(manifest,f.model().state);
  assert.equal(audit.training_consistent,false);
  assert.equal(audit.checks.find(x=>x.key==='journal').passed,false);
  await choose(f.page,'[data-jline="1"][data-jfield="account"]','800');
  prior=f.model().version;
  await f.page.locator('button[data-action="sim-journal-save"]').click();
  await saved(f,prior);
  audit=auditMonthWorkflow(manifest,f.model().state);
  assert.equal(audit.training_consistent,true);
  assert.equal(Object.keys(f.model().state.simulator_journal_attempts_v1.entries).length,36);
 });
 await pass('Konflikt CAS odrzuca nowszą zmianę i pozwala pobrać niezapisany stan',async()=>{
  await choose(f.page,'#sim-doc','D01');
  await choose(f.page,'#sim-kind','sale');
  const prev=f.saves();f.bump();
  await f.page.locator('button[data-action="sim-save"]').click();
  await f.page.getByRole('button',{name:'Pobierz niezapisane zmiany'}).waitFor();
  assert.equal(f.saves(),prev);
  assert.equal(f.model().state.simulator_attempts_v1.answers.D01,'bank_in');
  const download=f.page.waitForEvent('download');
  await f.page.getByRole('button',{name:'Pobierz niezapisane zmiany'}).click();
  const stream=await (await download).createReadStream();const chunks=[];
  for await(const x of stream)chunks.push(x);
  const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  assert.equal(body.format,'trenerki-unsaved-conflict-v1');
  assert.equal(body.next_state.simulator_attempts_v1.answers.D01,'sale');
  assert.equal(body.next_state.simulator_journal_attempts_v1.entries.D36.lines.length,0);
 });
 await f.page.screenshot({path:'/tmp/trenerki-accounting-month-desktop.png',fullPage:true});
 assert.deepEqual(f.errors,[]);
 await f.context.close();
 const mobile=await fixture({width:390,height:844});
 await mobile.page.goto(origin+'/biuro-ksiegowe');await tab(mobile.page).waitFor();await tab(mobile.page).click();
 await pass('Mobilna pracownia D01–D36 nie wychodzi poza ekran 390px',async()=>{
  const size=await mobile.page.evaluate(()=>({screen:innerWidth,width:document.documentElement.scrollWidth}));
  assert.ok(size.width<=size.screen+2,JSON.stringify(size));
  assert.deepEqual(mobile.errors,[]);
 });
 await mobile.page.screenshot({path:'/tmp/trenerki-accounting-month-mobile.png',fullPage:true});
 await mobile.context.close();
 console.log(JSON.stringify({passed:checks,tests:checks,mock_api_only:true,
  complete_training_workflow:true,full_runtime_user_e2e:false,
  real_two_account_e2e:'not_tested',independent_backup_restore:'not_tested'}));
}finally{await browser.close();}
