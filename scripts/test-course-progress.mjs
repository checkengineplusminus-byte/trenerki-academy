import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCourseProgress,summarizeCourseProgress} from '../src/learning/course-progress.js';
import {courseFinished} from '../src/accounting/course-entry.js';

function cappedClient(tables,{cap=500,failAt=Infinity,counts=true}={}) {
  const calls=[];
  return {calls,from(table) {
    let rows=tables[table],orders=[];
    const q={
      select(){return q;},
      in(key,values){rows=rows.filter(r=>values.includes(r[key]));return q;},
      eq(key,value){rows=rows.filter(r=>r[key]===value);return q;},
      order(key){orders.push(key);return q;},
      async range(from,to) {
        calls.push({table,from,to});
        if(from>=failAt)return {data:null,error:new Error('second page failed')};
        const sorted=[...rows].sort((a,b)=>{
          for(const k of orders){if(a[k]<b[k])return -1;if(a[k]>b[k])return 1;}return 0;
        });
        return {data:sorted.slice(from,Math.min(to+1,from+cap)),error:null,count:counts?rows.length:null};
      }
    };return q;
  }};
}
const lessons=Array.from({length:81},(_,c)=>Array.from({length:c===13?63:c===75?40:30},(_,lesson_no)=>({course_slug:'course-'+String(c).padStart(2,'0'),lesson_no}))).flat();
const slugs=[...new Set(lessons.map(r=>r.course_slug))];

test('81 courses and 2473 lessons survive the API row cap; missing lessons never become completed',async()=>{
  assert.equal(lessons.length,2473);
  const passed=lessons.filter(r=>r.lesson_no<14).map(r=>({...r,user_id:'owner'}));
  const client=cappedClient({ta_lessons:lessons,ta_learning_progress:passed});
  const result=await loadCourseProgress(client,'owner',slugs);
  assert.equal(result.size,81);
  assert.equal([...result.values()].reduce((n,r)=>n+r.lessonCount,0),2473);
  assert.equal([...result.values()].reduce((n,r)=>n+r.completedCount,0),1134);
  assert.equal(result.get('course-80').lessonCount,30);
  for(const [slug,row] of result)assert.equal(courseFinished(slug,row.lessonCount,row.completedCount,true),false);
});
test('a lower server cap still retrieves every current lesson',async()=>{
  const client=cappedClient({ta_lessons:lessons,ta_learning_progress:[]},{cap:100});
  const result=await loadCourseProgress(client,'owner',slugs);
  assert.equal([...result.values()].reduce((n,r)=>n+r.lessonCount,0),2473);
});
test('obsolete and duplicate completions cannot fill gaps in the current programme',()=>{
  const result=summarizeCourseProgress([{course_slug:'a',lesson_no:0},{course_slug:'a',lesson_no:1}],
    [{course_slug:'a',lesson_no:0},{course_slug:'a',lesson_no:0},{course_slug:'a',lesson_no:99}]);
  assert.deepEqual(result.get('a'),{lessonCount:2,completedCount:1,progress:50,progressAvailable:true});
});
test('user and enrollment scope exclude other users and courses',async()=>{
  const client=cappedClient({ta_lessons:lessons,ta_learning_progress:[
    {course_slug:'course-00',lesson_no:0,user_id:'owner'},
    {course_slug:'course-00',lesson_no:1,user_id:'someone-else'},
    {course_slug:'course-01',lesson_no:0,user_id:'owner'}]});
  const result=await loadCourseProgress(client,'owner',['course-00']);
  assert.equal(result.size,1);assert.equal(result.get('course-00').completedCount,1);
});
test('a later page error does not return partial numbers as full progress',async()=>{
  const client=cappedClient({ta_lessons:lessons,ta_learning_progress:[]},{failAt:500});
  await assert.rejects(loadCourseProgress(client,'owner',slugs),/second page failed/);
});
test('without an exact count, continue to an empty page rather than assuming a short page is final',async()=>{
  const client=cappedClient({ta_lessons:lessons,ta_learning_progress:[]},{cap:100,counts:false});
  const result=await loadCourseProgress(client,'owner',slugs);
  assert.equal(result.size,81);assert.equal(result.get('course-75').lessonCount,40);
});
test('no enrollment means no progress requests',async()=>{
  const client=cappedClient({});assert.equal((await loadCourseProgress(client,'owner',[])).size,0);assert.equal(client.calls.length,0);
});
