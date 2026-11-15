export type ExcelVisualGroup='region'|'month'|'category';
export type ExcelVisualMetric='revenue'|'quantity'|'count';
export type ExcelVisualRow={id:string;product:string;category:string;region:string;month:string;qty:string;price:string};
export type ExcelVisualSummary={key:string;value:number;count:number};
export const sampleVisualRows:ExcelVisualRow[]=[
 {id:'01',product:'Farba',category:'Materiały',region:'Północ',month:'Styczeń',qty:'2',price:'40'},
 {id:'02',product:'Pędzle',category:'Materiały',region:'Północ',month:'Luty',qty:'3',price:'20'},
 {id:'03',product:'Szkło',category:'Materiały',region:'Południe',month:'Luty',qty:'4',price:'75'},
 {id:'04',product:'Transport',category:'Usługi',region:'Centrum',month:'Marzec',qty:'1',price:'120'},
 {id:'05',product:'Kleje',category:'Materiały',region:'Południe',month:'Marzec',qty:'6',price:'25'},
 {id:'06',product:'Montaż',category:'Usługi',region:'Centrum',month:'Styczeń',qty:'2',price:'60'}
];
export function excelVisualNumber(text:string):number {
 const raw=text.trim();
 if(!/^\d+(?:[,.]\d{1,2})?$/.test(raw))return NaN;
 return Number(raw.replace(',','.'));
}
export function excelVisualValid(rows:ExcelVisualRow[]):boolean{
 return rows.every(x=>Number.isFinite(excelVisualNumber(x.qty))&&Number.isFinite(excelVisualNumber(x.price))&&
  excelVisualNumber(x.qty)>=0&&excelVisualNumber(x.price)>=0);
}
export function excelVisualTotal(rows:ExcelVisualRow[]):number{
 if(!excelVisualValid(rows))return NaN;
 return rows.reduce((sum,x)=>sum+excelVisualNumber(x.qty)*excelVisualNumber(x.price),0);
}
export function excelVisualAggregate(rows:ExcelVisualRow[],group:ExcelVisualGroup,metric:ExcelVisualMetric):ExcelVisualSummary[]{
 if(!excelVisualValid(rows))return [];
 const map=new Map<string,ExcelVisualSummary>();
 for(const row of rows){
  const qty=excelVisualNumber(row.qty),price=excelVisualNumber(row.price);
  const key=row[group],entry=map.get(key)||{key,value:0,count:0};
  entry.value+=metric==='revenue'?qty*price:metric==='quantity'?qty:1;
  entry.count++;
  map.set(key,entry);
 }
 const order=group==='month'?['Styczeń','Luty','Marzec']:group==='region'?['Północ','Centrum','Południe']:['Materiały','Usługi'];
 return [...map.values()].sort((a,b)=>order.indexOf(a.key)-order.indexOf(b.key));
}
