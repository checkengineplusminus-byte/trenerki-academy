#!/usr/bin/env node
// Exercise the exported /nauka route using synthetic learners and isolated API responses.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const {chromium}=await import(process.env.TRENERKI_PLAYWRIGHT_MODULE||'playwright');
const origin=new URL(process.argv[2]||'http://127.0.0.1:8787').origin;
const apiOrigin='https://kcvvixcjuwglfvdpypzs.supabase.co';
const user={id:'00000000-0000-4000-a000-000000000001',email:'learner@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};
const quiz={situation:'Próba na danych ćwiczebnych.',example:'Sprawdź wynik na dwóch danych.',question:'Jak zaczynasz?',options:['Sprawdzam dane','Pomijam dane','Zamykam okno'],correct:0,explanation:'Dane wpływają na wynik.'};
const shortcuts=['L','PL','C'].map((combo,i)=>({combo,keys:[combo,'Enter'],kind:'alias',label:['Linia','Polilinia','Okrąg'][i],before:'Sprawdź wiersz poleceń.',after:'Przygotuj punkty figury '+combo+'.',tip:'Potwierdź Enterem.',platform:'AutoCAD Windows'}));
const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'apikey,authorization,content-type,x-client-info,accept-profile,content-profile,prefer','access-control-allow-methods':'GET,POST,OPTIONS'};

async function installFixture(page,catalog){
 const progress=new Map(),finished=[],answers=[];
 const completed=(slug)=>{
  if(!progress.has(slug))progress.set(slug,catalog?[]:[0]);
  return progress.get(slug);
 };
 await page.addInitScript(({user})=>{
  localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify({
   access_token:'test-access-token',refresh_token:'test-refresh-token',expires_at:Math.floor(Date.now()/1000)+3600,
   expires_in:3600,token_type:'bearer',user,
  }));
 },{user});
 await page.route(url=>url.origin===origin&&url.pathname==='/nauka',async route=>{
  const response=await route.fetch({url:origin+'/nauka.html'});
  await route.fulfill({response});
 });
 await page.route(url=>url.origin===apiOrigin,async route=>{
  const req=route.request(),url=new URL(req.url());
  const table=url.pathname.split('/').at(-1);
  const method=req.method(),slug=(url.searchParams.get('course_slug')||url.searchParams.get('slug')||'').replace(/^eq\./,'');
  const json=(data,status=200)=>route.fulfill({headers,contentType:'application/json',body:JSON.stringify(data),status});
  if(method==='OPTIONS')return route.fulfill({headers,status:204});
  if(url.pathname==='/auth/v1/user')return json(user);
  if(table==='ta_enrollments')return json([{id:'demo'}]);
  if(table==='ta_lessons'&&catalog){
   const course=catalog.byId.get(slug);
   return json(course.outline.map((title_pl,lesson_no)=>({lesson_no,title_pl,material:lesson_no===0?catalog.sample(slug):{learning:quiz}})));
  }
  if(table==='ta_lessons')return json([0,1,2].map(n=>({
   lesson_no:n,title_pl:'Lekcja testowa '+(n+1),material:{sections:[{heading:'Praktyka',text:'Własny przykład w bezpiecznym środowisku testowym.'}],
    ...(n===1?{learning:quiz}:{}),...(slug==='autocad-skroty'&&n===0?{shortcuts}:{}),
   },
  })));
  if(table==='ta_drafts')return method==='POST'?route.fulfill({headers,status:201}):json([]);
  if(table==='ta_learning_progress')return json(completed(slug).map(lesson_no=>({lesson_no})));
  if(table==='ta_courses')return json([{title_pl:'Kurs testowy '+slug,description_pl:'Dane demonstracyjne'}]);
  if(table==='ta_learning_attempts')return json(catalog?answers.filter(x=>x.course_slug===slug):[{lesson_no:1,mode:'case',correct:true}]);
  if(table==='ta-lesson-guide'){
   const input=req.postDataJSON();
   if(input.action==='complete'){
    if(catalog&&!answers.some(row=>row.course_slug===input.course_slug&&row.lesson_no===input.lesson_no&&row.correct))
     return json({error:'exercise_required'},409);
    completed(input.course_slug).push(input.lesson_no);
    finished.push([input.course_slug,input.lesson_no]);
    return json({ok:true,completed:true});
   }
   if(input.action==='attempt'){
    const material=catalog?.sample(input.course_slug);
    const q=input.mode==='construction'?material?.construction?.roleplay:material?.learning;
    const correct=catalog?Number(q?.correct)===input.selected_index:input.active_combo===input.selected_combo;
    if(catalog)answers.push({...input,correct});
    return json({ok:true,correct});
   }
   return json({ok:true,can_reply:true});
  }
  return json({ok:true});
 });
 return finished;
}

