#!/usr/bin/env node
/**
 * Synthetic authenticated learner for the 32-lesson AI Academy.
 * Isolated API stubs: NEVER touches real accounts, payments, production lessons or grades.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

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
const browser=await chromium.launch({headless:true});
let attempts=0,passedStage=0,correctCase=0,completed=[],coachCalls=0;
async function run(mode){
 const context=await browser.newContext({viewport:mode==='mobile'?{width:390,height:844}:{width:1366,height:900},isMobile:mode==='mobile',hasTouch:mode==='mobile'});
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

  for(let lesson=1;lesson<=4;lesson++){
   await page.getByTestId('lesson-heading').filter({hasText:'AI: ćwiczenie '+lesson}).waitFor();
   const checkpoint=page.getByTestId('case-checkpoint');
   await checkpoint.getByRole('button',{name:/Sprawdź dane/}).click();
   await page.getByText('Odpowiedź do zadania zapisana').waitFor();
   if(lesson===4){
    const stage=page.getByTestId('ai-stage-checkpoint');
    await stage.waitFor();
    await page.getByTestId('lesson-requirements').getByText(/sprawdzian etapu/).waitFor();
    assert.equal(completed.length,3,'Stage must stay locked until checkpoint');
    await stage.getByTestId('adversarial-option-0').click();
    await stage.getByTestId('adversarial-retry').click();
    await stage.getByTestId('adversarial-option-1').click();
    await stage.getByText('Sprawdzian zaliczony i zapisany').waitFor();
    assert.equal(passedStage,1,'Stage grade must be persisted through server');
   }
   await page.getByRole('button',{name:new RegExp('Dalej · lekcja '+(lesson+1))}).last().click();
  }
  await page.getByTestId('lesson-heading').filter({hasText:'AI: ćwiczenie 5'}).waitFor();
  assert.deepEqual(completed,[0,1,2,3],mode+' did not persist 4 lessons');
  await page.getByTestId('ai-course-stage').filter({hasText:'ETAP 2/8'}).waitFor();
  console.log('✓ '+mode+': Anielka coaching, four lessons, bad/good stage answers, locked milestone, next stage');
 } finally {await page.close();await context.close();}
}
try{await run('desktop');await run('mobile');}finally{await browser.close();}
