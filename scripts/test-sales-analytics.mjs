import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the actual handler against isolated records; never create live orders.
const source=readFileSync(new URL('../supabase/functions/ta-admin-analytics/index.ts',import.meta.url),'utf8')
 .replace(/^import .*\n/, '');
const date=new Date().toISOString();
const order=(session,amount=9900,status='active')=>({user_id:'learner',course_slug:'example',amount_grosze:amount,status,purchased_at:date,stripe_checkout_session_id:session});
const gift=(session,amount=5000)=>({created_by:'buyer',course_slug:'example',amount_grosze:amount,status:'issued',paid_at:date,stripe_checkout_session_id:session});
const rows={
 ta_admins:{role:'owner'},
 ta_enrollments:[order('cs_live_paid'),order('cs_test_trial'),order('promo_access'),order('cs_live_refunded',9900,'refunded')],
 ta_gift_cards:[gift('cs_live_gift'),gift('cs_test_gift'),gift(null),gift('cs_live_free',0)],
 ta_credit_vouchers:[gift('cs_live_voucher',2500),gift('cs_test_voucher',2500)],
};
let handler;
const client={
 auth:{getUser:async()=>({data:{user:{id:'owner',email_confirmed_at:date}}}),admin:{listUsers:async()=>({data:{users:[{created_at:date}]}})}},
 from(table){
  const query={then(resolve){return Promise.resolve({data:rows[table]}).then(resolve)}};
  for(const name of ['select','eq','gt','range','order','in','not','maybeSingle'])query[name]=()=>query;
  return query;
 },
};
const context={createClient:()=>client,Deno:{env:{get:()=> 'configured'},serve:fn=>{handler=fn}},Response,console};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText,context);
const response=await handler(new Request('https://example.test',{method:'POST',headers:{authorization:'Bearer isolated-test'}}));
assert.equal(response.status,200);
const body=await response.json();
assert.equal(body.totals.purchases,1);
assert.equal(body.totals.gifts,2);
assert.equal(body.totals.revenue_grosze,17400);
assert.equal(body.orders.length,3);
const denied=await handler(new Request('https://example.test',{method:'POST'}));
assert.equal(denied.status,401);
console.log('✓ Live course, gift and voucher sales included; test, promo, refunded and free records excluded; login required');
