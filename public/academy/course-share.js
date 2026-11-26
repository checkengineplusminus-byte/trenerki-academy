'use strict';

/* Shared, accessible navigation for the standalone public course and
   category pages. No session inspection and no backend access. */
function initializeAcademyShortcuts() {
  if (!/^\/academy\/(?:kursy\/|kategorie\/|ksiegowosc-od-podstaw\.html)/.test(location.pathname)) return;
  const header = document.querySelector('body > header');
  if (!header || header.querySelector('[data-academy-shortcuts]')) return;
  const host = header.querySelector('.top') || header;
  // The dedicated AI offer page has a legacy navigation. Replace it with
  // the same shortcuts as the rest, avoiding two competing account menus.
  const existing = host.querySelector('nav.nav');
  if (existing) existing.remove();
  const links = [
    ['Kursy','/academy/index.html#kursy'],
    ['Moje kursy','/moje-kursy'],
    ['Mój profil','/konto'],
    ['Pomoc','/pomoc']
  ];
  const nav = document.createElement('nav');
  nav.className = 'ta-site-shortcuts';
  nav.dataset.academyShortcuts = 'true';
  nav.setAttribute('aria-label','Menu akademii');
  for (const [label,url] of links) {
    const link = document.createElement('a');
    link.href = url;
    link.textContent = label;
    if (label === 'Mój profil') link.className = 'ta-site-profile';
    nav.append(link);
  }
  header.classList.add('ta-site-header');
  host.append(nav);
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded',initializeAcademyShortcuts,{once:true});
} else {
  initializeAcademyShortcuts();
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
