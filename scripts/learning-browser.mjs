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
const photos=JSON.parse(readFileSync(new URL('../public/academy/course-photo-manifest.json',import.meta.url),'utf8')).courses;

async function serveExportedRoutes(page,routes){
 await page.route(url=>url.origin===origin&&routes.includes(url.pathname),async route=>{
  const response=await route.fetch({url:origin+new URL(route.request().url()).pathname+'.html'});
  await route.fulfill({response});
 });
}

async function verifyAnonymousCourse(ctx){
 const page=await ctx.newPage();
 const courseRequests=[];
 try{
  await serveExportedRoutes(page,['/nauka','/konto']);
  await page.route(url=>url.origin===apiOrigin,route=>{
   const req=route.request();
   const path=new URL(req.url()).pathname;
   if(path.startsWith('/rest/v1/ta_'))courseRequests.push(path);
   if(req.method()==='OPTIONS')return route.fulfill({headers,status:204});
   return route.fulfill({headers,status:401,contentType:'application/json',body:'{}'});
  });
  await page.goto(origin+'/nauka?course=zaufany-wolontariusz',{waitUntil:'domcontentloaded'});
  await page.waitForURL(url=>url.pathname==='/konto',{timeout:11000});
  await page.getByPlaceholder('Adres e-mail',{exact:true}).waitFor();
  assert.equal(await page.getByTestId('lesson-heading').count(),0);
  assert.equal(await page.getByTestId('course-intro-photo').count(),0);
  assert.deepEqual(courseRequests,[],'Anonymous entry must redirect before requesting course data');
 }finally{await page.close();}
}

async function verifyIntroPhoto(page,slug){
 const photo=page.getByTestId('course-intro-photo').locator('img');
 await photo.waitFor();
 const actual=await photo.evaluate(async img=>{
  await img.decode();
  const frame=img.getBoundingClientRect();
  if(Math.abs(frame.width*9-frame.height*16)>38)throw new Error('Course cover frame crops the 16:9 photo');
  return {file:new URL(img.currentSrc).pathname,alt:img.alt,width:img.naturalWidth,height:img.naturalHeight};
 });
 assert.deepEqual(actual,{
  file:'/academy/photos/'+photos[slug].file,alt:photos[slug].alt,width:960,height:540,
 },slug+': authenticated opening must render its shared catalogue photo');
}

async function installFixture(page,catalog){
 // Świadoma decyzja syntetycznego ucznia: odrzuca opcjonalne pomiary Ads.
 // Gdy baner pojawi się asynchronicznie, Playwright wybiera prawdziwy przycisk
 // zamiast ukrywać overlay, podmieniać localStorage lub wymuszać kliknięcie.
 await page.addLocatorHandler(page.locator('#trenerki-ads-banner'),async banner=>{
  await banner.getByRole('button',{name:'Odrzuć',exact:true}).click();
  await banner.waitFor({state:'detached'});
 });
 const progress=new Map(),finished=[],answers=[];
 const completed=(slug)=>{
  if(!progress.has(slug))progress.set(slug,catalog?[]:[0]);
  return progress.get(slug);
 };
 await page.addInitScript(({user})=>{
  // Simulate a learner who rejected optional advertising cookies before opening the course.
  // The consent banner is tested separately and must not cover lesson controls in this fixture.
  localStorage.setItem('trenerki_ads_consent_v1','no');
  localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify({
   access_token:'test-access-token',refresh_token:'test-refresh-token',expires_at:Math.floor(Date.now()/1000)+3600,
   expires_in:3600,token_type:'bearer',user,
  }));
 },{user});
 await serveExportedRoutes(page,['/nauka']);
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
  if(table==='ta_learning_attempts')return json(catalog?answers.filter(x=>x.course_slug===slug):[{lesson_no:1,mode:'case',correct:true},...answers.filter(x=>x.course_slug===slug)]);
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
    const correct=input.mode==='carpentry'?input.course_slug==='ciesla-przygotowanie-czeladnicze'&&input.lesson_no===1&&Math.abs(Number(String(input.numeric_answer).replace(',','.'))-0.192)<0.00001:catalog?Number(q?.correct)===input.selected_index:input.active_combo===input.selected_combo;
    if(catalog||input.mode==='carpentry')answers.push({...input,correct});
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
 const consent=page.getByRole('region',{name:'Zgoda na pomiary reklamowe'});
 if(await consent.isVisible())await consent.getByRole('button',{name:'Odrzuć',exact:true}).click();
 if(lesson===1){
  await page.getByTestId('course-reading-introduction').waitFor();
  assert.equal(await page.getByTestId('case-checkpoint').count(),0,'Introduction must precede the first task');
  await page.getByRole('button',{name:'Przejdź do wyjaśnień pierwszej lekcji →'}).click();
 }
 await expectLesson(page,lesson);
}
async function expectLesson(page,number){
 if(number===1){
  const intro=page.getByTestId('course-reading-introduction');
  await intro.or(page.getByTestId('lesson-heading')).first().waitFor();
  if(await intro.isVisible())await intro.getByRole('button',{name:'Przejdź do wyjaśnień pierwszej lekcji →'}).click();
 }
 await page.getByTestId('lesson-heading').filter({hasText:new RegExp('^Lekcja testowa '+number+'$')}).waitFor();
}
async function waitText(locator,expected){
 await locator.filter({hasText:expected}).waitFor({timeout:7000});
}

