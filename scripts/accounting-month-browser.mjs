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
import {parseBankCSV} from '../src/accounting/lab-core-base.js';
import {inspectScenarioInvoiceBridge} from '../src/accounting/scenario-invoice-bridge.js';
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
async function fixture(viewport,manifestOverride=manifest,initialState={}){
 const context=await browser.newContext({viewport,acceptDownloads:true,serviceWorkers:'block'});
 await context.addInitScript(({user})=>{
  localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify({
   access_token:'synthetic-local-token-never-accepted-by-a-server',
   refresh_token:'synthetic-local-refresh',expires_at:Math.floor(Date.now()/1000)+3600,
   expires_in:3600,token_type:'bearer',user}));
 },{user});
 const page=await context.newPage();
 let workspace=initial(),saves=0;workspace.state={...workspace.state,...structuredClone(initialState)};const errors=[];
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
   return reply({material:{scenario:manifestOverride}});
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
 try{await f.page.waitForFunction(v=>{
  const t=document.querySelector('[role="status"]')?.textContent||'';
  return t.includes('wersja '+v)||t.includes('Powiązano fikcyjną fakturę.');
 },prior+1,{timeout:15000});}
 catch(ex){const detail=await f.page.locator('[role="alert"]').allTextContents();
  throw new Error('Mock save timed out at version '+prior+'; UI errors: '+detail.join(' | '));}
 assert.equal(f.model().version,prior+1);
}
const tab=page=>page.locator('button[data-action="tab"][data-id="simulator"]');
const choose=(page,selector,value)=>page.locator(selector).selectOption(value);
try{

 // End-to-end interaction in LOCAL Chromium only (synthetic API and identity).
 const company={schema_version:1,status:'ready',entity_type:'jdg',record_system:'books',
  vat_status:'active',identity:{legal_name:'Fikcyjna Firma do Testów',
  nip:'9000000016',regon:'',krs:'',address:'ul. Przykładowa 1, 00-001 Testowo',country:'PL'}};
 const verified=await fixture({width:1280,height:900},manifest,{company});
 await verified.page.goto(origin+'/biuro-ksiegowe');
 await verified.page.locator('nav button[data-action="tab"][data-id="invoices"]').waitFor();
 await verified.page.locator('nav button[data-action="tab"][data-id="invoices"]').click();
 await pass('Chromium: firma + adres/NIP nabywcy => wystawiona faktura z migawką obu stron',async()=>{
  await verified.page.locator('#invoice-party').fill('Fikcyjny kontrahent');
  await verified.page.locator('#invoice-party_address').fill('ul. Przykładowa 2, 00-002 Testowo');
  await verified.page.locator('#invoice-party_nip').fill('9000000022');
  const previous=verified.model().version;
  await verified.page.locator('form[data-form="invoice"] button[value="issued"]').click();
  await saved(verified,previous);
  const issued=verified.model().state.invoices[0];
  assert.equal(issued.identity_version,1);
  assert.equal(issued.own_identity.nip,'9000000016');
  assert.equal(issued.counterparty_identity.nip,'9000000022');
  assert.equal(issued.gross_cents,123000);
  await verified.page.reload();
  assert.equal(verified.model().state.invoices[0].identity_version,1);
  assert.deepEqual(verified.errors,[]);
 });
 await verified.context.close();
 const mobileInvoice=await fixture({width:390,height:844},manifest,{company});
 await mobileInvoice.page.goto(origin+'/biuro-ksiegowe');
 await mobileInvoice.page.locator('nav button[data-action="tab"][data-id="invoices"]').waitFor();
 await mobileInvoice.page.locator('nav button[data-action="tab"][data-id="invoices"]').click();
 await pass('Chromium mobile: brak adresu dostawcy blokuje zapis zamiast wymyślać dane',async()=>{
  await mobileInvoice.page.locator('button[data-action="new-purchase"]').click();
  await mobileInvoice.page.locator('#invoice-party').fill('Fikcyjny dostawca');
  await mobileInvoice.page.locator('#invoice-party_nip').fill('9000000022');
  const previous=mobileInvoice.model().version;
  await mobileInvoice.page.locator('form[data-form="invoice"] button[value="issued"]').click();
  await mobileInvoice.page.locator('[role="alert"]').getByText('Uzupełnij adres strony.',{exact:false}).waitFor();
  assert.equal(mobileInvoice.model().version,previous);
  assert.equal(mobileInvoice.saves(),0);
  assert.deepEqual(mobileInvoice.errors,[]);
 });
 await mobileInvoice.context.close();
 const corrupt=structuredClone(manifest);
 // A deliberately malicious-looking yet balanced internal bank posting
 // retains exactly the same net bank amount and overall trial balance.
 // Early preflight must reject it before any learner work is stored.
 corrupt.journal_practice_v1.entries.D01.lines.push(
  {account:'130',debit_cents:100,credit_cents:0},
  {account:'130',debit_cents:0,credit_cents:100}
 );
 assert.equal(inspectReferenceMonth(corrupt).ok,false);
 const blocked=await fixture({width:1280,height:900},corrupt);
 await blocked.page.goto(origin+'/biuro-ksiegowe');
 await tab(blocked.page).waitFor();
 await tab(blocked.page).click();
 await pass('Błędny wzorzec blokuje rozpoczęcie miesiąca bez naruszania zapisów',async()=>{
  await blocked.page.getByText('Wzorzec D01–D36 zawiera niespójności techniczne',{exact:false}).waitFor();
  assert.equal(await blocked.page.locator('#sim-doc').count(),0);
  assert.equal(blocked.saves(),0);
  assert.equal(blocked.model().version,1);
  assert.deepEqual(blocked.errors,[]);
 });
 await blocked.context.close();
 const partial=await fixture({width:1280,height:900});
 await partial.page.goto(origin+'/biuro-ksiegowe');
 await tab(partial.page).waitFor();
 await tab(partial.page).click();
 await pass('Po ponownym otwarciu biura wracamy do pierwszych brakujących D03 i D02',async()=>{
  for(const d of manifest.documents.slice(0,2)){
   await choose(partial.page,'#sim-doc',d.id);
   await choose(partial.page,'#sim-kind',d.kind);
   const before=partial.model().version;
   await partial.page.locator('button[data-action="sim-save"]').click();
   await saved(partial,before);
  }
  await choose(partial.page,'#sim-journal-doc','D01');
  for(const [i,row] of manifest.journal_practice_v1.entries.D01.lines.entries()){
   await choose(partial.page,'[data-jline="'+i+'"][data-jfield="account"]',row.account);
   await partial.page.locator('[data-jline="'+i+'"][data-jfield="debit"]')
    .fill((row.debit_cents/100).toFixed(2).replace('.',','));
   await partial.page.locator('[data-jline="'+i+'"][data-jfield="credit"]')
    .fill((row.credit_cents/100).toFixed(2).replace('.',','));
  }
  const before=partial.model().version;
  await partial.page.locator('button[data-action="sim-journal-save"]').click();
  await saved(partial,before);
  assert.equal(partial.saves(),3);
  await partial.page.reload();
  await tab(partial.page).waitFor();
  await tab(partial.page).click();
  assert.equal(await partial.page.locator('#sim-doc').inputValue(),'D03');
  assert.equal(await partial.page.locator('#sim-journal-doc').inputValue(),'D02');
  assert.equal(partial.model().version,4);
  assert.deepEqual(partial.errors,[]);
 });
 await partial.context.close();
 const f=await fixture({width:1280,height:960});
 await f.page.goto(origin+'/biuro-ksiegowe');
 await tab(f.page).waitFor();
 await tab(f.page).click();
 await f.page.getByRole('heading',{name:'Rozpoznaj 36 dokumentów z jednego miesiąca'}).waitFor();
 await pass('Raport kontrolny okresu działa w przeglądarce, ale niczego nie wysyła',async()=>{
  const previous=f.model().version;
  await f.page.locator('button[data-action="tab"][data-id="report"]').click();
  await f.page.getByRole('heading',{name:'Jeden miesiąc: kontrola przed KSeF / JPK / UPO'}).waitFor();
  assert.match(await f.page.locator('body').innerText(),/KSeF/);
  assert.match(await f.page.locator('body').innerText(),/NIE WYDANO/);
  const pending=f.page.waitForEvent('download');
  await f.page.locator('button[data-action="tax-close-export"]').click();
  const stream=await (await pending).createReadStream(),parts=[];
  for await(const part of stream)parts.push(part);
  const html=Buffer.concat(parts).toString('utf8');
  assert.match(html,/BRAK WYSYŁKI URZĘDOWEJ/);
  assert.match(html,/KSeF: NIE WYSŁANO/);
  assert.match(html,/UPO: NIE WYDANO/);
  assert.equal(f.model().version,previous);
  await tab(f.page).click();
  assert.deepEqual(f.errors,[]);
 });
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
   if(d.id==='D01')assert.equal(await f.page.locator('#sim-doc').inputValue(),'D02');
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

 await pass('Chromium: pobranie i import wyciągu D01-D36 z tymi samymi dowodami',async()=>{
  const prior=f.model().version,download=f.page.waitForEvent('download');
  await f.page.locator('button[data-action="sim-bank-csv"]').click();
  const data=await download,stream=await data.createReadStream(),chunks=[];
  for await(const c of stream)chunks.push(c);
  const buffer=Buffer.concat(chunks),parsed=parseBankCSV(buffer.toString('utf8'));
  assert.deepEqual(parsed.errors,[]);
  const docs=manifest.documents.filter(d=>['bank_in','bank_out'].includes(d.kind));
  assert.equal(parsed.rows.length,docs.length);
  assert.deepEqual(parsed.rows.map(x=>x.id),docs.map(x=>x.id));
  assert.equal(f.model().version,prior,'Pobranie nie zapisuje stanu konta');
  await f.page.getByRole('button',{name:'Otwórz import CSV'}).click();
  await f.page.locator('#lab-file').setInputFiles({
   name:'D01-D36-fikcyjny.csv',mimeType:'text/csv',buffer
  });
  const submit=f.page.locator('button[data-action="import-bank"]');
  await submit.waitFor();
  assert.match(await submit.innerText(),new RegExp(String(docs.length)));
  await submit.click();
  await saved(f,prior);
  assert.deepEqual(f.model().state.bank.map(x=>x.id),docs.map(x=>x.id));
  assert.equal(f.model().state.journals.length,0,'CSV nie księguje automatycznie');
  await tab(f.page).click();
  assert.equal(await f.page.locator('#sim-doc option').count(),36);
  assert.deepEqual(f.errors,[]);
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
   if(d.id==='D01')assert.equal(await f.page.locator('#sim-journal-doc').inputValue(),'D02');
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
  assert.equal(f.saves(),74);
  assert.match(await f.page.locator('body').innerText(),/Wewnętrzne etapy są zgodne \(5\/5\)/);
 });
 await pass('Raport 36 dokumentów pobiera się dopiero po pełnym uzgodnieniu',async()=>{
  const button=f.page.locator('button[data-action="sim-month-report"]');
  assert.equal(await button.count(),1);
  const downloading=f.page.waitForEvent('download');
  await button.click();
  const stream=await (await downloading).createReadStream();
  const chunks=[];for await(const chunk of stream)chunks.push(chunk);
  const html=Buffer.concat(chunks).toString('utf8');
  assert.ok(html.includes('TYLKO DANE FIKCYJNE'));
  assert.match(html,/Raport szkoleniowy: miesiąc D01–D36/);
  assert.equal((html.match(/<tr><td>D\d\d/g)||[]).length,36);
  assert.ok(html.includes('nie zastępuje opinii księgowego'));
  assert.equal(f.saves(),74,'Raport nie może tworzyć zapisu do bazy');
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
  assert.equal(await f.page.locator('button[data-action="sim-month-report"]').count(),0);
  assert.equal(await f.page.locator('#sim-doc').inputValue(),'D02');
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
  assert.equal(await f.page.locator('#sim-journal-doc').inputValue(),'D01');
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

 // Browser mock of the same real UI integration route, NOT authorized real user E2E.
 const bridge=await fixture({width:1280,height:900});
 await bridge.page.goto(origin+'/biuro-ksiegowe');
 await tab(bridge.page).waitFor();await tab(bridge.page).click();
 await pass('Chromium: brak faktury modelowej D04 nie udaje pozytywnego powiązania',async()=>{
  assert.equal(await bridge.page.locator('#bridge-D04 option').count(),1);
  assert.equal(bridge.model().state.scenario_invoice_links_v1,undefined);
  assert.equal(bridge.saves(),0);
 });
 await pass('Chromium: modelowa faktura D04 zostaje przypisana i pozostaje po odświeżeniu',async()=>{
  await bridge.page.locator('nav button[data-action="tab"][data-id="invoices"]').click();
  await bridge.page.locator('button[data-action="new-sale"]').click();
  await bridge.page.locator('#invoice-party').fill('Fikcyjna firma A');
  await bridge.page.locator('#invoice-date').fill('2026-01-04');
  await bridge.page.locator('#invoice-due').fill('2026-01-31');
  await bridge.page.locator('[data-group="invoice"][data-field="lines.0.price"]').fill('15000,00');
  await bridge.page.locator('[data-group="invoice"][data-field="lines.0.code"]').selectOption('0');
  let prior=bridge.model().version;
  await bridge.page.locator('form[data-form="invoice"] button[value="issued"]').click();
  await saved(bridge,prior);
  const inv=bridge.model().state.invoices.find(i=>i.kind==='sale');
  assert.equal(inv.gross_cents,1500000);
  await tab(bridge.page).click();
  await bridge.page.locator('#bridge-D04').selectOption(inv.id);
  prior=bridge.model().version;
  await bridge.page.locator('button[data-action="sim-invoice-link-save"][data-id="D04"]').click();
  await saved(bridge,prior);
  assert.equal(bridge.model().state.scenario_invoice_links_v1.links.D04,inv.id);
  assert.equal(inspectScenarioInvoiceBridge(bridge.model().state,manifest,'2026-01').matched,0,
   'Nie uznawaj faktury za uzgodnioną bez aktywnego dekretu');
  await bridge.page.reload();await tab(bridge.page).waitFor();await tab(bridge.page).click();
  assert.equal(await bridge.page.locator('#bridge-D04').inputValue(),inv.id);
  assert.deepEqual(bridge.errors,[]);
 });
 await pass('Chromium: dodanie prawidłowego dekretu potwierdza jedno ze źródeł',async()=>{
  const inv=bridge.model().state.invoices[0];
  await bridge.page.locator('nav button[data-action="tab"][data-id="invoices"]').click();
  await bridge.page.locator('button[data-action="journal-invoice"][data-id="'+inv.id+'"]').click();
  await bridge.page.locator('[data-group="journal"][data-field="lines.0.debit"]').fill('15000,00');
  await bridge.page.locator('[data-group="journal"][data-field="lines.1.credit"]').fill('15000,00');
  const prior=bridge.model().version;
  await bridge.page.locator('form[data-form="journal"] button[value="posted"]').click();
  await saved(bridge,prior);
  const result=inspectScenarioInvoiceBridge(bridge.model().state,manifest,'2026-01');
  assert.equal(result.matched,1);assert.equal(result.passed,false);
  await tab(bridge.page).click();
  await bridge.page.getByText('Faktura i aktywny dekret sprawdzone').first().waitFor();
  assert.deepEqual(bridge.errors,[]);
 });
 await bridge.context.close();
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
