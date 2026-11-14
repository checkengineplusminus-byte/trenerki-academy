/** Silnik ćwiczeniowy. Kwoty zapisujemy w całkowitych groszach; brak rzeczywistych deklaracji. */
export const ACCOUNTS = {'100':'Kasa','130':'Rachunek bankowy','201':'Należności od klientów','202':'Zobowiązania wobec dostawców','220':'Zaliczki PIT od płac — ćwiczenie','229':'Składki pracownika do rozliczenia — ćwiczenie','231':'Rozrachunki z wynagrodzeń — ćwiczenie','234':'Inne potrącenia z wynagrodzeń — ćwiczenie','221':'VAT naliczony — ćwiczenie','222':'VAT należny — ćwiczenie','300':'Zapasy — ćwiczenie','400':'Koszty usług — ćwiczenie','404':'Wynagrodzenia brutto — ćwiczenie','700':'Przychody ze sprzedaży','800':'Kapitał — ćwiczenie'};
export const EMPTY = () => ({schema_version:1,invoices:[],bank:[],journals:[],matches:[]});
export const uid = () => globalThis.crypto.randomUUID();
export const today = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export const money = cents => (Number(cents)/100).toLocaleString('pl-PL',{minimumFractionDigits:2,maximumFractionDigits:2})+' zł';
export const decimal = cents => (Number(cents)/100).toFixed(2).replace('.',',');
export function scaled(value, places=2) {
 const s=String(value).trim().replace(/[\s\u00a0\u202f]/g,'');
 if(!new RegExp(`^-?\\d+(?:[.,]\\d{1,${places}})?$`).test(s))throw new Error(`Wpisz liczbę z maksymalnie ${places} miejscami po przecinku.`);
 const neg=s.startsWith('-'),[a,b='']=s.replace(/^-/,'').replace(',','.').split('.');
 const n=BigInt(a)*10n**BigInt(places)+BigInt(b.padEnd(places,'0'));
 if(n>1000000000000n)throw new Error('Kwota przekracza zakres ćwiczenia.');
 return Number(neg?-n:n);
}
export const cents = value => scaled(value,2);
export function validDate(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&v>='2000-01-01'&&v<='2100-12-31'&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;}
function nonnegativeInteger(n,max=1000000000000){if(!Number.isSafeInteger(n)||n<0||n>max)throw new Error('Kwota lub ilość poza zakresem.');return BigInt(n);}
const rounded=(a,b)=>Number((a+b/2n)/b);
export function invoiceTotals(invoice){
 if(!Array.isArray(invoice.lines)||invoice.lines.length<1||invoice.lines.length>20)throw new Error('Faktura wymaga od 1 do 20 pozycji.');
 let net=0,tax=0;
 const lines=invoice.lines.map(l=>{
  const q=nonnegativeInteger(l.qty_milli,1000000000),p=nonnegativeInteger(l.unit_cents,1000000000);
  if(q===0n||!['23','8','5','0','ZW','NP'].includes(l.tax_code))throw new Error('Sprawdź ilość i kod VAT.');
  const n=rounded(q*p,1000n);if(n>100000000000)throw new Error('Pozycja jest zbyt duża.');
  const v=['ZW','NP'].includes(l.tax_code)?0:rounded(BigInt(n)*BigInt(l.tax_code),100n);
  net+=n;tax+=v;return {...l,net_cents:n,tax_cents:v};
 });
 if(net+tax>1000000000000)throw new Error('Dokument jest zbyt duży.');
 return {...invoice,lines,net_cents:net,tax_cents:tax,gross_cents:net+tax};
}
export function journalTotals(j){return j.lines.reduce((a,l)=>({debit:a.debit+l.debit,credit:a.credit+l.credit}),{debit:0,credit:0});}
export const livePostings = s => s.journals.filter(j=>j.status==='posted'&&!j.reversal_of&&!s.journals.some(r=>r.status==='posted'&&r.reversal_of===j.id));
export function expectedInvoiceLines(i){
 const x=invoiceTotals(i),rows=i.kind==='sale'?[{account:'201',debit:x.gross_cents,credit:0},{account:'700',debit:0,credit:x.net_cents}]:[{account:'400',debit:x.net_cents,credit:0},{account:'202',debit:0,credit:x.gross_cents}];
 if(x.tax_cents)rows.push({account:i.kind==='sale'?'222':'221',debit:i.kind==='sale'?0:x.tax_cents,credit:i.kind==='sale'?x.tax_cents:0});return rows;
}
function byAccount(lines){const a={};for(const l of lines)a[l.account]=(a[l.account]||0)+l.debit-l.credit;return Object.fromEntries(Object.entries(a).filter(([,v])=>v!==0).sort(([a],[b])=>a.localeCompare(b)));}
export function balanceReport(s){
 const accounts=Object.fromEntries(Object.entries(ACCOUNTS).map(([code,name])=>[code,{code,name,debit:0,credit:0,balance:0}]));
 for(const j of s.journals.filter(x=>x.status==='posted'))for(const l of j.lines){const a=accounts[l.account];if(a){a.debit+=l.debit;a.credit+=l.credit;a.balance=a.debit-a.credit;}}
 const values=Object.values(accounts),paid=id=>s.matches.filter(m=>m.invoice_id===id).reduce((v,m)=>v+m.amount_cents,0);
 const outstanding=kind=>s.invoices.filter(i=>i.kind===kind&&i.status==='issued').reduce((v,i)=>v+invoiceTotals(i).gross_cents-paid(i.id),0);
 return {accounts:values,debit:values.reduce((v,a)=>v+a.debit,0),credit:values.reduce((v,a)=>v+a.credit,0),bank:s.bank.reduce((v,b)=>v+b.amount_cents,0),ledgerBank:accounts['130'].balance,profit:-accounts['700'].balance-accounts['400'].balance-accounts['404'].balance,vat:-accounts['222'].balance-accounts['221'].balance,receivable:outstanding('sale'),payable:outstanding('purchase')};
}
export function inspect(s){
 const issues=[],live=livePostings(s);const add=(code,title,text,entity,id,severity='uwaga')=>issues.push({code,title,text,entity,id,severity});
 for(const j of s.journals){
  const t=journalTotals(j);if(j.status==='draft')add('draft','Szkic czeka na sprawdzenie',t.debit===t.credit?'Wn i Ma są równe. Sprawdź jeszcze konta, datę i dokument źródłowy; równość nie oznacza poprawnej kwalifikacji.':`Wn: ${money(t.debit)}; Ma: ${money(t.credit)}. Różnica wynosi ${money(Math.abs(t.debit-t.credit))}. Poszukaj brakującej strony, zamiast dopisywać przypadkowe konto.`, 'journal',j.id,t.debit===t.credit?'wskazówka':'błąd');
  if(j.lines.some(l=>(l.debit>0&&l.credit>0)||(l.debit===0&&l.credit===0)))add('side','Sprawdź strony wiersza','W zatwierdzanym wierszu wpisz dodatnią kwotę tylko po Wn albo po Ma.','journal',j.id,'błąd');
 }
 for(const i of s.invoices){
  if(i.status!=='issued')continue;
  const j=live.find(j=>j.source_type==='invoice'&&j.source_id===i.id);
  if(!j)add('unposted_invoice','Dokument nie ma aktywnego księgowania',`${i.number}: faktura i księgowanie to dwa etapy. Dodaj zapis na podstawie dokumentu.`, 'invoice',i.id);
  else if(JSON.stringify(byAccount(j.lines))!==JSON.stringify(byAccount(expectedInvoiceLines(i))))add('invoice_accounts','Zapis różni się od modelu tej pracowni',`${i.number}: porównaj należność/zobowiązanie, wartość netto i VAT. Ten scenariusz zakłada zwykłą sprzedaż usług lub zakup usługi kosztowej z pełnym odliczeniem. Inny przypadek wymaga innego modelu.`, 'journal',j.id);
  const left=invoiceTotals(i).gross_cents-s.matches.filter(m=>m.invoice_id===i.id).reduce((a,m)=>a+m.amount_cents,0);
  if(left>0)add('unpaid','Pozostało do rozliczenia',`${i.number}: ${money(left)}. To nie musi być błąd — klient mógł jeszcze nie zapłacić.`, 'invoice',i.id,'wskazówka');
 }
 for(const b of s.bank){
  const linked=s.matches.filter(m=>m.bank_id===b.id).reduce((a,m)=>a+m.amount_cents,0),j=live.find(j=>j.source_type==='bank'&&j.source_id===b.id);
  if(linked<Math.abs(b.amount_cents))add('unmatched_bank','Przelew nie jest w pełni powiązany',`${b.id}: nieprzypisane ${money(Math.abs(b.amount_cents)-linked)}. Sprawdź fakturę, kierunek oraz możliwą częściową płatność; opłata bankowa nie musi mieć faktury.`, 'bank',b.id,'wskazówka');
  if(!j)add('unposted_bank','Import nie jest księgowaniem',`${b.id}: pozycja jest w wyciągu. Dopasowanie płatności nie tworzy automatycznie zapisu Wn/Ma.`, 'bank',b.id);
  else if(linked===Math.abs(b.amount_cents)){
   const n=Math.abs(b.amount_cents),expected=b.amount_cents>0?[{account:'130',debit:n,credit:0},{account:'201',debit:0,credit:n}]:[{account:'202',debit:n,credit:0},{account:'130',debit:0,credit:n}];
   if(JSON.stringify(byAccount(j.lines))!==JSON.stringify(byAccount(expected)))add('bank_accounts','Sprawdź księgowanie rozliczonego przelewu','Zapłata klienta rozlicza należność, a zapłata dostawcy zobowiązanie. Nie naliczaj ponownie przychodu lub kosztu tylko z powodu płatności.','journal',j.id);
  }
 }
 const r=balanceReport(s);if(r.bank!==r.ledgerBank)add('bank_difference','Wyciąg i konto 130 mają różne salda',`Suma operacji wyciągu: ${money(r.bank)}; konto 130: ${money(r.ledgerBank)}. W scenariuszu startujemy od zera. Sprawdź brakujące księgowania oraz storna.`, 'report','bank');
 return issues;
}
export function reverseJournal(j,date=today()){
 if(j.status!=='posted'||j.reversal_of)throw new Error('Stornujemy zwykły, zatwierdzony zapis.');
 return {id:uid(),date,memo:'Storno zapisu '+j.id,source_type:'manual',source_id:'',reversal_of:j.id,status:'posted',lines:j.lines.map(l=>({account:l.account,debit:l.credit,credit:l.debit}))};
}
function csvRows(text,delimiter){
 const rows=[];let row=[],cell='',quoted=false,closed=false;
 for(let n=0;n<text.length;n++){
  const c=text[n];
  if(quoted){if(c==='"'){if(text[n+1]==='"'){cell+='"';n++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
  if(c==='"'&&!cell&&!closed){quoted=true;continue;}
  if(c===delimiter){row.push(cell);cell='';closed=false;continue;}
  if(c==='\r'||c==='\n'){if(c==='\r'&&text[n+1]==='\n')n++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';closed=false;continue;}
  if(closed&&!/\s/.test(c))throw new Error('Niepoprawny tekst po zamknięciu cudzysłowu CSV.');
  if(c==='"')throw new Error('Cudzysłów musi obejmować całe pole CSV.');cell+=c;
 }
 if(quoted)throw new Error('Niezamknięty cudzysłów w CSV.');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
export function parseBankCSV(input,existing=[]){
 if(typeof input!=='string'||input.length>1000000)throw new Error('Plik CSV może mieć maksymalnie 1 MB.');
 const text=input.replace(/^\uFEFF/,''),first=text.split(/\r?\n/).find(x=>x.trim())||'',delimiter=first.includes(';')?';':',';
 const rows=csvRows(text,delimiter);if(!rows.length||rows.length>1001)throw new Error('CSV musi mieć nagłówek i maksymalnie 1000 operacji.');
 const headers=rows.shift().map(x=>x.trim().toLowerCase()),required=['id','data','kwota','opis'];
 if(headers.length!==4||required.some(x=>!headers.includes(x)))throw new Error('Wymagane cztery kolumny: id;data;kwota;opis. Pobierz szablon i użyj danych fikcyjnych.');
 const accepted=[],errors=[],seen=new Map(),old=new Map(existing.map(b=>[b.id,b]));let skipped=0;
 rows.forEach((cells,n)=>{try{
  if(cells.length!==4)throw new Error('Inna liczba kolumn niż w nagłówku.');
  const x=Object.fromEntries(headers.map((h,i)=>[h,cells[i].trim()]));
  if(!/^[A-Za-z0-9_/-]{1,100}$/.test(x.id))throw new Error('Identyfikator: litery bez polskich znaków, cyfry, /, - lub _.');
  if(!validDate(x.data))throw new Error('Data musi być prawidłowa: RRRR-MM-DD.');
  const amount=cents(x.kwota);if(amount===0||x.opis.length>300)throw new Error('Kwota nie może być zerem; opis maksymalnie 300 znaków.');
  const item={id:x.id,date:x.data,amount_cents:amount,description:x.opis};
  const prev=seen.get(item.id)||old.get(item.id);
  if(prev){if(prev.date!==item.date||prev.amount_cents!==item.amount_cents||prev.description!==item.description)throw new Error('Ten identyfikator ma już inne dane.');skipped++;return;}
  seen.set(item.id,item);accepted.push(item);
 }catch(e){errors.push({row:n+2,message:e.message});}});
 return {rows:accepted,skipped,errors};
}
export const BANK_TEMPLATE='id;data;kwota;opis\nCW-BANK-1;2026-11-05;1230,00;Zapłata klienta za CW/FV/1\nCW-BANK-2;2026-11-06;-246,00;Zapłata dostawcy za CW/ZAK/1\n';
export const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function invoiceHTML(invoice){
 const i=invoiceTotals(invoice),e=escapeHTML;
 return `<!doctype html><html lang="pl"><meta charset="utf-8"><title>${e(i.number)} — ćwiczenie</title><style>body{font:15px Arial,sans-serif;color:#17392a;max-width:850px;margin:40px auto;padding:24px}h1{font-size:30px}.notice{border:2px solid #8b4327;padding:16px;color:#8b4327;font-weight:bold}table{width:100%;border-collapse:collapse;margin:24px 0}th,td{padding:10px;border-bottom:1px solid #ccc;text-align:left}small{display:block;margin-top:30px}@media print{body{margin:0;padding:12mm}}</style><body><div class="notice">DOKUMENT ĆWICZENIOWY — NIE JEST FAKTURĄ DO OBROTU GOSPODARCZEGO</div><h1>${e(i.number)}</h1><p>${i.status==='draft'?'SZKIC — ':''}${i.kind==='sale'?'Sprzedaż':'Zakup'} · waluta PLN</p><p>Sprzedawca fikcyjny: ${e(i.kind==='sale'?i.seller:i.party)}<br>Nabywca fikcyjny: ${e(i.kind==='sale'?i.party:i.seller)}</p><p>Data: ${e(i.date)} · Termin płatności: ${e(i.due)}</p><table><thead><tr><th>Opis</th><th>Ilość</th><th>Netto</th><th>Kod VAT</th><th>Kwota VAT</th></tr></thead><tbody>${i.lines.map(l=>`<tr><td>${e(l.label)}</td><td>${e(l.qty_milli/1000)}</td><td>${e(money(l.net_cents))}</td><td>${e(l.tax_code)}</td><td>${e(money(l.tax_cents))}</td></tr>`).join('')}</tbody></table><h2>Do rozliczenia w ćwiczeniu: ${e(money(i.gross_cents))}</h2><p>Netto ${e(money(i.net_cents))} · VAT ${e(money(i.tax_cents))}</p><small>Trenerki — Biuro księgowe. Stawki są założeniami zadania. Dokument nie został wysłany do KSeF, urzędu ani kontrahenta.</small></body></html>`;
}
