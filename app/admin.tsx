import React,{useEffect,useMemo,useState} from 'react';
import {ScrollView,View,Text,TextInput,Pressable,ActivityIndicator} from 'react-native';
import {useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
import {academyAction} from '../src/academyApi';

const ink='#183b2c',muted='#5b7663',pale='#e9f3dc';
type Student={id:string,email:string,created_at:string,confirmed:boolean,last_sign_in_at?:string|null};
type Course={slug:string,title_pl:string,price_grosze:number};
type Draft={id:string,course_slug:string,recipient_email:string,amount_grosze:number,doc_status:string,created_at:string,sent_at?:string|null};
const formatDate=(s?:string|null)=>s?new Date(s).toLocaleDateString('pl-PL'):'—';
const card={padding:20,borderWidth:1,borderColor:'#e0eadb',backgroundColor:'white',borderRadius:16} as const;
export default function AdminPage(){
 const router=useRouter();
 const [busy,setBusy]=useState(true),[working,setWorking]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [stats,setStats]=useState<any>(null),[courses,setCourses]=useState<Course[]>([]),[reviews,setReviews]=useState<{course_slug:string,review_status:string}[]>([]),[filter,setFilter]=useState('');
 const [selectedStudent,setSelectedStudent]=useState<Student|null>(null),[selectedCourse,setSelectedCourse]=useState<Course|null>(null);
 const [tab,setTab]=useState<'users'|'orders'|'gifts'|'drafts'|'quality'>('users');
 const students:Student[]=stats?.users||[];
 const filteredStudents=useMemo(()=>students.filter(u=>(u.email||'').toLowerCase().includes(filter.trim().toLowerCase())),[students,filter]);
 useEffect(()=>{void refresh()},[]);
 async function refresh(){
  setBusy(true);setError('');
  try{
   const {data:{user}}=await supabase.auth.getUser();
   if(!user){router.replace('/konto');return;}
   const [r,allCourses,allReviews]=await Promise.all([
    academyAction('admin_dashboard'),
    supabase.from('ta_courses').select('slug,title_pl,price_grosze').eq('published',true).order('title_pl'),
    supabase.from('ta_course_previews').select('course_slug,review_status')
   ]);
   if(allCourses.error||allReviews.error)throw allCourses.error||allReviews.error;
   setCourses(allCourses.data||[]);setReviews(allReviews.data||[]);setStats(r);
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
   <View style={{backgroundColor:'#fff0d5',padding:17,borderRadius:13}}>
    <Text style={{color:'#755c2d',fontWeight:'900'}}>TRYB TESTOWY — 0 zł wpływów z symulacji</Text>
    <Text style={{color:'#806a3d',marginTop:7,lineHeight:22}}>Widzisz rzeczywiste konta użytkowników i oddzielnie próbne zamówienia, prezenty i dokumenty. Symulacje nie tworzą przychodów, płatności ani prawdziwych faktur.</Text>
   </View>
   {busy&&<ActivityIndicator/>}
   {!!error&&<Text style={{backgroundColor:'#ffefdf',padding:16,borderRadius:12,color:'#8c462c'}}>{error}</Text>}
   {!!stats&&<>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>
     {count('Użytkownicy',stats.counts?.users)}
     {count('Kursy',stats.counts?.courses)}
     {count('Dostępy aktywne / demo',stats.counts?.active_or_demo_access)}
     {count('Zamówienia DEMO',stats.counts?.demo_orders)}
     {count('Karty podarunkowe',stats.counts?.gift_codes)}
     {count('Przychód z testów','0 zł')}
     {count('Kursy czekające na weryfikację',reviews.filter(r=>r.review_status!=='approved').length)}
    </View>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:5}}>
     {([['users','Użytkownicy'],['orders','Zamówienia DEMO'],['gifts','Prezenty'],['drafts','Dokumenty testowe'],['quality','Jakość kursów']] as const).map(([key,label])=>
      <Pressable key={key} onPress={()=>setTab(key)} style={{padding:12,borderRadius:11,backgroundColor:tab===key?ink:pale}}>
       <Text style={{fontWeight:'800',color:tab===key?'white':ink}}>{label}</Text>
      </Pressable>
     )}
    </View>
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
      <Text style={{fontWeight:'800',color:ink}}>{g.course_slug} · {g.mode==='demo'?'DEMO':'GRATIS'}</Text>
      <Text style={{color:muted}}>{g.status==='redeemed'?'Wykorzystany':g.status==='issued'?'Do wykorzystania':'Anulowany'} · {g.recipient_email||'Bez przypisanego e-maila'}</Text>
      <Text style={{color:muted,fontSize:12}}>Wystawiono {formatDate(g.created_at)}</Text>
     </View>)}
     {!(stats.gifts||[]).length&&<Text style={{color:muted}}>Brak kart podarunkowych.</Text>}
     <Pressable onPress={()=>router.push({pathname:'/prezent',params:{course:'swiety-mikolaj'}})} style={{marginTop:16,backgroundColor:pale,padding:15,borderRadius:11}}>
      <Text style={{fontWeight:'800',color:ink,textAlign:'center'}}>🎁 Podaruj kurs Świętego Mikołaja</Text>
     </Pressable>
    </View>}
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
       {courses.filter(c=>c.title_pl.toLowerCase().includes(filter.trim().toLowerCase())).slice(0,10).map(c=><Pressable key={c.slug} onPress={()=>setSelectedCourse(c)} style={{padding:10,backgroundColor:selectedCourse?.slug===c.slug?bg:'#f7f9f5',borderRadius:9}}>
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
