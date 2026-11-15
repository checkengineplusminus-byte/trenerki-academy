#!/usr/bin/env node
// QA: two independent sequential ten-environment rounds, each reviewed by IT,
// a content critic and a course seller. Synthetic account/API; no learner data.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.TRENERKI_PLAYWRIGHT_MODULE||'playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8795').origin;
const api='https://kcvvixcjuwglfvdpypzs.supabase.co';
const data=JSON.parse(readFileSync(new URL('../content/excel-analyst-data.json',import.meta.url),'utf8'));
const content=JSON.parse(readFileSync(new URL('../content/excel-professional-missions.json',import.meta.url),'utf8'));
const missions=content.missions;
const rows=data.rows;
const roleIds=[
 {id:'student',role:'Student bez doświadczenia',lesson:0,width:390,height:844,mobile:true,touch:true,scale:2},
 {id:'office',role:'Pracownik biura',lesson:1,width:1280,height:800,mobile:false,touch:false,scale:1},
 {id:'retail',role:'Sprzedawca sklepu',lesson:4,width:412,height:915,mobile:true,touch:true,scale:2},
 {id:'builder',role:'Rodzic planujący remont',lesson:9,width:820,height:1180,mobile:false,touch:true,scale:1.5},
 {id:'warehouse',role:'Magazynier',lesson:3,width:1024,height:768,mobile:false,touch:true,scale:1},
 {id:'accounting',role:'Księgowa w firmie',lesson:15,width:1440,height:900,mobile:false,touch:false,scale:1},
 {id:'finance',role:'Analityk finansowy',lesson:20,width:1536,height:864,mobile:false,touch:false,scale:1},
 {id:'seller',role:'Specjalista zakupów',lesson:24,width:1365,height:768,mobile:false,touch:false,scale:1},
 {id:'director',role:'Dyrektor operacyjny',lesson:25,width:1920,height:1080,mobile:false,touch:false,scale:1},
 {id:'it',role:'Inżynier jakości',lesson:28,width:360,height:740,mobile:true,touch:true,scale:2,reduce:true}
];
assert.equal(roleIds.length,10);
const user={id:'00000000-0000-4000-a000-000000000086',email:'excel-quality@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};
const cors={'access-control-allow-origin':base,'access-control-allow-headers':'apikey,authorization,content-type,x-client-info,accept-profile,content-profile,prefer','access-control-allow-methods':'GET,POST,OPTIONS'};
const sum=(items,field='netPrice')=>items.reduce((t,r)=>t+r.quantity*r[field],0);
const northMaterial=rows.filter(x=>x.region==='Północ'&&x.category==='Materiały');
const north=rows.filter(x=>x.region==='Północ');
const count=rows.length;
const materialImpact=-Math.round(rows.filter(x=>x.category==='Materiały').reduce((t,r)=>t+r.quantity*r.unitCost*.15,0)*100)/100;
const answerMoney=n=>String(n).replace('.',',');
const report={suite:'TRENERKI Excel: 10 środowisk x 2 rundy, IT + krytyk + sprzedawca',date:'2026-11-15',rounds:[],scope:'30 lessons + 6 functional analytical modes; synthetic user, not paid real users'};
function material(no){
 return {sections:[{heading:'Zadanie ćwiczebne',text:'Użyj jedynie fikcyjnych danych i wykonaj samodzielne działania w arkuszu.'}],
  illustration:no%2?'excel-addresses':'excel-interface'};
}
async function install(page,events){
 await page.addInitScript(({user})=>{
  localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify({access_token:'excel-test-token',refresh_token:'excel-test-refresh',
   expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}));
 },{user});
 await page.route(url=>url.origin===base&&url.pathname==='/nauka',async route=>{
  const res=await route.fetch({url:base+'/nauka.html'});
  await route.fulfill({response:res});
 });
 await page.route(url=>url.origin===api,async route=>{
  const request=route.request(),url=new URL(request.url()),table=url.pathname.split('/').at(-1);
  const response=(body,status=200)=>route.fulfill({headers:cors,status,contentType:'application/json',body:JSON.stringify(body)});
  if(request.method()==='OPTIONS')return route.fulfill({headers:cors,status:204});
  if(url.pathname==='/auth/v1/user')return response(user);
  if(table==='ta_enrollments')return response([{id:'test-enrollment'}]);
  if(table==='ta_courses')return response([{title_pl:'Excel od zera do analizy danych',description_pl:'Zadania zawodowe'}]);
  if(table==='ta_lessons')return response(missions.map(x=>({lesson_no:x.lesson_no,title_pl:'Lekcja Excel '+(x.lesson_no+1),material:material(x.lesson_no)})));
  if(table==='ta_learning_progress')return response(Array.from({length:29},(_,lesson_no)=>({lesson_no})));
  if(table==='ta_learning_attempts'||table==='ta_drafts')return response([]);
  if(table==='ta-lesson-guide')return response({ok:true,history:[],opening:'Pomoc w ćwiczeniach',can_reply:true});
  if(request.method()!=='GET')events.writes.push({method:request.method(),path:table});
  return response({ok:true});
 });
}
async function enterAndCheck(lab,answer,success=true){
 const field=lab.getByRole('textbox',{name:'Wynik obliczeń zaawansowanych'});
 await field.fill(String(answer));
 await lab.getByRole('button',{name:'Sprawdź analizę ekspercką'}).click();
 if(success)await lab.getByTestId('excel-advanced-correct').waitFor();
 else await lab.getByTestId('excel-advanced-status').filter({hasText:/różni się|Najpierw|Dozwolony/}).waitFor();
}
async function checkAdvanced(page,id){
 const lab=page.getByTestId('excel-analyst-workbench');
 await lab.waitFor();
 await lab.getByRole('link',{name:/Pobierz prawdziwy plik danych CSV/}).waitFor();
 const csv=await lab.getByRole('link',{name:/Pobierz prawdziwy plik danych CSV/}).getAttribute('href');
 assert.equal(csv,'/academy/assets/excel-practice-sales.csv');
 await lab.getByTestId('excel-advanced-total').filter({hasText:'28 245,00 zł'}).waitFor();
 if(id==='accounting'){
  await enterAndCheck(lab,'123',false);await enterAndCheck(lab,String(northMaterial.length));
  await lab.getByRole('button',{name:'SUMA.WARUNKÓW',exact:true}).click();
  await enterAndCheck(lab,answerMoney(sum(northMaterial)));
  await lab.getByRole('textbox',{name:'Nowa ilość w FV-001'}).fill('13');
  await lab.getByRole('button',{name:'Zastosuj zmianę ilości FV-001'}).click();
  await lab.getByTestId('excel-advanced-total').filter({hasText:'28 330,00 zł'}).waitFor();
  await enterAndCheck(lab,answerMoney(sum(northMaterial)+85));
 }else if(id==='finance'){
  await lab.getByRole('button',{name:'Scenariusze',exact:true}).click();
  await enterAndCheck(lab,answerMoney(materialImpact));
  await lab.getByRole('textbox',{name:'Wzrost kosztu materiałów w procentach'}).fill('1000');
  await lab.getByRole('button',{name:'Sprawdź analizę ekspercką'}).click();
  await lab.getByTestId('excel-advanced-status').filter({hasText:/−50 do \+200/}).waitFor();
 }else if(id==='seller'){
  await enterAndCheck(lab,'1155');
  await lab.getByRole('textbox',{name:'Numer faktury do dokładnego wyszukiwania'}).fill('FV-999');
  await enterAndCheck(lab,'BRAK');
 }else if(id==='director'){
  await lab.getByRole('button',{name:'Odśwież tabelę przestawną'}).click();
  await enterAndCheck(lab,String(sum(north)));
  await lab.getByRole('textbox',{name:'Nowa ilość w FV-001'}).fill('13');
  await lab.getByRole('button',{name:'Zastosuj zmianę ilości FV-001'}).click();
  await lab.getByTestId('excel-pivot-stale').filter({hasText:/wymagane odświeżenie/}).waitFor();
  await lab.getByRole('button',{name:'Odśwież tabelę przestawną'}).click();
  await enterAndCheck(lab,String(sum(north)+85));
 }else if(id==='it'){
  const types=['Duplikat','Zła ilość','Brak kontrahenta','Brak ceny'];
  for(let i=0;i<types.length;i++)
   await lab.getByRole('button',{name:types[i],exact:true}).nth(i).click();
  await lab.getByRole('button',{name:'Sprawdź analizę ekspercką'}).click();
  await lab.getByTestId('excel-advanced-correct').waitFor();
  await lab.getByRole('button',{name:'SUMA.WARUNKÓW',exact:true}).click();
  await lab.getByRole('textbox',{name:'Nowa ilość w FV-001'}).fill('5x');
  await lab.getByRole('button',{name:'Zastosuj zmianę ilości FV-001'}).click();
  await lab.getByTestId('excel-advanced-status').filter({hasText:/dodatnią liczbą całkowitą/}).waitFor();
  await lab.getByTestId('excel-advanced-total').filter({hasText:'28 245,00 zł'}).waitFor();
 }
}
async function novicePath(page,round){
 const lab=page.getByTestId('excel-workspace'),guide=lab.getByTestId('excel-zero-experience-guide');
 await lab.waitFor();await guide.getByRole('button',{name:'Rozpocznij Excel od zera'}).click();
 const step=guide.getByRole('button',{name:'Sprawdź wykonanie kroku Excel'});
 await step.click();await guide.getByTestId('excel-beginner-error').waitFor();
 await lab.getByTestId('excel-cell-C2').click();await step.click();
 await guide.getByTestId('excel-beginner-title').filter({hasText:/Zmień dane wejściowe/}).waitFor();
 const fx=lab.getByTestId('excel-formula');await fx.fill('4,5');
 await lab.getByRole('button',{name:'Zapisz komórkę ✓'}).click();await step.click();
 await guide.getByTestId('excel-beginner-title').filter({hasText:/Odczytaj przeliczony wynik/}).waitFor();
 await lab.getByTestId('excel-cell-E2').click();
 await lab.getByTestId('excel-cell-E2').filter({hasText:'1575'}).waitFor();
 await step.click();
 await guide.getByTestId('excel-beginner-title').filter({hasText:/Wskaż zakres kilku komórek/}).waitFor();
 await lab.getByRole('textbox',{name:'Adres lub zakres komórek'}).fill('E2:E4');
 await lab.getByRole('button',{name:'Idź do zakresu'}).click();await step.click();
 await guide.getByTestId('excel-beginner-title').filter({hasText:/Przećwicz wypełnianie w dół/}).waitFor();
 await lab.getByRole('button',{name:'Wypełnij w dół · Ctrl+D'}).click();await step.click();
 await lab.getByTestId('excel-cell-E5').click();
 await lab.getByTestId('excel-cell-E5').filter({hasText:'2085'}).waitFor();
 await step.click();
 await guide.getByTestId('excel-beginner-success').waitFor();
 console.log('✓ Cykl '+round+' · Excel od ZERA: 6 bramek, prawdziwa edycja komórki, wynik, zakres, kopiowanie wzorów, SUMA 2085');
}
async function persona(browser,p,round){
 const context=await browser.newContext({viewport:{width:p.width,height:p.height},deviceScaleFactor:p.scale,
  hasTouch:p.touch,isMobile:p.mobile,locale:'pl-PL',reducedMotion:p.reduce?'reduce':'no-preference'});
 const page=await context.newPage(),events={errors:[],writes:[]};
 page.setDefaultTimeout(14000);
 page.on('pageerror',error=>events.errors.push(String(error.message)));
 const m=missions[p.lesson];
 try{
  await install(page,events);
  await page.goto(base+'/nauka?course=excel-skroty&lesson='+(p.lesson+1),{waitUntil:'domcontentloaded'});
  const region=page.getByTestId('excel-mission-'+p.lesson);
  await region.waitFor({timeout:18000});
  await region.getByText(m.goal,{exact:true}).waitFor();
  await region.getByText(m.role,{exact:true}).waitFor();
  const consent=page.getByRole('region',{name:'Zgoda na pomiary reklamowe'});
  if(await consent.isVisible().catch(()=>false))await consent.getByRole('button',{name:'Odrzuć',exact:true}).click();
  const inputs=region.getByRole('textbox',{name:'Twoja odpowiedź na zadanie Excel'});
  assert.equal(await region.getByRole('checkbox').count(),m.steps.length,'Accessible learning checklist');
  await region.getByRole('button',{name:'Sprawdź wynik zadania Excel'}).click();
  await region.getByTestId('excel-mission-wrong').waitFor();
  await inputs.fill(m.expected);await region.getByRole('button',{name:'Sprawdź wynik zadania Excel'}).click();
  await region.getByTestId('excel-mission-correct').waitFor();
  await region.getByRole('button',{name:/Na prawdziwym Excelu/}).click();
  await region.getByText(m.realExcel,{exact:true}).waitFor();
  if(p.id==='student')await novicePath(page,round);
  if(['accounting','finance','seller','director','it'].includes(p.id))await checkAdvanced(page,p.id);
  const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
  assert(overflow.scroll<=overflow.viewport+3,'Horizontal overflow '+JSON.stringify(overflow));
  assert.deepEqual(events.errors,[],'JavaScript exceptions');
  assert.deepEqual(events.writes,[],'Training simulation caused unexpected backend writes');
  if(round===2){
   await region.scrollIntoViewIfNeeded();
   await page.screenshot({path:'/tmp/trenerki-excel-qa-'+p.id+'.png',fullPage:false});
  }
  console.log('✓ Cykl '+round+' · '+p.id+' '+p.width+'×'+p.height+' · misja '+(p.lesson+1)+(p.id==='student'?' + tutorial':'')+' OK');
  return {id:p.id,role:p.role,lesson:p.lesson+1,viewport:p.width+'×'+p.height,passed:true,jsErrors:0,writes:0,overflow:false};
 }finally{await context.close();}
}
function engineerReview(r,checked){
 assert.equal(checked.length,10,'IT needs ten device/industry reports');
 assert(checked.every(x=>x.passed&&!x.jsErrors&&!x.writes&&!x.overflow),'IT failed on JS, writes or overflow');
 assert(checked.some(x=>x.viewport.startsWith('360'))&&checked.some(x=>x.viewport.startsWith('1920')),'Extreme viewports missing');
 assert.equal(rows.reduce((n,x)=>n+x.quantity*x.netPrice,0),28245,'Source sample changed unexpectedly');
 console.log('✓ Cykl '+r+' · IT TECH REVIEW 10/10: aria checklist, no data loss, sum consistency, no unexpected writes');
 return {passed:true,reviewed:10};
}
function criticReview(r,checked){
 assert.equal(new Set(checked.map(x=>x.role)).size,10,'Critic: generic duplicated personas');
 assert.equal(new Set(missions.map(x=>x.goal)).size,30,'Critic: duplicated lessons');
 assert(missions.filter(x=>x.track==='fundamenty').length===10);
 assert(missions.filter(x=>x.track==='praktyka').length===10);
 assert(missions.filter(x=>x.track==='ekspert').length===10);
 assert(missions.every(m=>m.steps.length>=4&&m.realExcel&&m.mistake&&m.explanation),'Critic: weak teaching metadata');
 console.log('✓ Cykl '+r+' · KRYTYK: 10 rzeczywistych kontekstów, 3 poziomy x 10, sprawdzanie wyników zamiast quizu');
 return {passed:true,reviewed:10,limitations:['Nie jest to test z udziałem rzeczywistych użytkowników','Symulator nie zastępuje pełnego Microsoft Excel']};
}
async function sellerReview(r,browser){
 const page=await browser.newPage();
 try{
  await page.goto(base+'/academy/kursy/excel-skroty.html',{waitUntil:'domcontentloaded'});
  await page.getByText('30 lekcji',{exact:true}).waitFor();
  await page.getByText('Od podstaw do zagadnień zaawansowanych',{exact:true}).waitFor();
  const html=await page.locator('body').innerText();
  assert.match(html,/nie jest autoryzowanym szkoleniem ani certyfikacją/i,'Sales must not imply Microsoft accreditation');
  assert.match(html,/166 zł/i,'Sales must display catalogue price with direct checkout');
  const csv=await page.request.get(base+'/academy/assets/excel-practice-sales.csv');
  assert.equal(csv.status(),200,'Sales promises actionable downloadable training data');
  assert((await csv.text()).includes('FV-014'));
  console.log('✓ Cykl '+r+' · SPRZEDAWCA EXCEL: jasne 30 rozdziałów, cena, brak fałszywej certyfikacji, działający CSV');
  return {passed:true,landingVerified:true,download:true};
 }finally{await page.close();}
}
const browser=await chromium.launch({headless:true});
try{
 for(let round=1;round<=2;round++){
  console.log('=== EXCEL: CYKL '+round+'/2 — 10 ŚRODOWISK ===');
  const checked=[];
  for(const p of round===1?roleIds:[...roleIds].reverse())checked.push(await persona(browser,p,round));
  const it=engineerReview(round,checked);
  const critics=criticReview(round,checked);
  const seller=await sellerReview(round,browser);
  report.rounds.push({round,profiles:checked,it,critics,seller});
 }
 report.summary={passed:report.rounds.length===2&&report.rounds.every(r=>r.it.passed&&r.critics.passed&&r.seller.passed),
  journeys:20,technicalReviews:2,criticalReviews:2,salesReviews:2};
 assert(report.summary.passed);
 console.log('✓ EXCEL: 20/20 scenariuszy, 2 przeglądy IT, 2 krytyków i 2 audyty sprzedawcy kursu');
}finally{
 await browser.close();
 writeFileSync('/tmp/trenerki-excel-two-cycles.json',JSON.stringify(report,null,2));
}
