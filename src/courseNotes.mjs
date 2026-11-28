// Local recovery is scoped to a verified learner and course. It never grants access.
const noteKey=key=>/^(0|[1-9]\d{0,4})$/.test(key);
export const courseNoteKey=(userId,slug)=>'trenerki-course-notes-v1:'+encodeURIComponent(userId)+':'+encodeURIComponent(slug);
export function remoteNoteMap(row){
 const notes=row?.notes;
 if(notes?.byLesson&&typeof notes.byLesson==='object'&&!Array.isArray(notes.byLesson))
  return Object.fromEntries(Object.entries(notes.byLesson).filter(([key,value])=>noteKey(key)&&typeof value==='string'));
 return typeof notes?.text==='string'?{[String(row.last_module||0)]:notes.text}:{};
}
export class CourseNoteConflict extends Error{
 constructor(conflicts){super('Na koncie jest inna wersja notatki. Porównaj ją ze swoim szkicem.');this.name='CourseNoteConflict';this.conflicts=conflicts;}
}
export function mergeCourseNotes(remote,edits){
 const conflicts={};
 for(const [key,edit] of Object.entries(edits))
  if((remote[key]||'')!==edit.base&&(remote[key]||'')!==edit.value)conflicts[key]=remote[key]||'';
 if(Object.keys(conflicts).length)throw new CourseNoteConflict(conflicts);
 return {...remote,...Object.fromEntries(Object.entries(edits).map(([key,edit])=>[key,edit.value]))};
}

// Conditional UPDATE is a single database operation. A changed version returns
// no row, so a different device's write cannot be silently overwritten here.
export function courseNotesAdapter(client,userId,slug){
 const scoped=()=>client.from('ta_drafts').select('last_module,notes,updated_at').eq('user_id',userId).eq('course_slug',slug).maybeSingle();
 return {
  async read(){const {data,error}=await scoped();if(error)throw error;return data;},
  async write(previous,notes,target){
   const time=Math.max(Date.now(),previous?Date.parse(previous.updated_at)+1:0);
   if(!Number.isFinite(time))throw new Error('invalid_note_version');
   const row={user_id:userId,course_slug:slug,last_module:target,
    notes:{...(previous?.notes||{}),byLesson:{...(previous?.notes?.byLesson||{}),...notes}},updated_at:new Date(time).toISOString()};
   const result=previous
    ?await client.from('ta_drafts').update(row).eq('user_id',userId).eq('course_slug',slug).eq('updated_at',previous.updated_at).select('last_module,notes,updated_at')
    :await client.from('ta_drafts').insert(row).select('last_module,notes,updated_at');
   if(result.error){if(!previous&&result.error.code==='23505')return null;throw result.error;}
   return result.data?.[0]||null;
  }
 };
}