async function openCourse(page,slug,lesson=1){
 await page.goto(origin+'/nauka?course='+slug+'&lesson='+lesson);
 await expectLesson(page,lesson);
}
async function expectLesson(page,number){
 await page.getByTestId('lesson-heading').filter({hasText:new RegExp('^Lekcja testowa '+number+'$')}).waitFor();
}
async function waitText(locator,expected){
 await locator.filter({hasText:expected}).waitFor({timeout:7000});
}

async function verifyCad(page,mobile){
 await openCourse(page,'autocad-skroty');
 const lab=page.getByTestId('cad-workspace'),input=lab.getByTestId('cad-command'),summary=lab.getByTestId('cad-summary');
 await lab.waitFor();
 assert.equal(await lab.count(),1);
 const send=async command=>{await input.fill(command);await input.press('Enter');};
 const click=name=>lab.getByRole('button',{name,exact:true}).click();
 const canvas=lab.getByTestId('cad-canvas');
 await send('_.RECTANG');await send('-1000,-800');await send('@4200,3000');
 await waitText(summary,'Obiekty: 1');await lab.getByText('Prostokąt · 4200 × 3000',{exact:true}).waitFor();
 await click('Dopasuj widok');
 const first=await canvas.locator('polygon').getAttribute('points');
 assert(first&&first.split(' ').length===4,'The model shows the typed rectangle');
 const screenPick=async(fx,fy)=>{
  const bounds=await canvas.boundingBox(),position={x:bounds.width*fx,y:bounds.height*fy};
  if(mobile)await canvas.tap({position});else await canvas.click({position});
 };
 await click('Kreskowanie · HATCH');await screenPick(.48,.48);
 await waitText(summary,'Wypełnienia: 0');
 await click('Enter ↵');await waitText(summary,'Wypełnienia: 1');
 await send('CIRCLE');await send('400,400');await send('D');await send('600');
 await waitText(summary,'Obiekty: 2');await lab.getByText('Okrąg · R 300 · Ø 600',{exact:true}).waitFor();
 await click('Linia · LINE');await send('0,0');await send('@1000<0');
 await waitText(summary,'Obiekty: 3');await send('@1000<90');await waitText(summary,'Obiekty: 4');
 await send('U');await waitText(summary,'Obiekty: 3');
 await send('ESC');await waitText(summary,'Obiekty: 3');
 await click('Cofnij · Ctrl+Z');await waitText(summary,'Obiekty: 2');
 await click('Ponów · Ctrl+Y');await waitText(summary,'Obiekty: 3');
 await send('DI');await send('-1000,-800');await send('3200,-800');
 await lab.getByText('Odległość 4200 · ΔX 4200 · ΔY 0',{exact:true}).waitFor();
 await click('Layers / Warstwy');await click('Nowa warstwa');
 await lab.getByRole('textbox',{name:'Nazwa warstwy'}).fill('Wymiary');
 await click('Dodaj warstwę');
 await click('Annotate / Opisz');await click('Wymiar liniowy · DIMLINEAR');
 await send('-1000,-800');await send('3200,-800');await send('1000,-1450');
 await waitText(summary,'Obiekty: 4');
 await canvas.getByText('4200',{exact:true}).waitFor({state:'attached'});
 await click('Layout 1 / Arkusz');
 await canvas.getByText('Arkusz 1 · Model 2D',{exact:true}).waitFor({state:'attached'});
 await click('Model');await click('Dopasuj widok');
 await click('View / Widok');const before=await canvas.locator('polygon').getAttribute('points');
 await click('Przybliż +');const after=await canvas.locator('polygon').getAttribute('points');
 assert.notEqual(after,before,'Zoom changes the screen view');
 await click('Home / Narzędzia główne');await click('Draw / Rysuj');
 await click('Linia · LINE');await click('ORTHO · F8');
 await screenPick(.13,.25);
 await screenPick(.30,.31);await waitText(summary,'Obiekty: 5');
 const coords=(await canvas.locator('polyline[data-cad-object]:not([data-cad-object=preview])').last().getAttribute('points')).split(' ').map(x=>x.split(',').map(Number));
 assert(Math.abs(coords[0][1]-coords[1][1])<1e-5,'ORTHO did not align picked points: '+JSON.stringify(coords));
 await click('Zakończ rysowanie');
 await page.getByRole('button',{name:'L · Linia',exact:true}).click();
 await page.getByRole('button',{name:'Wypróbuj skrót w warsztacie'}).click();
 await lab.getByText(/Wskaż pierwszy punkt/).first().waitFor();
 await page.getByRole('button',{name:/^[A-C]\. L · Linia$/}).click();
 await page.getByText('Wynik zapisany.',{exact:true}).waitFor();
 console.log('✓ '+(mobile?'mobile':'desktop')+' CAD: real-size typed drawing, pointer ORTHO, hatch commit, circle diameter, dimensions, layers, zoom, layout, undo/redo');
}

