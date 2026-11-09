/*
 * TRENERKI Academy: tiny, safe spreadsheet formula evaluator for a 5x6 training grid.
 * No eval(), no arbitrary JS execution. Supports references, + - * /,
 * parentheses, absolute references and SUM/SUMA ranges.
 */
export function parseSpreadsheetNumber(value:unknown):number{
 const s=String(value??'').trim().replace(/\s|\u00a0/g,'').replace(',','.');
 if(!s)return 0;
 if(!/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return NaN;
 return Number(s);
}
function refPosition(ref:string):{row:number;column:number}|null{
 const match=/^([A-E])([1-6])$/.exec(ref.toUpperCase().replace(/\$/g,''));
 return match?{row:Number(match[2])-1,column:match[1].charCodeAt(0)-65}:null;
}
class CellError extends Error{
 constructor(public code:string){super(code);}
}
export function evaluateCell(rows:string[][],reference:string):string{
 const format=(n:number)=>Number(n.toFixed(6)).toString().replace('.',',');
 function numberAt(ref:string,visited:Set<string>):number{
  const key=ref.toUpperCase().replace(/\$/g,'');
  const position=refPosition(key);
  if(!position)throw new CellError('#ADR!');
  if(visited.has(key))throw new CellError('#CYKL!');
  const value=String(rows[position.row]?.[position.column]??'').trim();
  if(!value)return 0;
  if(!value.startsWith('=')){
   const n=parseSpreadsheetNumber(value);
   if(!Number.isFinite(n))throw new CellError('#WARTOŚĆ!');
   return n;
  }
  const seen=new Set(visited);seen.add(key);
  return calculate(value.slice(1),seen);
 }
 function calculate(raw:string,visited:Set<string>):number{
  const expr=raw.trim().toUpperCase().replace(/\$/g,'').replace(/(?<=\d),(?=\d)/g,'.');
  if(expr.length>110)throw new CellError('#BŁĄD!');
  const sum=/^(?:SUM|SUMA)\(([A-E][1-6]):([A-E][1-6])\)$/.exec(expr);
  if(sum){
   const a=refPosition(sum[1])!,b=refPosition(sum[2])!;
   if(a.row>b.row||a.column>b.column)throw new CellError('#ADR!');
   let total=0;
   for(let row=a.row;row<=b.row;row++)for(let column=a.column;column<=b.column;column++)
    total+=numberAt(String.fromCharCode(65+column)+(row+1),visited);
   return total;
  }
  const tokens=expr.match(/[A-E][1-6]|\d+(?:\.\d+)?|\.\d+|[()+\-*/]/g)||[];
  if(tokens.join('')!==expr||tokens.length>100)throw new CellError('#BŁĄD!');
  let at=0,depth=0;
  const factor=():number=>{
   if(depth++>15)throw new CellError('#BŁĄD!');
   const token=tokens[at++];
   let result:number;
   if(token==='+'||token==='-')result=(token==='-'?-1:1)*factor();
   else if(token==='('){
    result=expression();
    if(tokens[at++]!==')')throw new CellError('#BŁĄD!');
   }else if(token&&/^[A-E][1-6]$/.test(token))result=numberAt(token,visited);
   else if(token&&/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(token))result=Number(token);
   else throw new CellError('#BŁĄD!');
   depth--;
   return result;
  };
  const term=():number=>{
   let current=factor();
   while(tokens[at]==='*'||tokens[at]==='/'){
    const op=tokens[at++],rhs=factor();
    if(op==='/'&&rhs===0)throw new CellError('#DZIEL/0!');
    current=op==='*'?current*rhs:current/rhs;
   }
   return current;
  };
  const expression=():number=>{
   let current=term();
   while(tokens[at]==='+'||tokens[at]==='-'){
    const op=tokens[at++],rhs=term();
    current=op==='+'?current+rhs:current-rhs;
   }
   return current;
  };
  const n=expression();
  if(at!==tokens.length||!Number.isFinite(n))throw new CellError('#BŁĄD!');
  return n;
 }
 try{
  const pos=refPosition(reference);
  if(!pos)return '#ADR!';
  const value=String(rows[pos.row]?.[pos.column]??'');
  if(!value.trim().startsWith('='))return value;
  return format(numberAt(reference,new Set()));
 }catch(e){return e instanceof CellError?e.code:'#BŁĄD!';}
}
