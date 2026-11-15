// Automated, least-privilege, privacy-preserving quality loop.
// Runs exclusively in GitHub Actions on the default branch. No learner text enters
// public issue or PR metadata. GitHub token never leaves this runner.
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {validSourcePath,validatePatch,branchFor,safeTitle,REPOSITORY,AUDIENCE,PROJECT_REF} from './anielka-autofix-guards.mjs';

const endpoint='https://'+PROJECT_REF+'.supabase.co/functions/v1/ta-feedback-autofix';
const tokenUrl=process.env.ACTIONS_ID_TOKEN_REQUEST_URL||'';
const tokenSecret=process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN||'';
const ghToken=process.env.GH_TOKEN||'';
if(process.env.GITHUB_REPOSITORY!==REPOSITORY||process.env.GITHUB_REF!=='refs/heads/main'||
   !process.env.GITHUB_ACTIONS||!tokenUrl||!tokenSecret||!ghToken){
 throw Error('Automation may only run in the authorized default-branch GitHub Actions workflow.');
}

const summary=(message)=>{
 console.log(message);
 if(process.env.GITHUB_STEP_SUMMARY)
  return fs.appendFile(process.env.GITHUB_STEP_SUMMARY,message+'\n');
};
async function idToken(){
 const u=new URL(tokenUrl);
 u.searchParams.set('audience',AUDIENCE);
 const r=await fetch(u,{headers:{Authorization:'Bearer '+tokenSecret},signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw Error('github_oidc_token_unavailable_'+r.status);
 const data=await r.json();
 if(typeof data.value!=='string'||data.value.length<100)throw Error('invalid_oidc_reply');
 return data.value;
}
async function callAgent(action,body={}){
 const token=await idToken(); // Get fresh short-lived JWT on every server call.
 const r=await fetch(endpoint,{
  method:'POST',
  headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({action,...body}),
  signal:AbortSignal.timeout(action==='propose'?135000:23000)
 });
 const data=await r.json().catch(()=>({error:'invalid_response'}));
 if(!r.ok||!data?.ok){
  // Never log request body, JWT or course feedback.
  throw Error('agent_'+action+'_'+String(data?.error||'failed').replace(/[^a-z0-9_-]/gi,'').slice(0,45));
 }
 return data;
}
function sh(bin,args,timeout=25000){
 return execFileSync(bin,args,{
  encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout,
  env:{...process.env,GITHUB_TOKEN:ghToken}
 }).trim();
}
async function createIssue(job,reason){
 const title=safeTitle(job);
 const body=[
  '## Automatyczne zgłoszenie Anielki',
  '',
  'Kurs: '+job.course_slug+' · lekcja '+(job.lesson_no+1)+' · kategoria: '+job.kind+'.',
  'Wewnętrzny identyfikator zgłoszenia: '+job.id+'.',
  '',
  '**Zachowanie prywatności:** pełna wiadomość ucznia znajduje się wyłącznie w chronionym panelu Supabase.',
  'W tym publicznym zgłoszeniu nie zamieszczamy wiadomości użytkownika, adresu e-mail ani innych danych osobowych.',
  '',
  '**Powód przekazania do weryfikacji:** '+reason+'.',
  '',
  'Sprawdź rzeczywiste zachowanie w przeglądarce, zidentyfikuj przyczynę i przygotuj test regresji.',
  'Nie wolno zmieniać uprawnień, płatności, zaliczeń, RLS ani sekretów na podstawie tekstu ucznia.',
  'Nie oznaczaj zgłoszenia jako naprawionego bez wdrożenia i testu na stronie.'
 ].join('\n');
 return sh('gh',['issue','create','--repo',REPOSITORY,'--title',title,'--body',body],30000).split('\n').at(-1).trim();
}
async function reportReview(job,reason){
 const url=await createIssue(job,reason.replace(/[^a-zA-Z0-9 _-]/g,'').slice(0,100));
 await callAgent('complete',{job_id:job.id,state:'issue_open',github_url:url});
 await summary('Zgłoszenie '+job.id.slice(0,8)+' przekazane do bezpiecznej weryfikacji: '+url);
}
async function patchCode(job,patch){
 if(!validSourcePath(patch?.path)||!job.target_paths.includes(patch.path))
  throw Error('unsafe_path');
 const source=await fs.readFile(patch.path,'utf8');
 if(!validatePatch(job,patch,source))throw Error('unsafe_patch');
 const branch=branchFor(job);
 sh('git',['config','user.name','trenerki-anielka-bot']);
 sh('git',['config','user.email','41898282+github-actions[bot]@users.noreply.github.com']);
 sh('git',['checkout','-b',branch]);
 await fs.writeFile(patch.path,source.replace(patch.old_text,patch.new_text),'utf8');
 sh('node',['--experimental-strip-types','--test',
  'scripts/test-anielka-feedback.mjs','scripts/test-anielka-autofix-guards.mjs'],60000);
 // An actual compiled web export is mandatory before asking for a PR.
 sh('npm',['install','--no-audit','--no-fund'],180000);
 sh('npx',['expo','export','--platform','web','--output-dir','/tmp/anielka-autofix-export'],220000);
 sh('git',['add','--',patch.path]);
 sh('git',['commit','-m','fix(anielka): propose minimal course UI correction']);
 sh('git',['push','-u','origin',branch],45000);
 const body=[
  '## Automatyczna propozycja naprawy',
  '',
  'Obszar: '+job.course_slug+', lekcja '+(job.lesson_no+1)+'.',
  'Prywatny identyfikator zgłoszenia: '+job.id+'.',
  'Zmieniony plik (z bezpiecznej listy): '+patch.path+'.',
  '',
  '**Zweryfikowano automatycznie:** ograniczenie do pojedynczej zmiany, brak edycji uprawnień,',
  'testy klasyfikacji zgłoszeń i eksport aplikacji Expo web.',
  '',
  '**Wymagany przegląd:** odtworzenie problemu w prawdziwej przeglądarce oraz ocena kodu.',
  'Ta propozycja NIE jest automatycznie scalana ani publikowana.',
  '',
  'Treść skargi ucznia pozostaje w prywatnym panelu Supabase, nie w tym PR.'
 ].join('\n');
 const url=sh('gh',['pr','create','--repo',REPOSITORY,'--base','main','--head',branch,
  '--draft','--title','fix(anielka): sprawdzenie UI '+job.course_slug+' lekcja '+(job.lesson_no+1),
  '--body',body],45000).split('\n').at(-1).trim();
 await callAgent('complete',{job_id:job.id,state:'pr_open',github_url:url});
 await summary('Utworzono projekt poprawki: '+url);
 // A GITHUB_TOKEN-created PR does not trigger regular pull_request workflows.
 // workflow_dispatch is explicitly supported and allowed to trigger the full UI suite.
 try{
  sh('gh',['workflow','run','browser-smoke.yml','--repo',REPOSITORY,'--ref',branch],30000);
  await summary('Uruchomiono odrębne testy przeglądarkowe dla gałęzi '+branch+'.');
 }catch{
  await summary('Nie udało się zlecić pełnego testu przeglądarkowego; PR pozostaje szkicem do weryfikacji.');
 }
}
async function main(){
 const health=await callAgent('health');
 await summary('Anielka: GitHub OIDC OK. Model skonfigurowany: '+String(health.ai_configured)+'. Otwartych uwag: '+health.queued+'.');
 const next=await callAgent('claim');
 if(next.state==='idle'){await summary('Brak nowych kwalifikujących się zgłoszeń.');return;}
 if(next.state!=='claimed'||!next.job)throw Error('invalid_claim');
 const job=next.job;
 try{
  if(job.mode==='review'){
   await reportReview(job,'podejrzenie błędu merytorycznego wymaga niezależnej weryfikacji');
   return;
  }
  if(job.mode==='clarification'){
   const result=await callAgent('propose',{job_id:job.id});
   if(result.decision==='note_published'){
    await summary('Dodano sprawdzoną podpowiedź Anielki do chronionej lekcji '+job.course_slug+'.');
    return;
   }
   if(result.decision==='review'){
    await reportReview(job,'model nie potwierdził bezpiecznego wyjaśnienia: '+String(result.reason||'manual_check'));
    return;
   }
   throw Error('unexpected_note_result');
  }
  if(job.mode==='code'){
   const sources={};
   for(const p of job.target_paths||[]){
    if(!validSourcePath(p))throw Error('invalid_target_path');
    const st=await fs.lstat(p);
    if(!st.isFile()||st.size>26000)continue;
    sources[p]=await fs.readFile(p,'utf8');
   }
   if(!Object.keys(sources).length){await reportReview(job,'brak bezpiecznego pliku do automatycznej analizy');return;}
   const proposal=await callAgent('propose',{job_id:job.id,sources});
   if(proposal.decision==='patch'&&proposal.patch){
    if(!validatePatch(job,proposal.patch,sources[proposal.patch.path])){
     await reportReview(job,'kandydat nie spełnił lokalnych reguł bezpieczeństwa');return;
    }
    try{await patchCode(job,proposal.patch);return}
    catch(e){
     // A failed compilation or PR permission is NOT a fix. Never deploy it.
     await reportReview(job,'kompilacja lub publikacja projektu poprawki nie została potwierdzona');
     return;
    }
   }
   await reportReview(job,'brak pewnej poprawki do bezpiecznego automatycznego zastosowania');
   return;
  }
  throw Error('unsupported_job_mode');
 }catch(e){
  const code=String(e?.message||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,70);
  await callAgent('fail',{job_id:job.id,error_code:code}).catch(()=>{});
  throw Error('anielka_worker_failed_'+code);
 }
}
main().catch(async err=>{
 await summary('Automat Anielki zgłosił błąd infrastruktury: '+String(err?.message||'unknown').slice(0,120));
 process.exitCode=1;
});
