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
assert.deepEqual(snapshot.free_courses_after_change.sort(),['excel-skroty','swiety-mikolaj','zaufany-wolontariusz']);
assert(home.includes('Excel od zera do analizy danych — 0 zł'),'Free Excel must be permanently visible in the hero');
assert(home.includes('BEZPŁATNY KURS NA START'),'Excel should appear featured');
assert(home.includes('aria-label="Bezpłatny kurs Excel od podstaw'),'Free Excel hero link needs proper accessible name');
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
assert.equal(prices.get('ksiegowosc-od-podstaw').published,false,'Do not auto-publish accounting');
assert.equal(prices.get('ksiegowosc-od-podstaw').price_after_grosze,69900);
assert(read('app/kup.tsx').includes("functions.invoke('ta-enroll-free'"),'Free course needs authenticated server-only grant');
assert(read('src/courseQuote.ts').includes('ta_effective_course_price'),'Paid checkout price source must remain server-authoritative');
assert(read('public/academy/kursy/excel-skroty.html').includes('Odbierz bezpłatny kurs Excel'));
console.log('✓ Pricing: 80 revised prices, Excel 0 zł first, 81 course SEO pages, 6 category pages, safe free/paid checkout routes.');
