#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const root=new URL('../public/academy/',import.meta.url);
const load=name=>readFileSync(new URL(name,root),'utf8');
const themeFile='sitewide-premium.css';
const theme=load(themeFile);
assert(theme.length>9000,'Shared styling must not be empty');
assert.match(theme,/body\.ta-info-page/);
assert.match(theme,/body\.ta-affiliate-page/);
assert.match(theme,/body:has\(>main>nav\.back\)/);
assert.match(theme,/@media\s*\(max-width:760px\)/);
assert.match(theme,/@media print/);
const legal=['regulamin','prywatnosc','odstapienie','kontakt','certyfikaty','zrodla-zdjec'];
const affiliate=['program-afiliacyjny','regulamin-afiliacyjny','prywatnosc-afiliacja'];
const link='/academy/sitewide-premium.css';
for(const slug of legal){
 const h=load(slug+'.html');
 assert.match(h,/class="ta-info-page(?: ta-photo-credits)?"/,'Info page body class: '+slug);
 assert(h.includes(link),'CSS link missing on '+slug);
 assert(h.includes('<main'),'Main content missing on '+slug);
 assert(h.includes('</html>'),'Markup incomplete on '+slug);
}
for(const slug of affiliate){
 const h=load(slug+'.html');
 assert(h.includes('class="ta-affiliate-page"'),'Affiliate class missing '+slug);
 assert(h.includes(link),'Affiliate CSS missing '+slug);
 assert(h.includes('/academy/affiliate.css'),'Original affiliate layout missing '+slug);
 assert(h.includes('aria-label="TRENERKI Academy"'),'Brand link missing '+slug);
}
const landing=load('program-afiliacyjny.html');
assert(landing.includes('10%')&&landing.includes('500 zł'),'Preserve affiliate terms');
assert(landing.includes('href="/partner"'),'Preserve registration link');
const terms=load('regulamin.html');
assert(terms.includes('odstapienie.html')&&terms.includes('regulamin-afiliacyjny.html'),'Legal links remain present');
const subpaths=['kursy','kategorie'].flatMap(folder=>readdirSync(new URL(folder+'/',root)).filter(name=>name.endsWith('.html')).map(name=>folder+'/'+name));
assert.equal(subpaths.filter(p=>p.startsWith('kursy/')).length,83,'83 course SEO pages must remain');
assert.equal(subpaths.filter(p=>p.startsWith('kategorie/')).length,6,'Six category pages must remain');
for(const p of subpaths){
 const h=load(p);
 const isRedirect=p.endsWith('zaufany-wolontariusz-nauka.html');
 assert(h.includes(link)||h.includes('/academy/course-share.css')||h.includes('/academy/support-footer.css'),
  'Premium CSS must be reached directly or through the shared styles on '+p);
 if(isRedirect){
   assert(h.includes('class="ta-learning-redirect"'),'Secure training redirect should use premium styling');
   assert(h.includes('href="/materialy-wolontariusza"'),'Keep original access route');
 }else{
   assert(h.includes('/academy/index.html'),'Course navigation back to the catalogue missing: '+p);
 }
 assert(h.includes('<main'),'Main content missing in '+p);
}
const support=load('support-footer.css');
assert(support.includes(link),'Legacy shared footer should import the new theme');
assert.match(load('course-share.css'),/@import\s+url\(["']\/academy\/sitewide-premium\.css(?:\?[^"')]+)?["']\)/,'Modern course and category pages must import the same theme');
assert(load('course-share.css').includes(link+'?v='+createHash('sha256').update(theme).digest('hex').slice(0,12)),'Shared theme import must match the current stylesheet bytes');
const pathnames=['regulamin','prywatnosc','certyfikaty','kontakt','odstapienie','program-afiliacyjny','regulamin-afiliacyjny','prywatnosc-afiliacja','zrodla-zdjec',...subpaths];
for(const f of pathnames){
 const name=f.endsWith('.html')?f:f+'.html';
 assert(existsSync(new URL(name,root)),name+' must exist');
}
console.log('✓ All 6 legal/info pages, 3 partner pages, 83 course landings and 6 category pages share the premium theme through direct or shared CSS.');
console.log('✓ Legal/affiliate routes, core content, pricing terms and course paths remain present.');
