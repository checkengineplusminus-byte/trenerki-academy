/**
 * One consistent, beginner-friendly answer policy for the 30 Excel missions.
 * This is a self-check of the entered response, not proof of actual Excel work.
 * Never run arbitrary learner formulas. Accept only explicitly reviewed equivalents.
 */
export type ExcelMissionSource={
 lesson_no:number;unit:string;expected:string;goal?:string;steps?:string[];
};
export type ExcelResponseKind='number'|'count'|'percent'|'formula'|'address'|'identifier'|'file'|'name'|'error'|'access';
export type ExcelAnswerResult={correct:boolean;kind:'number'|'formula'|'text'|'empty'|'invalid';message:string};
export type ExcelAnswerPresentation={
 kind:ExcelResponseKind;title:string;instruction:string;placeholder:string;
 example?:string;allowFormula?:boolean;keyboard:'decimal-pad'|'default';
};
const normalize=(v:string)=>String(v??'').trim().toLocaleUpperCase('pl-PL')
 .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/Ł/g,'L')
 .replace(/[\u00a0\u202f]/g,' ').replace(/\s+/g,' ').replace(/[−–—]/g,'-');
const formula=(v:string)=>normalize(v).replace(/\s/g,'');
const fmt=(v:string)=>String(v??'').trim().replace(/[−–—]/g,'-');
const moneySuffix=/(?:\s|\u00a0|\u202f)*(?:zł|PLN)\.?\s*$/iu;
export function parseExcelResponseNumber(raw:string,percentage=false):number|null{
 let text=fmt(raw);
 if(percentage&&moneySuffix.test(text))return null; // zł is a unit of money, not a percent.
 if(percentage&&/%\s*$/.test(text))text=text.replace(/%\s*$/,'');
 else if(/%\s*$/.test(text))return null;
 text=text.replace(moneySuffix,'').replace(/[\s\u00a0\u202f]/g,'');
 if(!text)return null;
 // Accept Polish 1.234,50 and US 1,234.50, but reject mixed ambiguous punctuation.
 if(/^-?\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(text))text=text.replace(/\./g,'').replace(',','.');
 else if(/^-?\d{1,3}(?:,\d{3})+\.\d{1,2}$/.test(text))text=text.replace(/,/g,'');
 else if(/^-?(?:\d+(?:[.,]\d{1,2})?|[.,]\d{1,2})$/.test(text))text=text.replace(',','.');
 else return null;
 const n=Number(text);
 return Number.isFinite(n)?n:null;
}
const numericFormula:Record<number,string[]>={
 4:['=3*135'],
 5:['=C2*D2','=D2*C2','=2*350','=350*2'],
 6:['=SUMA(E2:E4)','=SUM(E2:E4)','=E2+E3+E4','=700+360+150'],
 9:['=SUMA(E2:E4)','=SUM(E2:E4)','=3*350+360+150','=1050+360+150'],
 13:['=SUMA(E2:E5)','=SUM(E2:E5)','=1210+90','=700+360+150+90'],
 18:['=700+360','=360+700'],
 19:['=2*(390-350)','=(390-350)*2'],
 23:['=STYCZEŃ!B2+LUTY!B2','=LUTY!B2+STYCZEŃ!B2','=1200+1300'],
 24:['=21*55','=55*21'],
 26:['=-5691*15%','=-(5691*15%)']
};
const otherFormula:Record<number,string[]>={
 11:['=C3*D3','=D3*C3'],
 14:['=C2*$H$2','=$H$2*C2']
};
const formulaIndex=new Set([11,14]);
const percentIndex=new Set([7,12]);
const countIndex=new Set([1,28]);
const addressIndex=new Set([0,2,10]);
const fileIndex=new Set([8,16]);
const textLabels:Record<number,ExcelResponseKind>={
 3:'identifier',17:'name',21:'identifier',22:'error',27:'access'
};
export function parseExcelResponseCount(raw:string):number|null{
 const text=String(raw??'').trim().replace(/[\s\u00a0\u202f]+/g,' ').replace(/\s+(?:arkusze|arkuszy|rekordy|rekordów|błędy|błędów|problemy|problemów|sztuki|szt\.)$/iu,'');
 if(!/^\d+$/.test(text))return null;
 const n=Number(text);
 return Number.isSafeInteger(n)&&n>=0?n:null;
}
export function excelResponsePresentation(mission:ExcelMissionSource):ExcelAnswerPresentation{
 const i=mission.lesson_no;
 if(countIndex.has(i))return {kind:'count',title:'Wpisz liczbę policzonych '+(i===1?'arkuszy':'błędów'),
  instruction:i===1?'Policz karty arkuszy w skoroszycie. Wpisz samą liczbę, np. 3 — bez zł, bez formuły.':
   'Policz błędne rekordy importu. Wpisz liczbę, np. 4 — bez zł, bez formuły.',
  placeholder:i===1?'Liczba arkuszy':'Liczba błędnych rekordów',keyboard:'decimal-pad'};
 if(formulaIndex.has(i))return {kind:'formula',title:'Wpisz PEŁNĄ FORMUŁĘ (nie jej wynik)',
  instruction:'To zadanie sprawdza sposób zapisu formuły po skopiowaniu. Zacznij od znaku =, użyj adresów komórek i sprawdź, gdzie potrzebny jest znak $. Nie podawaj samej liczby.',
  placeholder:'Cała formuła zaczynająca się od =',example:i===11?'=A2*B2':'=$B$1*C2',keyboard:'default'};
 if(percentIndex.has(i))return {kind:'percent',title:'Wpisz procent widoczny na ekranie',
  instruction:'Podaj wartość wyświetlaną po ustawieniu formatu procentowego — możesz wpisać np. 15 lub 15%. Nie wpisuj ułamka 0,15, jeśli pytanie dotyczy wyświetlonego procentu.',
  placeholder:'np. 15 lub 15%',keyboard:'decimal-pad'};
 if(addressIndex.has(i))return {kind:'address',title:'Wpisz ADRES KOMÓRKI',
  instruction:'Podaj tylko literę kolumny i numer wiersza, np. F3. Nie wpisuj zawartości komórki ani sumy.',
  placeholder:'np. F3',keyboard:'default'};
 if(fileIndex.has(i))return {kind:'file',title:'Wpisz ROZSZERZENIE PLIKU',
  instruction:'Tu odpowiadasz nazwą formatu, a nie obliczeniem. Wpisz rozszerzenie pliku służącego do dalszej edycji formuł (z kropką lub bez).',
  placeholder:'np. csv, xlsx, pdf',keyboard:'default'};
 if(textLabels[i]==='identifier')return {kind:'identifier',title:'Wpisz KOD lub NUMER',
  instruction:i===3?'Przepisz pełny identyfikator produktu. Zera na początku są częścią kodu — niczego nie obliczaj.':
   'Przepisz dokładny identyfikator faktury z ćwiczenia, nie jej wartość pieniężną.',
  placeholder:i===3?'Kod z zerami na początku':'np. FV-001',keyboard:'default'};
 if(textLabels[i]==='error')return {kind:'error',title:'Wpisz KOD BŁĘDU EXCEL',
  instruction:'Przepisz dokładnie wyświetlony kod błędu razem z symbolem #, bez wpisywania żadnej obliczonej liczby.',
  placeholder:'np. #N/D',keyboard:'default'};
 if(textLabels[i]==='access')return {kind:'access',title:'Wpisz POZIOM DOSTĘPU',
  instruction:'Podaj nazwę uprawnienia, które pozwala oglądać plik bez edytowania go.',
  placeholder:'np. do edycji / do odczytu',keyboard:'default'};
 if(textLabels[i]==='name')return {kind:'name',title:'Wpisz NAZWĘ, nie kwotę',
  instruction:'Przeczytaj podsumowanie i podaj nazwę regionu o największej sprzedaży. Nie wpisuj wartości słupka ani nazwy wykresu.',
  placeholder:'Nazwa regionu',keyboard:'default'};
 const hasFormula=!!numericFormula[i]?.length;
 return {kind:'number',title:'Wpisz KOŃCOWY WYNIK jako liczbę',
  instruction:hasFormula?
   'Formułę z polecenia wykonujesz w arkuszu Excel. W tym polu możesz wpisać wynik liczbowy z obliczenia, np. 150 lub 150 zł. Jeżeli wpisałeś już poprawną formułę z zadania, zaakceptujemy również jej zapis.':
   'To pole sprawdza końcową liczbę, a nie cały wzór. Obliczenie wykonaj w arkuszu, tutaj wpisz wynik (np. 150 lub 150 zł).',
  placeholder:hasFormula?'np. 150 lub formuła z zadania':'Wynik, np. 150 lub 150 zł',
  allowFormula:hasFormula,keyboard:hasFormula||i===26?'default':'decimal-pad'};
}
const aliases:Record<number,string[]>={
 8:['.XLSX'],16:['.XLSX'],27:['TYLKO DO ODCZYTU','TYLKO ODCZYT','DO ODCZYTU','READ ONLY','ODCZYT']
};
export function checkExcelMissionAnswer(mission:ExcelMissionSource,response:string):ExcelAnswerResult{
 const i=mission.lesson_no,raw=String(response??'').trim(),expected=String(mission.expected);
 const p=excelResponsePresentation(mission);
 if(!raw)return {correct:false,kind:'empty',message:'To pole jest puste. '+p.instruction};
 const fm=formula(raw);
 const approvedOther=otherFormula[i]?.some(x=>formula(x)===fm)||false;
 if(p.kind==='formula'){
  if(approvedOther||fm===formula(expected))return {correct:true,kind:'formula',message:'Dobrze. Zapis formuły i sposób użycia adresów są poprawne.'};
  return {correct:false,kind:raw.startsWith('=')?'formula':'text',
   message:'W tym zadaniu sprawdzamy pełny zapis formuły, a nie liczbę. Zacznij od =; sprawdź adresy, sposób kopiowania i znaki $. '+(i===14?'Stawka w H2 musi pozostać zablokowana jako $H$2.':'Po skopiowaniu formuły adresy powinny wskazywać wiersz 3.')};
 }
 if(p.kind==='count'){
  const count=parseExcelResponseCount(raw);
  const correct=parseExcelResponseCount(expected);
  if(count!==null&&correct!==null&&count===correct)return {correct:true,kind:'number',message:'Zgadza się! To właściwa liczba obiektów.'};
  return {correct:false,kind:count===null?'invalid':'number',message:count===null?
   'Podaj liczbę policzonych obiektów, np. 3 lub 4. Nie wpisuj zł, procentu, formuły ani samej nazwy.':
   'Policz jeszcze raz wszystkie odpowiednie wiersze lub karty. To pole wymaga liczby, nie sumy kosztów.'};
 }
 if(p.kind==='number'||p.kind==='percent'){
  if(raw.startsWith('=')){
   if(numericFormula[i]?.some(x=>formula(x)===fm))return {correct:true,kind:'formula',
    message:'Dobrze! Poprawna formuła z tego zadania daje oczekiwaną liczbę. W arkuszu jej wynik zostaje przeliczony automatycznie.'};
   return {correct:false,kind:'formula',
    message:'Rozumiem, że próbujesz wpisać formułę. W tej odpowiedzi sprawdzamy jej wynik liczbowy. Wpisz formułę w arkuszu i przepisz obliczoną liczbę poniżej. '+(p.allowFormula?'Jeśli chcesz podać samą formułę, użyj dokładnie wzoru z zadania.':'Nie musisz wpisywać tutaj SUMA ani adresów komórek.')};
  }
  if(/^(?:SUMA|SUM)(?:\(|$)/i.test(raw))
   return {correct:false,kind:'formula',message:'Samo SUMA nie jest wynikiem. W prawdziwym Excelu formułę rozpoczyna się od =, np. =SUMA(E2:E4). W polu odpowiedzi wpisz liczbę obliczoną przez arkusz. '+(p.allowFormula?'Pełna poprawna formuła z tego zadania także zostanie zaliczona.':'')};
  const value=parseExcelResponseNumber(raw,p.kind==='percent');
  const correct=parseExcelResponseNumber(expected,false);
  if(value!==null&&correct!==null&&Math.abs(value-correct)<0.005)
   return {correct:true,kind:'number',message:'Zgadza się! Wynik liczbowy odpowiada danym w zadaniu.'};
  if(value===null)return {correct:false,kind:'invalid',
   message:p.kind==='percent'?'Podaj wyświetlany procent jako liczbę, np. 15 albo 15%.':
    'Wpisz sam wynik jako liczbę, np. 150 lub 150 zł. Sprawdź przecinek dziesiętny, znak minus i to, czy nie wkleiłeś formuły.'};
  return {correct:false,kind:'number',message:'To nie jest wynik z danych ćwiczenia. Sprawdź wartości wejściowe, kolejność działań i porównaj z podpowiedzią. '+(value<0&&correct!==null&&correct>=0?'Czy minus był potrzebny?':'')};
 }
 const user=normalize(raw),target=normalize(expected),matches=[target,...(aliases[i]||[])];
 if(matches.some(x=>normalize(x)===user))return {correct:true,kind:'text',message:'Poprawnie — odpowiedź odpowiada pytaniu.'};
 return {correct:false,kind:'text',message:
  p.kind==='address'?'To nie jest prawidłowy adres z tego zadania. Sprawdź literę kolumny oraz numer wiersza.':
  p.kind==='identifier'?'Sprawdź wszystkie znaki identyfikatora, łącznie z zerami i myślnikami. Nie zamieniaj go na liczbę.':
  p.kind==='file'?'Sprawdź typ pliku: format do edycji formuł to nie to samo co wydruk PDF lub tekstowy CSV.':
  p.kind==='error'?'Sprawdź pełny kod błędu, łącznie ze znakiem # i wykrzyknikiem, jeśli się pojawia.':
  p.kind==='access'?'Pomyśl o uprawnieniu, które pozwala tylko przeglądać dane, bez prawa ich zmiany.':
  'Porównaj odpowiedź z danymi ćwiczenia. Wpisz nazwę, nie liczbę.'};
}
