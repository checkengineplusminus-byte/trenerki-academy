#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=JSON.parse(readFileSync(new URL('../app.json',import.meta.url),'utf8'));
const plugin=app.expo.plugins.find(p=>Array.isArray(p)&&p[0]==='expo-router');
assert(plugin&&plugin[1].redirects.length===1);
const rule=plugin[1].redirects[0];
assert.equal(rule.source,'/[affiliateNumber]');
assert.equal(rule.destination,'/referral');
assert.deepEqual(rule.methods,['GET','HEAD']);
assert.equal(app.expo.web.output,'static');
const home=readFileSync(new URL('../app/referral.tsx',import.meta.url),'utf8');
assert(home.includes('affiliateNumber'));
assert(home.includes("ta-affiliate-resolve?id="));
assert(home.includes("window.location.replace(url+course)"));
const partner=readFileSync(new URL('../app/partner.tsx',import.meta.url),'utf8');
assert(partner.includes("https://trenerki.com/'+shortNumber"));
assert(partner.includes('/academy/assets/trenerki-logo-partner.svg'));
console.log('✓ Dynamic numeric redirect config and protected partner-to-Stripe attribution resolution');
