#!/usr/bin/env node
// Wyłącznie lokalny eksport i przechwycone odpowiedzi API. Żaden token nie autoryzuje prawdziwego serwera.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {validateAssets} from '../src/accounting/assets-core.js';
const origin=new URL(process.argv[2]||'http://127.0.0.1:8787').origin;
assert.ok(/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin),'Test wolno uruchamiać tylko na lokalnym eksporcie.');
const api='https://kcvvixcjuwglfvdpypzs.supabase.co';
const user={id:'00000000-0000-4000-a000-000000000001',email:'synthetic@example.test',email_confirmed_at:'2026-11-01T00:00:00Z',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};
const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'apikey,authorization,content-type,x-client-info,accept-profile,content-profile,prefer','access-control-allow-methods':'GET,POST,OPTIONS'};
function initial(){return {id:'00000000-0000-4000-a000-000000000002',user_id:user.id,name:'Fikcyjna firma testowa',version:1,updated_at:'2026-11-01T00:00:00Z',state:{schema_version:1,invoices:[{id:'I1',kind:'purchase',status:'issued',number:'CW/ST/1',date:'2026-11-01',due:'2026-11-15',party:'Fikcyjny dostawca',seller:'Fikcyjna firma',net_cents:1200000,tax_cents:276000,gross_cents:1476000,lines:[{label:'Urządzenie',qty_milli:1000,unit_cents:1200000,tax_code:'23'}]}],bank:[],journals:[],matches:[]}};}
const browser=await chromium.launch({headless:true});let checks=0;
async function pass(label,action){await action();checks++;console.log('OK '+checks+' — '+label);}
async function fixture(viewport,authenticated=true){
 const context=await browser.newContext({viewport,serviceWorkers:'block'});const page=await context.newPage();let workspace=initial(),saves=0;const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route(url=>url.origin!==origin&&url.origin!==api,route=>route.fulfill({status:200,body:''}));
 await page.route(url=>url.origin===origin&&['/majatek-ksiegowy','/konto','/program-ksiegowosci','/temat-ksiegowosci'].includes(url.pathname),async route=>{const response=await route.fetch({url:origin+new URL(route.request().url()).pathname+'.html'});await route.fulfill({response});});
 if(authenticated)await page.addInitScript(({user})=>localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify({access_token:'local-fixture-not-a-real-token',refresh_token:'local-fixture-no-server-access',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user})),{user});
 await page.route(url=>url.origin===api,async route=>{
  const request=route.request(),url=new URL(request.url()),json=(body,status=200)=>route.fulfill({headers,contentType:'application/json',body:JSON.stringify(body),status});
  if(request.method()==='OPTIONS')return route.fulfill({headers,status:204});
  if(!authenticated)return json({error:'local_unauthorized_fixture'},401);
  if(url.pathname==='/auth/v1/user')return json(user);
  if(url.pathname==='/rest/v1/rpc/ta_accounting_overview')return json({is_editor:true,approved_count:50,read_count:0,sections:[]});
  if(url.pathname==='/rest/v1/ta_accounting_core_topics_v3')return json([{topic_no:1,section_no:1,title_pl:'Temat testowy',status:'complete'}]);
  if(url.pathname==='/rest/v1/ta_accounting_core_materials_v3'){
   const lesson={topic_no:1,title_pl:'Temat testowy',learning_goal:'Sprawdź dokument.',material:{
    sections:[{heading:'Treść testowa',paragraphs:['Sekcja testowa.']}],
    document_decision:{title:'Trening z dokumentem',scene:'Porównaj wpisy.',document:'Dokument treningowy',rows:[{label:'Plan',value:'13 zł'},{label:'Wpłata',value:'12 zł'}],
     question:'Która pozycja pokazuje przelew?',options:['Plan','Wpłata'],feedback:['Przeczytaj drugi wiersz.','Zgadza się z wyciągiem.'],correct:1,clue:1,curiosity:'Wpłata ma własną datę.'}}};
   return json([lesson]);
  }
  if(url.pathname==='/rest/v1/ta_accounting_lab_workspaces')return json(url.searchParams.has('id')?workspace:[{id:workspace.id,name:workspace.name,version:workspace.version}]);
  if(url.pathname==='/rest/v1/rpc/ta_accounting_lab_save'){
   const payload=request.postDataJSON();if(payload.workspace_id!==workspace.id||payload.expected_version!==workspace.version)return json({code:'40001',message:'Konflikt wersji testowej'},409);
   try{validateAssets(payload.next_state,workspace.state);}catch(e){return json({code:'P0001',message:e.message},400);}
   workspace={...workspace,state:payload.next_state,version:workspace.version+1,updated_at:new Date().toISOString()};saves++;return json(workspace);
  }
  if(url.pathname==='/auth/v1/logout')return json({});
  return json([]);
 });
 return {context,page,errors,get:()=>workspace,saves:()=>saves,concurrent:()=>{workspace={...workspace,version:workspace.version+1};},
  seedSoldAssetInvoice:()=>{const invoice={id:'S1',kind:'sale',status:'issued',number:'CW/FV/ST/1',date:'2026-11-30',supply_date:'2026-11-30',due:'2026-12-15',party:'Fikcyjny nabywca',seller:'Fikcyjna firma',net_cents:800000,tax_cents:184000,gross_cents:984000,lines:[{label:'Sprzedaż CW/ST/001 — urządzenie',qty_milli:1000,unit_cents:800000,tax_code:'23'}]};const j={id:'S-BOOK',status:'posted',date:'2026-11-30',source_type:'invoice',source_id:'S1',lines:[{account:'201',debit:984000,credit:0},{account:'700',debit:0,credit:800000},{account:'222',debit:0,credit:184000}]};workspace={...workspace,version:workspace.version+1,state:{...workspace.state,invoices:[...workspace.state.invoices,invoice],journals:[...workspace.state.journals,j]}};}};
}
async function fill(page){await page.getByRole('heading',{name:'1. Karta składnika'}).waitFor();await page.getByLabel('Numer inwentarzowy',{exact:true}).fill('CW/ST/001');await page.getByLabel('Nazwa składnika',{exact:true}).fill('Urządzenie testowe');await page.getByLabel('Dokument zakupu',{exact:true}).selectOption('I1');await page.getByLabel('Data przyjęcia do używania',{exact:true}).fill('2026-11-02');await page.getByLabel('Pierwszy miesiąc odpisu — założenie',{exact:true}).fill('2026-11');await page.getByLabel('Okres używania w miesiącach',{exact:true}).fill('48');}
async function confirmed(f,action){const old=f.get().version;await action();await f.page.getByRole('button',{name:'Potwierdzam — zapisz kartę i księgowanie',exact:true}).click();await f.page.waitForFunction(expected=>document.querySelector('[role="status"]')?.textContent?.includes('Wersja '+expected+'.'),old+1);}
try{
 const anon=await fixture({width:1280,height:900},false);
 await pass('Anonimowy widok nie pokazuje kartoteki',async()=>{await anon.page.goto(origin+'/majatek-ksiegowy');await anon.page.waitForURL(u=>u.pathname==='/konto');assert.equal(await anon.page.getByRole('heading',{name:'1. Karta składnika'}).count(),0);});await anon.context.close();
 const f=await fixture({width:1280,height:1000});await f.page.goto(origin+'/majatek-ksiegowy');await fill(f.page);
 await pass('Szkic zapisuje się na koncie testowym bez księgowania',async()=>{await f.page.getByRole('button',{name:'Zapisz szkic na koncie',exact:true}).click();await f.page.getByRole('status').filter({hasText:'Wersja 2.'}).waitFor();assert.equal(f.get().state.assets[0].status,'draft');assert.equal(f.get().state.journals.length,0);});
 await pass('Podgląd nie zapisuje, potwierdzenie łączy kartę i księgowanie',async()=>{await f.page.getByRole('button',{name:'Sprawdź przyjęcie i pokaż księgowanie',exact:true}).click();assert.equal(f.saves(),1);await f.page.getByRole('button',{name:'Potwierdzam — zapisz kartę i księgowanie',exact:true}).click();await f.page.getByRole('status').filter({hasText:'Wersja 3.'}).waitFor();assert.equal(f.get().state.assets[0].status,'active');assert.equal(f.get().state.journals[0].lines[0].account,'010');});
 await pass('Odpis jest widoczny w zapisie i wyniku',async()=>{await confirmed(f,()=>f.page.getByRole('button',{name:'Sprawdź następny odpis',exact:true}).click());assert.equal(f.get().state.journals[1].asset_period,'2026-11');assert.equal(f.get().state.journals[1].lines[0].debit,25000);await f.page.getByText('Wynik całego modelu:',{exact:false}).waitFor();});
 await pass('Powrót odczytuje zapisaną kartę i harmonogram',async()=>{const id=f.get().state.assets[0].id;await f.page.reload();await f.page.getByLabel('Otwórz kartę',{exact:true}).selectOption(id);await f.page.getByText('Pozostała wartość księgowa:',{exact:false}).waitFor();assert.ok((await f.page.locator('body').innerText()).includes('11 750,00')||(await f.page.locator('body').innerText()).includes('11 750,00'));});
 await f.page.screenshot({path:'/tmp/trenerki-assets-desktop.png',fullPage:true});
 await pass('Likwidacja zamyka kartotekę, a nie usuwa jej',async()=>{await f.page.getByText('3. Likwidacja bez sprzedaży — ćwiczenie',{exact:true}).click();await f.page.getByLabel('Data likwidacji',{exact:true}).fill('2026-11-30');await confirmed(f,()=>f.page.getByRole('button',{name:'Sprawdź likwidację',exact:true}).click());assert.equal(f.get().state.assets.length,1);assert.equal(f.get().state.journals.at(-1).asset_action,'dispose');await f.page.getByText('Składnik zlikwidowany w modelu.',{exact:true}).waitFor();});
 await pass('Konflikt wersji nie nadpisuje zdalnego stanu',async()=>{await f.page.getByRole('button',{name:'Nowa karta',exact:true}).click();await f.page.getByLabel('Nazwa składnika',{exact:true}).fill('Niezapisany nowy szkic');f.concurrent();const before=f.saves();await f.page.getByRole('button',{name:'Zapisz szkic na koncie',exact:true}).click();await f.page.getByRole('alert').filter({hasText:'W innym oknie'}).waitFor();assert.equal(f.saves(),before);assert.equal(await f.page.getByLabel('Nazwa składnika',{exact:true}).inputValue(),'Niezapisany nowy szkic');});
 assert.deepEqual(f.errors,[]);await f.context.close();
 const sold=await fixture({width:1280,height:900});await sold.page.goto(origin+'/majatek-ksiegowy');await fill(sold.page);
 await confirmed(sold,()=>sold.page.getByRole('button',{name:'Sprawdź przyjęcie i pokaż księgowanie',exact:true}).click());
 sold.seedSoldAssetInvoice();
 await sold.page.getByRole('button',{name:'Pobierz najnowszy zapis',exact:true}).click();
 await sold.page.getByRole('status').filter({hasText:'Wersja 3.'}).waitFor();
 await sold.page.getByLabel('Otwórz kartę',{exact:true}).selectOption(sold.get().state.assets[0].id);
 await pass('Sprzedaż ma własną ścieżkę, wymaga zaksięgowanej faktury i zapisuje tylko wyksięgowanie',async()=>{
  await sold.page.getByText('Sprzedaż środka trwałego — faktura i wyksięgowanie',{exact:true}).click();
  await sold.page.getByLabel('Faktura sprzedaży składnika',{exact:true}).selectOption('S1');
  await confirmed(sold,()=>sold.page.getByRole('button',{name:'Sprawdź sprzedaż i zapisy Wn/Ma',exact:true}).click());
  const state=sold.get().state;assert.equal(state.journals.length,3);
  const disposal=state.journals.at(-1);assert.equal(disposal.asset_action,'dispose');assert.equal(disposal.source_id,'S1');
  assert.deepEqual(disposal.lines.map(l=>l.account),['761','010']);
  assert.equal(state.journals.filter(j=>j.source_type==='invoice'&&j.source_id==='S1').length,1);
  await sold.page.getByText('Składnik sprzedany i wyksięgowany w modelu.',{exact:true}).waitFor();
  assert.deepEqual(sold.errors,[]);
 });await sold.context.close();
 for(const width of [360,1440]){
  await pass('Nawigacja programu i dokument treningowy przy '+width+' px',async()=>{
   const {context,page,errors}=await fixture({width,height:900});
   try{
    await page.goto(origin+'/program-ksiegowosci');
    const chapter=page.getByRole('button',{name:/^Otwórz dział 1:/});
    await chapter.click();
    assert.equal(await chapter.getAttribute('aria-expanded'),'true');
    await page.getByRole('link',{name:/Otwórz lekcję 1:/}).waitFor();
    await chapter.click();
    await page.getByRole('textbox',{name:'Szukaj tematu'}).fill('testowy');
    await page.getByRole('heading',{name:'Znalezione tematy'}).waitFor();
    await page.getByRole('link',{name:/Otwórz lekcję 1:/}).click();
    await page.getByText('Dokument treningowy',{exact:true}).waitFor();
    for(const label of ['Poznaj —','Przykład —','Ćwicz —','Zadanie —','Sprawdź —']){
     const box=await page.getByRole('button',{name:new RegExp('^'+label)}).boundingBox();
     assert.ok(box&&box.x>=0&&box.x+box.width<=width+1,label);
    }
    await page.getByRole('button',{name:'Plan',exact:true}).click();
    await page.getByText('Przeczytaj drugi wiersz.',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Wpłata',exact:true}).press('Enter');
    await page.getByText('Zgadza się z wyciągiem.',{exact:true}).waitFor();
    await page.getByRole('button',{name:/^Sprawdź —/}).click();
    await page.getByText('Dokończ ten temat i przejdź dalej').waitFor();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.deepEqual(errors,[]);
   }finally{await context.close();}
  });
 }
 const mobile=await fixture({width:390,height:844});await mobile.page.goto(origin+'/majatek-ksiegowy');await fill(mobile.page);
 await pass('Widok 390 px nie wyjeżdża poza ekran',async()=>{const size=await mobile.page.evaluate(()=>({screen:innerWidth,width:document.documentElement.scrollWidth}));assert.ok(size.width<=size.screen+2,JSON.stringify(size));await mobile.page.screenshot({path:'/tmp/trenerki-assets-mobile.png',fullPage:true});assert.deepEqual(mobile.errors,[]);});await mobile.context.close();
 console.log(JSON.stringify({tests:checks,passed:checks,scope:'lokalny eksport + całkowicie przechwycone API, bez prawdziwego logowania',real_auth_test:false}));
}finally{await browser.close();}
