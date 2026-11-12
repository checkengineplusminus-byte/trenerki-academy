/** Nawigacja encyklopedii i postęp czytania. Bez nadawania dostępu i certyfikatów. */
export const ACCOUNTING_COURSE = 'ksiegowosc-od-podstaw';
export const isAccountingCourse = slug => slug === ACCOUNTING_COURSE;
export function courseDestination(slug, lesson) {
  if (!isAccountingCourse(slug)) return {pathname:'/nauka',params:{course:slug}};
  const valid = typeof lesson === 'string' && /^[1-9][0-9]{0,5}$/.test(lesson) && Number(lesson)<=100000;
  return valid ? {pathname:'/ksiegowosc',params:{lesson}} : {pathname:'/ksiegowosc'};
}
export function accountingProgress(overview) {
  if (!overview || !Number.isSafeInteger(overview.approved_count) || overview.approved_count<0 ||
      !Number.isSafeInteger(overview.read_count) || overview.read_count<0) {
    return {lessonCount:0,completedCount:0,progress:0,available:false};
  }
  const lessonCount=overview.approved_count,completedCount=Math.min(lessonCount,overview.read_count);
  return {lessonCount,completedCount,progress:lessonCount?Math.round(completedCount/lessonCount*100):0,available:true};
}
export function courseFinished(slug,lessonCount,completedCount,hasDiploma=false) {
  // W encyklopedii „przeczytane” nie jest zaliczeniem ani dowodem gotowości zawodowej.
  if (isAccountingCourse(slug)) return false;
  return (lessonCount>0 && completedCount>=lessonCount)||hasDiploma;
}
