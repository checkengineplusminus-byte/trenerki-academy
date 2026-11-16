#!/usr/bin/env node
// End-to-end audit of 30 real authored Excel lesson screens, 30 case quizzes,
// all 12 bonus tasks and 8 interactive chart/table exercises.
// Runs against the Expo production bundle with only synthetic Auth and Supabase data.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.TRENERKI_PLAYWRIGHT_MODULE||'playwright');
const base=new URL(process.argv[2]||'http://127.0.0.1:8795').origin;
const api='https://kcvvixcjuwglfvdpypzs.supabase.co';
const data=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const lessons=data('content/v2-excel-skroty.json').lessons;
const missions=data('content/excel-professional-missions.json').missions;
const bonus=data('content/excel-bonus-chapters.json').chapters;
const homeworks=data('content/excel-real-homework-30.json').lessons;
assert.equal(lessons.length,30);
assert.equal(missions.length,30);
assert.equal(bonus.length,12);
const user={id:'00000000-0000-4000-a000-0000000000f0',email:'all-excel-qa@example.test',
 aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};
const cors={'access-control-allow-origin':base,
 'access-control-allow-headers':'apikey,authorization,content-type,x-client-info,accept-profile,content-profile,prefer',
 'access-control-allow-methods':'GET,POST,OPTIONS'};
