// Pomocnicza logika słownika. Treści pochodzą wyłącznie z chronionej bazy.
export const TERM_LABELS = {'slownik-nip':'NIP','slownik-regon':'REGON','slownik-krs':'KRS','slownik-ksef':'KSeF','slownik-pesel':'PESEL','slownik-ceidg':'CEIDG','slownik-pkd':'PKD','slownik-numer-ksef':'Numer KSeF','slownik-upo':'UPO','slownik-vat-ue':'VAT-UE','slownik-vies':'VIES','slownik-crbr':'CRBR'};
export const validKey = value => typeof value==='string' && /^slownik-[a-z0-9][a-z0-9-]{0,79}$/.test(value);
export const safeSourceURL = value => {
 try {const url=new URL(String(value));const h=url.hostname.toLowerCase();
  if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
  return ['gov.pl','europa.eu'].some(domain=>h===domain||h.endsWith('.'+domain))?url.href:null;
 } catch {return null;}
};
export function speechText(row){
 const g=row?.material?.glossary||{};
 return [g.term,g.full_name,'Co to znaczy?',g.plain,'Skąd się wzięło?',g.origin,'Kto prowadzi lub nadaje?',g.owner,'Gdzie spotkasz to w pracy?',g.where,...(Array.isArray(g.examples)?g.examples:[]).flatMap((e,i)=>['Przykład '+(i+1),e.situation,e.explanation])].filter(x=>typeof x==='string'&&x.trim()).join('. ');
}
export function speechChunks(text,limit=220){
 if(!Number.isInteger(limit)||limit<40||limit>1000)throw new Error('Nieprawidłowy limit odsłuchu.');
 const words=String(text||'').replace(/\s+/g,' ').trim().split(' ').filter(Boolean),result=[];let current='';
 for(const word of words){
  if(word.length>limit){if(current){result.push(current);current='';}for(let i=0;i<word.length;i+=limit)result.push(word.slice(i,i+limit));continue;}
  if(current.length+word.length+1>limit){result.push(current);current=word;}else current+=(current?' ':'')+word;
 }
 if(current)result.push(current);return result;
}
export function checkPractice(exercise,selected){
 if(!exercise||!Array.isArray(exercise.choices)||!Number.isInteger(exercise.correctIndex)||exercise.correctIndex<0||exercise.correctIndex>=exercise.choices.length||!Number.isInteger(selected)||selected<0||selected>=exercise.choices.length)return null;
 return {correct:selected===exercise.correctIndex,explanation:String(exercise.explanation||'')};
}