async function verifyCad(page,mobile){
 await openCourse(page,'autocad-skroty');
 const method=page.getByTestId('autocad-lesson-method');
 await method.waitFor();
 await method.getByText('CAD to dane, nie obrazek',{exact:true}).waitFor();
 const cad=page.getByTestId('cad-workspace');
 await cad.waitFor();
 assert.equal(await cad.getByTestId('cad-command').count(),1,'Interactive command prompt must be present');
 assert.equal(await page.getByTestId('autocad-real-practice').count(),0,'Do not show the same old CAD practice panel in every lesson');
 assert.equal(await page.getByTestId('autocad-original-screens').count(),1,'Original Autodesk screenshot must be visible on first page');
 await page.getByRole('button',{name:'Ekran programu'}).click();
 const originals=page.getByTestId('autocad-original-screens');
 await originals.waitFor();
 const images=originals.locator('img');
 await images.first().waitFor();
 assert.equal(await images.count(),1);
 for(const img of await images.all())await img.evaluate(node=>node.decode());
 await page.getByRole('link',{name:/Otwórz oficjalną instrukcję Autodesk/}).waitFor();
 await page.getByRole('button',{name:'Pojęcia'}).click();
 assert.equal(await page.getByTestId('autocad-original-screens').count(),1);
 await page.getByRole('button',{name:'L · Linia',exact:true}).click();
 await page.getByText('Przed użyciem',{exact:false}).first().waitFor();
 assert.equal(await page.getByRole('button',{name:'Wypróbuj skrót w warsztacie'}).count(),0);
 await page.getByRole('button',{name:/^[A-C]\. L · Linia$/}).click();
 await page.getByText('Wynik zapisany.',{exact:true}).waitFor();
 console.log('✓ '+(mobile?'mobile':'desktop')+' AutoCAD: unique lesson method, original screen on demand, no repeating legacy lab, recorded knowledge question');
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
 // Review course content rather than the fixed site-wide cookie consent banner.
 const dismissCookie=page.getByRole('button',{name:'Odrzuć',exact:true}).first();
 if(await dismissCookie.isVisible().catch(()=>false))await dismissCookie.click();
 const mission=page.getByTestId('windows-mission-0');
 await mission.waitFor();
 // Real learning evidence, not a fake claim that the website inspected the Windows PC.
 await mission.getByRole('button',{name:'② Na moim komputerze'}).click();
 await mission.getByText(/Na własnym PC otwórz Start, Notatnik/).waitFor();
 await mission.getByRole('button',{name:'Porównaj moje rozwiązanie z kryterium'}).click();
 await mission.getByText(/Najpierw opisz własnymi słowami/).waitFor();
 await mission.getByRole('checkbox').first().click();
 await mission.getByRole('textbox',{name:'Moja odpowiedź po ćwiczeniu'}).fill('Windows 11 to system, Notatnik to aplikacja, a Notatka.txt to zapisany plik.');
 await mission.getByRole('button',{name:'Porównaj moje rozwiązanie z kryterium'}).click();
 await mission.getByTestId('windows-mission-criterion').waitFor();
 await mission.getByText(/To samokontrola/).waitFor();
 console.log('✓ '+(mobile?'mobile':'desktop')+' Windows mission: real-PC guidance, steps, typed evidence and honest self-check');
 const simulation=page.getByTestId('windows-desktop-lab');
 await simulation.waitFor();
 // Paid-course proof: edit, Save As, close, find the file in Explorer and reopen it.
 await simulation.getByRole('button',{name:'Otwórz Notatnik'}).click();
 await simulation.getByRole('textbox',{name:'Notatnik — pole ćwiczebne'}).fill('Test jakości: zapis działa i tekst można odzyskać.');
 await simulation.getByRole('textbox',{name:'Nazwa pliku do zapisu'}).fill('Test_Jakosci.txt');
 await simulation.getByRole('button',{name:'Zapisz notatkę do pliku'}).click();
 await simulation.getByText(/Zapisano Test_Jakosci.txt w Dokumentach ćwiczebnych/).waitFor();
 await simulation.getByRole('button',{name:'Zamknij Notatnik'}).click();
 await simulation.getByRole('button',{name:'Otwórz Eksplorator plików'}).click();
 await simulation.getByRole('button',{name:'Otwórz plik Test_Jakosci.txt'}).click();
 await simulation.getByRole('textbox',{name:'Notatnik — pole ćwiczebne'}).waitFor();
 assert.equal(await simulation.getByRole('textbox',{name:'Notatnik — pole ćwiczebne'}).inputValue(),'Test jakości: zapis działa i tekst można odzyskać.');
 await simulation.getByRole('textbox',{name:'Notatnik — pole ćwiczebne'}).fill('Niezapisana zmiana — wymaga decyzji.');
 await simulation.getByRole('button',{name:'Zamknij Notatnik'}).click();
 await simulation.getByTestId('win11-unsaved-warning').waitFor();
 await simulation.getByRole('button',{name:'Wróć i zapisz notatkę'}).click();
 await simulation.getByTestId('win11-unsaved-warning').waitFor({state:'detached'});
  console.log('✓ '+(mobile?'mobile':'desktop')+' Windows Notepad: edit, save, close, reopen, unsaved-change warning');

 // 1: Beginner in an office — Start, search, and a visible application.
 await simulation.getByRole('button',{name:'Otwórz menu Start'}).click();
 await simulation.getByTestId('windows-start-menu').waitFor();
 await simulation.getByRole('button',{name:'Uruchom Kalkulator'}).click();
 await simulation.getByTestId('win11-window-calculator').waitFor();
 // 2: Construction project coordinator — two distinct Snap directions.
 await simulation.getByRole('button',{name:'Symuluj Win+←'}).click();
 await simulation.getByText('Aktywne okno przypięto do lewej połowy. Pulpit nie zmienił się.').waitFor();
 await simulation.getByRole('button',{name:'Symuluj Win+→'}).click();
 await simulation.getByText('Aktywne okno przypięto do prawej połowy. Pulpit nie zmienił się.').waitFor();
 // 3: Accountant — keep two workspaces separate, with no changes to the real machine.
 await simulation.getByRole('button',{name:'Symuluj Win+Ctrl+←'}).click();
 await simulation.getByText('Przełączono na Pulpit 1. To inny pulpit, nie przesunięcie okna.').waitFor();
 await simulation.getByRole('button',{name:'Symuluj Win+Ctrl+→'}).click();
 await simulation.getByText('Przełączono na Pulpit 2. To inny pulpit, nie przesunięcie okna.').waitFor();
 // 4: IT support — explicitly inspect the independent instructions for the REAL Windows computer.
 await simulation.getByRole('button',{name:/Sprawdź Win\+Ctrl\+→ na swoim komputerze/}).click();
 await simulation.getByText(/Na Pulpicie 1 przytrzymaj Windows oraz Ctrl/).waitFor();
 await simulation.getByText(/Trenerki nie wykrywa wyniku/).waitFor();
 // 5: Touch/mobile user — Task View and new desktop work without system keys or a hover gesture.
 await simulation.getByRole('button',{name:'Otwórz widok zadań'}).click();
 await simulation.getByTestId('windows-task-view').waitFor();
 await simulation.getByRole('button',{name:'Utwórz nowy pulpit'}).click();
 await simulation.getByText('Utworzono Pulpit 3.').waitFor();
 console.log('✓ '+(mobile?'mobile':'desktop')+' Windows: five persona flows (office, construction, accounting, IT support, touch), no real-OS hotkeys');
 // Capture the actual course design without a mock foreground window or cookie dialog obscuring the wallpaper.
 await simulation.getByRole('button',{name:'Symuluj Win+D',exact:true}).click();
 await simulation.screenshot({path:'/tmp/trenerki-windows-lab-'+(mobile?'mobile':'desktop')+'.png'});
 await mission.screenshot({path:'/tmp/trenerki-windows-mission-'+(mobile?'mobile':'desktop')+'.png'});
 await simulation.getByRole('button',{name:'Symuluj Win+D',exact:true}).click();
 // Keep the advanced file-operations lab available, but out of the way by default.
 await simulation.getByRole('button',{name:'Otwórz dodatkową pracownię Eksploratora plików ▾'}).click();
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
 await openCourse(page,'windows-skroty',2);
 const nextMission=page.getByTestId('windows-mission-1');
 await nextMission.waitFor();
 await nextMission.getByText('Poznaj elementy pulpitu').first().waitFor();
 console.log('✓ '+(mobile?'mobile':'desktop')+' Windows chapter 2: distinct professional task in sequential lesson');

}

