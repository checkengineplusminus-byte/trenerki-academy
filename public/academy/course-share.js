'use strict';

/* One public navigation system for all standalone course, category,
   legal, contact and affiliate pages. The catalogue has its own header.
   Do not read sessions or use backend data in navigation. */
function initializeAcademyShortcuts() {
  const path=location.pathname;
  if (!path.startsWith('/academy/') || path==='/academy/' ||
      path==='/academy/index.html' || path.endsWith('/zaufany-wolontariusz-nauka.html')) return;
  if (document.querySelector('[data-ta-unified-header]')) return;
  const body=document.body;
  if (!body) return;
  const header=document.createElement('header');
  header.className='ta-unified-header';
  header.dataset.taUnifiedHeader='true';
  const inner=document.createElement('div');
  inner.className='ta-unified-inner';
  const brand=document.createElement('a');
  brand.className='ta-unified-brand';
  brand.href='/academy/index.html';
  brand.setAttribute('aria-label','TRENERKI Academy — strona główna');
  const mark=document.createElement('span');
  mark.className='ta-unified-mark ta-affiliate-mark';
  mark.textContent='T.';
  mark.setAttribute('aria-hidden','true');
  const wordmark=document.createElement('span');
  wordmark.className='ta-unified-wordmark';
  wordmark.textContent='TRENERKI';
  const suffix=document.createElement('small');
  suffix.textContent='ACADEMY';
  wordmark.append(suffix);
  brand.append(mark,wordmark);
  const links=[
    ['Kursy','/academy/index.html#kursy'],
    ['Dla firm','/firma'],
    ['Moje kursy','/moje-kursy'],
    ['Mój profil','/konto'],
    ['Nie jesteś sam','/pomoc']
  ];
  function makeNav(extraClass) {
    const nav=document.createElement('nav');
    nav.className='ta-unified-links '+extraClass;
    nav.dataset.academyShortcuts='true';
    nav.setAttribute('aria-label','Menu akademii');
    for (const [label,href] of links) {
      const a=document.createElement('a');
      a.textContent=label;
      a.href=href;
      if (label==='Mój profil') a.className='ta-unified-profile';
      nav.append(a);
    }
    return nav;
  }
  const desktop=makeNav('ta-unified-desktop');
  const menu=document.createElement('details');
  menu.className='ta-unified-menu';
  const toggle=document.createElement('summary');
  toggle.textContent='Menu';
  const mobile=makeNav('ta-unified-mobile');
  menu.append(toggle,mobile);
  inner.append(brand,desktop,menu);
  header.append(inner);
  body.classList.add('ta-shell-active');
  body.insertBefore(header,body.firstChild);
  mobile.addEventListener('click',event=>{
    if (event.target instanceof Element && event.target.closest('a')) menu.open=false;
  });
  document.addEventListener('pointerdown',event=>{
    if (menu.open && event.target instanceof Node && !menu.contains(event.target)) menu.open=false;
  });
  document.addEventListener('keydown',event=>{
    if (menu.open && event.key==='Escape') { menu.open=false;toggle.focus(); }
  });
  window.addEventListener('resize',()=>{
    if (menu.open && window.innerWidth>940) menu.open=false;
  },{passive:true});
}
// The dynamic catalogue keeps its original independent mobile search/header.
function initializeAcademyMobileMenu() {
  const menu=document.querySelector('header .mobile-nav');
  if (!menu) return;
  document.addEventListener('pointerdown',event=>{
    if (menu.open && event.target instanceof Node && !menu.contains(event.target)) menu.open=false;
  });
  document.addEventListener('keydown',event=>{
    if (menu.open && event.key==='Escape') {
      menu.open=false;menu.querySelector('summary')?.focus();
    }
  });
  window.addEventListener('resize',()=>{
    if (menu.open && window.innerWidth>1070) menu.open=false;
  },{passive:true});
}
function initializeAcademyNavigation() {
  initializeAcademyShortcuts();
  initializeAcademyMobileMenu();
}
if (document.readyState==='loading')
  document.addEventListener('DOMContentLoaded',initializeAcademyNavigation,{once:true});
else initializeAcademyNavigation();

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
