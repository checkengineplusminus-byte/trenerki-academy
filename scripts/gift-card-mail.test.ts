import { PDFDocument } from 'npm:pdf-lib@1.17.1';
import { giftCardMailContent,courseGiftMailContent,giftCardLink } from '../supabase/functions/_shared/gift-card-mail.ts';
const assert=(condition:unknown,message:string)=>{if(!condition)throw new Error(message);};

Deno.test('three printable cards stay separate and produce a stable, escaped email',async()=>{
 const cards=Array.from({length:3},(_,i)=>({id:'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),
  code:'TW-00000000000040008000'+String(i+1).padStart(12,'0'),amount_grosze:10000,
  recipient_email:'foundation@example.invalid',transferable:true,gift_message:'WZÓR <script>alert(1)</script> & Życzymy powodzenia!',
  created_at:'2026-11-13T10:00:00.000Z',expires_at:'2029-11-13T10:00:00.000Z'}));
 const first=await giftCardMailContent(cards),retry=await giftCardMailContent(cards);
 assert(JSON.stringify(first)===JSON.stringify(retry),'Mail retry changes the payload and would break Resend idempotency');
 assert(first.attachments.length===3,'Recipient must receive three distinct PDFs');
 assert(new Set(first.attachments.map(a=>a.filename)).size===3,'PDF filenames collide');
 assert(!first.html.includes('<script>')&&first.html.includes('&lt;script&gt;'),'Dedication can inject email markup');
 assert(first.html.includes('Przekaż kartę wybranej osobie. Kod można aktywować na dowolnym potwierdzonym koncie.'),'Transfer instruction missing');
 assert(!first.html.includes('foundation@example.invalid'),'Delivery address must not be presented as the entitled beneficiary');
 assert(first.html.includes('W załącznikach znajdują się karty podarunkowe PDF do wydruku.')&&first.text.includes('W załącznikach znajdują się karty podarunkowe PDF do wydruku.'),'Multiple PDF attachments are not clearly announced');
 assert(first.html.includes('Karta ważna do: 13 listopada 2029 r.')&&first.text.includes('Karta ważna do: 13 listopada 2029 r.'),'Future expiry year or its label is unclear');
 assert(!first.html.includes('Do odebrania do:')&&!first.html.includes('KARTĘ ODBIERZ DO'),'Old ambiguous validity label remains');
 for(const [i,a]of first.attachments.entries()){
  assert(a.filename.endsWith('.pdf'),'Attachment is not named as PDF');
  const bytes=Uint8Array.from(atob(a.content),c=>c.charCodeAt(0));
  assert((await PDFDocument.load(bytes)).getPageCount()===1,'Each card must be one printable page');
  assert(first.html.includes(cards[i].code)&&first.text.includes(cards[i].code),'A card code was lost in the email');
 }
});

Deno.test('free course gifts contain a separate printable course card and no fabricated cash value',async()=>{
 const cards=Array.from({length:3},(_,i)=>({id:'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),
  code:'TA-00000000000040008000'+String(i+1).padStart(12,'0'),course_title:['Excel od podstaw','AutoCAD od podstaw','Jestem EKO'][i],
  recipient_email:null,gift_message:'WZÓR <b>Powodzenia!</b>',created_at:'2026-11-13T10:00:00.000Z',expires_at:'2029-11-13T10:00:00.000Z'}));
 const first=await courseGiftMailContent(cards),second=await courseGiftMailContent(cards);
 assert(JSON.stringify(first)===JSON.stringify(second),'Course email bytes change on retry');
 assert(first.attachments.length===3&&new Set(first.attachments.map(a=>a.filename)).size===3,'Course PDFs are missing or share a filename');
 assert(first.html.includes('12 miesięcy')&&!first.html.includes(' zł'),'Course email has incorrect access or a fabricated price');
 assert(first.html.includes('&lt;b&gt;Powodzenia!&lt;/b&gt;'),'Course dedication is not escaped');
 assert(first.html.includes('W załącznikach znajdują się karty podarunkowe PDF do wydruku.')&&first.text.includes('W załącznikach znajdują się karty podarunkowe PDF do wydruku.'),'Course attachment announcement missing');
 assert(first.html.includes('Karta ważna do: 13 listopada 2029 r.')&&first.text.includes('Karta ważna do: 13 listopada 2029 r.'),'Course expiry label is unclear');
 for(const [i,attachment]of first.attachments.entries()){
  assert(first.html.includes(cards[i].course_title)&&first.text.includes(cards[i].code),'Course title or code is missing');
  assert((await PDFDocument.load(Uint8Array.from(atob(attachment.content),c=>c.charCodeAt(0)))).getPageCount()===1,'Course attachment is not a printable one-page PDF');
 }
});

