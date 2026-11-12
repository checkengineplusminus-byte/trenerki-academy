/** Dane ćwiczeniowe. Brak połączeń z rejestrami i urzędami. */
import {invoiceTotals,cents,scaled,validDate} from './lab-core-base.js';
export const ENTITY_TYPES=[['jdg','Jednoosobowa działalność'],['zoo','Spółka z o.o.'],['sa','Spółka akcyjna'],['psa','Prosta spółka akcyjna'],['foundation','Fundacja'],['association','Stowarzyszenie'],['other','Inna jednostka']];
export const RECORD_SYSTEMS=[['unconfirmed','Do ustalenia w zadaniu'],['kpir','KPiR'],['books','Księgi rachunkowe'],['revenue','Ewidencja przychodów'],['ngo_simple','Uproszczona ewidencja NGO — po sprawdzeniu warunków']];
export const VAT_STATES=[['unconfirmed','Do ustalenia'],['active','Czynny — założenie scenariusza'],['exempt','Zwolniony — założenie scenariusza']];
export const blankIdentity=()=>({legal_name:'',nip:'',regon:'',krs:'',address:'',country:'PL'});
export const blankCompany=name=>({schema_version:1,status:'draft',entity_type:'jdg',record_system:'unconfirmed',vat_status:'unconfirmed',identity:{...blankIdentity(),legal_name:name||''}});
export const draftStorageKey=(user,workspace)=>`ta-identity-draft-v1:${user}:${workspace}`;
export function normalizeIdentity(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Brak danych strony dokumentu.');
 const out={};for(const key of Object.keys(blankIdentity())){
  const v=value[key]??(key==='country'?'PL':'');
  if(typeof v!=='string')throw new Error('Identyfikatory wpisuj jako tekst, z zachowaniem początkowych zer.');
  if(v.length>(key==='legal_name'?120:key==='address'?200:key==='country'?2:20)||/[\x00-\x1f\x7f]/.test(v))throw new Error('Pole danych jest zbyt długie albo zawiera znak sterujący.');
  out[key]=v.trim();if(['nip','regon','krs'].includes(key))out[key]=out[key].replace(/[ \u00a0\u202f-]/g,'');
  if(key==='nip')out[key]=out[key].toUpperCase().replace(/^PL/,'');
 }
 if(out.country!=='PL')throw new Error('Ten wariant obsługuje polskie dane. Zagraniczne dokumenty wymagają osobnego wariantu.');return out;
}
export function nipValid(n){return typeof n==='string'&&/^\d{10}$/.test(n)&&n!=='0000000000'&&[6,5,7,2,3,4,5,6,7].reduce((s,w,i)=>s+w*Number(n[i]),0)%11===Number(n[9]);}
export function identityErrors(value,requireNip=true){
 let x;try{x=normalizeIdentity(value);}catch(e){return [e.message];}
 const errors=[];
 if(x.legal_name.length<2)errors.push('Uzupełnij nazwę strony.');
 if(x.address.length<4)errors.push('Uzupełnij adres strony.');
 if(requireNip&&!x.nip)errors.push('Uzupełnij NIP firmy w tym krajowym scenariuszu.');
 if(x.nip&&!nipValid(x.nip))errors.push('NIP ma błędną długość lub cyfrę kontrolną.');
 if(x.regon&&!/^(\d{9}|\d{14})$/.test(x.regon))errors.push('REGON: wpisz 9 albo 14 cyfr. To kontrola formatu, nie rejestru.');
 if(x.krs&&!/^\d{10}$/.test(x.krs))errors.push('KRS: wpisz 10 cyfr wraz z zerami na początku.');
 return errors;
}
export function prepareCompany(input,status='draft'){
 if(!input||!['draft','ready'].includes(status)||!ENTITY_TYPES.some(([k])=>k===input.entity_type)||!RECORD_SYSTEMS.some(([k])=>k===input.record_system)||!VAT_STATES.some(([k])=>k===input.vat_status))throw new Error('Sprawdź rodzaj i ustawienia jednostki.');
 const company={schema_version:1,status,entity_type:input.entity_type,record_system:input.record_system,vat_status:input.vat_status,identity:normalizeIdentity(input.identity)};
 if(status==='ready'){
  const errors=identityErrors(company.identity,true);
  if(['zoo','sa','psa','foundation'].includes(company.entity_type)&&!company.identity.krs)errors.push('Dla tego wariantu zarejestrowanej jednostki uzupełnij ćwiczeniowy KRS.');
  if(company.entity_type==='jdg'&&company.identity.krs)errors.push('JDG nie wpisujemy do KRS. Sprawdź rodzaj jednostki.');
  if(errors.length)throw new Error(errors.join(' '));
 }
 return company;
}
export function newIdentityInvoice(company,id,date,number){return {id,kind:'sale',number,party_kind:'business',date,supply_date:date,due:date,own_identity:{...company.identity},counterparty_identity:blankIdentity(),lines:[{label:'Usługa ćwiczeniowa',qty:'1',unit_price:'1000,00',tax_code:'23'}]};}
export function prepareIdentityInvoice(draft,company,status){
 if(!['draft','issued'].includes(status)||!['sale','purchase'].includes(draft.kind)||!['business','consumer'].includes(draft.party_kind)||(draft.kind==='purchase'&&draft.party_kind!=='business'))throw new Error('Nieprawidłowy rodzaj dokumentu lub strony.');
 if(!validDate(draft.date)||!validDate(draft.supply_date)||!validDate(draft.due)||draft.due<draft.date)throw new Error('Sprawdź daty dokumentu i płatności.');
 if(!/^CW\/[A-Za-z0-9_/-]{1,60}$/.test(draft.number))throw new Error('Numer zaczyna się od CW/ i nie może zawierać spacji.');
 const own=normalizeIdentity(draft.own_identity),other=normalizeIdentity(draft.counterparty_identity);
 if(status==='issued'){
  if(company?.status!=='ready')throw new Error('Najpierw zapisz i sprawdź kartę własnej firmy.');
  if(JSON.stringify(own)!==JSON.stringify(normalizeIdentity(company.identity)))throw new Error('Wczytaj aktualne dane własnej firmy do nowego dokumentu.');
  const errors=[...identityErrors(own,true),...identityErrors(other,draft.party_kind==='business')];if(errors.length)throw new Error(errors.join(' '));
 }
 const invoice=invoiceTotals({id:draft.id,kind:draft.kind,status,number:draft.number,party:other.legal_name,seller:own.legal_name,date:draft.date,supply_date:draft.supply_date,due:draft.due,identity_version:1,party_kind:draft.party_kind,own_identity:own,counterparty_identity:other,lines:draft.lines.map(l=>({label:l.label.trim(),qty_milli:scaled(l.qty,3),unit_cents:cents(l.unit_price),tax_code:l.tax_code}))});
 if(status==='issued'&&(invoice.net_cents<=0||invoice.lines.some(l=>!l.label)))throw new Error('Uzupełnij opisy i dodatnią wartość dokumentu.');return invoice;
}
export function restoreIdentityDraft(raw,version){try{const x=JSON.parse(raw);if(!x||!Number.isInteger(x.baseVersion)||x.baseVersion<1||!x.company||!x.invoice||!Array.isArray(x.invoice.lines)||x.invoice.lines.length<1||x.invoice.lines.length>20)return null;prepareCompany(x.company,'draft');normalizeIdentity(x.invoice.own_identity);normalizeIdentity(x.invoice.counterparty_identity);if(x.invoice.lines.some(l=>!l||['label','qty','unit_price','tax_code'].some(k=>typeof l[k]!=='string')))return null;return {...x,conflict:x.baseVersion!==version};}catch{return null;}}
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const amount=n=>(n/100).toLocaleString('pl-PL',{minimumFractionDigits:2,maximumFractionDigits:2})+' zł';
export function identityInvoiceHTML(raw){
 const i=invoiceTotals(raw);if(i.identity_version!==1)throw new Error('Starszy dokument nie ma zapisanych danych identyfikacyjnych. Nie dopisujemy ich wstecz.');
 const own=i.own_identity,party=i.counterparty_identity,seller=i.kind==='sale'?own:party,buyer=i.kind==='sale'?party:own;
 const block=(label,x)=>`<section><h2>${label}</h2><strong>${escape(x.legal_name)}</strong><p>${escape(x.address)}<br>${escape(x.country)}</p><p>NIP: ${escape(x.nip||'nie podano / konsument')}<br>REGON: ${escape(x.regon||'—')}<br>KRS: ${escape(x.krs||'—')}</p></section>`;
 return `<!doctype html><html lang="pl"><meta charset="utf-8"><title>${escape(i.number)} — ćwiczenie</title><style>body{font:15px/1.6 system-ui;max-width:900px;margin:30px auto;padding:24px;color:#183c2b}.warning{border:3px solid #8e3b24;padding:16px;font-weight:bold}.parties{display:flex;gap:30px}.parties section{flex:1}table{border-collapse:collapse;width:100%}td,th{padding:10px;border-bottom:1px solid #ccc;text-align:left}@media print{body{margin:0;padding:10mm}}</style><body><div class="warning">DOKUMENT ĆWICZENIOWY — NIE DO OBROTU GOSPODARCZEGO</div><h1>${escape(i.number)}</h1><p>${i.status==='issued'?'Wystawiony w symulatorze':'Szkic'} · Data wystawienia ${escape(i.date)} · Wykonanie/sprzedaż ${escape(i.supply_date)} · Termin ${escape(i.due)} · PLN</p><div class="parties">${block('Sprzedawca',seller)}${block('Nabywca',buyer)}</div><table><thead><tr><th>Opis</th><th>Ilość</th><th>Cena netto</th><th>Netto</th><th>Kod VAT</th><th>VAT</th></tr></thead><tbody>${i.lines.map(l=>`<tr><td>${escape(l.label)}</td><td>${escape(l.qty_milli/1000)}</td><td>${amount(l.unit_cents)}</td><td>${amount(l.net_cents)}</td><td>${escape(l.tax_code)}</td><td>${amount(l.tax_cents)}</td></tr>`).join('')}</tbody></table><h2>Razem: ${amount(i.gross_cents)}</h2><p>Netto ${amount(i.net_cents)} · VAT ${amount(i.tax_cents)}</p><p>Dane stron zachowano z chwili dokumentu. Kontrola numerów nie potwierdza ich nadania ani statusu VAT. Ten plik nie został wysłany do KSeF, KRS, urzędu lub kontrahenta.</p></body></html>`;
}
