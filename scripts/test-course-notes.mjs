import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {CourseNotes,CourseNoteConflict,courseNoteKey,courseNotesAdapter} from '../src/courseNotes.mjs';
const id='00000000-0000-4000-a000-000000000301',slug='synthetic-course';
const copy=value=>structuredClone(value);
const row=notes=>({last_module:0,notes:{byLesson:notes},updated_at:'2026-11-28T00:00:00.000Z'});
function storage(){const data=new Map();return {data,getItem:async key=>data.get(key)||null,setItem:async(key,value)=>{data.set(key,value);}};}
function database(initial=row({})){let current=copy(initial),version=0;const db={writes:[],fail:false,hold:null,
 read:async()=>copy(current),write:async(previous,notes,target)=>{
  db.writes.push(copy(notes));if(db.hold)await db.hold;
  if(db.fail)throw new Error('synthetic_connection_failure');
  if(current?.updated_at!==previous?.updated_at)return null;
  current={last_module:target,notes:{byLesson:copy(notes)},updated_at:'version-'+(++version)};return copy(current);
 },set:value=>{current=copy(value);},get:()=>copy(current)};return db;}
async function open({db=database(),disk=storage(),userId=id,course=slug}={}){
 const store=new CourseNotes({userId,slug:course,storage:disk,adapter:db});await store.initialize(await db.read());return {store,db,disk};
}
test('reading and restoring notes never writes to the account',async()=>{
 const {store,db}=await open({db:database(row({'0':'cloud note'}))});assert.equal(store.notes[0],'cloud note');assert.equal(db.writes.length,0);
});
test('a failed send survives refresh in the same learner and course',async()=>{
 const {store,db,disk}=await open();store.change(0,'My independent work');await store.flush();db.fail=true;
 await assert.rejects(store.save(1));assert.equal(store.state.dirty,1);
 const restored=(await open({db,disk})).store;assert.equal(restored.notes[0],'My independent work');assert.equal(restored.state.restored,true);
});
test('local recovery does not cross learner or course boundaries',async()=>{
 const {store,db,disk}=await open();store.change(0,'First learner private draft');await store.flush();
 assert.deepEqual((await open({db,disk,userId:'second-user'})).store.notes,{});
 assert.deepEqual((await open({db,disk,course:'other-course'})).store.notes,{});
 assert.notEqual(courseNoteKey('a:b','c'),courseNoteKey('a','b:c'));
});
test('text typed during a delayed save stays dirty and is saved by the retry',async()=>{
 const {store,db}=await open();let release;db.hold=new Promise(resolve=>{release=resolve;});
 store.change(0,'First version');const saving=store.save(0);await Promise.resolve();
 store.change(0,'First version plus a new conclusion');release();await saving;
 assert.equal(db.get().notes.byLesson[0],'First version');assert.equal(store.notes[0],'First version plus a new conclusion');assert.equal(store.state.dirty,1);
 db.hold=null;await store.save(0);assert.equal(db.get().notes.byLesson[0],store.notes[0]);assert.equal(store.state.dirty,0);
});
test('undoing back to the original text while saving also retains that intent',async()=>{
 const {store,db}=await open({db:database(row({'0':'Original'}))});let release;db.hold=new Promise(resolve=>{release=resolve;});
 store.change(0,'Sent version');const saving=store.save(0);await Promise.resolve();store.change(0,'Original');release();await saving;
 assert.equal(store.notes[0],'Original');assert.equal(store.state.dirty,1);assert.equal(db.get().notes.byLesson[0],'Sent version');
});
test('a second save cannot start while one request is pending',async()=>{
 const {store,db}=await open();let release;db.hold=new Promise(resolve=>{release=resolve;});store.change(0,'Only one write');
 const saving=store.save(0);await assert.rejects(store.save(0),/note_save_in_progress/);release();await saving;assert.equal(db.writes.length,1);
});
test('a newer note in a different lesson is preserved while merging',async()=>{
 const {store,db}=await open({db:database(row({'0':'A','1':'old'}))});store.change(0,'My A');db.set({...row({'0':'A','1':'new from another device'}),updated_at:'new-remote'});
 await store.save(1);assert.deepEqual(db.get().notes.byLesson,{'0':'My A','1':'new from another device'});
});
test('a conflicting note is not overwritten until the learner compares versions',async()=>{
 const {store,db}=await open({db:database(row({'0':'Original'}))});store.change(0,'My version');db.set({...row({'0':'Other device'}),updated_at:'new-remote'});
 await assert.rejects(store.save(0),CourseNoteConflict);assert.equal(db.writes.length,0);assert.equal(store.notes[0],'My version');assert.equal(store.state.conflicts[0],'Other device');
 store.resolve(0,false);await store.save(0);assert.equal(db.get().notes.byLesson[0],'My version');
});
test('choosing the account version resolves a conflict without a remote write',async()=>{
 const {store,db}=await open({db:database(row({'0':'Original'}))});store.change(0,'My version');db.set({...row({'0':'Other device'}),updated_at:'new-remote'});
 await assert.rejects(store.save(0),CourseNoteConflict);store.resolve(0,true);await store.flush();
 assert.equal(store.notes[0],'Other device');assert.equal(store.state.dirty,0);assert.equal(db.writes.length,0);
});
test('a version race retries against fresh data and preserves the other lesson',async()=>{
 const {store,db}=await open({db:database(row({'0':'A','1':'old'}))});const write=db.write;let first=true;
 db.write=async(...args)=>{if(first){first=false;db.set({...row({'0':'A','1':'changed in flight'}),updated_at:'new-remote'});return null;}return write(...args);};
 store.change(0,'My version');await store.save(0);assert.equal(db.get().notes.byLesson[1],'changed in flight');assert.equal(store.state.dirty,0);
});
test('a committed write with a lost response is recognized after refresh',async()=>{
 const {store,db,disk}=await open();store.change(0,'Committed once');await store.flush();const write=db.write;
 db.write=async(...args)=>{await write(...args);throw new Error('response lost');};await assert.rejects(store.save(0));
 const restored=(await open({db,disk})).store;assert.equal(restored.notes[0],'Committed once');assert.equal(restored.state.dirty,0);
 db.set({...row({'0':'Later change from the account'}),updated_at:'later-remote'});
 const later=(await open({db,disk})).store;assert.equal(later.notes[0],'Later change from the account');assert.equal(later.state.dirty,0);
});
test('storage failures are visible and never claim that the local draft is saved',async()=>{
 const disk=storage();disk.setItem=async()=>{throw new Error('quota exceeded');};const {store}=await open({disk});store.change(0,'Keep in memory');await store.flush();
 assert.equal(store.notes[0],'Keep in memory');assert.match(store.state.localError,/Nie udało się zachować szkicu/);
});
test('a journal from a different scope or corrupt JSON cannot replace cloud notes',async()=>{
 for(const raw of ['{broken',JSON.stringify({version:1,userId:'other',slug,edits:{'0':{value:'Wrong learner',base:''}}})]){
  const disk=storage();disk.data.set(courseNoteKey(id,slug),raw);const {store,db}=await open({disk,db:database(row({'0':'Verified cloud'}))});
  assert.equal(store.notes[0],'Verified cloud');assert.equal(db.writes.length,0);assert(store.state.localError);
 }
});
test('the real REST adapter sends both ownership filters and an atomic version filter',async()=>{
 const requests=[];let current={...row({'0':'Original'}),user_id:id,course_slug:slug};
 const client=createClient('https://notes-fixture.supabase.co','synthetic-key',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{
  const url=new URL(input);assert.equal(url.origin,'https://notes-fixture.supabase.co');requests.push({url,method:init.method});
  if(init.method==='GET')return Response.json([current]);
  const matches=url.searchParams.get('user_id')==='eq.'+id&&url.searchParams.get('course_slug')==='eq.'+slug&&url.searchParams.get('updated_at')==='eq.'+current.updated_at;
  if(!matches)return Response.json([]);
  current=JSON.parse(init.body);return Response.json([current]);
 }}});
 const adapter=courseNotesAdapter(client,id,slug),previous=await adapter.read();
 const saved=await adapter.write(previous,{'0':'Saved'},1);assert.equal(saved.notes.byLesson[0],'Saved');
 assert.equal(await adapter.write(previous,{'0':'Stale overwrite'},1),null);assert.equal(current.notes.byLesson[0],'Saved');
 assert(requests.filter(r=>r.method==='PATCH').every(r=>r.url.searchParams.has('select')));
});
