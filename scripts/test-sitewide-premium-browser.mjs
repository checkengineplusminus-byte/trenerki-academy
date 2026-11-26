#!/usr/bin/env node
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=(process.argv[2]||'http://127.0.0.1:8787').replace(/\/+$/,'');
const browser=await chromium.launch({headless:true});
const paths=[
 {path:'/academy/regulamin.html',type:'info',name:'regulamin'},
 {path:'/academy/prywatnosc.html',type:'info',name:'prywatnosc'},
 {path:'/academy/certyfikaty.html',type:'info',name:'certyfikaty'},
 {path:'/academy/odstapienie.html',type:'info',name:'odstapienie'},
 {path:'/academy/kontakt.html',type:'info',name:'kontakt'},
 {path:'/academy/zrodla-zdjec.html',type:'info',name:'zrodla-zdjec'},
 {path:'/academy/program-afiliacyjny.html',type:'affiliate',name:'affiliate'},
 {path:'/academy/regulamin-afiliacyjny.html',type:'affiliate',name:'affiliate-terms'},
 {path:'/academy/prywatnosc-afiliacja.html',type:'affiliate',name:'affiliate-privacy'},
 {path:'/academy/kategorie/biznes-i-praca.html',type:'listing',name:'category'},
 {path:'/academy/kursy/ciesla-przygotowanie-czeladnicze.html',type:'listing',name:'course'},
 {path:'/academy/kursy/ai-bez-tajemnic.html',type:'listing',name:'ai-course'}
];
let failures=0;
for(const viewport of [{name:'iphone',w:390,h:844,mobile:true},{name:'desktop',w:1350,h:900,mobile:false}]){
 const context=await browser.newContext({viewport:{width:viewport.w,height:viewport.h},isMobile:viewport.mobile,hasTouch:viewport.mobile});
 const page=await context.newPage();
 try{
  for(const item of paths){
   try{
    const response=await page.goto(root+item.path,{waitUntil:'domcontentloaded',timeout:20000});
    assert.equal(response?.status(),200,item.path+' HTTP success');
    const link=page.locator('link[href*="/academy/sitewide-premium.css"]');
    const direct=await link.count();
    if(item.type==='listing'){
      assert(direct>0||await page.locator('link[href*="/academy/course-share.css"]').count()>0,
        item.path+' must load premium style directly or via current course-share.css');
    }else assert.equal(direct,1,item.path+' must include one direct premium stylesheet');
    const shell=page.locator('header.ta-unified-header');
    await shell.waitFor({state:'visible',timeout:8000});
    assert.equal(await page.locator('header.ta-unified-header').count(),1,item.path+' unified header');
    const menu=page.locator('header.ta-unified-header details.ta-unified-menu');
    if(viewport.mobile)await menu.locator('summary').click();
    const nav=page.locator('header.ta-unified-header '+(viewport.mobile?'.ta-unified-mobile':'.ta-unified-desktop'));
    assert(await nav.getByRole('link',{name:'Dla firm'}).isVisible(),item.path+' company link');
    assert(await nav.getByRole('link',{name:'Mój profil'}).isVisible(),item.path+' profile link');
    assert(await nav.getByRole('link',{name:'Nie jesteś sam'}).isVisible(),item.path+' support link');
    if(viewport.mobile){
      await page.keyboard.press('Escape');
      assert.equal(await menu.getAttribute('open'),null,item.path+' Escape closes dropdown');
    }
    const styleResult=await page.evaluate(()=>{
     const el=document.body,head=document.querySelector('body > header');
     const s=getComputedStyle(el),h=head?getComputedStyle(head):null;
     return {body:s.backgroundColor,headBackground:h?.backgroundImage||'',headColor:h?.color||'',text:s.color,
      cssLoaded:!![...document.styleSheets].find(s=>s.href?.includes('sitewide-premium.css')||s.href?.includes('course-share.css')),
      scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,
      main:document.querySelector('main')?.textContent?.length||0
     };
    });
    assert(styleResult.cssLoaded,item.path+' premium CSS not loaded');
    assert(styleResult.main>80,item.path+' content not rendered');
    assert(styleResult.scroll<=styleResult.client+3,item.path+' horizontal overflow '+JSON.stringify(styleResult));
    if(item.type==='info'||item.type==='affiliate'){
     assert.equal(styleResult.body,'rgb(245, 248, 252)',item.path+' background should be neutral');
     if(item.name!=='zrodla-zdjec')assert(styleResult.headBackground.includes('gradient'),item.path+' navy header missing');
     assert(await page.locator('main h1').first().isVisible(),item.path+' visible heading');
    }
    if(item.type==='affiliate'){
     assert(await page.locator('.ta-unified-header .ta-affiliate-mark').isVisible(),item.path+' golden brand mark');
     if(item.name==='affiliate'){
      const button=page.getByRole('link',{name:'Dołącz do programu partnerskiego'});
      assert.equal(await button.getAttribute('href'),'/partner');
      assert((await button.evaluate(el=>getComputedStyle(el).backgroundImage)).includes('gradient'),'Gold CTA missing');
     }
    }
    if(item.type==='listing'){
     const back=page.locator('main .back');
     assert(await back.isVisible(),item.path+' breadcrumb');
     const head=await page.locator('body > header').evaluate(el=>getComputedStyle(el).backgroundImage);
     assert(head.includes('gradient'),item.path+' navy header');
    }
    if(['regulamin','affiliate','category','course'].includes(item.name)){
     await page.screenshot({path:'/tmp/trenerki-sitewide-'+viewport.name+'-'+item.name+'.png',fullPage:true});
    }
    console.log('✓ '+viewport.name+' '+item.name);
   }catch(e){failures++;console.error('✗ '+viewport.name+' '+item.name+': '+(e.stack||e));
    try{await page.screenshot({path:'/tmp/trenerki-sitewide-'+viewport.name+'-'+item.name+'-error.png'})}catch{}
   }
  }
 }finally{await context.close()}
}
await browser.close();
if(failures)process.exitCode=1;
