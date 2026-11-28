'use strict';

const academySections = [
  ['Kursy','/academy/index.html#kursy'],
  ['Moje kursy','/moje-kursy'],
  ['Jak to działa','/academy/index.html#jak-dziala'],
  ['Dyplomy','/moje-dyplomy'],
  ['Dla firm','/firma']
];

const accountingRelease = Object.freeze({
  title:'Kurs w trakcie dopracowania',
  summary:'Wydanie w trakcie dopracowania. Dokument po egzaminie: wzór testowy.',
  body:'Kupujesz dostęp do bieżącego wydania materiałów. Po zaliczeniu egzaminu w tym wydaniu otrzymasz dokument oznaczony jako „wzór testowy”.'
});
function courseRelease(slug){return slug==='ksiegowosc-od-podstaw'?accountingRelease:null;}
function courseReleaseMarkup(slug){
  const release=courseRelease(slug);
  return release?'<aside class="ta-release-notice" data-course-release="'+slug+'" role="note"><strong>'+release.title+'</strong><p>'+release.body+'</p></aside>':'';
}
function courseReleaseSummaryMarkup(slug){
  const release=courseRelease(slug);
  return release?'<p class="ta-release-summary" data-course-release="'+slug+'" role="note">'+release.summary+'</p>':'';
}

// Only these static labels and destinations are inserted into the header.
function academyMenuMarkup(signedIn,pathname='') {
  const links=academySections.map(([label,url])=>
    '<a href="'+url+'"'+(url===pathname?' aria-current="page"':'')+'>'+label+'</a>').join('');
  // The destination verifies the session. Public pages must not guess whether
  // somebody is signed in, or rename the same destination across screens.
  const profile='Moje konto';
  const support='<a class="nav-help" href="/pomoc"><span class="nav-help-heart" aria-hidden="true">❤️</span><span class="nav-help-copy">Nie jesteś sam<small>Bezpłatna pomoc</small></span></a>';
  return '<nav class="ta-academy-bar" aria-label="Nawigacja akademii" data-academy-shortcuts>'+
    '<div class="ta-academy-inner"><a class="ta-academy-brand" href="/academy/index.html" aria-label="TRENERKI Academy">'+
    '<span class="ta-academy-mark" aria-hidden="true">T.</span><span>TRENERKI <small>ACADEMY</small></span></a>'+
    '<div class="ta-academy-links">'+links+'</div>'+
    '<details class="ta-academy-mobile"><summary>Menu <span aria-hidden="true">▾</span></summary><div>'+links+'<a href="/pomoc">Nie jesteś sam</a></div></details>'+
    '<div class="ta-academy-actions">'+support+'<a class="ta-academy-profile" href="/konto"'+(pathname==='/konto'?' aria-current="page"':'')+'>'+profile+'</a></div></div></nav>';
}

function bindAcademyDisclosure(menu) {
  if(!menu)return ()=>{};
  const closeOutside=event=>{if(menu.open&&!menu.contains(event.target))menu.open=false;};
  const escape=event=>{if(event.key==='Escape'&&menu.open){menu.open=false;menu.querySelector('summary').focus();}};
  const resize=()=>{if(window.innerWidth>1070)menu.open=false;};
  const navigate=event=>{if(event.target.closest('a'))menu.open=false;};
  document.addEventListener('pointerdown',closeOutside);
  document.addEventListener('keydown',escape);
  window.addEventListener('resize',resize);
  menu.addEventListener('click',navigate);
  return ()=>{
    document.removeEventListener('pointerdown',closeOutside);
    document.removeEventListener('keydown',escape);
    window.removeEventListener('resize',resize);
    menu.removeEventListener('click',navigate);
  };
}

function initializeAcademyShortcuts() {
  if (!location.pathname.startsWith('/academy/')) return;
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
  initializeAcademyMobileMenu();
}
// Expo and the static export consume the same navigation markup as the public pages.
if(typeof module!=='undefined'&&module.exports){
  module.exports={academyMenuMarkup,bindAcademyDisclosure,courseRelease,courseReleaseMarkup,courseReleaseSummaryMarkup};
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
