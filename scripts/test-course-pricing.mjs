#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const snapshot=JSON.parse(read('content/course-pricing-2026-11-15.json')),home=read('public/academy/index.html');
const i=home.indexOf('const COURSES='),end=home.indexOf('];',i),catalog=JSON.parse(home.slice(i+14,end+1));
const prices=new Map(snapshot.courses.map(x=>[x.slug,x]));
assert.equal(catalog.length,81);
assert.equal(snapshot.course_count,82);
assert.equal(snapshot.change_count,80);
assert.equal(catalog[0].id,'excel-skroty');
assert.equal(catalog[0].price,0);
const santaTitle='Bądź lepszym Świętym Mikołajem';
const santa=catalog.find(c=>c.id==='swiety-mikolaj');
assert.equal(santa?.title,santaTitle,'Santa course should have an inviting title in the catalogue');
assert.equal(santa?.certificate_title_pl,santaTitle,'Santa certificate label should match the course name');
for(const santaPage of ['public/academy/kursy/swiety-mikolaj.html','public/academy/kategorie/rzemioslo-i-hobby.html']){
 const pageHtml=read(santaPage);
 assert(pageHtml.includes(santaTitle),'Updated Santa name missing from '+santaPage);
 assert(!pageHtml.includes('Wizyta Świętego Mikołaja — kurs świąteczny'),'Outdated Santa title found on '+santaPage);
}
assert.deepEqual(snapshot.free_courses_after_change.sort(),['excel-skroty','swiety-mikolaj','zaufany-wolontariusz']);
assert(!home.includes('class="excel-free-intro"'),'Free Excel must not duplicate its catalogue card with a hero banner');
assert(!home.includes('BEZPŁATNY KURS NA START'),'Free courses must use equal card styles');
assert(home.includes('Darmowe kursy na start')&&home.includes('free-starter-grid'),'Three free courses must share one featured catalogue row');
assert(!home.includes('Excel -30%')&&!home.includes('Excel tylko dziś'),'No fake discount or countdown allowed');
for(const course of catalog){
 const record=prices.get(course.id);
 assert(record&&record.published,'Unknown or draft course '+course.id);
 assert.equal(course.price*100,record.price_after_grosze,'Wrong static catalog price '+course.id);
 if(record.price_before_grosze>0&&course.id!=='excel-skroty'){
  const reduction=100*(1-record.price_after_grosze/record.price_before_grosze);
  assert(reduction>=28&&reduction<=33,'Course not about 30% cheaper '+course.id+' ('+reduction.toFixed(1)+'%)');
 }
 const seo=read('public/academy/kursy/'+course.id+'.html');
 const label=course.id==='excel-skroty'?'Bezpłatny kurs: 0 zł':course.id==='zaufany-wolontariusz'?'kurs za 0 zł':'Cena katalogowa: '+course.price+' zł';
 assert(seo.includes(label),'SEO price mismatch for '+course.id);
 assert(!seo.includes('−30%'),'No promotion unless 30-day previous price is verified');
}
for(const category of ['budownictwo','rzemioslo-i-hobby','technologie-i-logistyka','biznes-i-praca','rodzina-i-rozwoj','dom-i-codziennosc']){
 const page=read('public/academy/kategorie/'+category+'.html');
 const matches=[...page.matchAll(/<a href="\/academy\/kursy\/([a-z0-9_-]+)\.html">[\s\S]*?<small>(\d+) zł<\/small><\/a>/g)];
 assert(matches.length>0,'Missing links for '+category);
 for(const [,slug,price] of matches)assert.equal(Number(price)*100,prices.get(slug)?.price_after_grosze,'Category price mismatch '+slug);
}
assert.equal(prices.get('ksiegowosc-od-podstaw').published,false,'Historical price snapshot from 15 November is intentionally unchanged');
assert(!home.includes('class="acct-feature"'),'Accounting must never occupy a promotional block on the homepage');
assert(home.includes('const ACCOUNTING_CATALOG='),'Accounting must have a regular course-card definition');
assert(home.includes('c.id!==ACCOUNTING_CATALOG.id'),'Accounting must not be featured in the homepage initial selection');
assert(read('public/academy/kategorie/biznes-i-praca.html').includes('/academy/ksiegowosc-od-podstaw.html'),'Accounting must be grouped under Biznes i praca');
assert(home.includes('"title":"Księgowość od podstaw"'),'Public accounting course should have a concise name');
assert(!home.includes('Księgowość od podstaw — Encyklopedia'),'Old accounting course title must not appear in main catalogue');
assert(!read('public/academy/ksiegowosc-od-podstaw.html').toLowerCase().includes('wczesny dostęp'),'Accounting landing should not advertise early access');
assert(!read('app/kup.tsx').includes('developmentConsent'),'Accounting checkout should use normal course terms');
assert.equal(prices.get('ksiegowosc-od-podstaw').price_after_grosze,69900);
assert(read('app/kup.tsx').includes("functions.invoke('ta-enroll-free'"),'Free course needs authenticated server-only grant');
assert(read('src/courseQuote.ts').includes('ta_effective_course_price'),'Paid checkout price source must remain server-authoritative');
assert(read('public/academy/kursy/excel-skroty.html').includes('Odbierz bezpłatny kurs Excel'));
console.log('✓ Pricing: 80 revised prices, Excel 0 zł first, 81 course SEO pages, 6 category pages, safe free/paid checkout routes.');
