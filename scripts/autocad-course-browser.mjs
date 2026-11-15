// Full 30-lesson UI regression on the reviewed curriculum and isolated API fixtures.
// This does not claim a production enrollment/exam or a test inside Autodesk software.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {chromium}=await import(process.env.TRENERKI_PLAYWRIGHT_MODULE||'playwright');
const origin=new URL(process.argv[2]||'http://127.0.0.1:8787').origin;
const api='https://kcvvixcjuwglfvdpypzs.supabase.co';
const {lessons}=JSON.parse(readFileSync(new URL('../content/autocad-real-program-2026-11-15.json',import.meta.url),'utf8'));
assert.equal(lessons.length,30);
assert.equal(new Set(lessons.map(l=>l.material.curiosity)).size,30);
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const user={id:'00000000-0000-4000-a000-000000000030',email:'autocad@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{full_name:'Test AutoCAD'}};
for(const mobile of [false,true]){
 const browser=await chromium.launch({headless:true});
 const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
 const page=await ctx.newPage();page.setDefaultTimeout(12000);
 const completed=[],attempts=[],errors=[];let examStep=0,examStarted=false;
 page.on('pageerror',e=>errors.push(e.message));
 const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'apikey,authorization,content-type,x-client-info,accept-profile,content-profile,prefer','access-control-allow-methods':'GET,POST,OPTIONS'};
 await page.addInitScript(({user})=>localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify({access_token:'test-access-token',refresh_token:'test-refresh-token',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user})),{user});
 await page.route(url=>url.origin===origin&&['/nauka','/dyplom'].includes(url.pathname),async route=>{
  const response=await route.fetch({url:origin+new URL(route.request().url()).pathname+'.html'});await route.fulfill({response});
 });
 await page.route(url=>url.origin===api,async route=>{
  const req=route.request(),path=new URL(req.url()).pathname,table=path.split('/').at(-1);
  const json=(data,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(data)});
  if(req.method()==='OPTIONS')return json({},204);
  if(path==='/auth/v1/user')return json(user);
  if(table==='ta_enrollments')return json([{id:'test-only'}]);
  if(table==='ta_courses')return json([{title_pl:'AutoCAD — skróty i komendy w praktyce',description_pl:'Test pełnego programu'}]);
  if(table==='ta_lessons')return json(lessons);
  if(table==='ta_learning_progress')return json(completed.map(lesson_no=>({lesson_no})));
  if(table==='ta_learning_attempts')return json(attempts);
  if(table==='ta_certificates')return json([{id:'fixture',certificate_no:'WZOR-TESTOWY',holder_name:'Test AutoCAD',title_pl:'AutoCAD',title_en:'AutoCAD',issued_at:'2026-11-15',is_demo:true}]);
  if(table==='ta_drafts')return req.method()==='POST'?json({},201):json([]);
  if(table==='ta-lesson-guide'){
   const body=req.postDataJSON(),material=lessons[body.lesson_no]?.material;
   if(body.action==='attempt'){
    const correct=body.mode==='case'?body.selected_index===material.learning.correct:
     body.mode==='keyboard'&&material.shortcuts?.some(s=>s.combo===body.active_combo)&&body.active_combo===body.selected_combo;
    attempts.push({...body,correct});return json({ok:true,correct});
   }
   if(body.action==='complete'){
    const modes=['case',...(material.shortcuts?.length?['keyboard']:[])];
    if(modes.some(mode=>!attempts.some(a=>a.lesson_no===body.lesson_no&&a.mode===mode&&a.correct)))return json({error:'exercise_required'},409);
    if(body.lesson_no!==completed.length)return json({error:'previous_lessons_required'},409);
    completed.push(body.lesson_no);return json({ok:true,completed:true});
   }
   return json({ok:true,can_reply:true});
  }
  if(table==='ta-exam'){
   const body=req.postDataJSON();
   if(completed.length!==30)return json({error:'lessons_incomplete'},409);
   if(body.action==='status'&&examStep!==6)return json({state:'ready',available:true});
   if(body.action==='start')examStarted=true;
   if(body.action==='answer'){assert(examStarted);assert.equal(body.selected_index,0);examStep++;}
   if(examStep===6)return json({state:'passed',answer_correct:true,certificate:{id:'fixture',certificate_no:'WZOR-TESTOWY',holder_name:'Test AutoCAD',title_pl:'AutoCAD',issued_at:'2026-11-15',is_demo:true}});
   return json({state:'in_progress',available:true,answer_correct:true,session:{id:'isolated-exam',step:examStep,correct:examStep,wrong:0,phase:examStep===5?'final':'practice',question:'Pytanie testowe interfejsu '+(examStep+1),options:['Odpowiedź kontrolna','Inna odpowiedź'],history:[],holder_name:'Test AutoCAD',is_demo:true,grading_mode:'choice'}});
  }
  return json({ok:true});
 });
 try{
  await page.goto(origin+'/nauka?course=autocad-skroty&lesson=1');
  await page.getByTestId('course-reading-introduction').waitFor();
  const consent=page.getByRole('region',{name:'Zgoda na pomiary reklamowe'});
  if(await consent.isVisible())await consent.getByRole('button',{name:'Odrzuć',exact:true}).click();
  assert.equal(await page.getByTestId('case-checkpoint').count(),0);
  await page.getByRole('button',{name:'Przejdź do wyjaśnień pierwszej lekcji →'}).click();
  for(const lesson of lessons){
   const {lesson_no:n,material:m}=lesson;
   await page.getByTestId('lesson-heading').filter({hasText:lesson.title_pl}).waitFor();
   const realScreenshot=page.getByTestId('autocad-original-screens');
   await realScreenshot.waitFor();
   const image=realScreenshot.locator('img').first();
   await image.waitFor();
   await image.evaluate(el=>el.decode());
   assert(await image.evaluate(el=>el.naturalWidth>0),'AutoCAD original screenshot failed to load in lesson '+(n+1));
   await page.getByText(m.curiosity,{exact:true}).waitFor();
   if([5,9,11,29].includes(n)){
    await page.getByTestId('autocad-real-dxf').waitFor();
    assert.equal(await page.getByRole('button',{name:/Pobierz plik DXF:/}).count(),1);
   }
   const required=m.shortcuts?.length?2:1;
   await page.getByTestId('lesson-requirements').filter({hasText:'Do ukończenia tej lekcji: '+required}).waitFor();
   const checkpoint=page.getByTestId('case-checkpoint');
   const answer=i=>checkpoint.getByRole('button',{name:new RegExp('^[A-C]\\. '+escape(m.learning.options[i])+'$')});
   await answer((m.learning.correct+1)%3).click();
   await checkpoint.getByText('Jeszcze nie. Spróbuj raz jeszcze.',{exact:true}).waitFor();
   assert.equal(completed.length,n,'Wrong answer must not complete lesson');
   await page.getByRole('button',{name:'↑ Pozostało zadań: '+required,exact:true}).waitFor();
   await answer(m.learning.correct).click();
   await checkpoint.getByText('✓ Poprawna odpowiedź. Zapisano wynik.',{exact:true}).waitFor();
   if(required===2){
    await page.getByRole('button',{name:'↑ Pozostało zadań: 1',exact:true}).waitFor();
    const s=m.shortcuts[0];
    await page.getByRole('button',{name:s.combo+' · '+s.label,exact:true}).click();
    await page.getByRole('button',{name:new RegExp('^[A-C]\\. '+escape(s.combo+' · '+s.label)+'$')}).click();
    await page.getByText('Wynik zapisany.',{exact:true}).waitFor();
   }
   await page.getByRole('button',{name:n===29?'Przejdź do egzaminu →':new RegExp('^Dalej · lekcja '+(n+2)+' →')}).click();
   if(n<29)await page.getByTestId('lesson-heading').filter({hasText:lessons[n+1].title_pl}).waitFor();
   else await page.getByRole('button',{name:'Rozpocznij egzamin',exact:true}).waitFor();
   console.log('✓ '+(mobile?'mobile':'desktop')+' AutoCAD '+(n+1)+'/30: reading, curiosity, wrong/correct answer, '+required+' requirement(s), saved progress');
  }
  assert.equal(completed.length,30);
  await page.getByRole('button',{name:'Rozpocznij egzamin',exact:true}).click();
  for(let step=0;step<6;step++){
   await page.getByText('Pytanie testowe interfejsu '+(step+1),{exact:true}).waitFor();
   await page.getByRole('button',{name:'A. Odpowiedź kontrolna',exact:true}).click();
   await page.getByRole('button',{name:'Zatwierdź odpowiedź',exact:true}).click();
  }
  await page.getByText('Gratulacje! Zaliczyłeś egzamin.',{exact:true}).waitFor();
  await page.getByText(/WZOR-TESTOWY/).waitFor();
  assert.equal(examStep,6);assert.deepEqual(errors,[]);
  // Reproduce the observed production failure: a tab opened before deployment
  // requests a diploma chunk that no longer exists. Recovery is user initiated.
  let blockedChunks=0;
  const diplomaChunk=url=>url.origin===origin&&/\/_expo\/static\/js\/web\/dyplom-[^/]+\.js$/.test(url.pathname);
  await page.route(diplomaChunk,route=>{blockedChunks++;return route.abort('failed');});
  await page.getByRole('button',{name:'Zobacz autorski dyplom',exact:true}).click();
  await page.getByTestId('route-recovery').waitFor();
  assert(blockedChunks>0,'The stale route module must actually fail');
  console.log('Recovery boundary opened at',page.url());
  await page.unroute(diplomaChunk);
  await Promise.all([
   page.waitForEvent('domcontentloaded'),
   page.getByRole('button',{name:'Odśwież stronę',exact:true}).click(),
  ]);
  console.log('Recovered document opened at',page.url());
  // A failed lazy navigation can leave the browser at its previous URL. A
  // reload must also recover that course, retaining its passed exam status.
  if(new URL(page.url()).pathname==='/nauka'){
   await page.getByRole('button',{name:'Zobacz autorski dyplom',exact:true}).click();
  }
  await page.getByRole('button',{name:'Pobierz dyplom PDF (PL)',exact:true}).waitFor();
  assert.equal(await page.getByTestId('route-recovery').count(),0);
  console.log('✓ '+(mobile?'mobile':'desktop')+' AutoCAD: 30 lessons → mock final exam → diploma; stale deployment chunk shows recovery and reload opens diploma');
  const bounds=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,view:document.documentElement.clientWidth}));
  assert(bounds.scroll<=bounds.view+3);
 }catch(error){
  console.error('AutoCAD regression failed at',page.url(),await page.locator('body').innerText());
  console.error('Browser errors:',errors);
  throw error;
 }finally{await browser.close();}
}
