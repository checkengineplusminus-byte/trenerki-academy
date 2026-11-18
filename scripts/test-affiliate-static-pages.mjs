#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const valid=[2,7,15,99,100,499,500];
for(const number of valid){
 const one=readFileSync('public/'+number+'.html','utf8');
 const two=readFileSync('public/'+number+'/index.html','utf8');
 assert.equal(one,two,'File and directory routes disagree: '+number);
 assert(one.includes('affiliateNumber='+number));
 assert(one.includes("location.replace('/referral?affiliateNumber="+number));
 assert(!one.includes('TA000'),'Short page must never embed a real partner code');
 assert(one.includes('noindex,nofollow'));
}
for(const route of ['konto','admin','partner','nauka','kup']){
 assert(!existsSync('public/'+route+'.html'),'Do not override existing app route '+route);
 assert(!existsSync('public/'+route+'/index.html'),'Do not override existing app route '+route);
}
const app=JSON.parse(readFileSync('app.json','utf8'));
assert(!app.expo.plugins.some(p=>Array.isArray(p)&&p[1]?.redirects?.some(r=>r.source==='/'+'[affiliateNumber]')),'Wildcard redirect could hijack the login and admin');
const partner=readFileSync('app/partner.tsx','utf8');
assert(partner.includes("https://trenerki.com/'+shortNumber"));
assert(partner.includes('trenerki-logo-partner.svg'));
console.log('✓ Short URL generator: /2 /7 /15 /99 /100 /499 /500 and no reserved route collisions');
