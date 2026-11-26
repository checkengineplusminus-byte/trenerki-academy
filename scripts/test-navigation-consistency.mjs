#!/usr/bin/env node
// Public, no-credentials navigation audit across all standalone course pages.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
const root=resolve(process.cwd(),'public');
const read=path=>readFileSync(join(root,path),'utf8');
const courseDir=join(root,'academy','kursy');
const files=readdirSync(courseDir).filter(f=>f.endsWith('.html')&&!f.endsWith('-nauka.html')).sort();
// The one noindex learning gateway intentionally redirects to protected lessons; it is not a public offer.
const gateway=read('academy/kursy/zaufany-wolontariusz-nauka.html');
assert.match(gateway,/<meta name="robots" content="noindex">/);
assert.match(gateway,/location\.replace\('\/nauka\?course=zaufany-wolontariusz/);
assert(files.length>=81,'Expected every publicly listed course');
const categoryDir=join(root,'academy','kategorie');
const categories=readdirSync(categoryDir).filter(f=>f.endsWith('.html')).sort();
assert.equal(categories.length,6,'Six standalone catalogue categories');
const errors=[];
for(const relative of [
 ...files.map(f=>'academy/kursy/'+f),
 ...categories.map(f=>'academy/kategorie/'+f),
 'academy/ksiegowosc-od-podstaw.html'
]){
 const html=read(relative);
 const supported=html.includes('/academy/course-share.js');
 const styled=html.includes('/academy/course-share.css');
 if(!supported||!styled)errors.push(relative+': missing shared profile/menu asset');
 if(!/<header\b/i.test(html))errors.push(relative+': no page header');
 const links=[...html.matchAll(/\bhref="([^"]+)"/g)].map(x=>x[1]);
 if(!links.some(h=>h.startsWith('/academy/index.html')))errors.push(relative+': no catalogue return link');
 for(const href of links){
  if(!href.startsWith('/academy/'))continue;
  const pathname=href.split(/[?#]/,1)[0];
  if(!existsSync(join(root,pathname.slice(1)))&&!(pathname==='/academy/'))errors.push(relative+': dead link '+href);
 }
}
const home=read('academy/index.html');
assert.match(home,/<details class="mobile-nav"/,'Mobile menu must be present');
assert.match(home,/<details class="mobile-nav"[^>]*>[\s\S]*?<a href="\/firma">Dla firm<\/a>[\s\S]*?<\/details>/,'Mobile menu must contain the Dla firm route');
assert.match(home,/<details class="mobile-nav"><summary>/,'Mobile menu summary must not always say Open');
assert.match(home,/<a href="\/moje-kursy">Moje kursy<\/a>/,'Learner library must be reachable');
assert.match(home,/<a href="\/konto">Moje konto<\/a>/,'Logged-in and logged-out users need account access');
const navJS=read('academy/course-share.js');
assert.match(navJS,/Mój profil.*\/konto/,'Standalone offers must link to profile');
assert.match(navJS,/Moje kursy.*\/moje-kursy/,'Standalone offers must link to library');
assert.match(navJS,/function initializeAcademyMobileMenu/,'Mobile dropdown must have accessible close behaviour');
const premium=read('academy/premium-theme.css');
assert.match(premium,/@media\(min-width:761px\) and \(max-width:1070px\)/,'Tablet header must switch to compact menu');
const profile=readFileSync('app/konto.tsx','utf8');
assert.match(profile,/Twój profil/,'Logged-in profile has own title');
assert.match(profile,/\(!activeEmail\|\|mode==='new-password'\)/,'Login form must be hidden from active sessions');
assert.match(profile,/Ustawienia profilu/);
const library=readFileSync('app/moje-kursy.tsx','utf8');
assert.match(library,/<AcademyGrid>\{subset\.map\(courseCard\)\}<\/AcademyGrid>/,'Owned courses use the responsive card grid');
assert.match(library,/columns=courseColumns\(width\)/,'Paging uses the same breakpoints as the cards');
const signouts=[...library.matchAll(/>Wyloguj się<\/Text>/g)].length;
assert.equal(signouts,1,'No duplicate sign-out controls');
if(errors.length){
 console.error('Navigation/route issues ('+errors.length+'):');
 for(const error of errors.slice(0,100))console.error(' - '+error);
 process.exit(1);
}
console.log('✓ '+files.length+' public course offers, '+categories.length+' categories and accounting offer: shared profile/menu assets and local links verified');
console.log('✓ Mobile course navigation, logged-in account dashboard, readable library and single sign-out');
