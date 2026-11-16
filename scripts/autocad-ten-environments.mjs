// 10 independently configured Chromium environments. Every environment executes
// all 30 workshop geometry checks, validates the homework UI, plus numeric LINE
// and DIM. Mobile configurations emulate touch/viewport, not actual iOS/Android.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {chromium}=await import(process.env.TRENERKI_PLAYWRIGHT_MODULE||'playwright');
const origin=new URL(process.argv[2]||'http://127.0.0.1:8787').origin;
const group=process.argv[3]||'a';
const api='https://kcvvixcjuwglfvdpypzs.supabase.co';
const {lessons}=JSON.parse(readFileSync(new URL('../content/autocad-real-program-2026-11-15.json',import.meta.url),'utf8'));
const {assignments}=JSON.parse(readFileSync(new URL('../content/autocad-practice-assignments-v3.json',import.meta.url),'utf8'));
const {assignments:homeworks}=JSON.parse(readFileSync(new URL('../content/autocad-homework-2026.json',import.meta.url),'utf8'));
const fixtures=Array.from({length:30},(_,i)=>i);
const specs=[
 ['desktop-wide',1920,1080,false,false,1,'light'],
 ['desktop-laptop',1366,768,false,false,1,'dark'],
 ['desktop-compact',1280,720,false,false,1.5,'light'],
 ['desktop-small',1024,768,false,false,1,'light'],
 ['tablet-landscape',1180,820,true,true,2,'light'],
 ['tablet-portrait',820,1180,true,true,2,'light'],
 ['mobile-390',390,844,true,true,3,'light'],
 ['mobile-412',412,915,true,true,2.75,'dark'],
 ['mobile-360',360,740,true,true,3,'light'],
 ['mobile-smallest',320,568,true,true,2,'light'],
];
const selected=specs.filter((_,i)=>(i<5?'a':'b')===group);
assert.equal(selected.length,5,'test group must be a or b');
assert.equal(lessons.length,30);assert.equal(assignments.length,30);assert.equal(homeworks.length,30);
const browser=await chromium.launch({headless:true});
let checked=0;
try{
 for(const [label,width,height,hasTouch,isMobile,deviceScaleFactor,colorScheme] of selected){
  const ctx=await browser.newContext({viewport:{width,height},hasTouch,isMobile,deviceScaleFactor,colorScheme,locale:'pl-PL'});
  const page=await ctx.newPage();
  page.setDefaultTimeout(17000);
  const errors=[],homeworkNotes=[];
  page.on('pageerror',e=>errors.push(e.message));
  const user={id:'00000000-0000-4000-a000-000000000030',email:'cad-test@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{full_name:'Test AutoCAD'}};
  const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'apikey,authorization,content-type,x-client-info,accept-profile,content-profile,prefer','access-control-allow-methods':'GET,POST,OPTIONS'};
  await page.addInitScript(({user})=>localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',
   JSON.stringify({access_token:'test-access-token',refresh_token:'test-refresh-token',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user})),{user});
  await page.route(url=>url.origin===origin&&url.pathname==='/nauka',async route=>{
   const response=await route.fetch({url:origin+'/nauka.html'});await route.fulfill({response});
  });
  await page.route(url=>url.origin===api,async route=>{
   const req=route.request(),url=new URL(req.url()),path=url.pathname,table=path.split('/').at(-1);
   const json=(data,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(data)});
   if(req.method()==='OPTIONS')return json({},204);
   if(path==='/auth/v1/user')return json(user);
   if(table==='ta_enrollments')return json([{id:'test-only'}]);
   if(table==='ta_courses')return json([{title_pl:'AutoCAD — skróty i komendy w praktyce',description_pl:'Wersja testowa'}]);
   if(table==='ta_lessons')return json(lessons);
   if(table==='ta_learning_progress')return json(fixtures.map(lesson_no=>({lesson_no})));
   if(table==='ta_learning_attempts')return json([]);
   if(table==='ta_drafts')return json([]);
   if(table==='ta_autocad_homework'){
    if(req.method()==='GET')return json(homeworkNotes.filter(x=>String(x.lesson_no)===url.searchParams.get('lesson_no')?.replace('eq.','')));
    const body=req.postDataJSON();homeworkNotes.push(body);return json({},201);
   }
   if(table==='ta-exam')return json({state:'ready',available:true});
   return json({ok:true});
  });
  try{
   await page.goto(origin+'/nauka?course=autocad-skroty&lesson=1');
   await page.getByTestId('course-reading-introduction').waitFor();
   const consent=page.getByRole('region',{name:'Zgoda na pomiary reklamowe'});
   if(await consent.isVisible())await consent.getByRole('button',{name:'Odrzuć',exact:true}).click();
   await page.getByRole('button',{name:'Przejdź do wyjaśnień pierwszej lekcji →'}).click();
   for(let n=0;n<30;n++){
    await page.getByTestId('lesson-heading').filter({hasText:lessons[n].title_pl}).waitFor();
    const task=page.getByTestId('cad-assigned-exercise');
    const lab=page.getByTestId('cad-workspace');
    const hw=page.getByTestId('autocad-homework-'+n);
    await Promise.all([task.waitFor(),lab.waitFor(),hw.waitFor()]);
    assert.equal(await hw.locator('[data-testid^="autocad-homework-step-"]').count(),3,label+' homework '+n);
    const cmd=lab.getByTestId('cad-command');
    const send=async line=>{await cmd.fill(line);await lab.getByRole('button',{name:'Enter ↵'}).click();};
    await task.getByRole('button',{name:'Rozpocznij zadanie tej lekcji'}).click();
    for(const input of assignments[n].typing)await send(input);
    if(assignments[n].targetKind==='line')await send('');
    if(n===0){
     await lab.getByTestId('cad-summary').filter({hasText:'Obiekty: 1'}).waitFor();
     await send('DIM');await send('500,200');
     await lab.getByText(/Dodano wymiar 1000 jednostek modelu/).waitFor();
     await send('DIST');await send('0,0');await send('1000,0');
     await lab.getByText(/Odległość 1000/).waitFor();
     for(let s=0;s<3;s++)await hw.getByTestId('autocad-homework-step-'+s).click();
     await hw.getByTestId('autocad-homework-notes').fill('Kontrola: odcinek 1000 mm i 500 mm, DIST potwierdza wymiar niezależnie od ZOOM.');
     await hw.getByTestId('autocad-homework-save').click();
     await hw.getByTestId('autocad-homework-status').getByText(/Zapisano: praca domowa ukończona/).waitFor();
     assert.equal(homeworkNotes.length,1);
    }
    if(n===16){await send('DIM');await send('500,200');}
    await task.getByRole('button',{name:'Sprawdź moje ćwiczenie'}).click();
    await task.getByTestId('cad-exercise-feedback').getByText(/Zaliczone ćwiczenie geometrii/).waitFor();
    checked++;
    if(n<29)await page.getByRole('button',{name:new RegExp('^Dalej · lekcja '+(n+2)+' →')}).click();
   }
   assert.deepEqual(errors,[],label+' browser errors');
   const bounds=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,view:document.documentElement.clientWidth}));
   assert(bounds.scroll<=bounds.view+3,label+' horizontal scrolling '+JSON.stringify(bounds));
   console.log('✓ '+label+': 30/30 geometry assignments, DIM/DIST, notes and three-step homework visible');
  }catch(err){
   console.error('FAILED '+label+' at '+page.url()+': '+String(err));
   console.error((await page.locator('body').innerText()).slice(-7000));
   throw err;
  }finally{await ctx.close();}
 }
 assert.equal(checked,150);
 console.log('✓ group '+group+' complete: '+checked+' task checks. Both groups together: 10 environments × 30 lessons = 300.');
}finally{await browser.close();}
