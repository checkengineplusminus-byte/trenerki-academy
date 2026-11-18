import {type LedgerReport,downloadName,summaryFields,detailedCells,summarize,periodName,
 localDate,formatAmount,accountingFootnote,productName,buyerName,taxLabel,documentStatus} from './reportModel';

const bytes=(s:string)=>new TextEncoder().encode(s);
const u16=(n:number)=>[n&255,(n>>>8)&255];
const u32=(n:number)=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
const esc=(x:unknown)=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
function crc32(b:Uint8Array){
 let c=0xffffffff;
 for(const n of b){c^=n;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}
 return(c^0xffffffff)>>>0;
}
function zipFiles(files:Array<[string,string]>){
 const local:number[]=[],central:number[]=[];let offset=0;
 for(const [name,source] of files){
  const nb=bytes(name),body=bytes(source),crc=crc32(body);
  const record=[...u32(0x04034b50),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),
   ...u32(crc),...u32(body.length),...u32(body.length),...u16(nb.length),...u16(0),...nb];
  local.push(...record,...body);
  central.push(...u32(0x02014b50),...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),
   ...u32(crc),...u32(body.length),...u32(body.length),...u16(nb.length),...u16(0),...u16(0),
   ...u16(0),...u16(0),...u32(0),...u32(offset),...nb);
  offset+=record.length+body.length;
 }
 const end=[...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),
  ...u32(central.length),...u32(offset),...u16(0)];
 return new Uint8Array([...local,...central,...end]);
}
const col=(index:number)=>{let s='';for(let n=index;n>0;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s};
type Cell={value?:string|number;style?:number;formula?:string;numeric?:boolean};
const c=(value:string|number,style=0):Cell=>({value,style,numeric:typeof value==='number'});
const f=(formula:string,cache:number,style=5):Cell=>({value:cache,formula,style,numeric:true});
function rowXml(index:number,cells:Cell[],height?:number){
 return '<row r="'+index+'"'+(height?' ht="'+height+'" customHeight="1"':'')+'>'+
  cells.map((v,j)=>{
   const ref=col(j+1)+index;
   const style=v.style??0;
   if(v.formula)return '<c r="'+ref+'" s="'+style+'"><f>'+esc(v.formula)+'</f><v>'+Number(v.value||0)+'</v></c>';
   if(v.numeric)return '<c r="'+ref+'" s="'+style+'"><v>'+Number(v.value||0)+'</v></c>';
   return '<c r="'+ref+'" s="'+style+'" t="inlineStr"><is><t xml:space="preserve">'+esc(v.value)+'</t></is></c>';
  }).join('')+'</row>';
}
type Sheet={name:string;rows:Cell[][];heights:Record<number,number>;widths:number[];
 merge:string[];freeze?:number;filter?:string;landscape?:boolean};
function sheetXml(s:Sheet){
 const rows=s.rows.map((r,i)=>rowXml(i+1,r,s.heights[i+1])).join('');
 const cols=s.widths.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join('');
 const merges=s.merge.length?'<mergeCells count="'+s.merge.length+'">'+s.merge.map(r=>'<mergeCell ref="'+r+'"/>').join('')+'</mergeCells>':'';
 const freeze=s.freeze?'<sheetViews><sheetView workbookViewId="0"><pane ySplit="'+s.freeze+'" topLeftCell="A'+(s.freeze+1)+'" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>':'<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
 return '<?xml version="1.0" encoding="utf-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+freeze+
  '<sheetFormatPr defaultRowHeight="20"/><cols>'+cols+'</cols><sheetData>'+rows+'</sheetData>'+merges+
  (s.filter?'<autoFilter ref="'+s.filter+'"/>':'')+
  '<pageMargins left=".3" right=".3" top=".5" bottom=".5" header=".2" footer=".2"/>'+
  '<pageSetup orientation="'+(s.landscape?'landscape':'portrait')+'" paperSize="9" fitToWidth="1" fitToHeight="0"/></worksheet>';
}
const styles='<?xml version="1.0" encoding="utf-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'+
 '<numFmts count="2"><numFmt numFmtId="164" formatCode="dd.mm.yyyy hh:mm"/><numFmt numFmtId="165" formatCode="#,##0.00;[Red]-#,##0.00;–"/></numFmts>'+
 '<fonts count="4">'+
 '<font><sz val="11"/><name val="Aptos"/></font>'+
 '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font>'+
 '<font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Aptos Display"/></font>'+
 '<font><b/><sz val="11"/><color rgb="FF193A2B"/><name val="Aptos"/></font>'+
 '</fonts>'+
 '<fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'+
 '<fill><patternFill patternType="solid"><fgColor rgb="FF153D2D"/></patternFill></fill>'+
 '<fill><patternFill patternType="solid"><fgColor rgb="FFEAF2E7"/></patternFill></fill>'+
 '<fill><patternFill patternType="solid"><fgColor rgb="FFF7F9F6"/></patternFill></fill>'+
 '<fill><patternFill patternType="solid"><fgColor rgb="FFF8E8C4"/></patternFill></fill></fills>'+
 '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>'+
 '<border><left/><right/><top/><bottom style="thin"><color rgb="FFDCE5D9"/></bottom><diagonal/></border></borders>'+
 '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
 '<cellXfs count="12">'+
 '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'+ // 0 plain
 '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/>'+ // 1 dark header
 '<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/>'+ // 2 title
 '<xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFill="1" applyFont="1"/>'+ // 3 light header
 '<xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1"/>'+ // 4 zebra
 '<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/>'+ // 5 money
 '<xf numFmtId="165" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1"/>'+ //6 money alt
 '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/>'+ //7 date
 '<xf numFmtId="164" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1"/>'+ //8 date alt
 '<xf numFmtId="0" fontId="3" fillId="5" borderId="1" xfId="0" applyFill="1"/>'+ //9 note
 '<xf numFmtId="165" fontId="3" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1"/>'+ //10 total
 '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0"/>'+ //11 border
 '</cellXfs></styleSheet>';
function toExcelDate(date:string,time?:string){
 const t=/^\d{4}-\d{2}-\d{2}$/.test(date)?Date.parse(date+'T00:00:00Z'):0;
 const ms=t?((t-Date.UTC(1899,11,30))/86400000):0;
 const parts=/^(\d\d):(\d\d)$/.exec(time||'');
 return ms+(parts?(Number(parts[1])*60+Number(parts[2]))/1440:0);
}
const pad=(items:Cell[],n:number)=>[...items,...Array.from({length:Math.max(0,n-items.length)},()=>c('',0))];
export function downloadLedgerXlsx(report:LedgerReport){
 if(typeof document==='undefined')throw new Error('Otwórz panel w przeglądarce internetowej.');
 const totals=summarize(report);
 const single=report.rows.length===1;
 const title=single?'KARTA TRANSAKCJI':report.period.length===4?'RAPORT ROCZNY':'RAPORT MIESIĘCZNY';
 const summary:Sheet={name:'Podsumowanie',rows:[],heights:{1:34,2:24,5:26,8:26},
  widths:[19,20,20,20,20,21,22,20,18],merge:['A1:I1','A2:I2','A5:I5','A7:I7','A'+(12+totals.length)+':I'+(12+totals.length)],
  landscape:true};
 summary.rows.push(pad([c('TRENERKI  /  '+title,2)],9));
 summary.rows.push(pad([c('Stripe + Saldeo   ·   '+periodName(report.period)+'   ·   Europe/Warsaw',1)],9));
 summary.rows.push([]);
 summary.rows.push(pad([c('Sprzedawca',3),c('TRENERKI sp. z o.o.  |  NIP 5272961874'),
  c('Wygenerowano',3),c(new Date(report.generated_at||Date.now()).toLocaleString('pl-PL'))],9));
 summary.rows.push(pad([c('PODSUMOWANIE OPERACJI — KWOTY W WALUTACH ŹRÓDŁOWYCH',3)],9));
 summary.rows.push([]);
 summary.rows.push(pad([c('Kwoty sprzedaży i opłat są odrębnymi kategoriami. Wypłat nie dodaje się do przychodu.',9)],9));
 summary.rows.push(['Waluta','Sprzedaż brutto','Zwroty','Opłaty Stripe','Wypłaty Stripe','Zmiana salda','Operacje','Braki dokumentów']
  .map(x=>c(x,1)));
 for(const t of totals){
  summary.rows.push(pad([c(t.currency,3),c(t.charges/100,10),c(t.refunds/100,10),c(t.fees/100,10),
   c(t.payouts/100,10),c(t.balanceChange/100,10),c(t.transactions,3),c(t.documentMissing,3)],9));
 }
 while(summary.rows.length<11+totals.length)summary.rows.push([]);
 summary.rows.push(pad([c('DOKUMENT POMOCNICZY • Nie stanowi faktury VAT ani raportu JPK_V7. VAT zależy od dokumentów źródłowych.',9)],9));
 summary.rows.push([]);
 summary.rows.push(pad([c(single?'SZCZEGÓŁY TRANSAKCJI':'GDZIE ZNALEŹĆ SZCZEGÓŁY',3)],9));
 if(single){
  const r=report.rows[0];
  for(const [label,val] of [
   ['Data operacji',localDate(r.date)+' '+(r.time||'')],
   ['Rodzaj / produkt',productName(r)],
   ['Nabywca',buyerName(r)],
   ['Numer Stripe',r.source],
   ['Dokument Saldeo',r.document?.document_number||'Nie przypisano'],
   ['Status dokumentu',documentStatus(r)],
   ['Klasyfikacja VAT',taxLabel(r)]])summary.rows.push(pad([c(label,3),c(val)],9));
 }else summary.rows.push(pad([c('Arkusz Transakcje',3),c('Pełny rejestr z datami, nabywcami, kursami, kwotami i numerami dokumentów')],9));
 const details:Sheet={name:'Transakcje',rows:[],heights:{1:32,2:24,4:24,5:36},
   widths:[24,22,39,35,12,12,19,18,19,21,28,20,40,34,42,42,22],merge:['A1:Q1','A2:Q2','A4:Q4'],
   landscape:true,freeze:5,filter:'A5:Q'+Math.max(5,5+report.rows.length)};
 details.rows.push(pad([c('TRENERKI  /  REJESTR OPERACJI',2)],17));
 details.rows.push(pad([c(periodName(report.period)+'   |   '+report.rows.length+' operacji   |   Strefa czasu: Europe/Warsaw',1)],17));
 details.rows.push([]);
 details.rows.push(pad([c('Kwota po opłacie Stripe ≠ sprzedaż netto VAT. Dokumenty źródłowe w Saldeo/KSeF.',9)],17));
 details.rows.push(summaryFields.map(x=>c(x,1)));
 report.rows.forEach((r,i)=>{
  const data=detailedCells(r);
  const cells=data.map((v,j)=>{
   if(j===0)return c(toExcelDate(r.date,r.time),i%2?8:7);
   if(j===6||j===7||j===8)return c(Number(v),i%2?6:5);
   return c(String(v),i%2?4:11);
  });
  details.rows.push(cells);
 });
 const info:Sheet={name:'Objaśnienia',rows:[],heights:{1:34,2:25},widths:[30,94],merge:['A1:B1','A2:B2'],landscape:false};
 info.rows.push([c('TRENERKI  /  OBJAŚNIENIA',2)]);
 info.rows.push([c('Zakres i zasady interpretacji raportu',1)]);
 for(const [label,value] of [
  ['Sprzedaż brutto','Kwota zapłacona przez klienta; bez potrącania prowizji Stripe.'],
  ['Opłaty Stripe','Prowizje pobrane przez operatora płatności, a nie VAT od kursów.'],
  ['Kwota po opłacie','Kwota rozrachunku operatora po prowizji, nie przychód netto VAT.'],
  ['Wypłaty Stripe','Przekazanie środków z konta Stripe, a nie nowa sprzedaż.'],
  ['Zmiana salda','Suma kwot po opłacie ze wszystkich operacji okresu, nie bieżące saldo konta Stripe.'],
  ['Data operacji','Data ujęcia przez Stripe wg strefy Europe/Warsaw.'],
  ['Data dostępności','Jeżeli jest: termin dostępności środków w Stripe, nie data wpływu na rachunek bankowy.'],
  ['Dokument Saldeo','Numer dokumentu wpisany do rejestru Trenerki; nie oznacza automatycznego wystawienia faktury.'],
  ['Klasyfikacja VAT','Oznaczenie ręcznie potwierdzone przy transakcji; raport nie nalicza podatku VAT automatycznie.'],
  ['Podstawa rozliczenia','Zestawienie pomocnicze. Dla księgowania należy zachować źródłowe faktury, WEW, dokumenty operatora i wyciągi.'],
  ['Źródła danych','Stripe Balance Transactions, Stripe Charges, potwierdzone zakupy Trenerki i rejestr dokumentów Saldeo.'],
  ['Uwagi','W razie braku danych nabywcy lub kursu w raporcie pojawi się komunikat o konieczności weryfikacji.']
 ])info.rows.push([c(label,3),c(value)]);
 if(report.warnings?.length){
  info.rows.push([c('UWAGI DO DANYCH',9),c(report.warnings.join('; '),9)]);
 }
 const sheets=[summary,details,info];
 const workbook='<?xml version="1.0" encoding="utf-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>'+
  sheets.map((s,i)=>'<sheet name="'+esc(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+
  '</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>';
 const files:Array<[string,string]>=[
  ['[Content_Types].xml','<?xml version="1.0" encoding="utf-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+sheets.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>'],
  ['_rels/.rels','<?xml version="1.0" encoding="utf-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
  ['xl/workbook.xml',workbook],
  ['xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="utf-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+'<Relationship Id="rId'+(sheets.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
  ['xl/styles.xml',styles],
  ...sheets.map((s,i)=>['xl/worksheets/sheet'+(i+1)+'.xml',sheetXml(s)] as [string,string])
 ];
 const arr=zipFiles(files);
 const url=URL.createObjectURL(new Blob([new Uint8Array(arr).buffer],{
  type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
 const a=document.createElement('a');
 a.href=url;a.download=downloadName(report)+'.xlsx';
 document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),15000);
}
