// Independent public-site verification. Runs from GitHub Actions internet runner.
// No credentials; confirms what anonymous customers actually receive.
import {readFileSync} from 'node:fs';
const origin='https://trenerki.com';
const results=[];
const routes=['/','/academy/index.html','/academy/anielka-search.js','/academy/ksiegowosc-od-podstaw.html','/academy/kategorie/biznes-i-praca.html'];
for(const route of routes){
 try{
  const url=origin+route+'?catalog_diagnostic='+Date.now();
  const response=await fetch(url,{redirect:'follow',headers:{'cache-control':'no-cache','user-agent':'TRENERKI-PublicCourseCheck/1.0'},signal:AbortSignal.timeout(20000)});
  const html=await response.text();
  const info={route,status:response.status,final:response.url,bytes:html.length,
   etag:response.headers.get('etag'),lastModified:response.headers.get('last-modified'),
   cache:response.headers.get('cache-control'),
   hasPublicCourses:html.includes('function publicCatalogCourses()'),
   hasAiFallback:html.includes('AI_PUBLIC_CATALOG'),
   hasSearchMatcher:html.includes('function catalogCourseMatches('),
   hasAiSynonyms:html.includes('sztuczn'),
   hasAccounting:html.includes('Księgowość od podstaw'),
   hasSearchHook:html.includes('window.anielkaCatalogIds'),
   hasTwoLetterAi:html.includes("normalize(v)!=='ai'"),
   htmlPreview:html.slice(0,75).replace(/\s+/g,' ')};
  results.push(info);
 }catch(e){results.push({route,error:String(e)})}
}
console.log('TRENERKI_PUBLIC_CATALOG_DIAGNOSTIC',JSON.stringify(results,null,2));
const index=results.find(x=>x.route==='/academy/index.html');
const search=results.find(x=>x.route==='/academy/anielka-search.js');
if(index?.status!==200||!index.hasPublicCourses||!index.hasAiFallback||!index.hasSearchMatcher||search?.status!==200||!search.hasTwoLetterAi){
 console.error('Live catalogue is missing the latest search code or deployment.');
 process.exitCode=1;
}
