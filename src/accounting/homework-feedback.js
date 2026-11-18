/** Formative checks only. Never an exam grade or permission to unlock the next lesson. */
export function arithmeticMistakes(value){
 const text=typeof value==='string'?value:'';
 const errors=[],rx=/(^|[^\d])(-?\d+(?:[.,]\d+)?)\s*([+\-*×÷/:])\s*(-?\d+(?:[.,]\d+)?)\s*=\s*(-?\d+(?:[.,]\d+)?)(?![\d])/g;
 let m;
 while((m=rx.exec(text))!==null&&errors.length<3){
  // Avoid false alarms when a number uses Polish thousand grouping, e.g. 1 000 or 1.000.
  if((m[1]&&/\s/u.test(m[1])&&m.index>0&&/\d/.test(text[m.index-1]))||[m[2],m[4],m[5]].some(x=>/^\d{1,3}\.\d{3}$/u.test(x)))continue;
  const op=m[3],a=Number(m[2].replace(',','.')),b=Number(m[4].replace(',','.')),given=Number(m[5].replace(',','.'));
  if(!Number.isFinite(a)||!Number.isFinite(b)||!Number.isFinite(given))continue;
  if((op==='/'||op==='÷'||op===':')&&b===0)continue;
  const actual=op==='+'?a+b:op==='-'?a-b:op==='*'||op==='×'?a*b:a/b;
  // Give division answers a reasonable rounding margin; never flag a valid rounded value.
  const decimals=(m[5].split(/[.,]/)[1]||'').length;
  const tolerance=(op==='/'||op==='÷'||op===':')?Math.max(.00001,.51*Math.pow(10,-decimals)):Math.max(.000001,Math.abs(actual)*1e-9);
  if(Math.abs(actual-given)>tolerance){
   const pretty=Number(actual.toFixed(6)).toLocaleString('pl-PL',{maximumFractionDigits:6});
   errors.push({expression:m[2]+op+m[4]+'='+m[5],suggested:pretty,
    message:'Sprawdź działanie '+m[2]+' '+op+' '+m[4]+': wynik to '+pretty+', nie '+m[5]+'. Popraw obliczenie i opisz, skąd wzięły się liczby.'});
  }
 }
 return errors;
}
export function draftGuidance(value,minLength=120){
 const text=typeof value==='string'?value.trim():'';
 const mistakes=arithmeticMistakes(text);
 if(mistakes.length)return {kind:'math_error',blocksSubmit:true,message:mistakes[0].message,remaining:Math.max(0,minLength-text.length)};
 if(!text)return {kind:'empty',blocksSubmit:true,message:'Wpisz swoją próbę: co sprawdziłeś, jakie kroki wykonałeś i jaki masz wniosek. Anielka może podpowiedzieć pierwszy krok.',remaining:minLength};
 if(text.length<minLength)return {kind:'short',blocksSubmit:true,message:'To jeszcze szkic. Dodaj opis wykonanych kroków, obliczenia i wniosek. Do oddania brakuje '+(minLength-text.length)+' znaków — zapis szkicu nadal jest możliwy.',remaining:minLength-text.length};
 return {kind:'needs_review',blocksSubmit:false,message:'Masz wystarczająco długi szkic. Anielka może wskazać niejasności lub błędy przed oddaniem — samo 120 znaków nie oznacza poprawnej pracy.',remaining:0};
}
