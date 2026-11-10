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
export function refPosition(ref:string):{row:number;column:number}|null{
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
  const expr=raw.toUpperCase().replace(/[\s$]/g,'').replace(/(?<=\d),(?=\d)/g,'.');
  if(expr==='#ADR!')throw new CellError('#ADR!');
  if(expr.length>110)throw new CellError('#BŁĄD!');
  const sum=/^(?:SUM|SUMA)\(([A-E][1-6]):([A-E][1-6])\)$/.exec(expr);
  if(sum){
   const a=refPosition(sum[1])!,b=refPosition(sum[2])!;
   if(a.row>b.row||a.column>b.column)throw new CellError('#ADR!');
   let total=0;
   for(let row=a.row;row<=b.row;row++)for(let column=a.column;column<=b.column;column++){
    const raw=rows[row]?.[column]?.trim()??'';
    if(raw.startsWith('=')||Number.isFinite(parseSpreadsheetNumber(raw)))total+=numberAt(cellAddress(row,column),visited);
   }
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

export function cellAddress(row:number,column:number){
 return String.fromCharCode(65+column)+(row+1);
}

export function shiftFormula(value:string,rowOffset:number,columnOffset:number):string{
 if(!value.trimStart().startsWith('='))return value;
 let outOfBounds=false;
 const result=value.replace(/(\$?)([A-E])(\$?)([1-6])\b/gi,(_,lockCol:string,col:string,lockRow:string,row:string)=>{
  const r=Number(row)-1+(lockRow?0:rowOffset);
  const c=col.toUpperCase().charCodeAt(0)-65+(lockCol?0:columnOffset);
  if(r<0||r>=6||c<0||c>=5)outOfBounds=true;
  return lockCol+String.fromCharCode(65+c)+lockRow+(r+1);
 });
 return outOfBounds?'=#ADR!':result;
}

export function cycleCellReference(value:string,cursor:number){
 if(!value.trimStart().startsWith('='))return value;
 const refs=[...value.matchAll(/(\$?)([A-E])(\$?)([1-6])\b/gi)];
 const ref=refs.find(x=>cursor>=x.index!&&cursor<=x.index!+x[0].length)??refs[0];
 if(!ref)return value;
 const [match,lockColumn,col,lockRow,row]=ref;
 const next=lockColumn?lockRow?col+'$'+row:col+row:lockRow?'$'+col+row:'$'+col+'$'+row;
 return value.slice(0,ref.index)+next+value.slice(ref.index!+match.length);
}
