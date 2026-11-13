import { PDFDocument, PDFString, rgb, type PDFFont } from 'npm:pdf-lib@1.17.1';
import fontkit from 'npm:@pdf-lib/fontkit@1.1.1';
import { sans, serif } from '../ta-diplomas/lib/fonts.ts';

export type GiftCard = {
  id: string;
  code: string;
  amount_grosze: number;
  gift_message?: string | null;
  recipient_email: string;
  transferable: boolean;
  created_at: string;
  expires_at: string;
};

export type CourseGiftCard = {
  id: string;
  code: string;
  course_title: string;
  gift_message?: string | null;
  recipient_email: string | null;
  created_at: string;
  expires_at: string;
  is_demo?: boolean;
};

// A5 landscape. The 7 mm print margin also works when centred on an A4 sheet.
const pageSize: [number, number] = [595.276, 419.528];
const green = rgb(24 / 255, 59 / 255, 44 / 255);
const paper = rgb(0.991, 0.987, 0.966);
const pale = rgb(0.933, 0.953, 0.899);
const gold = rgb(0.65, 0.51, 0.28);
const muted = rgb(0.34, 0.43, 0.36);
const lineColor = rgb(0.78, 0.83, 0.73);
const decode = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
const clean = (value: string) => value.normalize('NFC').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();

