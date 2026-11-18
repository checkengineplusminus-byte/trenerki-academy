/* Browser-only accounting downloads. No external library, no server keys. */
export type LedgerLine = {
 date:string; category:string;currency:string;
 gross_grosze:number;fee_grosze:number;net_grosze:number;source:string;id:string;
 document?:{document_number?:string|null;document_status?:string;tax_treatment?:string}|null;
};
const normalized=(s:unknown)=>String(s??'');
const money=(cents:number)=>Number(cents/100).toFixed(2);
const kind=(category:string)=>({charge:'Sprzedaz',refund:'Zwrot',payout:'Wyplata'} as Record<string,string>)[category]||category;
export function ledgerRows(period:string, rows:LedgerLine[]){
 const headings=['Data','Rodzaj','Waluta','Kwota','Oplata Stripe','Po oplacie','Dokument Saldeo','Numer operacji'];
 const data=rows.map(x=>[x.date,kind(x.category),x.currency,money(x.gross_grosze),
    money(x.fee_grosze),money(x.net_grosze),x.document?.document_number||'',x.source]);
 return {title:rows.length===1?'Trenerki - transakcja '+rows[0].date:'Trenerki - rozliczenia '+period,headings,data};
}
function saveBlob(bytes:BlobPart[],name:string,mime:string){
 if(typeof document==='undefined')throw Error('Pobieranie dostepne w przegladarce internetowej.');
 const url=URL.createObjectURL(new Blob(bytes,{type:mime}));
 const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),15000);
}
const escXml=(x:unknown)=>normalized(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
const utf8=(s:string)=>new TextEncoder().encode(s);
const u16=(n:number)=>[n&255,(n>>>8)&255];
const u32=(n:number)=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
function crc32(b:Uint8Array){let c=0xffffffff;for(const n of b){c^=n;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
function zipFiles(files:Array<[string,string]>){
 const blocks:number[]=[];const central:number[]=[];let offset=0;
 for(const [name,source] of files){
  const nb=utf8(name),body=utf8(source),checksum=crc32(body);
  const local=[...u32(0x04034b50),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(checksum),...u32(body.length),...u32(body.length),...u16(nb.length),...u16(0),...nb];
  blocks.push(...local,...body);
  central.push(...u32(0x02014b50),...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),
    ...u32(checksum),...u32(body.length),...u32(body.length),...u16(nb.length),...u16(0),
    ...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...nb);
  offset+=local.length+body.length;
 }
 const end=[...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(central.length),...u32(offset),...u16(0)];
 return new Uint8Array([...blocks,...central,...end]);
}
export function downloadLedgerXlsx(period:string,rows:LedgerLine[]){
 const {headings,data}=ledgerRows(period,rows);
 const values=[headings,...data];
 const letters=(n:number)=>{let out='';for(let v=n+1;v>0;v=Math.floor((v-1)/26))out=String.fromCharCode(65+(v-1)%26)+out;return out};
 const sheetRows=values.map((cells,i)=>'<row r="'+(i+1)+'">'+cells.map((v,j)=>{
  const numeric=i>0&&[3,4,5].includes(j);
  const cell=letters(j)+(i+1);
  return numeric?'<c r="'+cell+'" s="1"><v>'+Number(v)+'</v></c>':
   '<c r="'+cell+'" t="inlineStr"'+(i===0?' s="2"':'')+'><is><t>'+escXml(v)+'</t></is></c>';
 }).join('')+'</row>').join('');
 const sheet='<?xml version="1.0" encoding="utf-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="16"/><cols>'+headings.map((_,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+([16,18,12,18,18,18,30,44][i])+'" customWidth="1"/>').join('')+'</cols><sheetData>'+sheetRows+'</sheetData><autoFilter ref="A1:H'+values.length+'"/></worksheet>';
 const files:Array<[string,string]>=[
  ['[Content_Types].xml','<?xml version="1.0" encoding="utf-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
  ['_rels/.rels','<?xml version="1.0" encoding="utf-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
  ['xl/workbook.xml','<?xml version="1.0" encoding="utf-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Rozliczenia Stripe" sheetId="1" r:id="rId1"/></sheets></workbook>'],
  ['xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="utf-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
  ['xl/styles.xml','<?xml version="1.0" encoding="utf-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>'],
  ['xl/worksheets/sheet1.xml',sheet]
 ];
 saveBlob([zipFiles(files)],'Trenerki-rozliczenia-'+period+(rows.length===1?'-'+rows[0].id:'')+'.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
// Dependency-free, multi-page A4 landscape PDF. Standard fonts are WinAnsi;
// accented Polish letters are approximated only within PDF for viewer portability.
const ascii=(s:string)=>normalized(s).replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g,c=>({'ą':'a','ć':'c','ę':'e','ł':'l','ń':'n','ó':'o','ś':'s','ź':'z','ż':'z','Ą':'A','Ć':'C','Ę':'E','Ł':'L','Ń':'N','Ó':'O','Ś':'S','Ź':'Z','Ż':'Z'}[c]!)).replace(/[^\x20-\x7E]/g,' ');
const pdfEscape=(s:string)=>ascii(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
export function downloadLedgerPdf(period:string,rows:LedgerLine[]){
 const {title,headings,data}=ledgerRows(period,rows);
 const header=['TRENERKI sp. z o.o.  |  NIP 5272961874',title,'Dokument pomocniczy - nie jest faktura VAT ani paragonem',''];
 const lines=[...header,headings.join(' | '),...data.map(row=>row.map((v,i)=>i===7?ascii(v).slice(0,24):i===6?ascii(v).slice(0,16):ascii(v)).join(' | ')),'',
  'Stripe pobiera platnosci od klientow. Przelewy Stripe nie sa nowa sprzedaza.',
  'Dokumenty VAT i faktury sa rejestrowane odrebnie w Saldeo / KSeF.'];
 const pageLines=36;const pages:string[][]=[];
 for(let i=0;i<lines.length;i+=pageLines)pages.push(lines.slice(i,i+pageLines));
 const objects:string[]=[''];
 const add=(body:string)=>{objects.push(body);return objects.length-1};
 const font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');
 const pageIds:number[]=[];
 const contentIds:number[]=[];
 for(const [i,group] of pages.entries()){
  const ops=['BT /F1 8 Tf 28 554 Td 11 TL'];
  for(const line of group)ops.push('('+pdfEscape(line).slice(0,210)+') Tj T*');
  ops.push('('+pdfEscape('Strona '+(i+1)+' z '+pages.length)+') Tj ET');
  const stream=ops.join('\n');const byteLen=utf8(stream).length;
  contentIds.push(add('<< /Length '+byteLen+' >>\nstream\n'+stream+'\nendstream'));
  pageIds.push(add('')); // completed after pages root
 }
 const rootPages=add('');const catalog=add('<< /Type /Catalog /Pages '+rootPages+' 0 R >>');
 for(let i=0;i<pageIds.length;i++)objects[pageIds[i]]='<< /Type /Page /Parent '+rootPages+' 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 '+font+' 0 R >> >> /Contents '+contentIds[i]+' 0 R >>';
 objects[rootPages]='<< /Type /Pages /Kids ['+pageIds.map(id=>id+' 0 R').join(' ')+'] /Count '+pageIds.length+' >>';
 const chunks=[utf8('%PDF-1.4\n')];const offsets=[0];let total=chunks[0].length;
 for(let i=1;i<objects.length;i++){offsets.push(total);const b=utf8(i+' 0 obj\n'+objects[i]+'\nendobj\n');chunks.push(b);total+=b.length;}
 const xrefOffset=total;
 const xref=['xref\n0 '+objects.length+'\n0000000000 65535 f \n',...offsets.slice(1).map(x=>String(x).padStart(10,'0')+' 00000 n \n'),'trailer\n<< /Size '+objects.length+' /Root '+catalog+' 0 R >>\nstartxref\n'+xrefOffset+'\n%%EOF'];
 chunks.push(utf8(xref.join('')));
 saveBlob(chunks,'Trenerki-rozliczenia-'+period+(rows.length===1?'-'+rows[0].id:'')+'.pdf','application/pdf');
}
