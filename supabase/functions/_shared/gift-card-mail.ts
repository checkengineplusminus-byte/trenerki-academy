import { buildGiftCardPdf, bytesBase64, giftCardFilename, type GiftCard } from './gift-card-pdf.ts';
import { buildCourseGiftCardPdf, courseGiftCardFilename, type CourseGiftCard } from './gift-card-pdf.ts';
import { privacyNotice } from './recipient-privacy.ts';

export type GiftCardAttachment = { filename: string; content: string };
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const money = (amount: number) => new Intl.NumberFormat('pl-PL', {style:'currency',currency:'PLN'}).format(amount / 100);
const expiry = (value: string) => new Intl.DateTimeFormat('pl-PL', {day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Warsaw'}).format(new Date(value));
export const giftCardLink = (code: string) => 'https://trenerki.com/prezent?code=' + encodeURIComponent(code);

// No public file bucket: the code stays inside the recipient's mail and PDF.
// Stable data and PDF bytes keep retries compatible with Resend idempotency.
export async function giftCardMailContent(cards: GiftCard[]) {
 if (!cards.length || cards.length > 10) throw new Error('invalid_card_count');
 const total = cards.reduce((sum, c) => sum + c.amount_grosze, 0);
 const subject = cards.length === 1
  ? 'TRENERKI Academy — karta podarunkowa ' + money(total)
  : 'TRENERKI Academy — ' + cards.length + ' karty podarunkowe do wydruku';
 const attachments: GiftCardAttachment[] = [];
 const panels: string[] = [];
 const lines: string[] = [subject, '', 'W załączniku znajdziesz osobny plik PDF dla każdej karty. Możesz go zapisać lub wydrukować.'];
 for (const [index, card] of cards.entries()) {
  const link = giftCardLink(card.code);
  const restriction = card.transferable
   ? 'Możesz przekazać tę kartę innej osobie. Środki odbierze na swoim koncie osoba, która jako pierwsza zrealizuje kod.'
   : 'Kartę można odebrać na koncie z potwierdzonym adresem: ' + card.recipient_email + '.';
  attachments.push({filename:giftCardFilename(card),content:bytesBase64(await buildGiftCardPdf(card))});
  panels.push('<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #d9e3d3;border-radius:14px;margin:22px 0;background:#ffffff"><tr><td style="padding:24px">' +
   '<p style="margin:0 0 8px;color:#56715d;font-size:12px;letter-spacing:1.5px">KARTA PODARUNKOWA' + (cards.length > 1 ? ' · ' + (index + 1) + '/' + cards.length : '') + '</p>' +
   '<p style="margin:0 0 18px;color:#183b2c;font-size:38px;font-weight:bold">' + escapeHtml(money(card.amount_grosze)) + '</p>' +
   (card.gift_message ? '<p style="margin:0 0 18px;color:#334d3b">' + escapeHtml(card.gift_message).replace(/\r?\n/g,'<br>') + '</p>' : '') +
   '<p style="margin:0 0 6px;font-size:12px;color:#56715d">TWÓJ JEDNORAZOWY KOD</p><p style="margin:0 0 18px;font-family:monospace;font-size:14px;word-break:break-all;color:#183b2c">' + escapeHtml(card.code) + '</p>' +
   '<p style="margin:0 0 16px"><a href="' + link + '" style="display:inline-block;background:#183b2c;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:8px;font-weight:bold">Przejdź do odbioru karty</a></p>' +
   '<p style="font-size:13px;line-height:1.6;color:#56715d;margin:0 0 8px">' + escapeHtml(restriction) + '</p>' +
   '<p style="font-size:12px;color:#56715d;margin:0">Do odebrania do: ' + escapeHtml(expiry(card.expires_at)) + '.</p></td></tr></table>');
  lines.push('', 'Karta ' + (index + 1) + ': ' + money(card.amount_grosze), card.code, link,
   ...(card.gift_message ? [card.gift_message] : []), restriction, 'Do odebrania do: ' + expiry(card.expires_at) + '.');
 }
 const html = '<!doctype html><html lang="pl"><head><meta charset="utf-8"></head><body style="margin:0;background:#f5f6ef;font-family:Arial,sans-serif;color:#183b2c"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px"><tr><td>' +
  '<p style="margin:0;font-family:Georgia,serif;font-size:30px;font-weight:bold">TRENERKI <span style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px">ACADEMY</span></p>' +
  '<h1 style="font-family:Georgia,serif;font-size:28px;margin:28px 0 12px">Podaruj sobie nową umiejętność</h1>' +
  '<p style="font-size:15px;line-height:1.7">' + (cards.length === 1 ? 'Twoja karta podarunkowa jest gotowa.' : 'Twoje karty podarunkowe są gotowe. Każda ma własny kod i osobny plik PDF.') + ' Wydrukuj załącznik lub zachowaj go na później.</p>' +
  panels.join('') +
  '<h2 style="font-size:18px">Jak skorzystać?</h2><ol style="font-size:14px;line-height:1.8;padding-left:22px"><li>Wejdź na <a href="https://trenerki.com/prezent" style="color:#183b2c">www.trenerki.com/prezent</a> i zaloguj się lub załóż konto.</li><li>Potwierdź adres e-mail i odbierz środki za pomocą kodu.</li><li>Wybierz kurs. Niewykorzystane saldo zostanie na koncie; brakującą kwotę możesz dopłacić, gdy płatności są dostępne.</li></ol>' +
  '<p style="font-size:12px;line-height:1.7;color:#56715d">Kod można zrealizować tylko raz. Samo otwarcie pliku lub linku nie aktywuje karty. Nie publikuj kodu. Pomoc: <a href="mailto:trenerki.pl@gmail.com" style="color:#183b2c">trenerki.pl@gmail.com</a>.</p>' +
  '<div style="font-size:11px;line-height:1.6;color:#56715d">' + privacyNotice + '</div>' +
  '</td></tr></table></td></tr></table></body></html>';
 lines.push('', 'Wejdź na www.trenerki.com/prezent, zaloguj się i odbierz środki kodem. Kod jest jednorazowy. Samo otwarcie pliku lub linku nie aktywuje karty.',
  'Niewykorzystane saldo zostaje na koncie. Nie publikuj kodu.', 'Pomoc: trenerki.pl@gmail.com', 'Prywatność: https://trenerki.com/academy/prywatnosc.html#s3');
 return {subject,html,text:lines.join('\n'),attachments};
}

export async function courseGiftMailContent(cards: CourseGiftCard[]) {
 if (!cards.length || cards.length > 10) throw new Error('invalid_card_count');
 const subject = cards.length === 1 ? 'TRENERKI Academy — karta podarunkowa na kurs' : 'TRENERKI Academy — karty podarunkowe na ' + cards.length + ' kursów';
 const attachments: GiftCardAttachment[] = [];
 const panels: string[] = [];
 const lines: string[] = [subject,'','W załączniku znajdziesz osobny plik PDF dla każdej karty. Możesz go zapisać lub wydrukować.'];
 for (const [index,card] of cards.entries()) {
  const link=giftCardLink(card.code);
  const restriction=card.recipient_email
   ? 'Kartę można odebrać na koncie z potwierdzonym adresem: ' + card.recipient_email + '.'
   : 'Możesz przekazać tę kartę innej osobie. Kurs odbierze osoba, która jako pierwsza zrealizuje kod na swoim potwierdzonym koncie.';
  attachments.push({filename:courseGiftCardFilename(card),content:bytesBase64(await buildCourseGiftCardPdf(card))});
  panels.push('<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;border:1px solid #d9e3d3;background:#ffffff;border-radius:14px"><tr><td style="padding:24px">'+
   '<p style="margin:0 0 10px;color:#56715d;font-size:12px;letter-spacing:1.5px">KARTA PODARUNKOWA NA KURS'+(cards.length>1?' · '+(index+1)+'/'+cards.length:'')+'</p>'+
   '<h2 style="margin:0 0 14px;font-family:Georgia,serif;font-size:25px;color:#183b2c">'+escapeHtml(card.course_title)+'</h2>'+
   (card.gift_message?'<p style="font-size:15px;line-height:1.6">'+escapeHtml(card.gift_message).replace(/\r?\n/g,'<br>')+'</p>':'')+
   '<p style="font-size:13px;color:#56715d">Dostęp do kursu przez 12 miesięcy od odbioru.</p><p style="margin-bottom:6px;font-size:12px;color:#56715d">TWÓJ JEDNORAZOWY KOD</p>'+
   '<p style="font-family:monospace;font-size:14px;word-break:break-all;color:#183b2c">'+escapeHtml(card.code)+'</p>'+
   '<p><a href="'+link+'" style="display:inline-block;background:#183b2c;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:8px;font-weight:bold">Przejdź do odbioru kursu</a></p>'+
   '<p style="font-size:13px;line-height:1.6;color:#56715d">'+escapeHtml(restriction)+'</p>'+
   '<p style="margin:0;font-size:12px;color:#56715d">Do odebrania do: '+escapeHtml(expiry(card.expires_at))+'.</p></td></tr></table>');
  lines.push('','Karta '+(index+1)+': '+card.course_title,card.code,link,...(card.gift_message?[card.gift_message]:[]),restriction,
   'Do odebrania do: '+expiry(card.expires_at)+'.','Dostęp do kursu: 12 miesięcy od odbioru.');
 }
 const html='<!doctype html><html lang="pl"><head><meta charset="utf-8"></head><body style="margin:0;background:#f5f6ef;font-family:Arial,sans-serif;color:#183b2c"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" style="width:100%;max-width:600px"><tr><td>'+
  '<p style="font-family:Georgia,serif;font-size:30px;font-weight:bold">TRENERKI <span style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:2px">ACADEMY</span></p>'+
  '<h1 style="font-family:Georgia,serif;font-size:28px">Nowa umiejętność w prezencie</h1><p style="font-size:15px;line-height:1.7">'+(cards.length===1?'Otrzymujesz kartę podarunkową na kurs.':'Otrzymujesz '+cards.length+' kart podarunkowych na kursy.')+' Każda karta ma własny kod i plik PDF do wydruku.</p>'+
  panels.join('')+'<h2 style="font-size:18px">Jak odebrać kurs?</h2><ol style="font-size:14px;line-height:1.8;padding-left:22px"><li>Wejdź na <a href="https://trenerki.com/prezent" style="color:#183b2c">www.trenerki.com/prezent</a>.</li><li>Zaloguj się lub załóż konto i potwierdź adres e-mail.</li><li>Wpisz kod i wybierz „Odbierz prezent”. Kurs pojawi się w „Moich kursach”.</li></ol>'+
  '<p style="font-size:12px;line-height:1.7;color:#56715d">Kod można zrealizować tylko raz. Samo otwarcie PDF lub linku nie odbiera kursu. Nie publikuj kodu. Pomoc: <a href="mailto:trenerki.pl@gmail.com" style="color:#183b2c">trenerki.pl@gmail.com</a>.</p>'+
  '<div style="font-size:11px;line-height:1.6;color:#56715d">'+privacyNotice+'</div></td></tr></table></td></tr></table></body></html>';
 lines.push('','Odbierz kurs na www.trenerki.com/prezent po zalogowaniu i potwierdzeniu adresu e-mail. Kod jest jednorazowy. Nie publikuj kodu.','Pomoc: trenerki.pl@gmail.com','Prywatność: https://trenerki.com/academy/prywatnosc.html#s3');
 return {subject,html,text:lines.join('\n'),attachments};
}
