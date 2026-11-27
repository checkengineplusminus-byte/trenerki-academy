'use strict';

const academySections = [
  ['Kursy','/academy/index.html#kursy'],
  ['Moje kursy','/moje-kursy'],
  ['Dyplomy','/moje-dyplomy'],
  ['Dla firm','/firma'],
  ['Pomoc','/pomoc']
];

// Only these static labels and destinations are inserted into the header.
function academyMenuMarkup(signedIn,pathname='') {
  const links=academySections.map(([label,url])=>
    '<a href="'+url+'"'+(url===pathname?' aria-current="page"':'')+'>'+label+'</a>').join('');
  const profile=signedIn===false?'Zaloguj się':'Mój profil';
  return '<nav class="ta-academy-bar" aria-label="Nawigacja akademii" data-academy-shortcuts>'+
    '<div class="ta-academy-inner"><a class="ta-academy-brand" href="/academy/index.html" aria-label="TRENERKI Academy">'+
    '<span class="ta-academy-mark" aria-hidden="true">T.</span><span>TRENERKI <small>ACADEMY</small></span></a>'+
    '<div class="ta-academy-links">'+links+'</div>'+
    '<details class="ta-academy-mobile"><summary>Menu <span aria-hidden="true">▾</span></summary><div>'+links+'</div></details>'+
    '<a class="ta-academy-profile" href="/konto"'+(pathname==='/konto'?' aria-current="page"':'')+'>'+profile+'</a></div></nav>';
}

function bindAcademyDisclosure(menu) {
  if(!menu)return ()=>{};
  const closeOutside=event=>{if(menu.open&&!menu.contains(event.target))menu.open=false;};
  const escape=event=>{if(event.key==='Escape'&&menu.open){menu.open=false;menu.querySelector('summary').focus();}};
  const resize=()=>{if(window.innerWidth>1070)menu.open=false;};
  document.addEventListener('pointerdown',closeOutside);
  document.addEventListener('keydown',escape);
  window.addEventListener('resize',resize);
  return ()=>{
    document.removeEventListener('pointerdown',closeOutside);
    document.removeEventListener('keydown',escape);
    window.removeEventListener('resize',resize);
  };
}

function initializeAcademyShortcuts() {
  if (!/^\/academy\/(?:kursy\/|kategorie\/|ksiegowosc-od-podstaw\.html)/.test(location.pathname)) return;
  const header=document.querySelector('body > header');
  if(!header)return;
  if(!header.querySelector('.ta-academy-bar'))header.innerHTML=academyMenuMarkup();
  header.className='ta-course-header';
  bindAcademyDisclosure(header.querySelector('details'));
}
// Close the responsive dropdown on outside interaction, Escape and desktop resize.
function initializeAcademyMobileMenu() {
  const menu = document.querySelector('header .mobile-nav');
  if (!menu) return;
  document.addEventListener('pointerdown', (event) => {
    if (menu.open && event.target instanceof Node && !menu.contains(event.target)) menu.open = false;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      menu.querySelector('summary')?.focus();
    }
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 1070 && menu.open) menu.open = false;
  }, {passive:true});
}
function initializeAcademyNavigation() {
  initializeAcademyShortcuts();
  const catalogueHeader=document.querySelector('body > header.header');
  if(catalogueHeader&&document.getElementById('app')){
    catalogueHeader.insertAdjacentHTML('afterbegin',academyMenuMarkup());
    bindAcademyDisclosure(catalogueHeader.querySelector('.ta-academy-mobile'));
  }
  initializeAcademyMobileMenu();
}
// Expo and the static export consume the same navigation markup as the public pages.
if(typeof module!=='undefined'&&module.exports){
  module.exports={academyMenuMarkup,bindAcademyDisclosure};
}else if(typeof document!=='undefined'){
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded',initializeAcademyNavigation,{once:true});
} else {
  initializeAcademyNavigation();
}


document.addEventListener('click', async (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest('button[data-share-course]');
  const slug = button?.dataset.shareCourse;
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || button.disabled) return;

  const status = button.nextElementSibling;
  const url = new URL(`/academy/kursy/${slug}.html`, 'https://trenerki.com').href;
  const title = document.querySelector('main h1')?.textContent?.trim() || 'TRENERKI Academy';
  button.disabled = true;
  status.replaceChildren();

  try {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      status.textContent = 'Link skopiowany.';
    } catch {
      const label = document.createElement('label');
      const input = document.createElement('input');
      label.textContent = 'Skopiuj adres kursu';
      input.type = 'url';
      input.value = url;
      input.readOnly = true;
      label.append(input);
      status.append(label);
      input.focus();
      input.select();
    }
  } finally {
    button.disabled = false;
  }
});

}