export class CourseNotes{
 constructor({userId,slug,storage,adapter,onChange=(_state)=>{}}){
  if(!userId||!slug)throw new Error('missing_note_scope');
  this.userId=userId;this.slug=slug;this.key=courseNoteKey(userId,slug);
  this.storage=storage;this.adapter=adapter;this.onChange=onChange;
  this.remote={};this.edits={};this.conflicts={};this.row=null;
  this.saving=false;this.ready=false;this.localPending=0;this.localError='';this.error='';this.restored=false;
  this.queue=Promise.resolve();
 }
 get notes(){return {...this.remote,...Object.fromEntries(Object.entries(this.edits).map(([key,edit])=>[key,edit.value]))};}
 get state(){return {notes:this.notes,dirty:Object.keys(this.edits).length,saving:this.saving,ready:this.ready,
  localPending:this.localPending>0,localError:this.localError,error:this.error,restored:this.restored,conflicts:{...this.conflicts}};}
 publish(){this.onChange(this.state);}
 dispose(){this.onChange=()=>{};}
 async initialize(row){
  this.row=row;this.remote=remoteNoteMap(row);
  let normalized=false;
  try{
   const raw=await this.storage.getItem(this.key);
   if(raw){
    const saved=JSON.parse(raw);
    if(saved.version!==1||saved.userId!==this.userId||saved.slug!==this.slug||!saved.edits||typeof saved.edits!=='object'||Array.isArray(saved.edits))throw new Error('invalid_note_draft');
    for(const [key,edit] of Object.entries(saved.edits)){
     if(!noteKey(key)||typeof edit?.value!=='string'||typeof edit?.base!=='string')throw new Error('invalid_note_draft');
     if(edit.value!==(this.remote[key]||''))this.edits[key]={value:edit.value,base:edit.base};
    }
    this.restored=Object.keys(this.edits).length>0;
    normalized=Object.keys(saved.edits).length!==Object.keys(this.edits).length;
    this.findConflicts();
   }
  }catch{this.edits={};this.localError='Nie udało się odczytać szkicu z urządzenia. Wczytano notatki z konta.';}
  this.ready=true;this.publish();if(normalized)await this.persist();return this;
 }
 findConflicts(){
  this.conflicts={};
  for(const [key,edit] of Object.entries(this.edits))
   if(edit.base!==(this.remote[key]||'')&&edit.value!==(this.remote[key]||''))this.conflicts[key]=this.remote[key]||'';
 }
 persist(){
  const payload=JSON.stringify({version:1,userId:this.userId,slug:this.slug,edits:this.edits});
  this.localPending++;
  this.queue=this.queue.catch(()=>{}).then(async()=>{
   try{await this.storage.setItem(this.key,payload);this.localError='';}
   catch{this.localError='Nie udało się zachować szkicu na urządzeniu. Zapisz go na koncie przed odświeżeniem lub wyjściem.';}
   finally{this.localPending--;this.publish();}
  });
  this.publish();return this.queue;
 }
 async flush(){await this.queue;}
 change(lesson,value){
  const key=String(lesson);if(!this.ready||!noteKey(key)||typeof value!=='string')return;
  const base=this.edits[key]?.base??this.remote[key]??'';
  // During a request, retain an explicit undo too: the old request may still
  // commit a different value after the learner has returned to the original.
  if(!this.saving&&value===(this.remote[key]||''))delete this.edits[key];
  else this.edits[key]={value,base};
  this.error='';this.findConflicts();void this.persist();
 }
 resolve(lesson,useRemote){
  if(this.saving)return;
  const key=String(lesson),edit=this.edits[key];if(!edit)return;
  if(useRemote)delete this.edits[key];
  else this.edits[key]={value:edit.value,base:this.remote[key]||''};
  delete this.conflicts[key];this.error='';void this.persist();
 }
 async save(target){
  if(!this.ready)throw new Error('note_draft_not_ready');
  if(this.saving)throw new Error('note_save_in_progress');
  this.saving=true;this.error='';this.publish();
  const snapshot=Object.fromEntries(Object.entries(this.edits).map(([key,edit])=>[key,{...edit}]));
  try{
   for(let attempt=0;attempt<3;attempt++){
    const previous=await this.adapter.read(),remote=remoteNoteMap(previous);
    this.remote=remote;this.row=previous;
    const merged=mergeCourseNotes(remote,snapshot);
    const saved=await this.adapter.write(previous,merged,target);
    if(!saved)continue;
    this.row=saved;this.remote=remoteNoteMap(saved);
    for(const [key,edit] of Object.entries(this.edits)){
     if(edit.value===(this.remote[key]||''))delete this.edits[key];
     else if(snapshot[key]&&edit.base===snapshot[key].base)
      this.edits[key]={value:edit.value,base:this.remote[key]||''};
    }
    if(!Object.keys(this.edits).length)this.restored=false;
    this.findConflicts();await this.persist();return;
   }
   throw new Error('note_changed_repeatedly');
  }catch(error){
   if(error instanceof CourseNoteConflict){this.conflicts=error.conflicts;this.error=error.message;}
   else this.error=['42501','PGRST301'].includes(error?.code)
    ?'Nie udało się potwierdzić dostępu. Otwórz Moje konto i sprawdź logowanie oraz dostęp do kursu. Szkic pozostaje na tym urządzeniu.'
    :'Zapis notatki nie powiódł się. Szkic pozostaje do ponowienia; sprawdź połączenie i spróbuj ponownie.';
   this.publish();throw error;
  }finally{this.saving=false;this.publish();}
 }
}
