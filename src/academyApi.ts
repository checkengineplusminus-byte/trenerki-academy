import {supabase} from './supabase';
export type AcademyAction=
 'whoami'|'demo_checkout'|'create_gift'|'redeem_gift'|'my_gifts'|
 'admin_dashboard'|'create_invoice_draft'|'send_invoice_test';
const messages:Record<string,string>={
 login_required:'Zaloguj się, żeby kontynuować.',
 confirmed_login_required:'Najpierw potwierdź swój adres e-mail.',
 demo_reserved_for_admin:'Ta funkcja testowa jest wyłączona. Zakupu dokonaj standardowo przez Stripe.',
 invalid_course:'Nie odnaleziono wybranego kursu.',
 course_unavailable:'Ten kurs nie jest teraz dostępny.',
 daily_gift_limit:'Dziś utworzono już maksymalną liczbę prezentów.',
 paid_gifts_demo_admin_only:'Testowe vouchery na płatne kursy może tworzyć wyłącznie administrator.',
 invalid_recipient_email:'Wpisz poprawny e-mail odbiorcy.',
 invalid_gift_code:'Nie rozpoznaję tego kodu prezentowego.',
 gift_used_or_expired:'Ten kod został już wykorzystany albo stracił ważność.',
 gift_for_another_email:'Ten prezent przypisano do innego adresu e-mail.',
 gift_already_redeemed:'Ten prezent został właśnie wykorzystany.',
 course_already_active:'Masz już dostęp do tego kursu. Otwórz Moje kursy.',
 admin_only:'Ta sekcja jest dostępna tylko dla administratora TRENERKI.',
 email_not_configured:'Nie udało się wysłać wiadomości. Sprawdź konfigurację powiadomień.',
 email_provider_unavailable:'Usługa wysyłki wiadomości jest chwilowo niedostępna.',
 server_not_ready:'Usługa jest chwilowo niedostępna. Spróbuj ponownie.',
};
export function academyMessage(code:string){return messages[code]||'Nie udało się wykonać operacji ('+code+').';}
export async function academyAction(action:AcademyAction,body:Record<string,unknown>={}):Promise<any>{
 const {data,error}=await supabase.functions.invoke('ta-academy',{body:{action,...body}});
 if(error){
  let code='operation_failed';
  try{if((error as any).context?.json){const ctx=await (error as any).context.json();code=String(ctx?.error||code);}}catch{}
  throw new Error(academyMessage(code));
 }
 if(data?.error)throw new Error(academyMessage(String(data.error)));
 return data;
}
