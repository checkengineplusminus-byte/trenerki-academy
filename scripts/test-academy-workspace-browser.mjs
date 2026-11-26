// Exercise the exported application against an isolated learner at each breakpoint.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const origin=new URL(process.argv[2]||'http://127.0.0.1:8787').origin;
const local=new URL(origin).hostname==='127.0.0.1';
const user={id:'00000000-0000-4000-a000-000000000131',email:'layout@example.test',role:'authenticated',aud:'authenticated',app_metadata:{},user_metadata:{}};
const rows=Array.from({length:7},(_,i)=>({
 course_slug:'layout-'+i,expires_at:'2099-12-31',status:'active',ta_courses:{title_pl:'Kurs testowy '+(i+1)}
}));
const lessons=Array.from({length:30},(_,lesson_no)=>({lesson_no,title_pl:'Temat '+(lesson_no+1),material:{raw:['Przykład ćwiczeniowy']}}));
const browser=await chromium.launch();
try{
 const context=await browser.newContext({serviceWorkers:'block'});
 await context.addInitScript(user=>{
  localStorage.setItem('trenerki_ads_consent_v1','no');
  localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify({
   user,access_token:'test-only',refresh_token:'test-only',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600
  }));
 },user);
 let allowCourse=true,lessonRequests=0;
 await context.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.hostname==='kcvvixcjuwglfvdpypzs.supabase.co'){
   const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':req.headers()['access-control-request-headers']||'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
   const reply=(data)=>route.fulfill({headers,json:data});
   if(req.method()==='OPTIONS')return route.fulfill({headers,status:204});
   const table=url.pathname.split('/').at(-1);
   if(table==='user')return reply(user);
   if(table==='ta_enrollments')return reply(url.searchParams.has('course_slug')?(allowCourse?[{id:'test-only'}]:[]):rows);
   if(table==='ta_lessons'){
    lessonRequests++;
    if(url.searchParams.get('course_slug')?.startsWith('in.')){
     const offset=Number(url.searchParams.get('offset')||0);
     return reply(rows.slice(offset).map(r=>({course_slug:r.course_slug,lesson_no:0})));
    }
    return reply(lessons);
   }
   if(table==='ta_courses')return reply({title_pl:'Kurs testowy',description_pl:''});
   if(table==='ta-academy')return reply({ok:true,is_admin:false});
   if(table==='ta-credit')return reply({ok:true,balance_grosze:0,history:[]});
   return reply([]);
  }
  if(url.origin!==origin)return route.abort();
  if(local&&req.isNavigationRequest()&&['/konto','/moje-kursy','/nauka'].includes(url.pathname)){
   return route.fulfill({response:await route.fetch({url:origin+url.pathname+'.html'})});
  }
  return route.continue();
 });
 const page=await context.newPage();
 page.setDefaultTimeout(12000);
 const errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 const cases=[[360,1],[390,1],[640,1],[680,2],[820,2],[1024,3],[1100,3],[1280,4],[1600,5],[1920,5]];
 async function load(path){
  const response=await page.goto(origin+path,{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200,path);
 }
 for(const [width,columns] of cases){
  const desktop=width>=1024;
  await page.setViewportSize({width,height:900});
  await load('/moje-kursy');
  const grid=page.locator('.academy-card-grid').first();
  await grid.locator(':scope > *').first().waitFor().catch(async error=>{throw new Error(error.message+' '+(await page.locator('body').innerText()).slice(0,1600)+' '+errors.join(' / '))});
  const bounds=await grid.evaluate(el=>({width:el.clientWidth,rects:[...el.children].map(c=>{const r=c.getBoundingClientRect();return [r.x,r.y,r.width]})}));
  assert.equal(bounds.rects.length,columns,'visible course count at '+width);
  assert(bounds.rects.every(([x,y,w],i)=>Math.abs(y-bounds.rects[0][1])<2&&w>100&&(!i||x>bounds.rects[i-1][0])));
  assert(bounds.width>=width-65,'dashboard width at '+width);
  await page.getByRole('button',{name:/Pokaż kolejne/}).click();
  assert.equal(await grid.locator(':scope > *').count(),Math.min(7,columns*2));
  await load('/konto');
  await page.getByText(user.email,{exact:true}).waitFor();
  assert.equal(await page.getByRole('navigation',{name:'Nawigacja akademii'}).count(),desktop?1:0);
  await load('/nauka?course=layout-0');
  await page.getByTestId('course-reading-introduction').waitFor();
  const main=page.getByTestId('course-main-content'),side=page.getByTestId('desktop-course-sidebar');
  const panel=await main.boundingBox();
  if(desktop){
   const rail=await side.boundingBox();assert(rail&&rail.x+rail.width<=panel.x+1);
   assert(rail.width>=230&&panel.width>width*.69);
   assert.equal(await side.getByRole('button').count(),30);
   assert(await side.getByRole('button').nth(1).isDisabled());
   assert(await side.evaluate(el=>el.scrollHeight>el.clientHeight));
  }else{
   assert.equal(await side.count(),0);assert(panel.width>=width-5);
   await page.getByRole('button',{name:/Plan lekcji/}).waitFor();
  }
  assert(await main.evaluate(el=>el.scrollWidth<=el.clientWidth+2),'lesson overflow at '+width);
  console.log(width+'px · '+columns+' course columns · '+(desktop?'split course workspace':'compact lesson plan'));
 }
 allowCourse=false;const before=lessonRequests;
 await load('/nauka?course=layout-0');
 await page.getByRole('alert').filter({hasText:'Nie masz obecnie dostępu'}).waitFor();
 assert.equal(lessonRequests,before,'A missing enrollment must stop the lesson query');
 assert.equal(await page.getByTestId('desktop-course-sidebar').count(),0);
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
