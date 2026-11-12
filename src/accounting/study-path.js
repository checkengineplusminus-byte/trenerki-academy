/** Metadane nawigacji, bez materiałów i kluczy odpowiedzi. Identyfikatory lekcji pozostają bez zmian. */
const range=(from,to)=>Array.from({length:to-from+1},(_,i)=>from+i);
export const STUDY_PATH_VERSION=1;
export const STUDY_STAGES=Object.freeze([
 {id:'start',title:'Liczby i zdarzenia od zera',ids:range(1,5),goal:'Odróżnij zdarzenie od zapłaty; uporządkuj saldo, procenty, netto i brutto.',requires:[]},
 {id:'identity',title:'Firma, identyfikatory i dokumenty',ids:range(6,10),goal:'Rozpoznaj strony dokumentu i przećwicz sprawdzanie danych w fikcyjnej teczce.',requires:['start']},
 {id:'ledger',title:'Pierwsze zapisy Wn i Ma',ids:range(11,15),goal:'Połącz treść operacji z kontami i wyjaśnij obie strony zapisu.',requires:['start','identity']},
 {id:'business',title:'Sprzedaż, zakup, bank i rozrachunki',ids:range(16,20),goal:'Przeprowadź jeden ograniczony scenariusz firmy bez podwójnego liczenia płatności.',requires:['ledger']},
 {id:'forms',title:'Jak czytać i wypełniać druki',ids:range(21,25),goal:'Zacznij od instrukcji formularza i ćwicz tylko wyraźnie opisany zakres pól.',requires:['business']},
 {id:'company',title:'Zmiany w spółce i historia danych',ids:range(26,30),goal:'Rozróżnij zmianę nazwy, praw właścicieli i majątku oraz zachowaj dokumentację.',requires:['forms']},
 {id:'registrations',title:'Dane uzupełniające i zgłoszenia',ids:range(31,35),goal:'Dobierz dokument do zdarzenia i odróżnij szkic od przyjętego zgłoszenia.',requires:['company']},
 {id:'corrections',title:'Korekty danych i rejestracje VAT',ids:range(36,40),goal:'Porządkuj różne role, daty i kierunki transakcji bez zgadywania obowiązków.',requires:['registrations']},
 {id:'year-model',title:'Model pełnych ksiąg i zamknięcia roku',ids:range(41,45),goal:'Uzgodnij wynik, majątek i przepływy w opisanym modelu; nazwij jego ograniczenia.',requires:['business','corrections']},
 {id:'lifecycle',title:'Przypadki z życia jednostki',ids:range(46,50),goal:'Połącz dokumenty firmy, zatrudnienie, majątek i miesiąc. To materiał, nie potwierdzenie gotowości wszystkich modułów.',requires:['year-model']},
].map(s=>Object.freeze({...s,ids:Object.freeze(s.ids),requires:Object.freeze(s.requires)})));
export const PATH_LESSON_IDS=Object.freeze(STUDY_STAGES.flatMap(s=>s.ids));
export function buildStudyPath(lessons,readNumbers,progressKnown=true){
 if(!Array.isArray(lessons)||!Array.isArray(readNumbers))throw new TypeError('Nieprawidłowe dane ścieżki.');
 const available=new Map();
 for(const row of lessons){
  if(!row||!Number.isSafeInteger(row.lesson_no)||!PATH_LESSON_IDS.includes(row.lesson_no)||row.editorial_status!=='approved'||typeof row.title_pl!=='string'||!row.title_pl.trim())continue;
  if(available.has(row.lesson_no))throw new Error('Powtórzony identyfikator lekcji. Odśwież dane.');
  available.set(row.lesson_no,{lesson_no:row.lesson_no,title_pl:row.title_pl});
 }
 const known=progressKnown===true,read=new Set(known?readNumbers.filter(n=>Number.isSafeInteger(n)&&available.has(n)):[]);
 const stages=STUDY_STAGES.map(stage=>{
  const rows=stage.ids.map(id=>({lesson_no:id,title_pl:available.get(id)?.title_pl||'',available:available.has(id),read:known&&read.has(id)}));
  const accessible=rows.filter(r=>r.available).length,readCount=rows.filter(r=>r.read).length;
  return {...stage,rows,accessible,readCount,progressKnown:known,readingComplete:known&&accessible===stage.ids.length&&readCount===stage.ids.length};
 });
 const byId=new Map(stages.map(s=>[s.id,s]));
 for(const stage of stages)stage.recommendedBefore=stage.requires.filter(id=>!byId.get(id)?.readingComplete);
 const firstUnread=known?PATH_LESSON_IDS.find(id=>!read.has(id)):undefined;
 return {stages,totalPlanned:PATH_LESSON_IDS.length,availableCount:available.size,readCount:known?read.size:null,progressKnown:known,
  nextLesson:known&&firstUnread&&available.has(firstUnread)?firstUnread:null,
  blockedAt:known&&firstUnread&&!available.has(firstUnread)?firstUnread:null,
  allAvailableRead:known&&available.size>0&&read.size===available.size,
  pathReadingComplete:known&&available.size===PATH_LESSON_IDS.length&&read.size===PATH_LESSON_IDS.length,
  courseCompleted:false};
}
