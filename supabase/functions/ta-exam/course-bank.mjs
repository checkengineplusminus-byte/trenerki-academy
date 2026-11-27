// Current AutoCAD curriculum must be examined across all 30 authored lessons.
// Historical private questions cover only the first eight lessons, so they
// cannot be the source of final-stage competence checks.
export function selectCourseExamBank(slug,privateBank,lessonBank){
 if(slug==='ai-bez-tajemnic'){
  // The eight-stage AI course has a separately authored final exam.
  // Retain the legacy lesson bank for installations still loading the new bank.
  const coverage=new Set(privateBank.map(question=>question.lesson_no));
  if(privateBank.length>=9&&Array.from({length:8},(_,stage)=>stage).every(stage=>coverage.has(stage)))return privateBank;
 }
 if(slug!=='autocad-skroty')return [...privateBank,...lessonBank];
 const numbered=new Set(lessonBank.map(question=>question.lesson_no));
 if(lessonBank.length!==30||numbered.size!==30||
    !Array.from({length:30},(_,n)=>n).every(n=>numbered.has(n)))return [];
 return lessonBank;
}
// The construction exam reveals each event after the preceding answer.
// Keep the private questions in the authored bank; stage codes are display labels.
const caseStage = /^Dzień odbioru · ([1-7])([AB]?) · /u;
function constructionChoices(bank, history, phase) {
  const tagged = bank.filter(q => caseStage.test(q.question));
  const ordinary = bank.filter(q => !caseStage.test(q.question));
  const atStage = (n, branch = '') => tagged.filter(q => {
    const [, stage, variant] = q.question.match(caseStage);
    return Number(stage) === n && (!variant || variant === branch);
  });
  // An absent or partially published case cannot interrupt existing attempts.
  if (![1, 3, 4, 5, 6, 7].every(n => atStage(n).length) ||
      !atStage(2, 'A').length || !atStage(2, 'B').length) return ordinary;
  if (history.length && !caseStage.test(history[0].question ?? '')) return ordinary;
  if (phase === 'final') return atStage(6);
  if (phase === 'extra') return atStage(7);
  const stage = history.filter(row => caseStage.test(row.question ?? '')).length + 1;
  if (stage > 5) return ordinary;
  return atStage(stage, history.at(-1)?.correct === false ? 'B' : 'A');
}
export function examPhaseChoices(slug,bank,history,phase){
 if(slug==='ksiegowosc-od-podstaw'){
  if(phase==='final'||phase==='extra')return bank.filter(q=>q.lesson_no>=90);
  const visited=new Set(history.map(row=>Math.floor(row.lesson_no/10)));
  const unvisited=bank.filter(q=>!visited.has(Math.floor(q.lesson_no/10)));
  return unvisited.length?unvisited:bank;
 }
 if(slug==='kierownik-budowy')return constructionChoices(bank,history,phase);
 if(slug!=='autocad-skroty')return bank;
 if(phase==='final'||phase==='extra')return bank.filter(q=>q.lesson_no>=20&&q.lesson_no<30);
 const visited=new Set(history.filter(row=>Number.isInteger(row.lesson_no))
  .map(row=>Math.floor(row.lesson_no/10)));
 const next=[0,1,2].find(n=>!visited.has(n));
 return next===undefined?bank:bank.filter(q=>Math.floor(q.lesson_no/10)===next);
}
