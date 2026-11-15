// Server-authoritative exam readiness: current lesson IDs only, never stale rows.
export function examReadiness(lessons,passedRows){
 if(!Array.isArray(lessons)||!Array.isArray(passedRows))throw new TypeError('Missing course lesson data');
 const live=new Set(lessons.map(row=>row.lesson_no).filter(Number.isInteger));
 const completed=new Set(passedRows.map(row=>row.lesson_no).filter(n=>live.has(n)));
 return {completed:completed.size,total:live.size,ready:live.size>0&&completed.size===live.size};
}
