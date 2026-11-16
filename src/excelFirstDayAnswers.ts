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
  if(step!==2){
   const normalized=raw.toUpperCase().replace(/[\s\u00a0\u202f]/g,'');
   if(/^=\d+[,(]?/.test(normalized)&&normalized.includes('D2:D4'))
    return {correct:false,kind:'formula',message:'Nie wpisuj liczby przed nawiasem. W polskim Excelu cała formuła dodawania wygląda tak: =SUMA(D2:D4). Słowo SUMA jest konieczne. Jeśli chcesz podać tylko wynik, wpisz '+pln(expected)+' bez znaku =.'};
   if(normalized.includes('D2:D4')&&!normalized.includes('SUMA')&&!normalized.includes('SUM('))
    return {correct:false,kind:'formula',message:'D2:D4 jest adresem trzech komórek, ale sam zakres ich nie dodaje. W trybie „Sam wynik” wpisz '+pln(expected)+'. W trybie „Formuła Excela” wpisz dokładnie =SUMA(D2:D4) — TAK, ze słowem SUMA przed nawiasem.'};
  }
  return {correct:false,kind:'formula',message:step===2?
   'B2 oznacza ilość, C2 cenę. Aby je pomnożyć, wpisz dokładnie =B2*C2 (gwiazdka to mnożenie). '+first:
   'Aby dodać trzy wartości, potrzebna jest pełna formuła =SUMA(D2:D4). Sam znak = albo zapis D2:D4 nie wystarczy. '+total};
 }
 const parsed=beginnerMoney(raw);
 if(parsed===null){
  const upper=raw.toUpperCase().replace(/[\s\u00a0\u202f]/g,'');
  if(upper.includes('D2:D4')||upper.startsWith('SUMA'))
   return {correct:false,kind:'invalid',message:'Jeśli wybierasz sam wynik, wpisz tylko '+pln(expected)+'. Jeśli chcesz napisać formułę, MUSISZ zacząć od znaku = i wpisać całe =SUMA(D2:D4). Sam napis SUMA lub D2:D4 nie wystarcza.'};
  return {correct:false,kind:'invalid',message:'Wpisz samą liczbę, np. '+pln(expected)+'. Możesz też wybrać tryb „Formuła Excela” i wpisać '+(step===2?'=B2*C2':'=SUMA(D2:D4)')+'.'};
 }
 if(Math.abs(parsed-expected)<0.005)return {correct:true,kind:'number',
  message:'Dobrze! To poprawny wynik. '+(step===2?first:total)+' W prawdziwym Excelu wynik może obliczać formuła.'};
 return {correct:false,kind:'number',message:'Jeszcze nie. '+(step===2?first:total)+' Możesz wpisać liczbę albo formułę '+(step===2?'=B2*C2':'=SUMA(D2:D4)')+'.'};
}
