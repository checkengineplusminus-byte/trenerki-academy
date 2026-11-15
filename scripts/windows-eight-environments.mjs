#!/usr/bin/env node
// Two sequential independent QA rounds, eight role/device environments per round.
// Synthetic account and intercepted API only: never write to a learner's account.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const {chromium}=await import(process.env.TRENERKI_PLAYWRIGHT_MODULE||'playwright');
const origin=new URL(process.argv[2]||'http://127.0.0.1:8794').origin;
const apiOrigin='https://kcvvixcjuwglfvdpypzs.supabase.co';
const missions=JSON.parse(readFileSync(new URL('../content/windows-practice-missions.json',import.meta.url),'utf8')).lessons;
const user={id:'00000000-0000-4000-a000-000000000008',email:'qa-windows@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};
const cors={'access-control-allow-origin':origin,'access-control-allow-headers':'apikey,authorization,content-type,x-client-info,accept-profile,content-profile,prefer','access-control-allow-methods':'GET,POST,OPTIONS'};
const profiles=[
 {id:'student',title:'Student',lesson:0,width:390,height:844,mobile:true,touch:true,scale:2},
 {id:'senior',title:'Senior uczący się Windows',lesson:27,width:360,height:740,mobile:true,touch:true,scale:2,reduce:true},
 {id:'office',title:'Pracownik biura',lesson:1,width:1280,height:800,mobile:false,touch:false,scale:1},
 {id:'accounting',title:'Księgowa',lesson:15,width:1440,height:900,mobile:false,touch:false,scale:1},
 {id:'construction',title:'Kierownik budowy',lesson:4,width:412,height:915,mobile:true,touch:true,scale:2},
 {id:'warehouse',title:'Magazynier na tablecie',lesson:14,width:820,height:1180,mobile:false,touch:true,scale:1.5},
 {id:'remote',title:'Pracownik zdalny',lesson:10,width:1365,height:768,mobile:false,touch:false,scale:1},
 {id:'it',title:'Technik IT',lesson:21,width:1920,height:1080,mobile:false,touch:false,scale:1}
];
assert.equal(new Set(profiles.map(p=>p.id)).size,8);
const result={course:'windows-skroty',suite:'2 x 8 roles + engineer review + independent critic review',timestamp:new Date().toISOString(),rounds:[]};
function materialFor(n){
 return {level:n<10?'podstawy':n<20?'praktyka':'ekspert',
  section:Math.floor(n/10)+1,illustration:n===0?'windows-history':n%2===0?'windows-desktop':'windows-explorer',
  sections:[{heading:'Cel lekcji',text:'Bezpieczna nauka Windows z realnym ćwiczeniem oraz własnymi notatkami. Tylko dane testowe.'}]};
}
async function setupMock(page,events,fresh=false){
 await page.addInitScript(({user})=>{
  localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify({
   access_token:'test-only-access-token',refresh_token:'test-only-refresh-token',
   expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user
  }));
 },{user});
 await page.route(url=>url.origin===origin&&url.pathname==='/nauka',async route=>{
  const response=await route.fetch({url:origin+'/nauka.html'});
  await route.fulfill({response});
 });
 await page.route(url=>url.origin===apiOrigin,async route=>{
  const req=route.request(),url=new URL(req.url()),table=url.pathname.split('/').at(-1);
  const fulfill=(body,status=200)=>route.fulfill({headers:cors,status,contentType:'application/json',body:JSON.stringify(body)});
  if(req.method()==='OPTIONS')return route.fulfill({headers:cors,status:204});
  if(url.pathname==='/auth/v1/user')return fulfill(user);
  if(table==='ta_enrollments')return fulfill([{id:'qa-enrollment'}]);
  if(table==='ta_courses')return fulfill([{title_pl:'Windows 11 — kurs QA',description_pl:'Ćwiczenia Windows 11 od zera'}]);
  if(table==='ta_lessons')return fulfill(missions.map(m=>({lesson_no:m.lesson_no,title_pl:'Lekcja QA '+(m.lesson_no+1),material:materialFor(m.lesson_no)})));
  if(table==='ta_drafts')return fulfill([]);
  // Unlock individual mission pages without granting access to protected backend.
  if(table==='ta_learning_progress')return fulfill(fresh?[]:Array.from({length:29},(_,lesson_no)=>({lesson_no})));
  if(table==='ta_learning_attempts')return fulfill([]);
  if(table==='ta-lesson-guide'){
   const payload=req.postDataJSON?.()||{};
   if(payload.action!=='status')events.unexpected.push({method:req.method(),path:table,action:payload.action});
   return fulfill({ok:true,history:[],opening:'Możesz zadać pytanie o ćwiczenie.',can_reply:true});
  }
  if(req.method()!=='GET')events.unexpected.push({method:req.method(),path:table});
  return fulfill({ok:true});
 });
}
const short='Bez żadnego sprawdzenia';
function editorialAssertions(m){
 assert(m,'Mission not found');
 assert(m.steps.length>=3,'Too few practical steps');
 assert(new Set(m.steps).size===m.steps.length,'Repeated instructions');
 assert(m.scenario.length>=30,'Generic professional scenario');
 assert(m.evidence.length>=45,'No observable acceptance criterion');
 assert(m.real_pc.length>=32,'No meaningful real Windows alternative');
 assert(m.pitfall.length>=35,'No explanation of likely misunderstanding');
 assert(/^https:\/\/support\.microsoft\.com\//.test(m.source),'No Microsoft reference');
 assert(!/pobierz malware|wyłącz (antywirus|zabezpieczenia)|wpisz hasło/i.test(m.steps.join(' ')+' '+m.real_pc),'Unsafe teaching content');
}
async function runPersona(browser,p,round){
 const m=missions[p.lesson],events={errors:[],unexpected:[]};
 assert(m,'No lesson '+p.lesson);
 const context=await browser.newContext({
  viewport:{width:p.width,height:p.height},isMobile:p.mobile,hasTouch:p.touch,
  deviceScaleFactor:p.scale,locale:'pl-PL',reducedMotion:p.reduce?'reduce':'no-preference'
 });
 const page=await context.newPage();
 page.setDefaultTimeout(12500);
 page.on('pageerror',error=>events.errors.push(String(error.message)));
 try{
  await setupMock(page,events);
  await page.goto(origin+'/nauka?course=windows-skroty&lesson='+(p.lesson+1),{waitUntil:'domcontentloaded'});
  const scope=page.getByTestId('windows-mission-'+p.lesson);
  await scope.waitFor({timeout:16000});
  const learningFooter=page.getByTestId('learning-support-bar');
  await learningFooter.waitFor();
  const footerBounds=await learningFooter.boundingBox();
  assert(footerBounds&&footerBounds.height<=64,'Critic: persistent lesson footer consumes excessive vertical space: '+JSON.stringify(footerBounds));
  assert.equal(await learningFooter.getByRole('link',{name:'Potrzebujesz pomocy? Nie jesteś sam'}).getAttribute('href'),'/pomoc','Engineer: support must remain accessible in lessons');
  const supportBox=await learningFooter.getByRole('link',{name:'Potrzebujesz pomocy? Nie jesteś sam'}).boundingBox();
  assert(supportBox&&supportBox.x>=footerBounds.x-1&&supportBox.x+supportBox.width<=footerBounds.x+footerBounds.width+1,
   'Critic: help link is clipped outside small lesson viewport: '+JSON.stringify({help:supportBox,footer:footerBounds}));

  const cookieSettings=learningFooter.getByRole('button',{name:'Ustawienia plików cookie'});
  await cookieSettings.waitFor({state:'visible',timeout:10000});
  const cookieBounds=await cookieSettings.boundingBox();
  assert(cookieBounds&&cookieBounds.y>=footerBounds.y-2&&cookieBounds.y+cookieBounds.height<=footerBounds.y+footerBounds.height+2,
   'Critic: cookie control leaks outside compact lesson footer');
  assert(cookieBounds.x>=footerBounds.x-2&&cookieBounds.x+cookieBounds.width<=footerBounds.x+footerBounds.width+2,
   'Critic: cookie control extends beyond viewport');

  // Remove the unrelated site-wide consent dialog before visual course inspection.
  const rejectCookies=page.getByRole('button',{name:'Odrzuć',exact:true}).first();
  if(await rejectCookies.isVisible().catch(()=>false)){
   await rejectCookies.click();
   await rejectCookies.waitFor({state:'hidden'});
  }
  await scope.getByText(m.goal,{exact:false}).first().waitFor();
  await scope.getByText(m.persona,{exact:true}).waitFor();
  assert.equal(await scope.getByRole('checkbox').count(),m.steps.length,'Each step must have an accessible checkbox');
  // Independent real-PC path: no claim of detecting system hotkeys in a browser.
  await scope.getByRole('button',{name:'② Na moim komputerze'}).click();
  await scope.getByText(m.real_pc,{exact:true}).waitFor();
  await scope.getByRole('button',{name:'Porównaj moje rozwiązanie z kryterium'}).click();
  await scope.getByText(/Najpierw opisz własnymi słowami/).waitFor();
  const input=scope.getByRole('textbox',{name:'Moja odpowiedź po ćwiczeniu'});
  await input.fill(short);
  // Checked steps do not secretly count as server-side completion.
  const checks=scope.getByRole('checkbox');
  for(let j=0;j<m.steps.length;j++)await checks.nth(j).click();
  const marked=await checks.evaluateAll(elements=>elements.filter(el=>el.getAttribute('aria-checked')==='true').length);
  if(marked!==m.steps.length){
   const details=await checks.evaluateAll(elements=>elements.slice(0,3).map(el=>({role:el.getAttribute('role'),ariaChecked:el.getAttribute('aria-checked'),title:el.textContent?.slice(0,90),html:el.outerHTML.slice(0,360)})));
   console.log('QA checklist diagnostic:',JSON.stringify(details));
  }
  assert.equal(marked,m.steps.length,'Checklist did not reflect all completed steps');
  if(p.id==='it'||p.id==='senior'){
   // Check the keyboard-only path, not only mouse/touch.
   await checks.first().focus();
   await page.keyboard.press('Space');
   assert.equal(await checks.first().getAttribute('aria-checked'),'false','Checkbox did not respond to Space');
   await page.keyboard.press('Space');
   assert.equal(await checks.first().getAttribute('aria-checked'),'true','Checkbox did not restore checked state');
  }
  await input.fill(m.evidence+' Wykonanie potwierdzam wyłącznie jako samokontrolę.');
  await scope.getByRole('button',{name:'Porównaj moje rozwiązanie z kryterium'}).click();
  const criterion=scope.getByTestId('windows-mission-criterion');
  await criterion.waitFor();
  await criterion.getByText(m.pitfall,{exact:true}).waitFor();
  await criterion.getByText(/Trenerki nie może stwierdzić/).waitFor();
  const doc=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  assert(doc.scroll<=doc.client+3,'Horizontal overflow '+JSON.stringify(doc));
  const button=scope.getByRole('button',{name:'② Na moim komputerze'});
  const bounds=await button.boundingBox();
  assert(bounds&&bounds.height>=44,'Touch target too small: '+JSON.stringify(bounds));
  assert.deepEqual(events.errors,[],'Browser JavaScript exceptions');
  assert.deepEqual(events.unexpected,[],'Unexpected Supabase writes during ungraded exercise');
  if(round===2){
   // Capture the viewport seen by an actual learner, not a tall clipped element.
   const heading=scope.getByText(m.goal,{exact:false}).first();
   await heading.evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
   const rect=await heading.boundingBox();
   assert(rect && rect.y>=-5 && rect.y<p.height-30,'Critical mission heading is outside the visible viewport: '+JSON.stringify(rect));
   assert(!(await rejectCookies.isVisible().catch(()=>false)),'Cookie consent obscures the reviewed lesson');
   await page.screenshot({path:'/tmp/trenerki-windows-qa-round'+round+'-'+p.id+'.png',fullPage:false});
  }
  console.log('✓ Cykl '+round+' · '+p.title+' ('+p.width+'×'+p.height+'): zadanie, real PC, samokontrola i ekran OK');
  return {id:p.id,title:p.title,lesson:p.lesson+1,viewport:p.width+'×'+p.height,steps:m.steps.length,jsErrors:0,unexpectedWrites:0,overflow:false,passed:true};
 }finally{await context.close();}
}
function engineerCheck(round,checked){
 assert.equal(checked.length,8,'IT engineer: exactly eight profile environments');
 assert(checked.every(x=>x.passed&&x.jsErrors===0&&x.unexpectedWrites===0&&!x.overflow),'IT engineer: technical failures');
 assert(checked.some(x=>x.viewport.startsWith('360'))&&checked.some(x=>x.viewport.startsWith('1920')),'IT engineer: missing screen extremes');
 const desktop=readFileSync(new URL('../src/WindowsDesktopLab.tsx',import.meta.url),'utf8');
 const component=readFileSync(new URL('../src/WindowsPracticeMission.tsx',import.meta.url),'utf8');
 assert(desktop.includes("WIN+CTRL+←")&&desktop.includes("case 'WIN+←'"),'IT engineer: desktop/snap distinction broken');
 assert(desktop.includes('Zapisz notatkę do pliku')&&desktop.includes('win11-unsaved-warning'),'IT engineer: Notepad persistence test missing');
 assert(component.includes('nie jest wysyłana ani zapisywana jako zaliczenie'),'IT engineer: false grading claim');
 console.log('✓ Cykl '+round+' · IT ENGINEER SIGN-OFF: 8/8, bez wyjątków JS, zapisu do Supabase i poziomego przewijania');
 return {passed:true,jsExceptions:0,unexpectedWrites:0,profilesChecked:8};
}
function criticCheck(round,checked){
 assert.equal(checked.length,8,'Critic: missing user perspectives');
 const expectedRoles={
  student:'Student',senior:'Senior',office:'Pracownik biurowy',
  accounting:'Księgowa',construction:'Kierownik budowy',
  warehouse:'Magazynier',remote:'Pracownik zdalny',it:'Technik IT'
 };
 for(const x of checked){
  editorialAssertions(missions[x.lesson-1]);
  assert.equal(missions[x.lesson-1].persona,expectedRoles[x.id],'Critic: scenario does not match intended learner');
 }
 assert.equal(new Set(checked.map(x=>missions[x.lesson-1].goal)).size,8,'Critic: scenarios are repetitive');
 assert.equal(new Set(checked.map(x=>missions[x.lesson-1].persona)).size,8,'Critic: professional contexts too similar');
 const all=missions.map(m=>m.goal);
 assert.equal(new Set(all).size,30,'Critic: no individual goals in all 30 lessons');
 assert(missions.every(m=>m.steps.length>=3&&m.real_pc&&m.evidence&&m.pitfall),'Critic: ungrounded promises in other chapters');
 console.log('✓ Cykl '+round+' · KRYTYK SIGN-OFF: 8 odrębnych celów, 30 kompletnych rozdziałów, nieudawana weryfikacja');
 return {passed:true,distinctScenarios:8,totalChapters:30,limitations:['Kontrola automatyczna, nie testy z żywymi kursantami','Nie można zweryfikować skrótów wykonanych na cudzym komputerze']};
}
// Final sign-off: an imaginary priest who has NEVER used a Windows computer.
// This is a simulated novice journey, not a claim that an actual clergyman tested the site.
async function priestZeroExperience(browser,kind){
 const mobile=kind==='phone',width=mobile?390:1280,height=mobile?844:800;
 const context=await browser.newContext({
  viewport:{width,height},deviceScaleFactor:mobile?2:1,isMobile:mobile,hasTouch:mobile,locale:'pl-PL'
 });
 const page=await context.newPage(),events={errors:[],unexpected:[]};
 page.setDefaultTimeout(14000);
 page.on('pageerror',error=>events.errors.push(String(error.message)));
 try{
  await setupMock(page,events,true);
  await page.goto(origin+'/nauka?course=windows-skroty&lesson=1',{waitUntil:'domcontentloaded'});
  const privacy=page.getByRole('region',{name:'Zgoda na pomiary reklamowe'});
  await privacy.waitFor({state:'visible',timeout:12000});
  await privacy.getByRole('button',{name:'Odrzuć',exact:true}).click();
  await privacy.waitFor({state:'hidden'});
  await page.getByTestId('windows-start-from-zero-hint').waitFor();
  const lab=page.getByTestId('windows-desktop-lab'),guide=lab.getByTestId('windows-absolute-beginner');
  await guide.waitFor();
  await guide.getByText('Nigdy nie korzystałem z komputera',{exact:true}).waitFor();
  await guide.getByRole('button',{name:'Rozpocznij naukę od zera'}).click();
  const advance=()=>guide.getByRole('button',{name:'Sprawdź wykonanie kroku'}).click();
  const title=guide.getByTestId('windows-beginner-task');
  await title.filter({hasText:'Znajdź Start'}).waitFor();
  // A true beginner must not get credit by pressing Next without a real action.
  await advance();
  await guide.getByTestId('windows-beginner-error').filter({hasText:/Kliknij znak ⊞/}).waitFor();
  await lab.getByRole('button',{name:'Otwórz menu Start'}).click();
  await lab.getByTestId('windows-start-menu').waitFor();
  await advance();
  await title.filter({hasText:'Otwórz Notatnik'}).waitFor();
  await lab.getByRole('button',{name:'Uruchom Notatnik'}).click();
  await lab.getByTestId('win11-window-notes').waitFor();
  await advance();
  await title.filter({hasText:'Napisz pierwsze zdanie'}).waitFor();
  const notepad=lab.getByRole('textbox',{name:'Notatnik — pole ćwiczebne'});
  assert.equal(await notepad.inputValue(),'','Novice should start with a blank document');
  await advance();
  await guide.getByTestId('windows-beginner-error').filter({hasText:/minimum 20 znaków/}).waitFor();
  const bulletin='Ogłoszenia parafialne na niedzielę: spotkanie po nabożeństwie.';
  await notepad.fill(bulletin);
  await advance();
  await title.filter({hasText:'Zapisz dokument'}).waitFor();
  await lab.getByRole('textbox',{name:'Nazwa pliku do zapisu'}).fill('Ogloszenia_parafialne.txt');
  await advance();
  await guide.getByTestId('windows-beginner-error').filter({hasText:/wybierz „Zapisz”/}).waitFor();
  await lab.getByRole('button',{name:'Zapisz notatkę do pliku'}).click();
  await lab.getByText(/Zapisano Ogloszenia_parafialne.txt w Dokumentach ćwiczebnych/).waitFor();
  await advance();
  await title.filter({hasText:'Zamknij Notatnik, znajdź plik'}).waitFor();
  const close=lab.getByRole('button',{name:'Zamknij Notatnik'});
  const dimensions=await close.boundingBox();
  assert(dimensions&&dimensions.width>=38&&dimensions.height>=38,'IT reviewer: novice close target is too small');
  await close.click();
  await lab.getByTestId('win11-window-notes').waitFor({state:'detached'});
  await lab.getByRole('button',{name:'Otwórz Eksplorator plików'}).click();
  await lab.getByTestId('win11-window-files').waitFor();
  await advance();
  await title.filter({hasText:'Otwórz własny dokument ponownie'}).waitFor();
  await lab.getByRole('button',{name:'Otwórz plik Ogloszenia_parafialne.txt'}).click();
  await lab.getByTestId('win11-window-notes').waitFor();
  assert.equal(await notepad.inputValue(),bulletin,'Novice must recover same content, not just open an empty app');
  await advance();
  await guide.getByTestId('windows-beginner-success').waitFor();
  await guide.getByText(/plik w symulacji, nie na Twoim prawdziwym komputerze/).waitFor();
  const overflow=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth}));
  assert(overflow.width<=overflow.viewport+3,'Critic: novice flow has horizontal overflow');
  assert.deepEqual(events.errors,[],'IT reviewer: browser JavaScript exceptions');
  assert.deepEqual(events.unexpected,[],'IT reviewer: novice flow unexpectedly wrote to Supabase');
  await guide.scrollIntoViewIfNeeded();
  await page.screenshot({path:'/tmp/trenerki-windows-priest-final-'+kind+'.png',fullPage:false});
  console.log('✓ OSTATECZNY TEST: ksiądz bez doświadczenia ('+kind+'): od pustego pulpitu do zapisanych i odnalezionych ogłoszeń; kontrola IT i krytyka pozytywna');
  return {persona:'Ksiądz bez wcześniejszego doświadczenia komputerowego',device:kind,scenario:'Ogłoszenia parafialne',
   beginnerSteps:6,mistakesCaught:3,documentSavedAndReopened:true,noBackendWrites:true,noJavascriptErrors:true,
   horizontalOverflow:false,engineeringReview:'passed',criticalReview:'passed'};
 }finally{await context.close();}
}
const browser=await chromium.launch({headless:true,...(process.env.TRENERKI_CHROMIUM_BINARY?{executablePath:process.env.TRENERKI_CHROMIUM_BINARY}:{} )});
try{
 for(let round=1;round<=2;round++){
  const picked=round===1?profiles:[...profiles].reverse();
  const checked=[];
  console.log('\n=== CYKL '+round+' / 2: osiem środowisk ===');
  for(const p of picked)checked.push(await runPersona(browser,p,round));
  // Mandatory order: engineer reviews technical safety BEFORE critic signs off on learner experience.
  const engineers=engineerCheck(round,checked);
  const critics=criticCheck(round,checked);
  result.rounds.push({round,profiles:checked,engineers,critics});
 }
 result.priestFinal=[
  await priestZeroExperience(browser,'desktop'),
  await priestZeroExperience(browser,'phone')
 ];
 result.summary={passed:result.rounds.length===2&&result.rounds.every(r=>r.engineers.passed&&r.critics.passed),profileJourneys:16,engineerReviews:2,criticReviews:2,priestFinalJourneys:result.priestFinal.length};
 assert(result.summary.passed);
 console.log('\n✓ WYNIK: 2 cykle, 16 przebiegów zawodowych, 2 kontrole IT, 2 recenzje krytyczne + końcowy test księdza od zera (desktop i telefon).');
}finally{
 await browser.close();
 writeFileSync('/tmp/trenerki-windows-two-cycles-report.json',JSON.stringify(result,null,2));
}
