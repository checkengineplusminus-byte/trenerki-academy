#!/usr/bin/env node
// Static Expo Hosting needs actual HTML for every short numeric URL.
// Generate a bounded set as part of each web build, never commit thousands of pages.
// The real owner/code is resolved by ta-affiliate-resolve at request time.
import {mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
const root=resolve('public');
const max=2000; // Current deployment capacity; increase before partner #2001.
for(let id=2;id<=max;id++){
 const doc=`<!doctype html><html lang="pl"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>TRENERKI — link partnerski</title>
<meta http-equiv="refresh" content="0;url=/referral?affiliateNumber=${id}">
</head><body><p>Otwieramy kursy Trenerki…</p>
<script>(function(){const q=new URLSearchParams(location.search),c=q.get('course')||'';
location.replace('/referral?affiliateNumber=${id}'+(/^[a-z0-9][a-z0-9_-]{1,79}$/.test(c)?'&course='+encodeURIComponent(c):''));})();</script>
<noscript><a href="/referral?affiliateNumber=${id}">Otwórz kursy Trenerki</a></noscript>
</body></html>`;
 // Both forms are required because custom CDN may route clean URLs to a file or directory.
 const dir=join(root,String(id));mkdirSync(dir,{recursive:true});
 writeFileSync(join(root,id+'.html'),doc,'utf8');
 writeFileSync(join(dir,'index.html'),doc,'utf8');
}
console.log('✓ Prepared numeric affiliate paths /1–/'+max+' for Expo Hosting; no redirects for normal app routes');
