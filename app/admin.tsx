import React,{useEffect,useMemo,useState} from 'react';
import {ScrollView,View,Text,TextInput,Pressable,ActivityIndicator,Platform,Share} from 'react-native';
import {useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
import {academyAction} from '../src/academyApi';
import DiplomaRegistry from '../src/DiplomaRegistry';

const ink='#183b2c',muted='#5b7663',pale='#e9f3dc';
type Student={id:string,email:string,created_at:string,confirmed:boolean,last_sign_in_at?:string|null};
type Course={slug:string,title_pl:string,price_grosze:number};
type Draft={id:string,course_slug:string,recipient_email:string,amount_grosze:number,doc_status:string,created_at:string,sent_at?:string|null};
type Metrics={new_users:number,purchases:number,gifts?:number,revenue_grosze:number,unique_buyers:number};
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
 const [busy,setBusy]=useState(true),[working,setWorking]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [analytics,setAnalytics]=useState<SalesAnalytics|null>(null),[analyticsError,setAnalyticsError]=useState(''),[salesInterval,setSalesInterval]=useState<'daily'|'monthly'|'yearly'>('daily');
 const [stats,setStats]=useState<any>(null),[courses,setCourses]=useState<Course[]>([]),[reviews,setReviews]=useState<{course_slug:string,review_status:string}[]>([]),[filter,setFilter]=useState('');
 const [selectedStudent,setSelectedStudent]=useState<Student|null>(null),[selectedCourse,setSelectedCourse]=useState<Course|null>(null);
 const [tab,setTab]=useState<'sales'|'users'|'orders'|'gifts'|'giveaway'|'drafts'|'quality'|'diplomas'>('giveaway');
 const [giftSearch,setGiftSearch]=useState(''),[giftQty,setGiftQty]=useState<Record<string,number>>({});
 const [giftEmail,setGiftEmail]=useState(''),[giftCompany,setGiftCompany]=useState(false),[giftSent,setGiftSent]=useState(false);
 const [issuedGifts,setIssuedGifts]=useState<{course_slug:string;title_pl:string;code:string;link:string}[]>([]);
 const [giftError,setGiftError]=useState('');
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
  if(!!working||giftTotal<1||giftTotal>10)return;
  setWorking('admin-gifts');setGiftError('');setMessage('');setIssuedGifts([]);setGiftSent(false);
  try{
   if(!giftCompany&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(giftEmail.trim()))throw new Error('Wpisz poprawny adres e-mail odbiorcy.');
   const course_slugs=selectedGifts.flatMap(c=>Array(giftQty[c.slug]).fill(c.slug));
   const {data,error}=await supabase.functions.invoke('ta-admin-gifts',{body:{
    action:'issue',course_slugs,destination_email:giftEmail.trim().toLowerCase(),
    bind_to_recipient:!giftCompany
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
     gift_create_failed:'Nie udało się wydać kodów. Nic nie zapisano.'
    };
    throw new Error(messages[detail]||'Nie udało się wygenerować prezentów. Spróbuj ponownie.');
   }
   setIssuedGifts(data.gifts||[]);setGiftSent(!!data.email_sent);setGiftQty({});
   setMessage(data.email_sent?'Prezent został wysłany na wskazany e-mail.':'Kody zostały utworzone, ale wysyłka e-mail nie została potwierdzona. Skopiuj linki i prześlij je odbiorcy.');
   await refresh();setTab('giveaway');
  }catch(e:any){setGiftError(String(e?.message||'Błąd tworzenia pakietu.'));}
  finally{setWorking('')}
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
 useEffect(()=>{void refresh()},[]);
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
 return <ScrollView style={{backgroundColor:'#fcfcf7',flex:1}} contentContainerStyle={{padding:22,paddingBottom:80}}>
  <View style={{maxWidth:1050,alignSelf:'center',width:'100%',gap:18}}>
   <Pressable onPress={()=>router.replace('/')}><Text style={{color:ink,fontWeight:'800'}}>← TRENERKI Academy</Text></Pressable>
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
     {([['giveaway','🎁 Rozdaj kursy'],['sales','Sprzedaż Stripe'],['users','Użytkownicy'],['gifts','Prezenty'],['quality','Jakość kursów'],['diplomas','Dyplomy'],['orders','Archiwum DEMO'],['drafts','Dokumenty testowe']] as const).map(([key,label])=>
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
     <Pressable onPress={()=>router.push({pathname:'/prezent',params:{course:'swiety-mikolaj'}})} style={{marginTop:16,backgroundColor:pale,padding:15,borderRadius:11}}>
      <Text style={{fontWeight:'800',color:ink,textAlign:'center'}}>🎁 Podaruj kurs Świętego Mikołaja</Text>
     </Pressable>
    </View>}
    {tab==='giveaway'&&<View style={card}>
     <Text style={{fontSize:23,fontWeight:'900',color:ink,marginBottom:8}}>Podaruj kursy za darmo</Text>
     <Text style={{fontSize:13,color:muted,lineHeight:21,marginBottom:15}}>Wpisz e-mail, wybierz do 10 kursów i wyślij prezent. Każdy kurs ma własny jednorazowy link, ważny przez trzy lata. Dostęp do nauki trwa 12 miesięcy od odbioru.</Text>
     <View style={{flexDirection:'row',flexWrap:'wrap',gap:9,marginBottom:15}}>
      <Pressable accessibilityRole="button" onPress={()=>{setGiftCompany(false);setIssuedGifts([])}} style={{backgroundColor:!giftCompany?ink:pale,padding:12,borderRadius:10}}>
       <Text style={{fontSize:13,fontWeight:'900',color:!giftCompany?'white':ink}}>Dla jednej osoby</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={()=>{setGiftCompany(true);setIssuedGifts([])}} style={{backgroundColor:giftCompany?ink:pale,padding:12,borderRadius:10}}>
       <Text style={{fontSize:13,fontWeight:'900',color:giftCompany?'white':ink}}>Pakiet dla firmy / pracowników</Text>
      </Pressable>
     </View>
     <Text style={{color:ink,fontSize:13,fontWeight:'800'}}>{giftCompany?'E-mail osoby koordynującej (opcjonalnie)':'E-mail odbiorcy'}</Text>
     <TextInput placeholder={giftCompany?'np. szkolenia@firma.pl':'np. odbiorca@example.com'} value={giftEmail} onChangeText={setGiftEmail}
      autoCapitalize="none" keyboardType="email-address" style={{padding:13,borderWidth:1,borderColor:'#cbdcc5',borderRadius:11,backgroundColor:'white',color:ink,fontSize:15,marginTop:7,marginBottom:7}}/>
     <Text style={{color:muted,fontSize:12,lineHeight:19,marginBottom:14}}>{giftCompany?'Kody nie będą przypisane do firmowego e-maila. Firma przekaże każdy kod innemu pracownikowi.':'Kody będą przypisane do adresu odbiorcy, więc nie można przekazać ich innym osobom.'}</Text>
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
     {!!issuedGifts.length&&<View style={{padding:14,backgroundColor:'#eff7e9',marginTop:15,borderRadius:11,gap:10}}>
      <Text style={{color:ink,fontSize:18,fontWeight:'900'}}>Pakiet gotowy — {issuedGifts.length} kodów</Text>
      <Text style={{fontSize:12,color:muted}}>{giftSent?'Wiadomość została przekazana do Resend.':'Wyślij linki samodzielnie albo skopiuj je do wiadomości dla firmy.'}</Text>
      {issuedGifts.map((g,i)=><View key={g.code} style={{borderBottomWidth:1,borderColor:'#d0e4ca',paddingBottom:9}}>
       <Text style={{color:ink,fontSize:13,fontWeight:'800'}}>{i+1}. {g.title_pl}</Text>
       <Text selectable style={{color:'#245b3a',fontSize:12,marginTop:4}}>{g.link}</Text>
      </View>)}
      <Pressable accessibilityRole="button" onPress={shareAdminGifts} style={{padding:13,backgroundColor:ink,borderRadius:10}}>
       <Text style={{color:'white',fontWeight:'900',textAlign:'center'}}>Kopiuj / udostępnij wszystkie linki</Text>
      </Pressable>
     </View>}
    </View>}
    {tab==='diplomas'&&<DiplomaRegistry/>}
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
