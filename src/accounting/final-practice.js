/**
 * Końcowa powtórka księgowa — osobny moduł nauki na fikcyjnych liczbach.
 * To nie jest egzamin państwowy, księgowanie produkcyjne, KSeF ani dyplom.
 * Zapisujemy wyłącznie odpowiedzi ćwiczeniowe w prywatnym workspace ucznia.
 * WYNIK zawsze przeliczamy z odpowiedzi, nigdy nie ufamy zapisanej fladze "passed".
 */
export const FINAL_PRACTICE_VERSION=1;
export const FINAL_PRACTICE_QUESTIONS=Object.freeze([
 {id:'source',kind:'choice',title:'Dokument to nie pieniądze',
  question:'Wystawiono fakturę sprzedaży, ale klient jeszcze nie zapłacił. Co wynika dla rachunku bankowego?',
  options:['Bank zwiększył się automatycznie','Nie ma wpływu bankowego bez przelewu','Trzeba wystawić drugą fakturę'],
  correct:'1',why:'Faktura i zapłata są odrębnymi zdarzeniami. Wystawienie faktury nie potwierdza przelewu.'},
 {id:'bank',kind:'number',title:'Saldo z wyciągu',
  question:'Do fikcyjnego banku wpłynęło 1 230 zł, a wypłynęło 246 zł. Jaka jest zmiana banku w złotych (bez salda otwarcia)?',
  correct:'984',why:'1 230 − 246 = 984 zł. Sprawdzenie odwrotne: 984 + 246 = 1 230 zł.'},
 {id:'posting',kind:'choice',title:'Wn / Ma przy sprzedaży',
  question:'W uproszczonym modelu faktura sprzedaży 1 000 zł netto + 230 zł VAT, jeszcze bez wpłaty. Który dekret jest poprawny?',
  options:['Wn 201: 1230, Ma 700: 1000 i Ma 222: 230','Wn 130: 1230, Ma 700: 1230','Wn 400: 1000, Ma 202: 1000'],
  correct:'0',why:'Powstaje należność 1 230 zł (Wn 201), przychód 1 000 zł (Ma 700) i VAT należny 230 zł (Ma 222). Bank jest odrębny.'},
 {id:'vat',kind:'number',title:'VAT modelowy',
  question:'W ćwiczeniu VAT ze sprzedaży to 230 zł, a przy zakupie przyjęto pełne modelowe odliczenie 46 zł. Ile wynosi różnica w złotych?',
  correct:'184',why:'230 − 46 = 184 zł różnicy w modelu. Wynik nie jest automatycznie podatkiem do zapłaty — najpierw potrzebna jest kontrola prawa do odliczenia.'},
 {id:'assets',kind:'choice',title:'Maszyna i amortyzacja',
  question:'Zapłacono 12 000 zł za maszynę, a miesięczny odpis amortyzacji wynosi w modelu 1 000 zł. Które stwierdzenie jest poprawne?',
  options:['Obie kwoty stają się kosztem jednego miesiąca','Maszyna jest aktywem, płatność zmniejsza bank, a odpis jest odrębnym kosztem','Odpis oznacza kolejne wypłacenie 1 000 zł'],
  correct:'1',why:'Płatność i koszt nie są pojęciami zamiennymi. W modelu zakup tworzy składnik majątku, a odpis amortyzacji nie wymaga nowego przelewu.'},
 {id:'reversal',kind:'choice',title:'Jawna korekta',
  question:'Zatwierdzono dekret z błędnym kontem. Jak należy to naprawić w ćwiczeniowym dzienniku?',
  options:['Po cichu nadpisać zatwierdzony wpis','Dopisać losową pozycję, aż sumy będą równe','Zachować historię, wykonać jawne storno lub prawidłową korektę'],
  correct:'2',why:'Kontrola wymaga źródła, pełnej historii i wyjaśnienia poprawki. Zbilansowanie Wn i Ma samo nie naprawia błędnych kont.'},
 {id:'result',kind:'number',title:'Wynik a płynność',
  question:'Fikcyjna sprzedaż netto to 1 000 zł, a jedyny koszt netto w tym przykładzie wynosi 200 zł. Jaki wynik księgowy w złotych daje model, niezależnie od płatności?',
  correct:'800',why:'Przychód 1 000 zł minus koszt 200 zł = 800 zł. Zmiana banku może być inna, bo zapłata nie jest tym samym co przychód i koszt.'},
 {id:'official',kind:'choice',title:'KSeF, JPK i UPO',
  question:'Pracownia pokazała zielone podsumowanie fikcyjnego miesiąca. Czy oznacza to, że formularz JPK został wysłany lub urząd wydał UPO?',
  options:['Tak, zielona kontrola jest UPO','Nie, to tylko wewnętrzny raport szkoleniowy','Tak, bo są zapisane faktury'],
  correct:'1',why:'KSeF, JPK i UPO mają odrębne procedury urzędowe. Nasze ćwiczenie niczego nie wysyła i nie wystawia UPO.'}
].map(q=>Object.freeze({...q,options:q.options&&Object.freeze(q.options)})));
const ids=new Set(FINAL_PRACTICE_QUESTIONS.map(q=>q.id));
function answerValue(q,value){
 if(typeof value!=='string'||value.length>30)return '';
 if(q.kind==='choice')return /^[0-9]$/.test(value)&&Number(value)<q.options.length?value:'';
 const raw=value.trim().replace(/\s/g,'').replace(',','.');
 return /^-?\d+(?:\.\d{1,2})?$/.test(raw)&&Number.isFinite(Number(raw))?raw:'';
}
export function readFinalPractice(state){
 const saved=state?.accounting_final_practice_v1;
 if(!saved||saved.version!==FINAL_PRACTICE_VERSION||!saved.answers||typeof saved.answers!=='object'||Array.isArray(saved.answers))return {};
 return Object.fromEntries(FINAL_PRACTICE_QUESTIONS.map(q=>[q.id,answerValue(q,saved.answers[q.id])]));
}
export function withFinalPracticeAnswers(state,submitted){
 if(!state||typeof state!=='object'||!Array.isArray(state.journals)||!Array.isArray(state.invoices))
  throw new Error('Otwórz istniejące fikcyjne biuro.');
 if(!submitted||typeof submitted!=='object'||Array.isArray(submitted))
  throw new Error('Wypełnij pytania z końcowego ćwiczenia.');
 const answers={};
 for(const q of FINAL_PRACTICE_QUESTIONS){
  const v=answerValue(q,submitted[q.id]);
  if(!v)throw new Error('Brakuje poprawnie wpisanej odpowiedzi na pytanie: '+q.title);
  answers[q.id]=v;
 }
 return {...state,accounting_final_practice_v1:{version:FINAL_PRACTICE_VERSION,answers}};
}
export function gradeFinalPractice(state){
 const saved=readFinalPractice(state);
 const cases=FINAL_PRACTICE_QUESTIONS.map(q=>{
  const answer=saved[q.id]||'',attempted=answer.length>0;
  const correct=attempted&&(q.kind==='choice'?answer===q.correct:Math.abs(Number(answer)-Number(q.correct))<0.005);
  return {id:q.id,title:q.title,attempted,correct,why:q.why};
 });
 const attempted=cases.filter(c=>c.attempted).length,correct=cases.filter(c=>c.correct).length;
 return {attempted,correct,total:cases.length,passed:attempted===cases.length&&correct===cases.length,cases};
}
