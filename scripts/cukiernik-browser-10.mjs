#!/usr/bin/env node
// Real Playwright browser tests: ten distinct engines/viewport/device profiles.
// Auth and learning API are synthetic; tests never use paid learner accounts.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {chromium,firefox,webkit}=await import('playwright');
const data=JSON.parse(readFileSync(new URL('../content/cukiernik-pro-20261117.json',import.meta.url),'utf8'));
const lessons=data.lessons;
const origin=new URL(process.argv[2]||'http://127.0.0.1:8787').origin;
const apiOrigin='https://kcvvixcjuwglfvdpypzs.supabase.co';
const user={id:'00000000-0000-4000-a000-000000000001',email:'cukiernik-review@example.test',aud:'authenticated',role:'authenticated',email_confirmed_at:'2026-01-01T00:00:00Z',app_metadata:{},user_metadata:{}};
const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'apikey,authorization,content-type,x-client-info,accept-profile,content-profile,prefer','access-control-allow-methods':'GET,POST,OPTIONS'};
const profiles=[
 ['chromium','desktop-large',1440,900,false],
 ['chromium','desktop-compact',1280,720,false],
 ['chromium','tablet-landscape',1024,768,false],
 ['chromium','android-mobile',412,915,true],
 ['chromium','small-mobile',320,640,true],
 ['firefox','desktop',1366,768,false],
 ['firefox','narrow-mobile',375,812,false],
 ['webkit','desktop',1440,900,false],
 ['webkit','iphone',393,852,true],
 ['webkit','ipad',820,1180,true]
];
const archive=new Map(lessons.map(l=>[l.lesson_no,l]));
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
 const completed=Array.from({length:number},(_,i)=>({lesson_no:i})),answers=[];
 await page.route(url=>url.origin===apiOrigin,async route=>{
  const req=route.request(),u=new URL(req.url()),table=u.pathname.split('/').at(-1);
  const respond=(value,status=200)=>route.fulfill({headers,status,contentType:'application/json',body:JSON.stringify(value)});
  if(req.method()==='OPTIONS')return route.fulfill({headers,status:204});
  if(u.pathname==='/auth/v1/user')return respond(user);
  if(table==='ta_enrollments')return respond([{id:'synthetic'}]);
  if(table==='ta_lessons')return respond(lessons.map(x=>({lesson_no:x.lesson_no,title_pl:x.title_pl,material:x.material})));
  if(table==='ta_drafts')return respond([]);
  if(table==='ta_learning_progress')return respond(completed);
  if(table==='ta_courses')return respond([{title_pl:'Bądź lepszym cukiernikiem',description_pl:data.description}]);
  if(table==='ta_learning_attempts')return respond(answers);
  if(table==='ta-lesson-guide'){
   const body=req.postDataJSON();
   if(body.action==='attempt'){
    const target=archive.get(body.lesson_no).material.learning;
    const correct=body.selected_index===target.correct;
    answers.push({lesson_no:body.lesson_no,course_slug:body.course_slug,mode:body.mode,correct});
    return respond({ok:true,correct});
   }
   if(body.action==='complete')return respond({ok:true,completed:true});
   return respond({ok:true,ready:true,available:true});
  }
  return respond({ok:true});
 });
}
async function checkStatic(page,profile,allImages){
 await page.goto(origin+'/academy/kursy/lepszy-cukiernik.html',{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('ol.program li').count(),50,profile+': public course list');
 assert((await page.locator('body').innerText()).includes('50 lekcji'),profile+': wrong lesson count');
 const scroll=await page.evaluate(()=>({w:document.documentElement.scrollWidth,v:window.innerWidth}));
 assert(scroll.w<=scroll.v+4,profile+': horizontal overflow '+JSON.stringify(scroll));
 const n=allImages?50:5;
 for(let i=0;i<n;i++){
  const k=allImages?i:(i*11+Math.round(profile.length))%50;
  const name='cukiernik-ilustracja-'+String(k+1).padStart(2,'0')+'.svg';
  const pic=await page.evaluate(url=>new Promise((resolve,reject)=>{
   const image=new Image();image.onload=()=>resolve([image.naturalWidth,image.naturalHeight]);
   image.onerror=()=>reject(new Error('Could not decode '+url));image.src=url;
  }),origin+'/academy/assets/'+name);
  assert.deepEqual(pic,[960,540],profile+': missing illustration '+name);
 }
}
async function checkProtected(ctx,profile,number){
 const page=await ctx.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 try{
  await setup(page,number);
  await page.goto(origin+'/nauka?course=lepszy-cukiernik&lesson='+(number+1),{waitUntil:'domcontentloaded'});
  if(number===0){
   const intro=page.getByTestId('course-reading-introduction');
   await intro.waitFor({timeout:25000});
   await intro.getByRole('button',{name:'Przejdź do wyjaśnień pierwszej lekcji →'}).click();
  }
  const heading=page.getByTestId('lesson-heading');
  await heading.waitFor({timeout:25000});
  assert.equal((await heading.innerText()).trim(),archive.get(number).title_pl,profile+' lesson '+number);
  await page.getByText('WARTO WIEDZIEĆ',{exact:true}).waitFor();
  await page.getByText('Wyjaśnienie krok po kroku',{exact:true}).waitFor();
  await page.getByText(/Zadanie domowe/i).first().waitFor();
  const filename='cukiernik-ilustracja-'+String(number+1).padStart(2,'0')+'.svg';
  const img=page.locator('img[src*="'+filename+'"]').first();
  await img.waitFor();
  const imgInfo=await img.evaluate(async node=>{await node.decode();const bounds=node.getBoundingClientRect();return {w:node.naturalWidth,h:node.naturalHeight,clientWidth:Math.round(bounds.width),clientHeight:Math.round(bounds.height),src:node.currentSrc||node.src};});
  // Different browser engines may calculate SVG naturalWidth from responsive sizing.
  // Confirm that the source loads and the visual remains 16:9, not a fixed pixel count.
  const valid=imgInfo.w>0&&imgInfo.h>0&&imgInfo.clientWidth>0&&imgInfo.clientHeight>0&&Math.abs(imgInfo.w/imgInfo.h-16/9)<0.04;
  assert(valid,profile+': in-lesson illustration inaccessible or distorted '+number+' '+JSON.stringify(imgInfo));
  const q=archive.get(number).material.learning;
  const card=page.getByTestId('case-checkpoint');
  await card.waitFor();
  await card.getByRole('button').filter({hasText:q.options[q.correct]}).first().click();
  await page.getByText('✓ Poprawna odpowiedź. Zapisano wynik.').waitFor({timeout:15000});
  assert.equal(errors.length,0,profile+': JS error '+errors.join('; '));
 }finally{await page.close()}
}
let passed=0;
for(const [engine,name,width,height,mobile] of profiles){
 const p=engine+' / '+name+' '+width+'x'+height;
 const browser=await {chromium,firefox,webkit}[engine].launch({headless:true});
 try{
  const ctx=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1});
  const page=await ctx.newPage();
  await checkStatic(page,p,passed===0);
  await page.close();
  for(const lessonNo of [0,24,49])await checkProtected(ctx,p,lessonNo);
  await ctx.close();passed++;
  console.log('✓ '+String(passed).padStart(2,'0')+'/10 · '+p+' — public program, images, lessons 1/25/50, quiz result');
 }finally{await browser.close()}
}
assert.equal(passed,10);
console.log('✓ 10/10 real browser profiles complete with synthetic authenticated learning');
