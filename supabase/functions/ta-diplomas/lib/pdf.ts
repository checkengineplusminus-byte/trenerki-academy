import { PDFDocument, rgb, type PDFFont } from 'npm:pdf-lib@1.17.1';
import fontkit from 'npm:@pdf-lib/fontkit@1.1.1';
import { sans, serif } from './fonts.ts';

export type Diploma = {
  id: string;
  certificate_no: string;
  holder_name: string;
  title_pl: string;
  title_en: string;
  issued_at: string;
  is_demo: boolean;
};
export type DiplomaLanguage = 'pl' | 'en';
const ink = rgb(0.086, 0.19, 0.153);
const green = rgb(0.145, 0.27, 0.223);
const gold = rgb(0.66, 0.5, 0.27);
const warm = rgb(0.987, 0.98, 0.957);
const muted = rgb(0.32, 0.39, 0.35);
const bytes = (value: string) => Uint8Array.from(atob(value), character => character.charCodeAt(0));

const copy = {
  pl: {
    title: 'Dyplom ukończenia',
    lead: 'TRENERKI Academy potwierdza ukończenie kursu i zaliczenie egzaminu wewnętrznego',
    date: 'DATA UKOŃCZENIA',
    number: 'NUMER DOKUMENTU',
    note: 'Dokument potwierdza ukończenie prywatnego kursu edukacyjnego.',
    boundary: 'Dokument nie nadaje kwalifikacji zawodowych ani państwowych uprawnień.',
    sample: 'WZÓR TESTOWY — NIEWAŻNY',
  },
  en: {
    title: 'Certificate of Completion',
    lead: 'TRENERKI Academy confirms completion of the course and passing its internal exam',
    date: 'DATE OF COMPLETION',
    number: 'DOCUMENT NUMBER',
    note: 'This document confirms completion of a private education course.',
    boundary: 'This document does not confer a professional qualification or a state licence.',
    sample: 'TEST SAMPLE — NOT VALID',
  },
};

function titleFor(diploma: Diploma, language: DiplomaLanguage) {
  return language === 'pl'
    ? diploma.title_pl.replace(/^Ukończenie (?:prywatnego )?(?:kursu|programu)\s*:\s*/i, '')
    : diploma.title_en.replace(/^(?:Completion of (?:the )?(?:private )?(?:course|programme)|Certificate of completion)\s*:\s*/i, '');
}

function wrap(value: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of value.trim().split(/\s+/)) {
    const candidate = line ? line + ' ' + word : word;
    if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

export async function buildDiplomaPdf(diploma: Diploma, language: DiplomaLanguage) {
  const words = copy[language];
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const [regular, display] = await Promise.all([
    document.embedFont(bytes(sans), { subset: true }),
    document.embedFont(bytes(serif), { subset: true }),
  ]);
  document.setTitle(words.title + ' | TRENERKI Academy');
  document.setAuthor('TRENERKI Academy');
  document.setLanguage(language);
  document.setCreationDate(new Date(diploma.issued_at));
  document.setModificationDate(new Date(diploma.issued_at));
  const page = document.addPage([842, 595]);
  const middle = 421;
  const line = (x1: number, x2: number, y: number) =>
    page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: 0.65, color: gold });
  const centered = (value: string, x: number, y: number, size: number, font = regular, color = ink) =>
    page.drawText(value, { x: x - font.widthOfTextAtSize(value, size) / 2, y, size, font, color });

  function block(value: string, y: number, maxSize: number, maxWidth: number, maxLines: number, font: PDFFont) {
    let size = maxSize;
    let lines = wrap(value, font, size, maxWidth);
    while (size > 8 && (lines.length > maxLines || lines.some(item => font.widthOfTextAtSize(item, size) > maxWidth))) {
      size -= 1;
      lines = wrap(value, font, size, maxWidth);
    }
    for (const [index, item] of lines.entries()) centered(item, middle, y - index * (size + 5), size, font);
  }

  page.drawRectangle({ x: 0, y: 0, width: 842, height: 595, color: warm });
  page.drawRectangle({ x: 22, y: 22, width: 798, height: 551, borderColor: green, borderWidth: 1.5 });
  page.drawRectangle({ x: 29, y: 29, width: 784, height: 537, borderColor: gold, borderWidth: 0.55 });
  page.drawRectangle({ x: 29, y: 463, width: 784, height: 103, color: green });
  for (const [x, direction] of [[64, 1], [778, -1]]) {
    for (let index = 0; index < 5; index++) {
      const start = x + index * 15 * direction;
      page.drawLine({ start: { x: start, y: 485 }, end: { x: start + 61 * direction, y: 545 }, color: gold, thickness: 0.6, opacity: 0.5 });
    }
  }
  centered('T R E N E R K I', middle, 518, 23, display, warm);
  centered('A C A D E M Y', middle, 492, 10, regular, warm);
  centered(words.title, middle, 404, 36, display);
  line(367, 475, 386);
  centered(words.lead, middle, 355, 11, regular, muted);
  block(diploma.holder_name.normalize('NFC'), 310, 32, 668, 2, display);
  block(titleFor(diploma, language), 230, 20, 638, 3, display);

  const date = new Intl.DateTimeFormat(language === 'pl' ? 'pl-PL' : 'en-GB',
    { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Warsaw' }).format(new Date(diploma.issued_at));
  line(111, 731, 151);
  centered(words.date, 257, 129, 9, regular, muted);
  centered(date, 257, 106, 13, display);
  centered(words.number, 585, 129, 9, regular, muted);
  centered(diploma.certificate_no, 585, 106, 13, display);
  if (diploma.is_demo) centered(words.sample, middle, 81, 11, regular, rgb(0.53, 0.18, 0.1));
  centered(words.note, middle, 61, 9, regular, muted);
  centered(words.boundary, middle, 45, 8, regular, muted);
  return document.save({ addDefaultPage: false });
}

export function pdfBase64(data: Uint8Array) {
  let binary = '';
  for (let offset = 0; offset < data.length; offset += 8192) {
    binary += String.fromCharCode(...data.subarray(offset, offset + 8192));
  }
  return btoa(binary);
}

export function diplomaFilename(diploma: Diploma, language: DiplomaLanguage) {
  return 'TRENERKI-' + diploma.certificate_no.replace(/[^a-zA-Z0-9-]/g, '') + '-' + language + '.pdf';
}
