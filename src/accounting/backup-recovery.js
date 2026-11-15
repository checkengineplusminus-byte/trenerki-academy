/**
 * Wyłącznie odczyt pliku pobranego przez właściciela fikcyjnego biura TRENERKI.
 * Nie importuje automatycznie niczego do Supabase ani nie nadpisuje biura.
 * Zwrócony stan wolno zapisać wyłącznie do NOWEGO biura na tym samym koncie.
 */
const MAX_BACKUP_TEXT=1000000;
const isRecord=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const idFormat=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BASE_KEYS=['invoices','bank','journals','matches'];
const MAX_LENGTHS={invoices:1000,bank:5000,journals:10000,matches:10000};

export function inspectWorkspaceBackup(text,accountId){
 if(typeof text!=='string'||text.length<20||text.length>MAX_BACKUP_TEXT)
  throw new Error('Plik kopii jest pusty albo przekracza limit 1 MB.');
 if(typeof accountId!=='string'||!idFormat.test(accountId))
  throw new Error('Zaloguj się na konto właściciela kopii.');
 let parsed;
 try{parsed=JSON.parse(text);}catch{throw new Error('Niepoprawny plik JSON. Nic nie zapisano.');}
 if(!isRecord(parsed)||parsed.format!=='trenerki-lab-backup-v1'||!isRecord(parsed.workspace))
  throw new Error('To nie jest pełna kopia biura TRENERKI v1.');
 const w=parsed.workspace;
 if(!idFormat.test(w.id||'')||!idFormat.test(w.user_id||'')||w.user_id!==accountId)
  throw new Error('Kopia pochodzi z innego konta lub nie zawiera poprawnego właściciela.');
 if(typeof w.name!=='string'||w.name.trim().length<2||w.name.length>100)
  throw new Error('Kopia nie zawiera poprawnej nazwy biura.');
 if(!Number.isSafeInteger(w.version)||w.version<1)
  throw new Error('Kopia ma niepoprawną wersję zapisu.');
 if(!isRecord(w.state)||w.state.schema_version!==1)
  throw new Error('Kopia ma nieobsługiwany format danych biura.');
 for(const k of BASE_KEYS)if(!Array.isArray(w.state[k])||w.state[k].length>MAX_LENGTHS[k])
  throw new Error('Brak poprawnej listy '+k+' w kopii.');

 // JSON może zawierać własne klucze __proto__/constructor/prototype. Nie
 // przekazujemy takiego obiektu do dalszych pomocników lub zapisu w bazie.
 let objects=0;
 function validateTree(v,depth){
  if(depth>28||++objects>100000)throw new Error('Nieobsługiwana struktura kopii.');
  if(v===null||typeof v!=='object')return;
  for(const [key,value] of Object.entries(v)){
   if(['__proto__','prototype','constructor'].includes(key))
    throw new Error('Kopia zawiera niedozwolone pole.');
   validateTree(value,depth+1);
  }
 }
 validateTree(w.state,0);
 const original=w.name.trim();
 const suffix=' (odzyskane)';
 const copyName=original.slice(0,100-suffix.length)+suffix;
 return {
  source_workspace_id:w.id,source_version:w.version,
  imported_name:copyName,original_name:original,owner_id:accountId,
  state:w.state,
  counts:Object.fromEntries(BASE_KEYS.map(k=>[k,w.state[k].length])),
  exported_at:typeof parsed.exported_at==='string'?parsed.exported_at:null
 };
}
