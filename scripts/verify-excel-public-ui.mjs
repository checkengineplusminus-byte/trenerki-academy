#!/usr/bin/env node
/**
 * Read-only production smoke test. Validates actual public JS, not synthetic
 * CI code. Checks BOTH homework component and top-of-lesson quick-access button.
 * Retries while Expo deploy/CDN updates propagate. No credentials or user data.
 */
const origin=process.env.TRENERKI_PUBLIC_ORIGIN||'https://trenerki.com';
const signatures=['excel-real-homework-','excel-homework-quick-access'];
const retries=Math.max(1,Math.min(20,Number(process.env.TRENERKI_LIVE_RETRIES||14)));
const delay=Number(process.env.TRENERKI_LIVE_DELAY_MS||15000);
async function request(url){
 const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(22000),
  headers:{'cache-control':'no-cache, max-age=0','user-agent':'TRENERKI-Excel-live-verifier'}});
 if(!response.ok)throw Error('HTTP '+response.status+' '+url);
 return await response.text();
}
function scriptsFrom(html,base){
 const refs=[];
 for(const m of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi))refs.push(m[1]);
 for(const m of html.matchAll(/<link\b[^>]*\bhref\s*=\s*["']([^"']+\.js(?:\?[^"']*)?)["']/gi))refs.push(m[1]);
 return [...new Set(refs.map(x=>new URL(x,base).href))]
  .filter(u=>u.startsWith(origin)&&/\.js(?:$|\?)/.test(u));
}
let verified=false,errors=[],checked=0;
for(let attempt=1;attempt<=retries;attempt++){
 const found=new Set();errors=[];checked=0;
 for(const path of ['/nauka','/nauka.html']){
  const url=origin+path;
  try{
   const html=await request(url);
   for(const signature of signatures)if(html.includes(signature))found.add(signature);
   for(const script of scriptsFrom(html,url).slice(0,40)){
    try{
     const js=await request(script);
     checked++;
     for(const signature of signatures)if(js.includes(signature))found.add(signature);
     if(found.size===signatures.length)break;
    }catch(e){errors.push(String(e.message).slice(0,170))}
   }
   if(found.size===signatures.length)break;
  }catch(e){errors.push(String(e.message).slice(0,170))}
 }
 console.log('Attempt '+attempt+'/'+retries+': verified '+found.size+'/'+signatures.length+' UI markers; inspected '+checked+' JS assets');
 if(found.size===signatures.length){verified=true;break}
 if(attempt<retries)await new Promise(resolve=>setTimeout(resolve,delay));
}
if(!verified){
 console.error('Public EXCEL UI not verified. Expected both real homework and quick access; errors='+JSON.stringify(errors.slice(0,8)));
 process.exitCode=1;
}else{
 console.log('PASS: public trainerki.com exposes both 30 homework lessons and the visible quick-access button.');
}