async function verifyCarpentry(page,mobile){
 await openCourse(page,'ciesla-przygotowanie-czeladnicze');
 await page.getByTestId('carpentry-course-history').getByText('Od dawnych osad do nowoczesnych konstrukcji').waitFor();
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

async function verifyCarpentryGate(page,mobile){
 await openCourse(page,'ciesla-przygotowanie-czeladnicze',2);
 const checklist=page.getByTestId('carpentry-checklist');
 await checklist.getByText('Aby przejść dalej, zalicz 2 zadania').waitFor();
 await checklist.getByText('Twój wynik: 1/2').waitFor();
 await checklist.getByText(/2. Zadanie z obliczeń — do rozwiązania/).waitFor();
 const lab=page.getByTestId('carpentry-lab').last();
 const answer=lab.getByRole('textbox',{name:'Wpisz obliczony wynik'});
 const check=lab.getByRole('button',{name:'Sprawdź mój wynik'});
 await answer.fill('6,7');
 await check.click();
 const wrong=lab.getByTestId('carpentry-answer-feedback');
 await wrong.getByText(/Wpisano 6,7 m³/).waitFor();
 await wrong.getByText(/0,192 m³/).waitFor();
 await wrong.getByText(/KROK 1.*KROK 2.*KROK 3/s).waitFor();
 await checklist.getByText('Twój wynik: 1/2').waitFor();
 await answer.fill('0,192');
 await check.click();
 await lab.getByTestId('carpentry-answer-feedback').getByText(/Poprawnie! Zadanie 2 zaliczone/).waitFor();
 await checklist.getByText('Twój wynik: 2/2').waitFor();
 await page.reload();
 await checklist.getByText('Twój wynik: 2/2').waitFor();
 await page.getByRole('button',{name:'Dalej · lekcja 3 →'}).click();
 await page.waitForURL(url=>url.searchParams.get('lesson')==='3');
 console.log('✓ '+(mobile?'mobile':'desktop')+' carpentry: two checkpoints, durable arithmetic result, reload and next lesson');
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
 assert.equal(courses.length,81);
 const samples=process.env.TRENERKI_ACTUAL_SAMPLES?JSON.parse(readFileSync(process.env.TRENERKI_ACTUAL_SAMPLES,'utf8')):null;
 if(samples)assert.equal(Object.keys(samples).length,courses.length);
 const byId=new Map(courses.map(course=>[course.id,course]));
 const exercise='Porównaj dwa wpisy na karcie dostawy.';
 const sample=slug=>{
  const actual=samples?.[slug];
  if(actual)return {...actual,sections:(actual.sections||[]).filter(Boolean)};
  if(slug==='bdo')return {
   learning:{...quiz,task:exercise},
   sections:[{heading:'Zadanie',text:exercise},{heading:'Sprawdź wynik po wykonaniu',text:'Każdy wpis ma identyfikator i datę.'}],
   practice:{visual:{title:'Dwie pozycje karty',kind:'comparison',entries:[{label:'Dostawa',detail:'20 sztuk'},{label:'Zwrot',detail:'2 sztuki'}]}},
  };
  const learning=slug==='mlynarz-tradycyjny'?{...quiz,situation:undefined}:quiz;
  return {raw:[byId.get(slug).title,'Zacznij od sytuacji i porównaj możliwe decyzje.','Sytuacja: '+quiz.situation],learning};
 };
 const finished=await installFixture(page,{byId,sample});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 for(const course of courses){
  await page.goto(origin+'/nauka?course='+course.id,{waitUntil:'domcontentloaded'});
  await page.getByTestId('course-reading-introduction').waitFor();
  assert.equal(await page.getByTestId('case-checkpoint').count(),0);
  await page.getByRole('button',{name:'Przejdź do wyjaśnień pierwszej lekcji →'}).click();
  const heading=page.getByTestId('lesson-heading');
  await heading.waitFor();
  assert.equal(await heading.innerText(),course.outline[0],course.id+': opening title');
  await verifyIntroPhoto(page,course.id);
  const material=sample(course.id);
  const q=material.construction?.roleplay??material.learning;
  assert(q?.options?.[q.correct],course.id+': valid first checkpoint');
  if(!samples&&q.situation)await page.getByText(q.situation,{exact:true}).waitFor();
  if(!samples&&course.id==='bdo'){
   await page.getByTestId('lesson-visual').getByText('20 sztuk',{exact:true}).waitFor();
   assert.equal(await page.getByText(exercise,{exact:true}).count(),1,'Exercise must not be repeated below the quiz');
   await page.getByRole('button',{name:'Pokaż rozwiązanie i kryteria'}).click();
   await page.getByText('Każdy wpis ma identyfikator i datę.',{exact:true}).waitFor();
  }
  const checkpoint=page.getByTestId(material.construction?'construction-checkpoint':'case-checkpoint');
  const candidates=await checkpoint.getByRole('button').all();
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
  assert.equal(await page.getByTestId('course-intro-photo').count(),0,course.id+': introductory photo must appear on the first lesson only');
  await page.getByTestId('lesson-nav-top').getByRole('button',{name:'Poprzednia lekcja'}).click();
  await page.waitForURL(url=>url.searchParams.get('lesson')==='1');
  await heading.filter({hasText:course.outline[0]}).waitFor();
  await page.getByText(/Lekcja 1 z .*Zaliczone ćwiczenia/).waitFor();
  assert.deepEqual(finished.at(-1),[course.id,0]);
  console.log('✓ '+course.id+' · '+course.outline.length+' lessons · course opened, checkpoint accepted, next and back');
 }
 assert.equal(finished.length,courses.length);
 assert.deepEqual(errors,[],'Course pages must render without browser errors');
 console.log('✓ All '+courses.length+' course paths checked');
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
 try{
  await verifyAnonymousCourse(ctx);
  if(process.env.TRENERKI_INTRO_CATALOG_ONLY==='1'){await verifyAllCourses(ctx);continue;}
  const finished=await installFixture(page);
  await openCourse(page,'zaufany-wolontariusz');
  await verifyIntroPhoto(page,'zaufany-wolontariusz');
  await verifyCad(page,mobile);
  await verifyExcel(page,mobile);
  await verifyWord(page,mobile);
  await verifyExplorer(page,mobile);
  await verifyCarpentry(page,mobile);
  await verifyNavigation(page,finished,mobile);
  await verifyCarpentryGate(page,mobile);
  if(!mobile&&process.env.TRENERKI_SKIP_FULL_CATALOG!=='1')await verifyAllCourses(ctx);
  const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,view:document.documentElement.clientWidth}));
  assert(size.scroll<=size.view+3,'Learning route has horizontal overflow');
  assert.deepEqual(errors,[],'No browser runtime errors');
 }catch(error){
  await page.screenshot({path:'/tmp/trenerki-lessons-'+(mobile?'mobile':'desktop')+'-error.png',fullPage:true}).catch(()=>{});
  throw error;
 }finally{await browser.close();}
}
