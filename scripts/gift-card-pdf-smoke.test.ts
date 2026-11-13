import { PDFDocument, PDFDict, PDFName, PDFString } from 'npm:pdf-lib@1.17.1';
import { buildGiftCardPdf, bytesBase64, giftCardFilename, buildCourseGiftCardPdf, courseGiftCardFilename, giftCardExpiryLabel, type GiftCard, type CourseGiftCard } from '../supabase/functions/_shared/gift-card-pdf.ts';

const check = (value: unknown, message: string) => { if (!value) throw new Error(message); };
async function checkActivationLink(bytes: Uint8Array, code: string) {
  const document = await PDFDocument.load(bytes);
  const annotations = document.getPage(0).node.Annots();
  check(annotations?.size() === 1, 'Exactly one clickable activation link is required');
  const annotation = annotations!.lookup(0, PDFDict);
  check(annotation.lookup(PDFName.of('Subtype'), PDFName).asString() === '/Link', 'PDF annotation is not a link');
  const action = annotation.lookup(PDFName.of('A'), PDFDict);
  check(action.lookup(PDFName.of('S'), PDFName).asString() === '/URI', 'PDF action is not a URI');
  const target = new URL(action.lookup(PDFName.of('URI'), PDFString).decodeText());
  check(target.origin === 'https://trenerki.com' && target.pathname === '/prezent', 'Activation link leaves TRENERKI');
  check(target.searchParams.get('code') === code && [...target.searchParams].length === 1, 'Activation link lost or changed the voucher code');
}
const card: GiftCard = {
  id: '00000000-0000-4000-8000-000000000001',
  code: 'TW-00000000000040008000000000000001',
  amount_grosze: 10000,
  gift_message: 'WZÓR - NIEWAŻNY. Dla Zofii: odważ się sięgać po nową wiedzę i spełniać swoje marzenia!',
  recipient_email: 'fundacja@example.com',
  transferable: true,
  created_at: '2026-11-13T12:00:00+01:00',
  expires_at: '2029-11-13T12:00:00+01:00',
};