// Split long unbroken words as well as natural prose. Nothing is truncated to fit.
function wrap(value: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of value.split(/\s+/)) {
    if (!word) continue;
    const candidate = line ? line + ' ' + word : word;
    if (font.widthOfTextAtSize(candidate, size) <= width) {
      line = candidate;
      continue;
    }
    if (font.widthOfTextAtSize(word, size) <= width) {
      if (line) lines.push(line);
      line = word;
      continue;
    }
    // Keep the available space before splitting an unusually long single token.
    if (line) line += ' ';
    for (const char of word) {
      if (line && font.widthOfTextAtSize(line + char, size) > width) {
        lines.push(line);
        line = '';
      }
      line += char;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fitLines(value: string, font: PDFFont, maxSize: number, width: number, maxLines: number, minSize: number) {
  let size = maxSize;
  let lines = wrap(value, font, size, width);
  while (size > minSize && lines.length > maxLines) {
    size = Math.max(minSize, size - 0.25);
    lines = wrap(value, font, size, width);
  }
  if (lines.length > maxLines) throw new Error('gift_card_text_too_long');
  return { lines, size };
}

export async function buildGiftCardPdf(card: GiftCard): Promise<Uint8Array> {
  const code = clean(card.code).toUpperCase();
  const message = clean(card.gift_message || '');
  const recipient = clean(card.recipient_email);
  const issued = new Date(card.created_at);
  const expiry = new Date(card.expires_at);
  if (!/^TW-[0-9A-F]{32}$/.test(code)) throw new Error('invalid_gift_card_code');
  if (!Number.isSafeInteger(card.amount_grosze) || card.amount_grosze < 2500 || card.amount_grosze > 100000) {
    throw new Error('invalid_gift_card_amount');
  }
  if (!Number.isFinite(issued.valueOf()) || !Number.isFinite(expiry.valueOf()) || expiry <= issued) {
    throw new Error('invalid_gift_card_dates');
  }
  if (Array.from(message).length > 300 || recipient.length > 200) throw new Error('gift_card_text_too_long');
  if (!card.transferable && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw new Error('invalid_gift_card_recipient');

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [body, display] = await Promise.all([
    pdf.embedFont(decode(sans), { subset: true }),
    pdf.embedFont(decode(serif), { subset: true }),
  ]);
  const amount = new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: card.amount_grosze % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(card.amount_grosze / 100).replace(/\u00a0/g, ' ') + ' zł';
  const validTo = new Intl.DateTimeFormat('pl-PL', {
    timeZone: 'Europe/Warsaw', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(expiry);
  pdf.setTitle('Karta podarunkowa ' + amount + ' | TRENERKI Academy');
  pdf.setAuthor('TRENERKI Academy');
  pdf.setSubject('Karta do wydruku. Jednorazowy kod do zasilenia salda kursów.');
  pdf.setLanguage('pl-PL');
  pdf.setCreationDate(issued);
  pdf.setModificationDate(issued);
  const page = pdf.addPage(pageSize);
  const text = (value: string, x: number, y: number, size: number, font = body, color = green) =>
    page.drawText(value, { x, y, size, font, color });
  const center = (value: string, x: number, y: number, size: number, font = body, color = green) =>
    text(value, x - font.widthOfTextAtSize(value, size) / 2, y, size, font, color);
  const rule = (x1: number, x2: number, y: number, color = lineColor, thickness = 0.6) =>
    page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, color, thickness });

  page.drawRectangle({ x: 0, y: 0, width: pageSize[0], height: pageSize[1], color: paper });
  page.drawRectangle({ x: 20, y: 20, width: 555.276, height: 379.528, borderColor: gold, borderWidth: 0.8 });
  page.drawRectangle({ x: 25, y: 25, width: 545.276, height: 369.528, borderColor: lineColor, borderWidth: 0.35 });

  // A restrained book emblem keeps the design crisp on an ordinary printer.
  page.drawSvgPath('M0 0 Q10 4 20 0 L20 24 Q10 28 0 24 Z M20 0 Q30 4 40 0 L40 24 Q30 28 20 24 Z',
    { x: 40, y: 375, borderColor: green, borderWidth: 0.9 });
  text('T R E N E R K I', 92, 363, 18, display);
  text('A C A D E M Y', 94, 347, 7.8, body, gold);

  let amountSize = 45;
  while (display.widthOfTextAtSize(amount, amountSize) > 206) amountSize -= 0.5;
  center(amount, 450, 347, amountSize, display);
  center('NA WYBRANE KURSY ONLINE', 450, 327, 7.2, body, muted);
  rule(40, 555, 315, gold);

  text('KARTA PODARUNKOWA', 40, 283, 24, display);
  text('Podaruj sobie nową umiejętność.', 41, 263, 11.5, body, muted);

  const dedication = message || 'Nowa wiedza. Nowe możliwości. Twój kolejny krok zaczyna się tutaj.';
  const fitted = fitLines(dedication, display, message ? 10.7 : 12, 510, 5, 7.75);
  const lineHeight = fitted.size + 2.3;
  const dedicationY = fitted.lines.length > 3 ? 247 : fitted.lines.length === 1 ? 228 : 236;
  fitted.lines.forEach((part, i) => text(part, 41, dedicationY - i * lineHeight, fitted.size, display));

  page.drawRectangle({ x: 39, y: 145, width: 517, height: 51, color: pale, borderColor: lineColor, borderWidth: 0.45 });
  center('TWÓJ KOD PODARUNKOWY', 297.5, 180, 7.3, body, muted);
  let codeSize = 13.6;
  while (body.widthOfTextAtSize(code, codeSize) > 488) codeSize -= 0.25;
  center(code, 297.5, 160, codeSize, body);

  const policy = card.transferable
    ? 'Możesz przekazać tę kartę innej osobie. Kod zasila konto tylko raz.'
    : 'Do odebrania na koncie: ' + recipient;
  const policyText = fitLines(policy, body, 8.4, 515, 2, 6.25);
  policyText.lines.forEach((part, i) => text(part, 40, 132 - i * (policyText.size + 2), policyText.size, body, muted));
  rule(40, 555, 109);

  const steps = [
    { x: 41, title: 'Załóż konto lub zaloguj się', lines: ['Otwórz trenerki.com/prezent.'] },
    { x: 215, title: 'Wpisz kod i odbierz środki', lines: ['Saldo pojawi się na Twoim koncie.'] },
    { x: 389, title: 'Wybierz kurs dla siebie', lines: ['Zapłać saldem; możesz dopłacić.'] },
  ];
  steps.forEach((step, i) => {
    page.drawCircle({ x: step.x + 5, y: 91, size: 5.5, color: green });
    center(String(i + 1), step.x + 5, 88.5, 6.8, body, paper);
    text(step.title, step.x + 15, 88.5, 7.1, body);
    step.lines.forEach((part, row) => text(part, step.x, 74 - row * 9, 7.1, body, muted));
  });
  text('Niewykorzystane środki pozostają na koncie na kolejne kursy.', 41, 60, 7.4, body, muted);
  rule(40, 555, 51);
  text('KARTĘ ODBIERZ DO ' + validTo, 41, 36, 7.4, body, muted);
  text('www.trenerki.com/prezent', 388, 35, 9.5, body);

  const target = 'https://trenerki.com/prezent?code=' + encodeURIComponent(code);
  const link = pdf.context.register(pdf.context.obj({
    Type: 'Annot', Subtype: 'Link', Rect: [387, 31, 554, 47], Border: [0, 0, 0],
    A: { Type: 'Action', S: 'URI', URI: PDFString.of(target) },
  }));
  page.node.addAnnot(link);
  return pdf.save({ addDefaultPage: false });
}

export function giftCardFilename(card: GiftCard) {
  const serial = card.id.replace(/[^a-zA-Z0-9-]/g, '');
  return 'TRENERKI-karta-' + serial + '.pdf';
}

/** Printable access to one specific course. A course gift has no face-value amount. */
export async function buildCourseGiftCardPdf(card: CourseGiftCard): Promise<Uint8Array> {
  const code = clean(card.code).toUpperCase();
  const title = clean(card.course_title);
  const message = clean(card.gift_message || '');
  const recipient = clean(card.recipient_email || '');
  const transferable = card.recipient_email === null;
  const issued = new Date(card.created_at);
  const expiry = new Date(card.expires_at);
  if (!/^TA-[0-9A-F]{32}$/.test(code)) throw new Error('invalid_course_gift_code');
  if (!title || Array.from(title).length > 300) throw new Error('invalid_course_gift_title');
  if (!Number.isFinite(issued.valueOf()) || !Number.isFinite(expiry.valueOf()) || expiry <= issued) {
    throw new Error('invalid_gift_card_dates');
  }
  if (Array.from(message).length > 300 || recipient.length > 200) throw new Error('gift_card_text_too_long');
  if (!transferable && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw new Error('invalid_gift_card_recipient');

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [body, display] = await Promise.all([
    pdf.embedFont(decode(sans), { subset: true }),
    pdf.embedFont(decode(serif), { subset: true }),
  ]);
  const validTo = new Intl.DateTimeFormat('pl-PL', {
    timeZone: 'Europe/Warsaw', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(expiry);
  const demo = card.is_demo === true;
  pdf.setTitle((demo ? 'DEMO - NIEWAŻNY | ' : '') + 'Karta podarunkowa: ' + title + ' | TRENERKI Academy');
  pdf.setAuthor('TRENERKI Academy');
  pdf.setSubject(demo
    ? 'DEMO - NIEWAŻNY. Testowy dokument bez wartości i dostępu do kursu.'
    : 'Karta do wydruku. Jednorazowy kod do odbioru wskazanego kursu.');
  pdf.setLanguage('pl-PL');
  pdf.setCreationDate(issued);
  pdf.setModificationDate(issued);
  const page = pdf.addPage(pageSize);
  const text = (value: string, x: number, y: number, size: number, font = body, color = green) =>
    page.drawText(value, { x, y, size, font, color });
  const center = (value: string, x: number, y: number, size: number, font = body, color = green) =>
    text(value, x - font.widthOfTextAtSize(value, size) / 2, y, size, font, color);
  const rule = (x1: number, x2: number, y: number, color = lineColor, thickness = 0.6) =>
    page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, color, thickness });

  page.drawRectangle({ x: 0, y: 0, width: pageSize[0], height: pageSize[1], color: paper });
  page.drawRectangle({ x: 20, y: 20, width: 555.276, height: 379.528, borderColor: gold, borderWidth: 0.8 });
  page.drawRectangle({ x: 25, y: 25, width: 545.276, height: 369.528, borderColor: lineColor, borderWidth: 0.35 });
  page.drawSvgPath('M0 0 Q10 4 20 0 L20 24 Q10 28 0 24 Z M20 0 Q30 4 40 0 L40 24 Q30 28 20 24 Z',
    { x: 40, y: 375, borderColor: green, borderWidth: 0.9 });
  text('T R E N E R K I', 92, 363, 18, display);
  text('A C A D E M Y', 94, 347, 7.8, body, gold);
  if (demo) {
    const red = rgb(0.65, 0.18, 0.16);
    page.drawRectangle({ x: 360, y: 340, width: 195, height: 37, color: rgb(1, 0.94, 0.90), borderColor: red, borderWidth: 0.6 });
    center('DEMO - NIEWAŻNY', 457.5, 360, 11, body, red);
    center('Bez wartości i dostępu do kursu', 457.5, 347, 7.6, body, red);
  } else {
    center('KURS ONLINE', 454, 363, 15, display);
    center('Podaruj nową umiejętność.', 454, 346, 8.8, body, muted);
  }
  rule(40, 555, 330, gold);
  text('KARTA PODARUNKOWA', 40, 303, 24, display);
  text('DOSTĘP DO KURSU', 41, 285, 7.5, body, gold);

  // Separate fixed-height areas keep the complete title and dedication printable together.
  const course = fitLines(title, display, 17, 510, 4, 6.5);
  course.lines.forEach((part, i) => text(part, 41, 265 - i * (course.size + 2), course.size, display));
  const dedication = fitLines(message || 'Nowa wiedza. Nowe możliwości. Twój kolejny krok zaczyna się tutaj.', display, 9.5, 510, 5, 7.75);
  dedication.lines.forEach((part, i) => text(part, 41, 187 - i * (dedication.size + 1.5), dedication.size, display, muted));

  page.drawRectangle({ x: 39, y: 93, width: 517, height: 46, color: pale, borderColor: lineColor, borderWidth: 0.45 });
  center('TWÓJ KOD PODARUNKOWY', 297.5, 125, 7.3, body, muted);
  let codeSize = 13.6;
  while (body.widthOfTextAtSize(code, codeSize) > 488) codeSize -= 0.25;
  center(code, 297.5, 105, codeSize, body);
  const policy = transferable
    ? 'Możesz przekazać tę kartę innej osobie. Kod umożliwia jednorazowy odbiór kursu.'
    : 'Do odebrania na koncie: ' + recipient;
  const policyText = fitLines(policy, body, 7.8, 515, 2, 6.25);
  policyText.lines.forEach((part, i) => text(part, 40, 82 - i * (policyText.size + 1.5), policyText.size, body, muted));
  rule(40, 555, 66);
  text('Dostęp do kursu przez 12 miesięcy od odbioru.', 41, 53, 8.5, body);
  text('Załóż konto lub zaloguj się, wpisz kod na stronie prezentu i rozpocznij naukę.', 41, 42, 7.3, body, muted);
  text('KARTĘ ODBIERZ DO ' + validTo, 41, 30, 7.4, body, muted);
  text('www.trenerki.com/prezent', 388, 30, 9.5, body);

  const target = 'https://trenerki.com/prezent?code=' + encodeURIComponent(code);
  const link = pdf.context.register(pdf.context.obj({
    Type: 'Annot', Subtype: 'Link', Rect: [387, 27, 554, 41], Border: [0, 0, 0],
    A: { Type: 'Action', S: 'URI', URI: PDFString.of(target) },
  }));
  page.node.addAnnot(link);
  return pdf.save({ addDefaultPage: false });
}

export function courseGiftCardFilename(card: CourseGiftCard) {
  return 'TRENERKI-kurs-prezent-' + card.id.replace(/[^a-zA-Z0-9-]/g, '') + '.pdf';
}

export function bytesBase64(data: Uint8Array) {
  let binary = '';
  for (let offset = 0; offset < data.length; offset += 8192) {
    binary += String.fromCharCode(...data.subarray(offset, offset + 8192));
  }
  return btoa(binary);
}
