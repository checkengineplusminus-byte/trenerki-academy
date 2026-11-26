import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const origin=new URL(process.argv[2]||'http://127.0.0.1:8787').origin;
const fixture=process.argv[3]?JSON.parse(await readFile(process.argv[3],'utf8')):[{
 title:'Próba zmiany',prompt:'Jak zmieni się liczba?',signals:[{label:'Stan',before:'1',after:'2'}],
 answers:[{label:'Wzrośnie',feedback:'Drugi stan ma wartość 2.',correct:true},{label:'Zmaleje',feedback:'Porównaj 1 i 2.',correct:false}],
 explanation:'Początkowy stan można odtworzyć.',
 drawing:{
  before:{description:'Przed zmianą: jeden punkt',strokes:[{path:'M10 10 h1'}],labels:[]},
  after:{description:'Po zmianie: dwa punkty',strokes:[{path:'M10 10 h1 M20 10 h1'}],labels:[]}
 }
}];
const visual={kind:'flow',title:'Przebieg próbki',entries:[
 {label:'Zmierz',detail:'Zapisz wynik początkowy.'},
 {label:'Zmień',detail:'Zmień jedną wartość.'},
 {label:'Sprawdź',detail:'Porównaj oba wyniki.'}
]};
const learningRows=fixture.map((experiment,lesson_no)=>({lesson_no,title_pl:'Próba '+(lesson_no+1),material:{experiment,raw:['Ćwiczenie testowe']}}));
learningRows.push({lesson_no:learningRows.length,title_pl:'Porównanie próbek',material:{practice:{visual},curiosity:'Warto wiedzieć przy temacie „Porównanie próbek”: Wskazówka dla próby.'}});
const user={id:'00000000-0000-4000-a000-000000000131',email:'review@example.test',role:'authenticated',aud:'authenticated',app_metadata:{},user_metadata:{}};
const browser=await chromium.launch();
try{
 for(const width of [360,390,640,680,820,1024,1100,1280,1600,1920]){
  const reduced=width===390;
  const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:reduced?'reduce':'no-preference',serviceWorkers:'block'});
  await ctx.addInitScript(user=>localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify({user,access_token:'test-only',refresh_token:'test-only',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer'})),user);
  let writes=0;
  await ctx.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.hostname==='kcvvixcjuwglfvdpypzs.supabase.co'){
    const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':req.headers()['access-control-request-headers']||'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
    if(req.method()==='OPTIONS')return route.fulfill({headers,status:204});
    const table=url.pathname.split('/').at(-1);
    if(req.method()!=='GET'&&(['ta_learning_attempts','ta_learning_progress'].includes(table)||table==='ta-exam'&&req.postDataJSON()?.action!=='status'||table==='ta-lesson-guide'&&req.postDataJSON()?.action==='attempt'))writes++;
    const values={user,ta_enrollments:[{id:'test'}],ta_courses:{title_pl:'Próba',description_pl:''},ta_drafts:null,ta_lessons:learningRows,ta_learning_progress:learningRows.map(({lesson_no})=>({lesson_no})),'ta-academy':{ok:true,is_admin:false}};
    return route.fulfill({headers,contentType:'application/json',body:JSON.stringify(values[table]??[])});
   }
   if(url.origin!==origin)return route.abort();
   if(req.isNavigationRequest()&&url.pathname==='/nauka'&&url.hostname==='127.0.0.1')return route.fulfill({response:await route.fetch({url:origin+'/nauka.html'})});
   return route.continue();
  });
  const page=await ctx.newPage();
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  const cases=[390,1280].includes(width)?fixture.map((_,i)=>i):[0];
  for(const i of cases){
   await page.goto(origin+'/nauka?course=excel-skroty&lesson='+(i+1));
   const box=page.getByTestId('lesson-experiment');
   const data=fixture[i];
   await box.getByText(data.title,{exact:true}).waitFor();
   if(data.drawing)await box.getByRole('img',{name:data.drawing.before.description,exact:true}).waitFor();
   const changed=data.signals.find(x=>x.before!==x.after);
   assert.ok(changed);
   for(const correct of [false,true]){
    const a=data.answers.find(x=>x.correct===correct);
    await box.getByRole('button',{name:a.label,exact:true}).click();
    await box.getByText((correct?'Trafione. ':'Sprawdź różnicę. ')+a.feedback,{exact:true}).waitFor();
    if(data.drawing)await box.getByRole('img',{name:data.drawing.after.description,exact:true}).waitFor();
   }
   const changedCell=box.getByTestId('experiment-changed-value').first();
   if(reduced)assert.equal(await changedCell.evaluate(el=>getComputedStyle(el).animationName),'none');
   if(!reduced)assert.equal(await changedCell.evaluate(el=>getComputedStyle(el).animationName),'lesson-value-change');
   await box.getByRole('button',{name:'Pokaż stan początkowy'}).press('Enter');
   assert.equal(await box.getByTestId('experiment-changed-value').count(),0);
   if(data.drawing)await box.getByRole('img',{name:data.drawing.before.description,exact:true}).waitFor();
   await box.getByRole('button',{name:'Powtórz zmianę'}).click();
   assert.ok(await box.getByTestId('experiment-changed-value').count()>0);
   assert.ok(await box.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'overflow '+width);
  }
  await page.goto(origin+'/nauka?course=excel-skroty&lesson='+learningRows.length);
  const guide=page.getByTestId('lesson-visual');
  await guide.getByText(visual.title,{exact:true}).waitFor();
  await page.getByText('Wskazówka dla próby.',{exact:true}).waitFor();
  const cards=await guide.getByTestId('lesson-visual-entry').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().top));
  if(width>=1100)assert.equal(new Set(cards).size,1,'horizontal desktop guide');
  if(width<680)assert.equal(new Set(cards).size,3,'vertical mobile guide');
  await guide.getByRole('button',{name:'Przejdź krok po kroku'}).press('Enter');
  for(let i=0;i<visual.entries.length;i++){
   if(i)await guide.getByRole('button',{name:'Następny krok'}).press('Enter');
   const panel=guide.getByTestId('lesson-visual-current');
   await panel.getByText(visual.entries[i].detail,{exact:true}).waitFor();
   if(reduced)assert.equal(await panel.evaluate(el=>getComputedStyle(el).animationName),'none');
  }
  await guide.getByRole('button',{name:'Poprzedni krok'}).click();
  await guide.getByTestId('lesson-visual-current').getByText(visual.entries[1].detail).waitFor();
  await guide.getByRole('button',{name:'Pokaż cały schemat'}).press('Enter');
  assert.equal(await guide.getByTestId('lesson-visual-current').count(),0);
  assert.equal(await guide.getByRole('button',{name:'Przejdź krok po kroku'}).count(),1);
  assert.equal(writes,0,'an optional illustration must not record a real checkpoint');
  assert.deepEqual(errors,[]);
  console.log(width+' px: '+cases.length+' experiences checked');
  await ctx.close();
 }
}finally{await browser.close();}
