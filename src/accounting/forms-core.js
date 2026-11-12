/** Pomocniki pracowni formularzy. Nie wysyłają deklaracji do urzędów. */
const HOSTS=new Set(['www.zus.pl','zus.pl','www.gov.pl','gov.pl','podatki.gov.pl','www.podatki.gov.pl','podatki-arch.mf.gov.pl','ksef.podatki.gov.pl','prs.ms.gov.pl','ekrs.ms.gov.pl','stat.gov.pl','bip.stat.gov.pl','biznes.gov.pl']);
export function officialURL(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&HOSTS.has(u.hostname)?u.href:null;}catch{return null;}}
export const formKey=v=>typeof v==='string'&&/^[a-z0-9][a-z0-9-]{2,89}$/.test(v);
export function numberInput(value,precision){
 if(typeof value!=='string'||value.trim()==='')return {valid:false,message:'Wpisz liczbę. Puste pole nie oznacza zera.'};
 if(value.trim().length>32)return {valid:false,message:'Wpis jest zbyt długi.'};
 const s=value.trim().replace(/[ \u00a0\u202f]/g,'').replace(',','.');
 if(!/^-?\d+(\.\d+)?$/.test(s))return {valid:false,message:'Wpisz liczbę, bez danych osobowych i znaku waluty.'};
 const frac=(s.split('.')[1]||'').replace(/0+$/,'');
 if(frac.length>precision)return {valid:false,message:precision===0?'To pole wymaga pełnych złotych lub całkowitej liczby. Zaokrąglij zgodnie z instrukcją.':'Wpisz kwotę z dokładnością do groszy.'};
 const n=Number(s);if(!Number.isFinite(n)||Math.abs(n)>1e12)return {valid:false,message:'Kwota poza zakresem ćwiczenia.'};
 return {valid:true,value:s};
}
export const draftKey=(user,reference,scenario)=>`ta-form-draft-v1:${user}:${reference}:${scenario}`;
export function restoreDraft(raw,revision,remote){
 try{const x=JSON.parse(raw);if(!x||!x.inputs||typeof x.inputs!=='object'||Array.isArray(x.inputs)||!Number.isInteger(x.baseVersion)||x.baseVersion<0||Object.entries(x.inputs).some(([k,v])=>!/^[a-z0-9-]{2,80}$/.test(k)||typeof v!=='string'||v.length>32))return null;
  return {inputs:x.inputs,baseVersion:x.baseVersion,conflict:x.revision!==revision||x.baseVersion!==(remote?.version||0),oldContent:x.revision!==revision};
 }catch{return null;}
}
export function feedbackTitle(e){return e?.all_correct?'Wybrane pola ćwiczenia są zgodne z założeniami.':'Sprawdź wskazane pola i wyjaśnienia.';}
function realDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+'T00:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function periodLabel(f){
 const unknown='Okres wymaga sprawdzenia';
 if(!f||typeof f!=='object')return unknown;
 if('period_mode' in f){
  if(f.period_mode!=='verified_current'||'valid_from' in f||'valid_until' in f||'verified_tax_years' in f||!realDate(f.availability_checked_at)||f.availability_checked_at!==f.verified_at)return unknown;
  return 'Bieżąca dostępność wzoru sprawdzona: '+f.availability_checked_at;
 }
 return f.verified_tax_years?.length?'Zweryfikowany rok przykładu: '+f.verified_tax_years.join(', '):f.valid_from?'Zakres wskazany od: '+f.valid_from:unknown;
}
