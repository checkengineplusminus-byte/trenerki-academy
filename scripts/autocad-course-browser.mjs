// Full 30-lesson UI regression on the reviewed curriculum and isolated API fixtures.
// This does not claim a production enrollment/exam or a test inside Autodesk software.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {chromium}=await import(process.env.TRENERKI_PLAYWRIGHT_MODULE||'playwright');
const origin=new URL(process.argv[2]||'http://127.0.0.1:8787').origin;
const api='https://kcvvixcjuwglfvdpypzs.supabase.co';
const {lessons}=JSON.parse(readFileSync(new URL('../content/autocad-real-program-2026-11-15.json',import.meta.url),'utf8'));
assert.equal(lessons.length,30);
const method=JSON.parse(readFileSync(new URL('../content/autocad-methodology-v2.json',import.meta.url),'utf8')).lessons;
assert.equal(method.length,30);
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
   if(table==='ta_autocad_homework')return req.method()==='GET'?json([]):json({},201);
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
  assert.equal(await page.getByTestId('course-intro-photo').count(),0,'Duplicate stock photo after opening course');
  assert.equal(await page.getByTestId('autocad-original-screens').count(),1,'A genuine AutoCAD screenshot must be visible before reading');
  const consent=page.getByRole('region',{name:'Zgoda na pomiary reklamowe'});
  if(await consent.isVisible())await consent.getByRole('button',{name:'Odrzuć',exact:true}).click();
  assert.equal(await page.getByTestId('case-checkpoint').count(),0);
  await page.getByRole('button',{name:'Ekran programu'}).click();
  const firstScreen=page.getByTestId('autocad-original-screens');
  await firstScreen.waitFor();
  assert.equal(await firstScreen.locator('img').count(),1,'Open one focused original screenshot, not three huge repeats');
  await firstScreen.locator('img').first().evaluate(el=>el.decode());
  await page.getByRole('button',{name:'Pojęcia'}).click();
  assert.equal(await page.getByTestId('autocad-original-screens').count(),1,'Do not duplicate or remove the single genuine AutoCAD screenshot');
  await page.getByRole('button',{name:'Przejdź do wyjaśnień pierwszej lekcji →'}).click();
  const cad=page.getByTestId('cad-workspace');
  await cad.waitFor();
  const cmd=cad.getByTestId('cad-command');
  const send=async (line)=>{await cmd.fill(line);await cad.getByRole('button',{name:'Enter ↵'}).click();};
  await send('LINE');await send('0,0');await send('1000,0');await send('500,800');await send('CLOSE');
  await cad.getByTestId('cad-summary').filter({hasText:'Obiekty: 3'}).waitFor();
  await send('JOIN');
  await cad.getByTestId('cad-summary').filter({hasText:'Obiekty: 1'}).waitFor();
  await cad.getByText(/JOIN: połączono 3 odcinki/).waitFor();
  await send('MOVE');await send('0,0');await send('@2000,0');
  await cad.getByText(/Przesunięto 1 obiekt o 2000, 0/).waitFor();
  await send('ZOOM E');
  await cad.getByText(/Dopasowano widok/).waitFor();
  await cad.getByTestId('cad-canvas').screenshot({path:'/tmp/trenerki-autocad-canvas-'+(mobile?'mobile':'desktop')+'.png'});
  console.log('✓ '+(mobile?'mobile':'desktop')+' AutoCAD: LINE → 3 segments → JOIN → one closed polyline → MOVE → ZOOM E');
  await send('LINE');await send('0,0');await send('300,0');await send('');
  await send('LINE');await send('100,100');await send('400,100');await send('');
  await cad.getByTestId('cad-summary').filter({hasText:'Obiekty: 3'}).waitFor();
  await send('ZOOM E');
  // User-path regression: tapping a thin LINE must select immediately, not only after holding.
  await cad.getByRole('button',{name:'Wyczyść zaznaczenie · Esc'}).click();
  const clickCadSegment=async(id)=>{
   const svg=cad.getByTestId('cad-canvas');
   await svg.scrollIntoViewIfNeeded();
   const poly=svg.locator('g[data-cad-object="'+id+'"] > polyline:not([data-cad-hit])');
   const pts=(await poly.getAttribute('points')).trim().split(/\s+/).map(item=>item.split(',').map(Number));
   assert.equal(pts.length,2,'Expected a straight CAD segment '+id);
   const box=await svg.boundingBox();
   const vb=(await svg.getAttribute('viewBox')).split(/\s+/).map(Number);
   assert(box&&vb.length===4&&vb[2]>0&&vb[3]>0);
   const x=box.x+((pts[0][0]+pts[1][0])/2-vb[0])*box.width/vb[2];
   const y=box.y+((pts[0][1]+pts[1][1])/2-vb[1])*box.height/vb[3];
   if(mobile)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);
  };
  await clickCadSegment(4);
  await cad.getByTestId('cad-summary').filter({hasText:'Zaznaczone: 1'}).waitFor();
  await clickCadSegment(5);
  await cad.getByTestId('cad-summary').filter({hasText:'Zaznaczone: 1'}).waitFor();
  const hold=cad.getByTestId('cad-hold-selection');
  await hold.click();
  await clickCadSegment(4);
  await cad.getByTestId('cad-summary').filter({hasText:'Zaznaczone: 2'}).waitFor();
  await hold.click();
  await cad.getByRole('button',{name:'Wyczyść zaznaczenie · Esc'}).click();
  const status=cad.getByTestId('cad-status-bar');
  await status.waitFor();
  await status.getByRole('button',{name:'Siatka · F7'}).click();
  await cad.getByTestId('cad-status-help').getByText(/GRID · F7/).waitFor();
  await status.getByRole('button',{name:'OSNAP · F3'}).click();
  await status.getByRole('button',{name:'POLAR · F10'}).click();
  await cad.getByTestId('cad-status-help').getByText(/POLAR · F10/).waitFor();
  await status.getByRole('button',{name:'OTRACK · F11'}).click();
  await cad.getByTestId('cad-status-help').getByText(/OTRACK · F11/).waitFor();
  await status.getByRole('button',{name:'Dynamic Input · F12'}).click();
  await status.screenshot({path:'/tmp/trenerki-autocad-status-'+(mobile?'mobile':'desktop')+'.png'});
  await cad.getByRole('button',{name:'Zamknij opis paska statusu'}).click();
  console.log('✓ '+(mobile?'mobile':'desktop')+' AutoCAD: single '+(mobile?'touch':'left click')+' selects LINE; hold selection accumulates; status bar Grid OSNAP POLAR OTRACK DYN explained');
  if(!mobile){
   // Selection was already cleared above. The button is correctly disabled for an empty set.
   const clear=cad.getByRole('button',{name:'Wyczyść zaznaczenie · Esc'});
   if(await clear.isEnabled())await clear.click();
   else await cad.getByTestId('cad-summary').filter({hasText:'Zaznaczone: 0'}).waitFor();
   const bounds=await cad.getByTestId('cad-canvas').boundingBox();
   assert(bounds&&bounds.width>100,'CAD canvas unavailable');
   await page.mouse.move(bounds.x+bounds.width-8,bounds.y+bounds.height-8);
   await page.mouse.down();
   await page.mouse.move(bounds.x+8,bounds.y+8,{steps:8});
   await page.mouse.up();
   await cad.getByTestId('cad-summary').filter({hasText:'Zaznaczone: 3'}).waitFor();
   await cad.getByRole('button',{name:'Wyczyść zaznaczenie · Esc'}).click();
   console.log('✓ desktop AutoCAD: crossing window from right to left selects all three visible objects');
  }
  await cad.getByRole('button',{name:'Zaznacz wszystko · Ctrl+A'}).click();
  await cad.getByTestId('cad-summary').filter({hasText:'Zaznaczone: 3'}).waitFor();
  await send('MOVE');await send('0,0');await send('@500,0');
  await cad.getByText(/Przesunięto 3 obiekty o 500, 0/).waitFor();
  await send('SCALE');await send('0,0');await send('2');
  await cad.getByText(/SCALE: przeskalowano 3 obiekty/).waitFor();
  const ribbon=cad.getByTestId('cad-ribbon');
  await ribbon.waitFor();
  const ribbonHome=cad.getByTestId('cad-home-ribbon');
  await ribbonHome.waitFor();
  await ribbon.screenshot({path:'/tmp/trenerki-autocad-ribbon-'+(mobile?'mobile':'desktop')+'.png'});
  const labels=await ribbonHome.innerText();
  assert(labels.indexOf('Draw / Rysuj')>=0&&labels.indexOf('Modify / Zmień')>labels.indexOf('Draw / Rysuj')&&labels.indexOf('Layers / Warstwy')>labels.indexOf('Modify / Zmień'),
    'Home ribbon must group Draw, Modify and Layers in Autodesk-like order');
  assert.equal(await ribbon.getByRole('button',{name:'Obróć · ROTATE'}).count(),1);
  assert.equal(await ribbon.getByRole('button',{name:'Lustro · MIRROR'}).count(),1);
  await send('ROTATE');await send('0,0');await send('90');
  await cad.getByText(/ROTATE: obrócono 3 obiekty o 90°/).waitFor();
  await send('MIRROR');await send('0,0');await send('0,1000');
  await cad.getByRole('button',{name:'Zachowaj oryginały · Nie'}).waitFor();
  await cad.getByRole('button',{name:'Zachowaj oryginały · Nie'}).click();
  await cad.getByText(/MIRROR: odbito 3 obiekty.*Oryginały zachowane/).waitFor();
  await cad.getByTestId('cad-summary').filter({hasText:'Obiekty: 6'}).waitFor();
  await cad.getByRole('button',{name:'Zaznacz wszystko · Ctrl+A'}).click();
  await cad.getByTestId('cad-summary').filter({hasText:'Zaznaczone: 6'}).waitFor();
  await send('MIRROR');await send('0,0');await send('1000,0');await send('Y');
  await cad.getByText(/MIRROR: odbito 6 obiektów.*Oryginały usunięte/).waitFor();
  await cad.getByTestId('cad-summary').filter({hasText:'Obiekty: 6'}).waitFor();
  console.log('✓ '+(mobile?'mobile':'desktop')+' AutoCAD: ROTATE 90° and MIRROR N/Y on grouped selected geometry, 2026 Home ribbon order');
  await cad.getByRole('button',{name:'Tryby OSNAP · ustaw'}).click();
  const snaps=cad.getByTestId('cad-osnap-settings');await snaps.waitFor();
  await snaps.getByRole('button',{name:'Przecięcie'}).click();
  await cad.getByRole('button',{name:'Annotate / Opisz'}).click();
  const font=cad.getByTestId('cad-font-style');await font.waitFor();
  await font.getByRole('button',{name:'Times New Roman'}).click();
  await font.getByTestId('cad-font-preview').waitFor();
  await cad.getByRole('button',{name:'Layout 1 / Arkusz'}).click();
  const scales=cad.getByTestId('cad-layout-scale');await scales.waitFor();
  await scales.getByRole('button',{name:'1:100'}).click();
  await scales.getByText(/50 mm na papierze/).waitFor();
  await scales.getByRole('button',{name:/Skala rzutni · 1:100/}).click();
  const scaleMenu=cad.getByTestId('cad-viewport-scale-menu');
  await scaleMenu.waitFor();
  await scaleMenu.getByRole('button',{name:'1:50',exact:true}).click();
  await scales.getByText(/100 mm na papierze/).waitFor();
  await cad.getByRole('button',{name:'Model',exact:true}).click();
  const training=cad.getByTestId('cad-assigned-exercise');
  await training.waitFor();
  await training.getByRole('button',{name:'Rozpocznij zadanie tej lekcji'}).click();
  await send('LINE');await send('0,0');await send('1000,0');await send('');
  await training.getByRole('button',{name:'Sprawdź moje ćwiczenie'}).click();
  await training.getByTestId('cad-exercise-feedback').getByText(/Zaliczone ćwiczenie geometrii/).waitFor();
  console.log('✓ '+(mobile?'mobile':'desktop')+' AutoCAD: genuine A3 viewport-scale dropdown 1:100 → 1:50 and numerically validated lesson exercise');
  const handbook=page.getByTestId('autocad-reference-guide');
  await handbook.getByRole('button',{name:/Biblioteka AutoCAD:/}).click();
  await handbook.getByRole('button',{name:'Całe menu'}).click();
  await handbook.getByTestId('autocad-menu-detail').waitFor();
  await handbook.getByRole('button',{name:'Polecenia'}).click();
  await handbook.getByRole('textbox',{name:'Szukaj komendy AutoCAD'}).fill('MTEXT');
  await handbook.getByText(/MTEXT.*Tekst wielowierszowy/).waitFor();
  await handbook.getByRole('button',{name:'Aliasy A–Z'}).click();
  await handbook.getByRole('textbox',{name:'Szukaj komendy AutoCAD'}).fill('ZEBRA');
  await handbook.getByText(/ZEBRA → ANALYSISZEBRA/).waitFor();
  await handbook.getByRole('button',{name:/Zwiń bibliotekę AutoCAD/}).click();
  console.log('✓ '+(mobile?'mobile':'desktop')+' AutoCAD: select ALL → group MOVE/SCALE; OSNAP modes, font preview, layout scale 1:100 and searchable Atlas');
   // Regression for previously impossible typed LINE length and DIM measurement.
   await send('LINE');await send('0,0');await send('1000');await send('');
   await cad.getByText(/Odcinek · długość 1000/).catch(()=>{});
   await send('DIM');await send('500,200');
   await cad.getByText(/Dodano wymiar 1000 jednostek modelu/).waitFor();
   await send('DIST');await send('0,0');await send('1000,0');
   await cad.getByText(/Odległość 1000/).waitFor();
   console.log('✓ '+(mobile?'mobile':'desktop')+' AutoCAD: bare 1000 after LINE, DIM label 1000, independent DIST=1000');
  for(const lesson of lessons){
   const {lesson_no:n,material:m}=lesson;
   await page.getByTestId('lesson-heading').filter({hasText:lesson.title_pl}).waitFor();
   assert.equal(await page.getByTestId('autocad-original-screens').count(),0,'Welcome screenshot must never repeat inside any practical lesson');
   assert.equal(await page.getByTestId('autocad-real-practice').count(),0,'Old repeated lecture disguised as CAD practice');
   if(n===0||[4,5,9,10,11,17,19,27,29].includes(n))await page.getByTestId('cad-workspace').waitFor();
   const homework=page.getByTestId('autocad-homework-'+n);
   await homework.waitFor();
   assert.equal(await homework.locator('[data-testid^="autocad-homework-step-"]').count(),3,'Every lesson must include three real homework steps');
   const assignment=page.getByTestId('cad-assigned-exercise');
   await assignment.waitFor();
   await assignment.getByText('Zadanie lekcji '+(n+1)+'/30',{exact:false}).waitFor();
   const lessonMethod=page.getByTestId('autocad-lesson-method');
   await lessonMethod.waitFor();
   await lessonMethod.getByText(method[n].heading,{exact:true}).waitFor();
   await page.getByTestId('autocad-result-check').waitFor();
   assert.equal(await lessonMethod.getByText(method[n].steps[0],{exact:true}).count(),1);
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
   if(n<29)assert.equal(await page.getByTestId('course-completed-last-page-only').count(),0,'Completion banner leaked into intermediate lesson');
   if(n<29)await page.getByTestId('lesson-heading').filter({hasText:lessons[n+1].title_pl}).waitFor();
   else await page.getByRole('button',{name:'Rozpocznij egzamin',exact:true}).waitFor();
   console.log('✓ '+(mobile?'mobile':'desktop')+' AutoCAD '+(n+1)+'/30: reading, curiosity, wrong/correct answer, '+required+' requirement(s), saved progress');
  }
  assert.equal(completed.length,30);
  await page.getByTestId('course-completed-last-page-only').waitFor();
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
  await page.goto(origin+'/nauka?course=autocad-skroty&lesson=30');
  await page.getByTestId('course-completed-last-page-only').waitFor();
  await page.getByTestId('start-course-from-beginning').click();
  await page.getByTestId('course-reading-introduction').waitFor();
  assert.equal(await page.getByTestId('course-completed-last-page-only').count(),0,'Repeated course still shows completion banner');
  assert.equal(await page.getByRole('button',{name:'Rozpocznij egzamin',exact:true}).count(),0,'Exam leaked onto the first review lesson');
  assert.equal(completed.length,30,'Review button must not erase saved completions');
  await page.getByRole('button',{name:'Przejdź do wyjaśnień pierwszej lekcji →'}).click();
  await page.getByTestId('lesson-heading').filter({hasText:lessons[0].title_pl}).waitFor();
  console.log('✓ '+(mobile?'mobile':'desktop')+' review: restart from lesson 1 with completed lessons and diploma intact, no repeated finish banner');
 }catch(error){
  console.error('AutoCAD regression failed at',page.url(),await page.locator('body').innerText());
  console.error('Browser errors:',errors);
  throw error;
 }finally{await browser.close();}
}
