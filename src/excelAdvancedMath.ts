// Pure, deterministic Excel teaching calculations. No eval(), APIs, hidden user data,
// remote formula execution, rounding tricks or fabricated spreadsheet output.
export type Sale={invoice:string;date:string;month:string;region:string;category:string;client:string;quantity:number;netPrice:number;unitCost:number};
export type SourceRow={invoice:string;date:string;region:string;category:string;client:string;quantity:string;netPrice:string;issue?:string};
export type GroupBy='region'|'category'|'month'|'client';
export type Measure='revenue'|'margin'|'count';
export const round2=(value:number)=>Math.round((value+Number.EPSILON)*100)/100;
export const lineRevenue=(r:Sale)=>round2(r.quantity*r.netPrice);
export const lineMargin=(r:Sale)=>round2(r.quantity*(r.netPrice-r.unitCost));
export function plNumber(value:string):number|null{
 const s=value.trim().replace(/\u00a0|\s/g,'').replace(',','.');
 if(!/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(s))return null;
 const n=Number(s);
 return Number.isFinite(n)?n:null;
}
export function total(rows:Sale[],measure:Measure='revenue'):number{
 if(measure==='count')return rows.length;
 return round2(rows.reduce((sum,row)=>sum+(measure==='revenue'?lineRevenue(row):lineMargin(row)),0));
}
export function sumIfs(rows:Sale[],region:string,category:string):number{
 return total(rows.filter(r=>(!region||r.region===region)&&(!category||r.category===category)));
}
export function findInvoice(rows:Sale[],id:string):{kind:'found';row:Sale;amount:number}|{kind:'missing'|'duplicate';matches:number}{
 const hits=rows.filter(x=>x.invoice.toUpperCase()===id.trim().toUpperCase());
 if(hits.length!==1)return {kind:hits.length?'duplicate':'missing',matches:hits.length};
 return {kind:'found',row:hits[0],amount:lineRevenue(hits[0])};
}
export function pivot(rows:Sale[],group:GroupBy,measure:Measure='revenue'):{
 key:string;value:number;count:number
}[]{
 const groups=new Map<string,Sale[]>();
 rows.forEach(r=>{const k=r[group];groups.set(k,[...(groups.get(k)||[]),r]);});
 return [...groups].map(([key,members])=>({key,value:total(members,measure),count:members.length})).sort((a,b)=>a.key.localeCompare(b.key,'pl'));
}
export function scenario(rows:Sale[],materialCostIncrease:number){
 if(!Number.isFinite(materialCostIncrease)||materialCostIncrease < -50 || materialCostIncrease > 200)
  throw Error('Change percentage must be between -50 and +200.');
 const baselineRevenue=total(rows),baselineMargin=total(rows,'margin');
 const newMargin=round2(rows.reduce((sum,row)=>{
  const price=row.category==='Materiały'?row.unitCost*(1+materialCostIncrease/100):row.unitCost;
  return sum+row.quantity*(row.netPrice-price);
 },0));
 return {baselineRevenue,baselineMargin,newMargin,marginDelta:round2(newMargin-baselineMargin),marginPercent:baselineRevenue?round2(newMargin/baselineRevenue*100):0};
}
export type AuditIssue={invoice:string;kind:'duplicate'|'quantity'|'client'|'price';explanation:string;rowIndex:number};
export function auditImport(existing:Sale[],dirty:SourceRow[]):AuditIssue[]{
 const known=new Set(existing.map(r=>r.invoice.toUpperCase()));
 const seen=new Set<string>();
 const issues:AuditIssue[]=[];
 dirty.forEach((r,rowIndex)=>{
  const id=r.invoice.trim().toUpperCase();
  if(known.has(id)||seen.has(id))issues.push({invoice:r.invoice,kind:'duplicate',explanation:'Duplikat numeru faktury — nie dodawaj do sumy drugi raz.',rowIndex});
  seen.add(id);
  const quantity=plNumber(r.quantity);
  if(quantity===null||!Number.isInteger(quantity)||quantity<=0)
   issues.push({invoice:r.invoice,kind:'quantity',explanation:'Ilość nie jest dodatnią liczbą całkowitą.',rowIndex});
  if(!r.client.trim())issues.push({invoice:r.invoice,kind:'client',explanation:'Brakuje kontrahenta. Wstrzymaj import do wyjaśnienia.',rowIndex});
  if(plNumber(r.netPrice)===null||plNumber(r.netPrice)!<0)
   issues.push({invoice:r.invoice,kind:'price',explanation:'Brak poprawnej nieujemnej ceny netto.',rowIndex});
 });
 return issues;
}
export function safeDataset(rows:Sale[]):boolean{
 return rows.every(r=>Number.isInteger(r.quantity)&&r.quantity>0&&Number.isFinite(r.netPrice)&&r.netPrice>=0&&
  Number.isFinite(r.unitCost)&&r.unitCost>=0&&r.invoice.trim()&&r.client.trim())&&
  new Set(rows.map(r=>r.invoice.toUpperCase())).size===rows.length;
}