Deno.test('value gift PDF uses a single A5 page, embedded fonts and an activation link', async () => {
  const bytes = await buildGiftCardPdf(card);
  check(new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-', 'Missing PDF header');
  check(bytes.length > 6000, 'Missing embedded font payload');
  const repeated = await buildGiftCardPdf(card);
  check(bytes.length === repeated.length && bytes.every((byte, i) => byte === repeated[i]), 'The same card must produce identical email attachment bytes');
  const document = await PDFDocument.load(bytes);
  check(document.getPageCount() === 1, 'Wrong number of pages');
  const size = document.getPage(0).getSize();
  check(size.width === 595.276 && size.height === 419.528, 'Expected A5 landscape');
  check(document.getPage(0).node.Annots()?.size() === 1, 'Activation link missing');
  await checkActivationLink(bytes, card.code);
  check(document.getTitle()?.includes('100 zł'), 'Face value missing from metadata');
  const roundTrip = Uint8Array.from(atob(bytesBase64(bytes)), c => c.charCodeAt(0));
  check(roundTrip.every((byte, i) => byte === bytes[i]), 'Attachment encoding changed bytes');
  check(giftCardFilename(card).endsWith(card.id + '.pdf'), 'Filename is not unique per voucher');
});

Deno.test('long dedication and long recipient stay on one page', async () => {
  for (const gift_message of ['Żółw źdźbło ąćęłńóśźż '.repeat(20).slice(0, 300), 'W'.repeat(300)]) {
    const bytes = await buildGiftCardPdf({
      ...card, gift_message, transferable: false, amount_grosze: 99999,
      recipient_email: 'a'.repeat(64) + '@' + 'b'.repeat(63) + '.' + 'c'.repeat(62) + '.pl',
    });
    check((await PDFDocument.load(bytes)).getPageCount() === 1, 'Long text added pages');
  }
});

Deno.test('invalid value or damaged code cannot create an apparently valid card', async () => {
  for (const invalid of [{ amount_grosze: 1 }, { amount_grosze: 100001 }, { code: '<script>' }, { expires_at: 'bad-date' }]) {
    let rejected = false;
    try { await buildGiftCardPdf({ ...card, ...invalid }); } catch { rejected = true; }
    check(rejected, 'Invalid gift card was rendered');
  }
});

const courseCard: CourseGiftCard = {
  id: card.id,
  code: 'TA-00000000000040008000000000000001',
  course_title: 'Księgowość od podstaw - Encyklopedia',
  gift_message: 'WZÓR - NIEWAŻNY. Życzymy Ci radości z każdej nowej umiejętności!',
  recipient_email: null,
  created_at: card.created_at,
  expires_at: card.expires_at,
};

Deno.test('free and paid course gift PDF carries a course title without an invented monetary value', async () => {
  for (const recipient_email of [null, 'uczestnik@example.com']) {
    const input = { ...courseCard, recipient_email };
    const bytes = await buildCourseGiftCardPdf(input);
    const repeated = await buildCourseGiftCardPdf(input);
    check(bytes.length === repeated.length && bytes.every((byte, i) => byte === repeated[i]), 'Course PDF attachment is not deterministic');
    const document = await PDFDocument.load(bytes);
    check(document.getPageCount() === 1, 'Course card must have one page');
    check(document.getPage(0).node.Annots()?.size() === 1, 'Course activation link missing');
    await checkActivationLink(bytes, input.code);
    check(document.getTitle()?.includes(courseCard.course_title), 'Course title missing');
    check(!document.getTitle()?.includes(' zł'), 'Course card has an invented face value');
    check(courseGiftCardFilename(input).endsWith(input.id + '.pdf'), 'Course filename is not unique');
  }
});

Deno.test('course title of 220 characters and dedication of 300 characters fit together', async () => {
  const inputs = [
    { course_title: ('Organizacja i zarządzanie zespołem podczas złożonych projektów budowlanych, logistycznych i księgowych. ').repeat(3).slice(0, 220), gift_message: ('Dla Zofii Żółkiewicz - odważnie rozwijaj swoje pasje. ').repeat(8).slice(0, 300) },
    { course_title: 'W'.repeat(220), gift_message: 'W'.repeat(300) },
  ];
  for (const input of inputs) {
    const bytes = await buildCourseGiftCardPdf({ ...courseCard, ...input });
    check((await PDFDocument.load(bytes)).getPageCount() === 1, 'Long course card overflowed');
  }
});

Deno.test('demo course card is clearly labelled and cannot accept a value-card code', async () => {
  const document = await PDFDocument.load(await buildCourseGiftCardPdf({ ...courseCard, is_demo: true }));
  check(document.getTitle()?.startsWith('DEMO - NIEWAŻNY'), 'Demo title missing');
  check(document.getSubject()?.includes('bez wartości'), 'Demo scope missing');
  let rejected = false;
  try { await buildCourseGiftCardPdf({ ...courseCard, code: card.code }); } catch { rejected = true; }
  check(rejected, 'A money card code was accepted by the course renderer');
});

Deno.test('validity label clearly identifies the stored future year in Polish', () => {
  check(giftCardExpiryLabel(card.expires_at) === 'Karta ważna do: 13 listopada 2029 r.', 'Validity date is not explicit');
  check(!giftCardExpiryLabel(card.expires_at).includes('2026'), 'Issue year replaced the expiry year');
  check(giftCardExpiryLabel('2029-11-13T23:30:00Z') === 'Karta ważna do: 14 listopada 2029 r.', 'Expiry ignores the Polish timezone');
  let rejected = false;
  try { giftCardExpiryLabel(''); } catch { rejected = true; }
  check(rejected, 'Missing expiry silently became a current date');
});

Deno.test('short codes and legacy codes keep their exact clickable PDF destination', async () => {
  for (const code of ['TW-0123456789ABCDEF', card.code]) {
    await checkActivationLink(await buildGiftCardPdf({ ...card, code }), code);
  }
  for (const code of ['TA-0123456789ABCDEF', courseCard.code]) {
    await checkActivationLink(await buildCourseGiftCardPdf({ ...courseCard, code }), code);
  }
  await checkActivationLink(await buildGiftCardPdf({ ...card, code: 'tw-0123 4567 89ab cdef' }), 'TW-0123456789ABCDEF');
});
