/**
 * First-day Excel answer checking.
 * No eval or arbitrary expression execution. The examples below intentionally
 * accept only the formulas the beginner was actually taught.
 * Currency is a display format, never part of the calculated cell value.
 */
export type BeginnerAnswerStep = 2 | 3 | 5;
export type BeginnerAnswerKind = 'formula' | 'number' | 'invalid' | 'empty';
export type BeginnerAnswer = {
 correct:boolean;
 kind:BeginnerAnswerKind;
 message:string;
};

export type BeginnerPriceRow = {amount:string;price:number};

export function beginnerCount(value:string):number|null {
 const s=String(value??'').trim();
 if(!/^\d+$/.test(s))return null;
 const n=Number(s);
 return Number.isSafeInteger(n)&&n>0&&n<=10000?n:null;
}

export function beginnerMoney(value:string):number|null {
 const s=String(value??'').trim()
  .replace(/(?:\s|\u00a0|\u202f)*(?:zł|pln)\.?\s*$/iu,'')
  .replace(/[\s\u00a0\u202f]/g,'').replace(',','.');
 if(!s||!/^-?\d+(?:\.\d{1,2})?$/.test(s))return null;
 const n=Number(s);
 return Number.isFinite(n)?n:null;
}

export const pln=(n:number)=>n.toLocaleString('pl-PL',{minimumFractionDigits:0,maximumFractionDigits:2})+' zł';

const validFormula=(input:string,step:BeginnerAnswerStep):boolean=>{
 const expr=input.trim().toUpperCase().replace(/[\s\u00a0\u202f$]/g,'');
 if(step===2)return /^=(?:B2\*C2|C2\*B2)$/.test(expr);
 if(/^=(?:SUMA|SUM)\(D2:D4\)$/.test(expr))return true;
 if(/^=(?:SUMA|SUM)\(D2;D3;D4\)$/.test(expr))return true;
 const addition=expr.startsWith('=')?expr.slice(1).split('+'):[];
 return addition.length===3&&['D2','D3','D4'].every(x=>addition.includes(x));
};

export function checkFirstDayAnswer(
 input:string,
 step:BeginnerAnswerStep,
 rows:readonly BeginnerPriceRow[]
):BeginnerAnswer{
 const raw=String(input??'').trim();
 const counts=rows.map(r=>beginnerCount(r.amount));
 if(counts.length!==3||counts.some(n=>n===null))
  return {correct:false,kind:'invalid',message:'Najpierw popraw ilości w tabeli. Każda ilość musi być liczbą całkowitą większą od zera.'};
 const amounts=counts as number[];
 const values=rows.map((r,i)=>amounts[i]*r.price);
 const expected=step===2?values[0]:values.reduce((a,b)=>a+b,0);
 const first='B2 = '+amounts[0]+' szt., C2 = '+pln(rows[0].price)+', więc D2 = '+pln(values[0])+'.';
 const total='D2 = '+pln(values[0])+', D3 = '+pln(values[1])+', D4 = '+pln(values[2])+'. RAZEM = '+pln(expected)+'.';
 if(!raw)
  return {correct:false,kind:'empty',message:'Najpierw obejrzyj przykład nad zadaniem. Potem wpisz wynik (np. '+pln(expected)+') albo formułę '+(step===2?'=B2*C2':'=SUMA(D2:D4)')+'.'};
 if(raw.startsWith('=')){
  if(validFormula(raw,step))return {correct:true,kind:'formula',
   message:step===2?'Dobrze! =B2*C2 to prawidłowa formuła: ilość razy cena. '+first:
    'Dobrze! =SUMA(D2:D4) dodaje wszystkie trzy wartości. '+total};
  return {correct:false,kind:'formula',message:step===2?
   'Wpisujesz formułę, to dobry kierunek! W naszej tabeli B2 oznacza ilość, C2 cenę. Spróbuj =B2*C2. '+first:
   'To wygląda jak formuła. Aby dodać trzy wyniki z kolumny D, wpisz =SUMA(D2:D4). Dwukropek oznacza zakres od D2 do D4. '+total};
 }
 const parsed=beginnerMoney(raw);
 if(parsed===null)return {correct:false,kind:'invalid',
  message:'To pole przyjmuje liczbę (np. '+pln(expected)+') albo formułę rozpoczynającą się od =. Dopisek zł jest opcjonalny.'};
 if(Math.abs(parsed-expected)<0.005)return {correct:true,kind:'number',
  message:'Dobrze! To poprawny wynik. '+(step===2?first:total)+' W prawdziwym Excelu wynik może obliczać formuła.'};
 return {correct:false,kind:'number',message:'Jeszcze nie. '+(step===2?first:total)+' Możesz wpisać liczbę albo formułę '+(step===2?'=B2*C2':'=SUMA(D2:D4)')+'.'};
}
