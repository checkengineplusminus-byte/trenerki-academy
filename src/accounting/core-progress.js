/** Read-only progress for the student's OWN answers to the 100-topic programme.
 * Client data is already filtered by Supabase Auth and RLS. The function never
 * grants access, writes scores, awards certificates or treats drafts as published.
 * Missing/partial reads remain unknown instead of being counted as zero.
 */
import {checkExercise} from './reader-core.js';

const integer=n=>Number.isSafeInteger(n)&&n>=1&&n<=100;
export function buildCorePracticeProgress(topics,materials,answers,{materialsReady=false,answersReady=false}={}){
 const known=materialsReady===true&&answersReady===true&&
  Array.isArray(topics)&&Array.isArray(materials)&&Array.isArray(answers);
 if(!known)return {known:false,availableTopics:null,passedTopics:null,
  correctAnswers:null,totalQuestions:null,attemptedAnswers:null,nextTopic:null,byTopic:{}};
 const materialMap=new Map(),ambiguous=new Set();
 for(const row of materials){
  if(!integer(row?.topic_no))continue;
  if(materialMap.has(row.topic_no))ambiguous.add(row.topic_no);
  else materialMap.set(row.topic_no,row?.material);
 }
 const answerMap=new Map(),duplicateAnswers=new Set();
 for(const row of answers){
  if(!integer(row?.topic_no)||typeof row.exercise_id!=='string'||typeof row.answer!=='string')continue;
  const key=row.topic_no+':'+row.exercise_id;
  if(answerMap.has(key))duplicateAnswers.add(key);
  else answerMap.set(key,row.answer);
 }
 const byTopic={},seen=new Set();
 let availableTopics=0,passedTopics=0,correctAnswers=0,totalQuestions=0,attemptedAnswers=0;
 let nextTopic=null;
 for(const topic of topics){
  const id=topic?.topic_no;
  if(!integer(id)||seen.has(id))continue;
  seen.add(id);
  const material=materialMap.get(id);
  if(ambiguous.has(id)||!material||!Array.isArray(material.exercises)||material.exercises.length===0)continue;
  const exercises=material.exercises;
  const exerciseIds=exercises.map(x=>x?.id);
  if(exerciseIds.some(x=>typeof x!=='string'||!x)||new Set(exerciseIds).size!==exerciseIds.length)continue;
  let correct=0,attempted=0;
  for(const exercise of exercises){
   const key=id+':'+exercise.id;
   if(duplicateAnswers.has(key))continue;
   const answer=answerMap.get(key);
   if(typeof answer!=='string')continue;
   const result=checkExercise(exercise,answer);
   if(!result.valid)continue;
   attempted++;if(result.correct)correct++;
  }
  const total=exercises.length,passed=correct===total;
  byTopic[id]={attempted,correct,total,passed,editorialStatus:topic.status};
  availableTopics++;totalQuestions+=total;correctAnswers+=correct;attemptedAnswers+=attempted;
  if(passed)passedTopics++;
  else if(nextTopic===null)nextTopic=id;
 }
 return {known:true,availableTopics,passedTopics,correctAnswers,totalQuestions,attemptedAnswers,nextTopic,byTopic};
}
