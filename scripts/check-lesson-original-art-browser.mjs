#!/usr/bin/env node
// Real browser rendering of 73 production lessons with new original SVG diagrams.
// Protected user context is synthetic; the app is not allowed to touch customer data.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {chromium,firefox,webkit}=await import('playwright');
const lessons=JSON.parse(readFileSync(new URL('../content/lesson-original-art-ui-fixture-20261117.json',import.meta.url),'utf8')).lessons;
const base=new URL(process.argv[2]||'http://127.0.0.1:8787').origin,api='https://kcvvixcjuwglfvdpypzs.supabase.co';
assert.equal(lessons.length,73);
const user={id:'00000000-0000-4000-a000-000000000041',email:'image-test@example.test',aud:'authenticated',role:'authenticated',email_confirmed_at:'2026-01-01T00:00:00Z',app_metadata:{},user_metadata:{}};
const headers={'access-control-allow-origin':base,'access-control-allow-headers':'apikey,authorization,content-type,x-client-info,accept-profile,content-profile,prefer','access-control-allow-methods':'GET,POST,OPTIONS'};
async function check(context,row,label){
 const page=await context.newPage(),errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 try{
  await page.addInitScript(({user})=>{
   localStorage.setItem('trenerki_ads_consent_v1','no');
   localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify({
    access_token:'synthetic-review-access',refresh_token:'synthetic-review-refresh',
    expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user
   }));
  },{user});
  await page.route(url=>url.origin===base&&url.pathname==='/nauka',async route=>{
   await route.fulfill({response:await route.fetch({url:base+'/nauka.html'})});
  });
  await page.route(url=>url.origin===api,async route=>{
   const req=route.request(),u=new URL(req.url()),table=u.pathname.split('/').at(-1);
   const respond=(value,status=200)=>route.fulfill({headers,status,contentType:'application/json',body:JSON.stringify(value)});
   if(req.method()==='OPTIONS')return route.fulfill({headers,status:204});
   if(u.pathname==='/auth/v1/user')return respond(user);
   if(table==='ta_enrollments')return respond([{id:'synthetic-enrollment'}]);
   if(table==='ta_lessons')return respond([row]);
   if(table==='ta_drafts')return respond([]);
   if(table==='ta_learning_progress')return respond(Array.from({length:row.lesson_no},(_,i)=>({lesson_no:i})));
   if(table==='ta_courses')return respond([{title_pl:row.title_pl,description_pl:'Kurs praktyczny'}]);
   if(table==='ta_learning_attempts')return respond([]);
   if(table==='ta-lesson-guide')return respond({ok:true,ready:true,available:true});
   return respond({ok:true});
  });
  await page.goto(base+'/nauka?course='+row.course_slug+'&lesson='+(row.lesson_no+1),{waitUntil:'domcontentloaded'});
  if(row.lesson_no===0){
   const intro=page.getByTestId('course-reading-introduction');
   await intro.waitFor({timeout:30000});
   await intro.getByRole('button',{name:'Przejdź do wyjaśnień pierwszej lekcji →'}).click();
  }
  const heading=page.getByTestId('lesson-heading');
  await heading.waitFor({timeout:30000});
  assert.equal((await heading.innerText()).trim(),row.title_pl,label+': title of '+row.course_slug);
  const image=page.locator('img[src*="'+row.material.illustration+'.svg"]').first();
  await image.waitFor({timeout:20000});
  const dimensions=await image.evaluate(async node=>{
   await node.decode();
   const r=node.getBoundingClientRect();return {naturalWidth:node.naturalWidth,naturalHeight:node.naturalHeight,w:r.width,h:r.height};
  });
  assert(dimensions.naturalWidth>0&&dimensions.naturalHeight>0&&dimensions.w>0&&dimensions.h>0,label+': SVG not visible in '+row.course_slug);
  assert(Math.abs(dimensions.w/dimensions.h-16/9)<0.05,label+': image aspect changed in '+row.course_slug+': '+JSON.stringify(dimensions));
  assert.deepEqual(errors,[],label+': script error in '+row.course_slug);
 }finally{await page.close()}
}
const mode=process.env.TRENERKI_ART_MODE||'all';
const engines=mode==='all'?[['chromium','desktop',1365,840,false],['chromium','mobile',390,844,true]]:
 [['chromium','desktop',1365,840,false],['firefox','desktop',1366,768,false],['webkit','desktop',1440,900,false],['webkit','iphone',393,852,true]];
const topics=mode==='all'?lessons:lessons.filter(x=>['angielski-na-budowie','zaufany-wolontariusz','brygadzista','lepszy-tata','jak-kupic-samochod','sap-ewm-magazyn','bednarz','swiety-mikolaj'].includes(x.course_slug));
let count=0;
for(const [engine,profile,width,height,mobile] of engines){
 const b=await {chromium,firefox,webkit}[engine].launch({headless:true});
 try{
  const context=await b.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1});
  for(const row of topics){await check(context,row,engine+' '+profile);count++;}
  console.log('✓ '+engine+' '+profile+': '+topics.length+' unique lesson SVGs visible with 16:9 ratio');
  await context.close();
 }finally{await b.close()}
}
console.log('✓ TOTAL: '+count+' image-backed lesson browser checks');
