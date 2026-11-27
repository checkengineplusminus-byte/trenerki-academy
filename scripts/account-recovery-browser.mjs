// Runs the actual Auth client and rendered UI against an intercepted synthetic API.
// No real account, password, email, payment or learner record is touched.
import assert from 'node:assert/strict';
import {chromium,firefox,webkit} from 'playwright';
const origin=new URL(process.argv[2]||'http://127.0.0.1:8787').origin;
assert.match(origin,/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/);
const engine=process.env.TRENERKI_TEST_ENGINE||'chromium';
assert(['chromium','firefox','webkit'].includes(engine));
const executablePath=process.env.TRENERKI_TEST_EXECUTABLE;
const browser=await({chromium,firefox,webkit})[engine].launch(executablePath?{executablePath}:{});
const api='https://kcvvixcjuwglfvdpypzs.supabase.co';
const expired='#error=access_denied&error_code=otp_expired&error_description=provider-private-description';
const payload=Buffer.from(JSON.stringify({aud:'authenticated',sub:'00000000-0000-4000-a000-000000000202',exp:Math.floor(Date.now()/1000)+3600,iat:Math.floor(Date.now()/1000)})).toString('base64url');
const token=Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')+'.'+payload+'.synthetic-signature';
const recovery='#access_token='+token+'&refresh_token=synthetic-refresh&expires_in=3600&token_type=bearer&type=recovery';
async function setup(width,{path='/konto',hash='',signed=false,readNetworkFailure=false,readInvalidToken=false}={}){
 const context=await browser.newContext({viewport:{width,height:960},serviceWorkers:'block'});
 const user={id:'00000000-0000-4000-a000-000000000202',email:'learner@example.test',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};
 const session={access_token:token,refresh_token:'synthetic-refresh',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
 if(signed)await context.addInitScript(session=>localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify(session)),session);
 const state={readNetworkFailure,readInvalidToken,signed:signed||hash===recovery,updateError:'',logoutError:false,updates:[],logouts:[],recoveries:[],resends:[],userReads:[],outside:[]};
 let page;
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin===origin){
   if(request.isNavigationRequest()&&['/konto','/'].includes(url.pathname))
    return route.fulfill({response:await route.fetch({url:origin+(url.pathname==='/'?'/index':url.pathname)+'.html'+url.search})});
   return route.continue();
  }
  if(url.origin!==api){state.outside.push(url.origin);return route.abort();}
  const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'};
  const reply=(json,status=200)=>route.fulfill({json,status,headers});
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
  if(url.pathname==='/auth/v1/user'){
   if(request.method()==='PUT'){
    state.updates.push(request.postDataJSON());
    await new Promise(resolve=>setTimeout(resolve,150));
    if(state.updateError==='network')return route.abort('failed');
    if(state.updateError)return reply({code:state.updateError,msg:'Synthetic update failure'},state.updateError==='session_not_found'?401:400);
    return reply(user);
   }
   state.userReads.push(new URL(page.url()).pathname);
   if(state.readNetworkFailure){state.readNetworkFailure=false;return route.abort('failed');}
   if(state.readInvalidToken)return reply({code:'bad_jwt',msg:'Synthetic expired access token'},401);
   return state.signed?reply(user):reply({code:'session_not_found',msg:'Auth session missing!'},401);
  }
  if(url.pathname==='/auth/v1/logout'){
   state.logouts.push(url.searchParams.get('scope'));
   if(state.logoutError)return reply({code:'unexpected_failure',msg:'Synthetic logout failure'},500);
   state.signed=false;return reply({});
  }
  if(url.pathname==='/auth/v1/recover'){
   state.recoveries.push(request.postDataJSON());return reply({});
  }
  if(url.pathname==='/auth/v1/resend'){
   state.resends.push(request.postDataJSON());return reply({});
  }
  if(url.pathname.endsWith('/ta-academy'))return reply({is_admin:false});
  return reply([]);
 });
 page=await context.newPage();page.setDefaultTimeout(12000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin+path+hash);
 if(path==='/'&&!hash)await page.waitForURL(url=>url.pathname==='/academy/index.html');
 else if(!signed)await page.getByLabel(hash===recovery&&!readNetworkFailure&&!readInvalidToken?'Nowe hasło':'Adres e-mail',{exact:true}).waitFor();
 else await page.getByText('Twój profil',{exact:true}).waitFor();
 const consent=page.getByRole('button',{name:'Odrzuć',exact:true});
 await consent.waitFor();await consent.click();
 return {context,page,state,errors};
}
let checks=0;
async function scenario(width,options,run){
 const fixture=await setup(width,options);
 try{await run(fixture);assert.deepEqual(fixture.errors,[]);assert(await fixture.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3));checks++;}
 catch(error){console.error(await fixture.page.locator('body').innerText());throw error;}
 finally{await fixture.context.close();}
}
async function passwords(page,password='a-new-synthetic-password',confirm=password){
 await page.getByLabel('Nowe hasło',{exact:true}).fill(password);
 await page.getByLabel('Powtórz nowe hasło',{exact:true}).fill(confirm);
}
try{
 const widths=process.env.TRENERKI_TEST_WIDTHS?process.env.TRENERKI_TEST_WIDTHS.split(',').map(Number):[360,768,1440];
 for(const width of widths){
  await scenario(width,{hash:expired},async({page,state})=>{
   await page.getByTestId('account-feedback').filter({hasText:'Link wygasł lub został już użyty.'}).waitFor();
   await page.waitForURL(url=>!url.hash);
   assert.equal((await page.locator('body').innerText()).includes('provider-private-description'),false);
   await page.getByLabel('Adres e-mail',{exact:true}).fill(' Learner@Example.test ');
   await page.getByRole('button',{name:'Wyślij ponownie potwierdzenie e-mail',exact:true}).click();
   await page.getByTestId('account-feedback').filter({hasText:'wysłaliśmy nowy link'}).waitFor();
   assert.equal(state.resends.length,1);assert.equal(state.resends[0].email,'learner@example.test');
  });
  await scenario(width,{hash:expired+'&type=recovery'},async({page,state})=>{
   await page.getByText('Odzyskaj konto',{exact:true}).waitFor();
   assert.equal(await page.getByLabel('Nowe hasło',{exact:true}).count(),0);
   await page.getByLabel('Adres e-mail',{exact:true}).fill('learner@example.test');
   await page.getByRole('button',{name:'Wyślij link',exact:true}).click();
   await page.getByTestId('account-feedback').filter({hasText:'Sprawdź pocztę e-mail'}).waitFor();
   assert.equal(state.recoveries.length,1);assert.equal(state.updates.length,0);
   await page.getByRole('button',{name:'Wróć do logowania',exact:true}).click();
   await page.getByText('Witaj ponownie!',{exact:true}).waitFor();
   assert.equal(await page.getByLabel('Adres e-mail',{exact:true}).inputValue(),'learner@example.test');
  });
  await scenario(width,{path:'/',hash:'?course=excel-skroty'+expired},async({page})=>{
   await page.getByTestId('account-feedback').filter({hasText:'Link wygasł'}).waitFor();
   const url=new URL(page.url());assert.equal(url.pathname,'/konto');assert.equal(url.searchParams.get('course'),'excel-skroty');
  });
  await scenario(width,{hash:'#error=access_denied&error_code=unknown&error_description=%3Cimg+src%3Dx+onerror%3Dalert(1)%3E'},async({page})=>{
   await page.getByTestId('account-feedback').filter({hasText:'Nie udało się potwierdzić linku'}).waitFor();
   assert.equal((await page.locator('body').innerText()).includes('onerror'),false);
  });
  await scenario(width,{hash:recovery},async({page,state})=>{
   const save=page.getByRole('button',{name:'Zmień hasło',exact:true}),feedback=page.getByTestId('account-feedback');
   await passwords(page,'short');await save.click();
   await feedback.filter({hasText:'co najmniej 8 znaków'}).waitFor();assert.equal(state.updates.length,0);
   await passwords(page,'a-new-synthetic-password','different-password');await save.click();
   await feedback.filter({hasText:'Podane hasła różnią się.'}).waitFor();assert.equal(state.updates.length,0);
   state.updateError='same_password';await passwords(page);await save.click();
   await feedback.filter({hasText:'Nowe hasło musi różnić się od poprzedniego.'}).waitFor();
   state.updateError='network';await save.click();
   await feedback.filter({hasText:'Sprawdź internet i spróbuj ponownie.'}).waitFor();
   assert.equal(await page.getByLabel('Nowe hasło',{exact:true}).inputValue(),'a-new-synthetic-password');
   assert.equal(await page.getByLabel('Powtórz nowe hasło',{exact:true}).inputValue(),'a-new-synthetic-password');
   state.updateError='';const before=state.updates.length;await save.click({clickCount:2});
   await feedback.filter({hasText:'Hasło zostało zmienione. Zaloguj się teraz nowym hasłem.'}).waitFor();
   assert.equal(state.updates.length,before+1);assert.equal(state.logouts.length,1);
   assert(await page.getByRole('button',{name:'Zaloguj się',exact:true}).isVisible());
   assert.equal(await page.getByLabel('Hasło',{exact:true}).inputValue(),'');
  });
  await scenario(width,{path:'/',hash:recovery},async({page,state})=>{
   await page.getByTestId('account-feedback').filter({hasText:'Link potwierdzony.'}).waitFor();
   await page.waitForURL(url=>!url.hash);
   await page.reload();await page.getByLabel('Nowe hasło',{exact:true}).waitFor();
   assert.equal(new URL(page.url()).pathname,'/konto');
   assert(state.userReads.length>0);assert(state.userReads.every(path=>path==='/konto'),'Root must not consume the callback before forwarding it');
   await page.getByRole('button',{name:'Wróć do profilu',exact:true}).click();
   await page.getByText('Twój profil',{exact:true}).waitFor();
   assert.equal(state.updates.length,0);
   await page.reload();await page.getByText('Twój profil',{exact:true}).waitFor();
  });
  await scenario(width,{hash:recovery},async({page,state})=>{
   state.updateError='session_not_found';await passwords(page);
   await page.getByRole('button',{name:'Zmień hasło',exact:true}).click();
   await page.getByTestId('account-feedback').filter({hasText:'Sesja zmiany hasła wygasła.'}).waitFor();
   await page.getByText('Odzyskaj konto',{exact:true}).waitFor();
   assert.equal(await page.getByLabel('Nowe hasło',{exact:true}).count(),0);
   await page.getByLabel('Adres e-mail',{exact:true}).fill('learner@example.test');
   await page.getByRole('button',{name:'Wyślij link',exact:true}).click();
   await page.getByTestId('account-feedback').filter({hasText:'Sprawdź pocztę e-mail'}).waitFor();
   assert.equal(state.recoveries.length,1);
  });
  await scenario(width,{hash:recovery},async({page,state})=>{
   state.logoutError=true;await passwords(page);
   await page.getByRole('button',{name:'Zmień hasło',exact:true}).click();
   await page.getByTestId('account-feedback').filter({hasText:'Hasło zostało zmienione. Nie udało się zakończyć sesji.'}).waitFor();
   await page.getByText('Twój profil',{exact:true}).waitFor();assert.equal(state.updates.length,1);
   state.logoutError=false;await page.getByRole('button',{name:'Wyloguj się',exact:true}).click();
   await page.getByText('Witaj ponownie!',{exact:true}).waitFor();
   assert.equal(state.updates.length,1);assert.equal(state.logouts.length,2);
  });
  await scenario(width,{},async({page,state})=>{
   await page.getByRole('button',{name:'Nie pamiętam hasła',exact:true}).click();
   await page.getByText(/Wpisz adres e-mail użyty przy zakładaniu konta/).waitFor();
   await page.getByRole('button',{name:'Wróć do logowania',exact:true}).click();
   await page.getByText('Witaj ponownie!',{exact:true}).waitFor();assert.equal(state.recoveries.length,0);
  });
  await scenario(width,{hash:'#type=recovery'},async({page,state})=>{
   await page.getByText('Witaj ponownie!',{exact:true}).waitFor();
   assert.equal(await page.getByLabel('Nowe hasło',{exact:true}).count(),0);assert.equal(state.updates.length,0);
  });
  await scenario(width,{hash:recovery,readNetworkFailure:true},async({page,state})=>{
   await page.getByTestId('account-feedback').filter({hasText:'problem z połączeniem'}).waitFor();
   assert.equal(await page.getByLabel('Nowe hasło',{exact:true}).count(),0);
   await page.getByRole('button',{name:'Sprawdź link ponownie',exact:true}).click();
   await page.getByLabel('Nowe hasło',{exact:true}).waitFor();assert.equal(state.updates.length,0);
  });
  await scenario(width,{hash:recovery,readInvalidToken:true},async({page,state})=>{
   await page.getByText('Odzyskaj konto',{exact:true}).waitFor();
   await page.getByTestId('account-feedback').filter({hasText:'Nie udało się potwierdzić linku'}).waitFor();
   await page.waitForURL(url=>!url.hash);
   assert.equal(await page.getByLabel('Nowe hasło',{exact:true}).count(),0);assert.equal(state.updates.length,0);
  });
  await scenario(width,{signed:true},async({page,state})=>{
   await page.getByText('Zmień hasło bez ponownego logowania',{exact:true}).click();
   await page.getByLabel('Nowe hasło',{exact:true}).waitFor();
   await page.getByRole('button',{name:'Wróć do profilu',exact:true}).click();
   await page.getByText('Twój profil',{exact:true}).waitFor();assert.equal(state.updates.length,0);
  });
  await scenario(width,{path:'/'},async({page})=>{assert.equal(new URL(page.url()).pathname,'/academy/index.html');});
  console.log(engine+' '+width+'px: 14 recovery scenarios passed with a synthetic API');
 }
 console.log(JSON.stringify({engine,checks,real_accounts:false,real_password_changes:false,email_delivery:false,physical_device:false}));
}finally{await browser.close();}
