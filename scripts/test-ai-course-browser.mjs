#!/usr/bin/env node
/**
 * Synthetic authenticated learner for the 32-lesson AI Academy.
 * Isolated API stubs: NEVER touches real accounts, payments, production lessons or grades.
 */
import assert from 'node:assert/strict';
import {chromium,firefox,webkit} from 'playwright';

const origin=new URL(process.argv[2]||'http://127.0.0.1:8791').origin;
const apiOrigin='https://kcvvixcjuwglfvdpypzs.supabase.co';
const user={id:'00000000-0000-4000-a000-00000000a151',email:'ai-learner@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{full_name:'Tester Kursu'}};
const cors={'access-control-allow-origin':origin,'access-control-allow-headers':'apikey,authorization,content-type,x-client-info,accept-profile,content-profile,prefer','access-control-allow-methods':'GET,POST,OPTIONS'};
const mkLesson=(n)=>{
 const stage=n%4===3;
 const test={question:'Sprawdź źródło dowodu dla etapu '+(n+1),options:['Nie sprawdzaj','Sprawdź źródło','Zgadywanie','Kopiuj'],correct:1,feedback:['Nie','Tak','Nie','Nie'],evidence:'Porównaj z oryginałem',root_cause:'Brak weryfikacji'};
 return {lesson_no:n,title_pl:'AI: ćwiczenie '+(n+1),material:{
   section:1+Math.floor(n/4),stage_name:'Pracownia '+(1+Math.floor(n/4)),lesson_kind:stage?'stage_checkpoint':'practical',
   raw:['AI ćwiczenie '+(n+1),'Zwróć uwagę na fakty i podaj źródło.'],
   sections:[{heading:'Wprowadzenie',text:'Wyjaśnienie tematu na danych testowych i weryfikacja wyniku na podstawie źródła.'}],
   illustration:'lesson-visual-ai-bez-tajemnic-'+String(n+1).padStart(3,'0'),
   curiosity:'Ciekawostka: płynność wypowiedzi nie oznacza prawdziwości faktów.',
   learning:{situation:'Fikcyjne ćwiczenie',intro:'Wyjaśnienie metody',example:'Sprawdź dane',question:'Jak zaczynasz ćwiczenie '+(n+1)+'?',options:['Sprawdź dane','Pomiń dane','Zgadywanie'],correct:0,explanation:'Zweryfikuj źródło.',feedback:['Dobrze','Nie','Nie']},
   homework:{title:'Praca domowa '+(n+1),instructions:'Zapisz własną próbę na danych testowych i sprawdź wynik źródłami.',self_check:'Sprawdź zgodność danych z oryginałem.'},
   anielka:{mission:'Samodzielnie przygotuj prompt, zweryfikuj wynik i opisz jedną poprawkę w lekcji '+(n+1),starter:'Ćwicz ze mną. Pomóż mi zacząć zadanie.',rubric:['Cel','Fakty','Bezpieczeństwo']},
   ...(stage?{redteam_quiz:test}:{})
 }};
};
const lessons=Array.from({length:32},(_,n)=>mkLesson(n));
const browsers={chromium:await chromium.launch({headless:true}),firefox:await firefox.launch({headless:true}),webkit:await webkit.launch({headless:true})};
let attempts=0,passedStage=0,correctCase=0,completed=[],coachCalls=0;
async function run(env){
 const mode=env.name, browser=browsers[env.engine];
 const context=await browser.newContext({viewport:env.viewport,isMobile:env.isMobile&&env.engine!=='firefox',hasTouch:env.hasTouch,deviceScaleFactor:env.scale||1});
 const lastLesson=env.full?32:4;
 const page=await context.newPage();
 completed=[];attempts=0;passedStage=0;correctCase=0;coachCalls=0;
 try {
  await page.addInitScript(({user})=>{
    localStorage.setItem('trenerki_ads_consent_v1','no');
    localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify({
      access_token:'synthetic-token',refresh_token:'synthetic-refresh',expires_at:Math.floor(Date.now()/1000)+3600,
      expires_in:3600,token_type:'bearer',user
    }));
  },{user});
  await page.route(url=>url.origin===origin&&url.pathname==='/nauka',async route=>{
    const response=await route.fetch({url:origin+'/nauka.html'});
    await route.fulfill({response});
  });
  await page.route(url=>url.origin===apiOrigin,async route=>{
    const req=route.request(),u=new URL(req.url()),method=req.method(),table=u.pathname.split('/').at(-1);
    const json=(obj,status=200)=>route.fulfill({status,headers:cors,contentType:'application/json',body:JSON.stringify(obj)});
    if(method==='OPTIONS')return route.fulfill({status:204,headers:cors});
    if(u.pathname==='/auth/v1/user')return json(user);
    if(table==='ta_enrollments')return json([{id:'synthetic-enrollment',status:'active'}]);
    if(table==='ta_lessons')return json(lessons);
    if(table==='ta_drafts')return method==='POST'?json({},201):json([]);
    if(table==='ta_learning_progress')return json(completed.map(lesson_no=>({lesson_no})));
    if(table==='ta_learning_attempts')return json([]);
    if(table==='ta_courses')return json([{title_pl:'AI bez tajemnic',description_pl:'32 lekcje praktyki'}]);
    if(table==='ta_lesson_guide'||table==='ta-lesson-guide'){
      const input=req.postDataJSON();
      if(input.action==='status')return json({ok:true,history:[],opening:'Cześć! Ćwicz ze mną krok po kroku.',can_reply:true});
      if(input.action==='dialogue'){coachCalls++;return json({ok:true,history:[{role:'student',text:input.message},{role:'anielka',text:'Podaj jeden przykład i sprawdź źródło.'}],can_reply:true});}
      if(input.action==='attempt'){
        attempts++;
        const n=input.lesson_no,correct=input.mode==='stage'?(n%4===3&&input.selected_index===1):(input.mode==='case'&&input.selected_index===0);
        if(correct){if(input.mode==='stage')passedStage++;else correctCase++;}
        return json({ok:true,correct});
      }
      if(input.action==='complete'){
        if(input.lesson_no%4===3&&passedStage<1)return json({error:'exercise_required'},409);
        completed.push(input.lesson_no);return json({ok:true,completed:true});
      }
    }
    if(table==='ta-exam')return json({ok:true,state:completed.length===32?'ready':'not_ready',available:true,completed:completed.length,total:32});
    if(table==='ta_lesson_clarifications')return json([]);
    return json([]);
  });

  await page.goto(origin+'/nauka?course=ai-bez-tajemnic',{waitUntil:'domcontentloaded'});
  await page.getByTestId('course-reading-introduction').waitFor({timeout:20000});
  await page.getByRole('button',{name:'Przejdź do wyjaśnień pierwszej lekcji →'}).click();
  await page.getByTestId('lesson-heading').filter({hasText:'AI: ćwiczenie 1'}).waitFor();
  await page.getByTestId('ai-course-stage').filter({hasText:'ETAP 1/8'}).waitFor();
  const cta=page.getByTestId('anielka-top-cta');
  await cta.waitFor();
  await cta.click();
  const workshop=page.getByTestId('anielka-ai-practice');
  await workshop.waitFor();
  for(const name of ['Ćwicz ze mną','Daj wskazówkę','Sprawdź moją próbę','Zadaj mi pytanie'])
   assert.equal(await workshop.getByRole('button',{name}).count(),1,'Missing Anielka mode: '+name);
  await workshop.getByRole('button',{name:'Ćwicz ze mną'}).click();
  const prompt=page.getByRole('textbox',{name:'Twoje pytanie do Anielki'});
  assert.match(await prompt.inputValue(),/Ćwicz ze mną/);
  await page.getByRole('button',{name:'Zapytaj Anielkę →'}).click();
  await page.getByText('Podaj jeden przykład i sprawdź źródło.').waitFor();
  assert.equal(coachCalls,1,'Tutor action did not invoke backend');
  assert.equal(completed.length,0,'Tutor interaction must never complete a lesson');

  for(let lesson=1;lesson<=lastLesson;lesson++){
   await page.getByTestId('lesson-heading').filter({hasText:'AI: ćwiczenie '+lesson}).waitFor();
   const checkpoint=page.getByTestId('case-checkpoint');
   await checkpoint.getByRole('button',{name:/Sprawdź dane/}).click();
   await page.getByText('Odpowiedź do zadania zapisana').waitFor();
   if(lesson%4===0){
    const stage=page.getByTestId('ai-stage-checkpoint');
    await stage.waitFor();
    await page.getByTestId('lesson-requirements').getByText(/sprawdzian etapu/).waitFor();
    assert.equal(completed.length,lesson-1,'Stage must stay locked until checkpoint');
    // Regression: after the normal question is marked correct, the bottom CTA must
    // take the learner to the separate FOUR-option stage quiz, not back to the answered question.
    const stageCta=page.getByRole('button',{name:/Otwórz sprawdzian etapu \(4 odpowiedzi\)/}).last();
    await stageCta.click();
    await page.waitForFunction(()=>{
      const target=document.querySelector('[data-testid="ai-stage-checkpoint"]');
      if(!target)return false;
      const rect=target.getBoundingClientRect();
      return rect.top>=-32&&rect.top<window.innerHeight-100;
    },{timeout:10000});
    await stage.getByTestId('adversarial-option-0').click();
    await stage.getByTestId('adversarial-retry').click();
    await stage.getByTestId('adversarial-option-1').click();
    await stage.getByText('Sprawdzian zaliczony i zapisany').waitFor();
    assert.ok(passedStage>=lesson/4,'Stage grade must be persisted through server');
   }
   if(lesson<32){
    await page.getByRole('button',{name:new RegExp('Dalej · lekcja '+(lesson+1))}).last().click();
    await page.getByTestId('lesson-heading').filter({hasText:'AI: ćwiczenie '+(lesson+1)}).waitFor();
   }else{
    await page.getByRole('button',{name:'Przejdź do egzaminu →'}).last().click();
    await page.getByText('Egzamin końcowy',{exact:true}).waitFor();
   }
  }
  assert.deepEqual(completed,Array.from({length:lastLesson},(_,i)=>i),mode+' did not persist '+lastLesson+' lessons');
  if(lastLesson===4)await page.getByTestId('ai-course-stage').filter({hasText:'ETAP 2/8'}).waitFor();
  else await page.getByTestId('course-completed-last-page-only').waitFor();
  console.log('✓ '+mode+': Anielka, '+lastLesson+' lessons, required stage exams, lock/restore, navigation');
 } finally {await page.close();await context.close();}
}
const envs=[
 {name:'Chrome 1366 desktop 32 lessons',engine:'chromium',viewport:{width:1366,height:900},isMobile:false,hasTouch:false,full:true},
 {name:'Chrome 1920 widescreen',engine:'chromium',viewport:{width:1920,height:1080},isMobile:false,hasTouch:false},
 {name:'Chrome 1024 laptop',engine:'chromium',viewport:{width:1024,height:768},isMobile:false,hasTouch:false},
 {name:'Chrome iPhone 390 emulator',engine:'chromium',viewport:{width:390,height:844},isMobile:true,hasTouch:true,scale:3},
 {name:'Chrome Android 412 emulator',engine:'chromium',viewport:{width:412,height:915},isMobile:true,hasTouch:true,scale:2.625},
 {name:'Chrome small phone 360 emulator',engine:'chromium',viewport:{width:360,height:740},isMobile:true,hasTouch:true,scale:2},
 {name:'Chrome tablet 820 touch',engine:'chromium',viewport:{width:820,height:1180},isMobile:true,hasTouch:true,scale:2},
 {name:'Firefox 1366 desktop',engine:'firefox',viewport:{width:1366,height:900},isMobile:false,hasTouch:false},
 {name:'Safari WebKit 1280 desktop',engine:'webkit',viewport:{width:1280,height:800},isMobile:false,hasTouch:false},
 {name:'Safari WebKit iPhone 390 emulator',engine:'webkit',viewport:{width:390,height:844},isMobile:true,hasTouch:true,scale:3}
];
try{for(const env of envs)await run(env);}finally{for(const b of Object.values(browsers))await b.close();}
