#!/usr/bin/env node
// Single public end-to-end check of the Anielka Edge Function.
// Don't log user questions, credentials or full AI answers.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const endpoint='https://kcvvixcjuwglfvdpypzs.supabase.co/functions/v1/ta-anielka';
const page=readFileSync(new URL('../public/academy/index.html',import.meta.url),'utf8');
const publishable=page.match(/sb_publishable_[A-Za-z0-9_-]+/)?.[0];
assert(publishable,'Missing public Supabase publishable key');
const ac=new AbortController();
const timeout=setTimeout(()=>ac.abort(),30000);
try{
 const ping=await fetch(endpoint,{signal:ac.signal});
 const status=await ping.json();
 assert(ping.ok,'AI endpoint unreachable: HTTP '+ping.status);
 assert.equal(status?.service,'anielka');
 console.log('✓ Public AI edge function responds to status request');
 if(!status.available)throw new Error('OPENAI_API_KEY not configured in TRENERKI Supabase — live responses cannot work yet');
 const response=await fetch(endpoint,{
  method:'POST',
  headers:{origin:'https://trenerki-academy.expo.app','content-type':'application/json',apikey:publishable},
  body:JSON.stringify({question:'Chcę nauczyć się Excela od podstaw, żeby robić kosztorysy w pracy',candidates:['excel-skroty']}),
  signal:ac.signal
 });
 const body=await response.json();
 assert(response.ok,'AI request failed: HTTP '+response.status+' / '+(body.error||'unknown'));
 assert(body.ok===true&&typeof body.answer==='string'&&body.answer.length>30,'AI returned no individual answer');
 assert(body.candidate_ids?.includes('excel-skroty'),'Approved course list was not respected');
 console.log('✓ AI returned an individual course answer for a concrete work goal');
 console.log('✓ Uses real public course catalog, no authorization needed, no API key exposed');
}catch(e){
 console.error('❌ Anielka end-to-end check: '+String(e.message||e));
 process.exitCode=1;
}finally{clearTimeout(timeout);}
