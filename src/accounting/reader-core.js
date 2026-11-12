/** Public reader helpers; lesson content and personal answers stay in Supabase. */
export const PAGE_SIZE = 20;
export function lessonNumber(raw) {
  if (typeof raw !== 'string' || !/^[1-9]\d{0,5}$/.test(raw)) return null;
  const n = Number(raw); return n <= 100000 ? n : null;
}
export function parsePolishNumber(raw) {
  if (typeof raw !== 'string' || raw.length > 100) return null;
  const s = raw.trim().replace(/[\u00a0\u202f]/g, ' ');
  // Spaces are accepted only as complete three-digit groups, never "1 2".
  if (!/^[+-]?(?:\d+|\d{1,3}(?: \d{3})+)(?:[.,]\d+)?$/.test(s)) return null;
  const n = Number(s.replace(/ /g,'').replace(',','.'));
  return Number.isFinite(n) && Math.abs(n) <= 1e12 ? n : null;
}
export function checkExercise(exercise, answer) {
  const explanation = typeof exercise?.explanation === 'string' ? exercise.explanation : '';
  if (exercise?.type === 'choice') {
    if (typeof answer !== 'string' || !/^\d{1,2}$/.test(answer)) return {valid:false,correct:false,message:'Wybierz jedną odpowiedź.'};
    const index = Number(answer);
    if (!Array.isArray(exercise.choices) || index >= exercise.choices.length || !Number.isInteger(exercise.correctIndex) || exercise.correctIndex<0 || exercise.correctIndex>=exercise.choices.length)
      return {valid:false,correct:false,message:'Nieprawidłowy wybór lub treść zadania.'};
    return {valid:true,correct:index===exercise.correctIndex,explanation};
  }
  if (exercise?.type === 'number') {
    const n = parsePolishNumber(answer), expected = exercise.expected;
    if (n === null || typeof expected !== 'number' || !Number.isFinite(expected))
      return {valid:false,correct:false,message:'Wpisz samą liczbę, np. 1230,50. Nie dopisuj jednostki.'};
    const tolerance = typeof exercise.tolerance === 'number' && Number.isFinite(exercise.tolerance) && exercise.tolerance>=0 ? exercise.tolerance : 0.005;
    return {valid:true,correct:Math.abs(n-expected)<=tolerance+Number.EPSILON*Math.max(1,Math.abs(n),Math.abs(expected)),explanation};
  }
  return {valid:false,correct:false,message:'Ten rodzaj zadania nie jest obsługiwany w czytniku.'};
}
export function sourceURL(raw) {
  try {const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}
}
export function noteDraftKey(userId, lesson) {return `ta-accounting-note-v1:${userId}:${lesson}`;}
export function resumeNoteDraft(raw, remote) {
  try {
    const d=typeof raw==='string'?JSON.parse(raw):raw;
    if (!d || typeof d.text!=='string' || d.text.length>10000 || (d.base!==null && typeof d.base!=='string')) return null;
    return {text:d.text,base:d.base,conflict:d.base!==(remote?.updated_at||null),dirty:d.text!==(remote?.note||'')};
  } catch {return null;}
}
export function exerciseSaveLabel(checked, saved, error) {
  if (error) return 'Sprawdzono lokalnie, ale odpowiedź nie została zapisana na koncie.';
  if (saved) return 'Odpowiedź zapisana na Twoim koncie. Możesz poprawić ją i spróbować ponownie.';
  return checked ? 'Wynik ćwiczenia nie jest wynikiem egzaminu.' : '';
}
