// Real rendered UI and Auth/REST client with a fully intercepted synthetic API.
// No real learner, lesson content, password, progress or diploma is modified.
import assert from 'node:assert/strict';
import {chromium,firefox,webkit} from 'playwright';
const origin=new URL(process.argv[2]||'http://127.0.0.1:8787').origin;
assert.match(origin,/^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/);
const engine=process.env.TRENERKI_TEST_ENGINE||'chromium';
assert(['chromium','firefox','webkit'].includes(engine));
const browser=await({chromium,firefox,webkit})[engine].launch(process.env.TRENERKI_TEST_EXECUTABLE?{executablePath:process.env.TRENERKI_TEST_EXECUTABLE}:{});
const api='https://kcvvixcjuwglfvdpypzs.supabase.co',standard='zaufany-wolontariusz';
const user={id:'00000000-0000-4000-a000-000000000301',email:'learner@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};
const other={...user,id:'00000000-0000-4000-a000-000000000302',email:'other@example.test'};
const original='Moja samodzielna praca do zachowania w notatniku.';
async function fixture(width,{course=standard,storageFailure=false}={}){
 const context=await browser.newContext({viewport:{width,height:960},serviceWorkers:'block'});
 await context.addInitScript(({user,other,storageFailure})=>{
  const learner=sessionStorage.getItem('notes-fixture-user')==='other'?other:user;
  localStorage.setItem('trenerki_ads_consent_v1','no');
  localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify({access_token:'synthetic-token',refresh_token:'synthetic-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:learner}));
  if(storageFailure){const set=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('trenerki-course-notes-v1:'))throw new DOMException('Synthetic quota failure','QuotaExceededError');return set.call(this,key,value);};}
 },{user,other,storageFailure});
 const rows=new Map(),state={user,course,delay:0,fail:false,readFail:false,loseResponse:false,compete:false,writes:[],applied:0,misses:0,completed:[],completions:0};
 const key=()=>JSON.stringify([state.user.id,state.course]);
 rows.set(key(),{last_module:0,notes:{byLesson:{}},updated_at:'2026-11-28T00:00:00.000Z'});
 Object.defineProperty(state,'row',{get:()=>rows.get(key())||null,set:value=>rows.set(key(),value)});
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin===origin){
   if(request.isNavigationRequest()&&url.pathname==='/nauka')return route.fulfill({response:await route.fetch({url:origin+'/nauka.html'})});
   return route.continue();
  }
  if(url.origin!==api)return route.abort();
  const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,PATCH,OPTIONS'};
  const reply=(json,status=200)=>route.fulfill({headers,json,status});
  if(request.method()==='OPTIONS')return route.fulfill({headers,status:204});
  if(url.pathname==='/auth/v1/user')return reply(state.user);
  const table=url.pathname.split('/').at(-1);
  if(table==='ta_enrollments')return reply([{id:'synthetic-enrollment'}]);
  if(table==='ta_lessons')return reply([0,1].map(lesson_no=>({lesson_no,title_pl:'Lekcja próby zapisu '+(lesson_no+1),material:{sections:[{heading:'Praktyka',text:'To niezależny przykład techniczny, bez materiałów płatnego kursu.'}],homework:{instructions:'Opisz własny plan ćwiczenia i sposób sprawdzenia wyniku.'}}})));
  if(table==='ta_courses')return reply([{title_pl:'Próba notatnika',description_pl:'Dane fikcyjne.'}]);
  if(table==='ta_learning_progress')return reply(state.completed.map(lesson_no=>({lesson_no})));
  if(table==='ta_learning_attempts')return reply([]);
  if(table==='ta_drafts'){
   if(url.searchParams.get('user_id')&&url.searchParams.get('user_id')!=='eq.'+state.user.id)return reply({code:'42501',message:'Synthetic forbidden owner'},403);
   if(request.method()==='GET')return state.readFail?reply({code:'503',message:'Nie udało się odczytać próbnej notatki.'},503):reply(state.row?[state.row]:[]);
   const body=request.postDataJSON();assert.equal(body.user_id,state.user.id);assert.equal(body.course_slug,state.course);state.writes.push(body);
   if(state.delay)await new Promise(resolve=>setTimeout(resolve,state.delay));
   if(state.fail)return reply({message:'Synthetic connection failure',code:'503'},503);
   if(state.compete){state.compete=false;state.row={...state.row,notes:{byLesson:{...state.row.notes.byLesson,'1':'Nowsza notatka w drugiej lekcji.'}},updated_at:new Date(Date.parse(state.row.updated_at)+1).toISOString()};}
   if(request.method()==='PATCH'&&url.searchParams.get('updated_at')!=='eq.'+state.row?.updated_at){state.misses++;return reply([]);}
   if(request.method()==='POST'&&state.row)return reply({code:'23505',message:'Synthetic insert race'},409);
   state.row=structuredClone(body);state.applied++;
   if(state.loseResponse)return route.abort('failed');
   return reply([state.row]);
  }
  if(table==='ta-lesson-guide'){
   const body=request.postDataJSON();
   if(body.action==='complete'){state.completions++;if(!state.completed.includes(body.lesson_no))state.completed.push(body.lesson_no);return reply({ok:true,completed:true});}
   return reply({ok:true,can_reply:true});
  }
  if(table==='ta-academy')return reply({is_admin:false});
  if(table==='ta-exam')return reply({status:'not_ready'});
  return reply([]);
 });
 const page=await context.newPage();page.setDefaultTimeout(12000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin+'/nauka?course='+state.course+'&lesson=1');await enterLesson(page);
 const note=page.getByTestId(course==='norweski-na-budowie'?'norwegian-homework-note':course==='lepszy-cukiernik'?'pastry-homework-note':'general-lesson-homework-note');
 const save=course==='lepszy-cukiernik'?page.getByRole('button',{name:'Zapisz notatkę',exact:true}):page.getByRole('button',{name:'Zapisz zadanie domowe',exact:true});
 return {context,page,state,errors,note,save};
}
async function enterLesson(page){
 const intro=page.getByTestId('course-reading-introduction'),heading=page.getByTestId('lesson-heading');
 await intro.or(heading).first().waitFor();
 if(await intro.isVisible())await page.getByRole('button',{name:'Przejdź do wyjaśnień pierwszej lekcji →',exact:true}).click();
 await heading.waitFor();
}
async function cached(page){await page.getByTestId('course-note-status').filter({hasText:'Szkic zachowany na tym urządzeniu.'}).waitFor();}
async function saved(page){await page.getByText(/✓ Zapisano zadanie|✓ Zadanie zapisano|✓ Zapisano odpowiedź/).waitFor();}
async function race({page,state,note,save}){
 const latest=original+' Dopisany ważny wniosek.';
 await note.fill(original);state.delay=700;await save.click();
 assert.equal(await page.getByTestId('lesson-finish').isEnabled(),false);
 await note.fill(latest);await page.getByText('Zapisano wysłaną wersję. Masz nowszy szkic — zapisz go ponownie.',{exact:true}).waitFor();
 assert.equal(await note.inputValue(),latest);assert.equal(state.row.notes.byLesson[0],original);
 state.delay=0;await save.click();await saved(page);assert.equal(state.row.notes.byLesson[0],latest);
 await page.reload();await enterLesson(page);assert.equal(await note.inputValue(),latest);
}
let checks=0;
async function scenario(width,name,options,run){
 const f=await fixture(width,options);
 try{await f.note.waitFor();await run(f);assert.deepEqual(f.errors,[]);assert(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+4));checks++;}
 catch(error){console.error(name+' '+width+'px');console.error(await f.page.locator('body').innerText());throw error;}
 finally{await f.context.close();}
}
try{
 const widths=process.env.TRENERKI_TEST_WIDTHS?process.env.TRENERKI_TEST_WIDTHS.split(',').map(Number):[360,768,1440];
 for(const width of widths){
  await scenario(width,'typing during save',{},race);
  await scenario(width,'failed save at lesson completion',{},async({page,state,note})=>{
   await note.fill(original);state.fail=true;await page.getByTestId('lesson-finish').click();
   await page.getByTestId('course-note-status').filter({hasText:'Zapis notatki nie powiódł się'}).waitFor();
   assert((await page.getByTestId('lesson-heading').innerText()).includes('zapisu 1'));assert.equal(state.completed.length,1);
   await page.reload();await enterLesson(page);assert.equal(await note.inputValue(),original);
   state.fail=false;await page.getByTestId('lesson-finish').click();
   await page.getByTestId('lesson-heading').filter({hasText:'zapisu 2'}).waitFor();
   assert.equal(state.row.notes.byLesson[0],original);assert.equal(state.completions,1,'Retry must not submit completion twice');
  });
  await scenario(width,'local draft without account write',{},async({page,state,note})=>{
   await note.fill(original);await cached(page);await page.reload();await enterLesson(page);
   assert.equal(await note.inputValue(),original);assert.equal(state.writes.length,0);
  });
  await scenario(width,'failed explicit save and recovery',{},async({page,state,note,save})=>{
   await note.fill(original);state.fail=true;await save.click();
   await page.getByTestId('course-note-status').filter({hasText:'Zapis notatki nie powiódł się'}).waitFor();
   await page.reload();await enterLesson(page);assert.equal(await note.inputValue(),original);
   state.fail=false;await save.click();await saved(page);assert.equal(state.row.notes.byLesson[0],original);
  });
  await scenario(width,'compare and keep my version',{},async({page,state,note,save})=>{
   await note.fill(original);state.row.notes.byLesson[0]='Inna wersja z drugiego okna.';state.row.updated_at='2026-11-28T00:00:00.001Z';
   await save.click();const conflict=page.getByTestId('course-note-conflict');await conflict.waitFor();
   assert((await conflict.innerText()).includes('Inna wersja z drugiego okna.'));assert.equal(state.writes.length,0);assert.equal(await note.inputValue(),original);
   await page.getByRole('button',{name:'Porównałem — zachowaj mój szkic',exact:true}).click();
   await save.click();await saved(page);assert.equal(state.row.notes.byLesson[0],original);
  });
  await scenario(width,'keep account version',{},async({page,state,note,save})=>{
   await note.fill(original);state.row.notes.byLesson[0]='Wersja z konta do zachowania.';state.row.updated_at='2026-11-28T00:00:00.001Z';
   await save.click();await page.getByTestId('course-note-conflict').waitFor();
   await page.getByRole('button',{name:'Wczytaj wersję z konta',exact:true}).click();
   assert.equal(await note.inputValue(),'Wersja z konta do zachowania.');assert.equal(state.writes.length,0);
   await page.reload();await enterLesson(page);assert.equal(await note.inputValue(),'Wersja z konta do zachowania.');
  });
  await scenario(width,'different lesson from another device',{},async({page,state,note,save})=>{
   await note.fill(original);state.row.notes.byLesson[1]='Inna lekcja z drugiego urządzenia.';state.row.updated_at='2026-11-28T00:00:00.001Z';
   await save.click();await saved(page);assert.equal(state.row.notes.byLesson[0],original);assert.equal(state.row.notes.byLesson[1],'Inna lekcja z drugiego urządzenia.');
  });
  await scenario(width,'lost response after committed write',{},async({page,state,note,save})=>{
   await note.fill(original);state.loseResponse=true;await save.click();
   await page.getByTestId('course-note-status').filter({hasText:'Zapis notatki nie powiódł się'}).waitFor();
   state.loseResponse=false;await page.reload();await enterLesson(page);
   assert.equal(await note.inputValue(),original);assert.equal(state.applied,1);assert.equal(await page.getByTestId('course-note-conflict').count(),0);
   state.row.notes.byLesson[0]='Nowsza wersja po rozpoznanym zapisie.';state.row.updated_at=new Date(Date.parse(state.row.updated_at)+1).toISOString();
   await page.reload();await enterLesson(page);assert.equal(await note.inputValue(),'Nowsza wersja po rozpoznanym zapisie.');
  });
  await scenario(width,'unavailable device storage',{storageFailure:true},async({page,state,note,save})=>{
   await note.fill(original);await page.getByTestId('course-note-status').filter({hasText:'Nie udało się zachować szkicu'}).waitFor();
   await save.click();await saved(page);assert.equal(state.row.notes.byLesson[0],original);
   await page.getByTestId('course-note-status').filter({hasText:'Wyświetlona wersja pochodzi z konta.'}).waitFor();
  });
  await scenario(width,'learner and course isolation',{},async({page,state,note})=>{
   await note.fill(original);await cached(page);
   state.user=other;await page.evaluate(()=>sessionStorage.setItem('notes-fixture-user','other'));await page.reload();await enterLesson(page);
   assert.equal(await note.inputValue(),'');
   state.user=user;await page.evaluate(()=>sessionStorage.removeItem('notes-fixture-user'));await page.reload();await enterLesson(page);assert.equal(await note.inputValue(),original);
   state.course='sap-tm-transport';await page.goto(origin+'/nauka?course='+state.course+'&lesson=1');await enterLesson(page);assert.equal(await note.inputValue(),'');
   state.course=standard;await page.goto(origin+'/nauka?course='+state.course+'&lesson=1');await enterLesson(page);assert.equal(await note.inputValue(),original);
  });
  await scenario(width,'Norwegian notebook',{course:'norweski-na-budowie'},race);
  await scenario(width,'pastry notebook',{course:'lepszy-cukiernik'},race);
  await scenario(width,'conditional write race',{},async({page,state,note,save})=>{
   await note.fill(original);state.compete=true;await save.click();await saved(page);
   assert.equal(state.misses,1);assert.equal(state.applied,1);assert.equal(state.row.notes.byLesson[0],original);assert.equal(state.row.notes.byLesson[1],'Nowsza notatka w drugiej lekcji.');
  });
  await scenario(width,'temporary read failure after refresh',{},async({page,state,note})=>{
   await note.fill(original);await cached(page);state.readFail=true;await page.reload();
   await page.getByText('Nie udało się odczytać próbnej notatki.',{exact:true}).waitFor();assert.equal(state.writes.length,0);
   state.readFail=false;await page.reload();await enterLesson(page);assert.equal(await note.inputValue(),original);assert.equal(state.writes.length,0);
  });
  console.log(engine+' '+width+'px: 14 note recovery and concurrent-save scenarios passed with a synthetic API');
 }
 console.log(JSON.stringify({engine,checks,real_accounts:false,real_progress:false,physical_device:false}));
}finally{await browser.close();}
