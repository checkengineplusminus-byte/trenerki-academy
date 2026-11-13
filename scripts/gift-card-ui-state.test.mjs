// Runs the actual screen event handlers with isolated hooks and mocked APIs.
// No network, database writes, emails, browser or real vouchers are used.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import ts from 'typescript';
const user={id:'00000000-0000-4000-a000-000000000001',email:'owner@example.test',email_confirmed_at:'2026-11-13T00:00:00Z'};
class FunctionsHttpError extends Error{constructor(code){super(code);this.context={json:async()=>({error:code})};}}
const storage=new Map(),issues=[],resends=[],pdfs=[],redemptions=[],downloads=[],printRequests=[],giveaways=[],assignments=[];
const freeCode='TA-'+'A'.repeat(32),companyCode='TA-'+'B'.repeat(32);
const courses=[{slug:'test-free-course',title_pl:'Kurs testowy',price_grosze:0,category_pl:null}];
let companyAssigned=false;let historyRecords=[];
let firstIssue=true,batch=null,redeemError='wrong_email';
function queryRows(rows){const chain=new Proxy({then:(resolve,reject)=>Promise.resolve({data:rows,error:null}).then(resolve,reject)},{get(target,key){return key==='then'?target.then:()=>chain;}});return chain;}
const supabase={auth:{getUser:async()=>({data:{user},error:null}),signOut:async()=>({})},from:table=>queryRows(table==='ta_courses'?courses:[]),functions:{invoke:async(name,{body})=>{
 if(name==='ta-admin-analytics')return {data:{ok:true,totals:{users:1,purchases:0,gifts:0,revenue_grosze:0}},error:null};
 if(name==='ta-gift-print'){printRequests.push(body);return {data:{ok:true,pdf_base64:Buffer.from('%PDF-1.7\n').toString('base64'),filename:'TRENERKI-kurs-test.pdf'},error:null};}
 if(name==='ta-admin-gifts'){
  giveaways.push(body);
  return {data:{ok:true,email_sent:true,...(body.company_mode?{company_panel:true,dashboard_url:'https://trenerki.com/firma',gifts:[]}:{gifts:[{gift_id:'00000000-0000-4000-a000-000000000002',course_slug:'test-free-course',title_pl:'Kurs testowy',code:freeCode,link:'https://trenerki.com/prezent?code='+freeCode,expires_at:'2036-11-13T00:00:00Z'}]})},error:null};
 }
 if(name==='ta-company'){
  if(body.action==='dashboard')return {data:{ok:true,authorized:true,seats:[{id:'seat-1',bundle_id:'bundle-1',course_slug:'test-free-course',title_pl:'Kurs testowy',state:companyAssigned?'assigned':'available',assigned_email:companyAssigned?'employee@example.test':null,email_sent_at:null,redeemed:false}]},error:null};
  assignments.push(body);companyAssigned=true;
  return {data:{ok:true,title_pl:'Kurs testowy',recipient:body.employee_email,code:companyCode,link:'https://trenerki.com/prezent?code='+companyCode,email_sent:true},error:null};
 }
 assert.equal(name,'ta-credit');
 if(body.action==='admin_list_promo')return {data:{ok:true,batches:batch?[batch]:[]},error:null};
 if(body.action==='admin_issue_promo'){
  issues.push(body);
  if(!batch||batch.id!==body.request_id)batch={id:body.request_id,...body,created_at:'2026-11-13T10:00:00Z',recipient_email_sent_at:null,cards:Array.from({length:body.quantity},(_,i)=>({id:'card-'+i,code:'TW-'+String(i+1).padStart(32,'0'),link:'https://trenerki.com/prezent?code=mock-'+i,amount_grosze:body.amount_grosze,transferable:body.transferable,expires_at:'2036-11-13T10:00:00Z',status:'issued'}))};
  if(firstIssue){firstIssue=false;return {data:null,error:new FunctionsHttpError('temporary_error')};}
  return {data:{ok:true,batch_id:batch.id,recipient_email:batch.recipient_email,quantity:batch.quantity,total_grosze:batch.amount_grosze*batch.quantity,email_sent:!!batch.recipient_email_sent_at,cards:batch.cards},error:null};
 }
 if(body.action==='admin_resend_promo'){resends.push(body);batch.recipient_email_sent_at='2026-11-13T10:01:00Z';return {data:{ok:true,email_sent:true},error:null};}
 if(body.action==='admin_card_pdf'){pdfs.push(body);return {data:{ok:true,pdf_base64:Buffer.from('%PDF-1.7\n').toString('base64'),filename:'TRENERKI-test.pdf'},error:null};}
 if(body.action==='redeem'){redemptions.push(body);return {data:null,error:new FunctionsHttpError(redeemError)};}
 throw new Error('Unexpected action '+body.action);
}}};
function createScreen(path,params={}){
 const hooks=[];let hookIndex=0,dirty=true,effects=[],tree;
 const same=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const react={
  useState(initial){const i=hookIndex++;if(!hooks[i])hooks[i]={value:typeof initial==='function'?initial():initial};return [hooks[i].value,value=>{const next=typeof value==='function'?value(hooks[i].value):value;if(!Object.is(next,hooks[i].value)){hooks[i].value=next;dirty=true;}}];},
  useRef(initial){const i=hookIndex++;if(!hooks[i])hooks[i]={current:initial};return hooks[i];},
  useEffect(fn,deps){const i=hookIndex++;if(!hooks[i]||!same(hooks[i].deps,deps)){hooks[i]={deps};effects.push(fn);}},
  useMemo(fn,deps){const i=hookIndex++;if(!hooks[i]||!same(hooks[i].deps,deps))hooks[i]={deps,value:fn()};return hooks[i].value;},
  createElement(type,props,...children){return {type,props:{...props,children}};},Fragment:'Fragment'
 };
 const rn=Object.fromEntries(['View','Text','TextInput','Pressable','ScrollView','ActivityIndicator'].map(key=>[key,key]));
 Object.assign(rn,{Platform:{OS:'web'},Share:{share:async()=>({})},Linking:{openURL:async()=>{}},useWindowDimensions:()=>({width:1280,height:900})});
 const module={exports:{}};
 const require=name=>{
  if(name==='react')return {__esModule:true,default:react,...react};
  if(name==='react-native')return rn;
  if(name==='expo-router')return {useRouter:()=>({replace:()=>{},push:()=>{}}),useLocalSearchParams:()=>params};
  if(name==='@supabase/supabase-js')return {FunctionsHttpError};
  if(name==='../src/supabase'||name==='./supabase')return {supabase};
  if(name==='../src/academyApi')return {academyAction:async action=>action==='whoami'?{is_admin:true}:action==='create_gift'?{code:freeCode,link:'https://trenerki.com/prezent?code='+freeCode,gift_id:'free-gift-id',email_sent:true}:action==='my_gifts'?{gifts:historyRecords}:{users:[],counts:{users:1,courses:1}}};
  if(name==='../src/giftPdf'){
   const helperModule={exports:{}};
   const helper=ts.transpileModule(readFileSync('src/giftPdf.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
   vm.runInNewContext(helper.outputText,{...context,module:helperModule,exports:helperModule.exports},{filename:'src/giftPdf.ts'});
   return helperModule.exports;
  }
  if(name==='../src/courseQuote')return {coursePrice:async()=>10000,termsVersion:'2026-11-11'};
  return {__esModule:true,default:()=>null};
 };
 const context={module,exports:module.exports,require,console,crypto:webcrypto,Intl,Date,URL,Blob,Uint8Array,atob,btoa,sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,val)=>storage.set(key,val),removeItem:key=>storage.delete(key)},navigator:{clipboard:{writeText:async()=>{}}},document:{body:{appendChild:()=>{}},createElement:()=>{const a={href:'',download:'',remove(){},click(){downloads.push(a.download);}};return a;}},setTimeout:(fn,ms)=>ms>=60000?(fn(),0):setTimeout(fn,ms)};
 const result=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true},fileName:path});
 vm.runInNewContext(result.outputText,context,{filename:path});
 const component=module.exports.default;
 async function flush(){for(let i=0;i<30;i++){if(dirty){dirty=false;hookIndex=0;tree=component();const pending=effects;effects=[];for(const fn of pending)fn();}await new Promise(resolve=>setImmediate(resolve));if(!dirty&&!effects.length)return;}throw new Error('Screen did not settle');}
 function walk(node,fn){if(Array.isArray(node)){node.forEach(x=>walk(x,fn));return;}if(!node||typeof node!=='object')return;fn(node);walk(node.props?.children,fn);}
 function text(node){if(Array.isArray(node))return node.map(text).join('');if(node==null||typeof node==='boolean')return '';if(typeof node!=='object')return String(node);return text(node.props?.children);}
 function findAll(type,predicate){const list=[];walk(tree,node=>{if(node.type===type&&predicate(node))list.push(node)});return list;}
 function find(type,predicate){const list=findAll(type,predicate);assert.ok(list.length,'Missing '+type);return list[0];}
 const button=label=>find('Pressable',node=>text(node)===label);
 async function press(label){const node=button(label);assert.equal(!!node.props.disabled,false,'button disabled: '+label);await node.props.onPress();await flush();}
 async function fill(label,value){find('TextInput',node=>node.props.accessibilityLabel===label).props.onChangeText(value);await flush();}
 return {flush,press,fill,button,find,findAll,text:()=>text(tree)};
}
async function fillPromo(screen){
 await screen.press('Karta na kwotę');await screen.press('Do przekazania dalej');
 await screen.fill('Liczba kart','3');await screen.fill('Wartość jednej karty w złotych','100');
 await screen.fill('E-mail odbiorcy kart PDF','foundation@example.test');await screen.fill('Dedykacja na kartach','Na nowe umiejętności!');
 assert.ok(screen.text().includes('Łączna wartość: 300,00 zł'));
}
let screen=createScreen('app/admin.tsx');await screen.flush();await fillPromo(screen);
const issueButton=screen.button('Wystaw i wyślij karty PDF');
await Promise.all([issueButton.props.onPress(),issueButton.props.onPress()]);await screen.flush();
assert.equal(issues.length,1,'synchronous double-click must not call twice');
assert.ok(screen.text().includes('Nie udało się wykonać operacji.'));
assert.equal(issues[0].quantity,3);assert.equal(issues[0].amount_grosze,10000);assert.equal(issues[0].transferable,true);
screen=createScreen('app/admin.tsx');await screen.flush();await fillPromo(screen);await screen.press('Wystaw i wyślij karty PDF');
assert.equal(issues.length,2);assert.equal(issues[1].request_id,issues[0].request_id,'reload retry must retain request id');
assert.equal(screen.button('Ten pakiet jest już wystawiony').props.disabled,true);
await screen.find('Pressable',node=>node.props.accessibilityLabel==='Pobierz PDF karty 1').props.onPress();await screen.flush();
assert.deepEqual(downloads,['TRENERKI-test.pdf']);assert.equal(pdfs.length,1);
await screen.press('Ponów wysyłkę tych samych kart');assert.equal(resends.length,1);assert.equal(issues.length,2);
await screen.press('Nowy pakiet →');await screen.press('Wystaw i wyślij karty PDF');
assert.equal(issues.length,3);assert.notEqual(issues[2].request_id,issues[0].request_id);
batch.cards[0].status='redeemed';await screen.press('Odśwież historię');
assert.equal(screen.find('Pressable',node=>node.props.accessibilityLabel==='Pobierz PDF karty 1').props.disabled,true,'used cards must not allow new PDF downloads');
const gift=createScreen('app/prezent.tsx');await gift.flush();
await gift.fill('Kod karty podarunkowej','TW-00000000 00000000 00000000 00000001');await gift.press('Odbierz prezent →');
assert.ok(gift.text().includes('Ta karta jest przypisana do innego adresu e-mail.'));
assert.equal(redemptions[0].code,'TW-00000000000000000000000000000001');
redeemError='code_used_or_expired';await gift.press('Odbierz prezent →');
assert.ok(gift.text().includes('Ten kod został już odebrany lub stracił ważność.'));
await gift.press('Pobierz PDF tego kodu');
assert.equal(printRequests.at(-1).code,'TW-00000000000000000000000000000001');assert.equal(redemptions.length,2,'printing must not redeem a code');
const giver=createScreen('app/admin.tsx');await giver.flush();
await giver.press('Do przekazania dalej / fundacji');await giver.fill('E-mail odbiorcy kursów','foundation@example.test');await giver.fill('Dedykacja na kartach kursów','Dla fundacji');
await giver.find('Pressable',node=>node.props.accessibilityRole==='checkbox').props.onPress();await giver.flush();
await giver.press('Wyślij prezent — 1 kurs');assert.equal(giveaways.at(-1).bind_to_recipient,false);assert.equal(giveaways.at(-1).company_mode,false);assert.equal(giveaways.at(-1).message,'Dla fundacji');
await giver.find('Pressable',node=>node.props.accessibilityLabel==='Pobierz PDF kursu Kurs testowy').props.onPress();await giver.flush();assert.equal(printRequests.at(-1).code,freeCode);
await giver.press('Pakiet dla firmy / pracowników');await giver.find('Pressable',node=>node.props.accessibilityRole==='checkbox').props.onPress();await giver.flush();await giver.press('Wyślij prezent — 1 kurs');
assert.equal(giveaways.at(-1).company_mode,true);assert.equal(giveaways.at(-1).bind_to_recipient,false);assert.ok(giver.text().includes('Firma ma swój panel'));
await giver.press('Dla jednej osoby');await giver.find('Pressable',node=>node.props.accessibilityRole==='checkbox').props.onPress();await giver.flush();await giver.press('Wyślij prezent — 1 kurs');
assert.equal(giveaways.at(-1).company_mode,false);assert.equal(giveaways.at(-1).bind_to_recipient,true);
const freeGift=createScreen('app/prezent.tsx',{course:'test-free-course'});await freeGift.flush();await freeGift.press('Utwórz kartę podarunkową →');
await freeGift.fill('Kod karty podarunkowej','TA-'+'C'.repeat(32));await freeGift.press('Pobierz kartę PDF do wydruku');
assert.equal(printRequests.at(-1).code,freeCode,'created gift PDF must keep its own code when redemption input changes');
const company=createScreen('app/firma.tsx');await company.flush();await company.fill('E-mail pracownika','employee@example.test');
await company.find('Pressable',node=>node.props.accessibilityRole==='checkbox').props.onPress();await company.flush();await company.press('Przydziel 1 kurs');
await company.find('Pressable',node=>node.props.accessibilityLabel==='Pobierz PDF kursu Kurs testowy').props.onPress();await company.flush();
assert.equal(assignments.length,1);assert.equal(printRequests.at(-1).code,companyCode);
historyRecords=[{id:'history-new-id',course_slug:'test-free-course',status:'issued',recipient_email:'friend@example.test',created_at:'2026-11-13',expires_at:'2036-11-13',printable:true},{id:'history-legacy-id',course_slug:'test-free-course',status:'issued',recipient_email:null,created_at:'2026-11-12',expires_at:'2036-11-12',printable:false}];
const history=createScreen('app/prezent.tsx');await history.flush();await history.press('Twoje wysłane prezenty ↓');
const historyButtons=history.findAll('Pressable',node=>node.props.accessibilityLabel==='Pobierz PDF wysłanego prezentu Kurs testowy');assert.equal(historyButtons.length,1,'legacy random-code cards must not expose gift-ID printing');
await historyButtons[0].props.onPress();await history.flush();assert.equal(printRequests.at(-1).gift_id,'history-new-id');assert.equal(printRequests.at(-1).code,undefined);
assert.ok(history.text().includes('Aby wydrukować tę starszą kartę, wpisz jej kod'));
console.log('Gift card screen state tests passed: value batches and retries; free course, foundation and company modes; PDF downloads without redemption; created-code isolation; inactive cards and HTTP errors.');
