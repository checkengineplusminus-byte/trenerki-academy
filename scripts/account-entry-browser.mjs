// Real rendered forms with a fully intercepted, synthetic Auth/REST API.
// This test never creates accounts, sends email, changes real passwords or pays.
import assert from 'node:assert/strict';
import {chromium,firefox,webkit} from 'playwright';
const origin=new URL(process.argv[2]||'http://127.0.0.1:8787').origin;
assert.match(origin,/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/);
const engine=process.env.TRENERKI_TEST_ENGINE||'chromium';
assert(['chromium','firefox','webkit'].includes(engine));
const executablePath=process.env.TRENERKI_TEST_EXECUTABLE||(engine==='webkit'?process.env.TRENERKI_WEBKIT_EXECUTABLE:undefined);
const browser=await({chromium,firefox,webkit})[engine].launch(executablePath?{executablePath}:{});
const api='https://kcvvixcjuwglfvdpypzs.supabase.co';
async function setup(width,metadata=null){
 const context=await browser.newContext({viewport:{width,height:960},serviceWorkers:'block'});
 await context.addInitScript(()=>{const now=Date.now;window.__accountTimeOffset=0;Date.now=()=>now()+window.__accountTimeOffset;});
 const user={id:'00000000-0000-4000-a000-000000000201',email:'learner@example.test',
  aud:'authenticated',role:'authenticated',email_confirmed_at:'2026-11-27T10:00:00Z',
  app_metadata:{},user_metadata:metadata||{}};
 const session={access_token:'synthetic-access-token',refresh_token:'synthetic-refresh-token',
  expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
 const state={signed:!!metadata,result:'invalid_credentials',signins:[],signups:[],resends:[],recoveries:[],updates:[]};
 if(metadata)await context.addInitScript(session=>localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify(session)),session);
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin===origin){
   if(request.isNavigationRequest()&&['/konto','/kup','/moje-kursy'].includes(url.pathname))
    return route.fulfill({response:await route.fetch({url:origin+url.pathname+'.html'})});
   return route.continue();
  }
  if(url.origin!==api)return route.abort();
  const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'};
  const reply=(json,status=200)=>route.fulfill({json,status,headers});
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
  if(url.pathname==='/auth/v1/token'){
   state.signins.push(request.postDataJSON());
   await new Promise(resolve=>setTimeout(resolve,150));
   if(state.result==='success'){state.signed=true;return reply(session);}
   return reply({error_code:state.result,msg:state.result==='invalid_credentials'?'Invalid login credentials':'Email not confirmed'},400);
  }
  if(url.pathname==='/auth/v1/signup'){
   state.signups.push(request.postDataJSON());
   return reply({...user,email_confirmed_at:null,identities:[{id:'synthetic-identity'}]});
  }
  if(url.pathname==='/auth/v1/resend'){state.resends.push(request.postDataJSON());return reply({});}
  if(url.pathname==='/auth/v1/recover'){
   state.recoveries.push({body:request.postDataJSON(),redirect:url.searchParams.get('redirect_to')});
   return reply({error_code:'over_email_send_rate_limit',msg:'Email rate limit exceeded'},429);
  }
  if(url.pathname==='/auth/v1/user'){
   if(request.method()==='PUT'){
    const body=request.postDataJSON();state.updates.push(body);
    user.user_metadata={...user.user_metadata,...body.data};return reply(user);
   }
   return state.signed?reply(user):reply({error_code:'session_not_found',msg:'Auth session missing!'},401);
  }
  if(url.pathname.endsWith('/ta_courses'))return reply({slug:'excel-skroty',title_pl:'Excel',price_grosze:0});
  if(url.pathname.endsWith('/ta-academy'))return reply({is_admin:false});
  if(url.pathname.endsWith('/ta-credit'))return reply({ok:true,available_grosze:0});
  return reply([]);
 });
 const page=await context.newPage(),errors=[];page.setDefaultTimeout(12000);
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin+'/konto'+(metadata?'':'?course=excel-skroty&next=kup'));
 await page.getByText(metadata?'Twój profil':'Witaj ponownie!',{exact:true}).waitFor();
 const consent=page.getByRole('button',{name:'Odrzuć',exact:true});
 await consent.waitFor();
 if(await consent.isVisible())await consent.click();
 return {context,page,state,errors};
}
let checks=0;
try{
 const widths=process.env.TRENERKI_TEST_WIDTHS?process.env.TRENERKI_TEST_WIDTHS.split(',').map(Number):[360,768,1440];
 assert(widths.every(width=>[360,768,1440].includes(width)));
 for(const width of widths){
  const {context,page,state,errors}=await setup(width);
  try{
   const feedback=page.getByTestId('account-feedback');
   await page.getByRole('button',{name:'Zaloguj się',exact:true}).click();
   await feedback.filter({hasText:'Wpisz prawidłowy adres e-mail.'}).waitFor();
   assert.equal(state.signins.length,0);checks++;
   await page.getByLabel('Adres e-mail',{exact:true}).fill(' Learner@Example.test ');
   await page.getByRole('button',{name:'Zaloguj się',exact:true}).click();
   await feedback.filter({hasText:'Wpisz hasło do swojego konta.'}).waitFor();checks++;
   await page.getByLabel('Hasło',{exact:true}).fill('wrong-password');
   await page.getByLabel('Hasło',{exact:true}).press('Enter');
   await feedback.filter({hasText:'Nieprawidłowy e-mail lub hasło.'}).waitFor();
   assert.equal(state.signins.length,1);assert.equal(state.signins[0].email,'learner@example.test');checks++;
   state.result='email_not_confirmed';
   await page.getByRole('button',{name:'Zaloguj się',exact:true}).click({clickCount:2});
   await feedback.filter({hasText:'Potwierdź adres e-mail'}).waitFor();
   assert.equal(state.signins.length,2,'A double click must send a single authentication request');checks++;
   await page.getByRole('button',{name:'Wyślij ponownie potwierdzenie e-mail',exact:true}).click();
   await feedback.filter({hasText:'wysłaliśmy nowy link'}).waitFor();
   assert.equal(state.resends.length,1);assert.equal(state.resends[0].email,'learner@example.test');
   assert.equal(state.resends[0].type,'signup');
   assert.equal(await page.getByRole('button',{name:/Wyślij ponownie za/}).isEnabled(),false);checks++;
   await page.evaluate(()=>{window.__accountTimeOffset+=61000});
   await page.getByRole('button',{name:'Wyślij ponownie potwierdzenie e-mail',exact:true}).waitFor();checks++;
   await page.getByRole('button',{name:'Utwórz nowe konto',exact:true}).click();
   await page.getByLabel('Imię i nazwisko',{exact:true}).fill('A');
   await page.getByLabel('Hasło (minimum 8 znaków)',{exact:true}).fill('enough-characters');
   await page.getByRole('button',{name:'Załóż konto',exact:true}).click();
   await feedback.filter({hasText:'Wpisz swoje imię i nazwisko.'}).waitFor();assert.equal(state.signups.length,0);checks++;
   await page.getByLabel('Imię i nazwisko',{exact:true}).fill('Próba Techniczna');
   await page.getByLabel('Hasło (minimum 8 znaków)',{exact:true}).fill('short');
   await page.getByRole('button',{name:'Załóż konto',exact:true}).click();
   await feedback.filter({hasText:'Hasło powinno mieć minimum 8 znaków.'}).waitFor();assert.equal(state.signups.length,0);checks++;
   await page.getByLabel('Hasło (minimum 8 znaków)',{exact:true}).fill('enough-characters');
   await page.getByRole('button',{name:'Załóż konto',exact:true}).click();
   await feedback.filter({hasText:'Konto utworzone. Potwierdź e-mail'}).waitFor();
   assert.equal(state.signups.length,1);assert.equal(state.signups[0].email,'learner@example.test');
   assert.equal(state.signups[0].data.pending_course,'excel-skroty');checks++;
   assert.equal(await page.getByRole('button',{name:/Wyślij ponownie za/}).isEnabled(),false);
   await page.evaluate(()=>{window.__accountTimeOffset+=61000});
   await page.getByRole('button',{name:'Wyślij ponownie potwierdzenie e-mail',exact:true}).click();
   await feedback.filter({hasText:'wysłaliśmy nowy link'}).waitFor();assert.equal(state.resends.length,2);checks++;
   await page.getByRole('button',{name:'Mam już konto — zaloguj',exact:true}).click();
   state.result='success';await page.getByLabel('Hasło',{exact:true}).fill('secret');
   await page.getByRole('button',{name:'Zaloguj się',exact:true}).click();
   await page.waitForURL(url=>url.pathname==='/kup'&&url.searchParams.get('course')==='excel-skroty');
   assert.equal(state.signins.at(-1).password,'secret','An existing valid short password must reach Auth');
   assert.deepEqual(errors,[]);checks++;
  }catch(error){console.error(await page.locator('body').innerText());console.error(errors);throw error;}finally{await context.close();}
  const saved=await setup(width,{pending_course:'excel-skroty'});
  try{
   await saved.page.getByText('Otwórz Moje kursy →',{exact:true}).click();
   await saved.page.waitForURL(url=>url.pathname==='/kup'&&url.searchParams.get('course')==='excel-skroty');
   assert.equal(saved.state.updates.length,1);assert.equal(saved.state.updates[0].data.pending_course,null);checks++;
  }finally{await saved.context.close();}
  const reset=await setup(width);
  try{
   await reset.page.getByRole('button',{name:'Nie pamiętam hasła',exact:true}).click();
   await reset.page.getByLabel('Adres e-mail',{exact:true}).fill(' Learner@Example.test ');
   await reset.page.getByLabel('Adres e-mail',{exact:true}).press('Enter');
   await reset.page.getByTestId('account-feedback').filter({hasText:'Zbyt wiele prób wysłania wiadomości.'}).waitFor();
   assert.equal(reset.state.recoveries.length,1);assert.equal(reset.state.recoveries[0].body.email,'learner@example.test');
   assert.equal(reset.state.recoveries[0].redirect,'https://trenerki.com/konto');
   assert(await reset.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3));
   assert.deepEqual(reset.errors,[]);checks++;
  }finally{await reset.context.close();}
  console.log(engine+' '+width+'px: 13 account-entry checks passed with a synthetic API');
 }
 console.log(JSON.stringify({engine,checks,real_accounts:false,email_delivery:false,physical_device:false}));
}finally{await browser.close();}
