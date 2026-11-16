import {parseExcelResponseNumber,parseExcelResponseCount} from './excelMissionAnswers';
export type ExcelHomeworkKind='number'|'count'|'percent'|'formula'|'address'|'identifier'|'file'|'text'|'error'|'access';
export type ExcelHomeworkSource={file:string;label:string};
export type ExcelHomework={
 lessonNo:number;title:string;goal:string;source:string;starter:ExcelHomeworkSource;
 steps:string[];expected:string;kind:ExcelHomeworkKind;checks:string[];mistakes:string[];
 example:string;why:string;delivery:string;minutes:number;review:string;filename:string;alternates:string[];
 bonusStarter?:ExcelHomeworkSource;bonusTask?:string;
};
export type HomeworkResult={correct:boolean;kind:'correct'|'empty'|'format'|'wrong';feedback:string};
const simplify=(value:string)=>String(value??'').trim().toLocaleUpperCase('pl-PL')
 .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Ł/g,'L')
 .replace(/[−–—]/g,'-').replace(/\s+/g,' ');
export const homeworkLabel=(kind:ExcelHomeworkKind)=>kind==='number'?'Końcowa kwota albo liczba z własnego arkusza':
 kind==='count'?'Liczba policzonych elementów':kind==='percent'?'Procent z arkusza':
 kind==='formula'?'Pełna formuła z własnego Excela':kind==='address'?'Adres komórki w arkuszu':
 kind==='identifier'?'Kod lub numer dokumentu':kind==='file'?'Format zapisywanego pliku':
 kind==='error'?'Kod błędu Excel':kind==='access'?'Poziom uprawnień':'Nazwa miesiąca lub kategorii';
export const homeworkPlaceholder=(kind:ExcelHomeworkKind)=>kind==='number'?'np. 1200,50 zł':kind==='count'?'np. 4':
 kind==='percent'?'np. 37,5%':kind==='formula'?'np. =C3*D3':
 kind==='address'?'np. D2':kind==='identifier'?'np. FV-014':kind==='file'?'np. XLSX':
 kind==='error'?'np. #DZIEL/0!':kind==='access'?'np. do odczytu':'np. 2026-03';
const countResult=(raw:string):number|null=>{
 const cleaned=raw.trim().replace(/(?:\s|\u00a0|\u202f)+(?:strona|strony|stron|kart(?:a|y)?|rekord(?:y|ów)?|błęd(?:y|ów)?|arkusz(?:y|e)?|pozycj(?:e|i))$/iu,'');
 return parseExcelResponseCount(cleaned);
};
export function checkExcelHomeworkAnswer(homework:ExcelHomework,answer:string):HomeworkResult {
 const raw=String(answer??'').trim(),kind=homework.kind;
 if(!raw)return {correct:false,kind:'empty',feedback:'Wpisz wynik po samodzielnym wykonaniu zadania w swoim Excelu. Najpierw sprawdź plik i kryteria kontroli.'};
 if(kind==='number'||kind==='percent'||kind==='count'){
  if(raw.startsWith('=')||/^(?:SUMA|SUM)\b/iu.test(raw))return {correct:false,kind:'format',
   feedback:'W tym polu wpisz wynik, a formułę pozostaw w swoim skoroszycie XLSX. Nie musisz tutaj pisać SUMA ani znaku =.'};
  const input=kind==='count'?countResult(raw):parseExcelResponseNumber(raw,kind==='percent');
  const expected=kind==='count'?countResult(homework.expected):parseExcelResponseNumber(homework.expected,kind==='percent');
  if(input===null)return {correct:false,kind:'format',feedback:
   kind==='count'?'Wpisz samą liczbę policzonych elementów, np. 4. Kwota w zł nie jest liczbą rekordów, stron ani arkuszy.':
   kind==='percent'?'Wpisz wartość procentową, np. 37,5% albo 37,5. Nie dodawaj jednostki zł.':
   'Wpisz wynik liczbowy, np. 1250,50 lub 1250,50 zł. Nie wpisuj tu formuły ani innych jednostek.'};
  if(expected!==null&&Math.abs(expected-input)<0.005)
   return {correct:true,kind:'correct',feedback:'Zgadza się. Wpisana wartość odpowiada wynikowi kontrolnemu. Sprawdź jeszcze kryteria z listy i zachowaj własny XLSX.'};
  return {correct:false,kind:'wrong',feedback:'To nie jest wynik z tego wariantu danych. Sprawdź wskazane w poleceniu zmiany, zakres komórek, typy liczb i kontrolę niezależną.'};
 }
 const typed=simplify(raw),expected=simplify(homework.expected);
 const alternates=[expected,...(homework.alternates||[]).map(simplify)];
 if(kind==='formula'){
  const normalized=typed.replace(/\s/g,'');
  if(!normalized.startsWith('='))return {correct:false,kind:'format',feedback:'To ćwiczenie wymaga pełnego zapisu formuły. Zacznij od = i wpisz adresy komórek, a nie samą kwotę.'};
  if([expected.replace(/\s/g,''),...alternates.map(x=>x.replace(/\s/g,''))].includes(normalized))
   return {correct:true,kind:'correct',feedback:'Prawidłowy zapis formuły. Upewnij się, że taką formułę widzisz też w pasku fx własnego Excela.'};
  return {correct:false,kind:'wrong',feedback:'Sprawdź litery kolumn, numery wierszy, operatory oraz znaki $ przy blokadzie adresu.'};
 }
 if(kind==='file'){
  if(typed.replace(/^\./,'')===expected.replace(/^\./,''))return {correct:true,kind:'correct',feedback:'Dobrze. Ten format zachowuje edytowalną strukturę skoroszytu.'};
  return {correct:false,kind:'wrong',feedback:'Wybierz format, który zachowuje formuły, karty i typy danych: nie wystarczy zmienić nazwy pliku lub wysłać PDF.'};
 }
 if(kind==='error'&&['#DIV/0!'].includes(typed)&&expected==='#DZIEL/0!')
  return {correct:true,kind:'correct',feedback:'Tak. To angielski zapis tego samego błędu dzielenia przez zero. Przyczyna leży w danych wejściowych.'};
 if(alternates.includes(typed))return {correct:true,kind:'correct',feedback:'Odpowiedź jest zgodna z danymi. Zachowaj plik XLSX i kryteria kontroli.'};
 return {correct:false,kind:kind==='formula'?'wrong':'format',feedback:
  kind==='identifier'?'Sprawdź wszystkie znaki kodu, szczególnie początkowe zera, myślniki i numer faktury.':
  kind==='address'?'Adres składa się z litery kolumny oraz numeru wiersza. Nie wpisuj zawartości komórki ani sumy.':
  kind==='access'?'Sprawdź tryb, który pozwala oglądać plik, ale nie zmieniać go.':
  kind==='error'?'Przepisz pełny kod błędu razem z # i znakiem !.':
  'Sprawdź pisownię miesiąca, kod lub nazwy z podanego zestawu danych.'};
}
