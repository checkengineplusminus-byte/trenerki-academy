#!/usr/bin/env node
/**
 * Read-only production smoke test. Unlike synthetic course tests, this checks
 * what a visitor can actually download from trainerki.com.
 * It does not log in or read personal data.
 */
import assert from 'node:assert/strict';
const origin=process.env.TRENERKI_PUBLIC_ORIGIN||'https://trenerki.com';
const signature='excel-real-homework-'; // Added only by the real-homework release
async function request(url) {
 const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(25000)});
 assert(response.ok, 'HTTP '+response.status+' for '+url);
 return await response.text();
}
function referencedScripts(html,base){
 const refs=[];
 for(const match of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi))refs.push(match[1]);
 for(const match of html.matchAll(/<link\b[^>]*\bhref\s*=\s*["']([^"']+\.js(?:\?[^"']*)?)["']/gi))refs.push(match[1]);
 return [...new Set(refs.map(u=>new URL(u,base).href))].filter(u=>u.startsWith(origin)&&/\.js(?:$|\?)/.test(u));
}
let errors=[],found=false,checked=0;
for(const route of ['/nauka','/nauka.html']){
 try{
  const url=origin+route,html=await request(url);
  console.log('Live route '+url+': '+html.length+' HTML characters');
  if(html.includes(signature)){found=true;break;}
  const scripts=referencedScripts(html,url);
  console.log('Found '+scripts.length+' referenced JavaScript assets');
  for(const script of scripts.slice(0,40)){
   try {
    const code=await request(script);checked++;
    if(code.includes(signature)){
     console.log('Verified real homework UI marker in live JS: '+script);
     found=true;break;
    }
   }catch(error){errors.push(String(error.message).slice(0,150))}
  }
  if(found)break;
 }catch(error){errors.push(String(error.message).slice(0,200))}
}
if(!found){
 console.error('The public site could not be confirmed to contain the real-homework lesson UI.');
 console.error('Inspected '+checked+' JS bundles; request errors: '+JSON.stringify(errors.slice(0,10)));
 process.exitCode=1;
}else{
 console.log('PASS: Public trainerki.com JavaScript includes the 30-lesson homework UI marker.');
}
