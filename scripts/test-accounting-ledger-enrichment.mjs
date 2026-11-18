import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Read-only isolated accounting-export contract: source-backed course, buyer, dates and Saldeo references.
const source=readFileSync(new URL('../supabase/functions/ta-admin-analytics/index.ts',import.meta.url),'utf8')
 .replace(/^import .*\n/,'');
const epoch=Math.floor(Date.parse('2026-11-10T20:15:00Z')/1000);
let handler,queries=0;
const data={
 ta_admins:[{role:'owner'}],
 ta_enrollments:[{stripe_payment_intent_id:'pi_live_paid',course_slug:'obowiazki-domowe',
  purchased_at:'2026-11-10T20:15:00Z'}],
 ta_gift_cards:[],ta_credit_vouchers:[],
 ta_courses:[{slug:'obowiazki-domowe',title_pl:'Obowiązki domowe'}],
 ta_accounting_documents:[{stripe_source:'ch_live_paid',document_type:'b2c_register',
  document_status:'reconciled',document_number:'WEW/11/2026',ksef_number:null,tax_treatment:'pl_23'}]
};
function mockSelect(table){
 const obj={
  select(){return obj},in(){return obj},eq(){return obj},
  async maybeSingle(){return {data:data[table]?.[0]||null,error:null}},
  then(resolve,reject){return Promise.resolve({data:data[table]||[],error:null}).then(resolve,reject)}
 };
 return obj;
}
const client={auth:{getUser:async()=>({data:{user:{id:'owner',email_confirmed_at:new Date().toISOString()}},error:null})},
 from:mockSelect};
const fetch=async url=>{
 queries++;
 const u=String(url);
 if(u.includes('/v1/balance_transactions?'))
  return {ok:true,json:async()=>({has_more:false,data:[{
   id:'txn_live_paid',source:'ch_live_paid',type:'charge',reporting_category:'charge',
   currency:'pln',amount:9900,fee:249,net:9651,created:epoch,available_on:epoch+86400
  }]})};
 if(u.includes('/v1/charges?'))
  return {ok:true,json:async()=>({has_more:false,data:[{
   id:'ch_live_paid',payment_intent:'pi_live_paid',paid:true,
   description:'Kurs domowy',billing_details:{email:'buyer@example.com',name:'Anna Kowalska',
    address:{country:'PL'}}
  }]})};
 throw Error('Unexpected external URL '+u);
};
const env={SUPABASE_URL:'https://example.test',SUPABASE_ANON_KEY:'key',
 SUPABASE_SERVICE_ROLE_KEY:'admin',STRIPE_SECRET_KEY:'sk_live_test'};
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{
 target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None
}}).outputText,{
 createClient:()=>client,Deno:{env:{get:key=>env[key]},serve:fn=>handler=fn},
 fetch,Response,URLSearchParams,AbortSignal,Intl,Date,Map,Set,Promise,console
});
const response=await handler(new Request('https://example.test',{method:'POST',
 headers:{authorization:'Bearer authorized','content-type':'application/json'},
 body:JSON.stringify({action:'accounting_export',period:'2026-11'})}));
assert.equal(response.status,200);
const report=await response.json();
assert.equal(report.rows.length,1);
const r=report.rows[0];
assert.equal(r.date,'2026-11-10');
assert.equal(r.time,'21:15');
assert.equal(r.product,'Obowiązki domowe');
assert.equal(r.customer_email,'buyer@example.com');
assert.equal(r.customer_name,'Anna Kowalska');
assert.equal(r.customer_country,'PL');
assert.equal(r.payment_intent_id,'pi_live_paid');
assert.equal(r.document.document_number,'WEW/11/2026');
assert.equal(r.document.tax_treatment,'pl_23');
assert.equal(r.fee_grosze,249);
assert.equal(r.net_grosze,9651);
assert.equal(report.warnings.length,0);
assert(queries>=2);
const invalid=await handler(new Request('https://example.test',{method:'POST',
 headers:{authorization:'Bearer authorized','content-type':'application/json'},
 body:JSON.stringify({action:'accounting_export',period:'2026-99'})}));
assert.equal(invalid.status,400);
console.log('✓ Stripe/Supabase accounting enrichment: Warsaw date/time, original course, buyer, VAT flag and Saldeo reconciliation');
