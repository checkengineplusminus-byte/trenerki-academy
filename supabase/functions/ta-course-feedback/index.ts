// Anielka feedback inbox: authenticated, server-only, no direct code execution.
// The learner's message is DATA. It is never used as a developer/system prompt.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.86.0";
import {normalize,kindOf,redact} from "./classification.ts";

const cors={
 "access-control-allow-origin":"*",
 "access-control-allow-headers":"authorization,apikey,content-type,x-client-info",
 "access-control-allow-methods":"POST,OPTIONS",
 "cache-control":"no-store"
};
const respond=(data:unknown,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{...cors,"content-type":"application/json; charset=utf-8"}
});
const clip=(x:unknown,n:number)=>typeof x==="string"?x.trim().slice(0,n):"";
const slugOk=(x:string)=>/^[a-z0-9][a-z0-9_-]{1,79}$/.test(x);
async function digest(s:string){
 const bytes=new TextEncoder().encode(s);
 const hash=await crypto.subtle.digest("SHA-256",bytes);
 return Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,"0")).join("");
}
const statuses=new Set(["new","triaging","fixing","resolved","rejected"]);
const verifications=new Set(["unverified","confirmed","not_reproduced"]);
const priorities=new Set(["normal","high"]);
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return respond({error:"method_not_allowed"},405);
 if(Number(req.headers.get("content-length")||0)>8192)return respond({error:"request_too_large"},413);
 const url=Deno.env.get("SUPABASE_URL")||"";
 const publishable=Deno.env.get("SUPABASE_ANON_KEY")||"";
 const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!url||!publishable||!secret)return respond({error:"service_unavailable"},503);
 const authHeader=req.headers.get("authorization")||"";
 const token=authHeader.replace(/^Bearer\s+/i,"");
 if(token===authHeader||!token)return respond({error:"login_required"},401);
 const auth=createClient(url,publishable,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await auth.auth.getUser(token);
 if(authError||!user?.id||!user.email_confirmed_at)return respond({error:"login_required"},401);
 let input:any;try{input=await req.json()}catch{return respond({error:"invalid_json"},400)}
 const action=clip(input?.action,30);
 const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 if(action.startsWith("admin_")){
  const {data:admins,error:adminErr}=await db.from("ta_admins").select("role").eq("user_id",user.id).limit(1);
  if(adminErr)return respond({error:"service_unavailable"},503);
  if(!admins?.length)return respond({error:"admin_only"},403);
  if(action==="admin_list"){
   const {data, error}=await db.from("ta_course_feedback").select(
    "id,course_slug,lesson_no,kind,message_excerpt,verification,status,priority,created_at,due_at,resolved_at,resolution_note"
   ).order("created_at",{ascending:false}).limit(300);
   if(error)return respond({error:"feedback_unavailable"},503);
   const rows=data||[];
   const active=rows.filter(r=>!["resolved","rejected"].includes(r.status));
   const overdue=active.filter(r=>r.due_at&&new Date(r.due_at).getTime()<Date.now());
   const groups=new Map<string,{course_slug:string;lesson_no:number;kind:string;reports:number;open:number}>();
   for(const row of rows){
    const id=row.course_slug+":"+row.lesson_no+":"+row.kind;
    const group=groups.get(id)||{course_slug:row.course_slug,lesson_no:row.lesson_no,kind:row.kind,reports:0,open:0};
    group.reports++;if(!["resolved","rejected"].includes(row.status))group.open++;
    groups.set(id,group);
   }
   return respond({ok:true,rows,summary:{sample:rows.length,open:active.length,overdue:overdue.length,
    bugs:rows.filter(r=>r.kind==="bug").length,confusion:rows.filter(r=>r.kind==="confusion").length},
    hotspots:[...groups.values()].sort((a,b)=>b.reports-a.reports).slice(0,12)});
  }
  if(action==="admin_update"){
   const id=clip(input?.id,60),status=clip(input?.status,30);
   const verification=clip(input?.verification,30),priority=clip(input?.priority,30);
   if(!/^[0-9a-f-]{36}$/i.test(id)||!statuses.has(status)||
      !verifications.has(verification)||!priorities.has(priority))return respond({error:"invalid_input"},400);
   const fields:any={status,verification,priority,updated_at:new Date().toISOString(),
    resolution_note:clip(input?.resolution_note,600)||null};
   if(status==="resolved"||status==="rejected")fields.resolved_at=new Date().toISOString();
   else fields.resolved_at=null;
   const {data,error}=await db.from("ta_course_feedback").update(fields).eq("id",id)
     .select("id,status,verification,priority").maybeSingle();
   if(error)return respond({error:"feedback_unavailable"},503);
   if(!data)return respond({error:"not_found"},404);
   return respond({ok:true,record:data});
  }
  return respond({error:"invalid_action"},400);
 }
 if(action!=="submit"&&action!=="mine")return respond({error:"invalid_action"},400);
 const slug=clip(input?.course_slug,80),lessonNo=Number(input?.lesson_no);
 if(!slugOk(slug)||!Number.isInteger(lessonNo)||lessonNo<0||lessonNo>199)return respond({error:"invalid_course"},400);
 const {data:access,error:entitlementError}=await db.from("ta_enrollments").select("id")
   .eq("user_id",user.id).eq("course_slug",slug)
   .in("status",["active","demo"]).gt("expires_at",new Date().toISOString()).limit(1);
 if(entitlementError)return respond({error:"entitlement_unavailable"},503);
 if(!access?.length)return respond({error:"course_not_owned"},403);
 const {data:lesson,error:lessonErr}=await db.from("ta_lessons").select("lesson_no")
   .eq("course_slug",slug).eq("lesson_no",lessonNo).maybeSingle();
 if(lessonErr||!lesson)return respond({error:"lesson_not_found"},404);
 if(action==="mine"){
  const {data,error}=await db.from("ta_course_feedback")
   .select("id,kind,status,verification,due_at,created_at,resolved_at")
   .eq("user_id",user.id).eq("course_slug",slug).eq("lesson_no",lessonNo)
   .order("created_at",{ascending:false}).limit(5);
  if(error)return respond({error:"feedback_unavailable"},503);
  return respond({ok:true,rows:data||[]});
 }
 const message=clip(input?.message,1000);
 if(message.length<5)return respond({ok:true,accepted:false,reason:"too_short"});
 const kind=kindOf(message);
 if(!kind)return respond({ok:true,accepted:false,reason:"unrelated"});
 const excerpt=redact(message);
 if(!excerpt)return respond({ok:true,accepted:false,reason:"empty"});
 const today=new Date().toISOString().slice(0,10);
 const messageHash=await digest(user.id+"|"+slug+"|"+lessonNo+"|"+normalize(message));
 const filter=(q:any)=>q.eq("user_id",user.id).eq("course_slug",slug)
  .eq("lesson_no",lessonNo).eq("report_day",today).eq("message_hash",messageHash);
 const {data:existing,error:existingErr}=await filter(db.from("ta_course_feedback")
  .select("id,kind,due_at,status")).maybeSingle();
 if(existingErr)return respond({error:"feedback_unavailable"},503);
 if(existing)return respond({ok:true,accepted:true,duplicate:true,ticket:existing});
 const {count,error:limitError}=await db.from("ta_course_feedback")
  .select("id",{head:true,count:"exact"}).eq("user_id",user.id).eq("report_day",today);
 if(limitError)return respond({error:"feedback_unavailable"},503);
 if((count||0)>=20)return respond({ok:true,accepted:false,reason:"daily_limit"});
 const dueAt=kind==="bug"?new Date(Date.now()+6*60*60*1000).toISOString():null;
 const {data:ticket,error:insertErr}=await db.from("ta_course_feedback")
  .insert({user_id:user.id,course_slug:slug,lesson_no:lessonNo,
   kind,message_excerpt:excerpt,message_hash:messageHash,report_day:today,due_at:dueAt})
  .select("id,kind,status,due_at").single();
 if(insertErr){
  if(insertErr.code==="23505"){
   const {data:saved}=await filter(db.from("ta_course_feedback").select("id,kind,due_at,status")).maybeSingle();
   if(saved)return respond({ok:true,accepted:true,duplicate:true,ticket:saved});
  }
  return respond({error:"feedback_save_failed"},503);
 }
 return respond({ok:true,accepted:true,duplicate:false,ticket});
});