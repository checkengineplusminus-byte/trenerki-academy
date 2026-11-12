(function(){
'use strict';
if(typeof window==='undefined'||window.__trenerkiAdsReady)return;
window.__trenerkiAdsReady=true;
var ID='AW-16892618214',KEY='trenerki_ads_consent_v1',choice=null,active=false;
try{var v=localStorage.getItem(KEY);if(v==='yes'||v==='no')choice=v;}catch(_){}
function consent(value){
 if(typeof window.gtag==='function')window.gtag('consent','update',{
  ad_storage:value,analytics_storage:value,ad_user_data:value,ad_personalization:'denied'
 });
}
function load(){
 if(active)return;active=true;
 window.dataLayer=window.dataLayer||[];
 window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
 window.gtag('consent','default',{ad_storage:'denied',analytics_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
 consent('granted');
 window.gtag('js',new Date());
 window.gtag('config',ID);
 var tag=document.createElement('script');tag.async=true;
 tag.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(ID);
 document.head.appendChild(tag);
}
function save(value){
 choice=value;
 try{localStorage.setItem(KEY,value)}catch(_){}
 if(value==='yes')load();else consent('denied');
 var banner=document.getElementById('trenerki-ads-banner');if(banner)banner.remove();
}
function btn(text,fn,primary){
 var b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',fn);
 b.style.cssText='min-height:42px;padding:9px 16px;border-radius:9px;cursor:pointer;font:700 13px system-ui,sans-serif;border:1px solid #cad8c9;background:'+(primary?'#173e2c;color:white':'white;color:#173e2c')+';';
 return b;
}
function banner(){
 if(!document.body||document.getElementById('trenerki-ads-banner'))return;
 var el=document.createElement('section');el.id='trenerki-ads-banner';el.setAttribute('role','region');
 el.setAttribute('aria-label','Zgoda na pomiary reklamowe');
 el.style.cssText='position:fixed;bottom:12px;left:12px;right:12px;max-width:850px;margin:auto;z-index:2147483640;background:#fff;color:#173228;border:1px solid #cbd9ca;border-radius:14px;box-shadow:0 12px 40px #0003;padding:18px 22px;box-sizing:border-box;font:14px/1.6 system-ui,sans-serif;';
 var p=document.createElement('div');
 p.innerHTML='<strong style="font-size:16px">Prywatność i pliki cookie</strong><p style="margin:7px 0 12px">Za Twoją zgodą używamy Google Ads do mierzenia skuteczności reklam kursów. Odmowa nie ogranicza korzystania ze strony. Nie personalizujemy reklam. <a style="color:#145d3b;text-decoration:underline" href="/academy/prywatnosc.html#s8">Dowiedz się więcej</a>.</p>';
 el.appendChild(p);
 var row=document.createElement('div');row.style.cssText='display:flex;justify-content:flex-end;gap:9px;flex-wrap:wrap;';
 row.appendChild(btn('Odrzuć',function(){save('no')},false));
 row.appendChild(btn('Akceptuję',function(){save('yes')},true));
 el.appendChild(row);document.body.appendChild(el);
}
function ready(){
 if(!document.body)return;
 var settings=btn('Ustawienia plików cookie',banner,false);
 settings.style.margin='10px';settings.style.fontSize='12px';
 (document.querySelector('footer')||document.body).appendChild(settings);
 if(!choice)banner();
}
if(choice==='yes')load();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();