async function verifyExcel(page,mobile){
 await openCourse(page,'excel-skroty');
 const lab=page.getByTestId('excel-workspace'),formula=lab.getByTestId('excel-formula'),addr=lab.getByRole('textbox',{name:'Adres lub zakres komórek'});
 const cell=(id)=>lab.getByTestId('excel-cell-'+id);
 const write=async(value)=>{await formula.fill(value);await formula.press('Enter');};
 const choose=async(range)=>{await addr.fill(range);await lab.getByRole('button',{name:'Idź do zakresu'}).click();};
 await write('4,5');await waitText(cell('E2'),'1575');
 await cell('E2').click();await write('=C2*$D$2');
 await choose('E2:E4');
 if(mobile)await lab.getByRole('button',{name:'Wypełnij w dół · Ctrl+D'}).click();
 else await page.keyboard.press('Control+d');
 await waitText(cell('E3'),'1050');await waitText(cell('E4'),'350');
 await cell('E3').click();
 assert.equal(await formula.inputValue(),'=C3*$D$2');
 await cell('C5').click();await write('=C2');await choose('C5:E5');
 await lab.getByRole('button',{name:'Wypełnij w prawo · Ctrl+R'}).click();
 await waitText(cell('D5'),'350');
 await cell('D5').click();assert.equal(await formula.inputValue(),'=D2');
 await lab.getByRole('button',{name:'Cofnij · Ctrl+Z'}).click();
 await waitText(cell('D5'),'Razem');
 console.log('✓ '+(mobile?'mobile':'desktop')+' Excel: editable data, recalc, fill down/right, fixed reference and undo');
}

async function verifyWord(page,mobile){
 await openCourse(page,'word-skroty');
 const lab=page.getByTestId('word-workspace'),doc=lab.getByTestId('word-document');
 await doc.waitFor();
 await doc.locator('p').nth(1).click();
 await page.keyboard.press('End');await page.keyboard.insertText(' Termin testowy');
 await doc.evaluate(el=>{
  const p=[...el.querySelectorAll('p')].find(node=>node.textContent.includes('Termin testowy'));
  const walker=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);
  for(let text=walker.nextNode();text;text=walker.nextNode()){
   const offset=text.textContent.indexOf('Termin testowy');
   if(offset<0)continue;
   const range=document.createRange();range.setStart(text,offset);range.setEnd(text,offset+14);
   getSelection().removeAllRanges();getSelection().addRange(range);break;
  }
 });
 await lab.getByRole('button',{name:'Pogrub · Ctrl+B'}).click();
 await waitText(doc.locator('b,strong'),'Termin testowy');
 await doc.locator('p').last().click();await page.keyboard.press('End');
 await lab.getByRole('button',{name:'Wstawianie / Insert'}).click();
 await lab.getByRole('button',{name:'Tabela 2 × 2'}).click();
 assert.equal(await doc.locator('td').count(),4);
 const field=doc.locator('td').nth(2);
 await field.click();await page.keyboard.insertText('Pomiary');
 await waitText(field,'Pomiary');
 console.log('✓ '+(mobile?'mobile':'desktop')+' Word: text editing, selection bold and a writable table');
}

