import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ScrollView,View,Text,TextInput,Pressable,ActivityIndicator,Platform,Share} from 'react-native';
import {useRouter} from 'expo-router';
import {FunctionsHttpError} from '@supabase/supabase-js';
import {supabase} from '../src/supabase';
import {academyAction} from '../src/academyApi';
import DiplomaRegistry from '../src/DiplomaRegistry';
import ContactEditor from '../src/support/ContactEditor';
import {downloadGiftPdf,saveGiftPdf} from '../src/giftPdf';
import {formatGiftCode} from '../src/giftCode';

const ink='#183b2c',muted='#5b7663',pale='#e9f3dc';
type Student={id:string,email:string,created_at:string,confirmed:boolean,last_sign_in_at?:string|null};
type Course={slug:string,title_pl:string,price_grosze:number};
type Draft={id:string,course_slug:string,recipient_email:string,amount_grosze:number,doc_status:string,created_at:string,sent_at?:string|null};
type Metrics={new_users:number,purchases:number,gifts?:number,revenue_grosze:number,unique_buyers:number};
type PromoCard={id:string;code:string;link:string;amount_grosze:number;transferable:boolean;expires_at:string;status:string};
type PromoBatch={id:string;recipient_email:string;amount_grosze:number;quantity:number;transferable:boolean;created_at:string;recipient_email_sent_at?:string|null;cards:PromoCard[]};
type PromoResult={batch_id:string;recipient_email:string;quantity:number;total_grosze:number;email_sent:boolean;cards:PromoCard[]};
type PromoRequest={id:string;signature:string};
type CourseGift={gift_id?:string;course_slug:string;title_pl:string;code:string;link:string;expires_at?:string};
type SalesAnalytics={
 timezone:string;
 totals:{users:number,purchases:number,gifts?:number,revenue_grosze:number};
 today:Metrics;current_month:Metrics;current_year:Metrics;
 daily:(Metrics&{period:string})[];monthly:(Metrics&{period:string})[];yearly:(Metrics&{period:string})[];
 stripe_configuration?:{secret_key_present:boolean,webhook_secret_present:boolean,resend_configured?:boolean,sales_enabled?:boolean};
 orders:{course_slug:string,amount_grosze:number,purchased_at:string,status:string}[];
};
const money=(grosze:number)=>((Number(grosze)||0)/100).toLocaleString('pl-PL',{style:'currency',currency:'PLN',maximumFractionDigits:2,minimumFractionDigits:2}) .replace(/\u00a0/g,' ');

