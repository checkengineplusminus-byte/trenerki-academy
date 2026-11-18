/**
 * Jedno źródło pól raportowych dla eksportów PDF/XLSX oraz widoku księgowego.
 * Dane pochodzą z uwierzytelnionego raportu Stripe + rejestru Saldeo; bez domyślnych stawek VAT.
 */
export type LedgerLine={
 id:string;date:string;time?:string;created_at_utc?:string;available_on?:string;source:string;
 category:string;currency:string;gross_grosze:number;fee_grosze:number;net_grosze:number;
 product?:string;customer_email?:string;customer_name?:string;customer_country?:string;
 payment_intent_id?:string;purchase_category?:string;purchase_date?:string;
 payment_status?:string;stripe_description?:string;
 document?:{document_type?:string;document_status?:string;document_number?:string|null;
  ksef_number?:string|null;tax_treatment?:string;notes?:string|null}|null;
};
export type LedgerReport={period:string;rows:LedgerLine[];scope?:'transaction'|'period';time_zone?:string;generated_at?:string;
 warnings?:string[]};
const typeLabels:Record<string,string>={
 charge:'Sprzedaż',refund:'Zwrot',payout:'Wypłata Stripe',stripe_fee:'Opłata Stripe',
 fee:'Opłata Stripe',adjustment:'Korekta Stripe',dispute:'Spór / reklamacja',
 payment_failure_refund:'Zwrot nieudanej płatności',payout_failure:'Zwrot wypłaty',
 reserve_transaction:'Rezerwa Stripe',other:'Inna operacja'
};
const taxLabels:Record<string,string>={
 review:'Do sprawdzenia',pl_23:'Polska · 23% — potwierdzone w rejestrze',
 exempt:'Zwolnienie — oznaczenie w rejestrze',
 reverse_charge:'Reverse charge — oznaczenie w rejestrze',
 oss:'OSS — oznaczenie w rejestrze',outside_scope:'Poza zakresem PL — oznaczenie w rejestrze'
};
const docLabels:Record<string,string>={
 b2c_register:'Ewidencja sprzedaży B2C',b2c_invoice:'Faktura B2C',
 b2b_invoice:'Faktura B2B',refund_correction:'Korekta',pending:'Do ustalenia'
};
export const operationLabel=(c:string)=>typeLabels[c]||'Operacja Stripe: '+c;
export const documentLabel=(r:LedgerLine)=>docLabels[r.document?.document_type||'pending']||'Do ustalenia';
export const taxLabel=(r:LedgerLine)=>taxLabels[r.document?.tax_treatment||'review']||'Do sprawdzenia';
export const documentStatus=(r:LedgerLine)=>{
 const st=r.document?.document_status||'pending';
 return st==='reconciled'?'Uzgodniony':st==='issued'?'Wystawiony':st==='prepared'?'Przygotowany':st==='review'?'Do wyjaśnienia':'Nieprzypisany';
};
export const documentReference=(r:LedgerLine)=>r.document?.document_number?.trim()||'Brak numeru';
export const productName=(r:LedgerLine)=>r.product?.trim()||(
 r.category==='charge'?'Nie zidentyfikowano zakupu — sprawdź w Stripe':operationLabel(r.category));
export const buyerName=(r:LedgerLine)=>[r.customer_name?.trim(),r.customer_email?.trim()]
 .filter(Boolean).join(' · ')||'Brak danych klienta';
export const localDate=(d:string)=>/^\d{4}-\d{2}-\d{2}$/.test(d)?
 d.slice(8,10)+'.'+d.slice(5,7)+'.'+d.slice(0,4):d||'—';
export const localDateTime=(r:LedgerLine)=>localDate(r.date)+(r.time?' · '+r.time:'')+' (Warszawa)';
export const periodName=(s:string)=>/^\d{4}-(0[1-9]|1[0-2])$/.test(s)?
  ['styczeń','luty','marzec','kwiecień','maj','czerwiec','lipiec','sierpień','wrzesień','październik','listopad','grudzień'][Number(s.slice(5))-1]+' '+s.slice(0,4):
  (/^\d{4}$/.test(s)?'rok '+s:s);
