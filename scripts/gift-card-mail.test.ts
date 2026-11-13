import { PDFDocument } from 'npm:pdf-lib@1.17.1';
import { giftCardMailContent,courseGiftMailContent } from '../supabase/functions/_shared/gift-card-mail.ts';
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
 assert(first.html.includes('Możesz przekazać tę kartę innej osobie'),'Transfer instruction missing');
 assert(!first.html.includes('foundation@example.invalid'),'Delivery address must not be presented as the entitled beneficiary');
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
 for(const [i,attachment]of first.attachments.entries()){
  assert(first.html.includes(cards[i].course_title)&&first.text.includes(cards[i].code),'Course title or code is missing');
  assert((await PDFDocument.load(Uint8Array.from(atob(attachment.content),c=>c.charCodeAt(0)))).getPageCount()===1,'Course attachment is not a printable one-page PDF');
 }
});
