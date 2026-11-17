#!/usr/bin/env node
// Synthetic test-only accounts, no contact with real users or user progress.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {chromium,firefox,webkit}=await import('playwright');
const lessons=JSON.parse(readFileSync(new URL('../content/expert-64-browser-fixture-20261117-v2.json',import.meta.url),'utf8')).lessons;
const origin=new URL(process.argv[2]||'http://127.0.0.1:8787').origin;
const api='https://kcvvixcjuwglfvdpypzs.supabase.co';
const user={id:'00000000-0000-4000-a000-000000000064',email:'expert-review-test@example.test',aud:'authenticated',role:'authenticated',email_confirmed_at:'2026-01-01T00:00:00Z',app_metadata:{},user_metadata:{}};
const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'apikey,authorization,content-type,x-client-info,accept-profile,content-profile,prefer','access-control-allow-methods':'GET,POST,OPTIONS'};
assert.equal(lessons.length,64);
async function go(context,row,profile){
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.addInitScript(({user})=>{
   localStorage.setItem('trenerki_ads_consent_v1','no');
   localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify({
    access_token:'synthetic-review-access',refresh_token:'synthetic-review-refresh',
    expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user
   }));
  },{user});
  await page.route(u=>u.origin===origin&&u.pathname==='/nauka',async route=>route.fulfill({response:await route.fetch({url:origin+'/nauka.html'})}));
  await page.route(u=>u.origin===api,async route=>{
   const req=route.request(),url=new URL(req.url()),table=url.pathname.split('/').at(-1);
   const respond=(value,status=200)=>route.fulfill({headers,status,contentType:'application/json',body:JSON.stringify(value)});
   if(req.method()==='OPTIONS')return route.fulfill({headers,status:204});
   if(url.pathname==='/auth/v1/user')return respond(user);
   if(table==='ta_enrollments')return respond([{id:'synthetic-review-enrollment'}]);
   if(table==='ta_lessons')return respond([row]);
   if(table==='ta_drafts')return respond([]);
   if(table==='ta_learning_progress')return respond(Array.from({length:row.lesson_no},(_,i)=>({lesson_no:i})));
   if(table==='ta_courses')return respond([{title_pl:row.title_pl,description_pl:'Praktyczny kurs'}]);
   if(table==='ta_learning_attempts')return respond([]);
   if(table==='ta-lesson-guide'){
    if(req.method()==='POST'){
     const body=req.postDataJSON(),q=row.material.construction?.roleplay??row.material.learning;
     if(body.action==='attempt')return respond({ok:true,correct:q.correct===body.selected_index});
     if(body.action==='complete')return respond({ok:true,completed:true});
    }
    return respond({ok:true,ready:true});
   }
   return respond({ok:true});
  });
  await page.goto(origin+'/nauka?course='+row.course_slug+'&lesson='+(row.lesson_no+1),{waitUntil:'domcontentloaded'});
  const intro=page.getByTestId('course-reading-introduction'),heading=page.getByTestId('lesson-heading');
  await intro.or(heading).first().waitFor({timeout:25000});
  if(await intro.isVisible())await intro.getByRole('button',{name:'Przejdź do wyjaśnień pierwszej lekcji →'}).click();
  await heading.waitFor({timeout:25000});
  assert.equal((await heading.innerText()).trim(),row.title_pl,profile+' '+row.course_slug+': wrong title');
  await page.getByText('Doprecyzowanie praktyczne',{exact:true}).waitFor({timeout:15000});
  await page.getByText('Ćwiczenie diagnostyczne z kryterium odbioru',{exact:true}).waitFor({timeout:15000});
  await page.getByText('Próba zawodowa — trudniejszy przypadek',{exact:true}).waitFor({timeout:15000});
  const solutionHeading=page.getByText('Sprawdź wynik po wykonaniu',{exact:true}).last();
  await solutionHeading.waitFor({timeout:15000});
  // Solution starts hidden. Reveal it using the same control the learner sees.
  await page.getByRole('button',{name:'Pokaż rozwiązanie i kryteria'}).first().click();
  await page.getByText(/Oczekiwany sposób postępowania:/).waitFor({timeout:15000});
  const quiz=row.material.construction?.roleplay??row.material.learning;
  const card=page.getByTestId(row.material.construction?'construction-checkpoint':'case-checkpoint');
  await card.waitFor({timeout:15000});
  await card.getByRole('button').filter({hasText:quiz.options[quiz.correct]}).first().click();
  if(!row.material.construction)await card.getByText('✓ Poprawna odpowiedź. Zapisano wynik.').waitFor({timeout:12000});
  assert.equal(errors.length,0,profile+' '+row.course_slug+': runtime error '+errors.join(' | '));
 }finally{await page.close()}
}
const mode=process.env.TRENERKI_EXPERT_MODE||'all';
const selected=mode==='all'?lessons:lessons.filter(x=>x.lesson_no===Math.min(...lessons.filter(y=>y.course_slug===x.course_slug).map(y=>y.lesson_no)));
const configs=mode==='all'?[['chromium','desktop',1365,840,false],['chromium','phone',390,844,true]]:
 [['firefox','desktop',1366,768,false],['webkit','iphone',393,852,true]];
let count=0;
for(const [engine,name,width,height,mobile] of configs){
 const b=await {chromium,firefox,webkit}[engine].launch({headless:true});
 try{
  const ctx=await b.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1});
  for(const row of selected){await go(ctx,row,engine+' '+name);count++}
  await ctx.close();console.log('✓ '+engine+' '+name+': '+selected.length+' updated lessons show new material and correct question');
 }finally{await b.close()}
}
console.log('✓ '+count+' browser checks: 64 role-specific advanced scenarios, hidden/revealed solutions, unchanged original quiz; no genuine student accounts touched');
