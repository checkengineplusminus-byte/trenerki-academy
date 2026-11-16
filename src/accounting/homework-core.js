/** Student homework helpers. Submitting is evidence of work, NEVER a passing grade. */
export function homeworkCanSubmit(response){
 return typeof response==='string' && response.trim().length>=120 && response.length<=10000;
}
export function homeworkSubmitted(row){
 return !!row && Number.isSafeInteger(row.version) && row.version>=1 &&
  typeof row.submitted_at==='string' && !Number.isNaN(Date.parse(row.submitted_at)) &&
  homeworkCanSubmit(row.response);
}
export function homeworkVersion(row){
 return row&&Number.isSafeInteger(row.version)&&row.version>=1?row.version:null;
}
export function homeworkProgress(rows,expectedTopics){
 const allowed=Array.isArray(expectedTopics)?
  new Set(expectedTopics.filter(n=>Number.isInteger(n)&&n>=1&&n<=100)):null;
 const total=allowed?allowed.size:expectedTopics;
 if(!Array.isArray(rows)||!Number.isSafeInteger(total)||total<0)return null;
 const seen=new Set(),valid=[];
 for(const row of rows){
  if(!Number.isInteger(row?.topic_no)||row.topic_no<1||row.topic_no>100||seen.has(row.topic_no))continue;
  seen.add(row.topic_no);
  if((!allowed||allowed.has(row.topic_no))&&homeworkSubmitted(row))valid.push(row.topic_no);
 }
 return {submitted:valid.length,total,topics:valid.sort((a,b)=>a-b)};
}
export function firstUnfinishedPracticeTopic(quizProgress,homeworkSummary){
 if(quizProgress?.known!==true||!homeworkSummary||!Array.isArray(homeworkSummary.topics))return null;
 const submitted=new Set(homeworkSummary.topics);
 return Object.keys(quizProgress.byTopic).map(Number).sort((a,b)=>a-b)
  .find(n=>!quizProgress.byTopic[n].passed||!submitted.has(n))??null;
}
