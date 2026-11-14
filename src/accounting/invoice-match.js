/**
 * Sprawdzenie powiązań FIKCYJNEGO banku z fakturami.
 * Dopasowanie zapłaty nie jest dekretem ani weryfikacją banku.
 * Kwoty w groszach, bez domniemanych stawek podatkowych.
 */
import {invoiceTotals} from './lab-core-base.js';
import {bankRowAvailableForInvoice} from './payroll-practice.js';
const MAX=1000000000000;
const amountOK=n=>Number.isSafeInteger(n)&&n>0&&n<=MAX;
const sum=(rows)=>rows.reduce((v,m)=>v+m.amount_cents,0);

export function checkInvoiceBankMatch(state,match){
 if(!state||!Array.isArray(state.bank)||!Array.isArray(state.invoices)||!Array.isArray(state.matches))
  throw new Error('Brak prawidłowego stanu faktur, banku i rozrachunków.');
 if(!match||typeof match.id!=='string'||!match.id.trim()||match.id.length>128||
   typeof match.bank_id!=='string'||typeof match.invoice_id!=='string'||!amountOK(match.amount_cents))
  throw new Error('Podaj istniejący przelew, wystawioną fakturę i dodatnią kwotę rozliczenia.');
 if(state.matches.some(x=>x?.id===match.id))
  throw new Error('To przypisanie już istnieje. Nie zapisuj go ponownie.');
 const bank=state.bank.find(x=>x?.id===match.bank_id);
 const invoice=state.invoices.find(x=>x?.id===match.invoice_id);
 if(!bank||!invoice||invoice.status!=='issued'||!['sale','purchase'].includes(invoice.kind))
  throw new Error('Wybierz istniejący przelew i wystawioną fakturę sprzedaży lub zakupu.');
 if(!Number.isSafeInteger(bank.amount_cents)||bank.amount_cents===0||
    Math.abs(bank.amount_cents)>MAX)
  throw new Error('Kwota operacji bankowej nie jest poprawną kwotą w groszach.');
 if(invoice.kind==='sale'&&bank.amount_cents<0)
  throw new Error('Wpłatę klienta (plus) przypisz do faktury sprzedaży, nie do wydatku.');
 if(invoice.kind==='purchase'&&bank.amount_cents>0)
  throw new Error('Zapłatę dostawcy (minus) przypisz do faktury zakupu, nie do wpływu.');
 if(!bankRowAvailableForInvoice(state,bank.id))
  throw new Error('Ta pozycja CSV jest już wykorzystana do listy płac albo nie istnieje.');
 const gross=invoiceTotals(invoice).gross_cents;
 if(!amountOK(gross))throw new Error('Faktura ma nieprawidłową kwotę brutto.');
 const relevant=state.matches.filter(x=>x?.bank_id===bank.id||x?.invoice_id===invoice.id);
 if(relevant.some(x=>!amountOK(x.amount_cents)))
  throw new Error('Zapisane wcześniej przypisanie ma błędną kwotę. Najpierw wyjaśnij rozrachunki.');
 const bankUsed=sum(relevant.filter(x=>x.bank_id===bank.id));
 const invoiceUsed=sum(relevant.filter(x=>x.invoice_id===invoice.id));
 const bankRemaining=Math.abs(bank.amount_cents)-bankUsed;
 const invoiceRemaining=gross-invoiceUsed;
 if(!Number.isSafeInteger(bankUsed)||!Number.isSafeInteger(invoiceUsed)||
    bankRemaining<=0||invoiceRemaining<=0)
  throw new Error('Operacja lub faktura jest już rozliczona albo zawiera nadpłatę.');
 if(match.amount_cents>bankRemaining||match.amount_cents>invoiceRemaining)
  throw new Error('Kwota przekracza pozostałą wartość przelewu lub faktury.');
 return {allowed:true,bank_remaining_cents:bankRemaining-match.amount_cents,
  invoice_remaining_cents:invoiceRemaining-match.amount_cents,
  invoice_kind:invoice.kind,training_only:true,ledger_posted:false};
}
export function withInvoiceBankMatch(state,match){
 checkInvoiceBankMatch(state,match);
 return {...state,matches:[...state.matches,{...match}]};
}
/** Odczytowy przegląd starszych zapisów – nie usuwa istniejących przypisań. */
export function inspectInvoiceBankMatches(state){
 if(!Array.isArray(state?.matches)||!state.matches.length)return [];
 const issues=[];
 let replay={...state,matches:[]};
 for(const match of state.matches.slice(0,500)){
  try{replay=withInvoiceBankMatch(replay,match);}
  catch(error){issues.push({code:'invalid_invoice_payment_match',
   title:'Niespójne przypisanie przelewu',
   text:'Sprawdź wcześniejsze powiązanie banku z fakturą: '+String(error?.message||'nieznany błąd'),
   entity:'match',id:String(match?.id||''),severity:'błąd'});}
 }
 if(state.matches.length>500)issues.push({code:'invoice_match_review_limit',
  title:'Zbyt wiele rozrachunków do kontroli w tym modelu',
  text:'Część przypisań wykracza poza limit 500 pozycji przeglądu.',
  entity:'report',id:'matches',severity:'uwaga'});
 return issues;
}
