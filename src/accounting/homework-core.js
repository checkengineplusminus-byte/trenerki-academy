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
 if(!Array.isArray(rows)||!Number.isSafeInteger(expectedTopics)||expectedTopics<0)return null;
 const seen=new Set(),valid=[];
 for(const row of rows){
  if(!Number.isInteger(row?.topic_no)||row.topic_no<1||row.topic_no>100||seen.has(row.topic_no))continue;
  seen.add(row.topic_no);
  if(homeworkSubmitted(row))valid.push(row.topic_no);
 }
 return {submitted:valid.length,total:expectedTopics,topics:valid};
}
