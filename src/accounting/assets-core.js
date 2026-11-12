/** Model edukacyjny, PLN. Parametry amortyzacji i odliczenia są założeniami użytkownika, nie poradą podatkową. */
export const ASSET_ACCOUNTS={'010':'Środki trwałe — wartość początkowa','071':'Umorzenie środków trwałych','401':'Amortyzacja — koszt modelu','761':'Pozostałe koszty — likwidacja w modelu'};
export const ASSET_FIELDS=['id','inventory_no','name','category','invoice_id','in_service_date','start_month','months','residual_cents','deductible_bps','status'];
const fail=m=>{throw new Error(m)};
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max?v:fail('Liczba poza zakresem modelu.');
const roundRatio=(n,d)=>Number((2n*BigInt(n)+BigInt(d))/(2n*BigInt(d)));
export function monthIndex(v){if(typeof v!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(v)||v<'2000-01'||v>'2100-12')fail('Miesiąc wpisz jako RRRR-MM (2000–2100).');return Number(v.slice(0,4))*12+Number(v.slice(5))-1;}
export function monthAt(index){integer(index,24000,25211);return `${Math.floor(index/12)}-${String(index%12+1).padStart(2,'0')}`;}
export function monthEnd(period){monthIndex(period);const [y,m]=period.split('-').map(Number);return `${period}-${String(new Date(Date.UTC(y,m,0)).getUTCDate()).padStart(2,'0')}`;}
export function assetDate(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(v+'T00:00:00Z'))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)fail('Nieprawidłowa data.');monthIndex(v.slice(0,7));return v;}
export const activeJournals=s=>(s.journals||[]).filter(j=>j.status==='posted'&&!j.reversal_of&&!s.journals.some(r=>r.status==='posted'&&r.reversal_of===j.id));
export function assetFacts(a,s){
 const invoice=s.invoices.find(i=>i.id===a.invoice_id&&i.kind==='purchase'&&i.status==='issued');
 if(!invoice)fail('Wybierz zapisany dokument zakupu. Jeden dokument przypisujemy do jednego składnika w tym wariancie.');
 const net=integer(invoice.net_cents,1,1000000000000),tax=integer(invoice.tax_cents,0,1000000000000);
 if(integer(invoice.gross_cents,1,1000000000000)!==net+tax)fail('Kwoty dokumentu nie są zgodne.');
 const deductible=roundRatio(BigInt(tax)*BigInt(integer(a.deductible_bps,0,10000)),10000);
 const cost=net+tax-deductible,residual=integer(a.residual_cents,0,cost-1),months=integer(a.months,1,600);
 if(cost-residual<months)fail('Podstawa amortyzacji musi pozwalać na co najmniej jeden grosz miesięcznie.');
 return {invoice,cost,deductible,tax,net,residual,base:cost-residual,months};
}
export function normalizeAsset(value,s,status=value?.status||'draft'){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!ASSET_FIELDS.includes(k)))fail('Nieprawidłowa karta majątku.');
 const a={...value,status};
 for(const key of ['id','inventory_no','name','category','invoice_id','in_service_date','start_month']){if(typeof a[key]!=='string')fail('Pola karty mają być tekstem.');a[key]=a[key].trim();}
 if(!/^[A-Za-z0-9_/-]{1,100}$/.test(a.id)||a.inventory_no.length>60||a.name.length>160||a.invoice_id.length>100||/[\x00-\x1f\x7f]/.test(a.inventory_no+a.name))fail('Sprawdź identyfikator i długość opisów.');
 if(!['machine','vehicle','tool'].includes(a.category)||!['draft','active'].includes(status))fail('Nieprawidłowy rodzaj lub status karty.');
 assetDate(a.in_service_date);const start=monthIndex(a.start_month);integer(a.months,1,600);monthAt(start+a.months-1);
 if(a.start_month<a.in_service_date.slice(0,7))fail('Odpisy modelu nie mogą zaczynać się przed miesiącem przyjęcia.');
 integer(a.residual_cents,0,1000000000000);integer(a.deductible_bps,0,10000);
 if(![0,5000,10000].includes(a.deductible_bps))fail('Wybierz założenie odliczenia 0%, 50% albo 100%.');
 if(status==='active'){
  if(a.name.length<2||a.inventory_no.length<2)fail('Uzupełnij nazwę i numer inwentarzowy.');
  const f=assetFacts(a,s);if(a.in_service_date<(f.invoice.supply_date||f.invoice.date))fail('W tym wariancie przyjęcie następuje nie wcześniej niż nabycie wskazane w dokumencie.');
 }
 return a;
}
export function schedule(a,s){const f=assetFacts(a,s),first=monthIndex(a.start_month);return Array.from({length:f.months},(_,index)=>{
 const accumulated=roundRatio(BigInt(f.base)*BigInt(index+1),f.months),before=roundRatio(BigInt(f.base)*BigInt(index),f.months);
 const period=monthAt(first+index);return {period,date:monthEnd(period),amount_cents:accumulated-before,accumulated_cents:accumulated,carrying_cents:f.cost-accumulated};
});}
export function acquisitionLines(a,s){const f=assetFacts(a,s);return [{account:'010',debit:f.cost,credit:0},...(f.deductible?[{account:'221',debit:f.deductible,credit:0}]:[]),{account:'202',debit:0,credit:f.invoice.gross_cents}];}
export function assetPosition(a,s){const f=assetFacts(a,s),live=activeJournals(s).filter(j=>j.asset_id===a.id),acquisition=live.find(j=>j.asset_action==='acquire'),depreciations=live.filter(j=>j.asset_action==='depreciation').sort((a,b)=>a.asset_period.localeCompare(b.asset_period)),disposal=live.find(j=>j.asset_action==='dispose'),accumulated=depreciations.reduce((n,j)=>n+j.lines.filter(l=>l.account==='071').reduce((t,l)=>t+l.credit-l.debit,0),0);
 return {...f,acquisition,depreciations,disposal,accumulated,carrying:disposal?0:acquisition?f.cost-accumulated:0};}