const formatDate=(s?:string|null)=>s?new Date(s).toLocaleDateString('pl-PL'):'—';
const card={padding:20,borderWidth:1,borderColor:'#e0eadb',backgroundColor:'white',borderRadius:16} as const;
export default function AdminPage(){
 const router=useRouter();
 const [authorized,setAuthorized]=useState(false);
 const [ownerId,setOwnerId]=useState('');
 const [accessState,setAccessState]=useState<'checking'|'denied'|'error'|'granted'>('checking');
 const [accessAttempt,setAccessAttempt]=useState(0);
 useEffect(()=>{
  let mounted=true;
  setAuthorized(false);setAccessState('checking');
  void (async()=>{
   try{
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(!mounted)return;
    if(authError||!user){setAccessState('denied');return;}
    const role=await academyAction('whoami');
    if(!mounted)return;
    if(role?.is_admin===true){setOwnerId(user.id);setAuthorized(true);setAccessState('granted');}
    else setAccessState('denied');
   }catch{if(mounted)setAccessState('error')}
  })();
  return()=>{mounted=false};
 },[accessAttempt]);
 async function logout(){
  await supabase.auth.signOut();
  router.replace('/konto');
 }

 const [busy,setBusy]=useState(true),[working,setWorking]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [analytics,setAnalytics]=useState<SalesAnalytics|null>(null),[analyticsError,setAnalyticsError]=useState(''),[salesInterval,setSalesInterval]=useState<'daily'|'monthly'|'yearly'>('daily');
 const [stats,setStats]=useState<any>(null),[courses,setCourses]=useState<Course[]>([]),[reviews,setReviews]=useState<{course_slug:string,review_status:string}[]>([]),[filter,setFilter]=useState('');
 const [selectedStudent,setSelectedStudent]=useState<Student|null>(null),[selectedCourse,setSelectedCourse]=useState<Course|null>(null);
 const [tab,setTab]=useState<'sales'|'users'|'orders'|'gifts'|'giveaway'|'credit-card'|'discount'|'drafts'|'quality'|'diplomas'|'support'>('giveaway');
 const [giftSearch,setGiftSearch]=useState(''),[giftQty,setGiftQty]=useState<Record<string,number>>({});
 const [giftEmail,setGiftEmail]=useState(''),[giftCompany,setGiftCompany]=useState(false),[giftSent,setGiftSent]=useState(false),[giftCompanyName,setGiftCompanyName]=useState(''),[giftCompanyPanel,setGiftCompanyPanel]=useState('');
 const [giftTransferable,setGiftTransferable]=useState(true),[giftDedication,setGiftDedication]=useState('');
 const [issuedGifts,setIssuedGifts]=useState<CourseGift[]>([]);
 const [giftError,setGiftError]=useState('');
 const [promoEmail,setPromoEmail]=useState(''),[promoAmount,setPromoAmount]=useState('100'),[promoMessage,setPromoMessage]=useState('');
 const [promoQuantity,setPromoQuantity]=useState('1'),[promoTransferable,setPromoTransferable]=useState(true);
 const [promoResult,setPromoResult]=useState<PromoResult|null>(null),[promoError,setPromoError]=useState('');
 const [promoHistory,setPromoHistory]=useState<PromoBatch[]>([]),[promoHistoryBusy,setPromoHistoryBusy]=useState(false),[promoHistoryError,setPromoHistoryError]=useState('');
 const [promoHistoryOpen,setPromoHistoryOpen]=useState(false),[promoOpenBatch,setPromoOpenBatch]=useState('');
 const [promoIssuedSignature,setPromoIssuedSignature]=useState('');
 const promoRequest=useRef<PromoRequest|null>(null),promoLock=useRef(false),promoHistoryLock=useRef(false);
 const promoStorageKey='trenerki-promo-request:'+ownerId;
 const promoPayload={recipient_email:promoEmail.trim().toLowerCase(),amount_grosze:Math.round(Number(promoAmount.trim().replace(',','.'))*100),quantity:Number(promoQuantity),message:promoMessage.trim(),transferable:promoTransferable};
 const promoSignature=JSON.stringify(promoPayload);
 const currentPromoIssued=!!promoResult&&promoIssuedSignature===promoSignature;
 const promoTotal=Number.isSafeInteger(promoPayload.amount_grosze)&&Number.isInteger(promoPayload.quantity)?promoPayload.amount_grosze*promoPayload.quantity:0;
 const promoErrors:Record<string,string>={
  daily_limit:'Ten pakiet przekroczyłby limit 15 000 zł łącznej wartości kart promocyjnych w ciągu 24 godzin. Limit zwalnia się 24 godziny po wystawieniu każdej karty.',
  owner_only:'Karty promocyjne może wystawiać właściciel platformy.',
  confirmed_login_required:'Zaloguj się na konto z potwierdzonym adresem e-mail.',
  invalid_input:'Sprawdź kwotę, liczbę kart i adres e-mail odbiorcy.',
  invalid_quantity:'Wpisz liczbę kart od 1 do 10.',
  invalid_request_id:'Nie udało się rozpoznać pakietu. Odśwież stronę i spróbuj ponownie.',
  request_conflict:'Ten pakiet jest już zapisany z innymi danymi. Sprawdź ostatnio wystawione karty i wybierz „Nowy pakiet”, aby wystawić kolejne.',
  idempotency_conflict:'Ten pakiet jest już zapisany z innymi danymi. Sprawdź ostatnio wystawione karty i wybierz „Nowy pakiet”, aby wystawić kolejne.',
  role_verification_failed:'Nie udało się potwierdzić uprawnień. Spróbuj ponownie.',
  card_not_found:'Nie znaleziono tej karty.',
  batch_not_found:'Nie znaleziono tego pakietu.',
  not_found:'Nie znaleziono karty lub pakietu.',
  pdf_generation_failed:'Nie udało się przygotować PDF. Karta pozostaje ważna. Spróbuj pobrać ją ponownie.',
  pdf_not_ready:'Nie udało się przygotować PDF. Karta pozostaje zapisana. Spróbuj pobrać ją ponownie.',
  card_inactive:'Ta karta została już odebrana, anulowana lub wygasła. Odśwież historię, aby sprawdzić jej status.',
  batch_lookup_failed:'Nie udało się odczytać pakietu. Spróbuj ponownie za chwilę.',
  card_lookup_failed:'Nie udało się odczytać karty. Spróbuj ponownie za chwilę.',
  invalid_cards:'Nie udało się przygotować kodów kart. Odśwież historię i spróbuj ponownie.',
  card_conflict:'Nie udało się zapisać kodów kart. Sprawdź ostatnio wystawione pakiety przed ponowieniem.',
  email_not_configured:'Karty są zapisane, ale wysyłka e-mail jest chwilowo niedostępna. Pobierz pliki PDF z listy kart.',
  resend_too_soon:'Wiadomość jest właśnie wysyłana. Sprawdź status za chwilę.'
 };
 async function promoAction(body:Record<string,unknown>){
  const {data,error}=await supabase.functions.invoke('ta-credit',{body});
  if(error||!data?.ok){
   const response=error instanceof FunctionsHttpError?await error.context.json().catch(()=>null):null;
   throw new Error(promoErrors[response?.error??data?.error]||'Nie udało się wykonać operacji. Sprawdź ostatnio wystawione karty i spróbuj ponownie.');
  }
  return data;
 }
 async function loadPromoHistory(){
  if(!authorized||promoHistoryLock.current)return;
  promoHistoryLock.current=true;setPromoHistoryBusy(true);setPromoHistoryError('');
  try{const data=await promoAction({action:'admin_list_promo'});setPromoHistory(Array.isArray(data.batches)?data.batches.slice(0,10):[]);}
  catch(e:any){setPromoHistoryError(e?.message||'Nie udało się pobrać historii kart.');}
  finally{promoHistoryLock.current=false;setPromoHistoryBusy(false);}
 }
 useEffect(()=>{if(authorized&&tab==='credit-card')void loadPromoHistory();},[authorized,tab]);
 function startNewPromo(){
  if(working||promoLock.current)return;
  promoRequest.current=null;setPromoResult(null);setPromoIssuedSignature('');setPromoError('');setMessage('');
  try{if(Platform.OS==='web')sessionStorage.removeItem(promoStorageKey);}catch{}
 }
 async function issuePromo(){
  if(working||promoLock.current||currentPromoIssued)return;
  promoLock.current=true;setWorking('promo');setPromoError('');setMessage('');
  try{
   if(!/^\d{1,4}([,.]\d{1,2})?$/.test(promoAmount.trim())||promoPayload.amount_grosze<2500||promoPayload.amount_grosze>100000)
    throw new Error('Wpisz kwotę od 25 do 1000 zł (maksymalnie dwa miejsca po przecinku).');
   if(!/^\d{1,2}$/.test(promoQuantity)||!Number.isInteger(promoPayload.quantity)||promoPayload.quantity<1||promoPayload.quantity>10)
    throw new Error('Wpisz liczbę kart od 1 do 10.');
   if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(promoPayload.recipient_email))throw new Error('Podaj poprawny e-mail odbiorcy.');
   if(!ownerId)throw new Error('Odśwież stronę i zaloguj się ponownie.');
   if(!promoRequest.current){
    try{
     const saved=Platform.OS==='web'?JSON.parse(sessionStorage.getItem(promoStorageKey)||'null'):null;
     if(saved&&typeof saved.id==='string'&&typeof saved.signature==='string'&&/^[0-9a-f-]{36}$/i.test(saved.id))promoRequest.current=saved;
    }catch{}
   }
   if(promoRequest.current?.signature!==promoSignature){
    if(typeof globalThis.crypto?.randomUUID!=='function')throw new Error('Otwórz panel w aktualnej przeglądarce, aby bezpiecznie wystawić karty.');
    promoRequest.current={id:globalThis.crypto.randomUUID(),signature:promoSignature};
    try{if(Platform.OS==='web')sessionStorage.setItem(promoStorageKey,JSON.stringify(promoRequest.current));}catch{}
   }
   const data=await promoAction({action:'admin_issue_promo',request_id:promoRequest.current.id,...promoPayload});
   setPromoResult(data as PromoResult);setPromoIssuedSignature(promoSignature);
   setMessage(data.email_sent?'Karty zostały wystawione. Wiadomość z plikami PDF przyjęto do wysyłki.':'Karty zostały wystawione. Pobierz PDF lub ponów wysyłkę tych samych kart poniżej.');
   await loadPromoHistory();
  }catch(e:any){setPromoError(e?.message||'Błąd karty podarunkowej.')}
  finally{promoLock.current=false;setWorking('')}
 }
 async function downloadPromoPdf(item:PromoCard){
  if(working||promoLock.current)return;
  promoLock.current=true;setWorking('pdf:'+item.id);setPromoError('');
  try{
   if(Platform.OS!=='web'||typeof document==='undefined')throw new Error('Pobierz PDF w przeglądarce na trenerki.com/admin.');
   const data=await promoAction({action:'admin_card_pdf',card_id:item.id});
   saveGiftPdf(data);
   setMessage('PDF karty jest gotowy do zapisania i wydruku.');
  }catch(e:any){setPromoError(e?.message||'Nie udało się pobrać PDF.');}
  finally{promoLock.current=false;setWorking('');}
 }
 async function resendPromo(batchId:string){
  if(working||promoLock.current)return;
  promoLock.current=true;setWorking('resend:'+batchId);setPromoError('');
  try{
   const data=await promoAction({action:'admin_resend_promo',batch_id:batchId});
   setPromoResult(old=>old?.batch_id===batchId?{...old,email_sent:!!data.email_sent}:old);
   setMessage(data.email_sent?'Wiadomość z tymi samymi kartami PDF przyjęto do wysyłki.':'Wysyłka e-mail nie została potwierdzona. Pobierz PDF lub spróbuj ponownie za chwilę.');
   await loadPromoHistory();
  }catch(e:any){setPromoError(e?.message||'Nie udało się ponowić wysyłki.');}
  finally{promoLock.current=false;setWorking('');}
 }
 async function sharePromo(item:PromoCard){
  try{
   if(Platform.OS==='web'&&typeof navigator!=='undefined'&&navigator.clipboard?.writeText){await navigator.clipboard.writeText(item.link);setMessage('Skopiowano link do karty.');}
   else await Share.share({message:item.link});
  }catch{setPromoError('Zaznacz i skopiuj kod karty lub spróbuj ponownie.');}
 }
 const promoActive=(item:PromoCard)=>item.status==='issued'&&Date.parse(item.expires_at)>Date.now();
 const promoCardStatus=(item:PromoCard)=>({redeemed:'Odebrana',cancelled:'Anulowana',refund_review:'W trakcie rozliczenia zwrotu',pending:'Oczekuje na wystawienie'}[item.status]||(promoActive(item)?'Ważna do '+formatDate(item.expires_at):'Termin ważności minął'));
 const promoCardRow=(item:PromoCard,index:number)=><View key={item.id} style={{borderWidth:1,borderColor:'#d5e2cd',borderRadius:12,padding:13,backgroundColor:'white',gap:9}}>
  <View style={{flexDirection:'row',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
   <Text style={{color:ink,fontWeight:'900',fontSize:16}}>Karta {index+1} · {money(item.amount_grosze)}</Text>
   <Text style={{color:muted,fontSize:12}}>{promoCardStatus(item)}</Text>
  </View>
  <Text selectable style={{fontFamily:Platform.OS==='web'?'monospace':undefined,color:ink,fontSize:12,lineHeight:19}}>{formatGiftCode(item.code)}</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
   <Pressable accessibilityRole="button" accessibilityLabel={'Pobierz PDF karty '+(index+1)} disabled={!!working||!promoActive(item)} onPress={()=>void downloadPromoPdf(item)} style={{backgroundColor:ink,paddingVertical:11,paddingHorizontal:14,borderRadius:9,opacity:working||!promoActive(item)?.5:1}}>
    <Text style={{color:'white',fontWeight:'800',fontSize:13}}>{working==='pdf:'+item.id?'Przygotowuję PDF…':'Pobierz PDF'}</Text>
   </Pressable>
   <Pressable accessibilityRole="button" disabled={!promoActive(item)} onPress={()=>void sharePromo(item)} style={{backgroundColor:pale,paddingVertical:11,paddingHorizontal:14,borderRadius:9,opacity:promoActive(item)?1:.5}}>
    <Text style={{color:ink,fontWeight:'800',fontSize:13}}>Kopiuj link</Text>
   </Pressable>
  </View>
 </View>;

 const todayPoland=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Warsaw',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const [discountDay,setDiscountDay]=useState(todayPoland),[discountPercent,setDiscountPercent]=useState('10');
 const [discountRows,setDiscountRows]=useState<{day:string;percent:number}[]>([]),[discountError,setDiscountError]=useState('');
 async function loadDiscounts(){
  const {data,error}=await supabase.from('ta_daily_discounts').select('day,percent').gte('day',todayPoland()).order('day',{ascending:true}).limit(45);
  if(error)setDiscountError('Nie udało się odczytać terminarza rabatów.');
  else setDiscountRows(data||[]);
 }
 useEffect(()=>{void loadDiscounts()},[]);
 async function saveDiscount(){
  if(working)return;
  setWorking('discount');setDiscountError('');
  try{
   const percent=Number(discountPercent);
   if(!/^\d{4}-\d{2}-\d{2}$/.test(discountDay)||!Number.isInteger(percent)||percent<0||percent>80)
    throw new Error('Podaj datę RRRR-MM-DD i rabat od 0 do 80%.');
   const {data,error}=await supabase.functions.invoke('ta-admin-gifts',{body:{action:'set_discount',day:discountDay,percent}});
   if(error||!data?.ok)throw new Error('Nie udało się zapisać rabatu. Sprawdź datę i spróbuj ponownie.');
   await loadDiscounts();
   setMessage(percent===0?'Wyłączono rabat na '+discountDay+'.':'Ustawiono rabat '+percent+'% na '+discountDay+'.');
  }catch(e:any){setDiscountError(e?.message||'Błąd zapisu rabatu.')}
  finally{setWorking('')}
 }
 const giftTotal=Object.values(giftQty).reduce((sum,count)=>sum+count,0);
 const selectedGifts=courses.filter(c=>(giftQty[c.slug]||0)>0);
 const giftText=issuedGifts.map((g,i)=>(i+1)+'. '+g.title_pl+'\n'+g.link).join('\n\n');
 function adjustGiftQuantity(slug:string,delta:number){
  setGiftQty(old=>{
   const total=Object.values(old).reduce((sum,v)=>sum+v,0);
   const next=Math.max(0,Math.min(10,(old[slug]||0)+delta));
   if(delta>0&&total>=10)return old;
   return {...old,[slug]:next};
  });
 }
 async function issueAdminGifts(){
  if(!!working||promoLock.current||giftTotal<1||giftTotal>10)return;
  promoLock.current=true;
  setWorking('admin-gifts');setGiftError('');setMessage('');setIssuedGifts([]);setGiftSent(false);setGiftCompanyPanel('');
  try{
   if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(giftEmail.trim()))throw new Error('Wpisz poprawny adres e-mail odbiorcy lub osoby zarządzającej kursami w firmie.');
   const course_slugs=selectedGifts.flatMap(c=>Array(giftQty[c.slug]).fill(c.slug));
   const {data,error}=await supabase.functions.invoke('ta-admin-gifts',{body:{
    action:'issue',course_slugs,destination_email:giftEmail.trim().toLowerCase(),
    bind_to_recipient:!giftCompany&&!giftTransferable,company_mode:giftCompany,company_name:giftCompanyName.trim(),message:giftCompany?'':giftDedication.trim()
   }});
   if(error||!data?.ok){
    let detail='';
    try{detail=(await (error as any)?.context?.json())?.error||data?.error||''}catch{}
    const messages:Record<string,string>={
     admin_only:'Brak uprawnień administratora.',
     choose_1_to_10_courses:'Wybierz od 1 do 10 kursów.',
     unpublished_or_invalid_course:'Jeden z wybranych kursów nie jest dostępny.',
     invalid_recipient_email:'Adres e-mail jest niepoprawny.',
     admin_daily_limit:'Wykorzystano limit dzienny wydawania bezpłatnych prezentów.',
     gift_create_failed:'Nie udało się wydać kodów. Nic nie zapisano.',
     company_grant_failed:'Nie udało się przygotować pakietu firmowego.',
     admin_verification_failed:'Nie udało się potwierdzić uprawnień administratora.',
     gift_rate_check_failed:'Nie udało się sprawdzić limitu prezentów.',
     email_not_configured:'Kursy utworzono, ale wysyłka e-mail nie jest skonfigurowana.'
    };
    throw new Error(messages[detail]||'Nie udało się wygenerować prezentów. Spróbuj ponownie.');
   }
   setIssuedGifts(data.gifts||[]);setGiftSent(!!data.email_sent);setGiftQty({});
   if(data.company_panel===true){
    setGiftCompanyPanel(data.dashboard_url||'https://trenerki.com/firma');
    setMessage(data.email_sent?'Przydzielono kursy firmie i wysłano zaproszenie do jej panelu.':'Pakiet firmowy utworzony. Wyślij opiekunowi firmy link do panelu (wiadomość e-mail nie została potwierdzona).');
   }else{
    setMessage(data.email_sent?'Wiadomość z kartami PDF przyjęto do wysyłki na wskazany e-mail.':'Kody zostały utworzone. Pobierz karty PDF lub skopiuj linki i przekaż je odbiorcy.');
   }
   await refresh();setTab('giveaway');
  }catch(e:any){setGiftError(String(e?.message||'Błąd tworzenia pakietu.'));}
  finally{promoLock.current=false;setWorking('')}
 }
 async function downloadCourseGift(gift:CourseGift){
  if(working||promoLock.current)return;
  promoLock.current=true;setWorking('gift-pdf:'+gift.code);setGiftError('');
  try{await downloadGiftPdf({code:gift.code,gift_id:gift.gift_id});setMessage('Karta kursu PDF jest gotowa do wydruku.');}
  catch(e:any){setGiftError(e?.message||'Nie udało się pobrać karty kursu.');}
  finally{promoLock.current=false;setWorking('');}
 }
 async function shareAdminGifts(){
  if(!giftText)return;
  try{
   if(Platform.OS==='web'&&typeof navigator!=='undefined'&&navigator.clipboard?.writeText){
    await navigator.clipboard.writeText(giftText);setMessage('Skopiowano linki do wszystkich kursów.');return;
   }
   await Share.share({message:giftText});
  }catch{setMessage('Zaznacz i skopiuj linki z listy poniżej.')}
 }
 const students:Student[]=stats?.users||[];
 const filteredStudents=useMemo(()=>students.filter(u=>(u.email||'').toLowerCase().includes(filter.trim().toLowerCase())),[students,filter]);
 useEffect(()=>{if(authorized)void refresh();},[authorized]);
 async function refresh(){
  setBusy(true);setError('');
  try{
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){router.replace('/konto');return;}
   const [r,allCourses,allReviews,sales]=await Promise.all([
    academyAction('admin_dashboard'),
    supabase.from('ta_courses').select('slug,title_pl,price_grosze').eq('published',true).order('title_pl'),
    supabase.from('ta_course_previews').select('course_slug,review_status'),
    supabase.functions.invoke('ta-admin-analytics', {body:{}})
   ]);
   if(allCourses.error||allReviews.error)throw allCourses.error||allReviews.error;
   setCourses(allCourses.data||[]);setReviews(allReviews.data||[]);setStats(r);
   if(sales.error||!sales.data?.ok){setAnalytics(null);setAnalyticsError('Nie można teraz załadować raportu sprzedaży.');}
   else{setAnalytics(sales.data as SalesAnalytics);setAnalyticsError('');}
  }catch(e:any){setError(e?.message||'Panel nie jest dostępny.');}
  finally{setBusy(false)}
 }
 async function makeDraft(){
  if(!selectedStudent||!selectedCourse||working)return;
  setWorking('draft');setMessage('');
  try{
   await academyAction('create_invoice_draft',{user_id:selectedStudent.id,course_slug:selectedCourse.slug});
   setMessage('Utworzono zestawienie testowe dla '+selectedStudent.email+'. To nie jest faktura VAT i nie zawiera wezwania do zapłaty.');
   setSelectedCourse(null);setSelectedStudent(null);await refresh();setTab('drafts');
  }catch(e:any){setMessage(e?.message||'Nie udało się utworzyć dokumentu.');}
  finally{setWorking('')}
 }
 async function sendDraft(id:string){
  setWorking(id);setMessage('');
  try{
   const r=await academyAction('send_invoice_test',{draft_id:id});
   setMessage(r.already_sent?'Ta wiadomość testowa została już wysłana.':'Wysłano dokument testowy. Nie jest to faktura VAT ani żądanie zapłaty.');
   await refresh();setTab('drafts');
  }catch(e:any){setMessage(e?.message||'Nie udało się wysłać wiadomości.');}
  finally{setWorking('')}
 }
 const count=(label:string,val:any)=><View style={{backgroundColor:'white',borderWidth:1,borderColor:'#dce8d7',borderRadius:14,padding:16,minWidth:140,flexGrow:1}}>
  <Text style={{fontSize:13,color:muted,marginBottom:6}}>{label}</Text><Text style={{fontSize:28,color:ink,fontWeight:'900'}}>{val??'—'}</Text>
 </View>;
 if(!authorized)return <View style={{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:'#fcfcf7',padding:25,gap:14}}>
  {accessState==='checking'&&<ActivityIndicator size="large" color={ink}/>}
  <Text style={{color:ink,fontWeight:'900',fontSize:20,textAlign:'center'}}>{accessState==='checking'?'Sprawdzam dostęp Staff…':accessState==='error'?'Nie udało się zweryfikować sesji':'Panel tylko dla właściciela TRENERKI'}</Text>
  {accessState==='error'&&<Pressable accessibilityRole="button" onPress={()=>setAccessAttempt(v=>v+1)} style={{backgroundColor:ink,padding:14,borderRadius:11}}><Text style={{color:'white',fontWeight:'900'}}>Spróbuj ponownie</Text></Pressable>}
  {accessState!=='checking'&&<Pressable accessibilityRole="button" onPress={()=>router.replace('/konto')} style={{backgroundColor:'#e6f1dc',padding:14,borderRadius:11}}><Text style={{color:ink,fontWeight:'800'}}>Otwórz moje konto / zaloguj się</Text></Pressable>}
 </View>;
 return <ScrollView style={{backgroundColor:'#fcfcf7',flex:1}} contentContainerStyle={{padding:22,paddingBottom:80}}>
  <View style={{maxWidth:1050,alignSelf:'center',width:'100%',gap:18}}>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
    <Pressable onPress={()=>router.replace('/')}><Text style={{color:ink,fontWeight:'800'}}>← TRENERKI Academy</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={logout} style={{backgroundColor:'#e4eee0',borderRadius:10,paddingVertical:10,paddingHorizontal:14}}><Text style={{color:ink,fontWeight:'800'}}>Wyloguj się</Text></Pressable>
   </View>
   <Text style={{fontSize:12,fontWeight:'800',color:'#72906d',letterSpacing:1.8}}>ADMINISTRACJA · TRENERKI ACADEMY</Text>
   <Text style={{fontSize:36,color:ink,fontWeight:'900'}}>Panel administratora</Text>
   <Pressable accessibilityRole="button" onPress={()=>setTab('giveaway')} style={{backgroundColor:ink,padding:16,borderRadius:13}}>
    <Text style={{color:'white',fontSize:17,fontWeight:'900',textAlign:'center'}}>🎁 Rozdaj do 10 kursów za darmo</Text>
    <Text style={{color:'#dcefdc',fontSize:12,marginTop:5,textAlign:'center'}}>Wpisz e-mail, zaznacz kursy i wyślij prezent.</Text>
   </Pressable>
   {busy&&<ActivityIndicator/>}
   {!!error&&<Text style={{backgroundColor:'#ffefdf',padding:16,borderRadius:12,color:'#8c462c'}}>{error}</Text>}
   {!!stats&&<>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>
     {count('Użytkownicy',analytics?.totals.users??stats.counts?.users)}
     {count('Kursy',stats.counts?.courses)}
     {count('Aktywne dostępy',stats.counts?.active_or_demo_access)}
     {count('Kupione kursy',analytics?.totals.purchases??'—')}
     {count('Sprzedaż',analytics?money(analytics.totals.revenue_grosze):'—')}
     {count('Sprzedane karty',analytics?.totals.gifts??'—')}
    </View>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:5}}>
     {([['giveaway','🎁 Rozdaj kursy'],['credit-card','Karta na kwotę'],['discount','Rabaty dzienne'],['sales','Sprzedaż Stripe'],['users','Użytkownicy'],['gifts','Prezenty'],['quality','Jakość kursów'],['diplomas','Dyplomy'],['support','Kontakty pomocowe']] as const).map(([key,label])=>
      <Pressable key={key} onPress={()=>setTab(key)} style={{padding:12,borderRadius:11,backgroundColor:tab===key?ink:pale}}>
       <Text style={{fontWeight:'800',color:tab===key?'white':ink}}>{label}</Text>
      </Pressable>
     )}
    </View>
    {tab==='sales'&&<View style={card}>
     <Text style={{fontSize:22,fontWeight:'900',color:ink,marginBottom:12}}>Sprzedaż i rejestracje — Stripe</Text>
     <Text style={{fontSize:13,color:muted,lineHeight:20,marginBottom:15}}>Potwierdzone zakupy (bez symulacji, zwróconych płatności i darmowych zapisów). Okresy według czasu polskiego. Dane aktualizują się po potwierdzeniu Stripe webhook.</Text>
     {!!analyticsError&&<Text style={{color:'#a52626',marginBottom:13}}>{analyticsError}</Text>}
     {!!analytics&&<>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>
       {([['Dzisiaj',analytics.today],['W tym miesiącu',analytics.current_month],['W tym roku',analytics.current_year]] as const).map(([label,period])=>
        <View key={label} style={{backgroundColor:'#f4f7f1',padding:15,borderRadius:12,flexGrow:1,minWidth:180,gap:6}}>
         <Text style={{color:ink,fontWeight:'900',fontSize:17}}>{label}</Text>
         <Text style={{color:muted}}>Nowi użytkownicy: {period.new_users}</Text>
         <Text style={{color:muted}}>Kursy: {period.purchases} · Karty: {period.gifts??0}</Text>
         <Text style={{color:ink,fontWeight:'900'}}>Wpływy: {money(period.revenue_grosze)}</Text>
        </View>)}
      </View>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:18,marginBottom:10}}>
       {([['daily','Ostatnie 30 dni'],['monthly','Ostatnie 12 miesięcy'],['yearly','Ostatnie 5 lat']] as const).map(([key,label])=>
        <Pressable key={key} onPress={()=>setSalesInterval(key)} style={{padding:11,backgroundColor:salesInterval===key?ink:pale,borderRadius:10}}>
         <Text style={{color:salesInterval===key?'#fff':ink,fontWeight:'800'}}>{label}</Text>
        </Pressable>)}
      </View>
      <View style={{flexDirection:'row',paddingVertical:11,borderBottomWidth:2,borderColor:'#d3e2d0',gap:4}}>
       <Text style={{flex:2,fontWeight:'900',color:ink}}>Okres</Text>
       <Text style={{flex:1,fontWeight:'900',color:ink,textAlign:'right'}}>Nowi</Text>
       <Text style={{flex:1,fontWeight:'900',color:ink,textAlign:'right'}}>Kursy / karty</Text>
       <Text style={{flex:2,fontWeight:'900',color:ink,textAlign:'right'}}>PLN</Text>
      </View>
      {[...analytics[salesInterval]].reverse().map(item=>
       <View key={item.period} style={{flexDirection:'row',paddingVertical:10,borderBottomWidth:1,borderColor:'#edf1e9',gap:4}}>
        <Text style={{flex:2,color:ink,fontWeight:'700'}}>{item.period}</Text>
        <Text style={{flex:1,color:muted,textAlign:'right'}}>{item.new_users}</Text>
        <Text style={{flex:1,color:muted,textAlign:'right'}}>{item.purchases} / {item.gifts??0}</Text>
        <Text style={{flex:2,color:ink,textAlign:'right',fontWeight:'700'}}>{money(item.revenue_grosze)}</Text>
       </View>)}
      <Text style={{fontSize:18,fontWeight:'900',color:ink,marginTop:24,marginBottom:11}}>Ostatnie opłacone zamówienia</Text>
      {!analytics.orders.length&&<Text style={{color:muted}}>Nie ma jeszcze potwierdzonych zakupów.</Text>}
      {analytics.orders.slice(0,20).map((order,i)=>
       <View key={order.course_slug+order.purchased_at+String(i)} style={{paddingVertical:11,borderBottomWidth:1,borderColor:'#edf1e9'}}>
        <Text style={{color:ink,fontWeight:'800'}}>{order.course_slug} · {money(order.amount_grosze)}</Text>
        <Text style={{color:muted,fontSize:12}}>{new Date(order.purchased_at).toLocaleString('pl-PL',{timeZone:'Europe/Warsaw'})}</Text>
       </View>)}
      {analytics.stripe_configuration&&<View style={{marginTop:20,padding:17,borderRadius:12,backgroundColor:'#f3f7ef',gap:9}}>
       <Text style={{fontSize:18,fontWeight:'900',color:ink}}>Diagnostyka płatności i kart podarunkowych</Text>
       <Text style={{color:muted,lineHeight:20}}>Te cztery warunki muszą być spełnione, aby działały zakupy i prezenty. Statusy pokazują tylko obecność ustawień — nigdy kluczy.</Text>
       {[
        ['Klucz prywatny Stripe LIVE — obecny w Supabase',analytics.stripe_configuration.secret_key_present],
        ['STRIPE_WEBHOOK_SECRET (potwierdzenie płatności)',analytics.stripe_configuration.webhook_secret_present],
        ['RESEND_API_KEY i RESEND_FROM_EMAIL (potwierdzenia zakupu)',analytics.stripe_configuration.resend_configured],
        ['TA_SALES_ENABLED = true (włączenie sprzedaży)',analytics.stripe_configuration.sales_enabled]
       ].map(([label,ok])=><View key={String(label)} style={{flexDirection:'row',gap:9,paddingVertical:5}}>
        <Text style={{fontWeight:'900',color:ok?'#2e7b46':'#a34725'}}>{ok?'✓':'✕'}</Text>
        <Text style={{color:ink,flex:1}}>{String(label)}</Text>
       </View>)}
       {(!analytics.stripe_configuration.secret_key_present||!analytics.stripe_configuration.webhook_secret_present||!analytics.stripe_configuration.resend_configured||!analytics.stripe_configuration.sales_enabled)&&
        <Text style={{color:'#8d492b',lineHeight:20,fontWeight:'700'}}>Płatności pozostają wyłączone, dopóki wszystkie cztery warunki nie będą spełnione. SMTP resetu hasła to oddzielna konfiguracja od API Resend.</Text>}
      </View>}
     </>}
    </View>}
    {tab==='users'&&<View style={card}>
     <Text style={{fontSize:22,fontWeight:'900',color:ink,marginBottom:10}}>Lista kont</Text>
     <TextInput placeholder="Szukaj po e-mailu" value={filter} onChangeText={setFilter} style={{borderWidth:1,borderColor:'#d5e3d1',borderRadius:10,padding:13,color:ink,marginBottom:15}}/>
     {filteredStudents.map(u=><View key={u.id} style={{paddingVertical:13,borderBottomWidth:1,borderColor:'#e9f0e7',gap:5}}>
       <Text style={{fontWeight:'800',color:ink}}>{u.email||'Brak adresu e-mail'}</Text>
       <Text style={{fontSize:12,color:muted}}>Rejestracja: {formatDate(u.created_at)} · {u.confirmed?'E-mail potwierdzony':'E-mail niepotwierdzony'} · Ostatnie logowanie: {formatDate(u.last_sign_in_at)}</Text>
       <Pressable onPress={()=>{setSelectedStudent(u);setTab('drafts');}} style={{alignSelf:'flex-start',backgroundColor:pale,padding:11,borderRadius:9}}>
        <Text style={{fontWeight:'800',color:ink}}>Przygotuj dokument testowy →</Text>
       </Pressable>
      </View>)}
     {!filteredStudents.length&&<Text style={{color:muted}}>Brak pasujących kont.</Text>}
    </View>}
    {tab==='orders'&&<View style={card}>
     <Text style={{fontSize:22,fontWeight:'900',color:ink,marginBottom:12}}>Próbne zamówienia</Text>
     <Text style={{fontSize:13,color:muted,marginBottom:12}}>Lista symulacji administratora. Każdy rekord ma faktycznie zapłacone 0 zł.</Text>
     {(stats.orders||[]).map((o:any)=><View key={o.id} style={{paddingVertical:13,borderBottomWidth:1,borderColor:'#e8ece4'}}>
      <Text style={{fontWeight:'800',color:ink}}>{o.course_slug}</Text>
      <Text style={{color:muted}}>Cena katalogowa {(o.list_price_grosze/100).toFixed(2)} zł · Zapłacono {o.actual_paid_grosze/100} zł</Text>
      <Text style={{color:muted,fontSize:12}}>{formatDate(o.created_at)} · DEMO</Text>
     </View>)}
     {!(stats.orders||[]).length&&<Text style={{color:muted}}>Nie ma jeszcze testowych zamówień.</Text>}
    </View>}
    {tab==='gifts'&&<View style={card}>
     <Text style={{fontSize:22,fontWeight:'900',color:ink,marginBottom:12}}>Karty podarunkowe</Text>
     {(stats.gifts||[]).map((g:any)=><View key={g.id} style={{paddingVertical:13,borderBottomWidth:1,borderColor:'#e8ece4'}}>
      <Text style={{fontWeight:'800',color:ink}}>{g.course_slug} · {g.mode==='stripe'?'STRIPE':g.mode==='demo'?'DEMO':'GRATIS'}</Text>
      <Text style={{color:muted}}>{g.status==='pending'?'Oczekuje na płatność':g.status==='redeemed'?'Wykorzystany':g.status==='issued'?'Do wykorzystania':'Anulowany'} · {g.recipient_email||'Bez przypisanego e-maila'}</Text>
      <Text style={{color:muted,fontSize:12}}>Wystawiono {formatDate(g.created_at)}</Text>
     </View>)}
     {!(stats.gifts||[]).length&&<Text style={{color:muted}}>Brak kart podarunkowych.</Text>}
     <Pressable onPress={()=>{setTab('giveaway');setGiftSearch('Mikołaj')}} style={{marginTop:16,backgroundColor:pale,padding:15,borderRadius:11}}>
      <Text style={{fontWeight:'800',color:ink,textAlign:'center'}}>🎁 Rozdaj kurs Świętego Mikołaja za darmo</Text>
     </Pressable>
    </View>}

    {tab==='discount'&&<View style={card}>
     <Text style={{fontSize:23,fontWeight:'900',color:ink,marginBottom:8}}>Rabaty na kursy TRENERKI</Text>
     <Text style={{fontSize:13,color:muted,lineHeight:21,marginBottom:15}}>Wybierz konkretny dzień i procent rabatu dla wszystkich płatnych kursów. Cena zmieni się automatycznie o północy czasu polskiego, także przy zakupie w Stripe. Rabat nie obejmuje kart podarunkowych na kwotę, żeby nie można było kupić salda poniżej jego wartości.</Text>
     <Text style={{color:ink,fontSize:13,fontWeight:'800'}}>Dzień promocji (RRRR-MM-DD)</Text>
     <TextInput accessibilityLabel="Dzień rabatu w Polsce" value={discountDay} onChangeText={setDiscountDay} placeholder="2026-11-10" autoCapitalize="none"
      style={{marginVertical:8,padding:13,borderWidth:1,borderColor:'#ccdcca',borderRadius:10,fontSize:15,color:ink}}/>
     <Text style={{color:ink,fontSize:13,fontWeight:'800',marginTop:8}}>Rabat (0–80%)</Text>
     <TextInput accessibilityLabel="Procent rabatu" value={discountPercent} onChangeText={setDiscountPercent} keyboardType="number-pad" placeholder="10"
      style={{marginVertical:8,padding:13,borderWidth:1,borderColor:'#ccdcca',borderRadius:10,fontSize:15,color:ink}}/>
     <View style={{flexDirection:'row',gap:8,flexWrap:'wrap',marginVertical:7}}>
      {[0,10,15,20,30,50].map(n=><Pressable key={n} onPress={()=>setDiscountPercent(String(n))} style={{padding:11,borderRadius:10,backgroundColor:discountPercent===String(n)?ink:pale}}>
       <Text style={{fontWeight:'800',color:discountPercent===String(n)?'white':ink}}>{n===0?'Bez rabatu':n+'%'}</Text>
      </Pressable>)}
     </View>
     <Pressable accessibilityRole="button" onPress={saveDiscount} disabled={!!working} style={{padding:15,backgroundColor:ink,borderRadius:11,opacity:!!working?.5:1,marginTop:8}}>
      <Text style={{color:'white',textAlign:'center',fontWeight:'900'}}>{working==='discount'?'Zapisuję…':'Zapisz rabat na wybrany dzień'}</Text>
     </Pressable>
     {!!discountError&&<Text style={{color:'#a52626',marginTop:9}}>{discountError}</Text>}
     <Text style={{color:ink,fontSize:16,fontWeight:'900',marginTop:22,marginBottom:9}}>Zaplanowane rabaty</Text>
     {!discountRows.length&&<Text style={{color:muted}}>Brak zaplanowanych rabatów.</Text>}
     {discountRows.map(d=><Pressable key={d.day} onPress={()=>{setDiscountDay(d.day);setDiscountPercent(String(d.percent));}} style={{padding:12,borderTopWidth:1,borderColor:'#e5eddf',flexDirection:'row',justifyContent:'space-between'}}>
      <Text style={{color:ink,fontSize:13,fontWeight:'700'}}>{d.day}</Text>
      <Text style={{color:d.percent>0?'#266b40':muted,fontWeight:'900'}}>{d.percent>0?'-'+d.percent+'%':'Brak rabatu'}</Text>
     </Pressable>)}
    </View>}
    {tab==='credit-card'&&<View style={card}>
     <Text style={{fontSize:23,fontWeight:'900',color:ink,marginBottom:8}}>Karty podarunkowe do wydruku</Text>
     <Text style={{fontSize:14,color:muted,lineHeight:22,marginBottom:16}}>Odbiorca dostanie jeden e-mail z osobnym plikiem PDF dla każdej karty. Na karcie znajdą się kwota, jednorazowy kod, dedykacja i termin ważności.</Text>
     <View style={{flexDirection:'row',flexWrap:'wrap',gap:9,marginBottom:10}}>
      {([[true,'Do przekazania dalej'],[false,'Dla wskazanej osoby']] as const).map(([transferable,label])=><Pressable key={label} accessibilityRole="radio" accessibilityState={{checked:promoTransferable===transferable}} aria-checked={promoTransferable===transferable} disabled={!!working} onPress={()=>setPromoTransferable(transferable)} style={{flexGrow:1,backgroundColor:promoTransferable===transferable?ink:pale,padding:13,borderRadius:11}}>
       <Text style={{fontSize:13,fontWeight:'900',color:promoTransferable===transferable?'white':ink,textAlign:'center'}}>{label}</Text>
      </Pressable>)}
     </View>
     <Text style={{fontSize:13,color:muted,lineHeight:21,marginBottom:17}}>{promoTransferable?'Dla fundacji, firmy lub na prezent. Odbiorca e-maila może wydrukować karty i przekazać je różnym osobom. Każdy kod odbierze jedna osoba na swoim potwierdzonym koncie.':'Karty odbierze wyłącznie osoba zalogowana na konto z podanym niżej adresem e-mail.'}</Text>
     <Text style={{fontSize:13,color:ink,fontWeight:'800'}}>Wartość jednej karty (zł)</Text>
     <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:8,marginBottom:3}}>
      {[50,100,200,500].map(x=><Pressable key={x} disabled={!!working} onPress={()=>setPromoAmount(String(x))} style={{padding:11,backgroundColor:promoAmount===String(x)?ink:pale,borderRadius:10}}>
       <Text style={{color:promoAmount===String(x)?'white':ink,fontWeight:'800'}}>{x} zł</Text>
      </Pressable>)}
     </View>
     <TextInput accessibilityLabel="Wartość jednej karty w złotych" editable={!working} value={promoAmount} onChangeText={setPromoAmount} keyboardType="decimal-pad" placeholder="100" style={{padding:13,borderWidth:1,borderColor:'#cbdcc5',borderRadius:11,marginVertical:8,fontSize:15,color:ink}}/>
     <Text style={{fontSize:13,color:ink,fontWeight:'800',marginTop:4}}>Liczba kart (1–10)</Text>
     <View style={{flexDirection:'row',gap:8,marginVertical:8,alignItems:'center'}}>
      <Pressable accessibilityRole="button" accessibilityLabel="Zmniejsz liczbę kart" disabled={!!working||Number(promoQuantity)<=1} onPress={()=>setPromoQuantity(String(Math.max(1,(Number(promoQuantity)||1)-1)))} style={{backgroundColor:pale,padding:14,borderRadius:10,opacity:working||Number(promoQuantity)<=1?.5:1}}><Text style={{color:ink,fontWeight:'900',fontSize:17}}>−</Text></Pressable>
      <TextInput accessibilityLabel="Liczba kart" editable={!working} value={promoQuantity} onChangeText={setPromoQuantity} keyboardType="number-pad" maxLength={2} style={{width:70,padding:13,borderWidth:1,borderColor:'#cbdcc5',borderRadius:11,fontSize:16,textAlign:'center',color:ink}}/>
      <Pressable accessibilityRole="button" accessibilityLabel="Zwiększ liczbę kart" disabled={!!working||Number(promoQuantity)>=10} onPress={()=>setPromoQuantity(String(Math.min(10,(Number(promoQuantity)||0)+1)))} style={{backgroundColor:pale,padding:14,borderRadius:10,opacity:working||Number(promoQuantity)>=10?.5:1}}><Text style={{color:ink,fontWeight:'900',fontSize:17}}>+</Text></Pressable>
      <Text style={{color:muted,fontSize:12,flex:1,lineHeight:18}}>Osobny kod i PDF dla każdej osoby.</Text>
     </View>
     <View style={{backgroundColor:'#f2f7ec',padding:14,borderRadius:11,marginBottom:17,gap:5}}>
      <Text style={{color:ink,fontSize:17,fontWeight:'900'}}>Łączna wartość: {money(promoTotal)}</Text>
      <Text style={{color:muted,fontSize:12,lineHeight:19}}>{Number.isInteger(promoPayload.quantity)&&promoPayload.quantity>=1&&promoPayload.quantity<=10?promoPayload.quantity:'—'} × {money(promoPayload.amount_grosze)} · 25–1 000 zł na kartę · limit 15 000 zł / 24 h</Text>
     </View>
     <Text style={{fontSize:13,color:ink,fontWeight:'800'}}>{promoTransferable?'E-mail do wysyłki karty':'E-mail obdarowanej osoby'}</Text>
     <TextInput accessibilityLabel={promoTransferable?'E-mail do wysyłki kart PDF':'E-mail obdarowanej osoby'} editable={!working} value={promoEmail} onChangeText={setPromoEmail} keyboardType="email-address" autoCapitalize="none" placeholder="odbiorca@example.com" style={{padding:13,borderWidth:1,borderColor:'#cbdcc5',borderRadius:11,marginVertical:8,fontSize:15,color:ink}}/>
     {promoTransferable&&<Text style={{color:muted,fontSize:12,lineHeight:19,marginBottom:4}}>Adres służy do wysyłki plików PDF. Osoba korzystająca z karty może mieć inne konto i inny e-mail.</Text>}
     <TextInput accessibilityLabel="Dedykacja na kartach" editable={!working} value={promoMessage} onChangeText={setPromoMessage} multiline maxLength={300} placeholder="Dedykacja na każdej karcie (opcjonalnie)" style={{padding:13,borderWidth:1,borderColor:'#cbdcc5',borderRadius:11,minHeight:84,marginVertical:9,fontSize:15,color:ink,textAlignVertical:'top'}}/>
     <Pressable accessibilityRole="button" disabled={!!working||currentPromoIssued} onPress={issuePromo} style={{backgroundColor:ink,borderRadius:12,padding:16,opacity:working||currentPromoIssued?.5:1}}>
      <Text style={{color:'white',textAlign:'center',fontWeight:'900'}}>{working==='promo'?'Tworzę karty i pliki PDF…':currentPromoIssued?'Ten pakiet jest już wystawiony':'Wystaw i wyślij karty PDF'}</Text>
     </Pressable>
     <Text style={{fontSize:12,color:muted,lineHeight:19,marginTop:9}}>Karty promocyjne są bezpłatne dla odbiorcy. Ich wartość nie jest liczona jako sprzedaż Stripe. Po odebraniu kodu niewykorzystane saldo pozostaje na koncie.</Text>
     {!!promoError&&<Text accessibilityRole="alert" style={{color:'#a52626',paddingVertical:11}}>{promoError}</Text>}
     {!!promoResult&&<View style={{backgroundColor:'#edf7e8',padding:15,borderRadius:12,marginTop:17,gap:11}}>
      <Text style={{fontWeight:'900',fontSize:19,color:ink}}>{promoResult.quantity===1?'Karta gotowa':'Karty gotowe'} · {money(promoResult.total_grosze)}</Text>
      <Text style={{fontSize:13,color:muted,lineHeight:21}}>{promoResult.email_sent?'Wiadomość z PDF-ami przyjęto do wysyłki na '+promoResult.recipient_email+'.':'Karty są zapisane. Wysyłka na '+promoResult.recipient_email+' nie została potwierdzona. Pobierz PDF lub ponów wysyłkę tych samych kart.'}</Text>
      {(promoResult.cards||[]).map(promoCardRow)}
      {!promoResult.email_sent&&<Pressable accessibilityRole="button" disabled={!!working} onPress={()=>void resendPromo(promoResult.batch_id)} style={{backgroundColor:ink,padding:13,borderRadius:10,opacity:working?.5:1}}>
       <Text style={{color:'white',fontWeight:'800',textAlign:'center'}}>{working==='resend:'+promoResult.batch_id?'Wysyłam…':'Ponów wysyłkę tych samych kart'}</Text>
      </Pressable>}
      <Pressable accessibilityRole="button" disabled={!!working} onPress={startNewPromo} style={{padding:10,alignSelf:'flex-start'}}><Text style={{color:ink,fontWeight:'800'}}>Nowy pakiet →</Text></Pressable>
     </View>}
     {!promoResult&&<Pressable accessibilityRole="button" disabled={!!working} onPress={startNewPromo} style={{paddingVertical:11,alignSelf:'flex-start'}}><Text style={{color:muted,fontSize:12,textDecorationLine:'underline'}}>Nowy pakiet — nowe kody</Text></Pressable>}
     <View style={{marginTop:22,borderTopWidth:1,borderColor:'#e1e9db',paddingTop:15,gap:10}}>
      <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10,flexWrap:'wrap'}}>
       <Pressable accessibilityRole="button" accessibilityState={{expanded:promoHistoryOpen}} onPress={()=>setPromoHistoryOpen(v=>!v)}><Text style={{fontSize:14,color:ink,fontWeight:'800'}}>Ostatnio wystawione pakiety {promoHistoryOpen?'↑':'↓'}</Text></Pressable>
       <Pressable accessibilityRole="button" disabled={promoHistoryBusy} onPress={()=>void loadPromoHistory()} style={{padding:7}}><Text style={{color:muted,fontSize:12,fontWeight:'800'}}>{promoHistoryBusy?'Wczytuję…':'Odśwież historię'}</Text></Pressable>
      </View>
      {!!promoHistoryError&&<Text accessibilityRole="alert" style={{fontSize:12,color:'#a52626'}}>{promoHistoryError}</Text>}
      {promoHistoryOpen&&!promoHistoryBusy&&!promoHistory.length&&!promoHistoryError&&<Text style={{fontSize:13,color:muted}}>Nie ma jeszcze wystawionych pakietów.</Text>}
      {promoHistoryOpen&&promoHistory.map(batch=><View key={batch.id} style={{borderWidth:1,borderColor:'#e1e9db',borderRadius:11,padding:13,gap:10}}>
       <Pressable accessibilityRole="button" accessibilityState={{expanded:promoOpenBatch===batch.id}} onPress={()=>setPromoOpenBatch(v=>v===batch.id?'':batch.id)} style={{gap:5}}>
        <Text style={{fontSize:13,color:ink,fontWeight:'800'}}>{batch.quantity} × {money(batch.amount_grosze)} · {formatDate(batch.created_at)}</Text>
        <Text style={{fontSize:12,color:muted}}>{batch.recipient_email}</Text>
        <Text style={{fontSize:12,color:muted}}>{batch.transferable?'Do przekazania dalej':'Dla wskazanego e-maila'} · {batch.recipient_email_sent_at?'E-mail wysłany':'E-mail niepotwierdzony'} · {promoOpenBatch===batch.id?'Zwiń ↑':'Pokaż karty ↓'}</Text>
       </Pressable>
       {promoOpenBatch===batch.id&&<>
        {(batch.cards||[]).map(promoCardRow)}
        {!batch.recipient_email_sent_at&&<Pressable accessibilityRole="button" disabled={!!working} onPress={()=>void resendPromo(batch.id)} style={{backgroundColor:pale,padding:12,borderRadius:9,opacity:working?.5:1}}><Text style={{color:ink,fontWeight:'800',fontSize:13}}>{working==='resend:'+batch.id?'Wysyłam…':'Ponów e-mail z tymi kartami'}</Text></Pressable>}
       </>}
      </View>)}
     </View>
    </View>}
    {tab==='giveaway'&&<View style={card}>
     <Text style={{fontSize:23,fontWeight:'900',color:ink,marginBottom:8}}>Podaruj kursy za darmo</Text>
     <Text style={{fontSize:13,color:muted,lineHeight:21,marginBottom:15}}>Wybierz do 10 kursów i podaruj je bezpłatnie. Każdy kurs otrzyma własną kartę PDF z nazwą i jednorazowym kodem, ważnym przez trzy lata. Dostęp do nauki trwa 12 miesięcy od odbioru.</Text>
     <View style={{flexDirection:'row',flexWrap:'wrap',gap:9,marginBottom:15}}>
      <Pressable accessibilityRole="button" disabled={!!working} onPress={()=>{setGiftCompany(false);setGiftTransferable(true);setIssuedGifts([])}} style={{backgroundColor:giftTransferable?ink:pale,padding:12,borderRadius:10}}>
       <Text style={{fontSize:13,fontWeight:'900',color:giftTransferable?'white':ink}}>Do przekazania dalej / fundacji</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={!!working} onPress={()=>{setGiftCompany(false);setGiftTransferable(false);setIssuedGifts([])}} style={{backgroundColor:!giftCompany&&!giftTransferable?ink:pale,padding:12,borderRadius:10}}>
       <Text style={{fontSize:13,fontWeight:'900',color:!giftCompany&&!giftTransferable?'white':ink}}>Dla jednej osoby</Text>
      </Pressable>
      <Pressable accessibilityRole="button" disabled={!!working} onPress={()=>{setGiftCompany(true);setGiftTransferable(false);setIssuedGifts([])}} style={{backgroundColor:giftCompany?ink:pale,padding:12,borderRadius:10}}>
       <Text style={{fontSize:13,fontWeight:'900',color:giftCompany?'white':ink}}>Pakiet dla firmy / pracowników</Text>
      </Pressable>
     </View>
     <Text style={{color:ink,fontSize:13,fontWeight:'800'}}>{giftCompany?'E-mail opiekuna firmy':giftTransferable?'E-mail do wysyłki karty':'E-mail obdarowanej osoby'}</Text>
     <TextInput accessibilityLabel={giftCompany?'E-mail opiekuna firmy':giftTransferable?'E-mail do wysyłki kart kursów':'E-mail obdarowanej osoby'} editable={!working} placeholder={giftCompany?'np. szkolenia@firma.pl':'np. odbiorca@example.com'} value={giftEmail} onChangeText={setGiftEmail}
      autoCapitalize="none" keyboardType="email-address" style={{padding:13,borderWidth:1,borderColor:'#cbdcc5',borderRadius:11,backgroundColor:'white',color:ink,fontSize:15,marginTop:7,marginBottom:7}}/>
     <Text style={{color:muted,fontSize:12,lineHeight:19,marginBottom:14}}>{giftCompany?'Firma otrzyma prywatny panel, w którym przydzieli kursy na adresy pracowników. Po przydziale kartę PDF można pobrać w panelu firmy.':giftTransferable?'Fundacja otrzyma oddzielne karty PDF. Może je wydrukować i przekazać innym osobom. Każdy kod może odebrać jedna osoba na swoim potwierdzonym koncie.':'Kody będą przypisane do adresu odbiorcy. Otrzyma on karty PDF z nazwami wybranych kursów.'}</Text>
     {giftTransferable&&<Text style={{color:muted,fontSize:12,lineHeight:19,marginBottom:14}}>Podany e-mail służy do wysyłki plików PDF. Obdarowana osoba może odebrać kurs na koncie z innym adresem e-mail.</Text>}
     {!giftCompany&&<TextInput accessibilityLabel="Dedykacja na kartach kursów" editable={!working} value={giftDedication} onChangeText={setGiftDedication} multiline maxLength={300} placeholder="Dedykacja na kartach kursów (opcjonalnie)" style={{padding:13,borderWidth:1,borderColor:'#cbdcc5',borderRadius:11,minHeight:76,marginBottom:14,fontSize:14,color:ink,textAlignVertical:'top'}}/>}
     {giftCompany&&<View style={{gap:7,marginBottom:14}}>
      <Text style={{color:ink,fontSize:13,fontWeight:'800'}}>Nazwa firmy (opcjonalnie)</Text>
      <TextInput placeholder="Np. Firma ABC" value={giftCompanyName} onChangeText={setGiftCompanyName}
       style={{padding:13,borderWidth:1,borderColor:'#cbdcc5',borderRadius:11,fontSize:15,backgroundColor:'white',color:ink}}/>
     </View>}
     <Text style={{color:ink,fontSize:16,fontWeight:'900',marginBottom:9}}>Wybierz kursy ({giftTotal}/10 kodów)</Text>
     {!!selectedGifts.length&&<View style={{gap:5,marginBottom:13,backgroundColor:'#f3f8f0',padding:12,borderRadius:10}}>
      {selectedGifts.map(c=><Text key={c.slug} style={{fontSize:12,color:ink}}>{giftQty[c.slug]} × {c.title_pl}</Text>)}
     </View>}
     <TextInput placeholder="Znajdź kurs po nazwie…" value={giftSearch} onChangeText={setGiftSearch}
      style={{padding:12,borderWidth:1,borderColor:'#d5e3d1',borderRadius:10,color:ink,marginBottom:10}}/>
     <View style={{gap:6}}>
      {courses.filter(c=>c.title_pl.toLocaleLowerCase('pl').includes(giftSearch.toLocaleLowerCase('pl').trim())).slice(0,giftSearch.trim()?80:25).map(c=><View key={c.slug} style={{borderBottomWidth:1,borderColor:'#edf1e9',paddingVertical:9,flexDirection:'row',gap:8,alignItems:'center'}}>
        <Pressable accessibilityRole="checkbox" accessibilityState={{checked:(giftQty[c.slug]||0)>0}} onPress={()=>adjustGiftQuantity(c.slug,(giftQty[c.slug]||0)>0?-(giftQty[c.slug]||0):1)} style={{flex:1,flexDirection:'row',gap:9,alignItems:'center',paddingVertical:7}}>
         <View style={{width:22,height:22,borderRadius:6,borderWidth:2,borderColor:(giftQty[c.slug]||0)>0?'#29663b':'#afc5ae',backgroundColor:(giftQty[c.slug]||0)>0?'#29663b':'white',justifyContent:'center',alignItems:'center'}}>
          {(giftQty[c.slug]||0)>0&&<Text style={{color:'white',fontWeight:'900'}}>✓</Text>}
         </View>
         <Text style={{flex:1,fontSize:13,color:ink,fontWeight:(giftQty[c.slug]||0)>0?'900':'600'}}>{c.title_pl}</Text>
        </Pressable>
       <Pressable accessibilityRole="button" accessibilityLabel={'Usuń jeden kod: '+c.title_pl} onPress={()=>adjustGiftQuantity(c.slug,-1)}
        style={{padding:9,backgroundColor:'#e6eee0',borderRadius:9}}><Text style={{color:ink,fontWeight:'900'}}>−</Text></Pressable>
       <Text style={{fontSize:14,fontWeight:'900',color:ink,minWidth:18,textAlign:'center'}}>{giftQty[c.slug]||0}</Text>
       <Pressable accessibilityRole="button" accessibilityLabel={'Dodaj jeden kod: '+c.title_pl} disabled={giftTotal>=10} onPress={()=>adjustGiftQuantity(c.slug,1)}
        style={{padding:9,backgroundColor:'#e6eee0',borderRadius:9,opacity:giftTotal>=10?.5:1}}><Text style={{color:ink,fontWeight:'900'}}>+</Text></Pressable>
      </View>)}
     </View>
     <Text style={{color:muted,fontSize:12,marginTop:11}}>Kliknij nazwę kursu, aby go zaznaczyć. Użyj + i −, jeśli chcesz wysłać więcej niż jeden kod tego samego kursu.</Text>
     <Pressable accessibilityRole="button" disabled={!!working||giftTotal<1||(!giftCompany&&!giftEmail.trim())} onPress={issueAdminGifts}
      style={{backgroundColor:ink,marginTop:19,borderRadius:12,padding:16,opacity:!!working||giftTotal<1||(!giftCompany&&!giftEmail.trim())?.5:1}}>
      <Text style={{color:'white',textAlign:'center',fontWeight:'900'}}>{working==='admin-gifts'?'Tworzę pakiet…':'Wyślij prezent — '+giftTotal+' '+(giftTotal===1?'kurs':'kursów')}</Text>
     </Pressable>
     {!!giftError&&<Text style={{color:'#a52626',padding:11}}>{giftError}</Text>}
     {!!giftCompanyPanel&&<View style={{backgroundColor:'#ecf6e8',borderRadius:12,padding:16,gap:9,marginTop:14}}>
      <Text style={{fontSize:17,fontWeight:'900',color:ink}}>Firma ma swój panel</Text>
      <Text style={{fontSize:13,lineHeight:21,color:muted}}>Opiekun firmy loguje się swoim e-mailem i przekazuje kursy pracownikom. Pracownicy mają osobne konta.</Text>
      <Text selectable style={{color:'#286d49',fontSize:14,fontWeight:'800'}}>{giftCompanyPanel}</Text>
     </View>}
     {!!issuedGifts.length&&<View style={{padding:14,backgroundColor:'#eff7e9',marginTop:15,borderRadius:11,gap:10}}>
      <Text style={{color:ink,fontSize:18,fontWeight:'900'}}>Pakiet gotowy — {issuedGifts.length} kodów</Text>
      <Text style={{fontSize:12,color:muted}}>{giftSent?'Wiadomość z kartami PDF przyjęto do wysyłki.':'Pobierz karty PDF do wydruku albo skopiuj linki i przekaż je odbiorcy.'}</Text>
      {issuedGifts.map((g,i)=><View key={g.code} style={{borderBottomWidth:1,borderColor:'#d0e4ca',paddingBottom:9}}>
       <Text style={{color:ink,fontSize:13,fontWeight:'800'}}>{i+1}. {g.title_pl}</Text>
       <Text selectable style={{color:ink,fontSize:12,lineHeight:19,marginTop:5}}>{formatGiftCode(g.code)}</Text>
       <Text selectable style={{color:'#245b3a',fontSize:12,marginTop:4}}>{g.link}</Text>
       {!!g.expires_at&&<Text style={{fontSize:12,color:muted,marginTop:5}}>Termin odbioru: {formatDate(g.expires_at)}</Text>}
       <Pressable accessibilityRole="button" accessibilityLabel={'Pobierz PDF kursu '+g.title_pl} disabled={!!working} onPress={()=>void downloadCourseGift(g)} style={{alignSelf:'flex-start',backgroundColor:ink,padding:11,borderRadius:9,marginTop:8,opacity:working?.5:1}}>
        <Text style={{color:'white',fontWeight:'800',fontSize:13}}>{working==='gift-pdf:'+g.code?'Przygotowuję PDF…':'Pobierz kartę PDF'}</Text>
       </Pressable>
      </View>)}
      <Pressable accessibilityRole="button" onPress={shareAdminGifts} style={{padding:13,backgroundColor:ink,borderRadius:10}}>
       <Text style={{color:'white',fontWeight:'900',textAlign:'center'}}>Kopiuj / udostępnij wszystkie linki</Text>
      </Pressable>
     </View>}
    </View>}
    {tab==='diplomas'&&<DiplomaRegistry/>}
    {tab==='support'&&<ContactEditor/>}
    {tab==='quality'&&<View style={card}>
     <Text style={{fontSize:22,fontWeight:'900',color:ink,marginBottom:10}}>Spójność materiałów</Text>
     <Text style={{color:muted,lineHeight:23,marginBottom:15}}>Status dotyczy weryfikacji redakcyjnej. Kursy robocze służą do testów, nie do płatnej sprzedaży. Każda lekcja musi respektować wspólne zasady bezpieczeństwa, zakres kompetencji i rzeczywiste możliwości platformy.</Text>
     {courses.map(c=>{const review=reviews.find(v=>v.course_slug===c.slug);return <View key={c.slug} style={{paddingVertical:12,borderBottomWidth:1,borderColor:'#edf1e9',gap:5}}>
      <Text style={{fontWeight:'800',color:ink}}>{c.title_pl}</Text>
      <Text style={{color:review?.review_status==='approved'?'#377c51':'#866335',fontSize:12,fontWeight:'700'}}>{review?.review_status==='approved'?'Zatwierdzony':review?.review_status==='review_needed'?'Wymaga sprawdzenia':'Wersja robocza'}</Text>
     </View>})}
    </View>}
    {tab==='drafts'&&<View style={card}>
     <Text style={{fontSize:22,fontWeight:'900',color:ink}}>Zestawienia testowe</Text>
     <Text style={{color:muted,lineHeight:21,marginVertical:11}}>Przygotuj i sprawdź obieg dokumentów. Prawdziwą fakturę z numerem, danymi firmy i podatkiem włączymy dopiero przed rozpoczęciem sprzedaży.</Text>
     {selectedStudent&&<View style={{backgroundColor:pale,padding:14,borderRadius:11,marginBottom:12}}>
      <Text style={{fontWeight:'800',color:ink}}>Odbiorca: {selectedStudent.email}</Text>
     </View>}
     {!selectedStudent&&<View style={{gap:6,marginBottom:12}}>
      <Text style={{color:muted}}>Wybierz odbiorcę:</Text>
      {students.slice(0,20).map(u=><Pressable key={u.id} onPress={()=>setSelectedStudent(u)} style={{backgroundColor:'#f4f7f1',padding:10,borderRadius:9}}>
       <Text style={{color:ink}}>{u.email}</Text>
      </Pressable>)}
     </View>}
     {!!selectedStudent&&<View style={{gap:8}}>
      <Text style={{color:muted,fontWeight:'800'}}>Wybierz kurs do zestawienia:</Text>
      <TextInput placeholder="Filtruj kursy" value={filter} onChangeText={setFilter} style={{borderWidth:1,borderColor:'#d5e3d1',borderRadius:10,padding:12,color:ink}}/>
      <View style={{maxHeight:220,overflow:'hidden',gap:5}}>
       {courses.filter(c=>c.title_pl.toLowerCase().includes(filter.trim().toLowerCase())).slice(0,10).map(c=><Pressable key={c.slug} onPress={()=>setSelectedCourse(c)} style={{padding:10,backgroundColor:selectedCourse?.slug===c.slug?pale:'#f7f9f5',borderRadius:9}}>
        <Text style={{fontWeight:selectedCourse?.slug===c.slug?'900':'500',color:ink}}>{c.title_pl} — {(c.price_grosze/100).toFixed(0)} zł</Text>
       </Pressable>)}
      </View>
      <Pressable disabled={!selectedCourse||!!working} onPress={makeDraft} style={{backgroundColor:ink,borderRadius:11,padding:15,opacity:(!selectedCourse||!!working)?0.5:1}}>
       <Text style={{fontWeight:'900',color:'white',textAlign:'center'}}>Utwórz dokument testowy (nie fakturę) →</Text>
      </Pressable>
     </View>}
     <Text style={{fontWeight:'900',color:ink,fontSize:18,marginTop:25,marginBottom:8}}>Wcześniejsze dokumenty</Text>
     {(stats.invoice_drafts||[]).map((d:Draft)=><View key={d.id} style={{paddingVertical:12,borderBottomWidth:1,borderColor:'#e8ece4',gap:6}}>
      <Text style={{fontWeight:'800',color:ink}}>{d.recipient_email} · {d.course_slug}</Text>
      <Text style={{color:muted,fontSize:12}}>Kwota katalogowa: {(d.amount_grosze/100).toFixed(2)} zł · Dokument pokazowy / NIE FAKTURA · {formatDate(d.created_at)}</Text>
      {d.doc_status==='draft'?<Pressable disabled={!!working} onPress={()=>sendDraft(d.id)} style={{alignSelf:'flex-start',backgroundColor:pale,padding:11,borderRadius:9}}>
       <Text style={{fontWeight:'800',color:ink}}>Wyślij test e-mail (jeśli Resend działa) →</Text>
      </Pressable>:<Text style={{color:'#397651'}}>Wysłano dokument testowy: {formatDate(d.sent_at)}</Text>}
     </View>)}
     {!(stats.invoice_drafts||[]).length&&<Text style={{color:muted}}>Nie utworzono jeszcze dokumentów.</Text>}
    </View>}
   </>}
   {!!message&&<Text style={{backgroundColor:'#fff3de',borderRadius:12,color:'#775c2d',padding:15}}>{message}</Text>}
   <Pressable onPress={refresh} style={{backgroundColor:pale,padding:15,borderRadius:12,marginTop:8}}>
    <Text style={{color:ink,fontWeight:'900',textAlign:'center'}}>Odśwież dane →</Text>
   </Pressable>
  </View>
 </ScrollView>
}
