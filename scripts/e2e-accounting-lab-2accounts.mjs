/**
 * E2E RLS TRENERKI — uruchamiaj WYŁĄCZNIE na dwóch własnych kontach testowych
 * mających aktywny dostęp do kursu. Nigdy na kontach kursantów.
 * Bez sekretów: node scripts/e2e-accounting-lab-2accounts.mjs --preflight
 * Właściwy test wymaga w env:
 * EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 * TA_E2E_ACCOUNT_A_EMAIL / TA_E2E_ACCOUNT_A_PASSWORD
 * TA_E2E_ACCOUNT_B_EMAIL / TA_E2E_ACCOUNT_B_PASSWORD
 * TA_E2E_CONFIRM=I_OWN_TWO_DEDICATED_TEST_ACCOUNTS
 * Fixture workspaces pozostają w bazie. Bez usuwania i bez realnych płatności.
 */
import assert from 'node:assert/strict';
const e=process.env;
const required=[
 'EXPO_PUBLIC_SUPABASE_URL','EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
 'TA_E2E_ACCOUNT_A_EMAIL','TA_E2E_ACCOUNT_A_PASSWORD',
 'TA_E2E_ACCOUNT_B_EMAIL','TA_E2E_ACCOUNT_B_PASSWORD'
];
const missing=required.filter(k=>!e[k]?.trim());
const ack=e.TA_E2E_CONFIRM==='I_OWN_TWO_DEDICATED_TEST_ACCOUNTS';
if(process.argv.includes('--preflight')){
 console.log(JSON.stringify({
  status:missing.length||!ack?'BLOCKED_MISSING_AUTHORIZED_FIXTURES':'READY_FOR_AUTHORIZED_E2E',
  missing,confirmation_required:!ack,network_calls:0,writes:0
 }));
 process.exit(0);
}
if(missing.length||!ack||
 e.TA_E2E_ACCOUNT_A_EMAIL.trim().toLowerCase()===e.TA_E2E_ACCOUNT_B_EMAIL.trim().toLowerCase()){
 console.error('BLOCKED: wymagane są dwa odrębne, uprawnione konta TESTOWE i świadoma zgoda. Zero zapytań.');
 process.exit(2);
}
const {createClient}=await import('@supabase/supabase-js');
const mk=()=>createClient(e.EXPO_PUBLIC_SUPABASE_URL,e.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{
 auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
});
const a=mk(),a2=mk(),b=mk(),table='ta_accounting_lab_workspaces',results=[];
function data(r,step){
 if(r.error)throw new Error(step+':'+String(r.error.code||r.error.status||'SUPABASE_ERROR'));
 return r.data;
}
function passed(name,ok){
 assert.equal(ok,true,name);
 results.push({name,status:'passed'});
}
async function login(db,email,password,label){
 const r=data(await db.auth.signInWithPassword({email,password}),label);
 assert.ok(r?.user?.id,'Brak sesji testowej');
 return r.user.id;
}
async function ownFixture(db,name,id){
 const rows=data(await db.from(table)
  .select('id,user_id,version,state').eq('name',name).limit(1),name+'_lookup');
 const record=rows.length?rows[0]:data(await db.from(table)
  .insert({name}).select('id,user_id,version,state').single(),name+'_create');
 assert.equal(record.user_id,id,'Nieoczekiwany właściciel fixture');
 assert.ok(Number.isSafeInteger(record.version)&&record.version>=1,'Niedozwolona wersja');
 return record;
}
async function readOwn(db,id,step){
 return data(await db.from(table).select('id,user_id,state,version').eq('id',id).single(),step);
}
async function invisible(db,id,label){
 const r=data(await db.from(table).select('id').eq('id',id).maybeSingle(),label);
 passed(label,r===null);
}
async function save(db,workspaceId,expectedVersion,state){
 return db.rpc('ta_accounting_lab_save',{
  workspace_id:workspaceId,expected_version:expectedVersion,next_state:state
 });
}
try{
 const [idA,idA2,idB]=await Promise.all([
  login(a,e.TA_E2E_ACCOUNT_A_EMAIL,e.TA_E2E_ACCOUNT_A_PASSWORD,'A_login'),
  login(a2,e.TA_E2E_ACCOUNT_A_EMAIL,e.TA_E2E_ACCOUNT_A_PASSWORD,'A_second_login'),
  login(b,e.TA_E2E_ACCOUNT_B_EMAIL,e.TA_E2E_ACCOUNT_B_PASSWORD,'B_login')
 ]);
 assert.equal(idA,idA2);assert.notEqual(idA,idB);
 data(await a.rpc('ta_accounting_overview'),'A_course_access');
 data(await b.rpc('ta_accounting_overview'),'B_course_access');
 const [wa,wb]=await Promise.all([
  ownFixture(a,'__TA_ACCOUNTING_E2E_RLS_A__',idA),
  ownFixture(b,'__TA_ACCOUNTING_E2E_RLS_B__',idB)
 ]);
 await invisible(b,wa.id,'B_cannot_read_A');
 await invisible(a,wb.id,'A_cannot_read_B');
 const foreign=await save(b,wa.id,wa.version,wa.state);
 passed('B_cannot_save_A',Boolean(foreign.error));

 const prior=await readOwn(a,wa.id,'A_before_direct_write');
 const direct=await a.from(table).update({state:prior.state,version:prior.version+1})
  .eq('id',wa.id).select('id,version');
 passed('direct_state_version_update_denied',Boolean(direct.error));
 const after=await readOwn(a,wa.id,'A_after_direct_write_denied');
 passed('direct_denial_kept_version',after.version===prior.version);

 const staleView=await readOwn(a2,wa.id,'A_other_window');
 passed('same_version_in_two_A_sessions',staleView.version===after.version);
 const written=data(await save(a,wa.id,after.version,after.state),'A_valid_rpc_save');
 passed('A_own_rpc_increments_version',written.version===after.version+1);
 const stale=await save(a2,wa.id,staleView.version,staleView.state);
 passed('stale_second_session_save_rejected',Boolean(stale.error));
 const final=await readOwn(a,wa.id,'A_after_stale_rejection');
 passed('stale_save_did_not_overwrite',final.version===after.version+1);

 const ownB=await readOwn(b,wb.id,'B_before_own_save');
 const savedB=data(await save(b,wb.id,ownB.version,ownB.state),'B_own_rpc_save');
 passed('B_can_save_own',savedB.version===ownB.version+1);
 await invisible(a,wb.id,'A_still_cannot_read_B');

 console.log(JSON.stringify({status:'PASSED_AUTHORIZED_E2E',cases:results.length,
  results,fixture_workspaces_retained:2,full_simulator:'not_tested',
  backup_restore:'not_tested',professional_review:'pending'}));
}catch(err){
 console.error(JSON.stringify({status:'FAILED_OR_BLOCKED_AUTHORIZED_E2E',
  stage:String(err?.message||'UNKNOWN').slice(0,140),passed_so_far:results.length,
  fixture_workspaces_may_remain:true,backup_restore:'not_tested'}));
 process.exitCode=1;
}finally{
 await Promise.allSettled([a.auth.signOut(),a2.auth.signOut(),b.auth.signOut()]);
}