function linesEqual(a,b){return JSON.stringify(a.map(l=>[l.account,l.debit,l.credit]))===JSON.stringify(b.map(l=>[l.account,l.debit,l.credit]));}
export function validateAssets(s,previous=null){
 const assets=s.assets||[];if(!Array.isArray(assets)||assets.length>200)fail('Maksymalnie 200 kart majątku w biurze.');
 if(new Set(assets.map(a=>a.id)).size!==assets.length)fail('Powtórzony identyfikator majątku.');
 if(new Set(assets.filter(a=>a.inventory_no).map(a=>a.inventory_no.toLocaleLowerCase('pl'))).size!==assets.filter(a=>a.inventory_no).length)fail('Powtórzony numer inwentarzowy.');
 if(previous?.assets?.length&&!s.assets)fail('Nie usuwaj kart majątku zapisem ze starego okna.');
 for(const old of previous?.assets||[])if(old.status==='active'&&!assets.some(a=>JSON.stringify(a)===JSON.stringify(old)))fail('Przyjęta karta jest historyczna. Najpierw wykonaj odrębne storno; nie nadpisuj karty.');
 for(const a of assets){normalizeAsset(a,s);const tagged=s.journals.filter(j=>j.asset_id===a.id&&!j.reversal_of);const live=activeJournals(s).filter(j=>j.asset_id===a.id);
  if(a.status==='draft'&&tagged.some(j=>j.status==='posted'))fail('Szkic karty nie może mieć zatwierdzonych księgowań.');
  if(a.status!=='active')continue;
  const f=assetFacts(a,s),plan=schedule(a,s);let acq=0,disp=0;
  for(const j of tagged){if(!['acquire','depreciation','dispose'].includes(j.asset_action))fail('Nieznane zdarzenie majątku.');if(j.status!=='posted')continue;
   if(j.asset_action==='acquire'){
    if(j.source_type!=='invoice'||j.source_id!==a.invoice_id||j.date!==a.in_service_date||!linesEqual(j.lines,acquisitionLines(a,s)))fail('Przyjęcie nie zgadza się z kartą i dokumentem zakupu.');
   }else if(j.asset_action==='depreciation'){
    const p=plan.find(p=>p.period===j.asset_period);if(!p||j.source_type!=='manual'||j.date!==p.date||!linesEqual(j.lines,[{account:'401',debit:p.amount_cents,credit:0},{account:'071',debit:0,credit:p.amount_cents}]))fail('Odpis nie zgadza się z harmonogramem i okresem.');
   }
  }
  const pos=assetPosition(a,s);acq=live.filter(j=>j.asset_action==='acquire').length;disp=live.filter(j=>j.asset_action==='dispose').length;
  if(acq>1||disp>1)fail('Zdublowane zdarzenie majątku.');
  if(!previous?.assets?.some(x=>x.id===a.id&&x.status==='active')&&acq!==1)fail('Przyjęcie wymaga jednoczesnego zapisu dokumentu i księgowania.');
  if(!acq&&(pos.depreciations.length||disp))fail('Przed stornem przyjęcia cofnij późniejsze operacje majątku.');
  pos.depreciations.forEach((j,n)=>{if(j.asset_period!==plan[n]?.period)fail('Odpisy wykonuj kolejno, bez duplikatów i luk.');});
  if(pos.disposal){const j=pos.disposal;assetDate(j.date);const priorMonths=Math.min(a.months,Math.max(0,monthIndex(j.date.slice(0,7))-monthIndex(a.start_month)));
   if(j.date<a.in_service_date||pos.depreciations.length<priorMonths||pos.depreciations.some(d=>d.date>j.date))fail('Sprawdź datę likwidacji i wcześniejsze odpisy.');
   const expected=[...(pos.accumulated?[{account:'071',debit:pos.accumulated,credit:0}]:[]),...(f.cost-pos.accumulated?[{account:'761',debit:f.cost-pos.accumulated,credit:0}]:[]),{account:'010',debit:0,credit:f.cost}];
   if(j.source_type!=='manual'||!linesEqual(j.lines,expected))fail('Likwidacja nie wyksięgowuje właściwej wartości i umorzenia.');
  }
 }
 for(const j of s.journals){if(j.reversal_of&&j.asset_id)fail('Storno wskazuje oryginał, bez drugiego oznaczenia majątku.');if(j.asset_id&&!assets.some(a=>a.id===j.asset_id))fail('Księgowanie odwołuje się do nieistniejącej karty.');if(!j.asset_id&&(j.asset_action||j.asset_period))fail('Brak identyfikatora karty dla zdarzenia.');}
 const liveAssets=assets.filter(a=>a.status==='active'&&activeJournals(s).some(j=>j.asset_id===a.id&&j.asset_action==='acquire'));
 if(new Set(liveAssets.map(a=>a.invoice_id)).size!==liveAssets.length)fail('Dokument zakupu ma już aktywną kartę.');
 return s;
}
const journal=(id,a,action,date,lines)=>({id,status:'posted',date,memo:`${action==='acquire'?'Przyjęcie':action==='depreciation'?'Amortyzacja':'Likwidacja'}: ${a.inventory_no}`,source_type:action==='acquire'?'invoice':'manual',source_id:action==='acquire'?a.invoice_id:'',asset_id:a.id,asset_action:action,lines});
export function planAcquisition(s,card,journalId){const a=normalizeAsset(card,s,'active');if(activeJournals(s).some(j=>j.source_type==='invoice'&&j.source_id===a.invoice_id))fail('Zakup ma już księgowanie. Sprawdź je i zastosuj storno, zanim ujmiesz środek trwały.');const j=journal(journalId,a,'acquire',a.in_service_date,acquisitionLines(a,s));const next={...s,assets:[...(s.assets||[]).filter(x=>x.id!==a.id),a],journals:[...s.journals,j]};validateAssets(next,s);return {state:next,journal:j};}
export function planDepreciation(s,id,journalId){const a=s.assets?.find(a=>a.id===id&&a.status==='active');if(!a)fail('Brak przyjętej karty.');const pos=assetPosition(a,s);if(!pos.acquisition||pos.disposal)fail('Nie amortyzujemy przed przyjęciem lub po likwidacji.');const nextPeriod=schedule(a,s)[pos.depreciations.length];if(!nextPeriod)fail('Zakończono harmonogram amortyzacji.');const j={...journal(journalId,a,'depreciation',nextPeriod.date,[{account:'401',debit:nextPeriod.amount_cents,credit:0},{account:'071',debit:0,credit:nextPeriod.amount_cents}]),asset_period:nextPeriod.period};const next={...s,journals:[...s.journals,j]};validateAssets(next,s);return {state:next,journal:j};}
export function planDisposal(s,id,date,journalId){const a=s.assets?.find(a=>a.id===id&&a.status==='active');if(!a)fail('Brak karty.');const p=assetPosition(a,s);if(!p.acquisition||p.disposal)fail('Składnik nie jest aktywny albo został zlikwidowany.');const j=journal(journalId,a,'dispose',assetDate(date),[...(p.accumulated?[{account:'071',debit:p.accumulated,credit:0}]:[]),...(p.cost-p.accumulated?[{account:'761',debit:p.cost-p.accumulated,credit:0}]:[]),{account:'010',debit:0,credit:p.cost}]);const next={...s,journals:[...s.journals,j]};validateAssets(next,s);return {state:next,journal:j};}
export function assetsControl(s){const issues=[];const add=(code,text,id='assets')=>issues.push({code,title:'Kontrola majątku',text,entity:'asset',id,severity:'uwaga'});try{validateAssets(s,s);}catch(e){add('asset_invariant',e.message);}
 const posted=s.journals.filter(j=>j.status==='posted'),sum=account=>posted.flatMap(j=>j.lines).filter(l=>l.account===account).reduce((n,l)=>n+l.debit-l.credit,0);
 let cost=0,acc=0;
 for(const a of s.assets||[]){if(a.status==='draft'){add('asset_draft','Karta jest szkicem. Nie tworzy majątku ani kosztu amortyzacji.',a.id);continue;}try{const p=assetPosition(a,s);if(p.acquisition&&!p.disposal){cost+=p.cost;acc+=p.accumulated;}}catch(e){add('asset_card',e.message,a.id);}}
 if(sum('010')!==cost||sum('071')!==-acc)add('asset_ledger_mismatch','Konta 010/071 nie uzgadniają się z kartoteką. Sprawdź ręczne księgowania i storna; nie wyrównuj różnicy przypadkowym kosztem.');return issues;
}
