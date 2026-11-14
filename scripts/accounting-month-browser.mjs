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
 const documents=Array.from({length:36},(_,i)=>{
  const n=i+1,kind=n===1||n===3?'bank_in':'formal';
  return {id:id(n),date:'2026-01-'+String(Math.min(n,28)).padStart(2,'0'),
   title:'Fikcyjny dowód testowy '+id(n),kind,amount_pln:n===1?60000:n===3?8000:0,
   fictional:true,source_verification:'training_only'};
 });
 const entries=Object.fromEntries(documents.map(d=>[d.id,{
  lines:d.id==='D01'?entry('130','800',6000000):d.id==='D03'?entry('130','240',800000):[],
  explanation:'Fikcyjny wzorzec rachunkowy bez podatków i bez realnych zobowiązań.'
 }]));
 const model={id:'core-v3-firma-demo-2026-01-v1',month:'2026-01',version:1,currency:'PLN',
  company:'Fikcyjna Spółka Testowa',fictional:true,documents,
  journal_practice_v1:{version:1,currency:'PLN',
   accounts:{'130':'Bank szkoleniowy','800':'Kapitał szkoleniowy','240':'Pożyczka szkoleniowa',
    '201':'Należności','310':'Materiały','010':'Maszyna','070':'Umorzenie','079':'Odpis',
    '202':'Dostawcy','700':'Sprzedaż','400':'Koszty','401':'Zużycie','404':'Płace','751':'Odsetki'},
   entries,reconciliation:{bank:68000,receivables:0,inventory:0,machine:0,
    trade_payables:0,loan:8000,profit:0}}
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
 await pass('Kwoty bankowe 68 000/0/68 000 są zapisane jako ćwiczenie, nie dekret',async()=>{
  await f.page.locator('#sim-bank-in').fill('68000,00');
  await f.page.locator('#sim-bank-out').fill('0,00');
  await f.page.locator('#sim-bank-net').fill('68000,00');
  const prior=f.model().version;
  await f.page.locator('button[data-action="sim-bank-save"]').click();
  await saved(f,prior);
  assert.equal(f.model().state.simulator_bank_exercise_v1.bank_net_cents,6800000);
  assert.equal(f.model().state.journals.length,0);
 });
 await pass('36 decyzji Wn/Ma przez interfejs: 2 dekrety i 34 świadome braki',async()=>{
  for(const d of manifest.documents){
   await choose(f.page,'#sim-journal-doc',d.id);
   if(d.id==='D01'||d.id==='D03'){
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
    ((d.id==='D01'||d.id==='D03')?'sim-journal-save':'sim-journal-none')+'"]').click();
   await saved(f,prior);
  }
  const entries=f.model().state.simulator_journal_attempts_v1.entries;
  assert.equal(Object.keys(entries).length,36);
  assert.equal(Object.values(entries).filter(x=>x.lines.length>0).length,2);
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
