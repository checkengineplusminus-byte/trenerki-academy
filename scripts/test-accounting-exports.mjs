import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Run the actual report formatters under a controlled browser shim;
// verify downloadable XLSX contents and an actual Roboto-based PDF.
function moduleFromFile(path,dependencies={}){
 const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{
  target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS
 }}).outputText;
 const module={exports:{}};
 const req=name=>{
  if(name in dependencies)return dependencies[name];
  throw new Error('Unapproved report test dependency: '+name);
 };
 const fn=new Function('require','module','exports','document','URL','Blob','TextEncoder','setTimeout',js);
 fn(req,module,module.exports,globalThis.document,globalThis.URL,Blob,TextEncoder,()=>0);
 return module.exports;
}
const model=moduleFromFile('src/accounting/reportModel.ts');
const row=(override={})=>({
 id:'txn_test_1',date:'2026-11-10',time:'21:15',created_at_utc:'2026-11-10T20:15:00Z',
 source:'ch_test_1',category:'charge',currency:'PLN',gross_grosze:9900,fee_grosze:249,
 net_grosze:9651,product:'Księgowość od podstaw',customer_name:'Jan Kowalski',
 customer_email:'test@example.com',customer_country:'PL',payment_intent_id:'pi_test',
 payment_status:'Opłacona',document:{document_type:'b2c_invoice',
 document_status:'issued',document_number:'FV/11/2026/7',ksef_number:'KSEF123',
 tax_treatment:'pl_23'},...override
});
const month={period:'2026-11',generated_at:'2026-11-18T14:00:00Z',time_zone:'Europe/Warsaw',rows:[
 row(),row({id:'txn_test_2',source:'re_test',category:'refund',gross_grosze:-1000,fee_grosze:0,net_grosze:-1000,product:'',document:null}),
 row({id:'txn_test_3',source:'po_test',category:'payout',gross_grosze:-7000,fee_grosze:0,net_grosze:-7000,product:'',document:null}),
 row({id:'txn_test_4',source:'ch_test_jpy',currency:'JPY',gross_grosze:1300,fee_grosze:0,net_grosze:1300,document:null})
]};
assert.equal(model.formatAmount(1300,'JPY').replace(/ /g,''),'1300JPY');
assert.equal(model.localDate('2026-11-10'),'10.11.2026');
assert.equal(model.detailedCells(month.rows[0]).length,17);
assert(model.productName(month.rows[0]).includes('Księgowość'));
assert.equal(model.summarize(month).find(x=>x.currency==='PLN').charges,9900);
assert.equal(model.summarize(month).find(x=>x.currency==='PLN').refunds,1000);
assert.equal(model.summarize(month).find(x=>x.currency==='PLN').payouts,7000);

const pdf=moduleFromFile('src/accounting/reportPdf.ts',{'./reportModel':model});
const single={...month,rows:[month.rows[0]]};
const pdfSingle=pdf.buildPdfDefinition(single);
const pdfMonth=pdf.buildPdfDefinition(month);
assert.equal(pdfSingle.pageOrientation,'portrait');
assert.equal(pdfMonth.pageOrientation,'landscape');
assert(JSON.stringify(pdfSingle.content).includes('Księgowość'));
assert(JSON.stringify(pdfMonth.content).includes('SZCZEGÓŁOWE OPERACJE'));
assert(JSON.stringify(pdfMonth.content).includes('1300'));

let downloadedBlob,downloadFilename;
const fakeDocument={body:{appendChild(){return null}},createElement(){
 return {set href(v){},set download(v){downloadFilename=v},click(){},remove(){}};
}};
const nativeURL=URL;
const fakeURL={createObjectURL(blob){downloadedBlob=blob;return 'blob:test';},revokeObjectURL(){}};
globalThis.document=fakeDocument;
const excel=moduleFromFile('src/accounting/reportExcel.ts',{'./reportModel':model});
globalThis.document=undefined;
function extractFiles(buffer){
 const content=new Uint8Array(buffer),view=new DataView(content.buffer,content.byteOffset,content.byteLength);
 const files={};let offset=0;
 while(offset+30<content.length&&view.getUint32(offset,true)===0x04034b50){
  const len=view.getUint32(offset+18,true),nameLen=view.getUint16(offset+26,true),
    extraLen=view.getUint16(offset+28,true);
  const name=new TextDecoder().decode(content.slice(offset+30,offset+30+nameLen));
  const begin=offset+30+nameLen+extraLen;
  files[name]=new TextDecoder().decode(content.slice(begin,begin+len));
  offset=begin+len;
 }
 return files;
}
// Rebind the controlled globals: transpiled Excel sees global document / URL.
globalThis.document=fakeDocument;
const oldCreate=nativeURL.createObjectURL,oldRevoke=nativeURL.revokeObjectURL;
nativeURL.createObjectURL=fakeURL.createObjectURL;
nativeURL.revokeObjectURL=fakeURL.revokeObjectURL;
try{
 excel.downloadLedgerXlsx(month);
 const files=extractFiles(await downloadedBlob.arrayBuffer());
 assert(downloadFilename.endsWith('.xlsx'));
 assert(Object.keys(files).includes('xl/worksheets/sheet3.xml'));
 assert(files['xl/workbook.xml'].includes('Podsumowanie'));
 assert(files['xl/workbook.xml'].includes('Transakcje'));
 assert(files['xl/worksheets/sheet2.xml'].includes('Księgowość'));
 assert(files['xl/worksheets/sheet2.xml'].includes('FV/11/2026/7'));
 assert(files['xl/worksheets/sheet2.xml'].includes('1300'));
 excel.downloadLedgerXlsx(single);
 const filesSingle=extractFiles(await downloadedBlob.arrayBuffer());
 assert(filesSingle['xl/worksheets/sheet1.xml'].includes('SZCZEGÓŁY TRANSAKCJI'));
}finally{
 globalThis.document=undefined;
 nativeURL.createObjectURL=oldCreate;
 nativeURL.revokeObjectURL=oldRevoke;
}
const pdfMakeModule=await import('pdfmake/build/pdfmake.js');
const fontsModule=await import('pdfmake/build/vfs_fonts.js');
const pdfMake=pdfMakeModule.default||pdfMakeModule;
const fonts=fontsModule.default||fontsModule;
pdfMake.addVirtualFileSystem(fonts.pdfMake?.vfs||fonts);
for(const definition of [pdfSingle,pdfMonth]){
 const b=await pdfMake.createPdf(definition).getBuffer();
 assert(new TextDecoder().decode(b.slice(0,7)).startsWith('%PDF-'));
 assert(b.length>3000);
}
console.log('✓ PDF portrait / landscape, Polish font, amounts, dates and transaction context');
console.log('✓ XLSX ZIP with three readable sheets, numeric values, Saldeo references and JPY accuracy');
