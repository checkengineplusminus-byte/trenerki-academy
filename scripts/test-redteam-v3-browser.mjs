#!/usr/bin/env node
// Browser checks use a synthetic account + intercepted Supabase REST. No learner writes.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {chromium,firefox,webkit}=await import('playwright');
const rows=JSON.parse(readFileSync(new URL('../content/expert-64-redteam-fixture-v3-20261117.json',import.meta.url),'utf8')).lessons;
assert.equal(rows.length,64);
const origin=new URL(process.argv[2]||'http://127.0.0.1:8787').origin,api='https://kcvvixcjuwglfvdpypzs.supabase.co';
const user={id:'00000000-0000-4000-a000-000000000093',email:'adversarial-check@example.test',aud:'authenticated',role:'authenticated',email_confirmed_at:'2026-01-01T00:00:00Z',app_metadata:{},user_metadata:{}};
const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'apikey,authorization,content-type,x-client-info,accept-profile,content-profile,prefer','access-control-allow-methods':'GET,POST,OPTIONS'};
const mode=process.env.TRENERKI_REDTEAM_MODE||'all';
const profiles=mode==='all'?[['chromium','desktop',1365,840,false],['chromium','phone',390,844,true]]:
[['firefox','desktop',1366,768,false],['webkit','iphone',393,852,true]];
const courses=[...new Set(rows.map(x=>x.course_slug))];
const lessons=mode==='all'?rows:rows.filter(x=>x.lesson_no===Math.min(...rows.filter(y=>y.course_slug===x.course_slug).map(y=>y.lesson_no)));
async function check(ctx,row,label,representative){
 const page=await ctx.newPage(),errors=[];
 let attemptedWrites=0;
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.addInitScript(({user})=>{
   localStorage.setItem('trenerki_ads_consent_v1','no');
   localStorage.setItem('sb-kcvvixcjuwglfvdpypypzs-auth-token',JSON.stringify({
    access_token:'synthetic',refresh_token:'synthetic',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user
   }));
   localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify({
    access_token:'synthetic-redteam',refresh_token:'synthetic-redteam',
    expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user
   }));
  },{user});
  await page.route(url=>url.origin===origin&&url.pathname==='/nauka',async route=>{
   const response=await route.fetch({url:origin+'/nauka.html'});await route.fulfill({response});
  });
  await page.route(url=>url.origin===api,async route=>{
   const request=route.request(),url=new URL(request.url()),tbl=url.pathname.split('/').at(-1);
   const respond=(value,status=200)=>route.fulfill({headers,status,contentType:'application/json',body:JSON.stringify(value)});
   if(request.method()==='OPTIONS')return route.fulfill({headers,status:204});
   if(url.pathname==='/auth/v1/user')return respond(user);
   if(tbl==='ta_enrollments')return respond([{id:'synthetic-enrollment'}]);
   if(tbl==='ta_lessons')return respond([row]);
   if(tbl==='ta_drafts')return respond([]);
   if(tbl==='ta_learning_progress')return respond(Array.from({length:row.lesson_no},(_,i)=>({lesson_no:i})));
   if(tbl==='ta_courses')return respond([{title_pl:row.title_pl,description_pl:'Materiały treningowe'}]);
   if(tbl==='ta_learning_attempts'){if(request.method()!=='GET')attemptedWrites++;return respond([]);}
   if(tbl==='ta-lesson-guide'){
    const data=request.postDataJSON();
    if(data.action==='attempt'||data.action==='complete')attemptedWrites++;
    return respond({ok:true,ready:true,available:true});
   }
   return respond({ok:true});
  });
  await page.goto(origin+'/nauka?course='+row.course_slug+'&lesson='+(row.lesson_no+1),{waitUntil:'domcontentloaded'});
  const intro=page.getByTestId('course-reading-introduction'),heading=page.getByTestId('lesson-heading');
  await intro.or(heading).first().waitFor({timeout:30000});
  if(await intro.isVisible())await intro.getByRole('button',{name:'Przejdź do wyjaśnień pierwszej lekcji →'}).click();
  await heading.waitFor({timeout:30000});
  assert.equal((await heading.innerText()).trim(),row.title_pl,label+': incorrect lesson '+row.course_slug);
  const target=page.getByTestId('adversarial-lesson-test');
  await target.waitFor({timeout:15000});
  const q=row.material.redteam_quiz;
  await target.getByText(q.question,{exact:true}).waitFor();
  assert.equal(await target.locator('[data-testid^="adversarial-option-"]').count(),4,label+' '+row.course_slug+': answer count');
  assert.equal(await target.getByTestId('adversarial-solution').count(),0,'Solution leaked before attempt');
  const wrong=q.options.findIndex((_,i)=>i!==q.correct);
  await target.getByTestId('adversarial-option-'+wrong).click();
  await target.getByText('Jeszcze nie — znalazłeś pułapkę').waitFor({timeout:12000});
  assert.equal(await target.getByTestId('adversarial-solution').count(),0,'Wrong answer must not reveal correct answer on first attempt');
  await target.getByTestId('adversarial-retry').click();
  await target.getByTestId('adversarial-option-'+q.correct).click();
  await target.getByText('✓ Trafna decyzja').waitFor();
  const solution=target.getByTestId('adversarial-solution');
  await solution.waitFor();
  assert((await solution.innerText()).includes(q.evidence),label+': missing evidence '+row.course_slug);
  if(representative){
   await page.reload({waitUntil:'domcontentloaded'});
   await intro.or(page.getByTestId('adversarial-lesson-test')).first().waitFor({timeout:30000});
   if(await intro.isVisible())await intro.getByRole('button',{name:'Przejdź do wyjaśnień pierwszej lekcji →'}).click();
   const quiz2=page.getByTestId('adversarial-lesson-test');
   await quiz2.waitFor();
   assert.equal(await quiz2.getByTestId('adversarial-solution').count(),0,label+': solution did not reset after reload');
   const wrongs=q.options.map((_,i)=>i).filter(i=>i!==q.correct);
   await quiz2.getByTestId('adversarial-option-'+wrongs[0]).click();
   await quiz2.getByTestId('adversarial-retry').click();
   await quiz2.getByTestId('adversarial-option-'+wrongs[1]).click();
   await quiz2.getByTestId('adversarial-reveal').click();
   await quiz2.getByTestId('adversarial-solution').waitFor();
  }
  assert.equal(attemptedWrites,0,'Optional red-team test must never mutate the official progress/quiz '+row.course_slug);
  assert.deepEqual(errors,[],label+': JavaScript errors '+errors.join('; '));
 }finally{await page.close();}
}
let n=0;
for(const [engine,label,width,height,mobile] of profiles){
 const b=await {chromium,firefox,webkit}[engine].launch({headless:true});
 try{
  const ctx=await b.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1});
  for(const row of lessons){await check(ctx,row,engine+' '+label,mode!=='all');n++;}
  await ctx.close();console.log('✓ '+engine+' '+label+': '+lessons.length+' challenges, wrong/retry/right, evidence displayed without modifying certified progress');
 }finally{await b.close();}
}
assert.equal(n,mode==='all'?128:16);
console.log('✓ '+n+' total adversarial browser checks across '+courses.length+' courses, no real student data touched');
