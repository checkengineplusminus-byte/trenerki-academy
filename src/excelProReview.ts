import type { } from './excelAdvancedMath';
export type ProRow={invoice:string;date:string;region:string;client:string;category:string;channel:string;salesperson:string;quantity:string;unitPrice:string;unitCost:string;discountPct:string;status:string};
export type ProDefect={index:number;invoice:string;reasons:string[]};
export const rounded=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
export function strictNumber(input:string):number|null{
 const clean=String(input).trim();
 if(!/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(clean))return null;
 const v=Number(clean);return Number.isFinite(v)?v:null;
}
export function validISODate(input:string):boolean{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(input))return false;
 const d=new Date(input+'T00:00:00.000Z');
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===input;
}
export function inspectImport(rows:ProRow[],regions:string[]):{valid:ProRow[];defects:ProDefect[]}{
 const seen=new Set<string>(),valid:ProRow[]=[],defects:ProDefect[]=[];
 for(const [index,r] of rows.entries()){
  const reasons:string[]=[],key=r.invoice.trim().toUpperCase(),quantity=strictNumber(r.quantity),price=strictNumber(r.unitPrice),cost=strictNumber(r.unitCost),discount=strictNumber(r.discountPct);
  if(!key)reasons.push('missing invoice');
  if(seen.has(key))reasons.push('duplicate invoice');
  seen.add(key);
  if(!validISODate(r.date))reasons.push('invalid date');
  if(!regions.includes(r.region))reasons.push('invalid region');
  if(!r.client.trim())reasons.push('empty client');
  if(quantity===null||!Number.isInteger(quantity)||quantity<=0)reasons.push('invalid quantity');
  if(price===null||price<0)reasons.push('invalid unit price');
  if(cost===null||cost<0)reasons.push('invalid unit cost');
  if(discount===null||discount<0||discount>1)reasons.push('invalid discount');
  if(reasons.length)defects.push({index,invoice:r.invoice,reasons});
  else valid.push(r);
 }
 return {valid,defects};
}
export function proStats(rows:ProRow[]){
 let revenue=0,margin=0,quantity=0,discounted=0;
 const regions:Record<string,number>={},months:Record<string,number>={};
 for(const r of rows){
  const qty=Number(r.quantity),discount=Number(r.discountPct),unitPrice=Number(r.unitPrice),unitCost=Number(r.unitCost);
  const v=rounded(qty*unitPrice*(1-discount)),m=rounded(v-qty*unitCost);
  revenue=rounded(revenue+v);margin=rounded(margin+m);quantity+=qty;if(discount>0)discounted++;
  regions[r.region]=rounded((regions[r.region]||0)+v);
  const month=r.date.slice(0,7);
  months[month]=rounded((months[month]||0)+v);
 }
 return {records:rows.length,revenue,margin,quantity,discounted,regions,months};
}
export function parseIdentifiers(input:string){
 return [...new Set(input.split(/[;,\n\s]+/).map(s=>s.trim().toUpperCase()).filter(Boolean))].sort();
}
export function equalIdentifiers(answer:string,expected:string[]):boolean{
 const actual=parseIdentifiers(answer),want=[...new Set(expected.map(x=>x.toUpperCase()))].sort();
 return actual.length===want.length&&actual.every((v,i)=>v===want[i]);
}