async function verifyExplorer(page,mobile){
 await openCourse(page,'windows-skroty');
 const lab=page.getByTestId('explorer-workspace');
 const button=name=>lab.getByRole('button',{name,exact:true});
 const open=async name=>{await button(name).click();await button('Otwórz wybrany element').click();};
 await button('Nowy → Folder').click();
 await lab.getByRole('textbox',{name:'Nazwa nowego folderu'}).fill('Odbiory');
 await button('Zapisz nazwę').click();
 await button('Plik Notatka.txt').click();await button('Kopiuj').click();
 await open('Folder Odbiory');await button('Wklej').click();
 await button('Plik Notatka.txt').waitFor();
 await button('Zmień nazwę · F2').click();
 await lab.getByRole('textbox',{name:'Nowa nazwa elementu'}).fill('Odbior.txt');
 await button('Zapisz nazwę').click();
 await button('Plik Odbior.txt').waitFor();
 await button('Usuń').click();
 await waitText(lab.getByText('Ten folder jest pusty.'),'pusty');
 await button('Cofnij zmianę · Ctrl+Z').click();
 await button('Plik Odbior.txt').waitFor();
 await button('← Wstecz').click();
 await button('Plik Notatka.txt').waitFor();
 await button('Dalej →').click();
 await button('Plik Odbior.txt').waitFor();
 await button('Plik Odbior.txt').click();await button('Wytnij').click();
 await button('↑ W górę').click();await button('Wklej').click();
 await button('Plik Odbior.txt').waitFor();
 await open('Folder Odbiory');
 await waitText(lab.getByText('Ten folder jest pusty.'),'pusty');
 console.log('✓ '+(mobile?'mobile':'desktop')+' Explorer: create, copy, paste, rename, delete, undo and folder history');
}

async function verifyCarpentry(page,mobile){
 await openCourse(page,'ciesla-przygotowanie-czeladnicze');
 await page.getByRole('button',{name:'Kalkulatory cieśli ↓'}).click();
 const result=page.getByTestId('carpentry-result').first();
 const input=(name)=>page.getByTestId('carpentry-lab').first().getByRole('textbox',{name,exact:true});
 await input('Grubość').fill('45');await input('Szerokość').fill('125,5');await input('Długość').fill('3 000');await input('Liczba sztuk').fill('12');
 await waitText(result,'0,20331 m³');
 await input('Liczba sztuk').fill('1,5');
 await page.getByText('Liczba sztuk musi być liczbą całkowitą.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Wilgotność',exact:true}).click();
 await input('Masa przed suszeniem').fill('10');
 await waitText(result,'0 %');
 await page.getByRole('button',{name:'Cena łączna',exact:true}).click();
 await input('Cena bazowa').fill('100,50');await input('Dodatek').fill('0');
 await waitText(result,'100,5 zł');
 console.log('✓ '+(mobile?'mobile':'desktop')+' carpentry: free inputs, locale decimals, validation, zero humidity and zero surcharge');
}