const visualLessons=new Set([9,15,17,18,20,25,26,29]);
async function stubProduction(page,attempts){
 await page.addInitScript(({user})=>{
  localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify({
   access_token:'qa-only-excel-token',refresh_token:'qa-only-refresh',
   expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user}));
 },{user});
 await page.route(url=>url.origin===base&&url.pathname==='/nauka',async route=>{
  const response=await route.fetch({url:base+'/nauka.html'});
  await route.fulfill({response});
 });
 await page.route(url=>url.origin===api,async route=>{
  const request=route.request(),url=new URL(request.url()),table=url.pathname.split('/').at(-1);
  const response=(obj,status=200)=>route.fulfill({status,headers:cors,contentType:'application/json',body:JSON.stringify(obj)});
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
  if(url.pathname==='/auth/v1/user')return response(user);
  if(table==='ta_enrollments')return response([{id:'qa-enrollment'}]);
  if(table==='ta_courses')return response([{title_pl:'Excel — kompletny kurs od podstaw do eksperta',description_pl:'Ćwiczenia kontrolne'}]);
  if(table==='ta_lessons')return response(lessons);
  if(table==='ta_learning_progress')return response(Array.from({length:29},(_,lesson_no)=>({lesson_no})));
  if(table==='ta_learning_attempts'||table==='ta_drafts')return response([]);
  if(table==='ta-lesson-guide'){
   const body=(()=>{try{return JSON.parse(request.postData()||'{}')}catch{return {}}})();
   if(body.action==='attempt'&&body.mode==='case'){
    const l=lessons.find(x=>x.lesson_no===body.lesson_no);
    const correct=!!l&&body.selected_index===l.material.learning.correct;
    attempts.push({lesson:body.lesson_no,mode:'case',index:body.selected_index,correct});
    return response({ok:true,correct});
   }
   if(body.action==='attempt'&&body.mode==='keyboard'){
    const l=lessons.find(x=>x.lesson_no===body.lesson_no);
    const declared=!!l?.material?.shortcuts?.some(x=>x.combo===body.active_combo);
    const correct=declared&&body.active_combo===body.selected_combo;
    attempts.push({lesson:body.lesson_no,mode:'keyboard',active:body.active_combo,selected:body.selected_combo,correct});
    return response({ok:true,correct});
   }
   return response({ok:true,history:[],opening:'Pomoc testowa',can_reply:true});
  }
  return response({ok:true});
 });
}
function expectedForMission(m,round){
 const i=m.lesson_no;
 if(i===1)return '3 arkusze';
 if(i===28)return '4 błędy';
 if(i===7||i===12)return m.expected+'%';
 if(i===11)return '=D3*C3';
 if(i===14)return '=$H$2*C2';
 if(i===5&&round===2)return '=C2*D2';
 if(i===6&&round===2)return '=SUMA(E2:E4)';
 if(i===26)return '−853,65 zł';
 return m.unit==='number'&&round===1?m.expected+' zł':m.expected;
}
async function auditVisual(page,no){
 const lab=page.getByTestId('excel-visual-practice');
 await lab.waitFor();
 await lab.getByTestId('excel-visual-total').filter({hasText:'830 zł'}).waitFor();
 await lab.getByTestId('excel-visual-qty-01').fill('5');
 await lab.getByTestId('excel-visual-total').filter({hasText:'950 zł'}).waitFor();
 if(no===25){
  await lab.getByTestId('excel-visual-pivot-stale').filter({hasText:/wymaga odświeżenia/}).waitFor();
  await lab.getByRole('button',{name:'Sprawdź moją analizę'}).click();
  await lab.getByTestId('excel-visual-feedback').filter({hasText:/Odśwież/}).waitFor();
  await lab.getByRole('button',{name:'Odśwież tabelę przestawną'}).click();
  await lab.getByTestId('excel-visual-pivot-stale').filter({hasText:/aktualna/}).waitFor();
 }else{
  await lab.getByRole('button',{name:'Kategoria',exact:true}).click();
 }
 await lab.getByTestId('excel-visual-answer').fill(no===25?'260 zł':'710 zł');
 await lab.getByRole('button',{name:'Sprawdź moją analizę'}).click();
 await lab.getByTestId('excel-visual-feedback').filter({hasText:/Zgadza się/}).waitFor();
}
async function auditHomework(page,no,round){
 const item=homeworks.find(x=>x.lessonNo===no);
 assert(item,'Missing homework for '+no);
 const panel=page.getByTestId('excel-real-homework-'+no);
 await panel.waitFor();
 const input=panel.getByTestId('excel-homework-answer');
 if(!await input.isVisible())await panel.getByTestId('excel-homework-toggle').click();
 await input.waitFor();
 const download=panel.getByRole('link',{name:/Pobierz:/}).first();
 const url=await download.getAttribute('href');
 assert.equal(url,item.starter.file,'Wrong workbook starter for '+no);
 const response=await page.request.get(base+url);
 assert.equal(response.status(),200,'Homework starter unavailable '+no);
 const body=await response.text();
 assert(body.length>50&&body.includes(';'),'Empty or unstructured homework starter '+no);

 if(item.comparisonStarter){
  const extra=panel.getByTestId('excel-homework-comparison-download');
  const extraUrl=await extra.getAttribute('href');
  assert.equal(extraUrl,item.comparisonStarter.file);
  assert.equal((await page.request.get(base+extraUrl)).status(),200,'Comparison CSV missing '+no);
 }
 if(item.bonusStarter){
  const extra=panel.getByTestId('excel-homework-bonus-download');
  const extraUrl=await extra.getAttribute('href');
  assert.equal(extraUrl,item.bonusStarter.file);
  const response=await page.request.get(base+extraUrl);
  assert.equal(response.status(),200,'Advanced CSV missing '+no);
  assert((await response.text()).includes('PRO-0367'));
 }
 await input.fill('NIE-MA-TAKIEJ-ODPOWIEDZI');
 await panel.getByTestId('excel-homework-check').click();
 await panel.getByTestId('excel-homework-feedback').filter({hasText:/Uwaga/}).waitFor();
 const correct=round===1&&item.kind==='number'?item.expected+' zł':
  round===2&&item.kind==='percent'?item.expected+'%':item.expected;
 await input.fill(correct);
 await panel.getByTestId('excel-homework-check').click();
 await panel.getByTestId('excel-homework-feedback').filter({hasText:/✓/}).waitFor();
 await panel.getByTestId('excel-homework-step-0').click();
 await panel.getByTestId('excel-homework-step-progress').filter({hasText:/1\//}).waitFor();
 await panel.getByTestId('excel-homework-criterion-0').click();
 await panel.getByTestId('excel-homework-criterion-progress').filter({hasText:/1\//}).waitFor();
 await panel.getByTestId('excel-homework-solution-toggle').click();
 await panel.getByTestId('excel-homework-solution').waitFor();
 return {download:true,answer:true,checklist:true};
}
async function auditKeyboard(page,authored){
 const shortcuts=authored?.material?.shortcuts||[];
 if(!shortcuts.length)return 0;
 assert.equal(shortcuts.length,5,'Sprawdź komplet pięciu skrótów w każdej lekcji 11–18');
 const panel=page.getByTestId('excel-keyboard-lesson');
 await panel.waitFor();
 for(const shortcut of shortcuts){
  await panel.getByRole('button',{name:shortcut.combo+' · '+shortcut.label,exact:true}).click();
  const quiz=panel.getByTestId('excel-keyboard-quiz');
  await quiz.waitFor();
  const options=quiz.getByRole('button');
  assert.equal(await options.count(),3,'3 alternatywy do rozpoznania '+shortcut.combo);
  let wrong=null,correct=null;
  for(let index=0;index<3;index++){
   const button=options.nth(index),text=await button.innerText();
   if(text.includes(shortcut.combo+' · '+shortcut.label))correct=button;
   else if(wrong===null)wrong=button;
  }
  assert(correct&&wrong,'Brak poprawnego lub niepoprawnego przycisku '+shortcut.combo);
  await wrong.click();
  await quiz.getByText('Porównaj opis działania z wybranym skrótem i spróbuj ponownie.').waitFor();
  await correct.click();
  await quiz.getByText('Wynik zapisany.').waitFor();
 }
 return shortcuts.length;
}
async function auditBonus(page){
 const lib=page.getByTestId('excel-encyclopedia');
 await lib.waitFor();
 const bonusButton=lib.getByRole('button',{name:'Biblioteka — 12 rozdziałów'});
 if(!await bonusButton.isVisible())await lib.getByRole('button',{name:/Biblioteka Excel: historia/}).click();
 await bonusButton.click();
 for(const item of bonus){
  await lib.getByRole('button',{name:'Otwórz rozdział dodatkowy '+item.title}).click();
  const card=lib.getByTestId('excel-bonus-chapter-detail');
  const entry=card.getByRole('textbox',{name:'Odpowiedź w dodatkowym rozdziale Excel'});
  const check=card.getByRole('button',{name:'Sprawdź dodatkowy rozdział'});
  await entry.fill('TO-NIE-JEST-ODPOWIEDŹ');await check.click();
  await card.getByTestId('excel-bonus-wrong').waitFor();
  const value=item.id==='pierwszy-kwadrans'?'450 zł':
   item.id==='projektowanie-danych'?'2 rekordy':
   item.id==='power-query-pierwsze-kroki'?'8 rekordów':item.answer;
  await entry.fill(value);await check.click();
  await card.getByTestId('excel-bonus-correct').waitFor();
 }
 await lib.getByText('Samokontrola tej sesji: 12/12').waitFor();
 return 12;
}
async function auditScreen(browser,round){
 const mobile=round===1;
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:820},
  isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1,locale:'pl-PL'});
 const page=await context.newPage(),attempts=[],errors=[];
 page.setDefaultTimeout(18000);
 page.on('pageerror',error=>errors.push(error.message));
 let missionCount=0,caseCount=0,bonusCount=0,visualCount=0,keyboardCount=0,homeworkCount=0;
 try{
  await stubProduction(page,attempts);
  for(const m of missions){
   const no=m.lesson_no;
   await page.goto(base+'/nauka?course=excel-skroty&lesson='+(no+1),{waitUntil:'domcontentloaded'});
   await page.getByTestId('lesson-heading').or(page.getByTestId('course-reading-introduction')).first().waitFor({timeout:25000});
   const consent=page.getByRole('region',{name:'Zgoda na pomiary reklamowe'});
   if(await consent.isVisible().catch(()=>false))await consent.getByRole('button',{name:'Odrzuć',exact:true}).click();
   if(no===0){
    await page.getByTestId('course-reading-introduction').waitFor();
    await page.getByRole('button',{name:'Przejdź do wyjaśnień pierwszej lekcji →'}).click();
   }
   await page.getByTestId('lesson-heading').waitFor({timeout:25000});
   const mission=page.getByTestId('excel-mission-'+no);
   await mission.waitFor({timeout:25000});
   await mission.getByTestId('excel-mission-answer-label').waitFor();
   await mission.getByTestId('excel-mission-answer-instruction').waitFor();
   await page.getByTestId('excel-deep-lesson-'+no).waitFor();
   const answer=mission.getByRole('textbox',{name:'Twoja odpowiedź na zadanie Excel'});
   const check=mission.getByRole('button',{name:'Sprawdź wynik zadania Excel'});
   await check.click();await mission.getByTestId('excel-mission-wrong').waitFor();
   await answer.fill('TO-NIE-JEST-ODPOWIEDŹ');await check.click();
   await mission.getByTestId('excel-mission-wrong').waitFor();
   await answer.fill(expectedForMission(m,round));await check.click();
   await mission.getByTestId('excel-mission-correct').waitFor();
   missionCount++;

   const authored=lessons[no]?.material?.learning;
   assert(authored&&authored.options?.length===3&&authored.correct>=0&&authored.correct<3);
   const card=page.getByTestId('case-checkpoint');
   await card.waitFor();
   const wrong=authored.options.find((_,i)=>i!==authored.correct);
   await card.getByRole('button').filter({hasText:wrong}).first().click();
   await card.getByText('Jeszcze nie. Spróbuj raz jeszcze.').waitFor();
   await card.getByRole('button').filter({hasText:authored.options[authored.correct]}).first().click();
   await card.getByText('✓ Poprawna odpowiedź. Zapisano wynik.').waitFor();
   caseCount++;
   keyboardCount+=await auditKeyboard(page,lessons[no]);
   await auditHomework(page,no,round);homeworkCount++;

   if(visualLessons.has(no)){await auditVisual(page,no);visualCount++;}
   if(no===0)bonusCount=await auditBonus(page);

   const overflow=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   assert(overflow.scroll<=overflow.width+3,'Horizontal overflow: lesson '+(no+1)+' '+JSON.stringify(overflow));
   console.log('✓ '+(mobile?'telefon':'desktop')+' · lekcja '+(no+1)+'/30: misja + quiz'+(visualLessons.has(no)?' + wykres/pivot':''));
  }
  assert.equal(missionCount,30);assert.equal(caseCount,30);assert.equal(bonusCount,12);assert.equal(visualCount,8);
  assert.equal(keyboardCount,40,'Osiem lekcji po pięć skrótów');
  assert.equal(homeworkCount,30,'Każda lekcja musi mieć sprawdzoną pracę domową');
  const cases=attempts.filter(x=>x.mode==='case'),keys=attempts.filter(x=>x.mode==='keyboard');
  assert.equal(cases.length,60,'Wrong and correct attempts for every case quiz');
  assert.equal(cases.filter(x=>x.correct).length,30);
  assert.equal(cases.filter(x=>!x.correct).length,30);
  assert.equal(keys.length,80,'Wrong and correct attempts for every keyboard quiz');
  assert.equal(keys.filter(x=>x.correct).length,40);
  assert.equal(keys.filter(x=>!x.correct).length,40);
  assert.deepEqual(errors,[],'No JS errors in the 30-lesson audit');
  return {viewport:mobile?'390×844 mobile':'1365×820 desktop',
   missions:missionCount,cases:caseCount,bonus:bonusCount,visual:visualCount,keyboard:keyboardCount,homeworks:homeworkCount,attempts:attempts.length,passed:true};
 }finally{await context.close();}
}
const browser=await chromium.launch({headless:true});
const report={suite:'Excel wszystkie lekcje',source:'local authored curriculum, synthetic authenticated user',results:[]};
try{
 for(let round=1;round<=2;round++)report.results.push(await auditScreen(browser,round));
 assert(report.results.every(r=>r.passed));
 console.log('✓ EXCEL: 60/60 misji, 60/60 quizów, 80/80 skrótów, 60/60 prac domowych, 24/24 bonusów, 16/16 wykresów/pivotów na telefonie i desktopie');
}finally{
 await browser.close();
 writeFileSync('/tmp/trenerki-excel-all-lessons.json',JSON.stringify(report,null,2));
}
