// Current AutoCAD curriculum must be examined across all 30 authored lessons.
// Historical private questions cover only the first eight lessons, so they
// cannot be the source of final-stage competence checks.
export function selectCourseExamBank(slug,privateBank,lessonBank){
 if(slug!=='autocad-skroty')return [...privateBank,...lessonBank];
 const numbered=new Set(lessonBank.map(question=>question.lesson_no));
 if(lessonBank.length!==30||numbered.size!==30||
    !Array.from({length:30},(_,n)=>n).every(n=>numbered.has(n)))return [];
 return lessonBank;
}
export function examPhaseChoices(slug,bank,history,phase){
 if(slug!=='autocad-skroty')return bank;
 if(phase==='final'||phase==='extra')return bank.filter(q=>q.lesson_no>=20&&q.lesson_no<30);
 const visited=new Set(history.filter(row=>Number.isInteger(row.lesson_no))
  .map(row=>Math.floor(row.lesson_no/10)));
 const next=[0,1,2].find(n=>!visited.has(n));
 return next===undefined?bank:bank.filter(q=>Math.floor(q.lesson_no/10)===next);
}
