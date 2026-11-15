#!/usr/bin/env node
/**
 * Przywrócenie kopii biura w PRAWDZIWYM Chromium, ale WYŁĄCZNIE na fikcyjnym,
 * lokalnym interfejsie z przechwyconym Supabase API.
 * Zero wywołań do prawdziwej bazy, logowania, KSeF, banku i płatności.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=new URL(process.argv[2]||'http://127.0.0.1:8787').origin;
assert.match(origin,/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/);
const api='https://kcvvixcjuwglfvdpypzs.supabase.co';
const OWNER='00000000-0000-4000-a000-000000000111';
const OTHER='00000000-0000-4000-a000-000000000112';
const OLD='00000000-0000-4000-a000-000000000113';
const COPY='00000000-0000-4000-a000-000000000114';
const user={id:OWNER,email:'fictional-restore@example.test',aud:'authenticated',role:'authenticated',
 email_confirmed_at:'2026-11-15T06:00:00Z',app_metadata:{},user_metadata:{}};
const cors={'access-control-allow-origin':origin,
 'access-control-allow-headers':'apikey,authorization,content-type,x-client-info,accept-profile,content-profile,prefer',
 'access-control-allow-methods':'GET,POST,OPTIONS'};
const empty=()=>({schema_version:1,invoices:[],bank:[],journals:[],matches:[]});
let old={id:OLD,user_id:OWNER,name:'Biuro fikcyjne',version:3,
 updated_at:'2026-11-15T07:00:00Z',
 state:{...empty(),simulator_attempts_v1:{scenario_id:'core-v3-firma-demo-2026-01-v1',
  answers:{D01:'bank_in'}}}};
let fresh=null,created=0,saved=0,checks=0,realApiCalls=0;
const originalText=JSON.stringify(old);
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900},
 acceptDownloads:true,serviceWorkers:'block'});
await context.addInitScript(({user})=>{
 localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify({
  access_token:'synthetic-token-not-signed-by-supabase',
  refresh_token:'synthetic-refresh-not-used',expires_at:Math.floor(Date.now()/1000)+3600,
  expires_in:3600,token_type:'bearer',user}));
},{user});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const pass=async(name,fn)=>{await fn();console.log('OK '+(++checks)+' — '+name)};
await page.route(url=>url.origin!==origin&&url.origin!==api,
 route=>route.fulfill({status:200,body:''}));
await page.route(url=>url.origin===origin&&url.pathname==='/biuro-ksiegowe',
 async route=>{const response=await route.fetch({url:origin+'/biuro-ksiegowe.html'});
  await route.fulfill({response});});
await page.route(url=>url.origin===api,async route=>{
 const req=route.request(),url=new URL(req.url());
 const respond=(value,status=200)=>route.fulfill({status,headers:cors,
  contentType:'application/json',body:JSON.stringify(value)});
 if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
 if(url.pathname==='/auth/v1/user')return respond(user);
 if(url.pathname==='/auth/v1/logout')return respond({});
 if(url.pathname==='/rest/v1/rpc/ta_accounting_overview')
  return respond({is_editor:true,active_program:{topics:100}});
 if(url.pathname==='/rest/v1/ta_accounting_core_materials_v3')return respond([]);
 if(url.pathname==='/rest/v1/ta_accounting_lab_workspaces'){
  if(req.method()==='POST'){
   assert.equal(created,0,'Tylko jedno odtworzenie w teście');
   const payload=req.postDataJSON();
   assert.equal(typeof payload.name,'string');
   assert.ok(payload.name.endsWith('(odzyskane)'));
   created++;
   fresh={id:COPY,user_id:OWNER,name:payload.name,version:1,
    updated_at:'2026-11-15T07:30:00Z',state:empty()};
   return respond(fresh,201);
  }
  const idFilter=(url.searchParams.get('id')||'').replace(/^eq\./,'');
  if(idFilter)return respond(idFilter===COPY?fresh:idFilter===OLD?old:null);
  return respond(fresh?[fresh,old]:[old]);
 }
 if(url.pathname==='/rest/v1/rpc/ta_accounting_lab_save'){
  const payload=req.postDataJSON();
  assert.equal(payload.workspace_id,COPY);
  assert.equal(payload.expected_version,1);
  assert.equal(payload.next_state.simulator_attempts_v1.answers.D01,'bank_in');
  saved++;
  fresh={...fresh,state:payload.next_state,version:2,updated_at:'2026-11-15T07:31:00Z'};
  return respond(fresh);
 }
 realApiCalls++;
 return respond([]);
});
const file=async(buffer)=>page.locator('#lab-backup-file').setInputFiles({
 name:'kopia-biura.json',mimeType:'application/json',buffer:Buffer.from(buffer)});
try{
 await page.goto(origin+'/biuro-ksiegowe');
 await page.getByRole('button',{name:'Pobierz kopię swojej bazy'}).waitFor();
 let exported;
 await pass('Eksport istniejącego biura do pełnego pliku JSON',async()=>{
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'Pobierz kopię swojej bazy'}).click();
  const stream=await (await download).createReadStream(),parts=[];
  for await(const p of stream)parts.push(p);
  exported=Buffer.concat(parts).toString('utf8');
  const data=JSON.parse(exported);
  assert.equal(data.format,'trenerki-lab-backup-v1');
  assert.equal(data.workspace.user_id,OWNER);
  assert.equal(data.workspace.state.simulator_attempts_v1.answers.D01,'bank_in');
  assert.equal(created,0);
 });
 await pass('Kopia innego konta nie pokazuje możliwości przywrócenia',async()=>{
  const foreign=JSON.parse(exported);foreign.workspace.user_id=OTHER;
  await file(JSON.stringify(foreign));
  await page.getByRole('alert').filter({hasText:'Kopia pochodzi z innego konta'}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Utwórz NOWE biuro z kopii'}).count(),0);
  assert.equal(created,0);
 });
 await pass('Podgląd własnej kopii pokazuje liczby i wymaga zgody',async()=>{
  await file(exported);
  await page.getByRole('button',{name:'Utwórz NOWE biuro z kopii'}).waitFor();
  page.once('dialog',d=>d.dismiss());
  await page.getByRole('button',{name:'Utwórz NOWE biuro z kopii'}).click();
  assert.equal(created,0,'Anulowanie nie tworzy pustego biura');
  assert.equal(saved,0);
 });
 await pass('Odtworzenie do NOWEGO biura zapisuje stan bez modyfikacji oryginału',async()=>{
  page.once('dialog',d=>d.accept());
  await page.getByRole('button',{name:'Utwórz NOWE biuro z kopii'}).click();
  await page.getByRole('status').filter({hasText:'Kopia odzyskana do osobnego biura'}).waitFor();
  assert.equal(created,1);
  assert.equal(saved,1);
  assert.equal(fresh.user_id,OWNER);
  assert.equal(fresh.version,2);
  assert.equal(fresh.state.simulator_attempts_v1.answers.D01,'bank_in');
  assert.equal(JSON.stringify(old),originalText,'Oryginalne biuro jest nietknięte');
  assert.equal(await page.locator('#workspace').inputValue(),COPY);
 });
 await pass('Ponowne otwarcie strony wczytuje odzyskane biuro',async()=>{
  await page.reload();
  await page.locator('#workspace').waitFor();
  assert.equal(await page.locator('#workspace').inputValue(),COPY);
  assert.equal(fresh.state.simulator_attempts_v1.answers.D01,'bank_in');
  assert.equal(JSON.stringify(old),originalText);
  assert.deepEqual(errors,[]);
 });
 await page.screenshot({path:'/tmp/trenerki-restore-as-copy.png',fullPage:true});
 console.log(JSON.stringify({tests:checks,passed:checks,created:1,saved:1,
  real_auth:false,live_supabase_calls:0,unknown_intercepted_requests:realApiCalls,
  independent_offsite_restore:'not_tested'}));
}finally{await context.close();await browser.close();}
