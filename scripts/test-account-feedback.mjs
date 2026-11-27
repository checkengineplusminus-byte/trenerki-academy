import assert from 'node:assert/strict';
import test from 'node:test';
import {AccountFeedbackError,accountEmail,accountErrorMessage} from '../src/accountFeedback.mjs';
test('local validation keeps the instruction that tells the learner what to fix',()=>{
 for(const message of ['Wpisz prawidłowy adres e-mail.','Podane hasła różnią się.','Wpisz swoje imię i nazwisko.'])
  assert.equal(accountErrorMessage(new AccountFeedbackError(message)),message);
});
test('login failures distinguish wrong credentials and unconfirmed email',()=>{
 assert.match(accountErrorMessage({code:'invalid_credentials'}),/Nieprawidłowy e-mail lub hasło/);
 assert.match(accountErrorMessage({code:'email_not_confirmed'}),/wysłać potwierdzenie ponownie/);
});
test('password recovery distinguishes expiry, reused password and temporary sending failure',()=>{
 assert.match(accountErrorMessage({code:'otp_expired'}),/Link wygasł/);
 assert.match(accountErrorMessage({code:'same_password'}),/różnić się/);
 assert.match(accountErrorMessage(new Error('Error sending recovery email')),/wysłać wiadomości/);
});
test('network errors explain retry without requesting re-entry of the form',()=>{
 const error=new Error('fetch failed');error.name='AuthRetryableFetchError';
 assert.match(accountErrorMessage(error),/Wpisane dane pozostają/);
});
test('unknown provider content cannot appear in the form as a raw error',()=>{
 assert.doesNotMatch(accountErrorMessage({message:'<script>private server details</script>'}),/script|private|server/);
});
test('registration, login and reset use one normalized email including plus aliases',()=>{
 assert.equal(accountEmail('  Learner+Trial@Example.test  '),'learner+trial@example.test');
 for(const value of ['', 'without-at', 'a@', 'a@b', 'two addresses@example.test','a@@example.test'])
  assert.throws(()=>accountEmail(value),AccountFeedbackError);
});