const zeroDecimalCurrencies=new Set(['BIF','CLP','DJF','GNF','JPY','KMF','KRW','MGA','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF']);
export const minorUnitFactor=(currency='PLN')=>zeroDecimalCurrencies.has(currency.toUpperCase())?1:100;
export const formatAmount=(n:number,currency='PLN')=>new Intl.NumberFormat('pl-PL',{
 minimumFractionDigits:minorUnitFactor(currency)===1?0:2,
 maximumFractionDigits:minorUnitFactor(currency)===1?0:2
}).format((Number(n)||0)/minorUnitFactor(currency)).replace(/[\u00a0\u202f]/g,' ')+(currency?' '+currency:'');
export const downloadName=(report:LedgerReport)=>'Trenerki-'+(
 report.scope==='transaction'&&report.rows.length===1?'transakcja-'+report.rows[0].date+'-'+report.rows[0].id:
 report.period.length===4?'raport-roczny-'+report.period:'raport-miesieczny-'+report.period);
export type CurrencyTotals={
 currency:string;transactions:number;charges:number;refunds:number;fees:number;
 payouts:number;balanceChange:number;other:number;documentMissing:number;
};
export function summarize(report:LedgerReport):CurrencyTotals[]{
 const map=new Map<string,CurrencyTotals>();
 for(const row of report.rows){
  const key=row.currency||'PLN';
  const v=map.get(key)||{currency:key,transactions:0,charges:0,refunds:0,fees:0,
   payouts:0,balanceChange:0,other:0,documentMissing:0};
  v.transactions++;
  if(row.category==='charge'){
   v.charges+=row.gross_grosze;
   if(!['issued','reconciled'].includes(row.document?.document_status||''))v.documentMissing++;
  }else if(row.category==='refund')v.refunds+=Math.abs(row.gross_grosze);
  else if(row.category==='payout')v.payouts+=Math.abs(row.net_grosze);
  else v.other+=row.gross_grosze;
  v.fees+=row.fee_grosze;
  v.balanceChange+=row.net_grosze;
  map.set(key,v);
 }
 return [...map.values()].sort((a,b)=>a.currency.localeCompare(b.currency));
}
export const accountingFootnote='Raport uzgodnieniowy Stripe / Saldeo, nie jest fakturą, paragonem ani plikiem JPK_V7. '+
 'Kwota po opłacie Stripe nie oznacza wartości sprzedaży netto dla VAT. '+
 'Wypłata Stripe nie jest nową sprzedażą. Dane VAT wymagają dokumentu źródłowego.';
export const summaryFields=['Data / godzina','Rodzaj operacji','Produkt / kurs','Nabywca',
 'Kraj','Waluta','Kwota operacji','Opłata Stripe','Po opłacie',
 'Status płatności','Dokument Saldeo','Status dokumentu','Klasyfikacja VAT',
 'Nr KSeF','ID Stripe','Payment Intent','Data dostępności środków'];
export function detailedCells(r:LedgerLine){
 const available=r.available_on?new Intl.DateTimeFormat('pl-PL',{timeZone:'Europe/Warsaw',
  year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(r.available_on)):'';
 return [localDate(r.date)+(r.time?' '+r.time:''),operationLabel(r.category),productName(r),
  buyerName(r),r.customer_country||'—',r.currency,
  r.gross_grosze/minorUnitFactor(r.currency),r.fee_grosze/minorUnitFactor(r.currency),r.net_grosze/minorUnitFactor(r.currency),
  r.payment_status||'—',documentReference(r),documentStatus(r),taxLabel(r),
  r.document?.ksef_number||'—',r.source,r.payment_intent_id||'—',available];
}
