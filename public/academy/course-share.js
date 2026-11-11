'use strict';

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
