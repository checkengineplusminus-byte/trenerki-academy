import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const origin=new URL(process.argv[2]||'http://127.0.0.1:8787').origin;
assert.match(origin,/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/);
const user={id:'00000000-0000-4000-a000-000000000181',email:'exam@example.test',
 aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{full_name:'Test Techniczny'}};
const topics=Array.from({length:100},(_,n)=>({topic_no:n+1,section_no:Math.floor(n/10)+1,
 topic_in_section:n%10+1,title_pl:'Fikcyjny temat '+(n+1),status:'complete',lesson_no:null}));
const browser=await chromium.launch();
try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
  await context.addInitScript(user=>localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify({
   user,access_token:'synthetic-local-token',refresh_token:'synthetic-local-refresh',
   token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600
  })),user);
  let ready=false,step=0,awards=0,certificate=null;
  const question=()=>({id:'synthetic-attempt',step,phase:step>=6?'final':'practice',
   question:'Fikcyjna decyzja egzaminacyjna '+step,correct:step-1,wrong:0,history:[],
   holder_name:'Test Techniczny',grading_mode:'choice',options:['Pierwsza','Druga','Trzecia']});
  await context.route('**/*',async route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin===origin){
    if(request.isNavigationRequest()&&url.pathname==='/program-ksiegowosci')
     return route.fulfill({response:await route.fetch({url:origin+'/program-ksiegowosci.html'})});
    return route.continue();
   }
   if(url.hostname!=='kcvvixcjuwglfvdpypzs.supabase.co')return route.abort();
   const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'*'};
   const reply=(data,status=200)=>route.fulfill({json:data,headers,status});
   if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
   const table=url.pathname.split('/').at(-1);
   if(table==='user')return reply(user);
   if(table==='ta-accounting')return reply({});
   if(table==='ta-academy')return reply({is_admin:false});
   if(table==='ta_accounting_overview')return reply({is_editor:false,active_program:{topics:100,authored_topics:100}});
   if(table==='ta_accounting_core_topics_v3')return reply(topics);
   if(table==='ta_accounting_core_materials_v3')return reply(topics.map(row=>({topic_no:row.topic_no,editorial_status:'review_needed',material:{exercises:[]}})));
   if(table==='ta-exam'){
    const input=request.postDataJSON();
    if(certificate)return reply({ok:true,state:'passed',certificate});
    if(input.action==='status')return reply(ready?
     {ok:true,state:step?'in_progress':'ready',available:true,...(step?{session:question()}:{})}:
     {ok:true,state:'not_ready',completed:0,total:100,month_complete:false,available:false,is_demo:true});
    if(input.action==='start'){step=1;return reply({ok:true,state:'in_progress',available:true,session:question()});}
    if(input.action==='answer'){
     assert.equal(input.selected_index,1);
     if(step===6){
      awards++;certificate={id:'synthetic-certificate',certificate_no:'QA-SAMPLE',holder_name:'Test Techniczny',
       title_pl:'Księgowość od podstaw',issued_at:'2026-11-27T10:00:00Z',is_demo:true};
      return reply({ok:true,state:'passed',answer_correct:true,certificate});
     }
     step++;const q=question();return reply({ok:true,state:'in_progress',answer_correct:true,
      session_id:q.id,...q,grading_mode:'choice',feedback:'Fikcyjne wyjaśnienie odpowiedzi.'});
    }
   }
   return reply([]);
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/program-ksiegowosci');
  await page.getByRole('button',{name:'Odrzuć',exact:true}).click();
  await page.getByText('Ukończone tematy: 0/100.',{exact:true}).waitFor();
  await page.getByText('W obecnym wydaniu po zaliczeniu powstaje dokument oznaczony jako wzór testowy.',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Rozpocznij egzamin',exact:true}).count(),0);
  await page.getByText('Miesiąc w biurze: do dokończenia.',{exact:true}).waitFor();
  ready=true;
  await page.getByRole('button',{name:'Sprawdź ponownie gotowość',exact:true}).click();
  await page.getByLabel('Imię i nazwisko na dyplomie').fill('Test Techniczny');
  await page.getByRole('button',{name:'Rozpocznij egzamin',exact:true}).click();
  for(let n=1;n<=6;n++){
   await page.getByText('Fikcyjna decyzja egzaminacyjna '+n,{exact:true}).waitFor();
   await page.getByRole('button',{name:'B. Druga',exact:true}).click();
   await page.getByRole('button',{name:'Zatwierdź odpowiedź',exact:true}).click();
  }
  await page.getByRole('button',{name:'Zobacz dokument próbny',exact:true}).waitFor();
  await page.reload();
  await page.getByRole('button',{name:'Zobacz dokument próbny',exact:true}).waitFor();
  assert.equal(awards,1,'Reload must show the existing result');
  assert.deepEqual(errors,[]);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3));
  console.log(width+'px: prerequisites, exam, six answers, sample diploma and reload passed with a synthetic API');
  await context.close();
 }
}finally{await browser.close();}