Deno.test('single-card email explicitly identifies its printable attachment and preserves short or legacy links', async () => {
 const common={id:'00000000-0000-4000-8000-000000000001',gift_message:'WZÓR - NIEWAŻNY. Życzymy powodzenia!',
  created_at:'2026-11-13T10:00:00.000Z',expires_at:'2029-11-13T10:00:00.000Z'};
 for(const suffix of ['0123456789ABCDEF','00000000000040008000000000000001']){
  const value=await giftCardMailContent([{...common,code:'TW-'+suffix,amount_grosze:10000,recipient_email:'foundation@example.invalid',transferable:true}]);
  const course=await courseGiftMailContent([{...common,code:'TA-'+suffix,course_title:'Excel od podstaw',recipient_email:null}]);
  for(const [content,code]of [[value,'TW-'+suffix],[course,'TA-'+suffix]] as const){
   const notice='W załączniku znajduje się karta podarunkowa PDF do wydruku.';
   assert(content.html.includes(notice)&&content.text.includes(notice),'Single attachment is not announced in HTML and plain text');
   assert(content.attachments.length===1,'A promised attachment is missing');
   assert(!content.html.includes('foundation@example.invalid'),'Forwardable card is bound to the delivery address in the email');
   assert(content.html.includes('Karta ważna do: 13 listopada 2029 r.'),'Issue date was printed instead of expiry');
   const links=[...content.html.matchAll(/href="([^"]+)"/g)].map(match=>match[1]).filter(href=>href.includes('/prezent?'));
   assert(links.length===1,'Card activation link missing or duplicated');
   const target=new URL(links[0]);
   assert(target.origin==='https://trenerki.com'&&target.pathname==='/prezent'&&target.searchParams.get('code')===code,'Wrong activation destination');
   assert(content.text.includes(target.href),'Plain-text email is missing the full activation link');
  }
 }
 assert(giftCardLink('tw-0123 4567 89ab cdef')==='https://trenerki.com/prezent?code=TW-0123456789ABCDEF','Grouped code is not normalized in the activation link');
 let rejected=false;try{giftCardLink('https://example.com/prezent?code=TW-0123456789ABCDEF');}catch{rejected=true;}
 assert(rejected,'Untrusted URL was accepted as a voucher code');
});

Deno.test('email-bound cards clearly distinguish their beneficiary from a transferable card', async()=>{
 const common={id:'00000000-0000-4000-8000-000000000001',gift_message:'WZÓR - NIEWAŻNY.',recipient_email:'beneficiary@example.invalid',created_at:'2026-11-13T10:00:00.000Z',expires_at:'2029-11-13T10:00:00.000Z'};
 const value=await giftCardMailContent([{...common,code:'TW-0123456789ABCDEF',amount_grosze:10000,transferable:false}]);
 const course=await courseGiftMailContent([{...common,code:'TA-0123456789ABCDEF',course_title:'Excel od podstaw'}]);
 for(const content of [value,course]){
  assert(content.html.includes('Ta karta jest przypisana do adresu beneficiary@example.invalid.'),'Restricted recipient is not explicit');
  assert(content.html.includes('wyłącznie na koncie z tym potwierdzonym adresem e-mail'),'Restricted card implies use on an arbitrary account');
  assert(!content.html.includes('dowolnym potwierdzonym koncie'),'Restricted card was presented as transferable');
 }
});
