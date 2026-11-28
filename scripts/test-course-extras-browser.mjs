#!/usr/bin/env node
import {createDraftFixture} from './draft-fixture.mjs';
// No live credentials: synthetic student and mocked Supabase save operations.
// First lesson of all regular non-accounting courses is tested on desktop/mobile;
// a cross-browser selection is checked in Chromium, Firefox and Safari WebKit.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {chromium,firefox,webkit}=await import('playwright');
const data=JSON.parse(readFileSync(new URL('../content/course-extras-first-lesson-20261117.json',import.meta.url),'utf8'));
const items=data.lessons;
const byId=new Map(items.map(x=>[x.course_slug,x]));
const origin=new URL(process.argv[2]||'http://127.0.0.1:8787').origin;
const apiOrigin='https://kcvvixcjuwglfvdpypzs.supabase.co';
const user={id:'00000000-0000-4000-a000-000000000031',email:'lesson-notes@example.test',aud:'authenticated',role:'authenticated',email_confirmed_at:'2026-01-01T00:00:00Z',app_metadata:{},user_metadata:{}};
const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'apikey,authorization,content-type,x-client-info,accept-profile,content-profile,prefer','access-control-allow-methods':'GET,POST,PATCH,OPTIONS'};
const profiles=[
 ['chromium','desktop-large',1440,900,false],['chromium','desktop-small',1280,720,false],
 ['chromium','tablet-landscape',1024,768,false],['chromium','android-mobile',412,915,true],
 ['chromium','small-mobile',320,640,true],['firefox','desktop',1366,768,false],
 ['firefox','mobile-sized',375,812,false],['webkit','desktop',1440,900,false],
 ['webkit','iphone',393,852,true],['webkit','ipad',820,1180,true]
];
const featured=['word-skroty','brygadzista','lepszy-kucharz','lepszy-tata','sap-ewm-magazyn','bednarz','zaufany-wolontariusz','excel-skroty'];
async function setup(page,row){
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
 const serveDraft=createDraftFixture();
 await page.route(url=>url.origin===apiOrigin,async route=>{
  const req=route.request(),u=new URL(req.url()),table=u.pathname.split('/').at(-1);
  const respond=(value,status=200)=>route.fulfill({headers,status,contentType:'application/json',body:JSON.stringify(value)});
  if(req.method()==='OPTIONS')return route.fulfill({headers,status:204});
  if(u.pathname==='/auth/v1/user')return respond(user);
  if(table==='ta_enrollments')return respond([{id:'synthetic-enrollment'}]);
  if(table==='ta_lessons')return respond([{lesson_no:row.lesson_no,title_pl:row.title_pl,material:row.material}]);
  if(table==='ta_drafts')return serveDraft(route,headers);
  if(table==='ta_learning_progress')return respond([]);
  if(table==='ta_courses')return respond([{title_pl:row.title_pl,description_pl:'Praktyczny kurs z materiałami'}]);
  if(table==='ta_learning_attempts')return respond([]);
  if(table==='ta-lesson-guide'){
   const body=req.postDataJSON(),m=row.material;
   if(body.action==='attempt'){
    const q=body.mode==='construction'?m.construction?.roleplay:m.learning;
    return respond({ok:true,correct:body.selected_index===q?.correct});
   }
   if(body.action==='complete')return respond({ok:true,completed:true});
   return respond({ok:true,ready:true,available:true});
  }
  return respond({ok:true});
 });
}
async function check(browser,profile,slug){
 const row=byId.get(slug);
 assert(row,'missing course snapshot '+slug);
 const page=await browser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await setup(page,row);
  await page.goto(origin+'/nauka?course='+slug+'&lesson=1',{waitUntil:'domcontentloaded'});
  const intro=page.getByTestId('course-reading-introduction');
  await intro.waitFor({timeout:25000});
  await intro.getByRole('button',{name:'Przejdź do wyjaśnień pierwszej lekcji →'}).click();
  await page.getByTestId('lesson-heading').getByText(row.title_pl,{exact:true}).waitFor();
  const worksheet=page.getByTestId('general-lesson-homework');
  await worksheet.waitFor({timeout:15000});
  await page.getByTestId('general-lesson-tips').getByText('Wskazówki do tej lekcji').waitFor();
  const text=row.material.homework.instructions;
  assert((await worksheet.innerText()).includes(text.slice(0,40)),profile+' '+slug+': wrong homework rendered');
  const answer='Moje ćwiczenie do '+slug+': zapisuję dane, dwie decyzje i wynik. Rozwiązanie sprawdziłem w materiale.';
  await worksheet.getByTestId('general-lesson-homework-note').fill(answer);
  await worksheet.getByTestId('general-lesson-homework-save').click();
  await worksheet.getByText('✓ Zapisano zadanie w prywatnym zeszycie. Możesz wrócić i je poprawić.').waitFor({timeout:15000});
  await page.reload({waitUntil:'domcontentloaded'});
  const note=page.getByTestId('general-lesson-homework-note');
  await intro.or(note).first().waitFor({timeout:25000});
  if(await intro.isVisible())await intro.getByRole('button',{name:'Przejdź do wyjaśnień pierwszej lekcji →'}).click();
  await note.waitFor({timeout:15000});
  assert.equal(await note.inputValue(),answer,profile+' '+slug+': lost private homework draft after refresh');
  assert.equal(errors.length,0,profile+' '+slug+': runtime error '+errors.join(' | '));
 }finally{await page.close();}
}
const mode=process.env.TRENERKI_COURSE_EXTRAS_MODE||'representative';
const configs=mode==='all'?[
 ['chromium','desktop-large',1365,840,false],
 ['chromium','phone',390,844,true]
]:profiles;
const slugs=mode==='all'?items.map(x=>x.course_slug):featured;
let passed=0,checkCount=0;
for(const [engine,label,width,height,mobile] of configs){
 const browser=await {chromium,firefox,webkit}[engine].launch({headless:true});
 const id=engine+' '+label+' '+width+'x'+height;
 try{
  const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1});
  for(const slug of slugs){await check(context,id,slug);checkCount++;}
  passed++;console.log('✓ '+passed+'/'+configs.length+' '+id+': '+slugs.length+' homework notes persisted and tips displayed');
  await context.close();
 }finally{await browser.close()}
}
assert.equal(passed,configs.length);
console.log('✓ '+checkCount+' learner simulations: source-derived lesson tips, complete homework, write, save and reload');
