import {Platform} from 'react-native';
import {FunctionsHttpError} from '@supabase/supabase-js';
import {supabase} from './supabase';

export function saveGiftPdf(data:{pdf_base64?:unknown;filename?:unknown}){
 if(Platform.OS!=='web'||typeof document==='undefined')throw new Error('Otwórz trenerki.com w przeglądarce, aby pobrać kartę PDF.');
 if(typeof data.pdf_base64!=='string'||typeof data.filename!=='string')throw new Error('Nie udało się pobrać pliku PDF. Spróbuj ponownie.');
 const raw=atob(data.pdf_base64);
 if(!raw.startsWith('%PDF-'))throw new Error('Nie udało się odczytać pliku PDF. Spróbuj ponownie.');
 const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
 const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
 const anchor=document.createElement('a');anchor.href=url;anchor.download=data.filename.replace(/[^a-zA-Z0-9._-]/g,'-');
 document.body.appendChild(anchor);anchor.click();anchor.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}

export async function downloadGiftPdf(input:{code?:string;gift_id?:string}){
 const code=input.code?.trim().replace(/\s/g,'').toUpperCase();
 if(code&&!/^(?:TA|TW)-[0-9A-F]{32}$/.test(code))throw new Error('Przepisz cały kod karty zaczynający się od TA- lub TW-.');
 if(!code&&!input.gift_id)throw new Error('Podaj kod karty do wydruku.');
 const {data,error}=await supabase.functions.invoke('ta-gift-print',{body:{action:'pdf',...(code?{code}:{gift_id:input.gift_id})}});
 if(error||!data?.ok){
  const response=error instanceof FunctionsHttpError?await error.context.json().catch(()=>null):null;
  const detail=response?.error??data?.error;
  const messages:Record<string,string>={
   confirmed_login_required:'Zaloguj się na konto z potwierdzonym adresem e-mail, aby pobrać kartę.',
   login_required:'Zaloguj się, aby pobrać kartę.',
   invalid_code:'Nie znaleziono takiego kodu. Sprawdź kod na karcie.',
   invalid_gift_code:'Kod ma niepoprawny format. Przepisz cały kod zaczynający się od TA- lub TW-.',
   invalid_input:'Sprawdź cały kod karty i spróbuj ponownie.',
   not_found:'Nie znaleziono tej karty lub nie masz dostępu do jej wydruku.',
   gift_not_found:'Nie znaleziono tej karty lub nie masz dostępu do jej wydruku.',
   card_not_found:'Nie znaleziono tej karty. Sprawdź jej kod.',
   forbidden:'Ta karta jest dostępna dla jej nadawcy lub wskazanego odbiorcy.',
   wrong_email:'Ta karta jest przypisana do innego adresu e-mail. Zaloguj się na właściwe konto.',
   gift_for_another_email:'Ta karta jest dostępna dla jej nadawcy lub wskazanego odbiorcy. Zaloguj się na właściwe konto.',
   card_inactive:'Ta karta została już odebrana, anulowana lub wygasła.',
   gift_inactive:'Ta karta została już odebrana, anulowana lub wygasła.',
   code_used_or_expired:'Ta karta została już odebrana lub straciła ważność.',
   pdf_not_ready:'Nie udało się przygotować PDF. Spróbuj ponownie za chwilę.',
   rate_limited:'Poczekaj chwilę przed pobraniem kolejnej karty.'
  };
  throw new Error(messages[detail]||'Nie udało się pobrać karty PDF. Spróbuj ponownie za chwilę.');
 }
 saveGiftPdf(data);
}
