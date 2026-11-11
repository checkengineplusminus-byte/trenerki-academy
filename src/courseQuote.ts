import {supabase} from './supabase';

export const termsVersion = '2026-11-11';

export async function coursePrice(slug:string) {
 const {data,error}=await supabase.rpc('ta_effective_course_price',{p_slug:slug});
 const price=data?.effective_price_grosze;
 if(error||!Number.isSafeInteger(price)||price<0)throw new Error('Nie udało się pobrać aktualnej ceny. Spróbuj ponownie.');
 return price as number;
}
