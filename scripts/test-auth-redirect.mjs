import test from 'node:test';
import assert from 'node:assert/strict';
import {authRedirectState} from '../src/authRedirect.mjs';
import {accountErrorMessage} from '../src/accountFeedback.mjs';

test('ordinary navigation and anchors are not Auth callbacks',()=>{
 for(const hash of ['', '#kursy', '#type=other', '#access_token='])
  assert.deepEqual(authRedirectState(hash),{callback:false,recovery:false,error:null});
});
test('successful recovery and signup fragments reach the account screen',()=>{
 assert.deepEqual(authRedirectState('#type=recovery&access_token=synthetic'),{callback:true,recovery:true,error:null});
 assert.deepEqual(authRedirectState('#type=signup&access_token=synthetic'),{callback:true,recovery:false,error:null});
});
test('a recovery hint alone is navigation context, never proof of a session',()=>{
 assert.deepEqual(authRedirectState('#type=recovery'),{callback:true,recovery:true,error:null});
});
test('expired links with and without a recovery hint use an authored message',()=>{
 for(const suffix of ['', '&type=recovery']){
  const state=authRedirectState('#error=access_denied&error_code=otp_expired&error_description=raw-provider-text'+suffix);
  assert.equal(state.error,'otp_expired');assert.equal(state.recovery,!!suffix);
  assert.match(accountErrorMessage({code:state.error}),/Link wygasł/);
 }
 assert.equal(authRedirectState('#error=otp_expired').error,'otp_expired');
});
test('untrusted callback descriptions and unknown codes never become UI text',()=>{
 const payload='<img src=x onerror=alert(1)>';
 const state=authRedirectState('#error_code='+encodeURIComponent(payload)+'&error_description='+encodeURIComponent(payload));
 assert.equal(state.error,'invalid_link');
 assert.equal(accountErrorMessage({code:state.error}).includes(payload),false);
 assert.deepEqual(authRedirectState('#error_description='),{callback:true,recovery:false,error:'invalid_link'});
});
