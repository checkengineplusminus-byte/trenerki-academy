import assert from 'node:assert/strict';
const {chromium}=await import(process.env.TRENERKI_PLAYWRIGHT_MODULE||'playwright');
const origin=new URL(process.argv[2]||'http://127.0.0.1:8787').origin;
const project='https://kcvvixcjuwglfvdpypzs.supabase.co';
const user={id:'00000000-0000-4000-a000-000000000001',email:'manager@example.test',email_confirmed_at:'2026-11-11T00:00:00Z',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{}};
const ids=['00000000-0000-4000-a000-000000000011','00000000-0000-4000-a000-000000000012'];
const titles=['Kurs próbny A','Kurs próbny B'];
const emails=[],attempts=[];
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage();
 await page.addInitScript(({user})=>localStorage.setItem('sb-kcvvixcjuwglfvdpypzs-auth-token',JSON.stringify({access_token:'test-token',refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user})),{user});
 await page.route(origin+'/firma',async route=>route.fulfill({response:await route.fetch({url:origin+'/firma.html'})}));
 await page.route(url=>url.origin===project,async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'apikey,authorization,content-type,x-client-info','access-control-allow-methods':'GET,POST,OPTIONS'};
  const json=(x,status=200)=>route.fulfill({status,headers,contentType:'application/json',body:JSON.stringify(x)});
  if(req.method()==='OPTIONS')return route.fulfill({headers,status:204});
  if(path==='/auth/v1/user')return json(user);
  if(path!=='/functions/v1/ta-company')return json({ok:true});
  const p=req.postDataJSON();
  if(p.action==='dashboard'){
   return json({ok:true,authorized:true,seats:ids.map((id,i)=>({id,bundle_id:'test-bundle',course_slug:'test-'+i,title_pl:titles[i],
    state:emails[i]?'assigned':'available',assigned_email:emails[i]||null,email_sent_at:emails[i]?'2026-11-11':null,redeemed:false}))});
  }
  assert.equal(p.action,'assign');
  const index=ids.indexOf(p.seat_id);
  attempts.push(index);
  if(index===1&&attempts.filter(i=>i===1).length===1)return json({error:'assignment_unavailable'},503);
  if(emails[index])return json({error:'already_assigned'},409);
  emails[index]=p.employee_email;
  return json({ok:true,title_pl:titles[index],recipient:p.employee_email,link:origin+'/prezent?code=test-'+index,email_sent:true});
 });
 await page.goto(origin+'/firma');
 await page.getByRole('textbox',{name:'E-mail pracownika'}).fill('employee@example.test');
 for(const title of titles)await page.getByRole('checkbox',{name:title}).click();
 await page.getByRole('button',{name:'Przydziel 2 kursy'}).click();
 await page.getByText('Nie wszystkie kursy udało się przydzielić. Sprawdź listę.').waitFor();
 await page.getByText('Nowe zaproszenia').waitFor();
 assert.deepEqual(attempts,[0,1]);
 await page.getByRole('button',{name:'Przydziel 1 kurs'}).click();
 await page.getByText('Wszystkie dostępne kursy zostały już przydzielone.').waitFor({timeout:5000});
 assert.deepEqual(attempts,[0,1,1]);
 assert.deepEqual(emails,['employee@example.test','employee@example.test']);
 console.log('Partial assignment retry passed without assigning a seat twice.');
} finally {
 await browser.close();
}
