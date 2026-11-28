// Stateful PostgREST draft responses for browser fixtures, never a real database.
export function createDraftFixture(){
 const rows=new Map();
 return async(route,headers)=>{
  const request=route.request(),url=new URL(request.url()),method=request.method();
  const value=key=>(url.searchParams.get(key)||'').replace(/^eq\./,'');
  const reply=(data,status=200)=>route.fulfill({headers,status,contentType:'application/json',body:JSON.stringify(data)});
  if(method==='GET'){
   const row=rows.get(JSON.stringify([value('user_id'),value('course_slug')]));
   return reply(row?[row]:[]);
  }
  const body=request.postDataJSON(),key=JSON.stringify([body.user_id,body.course_slug]),previous=rows.get(key);
  if(method==='PATCH'){
   if(!previous||value('user_id')!==body.user_id||value('course_slug')!==body.course_slug||value('updated_at')!==previous.updated_at)return reply([]);
  }else if(method==='POST'){
   if(previous&&!url.searchParams.has('on_conflict'))return reply({code:'23505',message:'Synthetic unique conflict'},409);
  }else throw new Error('Unexpected draft fixture method '+method);
  rows.set(key,structuredClone(body));return reply([body],method==='POST'?201:200);
 };
}
