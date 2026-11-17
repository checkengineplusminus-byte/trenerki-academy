#!/usr/bin/env node
// Real browser quality audit. Synthetic authenticated learner — never modifies real students.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {chromium,firefox,webkit}=await import('playwright');
const all=JSON.parse(readFileSync(new URL('../content/norweski-budowa-full-20261117.json',import.meta.url),'utf8'));
const lessons=all.lessons,origin=new URL(process.argv[2]||'http://127.0.0.1:8787').origin;
const apiOrigin='https://kcvvixcjuwglfvdpypzs.supabase.co';
const user={id:'00000000-0000-4000-a000-000000000081',email:'norsk-study@example.test',aud:'authenticated',role:'authenticated',email_confirmed_at:'2026-01-01T00:00:00Z',app_metadata:{},user_metadata:{}};
const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'apikey,authorization,content-type,x-client-info,accept-profile,content-profile,prefer','access-control-allow-methods':'GET,POST,OPTIONS'};
const profiles=[
 ['chromium','desktop-large',1440,900,false],['chromium','desktop-small',1280,720,false],
 ['chromium','tablet-landscape',1024,768,false],['chromium','android',412,915,true],
 ['chromium','small-mobile',320,640,true],['firefox','desktop',1366,768,false],
 ['firefox','mobile-sized',375,812,false],['webkit','desktop',1440,900,false],
 ['webkit','iphone',393,852,true],['webkit','ipad',820,1180,true]
];
const byNo=new Map(lessons.map(l=>[l.lesson_no,l]));
async function setup(page,number){
 await page.addInitScript(({user})=>{
  localStorage.setItem('trenerki_ads_consent_v1','no');
  localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify({
   access_token:'synthetic-review-access',refresh_token:'synthetic-review-refresh',
   expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user
  }));
 },{user});
 await page.route(url=>url.origin===origin&&url.pathname==='/nauka',async route=>{
  const response=await route.fetch({url:origin+'/nauka.html'});
  await route.fulfill({response});
 });
 const completed=Array.from({length:number},(_,i)=>({lesson_no:i})),attempts=[];
 let draft=null;
 await page.route(url=>url.origin===apiOrigin,async route=>{
  const req=route.request(),u=new URL(req.url()),table=u.pathname.split('/').at(-1);
  const respond=(value,status=200)=>route.fulfill({headers,status,contentType:'application/json',body:JSON.stringify(value)});
  if(req.method()==='OPTIONS')return route.fulfill({headers,status:204});
  if(u.pathname==='/auth/v1/user')return respond(user);
  if(table==='ta_enrollments')return respond([{id:'synthetic-enrollment'}]);
  if(table==='ta_lessons')return respond(lessons);
  if(table==='ta_drafts'){
   if(req.method()==='POST'){draft=req.postDataJSON();return respond([] ,201);}
   return respond(draft?[draft]:[]);
  }
  if(table==='ta_learning_progress')return respond(completed);
  if(table==='ta_courses')return respond([{title_pl:all.course_title,description_pl:'Praktyczny norweski na budowie'}]);
  if(table==='ta_learning_attempts')return respond(attempts);
  if(table==='ta-lesson-guide'){
   const body=req.postDataJSON();
   if(body.action==='attempt'){
    const mat=byNo.get(body.lesson_no).material;
    const q=body.mode==='construction'?mat.construction?.roleplay:mat.learning;
    const correct=body.selected_index===q?.correct;
    attempts.push({lesson_no:body.lesson_no,course_slug:body.course_slug,mode:body.mode,correct});
    return respond({ok:true,correct});
   }
   if(body.action==='complete')return respond({ok:true,completed:true});
   return respond({ok:true,ready:true,available:true});
  }
  return respond({ok:true});
 });
}
async function checkPublic(page,id){
 await page.goto(origin+'/academy/kursy/norweski-na-budowie.html',{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('ol.program li').count(),30,id+': 30 public lesson titles');
 assert((await page.locator('body').innerText()).includes('30 lekcji'),id+': public count');
 assert(await page.getByText('Słowa, które już częściowo znasz').count()>0,id+': public cognate preview');
 const overflow=await page.evaluate(()=>({w:document.documentElement.scrollWidth,viewport:window.innerWidth}));
 assert(overflow.w<=overflow.viewport+5,id+': mobile horizontal overflow '+JSON.stringify(overflow));
}
async function checkLesson(ctx,id,number){
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 try{
  await setup(page,number);
  await page.goto(origin+'/nauka?course=norweski-na-budowie&lesson='+(number+1),{waitUntil:'domcontentloaded'});
  if(number===0){
   const intro=page.getByTestId('course-reading-introduction');
   await intro.waitFor({timeout:25000});
   await intro.getByRole('button',{name:'Przejdź do wyjaśnień pierwszej lekcji →'}).click();
  }
  const heading=page.getByTestId('lesson-heading');
  await heading.waitFor({timeout:25000});
  assert.equal((await heading.innerText()).trim(),byNo.get(number).title_pl,id+' incorrect lesson title '+number);
  await page.getByText('WARTO WIEDZIEĆ',{exact:true}).waitFor();
  await page.getByText('Wyjaśnienie krok po kroku',{exact:true}).waitFor();
  const bridge=page.getByTestId('norwegian-word-bridge');
  await bridge.waitFor();
  const list=byNo.get(number).material.language_bridge.words;
  assert((await bridge.innerText()).includes(String(list.length)),id+': vocabulary count '+number);
  if(number===0){
   await page.getByTestId('norwegian-word-search').fill('akkurat');
   await bridge.getByText('akkurat',{exact:true}).waitFor();
   await page.getByTestId('norwegian-word-search').fill('kollega');
   await bridge.getByText('kollega',{exact:true}).waitFor();
   await page.getByTestId('norwegian-word-search').fill('');
   await bridge.getByRole('button',{name:'Pokaż całą listę: 83 słów'}).click();
   assert.equal(await page.getByTestId('norwegian-word-row').count(),83,id+': vocabulary expansion');
   await bridge.getByRole('button',{name:'Zwiń listę słów'}).click();
   await bridge.getByText('Pułapki — podobnie brzmi, inaczej znaczy').waitFor();
  }
  const note=page.getByTestId('norwegian-homework');
  await note.waitFor();
  const answer='Jeg trenger en kontroll. Kan du gjenta? / Potrzebuję kontroli. Czy możesz powtórzyć?';
  await note.getByTestId('norwegian-homework-note').fill(answer);
  await note.getByRole('button',{name:'Zapisz zadanie domowe'}).click();
  await note.getByText('✓ Zadanie zapisano w Twoim zeszycie. Możesz je później poprawić.').waitFor();
  // Reopen lesson and restore the private workbook note from mocked PostgREST.
  await page.reload({waitUntil:'domcontentloaded'});
  const noteAgain=page.getByTestId('norwegian-homework-note');
  if(number===0){
   // After a refresh, lesson 1 intentionally reopens the reading introduction.
   // Wait for React to initialize before choosing the visible entry point.
   const intro=page.getByTestId('course-reading-introduction');
   await intro.or(noteAgain).first().waitFor({timeout:25000});
   if(await intro.isVisible())await intro.getByRole('button',{name:'Przejdź do wyjaśnień pierwszej lekcji →'}).click();
  }
  await noteAgain.waitFor({timeout:25000});
  assert.equal(await noteAgain.inputValue(),answer,id+': lost workbook text '+number);
  const mat=byNo.get(number).material,q=mat.construction?.roleplay??mat.learning;
  const quiz=mat.construction?page.getByTestId('construction-checkpoint'):page.getByTestId('case-checkpoint');
  await quiz.waitFor();
  await quiz.getByRole('button').filter({hasText:q.options[q.correct]}).first().click();
  if(mat.construction)await quiz.getByText('Wynik zapisany — możesz przejść dalej.').waitFor();
  else await quiz.getByText('✓ Poprawna odpowiedź. Zapisano wynik.').waitFor();
  assert.deepEqual(errors,[],id+': browser error '+number);
 }finally{await page.close();}
}
let passed=0;
for(const [engine,name,width,height,mobile] of profiles){
 const id=engine+' '+name+' '+width+'x'+height;
 const browser=await {chromium,firefox,webkit}[engine].launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1});
  const page=await context.newPage();await checkPublic(page,id);await page.close();
  for(const n of [0,14,29])await checkLesson(context,id,n);
  await context.close();passed++;console.log('✓ '+passed+'/10 '+id+': 30 public titles, 83 word cards, curiosity, homework persistence, quiz in lessons 1/15/30');
 }finally{await browser.close();}
}
assert.equal(passed,10);
console.log('✓ Norwegian 10/10 profiles: Chromium, Firefox, WebKit; phone, tablet, desktop; protected homework and quiz flows');
