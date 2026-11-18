import {type LedgerReport,type LedgerLine,summarize,downloadName,periodName,formatAmount,
 localDateTime,operationLabel,productName,buyerName,documentStatus,documentLabel,
 documentReference,taxLabel,accountingFootnote} from './reportModel';

const green='#163A2D',forest='#255B46',muted='#64756A',light='#EDF3ED';
const border='#DAE5DB',amber='#FBF2DE',white='#FFFFFF',ink='#20382D';
const styleCell=(text:any,bold=false,align:'left'|'right'='left',extra:any={})=>({
 text:String(text??'—'),fontSize:8,color:ink,bold,alignment:align,margin:[0,5,0,5],...extra
});
function box(value:string,label:string){
 return {table:{widths:['*'],body:[[{text:label.toUpperCase(),fontSize:7.4,color:muted,bold:true,margin:[9,8,9,4]}],
  [{text:value,fontSize:17,bold:true,color:green,margin:[9,1,9,10]}]]},
  layout:{fillColor:()=>light,hLineWidth:()=>0,vLineWidth:()=>0},margin:[0,0,8,0]};
}
const line=(label:string,value:string):any=>[
 {text:label,color:muted,bold:true,margin:[0,6,5,6],fontSize:9},
 {text:value||'—',color:ink,margin:[0,6,0,6],fontSize:9}
];
function section(name:string,rows:Array<[string,string]>){
 return [
  {text:name,style:'section',margin:[0,19,0,7]},
  {table:{widths:[145,'*'],body:rows.map(([a,b])=>line(a,b))},
   layout:{hLineWidth:(i:number)=>i?0.55:0,vLineWidth:()=>0,
    hLineColor:()=>border,paddingLeft:()=>5,paddingRight:()=>5}}
 ];
}
function printableDate(input:string|undefined){
 if(!input)return '—';
 const t=new Date(input);if(!Number.isFinite(t.getTime()))return input;
 return new Intl.DateTimeFormat('pl-PL',{timeZone:'Europe/Warsaw',year:'numeric',month:'2-digit',
  day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(t);
}
function singleContent(report:LedgerReport){
 const r=report.rows[0];
 const status=documentStatus(r);
 const isPaid=r.category==='charge';
 const banner={table:{widths:['*'],body:[[{stack:[
  {text:'KARTA TRANSAKCJI',fontSize:23,bold:true,color:white,margin:[17,13,0,3]},
  {text:'TRENERKI  /  ROZLICZENIA STRIPE + SALDEO',fontSize:8.5,color:'#D2E8D6',margin:[17,0,0,12]}
 ]}]]},layout:{fillColor:()=>green,hLineWidth:()=>0,vLineWidth:()=>0}};
 const amounts={columns:[
  box(formatAmount(r.gross_grosze,r.currency),'Kwota operacji'),
  box(formatAmount(r.fee_grosze,r.currency),'Opłata Stripe'),
  box(formatAmount(r.net_grosze,r.currency),'Po opłacie')
 ],columnGap:0,margin:[0,14,0,6]};
 const context:any[]=[
  banner,
  {columns:[
   {text:operationLabel(r.category),fontSize:13,bold:true,color:forest},
   {text:localDateTime(r),fontSize:9,color:muted,alignment:'right'}
  ],margin:[0,12,0,0]},
  {text:productName(r),fontSize:17,bold:true,color:ink,margin:[0,8,0,9]},
  amounts,
  ...section('1  |  SPRZEDAŻ / OPERACJA',[
   ['Rodzaj operacji',operationLabel(r.category)],
   ['Produkt / kurs',productName(r)],
   ['Nabywca',buyerName(r)],
   ['Kraj nabywcy',r.customer_country||'Nie podano'],
   ['Status płatności',r.payment_status||(isPaid?'Sprawdź w Stripe':'—')]
  ]),
  ...section('2  |  DOKUMENTY I PODATEK',[
   ['Rodzaj dokumentu',documentLabel(r)],
   ['Numer Saldeo / ewidencji',documentReference(r)],
   ['Status dokumentu',status],
   ['Numer KSeF',r.document?.ksef_number||'Nie przypisano'],
   ['Kwalifikacja VAT',taxLabel(r)]
  ]),
  ...section('3  |  IDENTYFIKATORY I DATY',[
   ['Data i godzina operacji',localDateTime(r)],
   ['Dostępność środków',printableDate(r.available_on)],
   ['Identyfikator operacji',r.id],
   ['Źródło Stripe',r.source],
   ['Payment Intent',r.payment_intent_id||'—']
  ]),
  {text:accountingFootnote,fontSize:8,color:muted,margin:[0,18,0,0],lineHeight:1.3}
 ];
 if(report.warnings?.length)context.push({text:report.warnings.join(' · '),fontSize:8,
  color:'#855C19',fillColor:amber,margin:[0,12,0,0]});
 return context;
}
function reportContent(report:LedgerReport){
 const totals=summarize(report);
 const title=report.period.length===4?'RAPORT ROCZNY':'RAPORT MIESIĘCZNY';
 const intro:any[]=[
  {table:{widths:['*'],body:[[{stack:[
   {text:title,fontSize:24,bold:true,color:white,margin:[17,12,0,3]},
   {text:'Rozliczenie sprzedaży, opłat i wypłat Stripe',fontSize:10,color:'#DDEDE0',margin:[17,0,0,11]}
  ]}]]},layout:{fillColor:()=>green,hLineWidth:()=>0,vLineWidth:()=>0}},
  {columns:[
   {stack:[{text:periodName(report.period).toUpperCase(),fontSize:14,bold:true,color:forest},
    {text:'Strefa czasu: Europe/Warsaw  •  TRENERKI sp. z o.o.',fontSize:8.5,color:muted,margin:[0,4,0,0]}]},
   {text:'NIP 5272961874',alignment:'right',fontSize:9,bold:true,color:ink}
  ],margin:[0,15,0,12]},
  {text:'PODSUMOWANIE FINANSOWE',style:'section',margin:[0,5,0,8]}
 ];
 for(const t of totals){
  intro.push({text:'WALUTA: '+t.currency,fontSize:9.5,bold:true,color:forest,margin:[0,7,0,6]});
  intro.push({columns:[
   box(formatAmount(t.charges,t.currency),'Sprzedaż brutto'),
   box(formatAmount(t.refunds,t.currency),'Zwroty'),
   box(formatAmount(t.fees,t.currency),'Opłaty Stripe'),
   box(formatAmount(t.payouts,t.currency),'Wypłaty Stripe')
  ],columnGap:0,margin:[0,0,0,4]});
  intro.push({columns:[
   {text:'Zmiana salda Stripe w okresie: '+formatAmount(t.balanceChange,t.currency),
    fontSize:9,bold:true,color:green},
   {text:'Liczba operacji: '+t.transactions+'  •  Sprzedaż bez dokumentu: '+t.documentMissing,
    fontSize:8,alignment:'right',color:t.documentMissing?'#825719':muted}
  ],margin:[0,5,0,7]});
 }
 if(!totals.length)intro.push({text:'Brak operacji w podanym okresie.',color:muted,fontSize:10});
 if(report.warnings?.length)intro.push({text:'UWAGI: '+report.warnings.join(' · '),fontSize:8.5,
  color:'#825719',margin:[0,9,0,7]});
 intro.push({text:'SZCZEGÓŁOWE OPERACJE',style:'section',margin:[0,20,0,8]});
 const headings=['DATA / GODZINA','RODZAJ','KURS / OPIS','NABYWCA','KWOTA','OPŁATA','PO OPŁACIE','WAL.','DOKUMENT'];
 const cols=[80,69,'*',126,61,58,66,34,85];
 const ordered=[...report.rows].sort((a,b)=>(b.created_at_utc||b.date).localeCompare(a.created_at_utc||a.date));
 const body:any[][]=[headings.map(h=>({text:h,color:white,bold:true,fontSize:7.2,margin:[3,6,3,6]}))];
 ordered.forEach(r=>{
  const doc=r.document?.document_number||documentStatus(r);
  body.push([
   localDateTime(r).replace(' (Warszawa)',''),
   operationLabel(r.category),
   productName(r),
   buyerName(r),
   formatAmount(r.gross_grosze,''),
   formatAmount(r.fee_grosze,''),
   formatAmount(r.net_grosze,''),
   r.currency,doc
  ].map((value,i)=>styleCell(value,i===4||i===6,i>=4&&i<=6?'right':'left',{
   margin:[3,5,3,5],fontSize:i===2||i===3?7.6:7.8
  })));
 });
 intro.push({table:{headerRows:1,widths:cols,body,dontBreakRows:true,
  keepWithHeaderRows:1},layout:{
   fillColor:(i:number)=>i===0?green:i%2===0?'#F4F7F3':white,
   hLineWidth:(i:number)=>i===0?0:0.45,vLineWidth:()=>0,hLineColor:()=>border
  }});
 intro.push({text:accountingFootnote,fontSize:8,color:muted,margin:[0,14,0,0]});
 return intro;
}
export function buildPdfDefinition(report:LedgerReport){
 const single=report.rows.length===1;
 const generated=printableDate(report.generated_at||new Date().toISOString());
 const def:any={
  pageSize:'A4',pageOrientation:single?'portrait':'landscape',
  pageMargins:single?[38,35,38,37]:[27,28,27,34],
  info:{title:'TRENERKI - '+(single?'karta transakcji':periodName(report.period)),
   author:'TRENERKI sp. z o.o.',subject:'Zestawienie pomocnicze operacji Stripe i dokumentów Saldeo',
   keywords:'TRENERKI Stripe Saldeo rozliczenie'},
  defaultStyle:{font:'Roboto',fontSize:9,color:ink,lineHeight:1.16},
  styles:{section:{fontSize:11,bold:true,color:forest}},
  footer:(p:number,n:number)=>({columns:[
   {text:'TRENERKI sp. z o.o. · Raport pomocniczy Stripe / Saldeo',fontSize:7.3,color:muted},
   {text:'Wygenerowano '+generated+'  ·  Strona '+p+' / '+n,fontSize:7.3,color:muted,alignment:'right'}
  ],margin:single?[38,9,38,0]:[27,9,27,0]}),
  content:single?singleContent(report):reportContent(report)
 };
 return def;
}
export async function downloadLedgerPdf(report:LedgerReport){
 if(typeof window==='undefined')throw new Error('Pobieranie PDF jest dostępne w przeglądarce internetowej.');
 // Embedded Roboto supports Polish glyphs in the generated PDF.
 const module:any=await import('pdfmake/build/pdfmake');
 const fontsModule:any=await import('pdfmake/build/vfs_fonts');
 const pdfMake:any=module.default||module;
 const fonts:any=fontsModule.default||fontsModule;
 if(pdfMake.addVirtualFileSystem)pdfMake.addVirtualFileSystem(fonts.pdfMake?.vfs||fonts);
 else pdfMake.vfs=fonts.pdfMake?.vfs||fonts;
 const pdf=pdfMake.createPdf(buildPdfDefinition(report));
 await pdf.download(downloadName(report)+'.pdf');
}
