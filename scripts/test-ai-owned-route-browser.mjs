#!/usr/bin/env node
/** Synthetic, privacy-safe regression: bought AI course CTA must open lesson without losing login. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=new URL(process.argv[2]||'http://127.0.0.1:8791').origin;
const apiOrigin='https://kcvvixcjuwglfvdpypzs.supabase.co';
const user={id:'00000000-0000-4000-a000-00000000a151',email:'ai-learner@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{full_name:'Testowy Uczeń'}};
const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'apikey,authorization,content-type,x-client-info,accept-profile,content-profile,prefer','access-control-allow-methods':'GET,POST,OPTIONS'};
const lesson={lesson_no:0,title_pl:'AI: pierwsza lekcja',material:{
 section:1,stage_name:'Pierwsze kroki',lesson_kind:'practical',
 raw:['Podstawy AI','AI pomaga w analizie. Sprawdzaj źródła.'],
 sections:[{heading:'Czym jest AI',text:'AI to narzędzie. Uczymy się uważnie sprawdzać odpowiedzi.'}],
 learning:{situation:'Fikcyjny przykład',intro:'Krótkie wyjaśnienie',example:'Zadaj pytanie',question:'Co najpierw sprawdzisz?',options:['Źródło','Nic','Zgadywanie'],correct:0,feedback:['Tak','Nie','Nie']},
 homework:{title:'Praca domowa',instructions:'Wypróbuj polecenie i sprawdź wynik.'}
}};
const browser=await chromium.launch({headless:true});
try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:844},locale:'pl-PL',serviceWorkers:'block'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(({user})=>{
   localStorage.setItem('trenerki_ads_consent_v1','no');
   localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify({
    access_token:'synthetic-token',refresh_token:'synthetic-refresh',expires_at:Math.floor(Date.now()/1000)+3600,
    expires_in:3600,token_type:'bearer',user
   }));
  },{user});
  await page.route(url=>url.origin===origin&&['/kup','/nauka','/moje-kursy'].includes(url.pathname),async route=>{
   const u=new URL(route.request().url());
   const response=await route.fetch({url:origin+u.pathname+'.html'});
   await route.fulfill({response});
  });
  await page.route(url=>url.origin===apiOrigin,async route=>{
   const req=route.request(),u=new URL(req.url()),table=u.pathname.split('/').at(-1),method=req.method();
   const respond=(obj,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(obj)});
   if(method==='OPTIONS')return route.fulfill({status:204,headers});
   if(u.pathname==='/auth/v1/user')return respond(user);
   if(table==='ta_courses')return respond([{slug:'ai-bez-tajemnic',title_pl:'AI bez tajemnic',description_pl:'32 lekcje',price_grosze:3999,category_pl:'Technologie i logistyka'}]);
   if(table==='ta_course_previews')return respond([{course_slug:'ai-bez-tajemnic',curiosity:'Ciekawostka z AI.',scenario:'Fikcyjna sytuacja',outcome_1:'Weryfikuj.',module_titles:Array.from({length:32},(_,i)=>'Lekcja '+(i+1))}]);
   if(table==='ta_enrollments')return respond([{id:'00000000-0000-4000-a000-00000000e151',status:'active'}]);
   if(table==='ta_lessons')return respond([lesson]);
   if(table==='ta_drafts'||table==='ta_learning_progress'||table==='ta_learning_attempts'||table==='ta_lesson_clarifications')return respond([]);
   if(u.pathname.endsWith('/ta-lesson-guide'))return respond({ok:true,opening:'Anielka pomaga.',history:[],can_reply:true});
   return respond([]);
  });
  await page.goto(origin+'/kup?course=ai-bez-tajemnic',{waitUntil:'domcontentloaded'});
  const button=page.getByText('Masz dostęp — rozpocznij naukę →');
  await button.waitFor({timeout:30000});
  await button.click();
  await page.getByTestId('course-reading-introduction').waitFor({timeout:30000});
  const url=new URL(page.url());
  assert.equal(url.pathname,'/nauka','Invalid destination at '+width+'px: '+page.url());
  assert.equal(url.searchParams.get('course'),'ai-bez-tajemnic');
  const session=await page.evaluate(()=>localStorage.getItem('sb-kcvvixcjuwglfvdpypzs-auth-token'));
  assert(session&&session.includes('synthetic-token'),'Session unexpectedly removed at '+width+'px');
  assert(!errors.length,'Browser script errors: '+errors.join(' | ').slice(0,900));
  console.log('PASS '+width+'px: /kup -> /nauka, first lesson visible, session preserved');
  await context.close();
 }
}finally{await browser.close();}