async function verifyNavigation(page,finished,mobile){
 await openCourse(page,'excel-skroty',2);
 const top=page.getByTestId('lesson-nav-top'),bottom=page.getByTestId('lesson-nav-bottom');
 await page.getByText('✓ Odpowiedź do zadania zapisana',{exact:true}).waitFor();
 await top.getByRole('button',{name:'Poprzednia lekcja'}).click();
 await page.waitForURL(url=>url.searchParams.get('lesson')==='1');
 await expectLesson(page,1);
 await page.reload();
 await expectLesson(page,1);
 await top.getByRole('button',{name:'Wróć do miejsca nauki'}).click();
 await expectLesson(page,2);
 await bottom.getByRole('button',{name:'Poprzednia lekcja'}).click();
 await top.getByRole('button',{name:'Następna dostępna lekcja'}).click();
 await page.getByText('✓ Odpowiedź do zadania zapisana',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Dalej · lekcja 3 →'}).click();
 await page.waitForURL(url=>url.searchParams.get('lesson')==='3');
 await expectLesson(page,3);
 assert.deepEqual(finished,[['excel-skroty',1]]);
 console.log('✓ '+(mobile?'mobile':'desktop')+' lessons: back, reload, resume, recorded quiz and chronological completion');
}

async function verifyAllCourses(ctx){
 const page=await ctx.newPage();
 page.setDefaultTimeout(11000);
 const html=readFileSync(new URL('../public/academy/index.html',import.meta.url),'utf8');
 const courses=JSON.parse(html.match(/^const COURSES=(.+);$/m)[1]);
 assert.equal(courses.length,80);
 const samples=process.env.TRENERKI_ACTUAL_SAMPLES?JSON.parse(readFileSync(process.env.TRENERKI_ACTUAL_SAMPLES,'utf8')):null;
 if(samples)assert.equal(Object.keys(samples).length,courses.length);
 const byId=new Map(courses.map(course=>[course.id,course]));
 const sample=slug=>{
  const actual=samples?.[slug];
  if(actual)return {...actual,sections:(actual.sections||[]).filter(Boolean)};
  const learning=slug==='mlynarz-tradycyjny'?{...quiz,situation:undefined}:quiz;
  return {raw:[byId.get(slug).title,'Zacznij od sytuacji i porównaj możliwe decyzje.','Sytuacja: '+quiz.situation],learning};
 };
 const finished=await installFixture(page,{byId,sample});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 for(const course of courses){
  await page.goto(origin+'/nauka?course='+course.id,{waitUntil:'domcontentloaded'});
  const heading=page.getByTestId('lesson-heading');
  await heading.waitFor();
  assert.equal(await heading.innerText(),course.outline[0],course.id+': opening title');
  const material=sample(course.id);
  const q=material.construction?.roleplay??material.learning;
  assert(q?.options?.[q.correct],course.id+': valid first checkpoint');
  if(!samples&&q.situation)await page.getByText(q.situation,{exact:true}).waitFor();
  const exercise=page.getByTestId(material.construction?'construction-checkpoint':'case-checkpoint');
  const candidates=await exercise.getByRole('button').all();
  const correct=q.options[q.correct].replace(/\s+/g,' ').trim();
  let choice;
  for(const candidate of candidates){
   const label=(await candidate.innerText()).replace(/\s+/g,' ').trim();
   if(label.slice(3)===correct){choice=candidate;break;}
  }
  assert(choice,course.id+': correct choice must be visible');
  await choice.click();
  await page.getByText('✓ Odpowiedź do zadania zapisana',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Dalej · lekcja 2 →'}).click();
  await page.waitForURL(url=>url.searchParams.get('lesson')==='2');
  await heading.filter({hasText:course.outline[1]}).waitFor();
  await page.getByTestId('lesson-nav-top').getByRole('button',{name:'Poprzednia lekcja'}).click();
  await page.waitForURL(url=>url.searchParams.get('lesson')==='1');
  await heading.filter({hasText:course.outline[0]}).waitFor();
  await page.getByText(/Lekcja 1 z .*Ukończona/).waitFor();
  assert.deepEqual(finished.at(-1),[course.id,0]);
  console.log('✓ '+course.id+' · '+course.outline.length+' lessons · course opened, checkpoint accepted, next and back');
 }
 assert.equal(finished.length,80);
 assert.deepEqual(errors,[],'Course pages must render without browser errors');
 console.log('✓ All 80 course paths checked');
 await page.close();
}

const options=process.env.TRENERKI_CHROMIUM_BINARY?{executablePath:process.env.TRENERKI_CHROMIUM_BINARY,args:JSON.parse(process.env.TRENERKI_CHROMIUM_ARGS||'[]')}:undefined;
const selections=process.env.TRENERKI_VIEWPORT==='desktop'?[false]:process.env.TRENERKI_VIEWPORT==='mobile'?[true]:[false,true];
for(const mobile of selections){
 const browser=await chromium.launch({headless:true,...options});
 const ctx=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1365,height:840},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:1});
 const page=await ctx.newPage();
 page.setDefaultTimeout(9000);
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const finished=await installFixture(page);
 try{
  await verifyCad(page,mobile);
  await verifyExcel(page,mobile);
  await verifyWord(page,mobile);
  await verifyExplorer(page,mobile);
  await verifyCarpentry(page,mobile);
  await verifyNavigation(page,finished,mobile);
  if(!mobile&&process.env.TRENERKI_SKIP_FULL_CATALOG!=='1')await verifyAllCourses(ctx);
  const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,view:document.documentElement.clientWidth}));
  assert(size.scroll<=size.view+3,'Learning route has horizontal overflow');
  assert.deepEqual(errors,[],'No browser runtime errors');
 }catch(error){
  await page.screenshot({path:'/tmp/trenerki-lessons-'+(mobile?'mobile':'desktop')+'-error.png',fullPage:true}).catch(()=>{});
  throw error;
 }finally{await browser.close();}
}
