import {supabase} from './supabase';

// This optional quality signal never affects lesson completion or exam results.
// The server alone chooses the category, confirms access, and stores redacted data.
export type CourseFeedbackTicket={
 id:string;kind:'bug'|'content'|'confusion';status:string;due_at?:string|null
};
export type CourseFeedbackAck={
 ok?:boolean;accepted?:boolean;duplicate?:boolean;
 ticket?:CourseFeedbackTicket;error?:string;reason?:string
};
export async function submitCourseFeedback(courseSlug:string,lessonNo:number,message:string):Promise<CourseFeedbackAck|null>{
 try{
  const {data,error}=await supabase.functions.invoke<CourseFeedbackAck>('ta-course-feedback',{
   body:{action:'submit',course_slug:courseSlug,lesson_no:lessonNo,message:message.slice(0,1000)}
  });
  if(error||!data?.ok)return null;
  return data;
 }catch{return null;}
}
export function feedbackConfirmation(data:CourseFeedbackAck|null):string{
 if(!data?.accepted||!data.ticket)return '';
 const short=data.ticket.id.slice(0,8).toUpperCase();
 if(data.ticket.kind==='bug'){
  return 'Anielka: Zapisałam zgłoszenie #'+short+' dla zespołu technicznego. Postaramy się zweryfikować problem w ciągu 6 godzin. Samo usunięcie błędu może wymagać dodatkowych testów i potrwać dłużej.';
 }
 return 'Dziękuję. Zapisałam Twoją uwagę (#'+short+'), żeby można było ulepszyć wyjaśnienia w tej lekcji.';
}
