import path from 'node:path';

export const REPOSITORY='checkengineplusminus-byte/trenerki-academy';
export const AUDIENCE='trenerki-anielka-agent-v1';
export const PROJECT_REF='kcvvixcjuwglfvdpypzs';
export const safePaths=new Set([
 'src/GuidedDialogue.tsx','src/CaseLesson.tsx','src/ConstructionLesson.tsx',
 'src/KeyboardLesson.tsx','src/CarpentryPracticeLab.tsx','src/CarpentryCalculations.ts',
 'src/WindowsPracticeMission.tsx','src/WordWorkspace.tsx','src/SpreadsheetFormula.ts',
 'src/SpreadsheetWorkspace.tsx','src/CadGeometry.ts','src/CadSelection.ts',
 'src/CadTracking.ts','src/ExcelFirstDayPractice.tsx','src/SoftwareMenuLab.tsx'
]);
export function validSourcePath(p){
 return typeof p==='string'&&safePaths.has(p)&&
  !p.includes('..')&&!path.isAbsolute(p)&&path.normalize(p)===p;
}
export function validatePatch(job,proposal,source){
 if(!job||job.kind!=='bug'||!proposal||!validSourcePath(proposal.path)||
   !job.target_paths.includes(proposal.path))return false;
 const old=proposal.old_text,neu=proposal.new_text;
 if(typeof old!=='string'||typeof neu!=='string'||typeof source!=='string')return false;
 if(old.length<12||old.length>1900||neu.length<8||neu.length>2500||
    neu.length>old.length+750||neu===old)return false;
 if(source.indexOf(old)<0||source.indexOf(old)!==source.lastIndexOf(old))return false;
 if((neu.match(/\n/g)||[]).length>12||(old.match(/\n/g)||[]).length>12)return false;
 if(/\b(import|require|eval|Function|setTimeout|service_role|jwt|session|secret|password|payment|checkout|stripe|supabase|process|Deno|fetch|XMLHttpRequest|localStorage|document|window|authorization|admin|sql)\b/i.test(neu))return false;
 if(/<script|<\/script|__proto__|constructor\s*\(|dangerouslySetInnerHTML|innerHTML|https?:\/\/|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(neu))return false;
 if(/BEGIN|END|IGNORE|INSTRUCTION|OVERRIDE|system prompt/i.test(neu))return false;
 return true;
}
export function branchFor(job){
 if(!/^[0-9a-f-]{36}$/i.test(job?.id||''))throw Error('invalid_id');
 const attempt=Number(job.attempt);
 if(!Number.isInteger(attempt)||attempt<1||attempt>3)throw Error('invalid_attempt');
 return 'anielka/autofix-'+job.id.slice(0,8).toLowerCase()+'-'+attempt;
}
export function safeTitle(job){
 if(!/^[a-z0-9][a-z0-9_-]{1,79}$/.test(job.course_slug)||
   !Number.isInteger(job.lesson_no)||job.lesson_no<0||job.lesson_no>199)
  throw Error('invalid_lesson');
 return 'Anielka · '+(job.kind==='bug'?'usterka':'jakość lekcji')+
  ' · '+job.course_slug+' / lekcja '+(job.lesson_no+1);
}
