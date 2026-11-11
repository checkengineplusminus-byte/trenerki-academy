import React,{useEffect,useMemo,useState} from 'react';
import {View,Text,TextInput,ScrollView,Pressable,ActivityIndicator,Share,Platform,useWindowDimensions} from 'react-native';
import {useRouter} from 'expo-router';
import {supabase} from '../src/supabase';

type Seat={id:string;bundle_id:string;course_slug:string;title_pl:string;state:'available'|'assigned';assigned_email:string|null;email_sent_at:string|null;redeemed:boolean};
type Link={title_pl:string;link:string;email_sent:boolean;recipient:string};
const ink='#183b2c',muted='#5a7463',pale='#ecf5e7';
const courseCount=(count:number)=>count+' '+(count===1?'kurs':count>=2&&count<=4?'kursy':'kursów');
export default function CompanyPortal(){
 const router=useRouter(),{width}=useWindowDimensions();
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[signedIn,setSignedIn]=useState(false),[authorized,setAuthorized]=useState(false);
 const [email,setEmail]=useState(''),[seats,setSeats]=useState<Seat[]>([]),[recipient,setRecipient]=useState(''),[selected,setSelected]=useState<string[]>([]);
 const [links,setLinks]=useState<Link[]>([]),[error,setError]=useState(''),[message,setMessage]=useState(''),[filter,setFilter]=useState<'all'|'available'|'assigned'>('available');
 const free=useMemo(()=>seats.filter(s=>s.state==='available'),[seats]);
 const assigned=useMemo(()=>seats.filter(s=>s.state==='assigned'),[seats]);
 const visible=useMemo(()=>seats.filter(s=>filter==='all'||s.state===filter),[seats,filter]);
 const card={backgroundColor:'white',borderWidth:1,borderColor:'#dce8d8',borderRadius:16,padding:width<600?16:22} as const;
 async function load(){
  setLoading(true);
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser();
   if(authError||!user?.email_confirmed_at){setSignedIn(false);setAuthorized(false);return;}
   setSignedIn(true);setEmail(user.email||'');
   const {data,error}=await supabase.functions.invoke('ta-company',{body:{action:'dashboard'}});
   if(error||!data?.ok)throw new Error('Nie udało się odczytać danych firmy.');
   const currentSeats:Seat[]=data.seats||[];
   const availableIds=new Set(currentSeats.filter(seat=>seat.state==='available').map(seat=>seat.id));
   setAuthorized(data.authorized===true);setSeats(currentSeats);
   setSelected(current=>current.filter(id=>availableIds.has(id)));
  }catch(e:any){setError(e?.message||'Panel jest chwilowo niedostępny.')}
  finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[]);
 async function send(){
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim())||!selected.length){setError('Wpisz e-mail pracownika i wybierz kurs.');return;}
  setBusy(true);setError('');setMessage('');const outputs:Link[]=[];
  try{
   for(const seat_id of selected){
    const {data,error}=await supabase.functions.invoke('ta-company',{body:{action:'assign',seat_id,employee_email:recipient.trim().toLowerCase()}});
    if(error||!data?.ok)throw new Error('Nie wszystkie kursy udało się przydzielić. Sprawdź listę.');
    outputs.push({title_pl:data.title_pl,recipient:data.recipient,link:data.link,email_sent:!!data.email_sent});
    setSelected(current=>current.filter(id=>id!==seat_id));
   }
   setSelected([]);setRecipient('');
   setMessage('Przydzielono '+courseCount(outputs.length)+'. '+(outputs.every(x=>x.email_sent)?'Zaproszenia wysłano.':'Skopiuj linki, których wysyłka nie została potwierdzona.'));
  }catch(e:any){setError(e?.message||'Błąd przydziału.')}
  finally{setLinks(outputs);await load();setBusy(false);}
 }
 async function copy(){
  const text=links.map((x,i)=>(i+1)+'. '+x.title_pl+'\n'+x.link).join('\n\n');
  try{
   if(Platform.OS==='web'&&typeof navigator!=='undefined'&&navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);setMessage('Skopiowano linki.');return;}
   await Share.share({message:text});
  }catch{setMessage('Skopiuj linki wyświetlone poniżej.')}
 }
 const select=(s:Seat)=>setSelected(old=>old.includes(s.id)?old.filter(id=>id!==s.id):old.length>=10?old:[...old,s.id]);
 return <ScrollView style={{flex:1,backgroundColor:'#fcfcf7'}} contentContainerStyle={{padding:width<600?15:24,paddingBottom:65}}>
  <View style={{maxWidth:1040,width:'100%',alignSelf:'center',gap:16}}>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
    <Pressable onPress={()=>router.replace('/')}><Text style={{fontWeight:'800',color:ink}}>← TRENERKI Academy</Text></Pressable>
    {signedIn&&<Pressable onPress={async()=>{await supabase.auth.signOut();router.replace({pathname:'/konto',params:{next:'company'}})}} style={{backgroundColor:pale,padding:11,borderRadius:10}}>
     <Text style={{fontWeight:'800',color:ink}}>Wyloguj się</Text>
    </Pressable>}
   </View>
   <Text style={{fontSize:12,fontWeight:'800',letterSpacing:1.5,color:'#678670'}}>TRENERKI DLA FIRM</Text>
   <Text style={{fontSize:width<500?27:34,fontWeight:'900',color:ink}}>Panel firmy</Text>
   <Text style={{fontSize:14,color:muted,lineHeight:22}}>Rozdzielaj kursy pracownikom i kontroluj liczbę dostępnych miejsc.</Text>
   {loading&&<ActivityIndicator size="large" color={ink}/>}
   {!loading&&!signedIn&&<View style={card}>
    <Text style={{fontSize:20,fontWeight:'900',color:ink,marginBottom:10}}>Logowanie firmowe</Text>
    <Text style={{color:muted,marginBottom:14}}>Zaloguj się na e-mail, na który otrzymano pakiet kursów.</Text>
    <Pressable onPress={()=>router.replace({pathname:'/konto',params:{next:'company'}})} style={{backgroundColor:ink,padding:15,borderRadius:10}}>
     <Text style={{color:'white',fontWeight:'900',textAlign:'center'}}>Zaloguj się / Utwórz konto firmowe</Text>
    </Pressable>
   </View>}
   {!loading&&signedIn&&!authorized&&!error&&<View style={card}>
    <Text style={{fontSize:20,fontWeight:'900',color:ink,marginBottom:10}}>Brak pakietu firmowego</Text>
    <Text style={{color:muted,lineHeight:22}}>Zalogowano jako {email}. Panel zostanie udostępniony, gdy administrator przydzieli kursy na ten adres e-mail.</Text>
    <Pressable onPress={()=>router.replace('/moje-kursy')} style={{backgroundColor:pale,padding:13,borderRadius:10,marginTop:15}}>
     <Text style={{color:ink,textAlign:'center',fontWeight:'800'}}>Moje kursy prywatne</Text>
    </Pressable>
   </View>}
   {!!error&&<Text style={{color:'#9c3f26',backgroundColor:'#fff1e9',padding:13,borderRadius:10}}>{error}</Text>}
   {!!message&&<Text style={{color:ink,backgroundColor:pale,padding:13,borderRadius:10}}>{message}</Text>}
   {!loading&&authorized&&<>
    <Text style={{fontSize:13,color:muted}}>Opiekun firmy: {email}</Text>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>
     {[[free.length,'Wolne miejsca'],[assigned.length,'Przydzielone'],[assigned.filter(s=>s.redeemed).length,'Odebrane']].map(([number,label])=><View key={String(label)} style={{flexGrow:1,minWidth:width<500?'29%':160,backgroundColor:pale,padding:15,borderRadius:11,gap:5}}>
      <Text style={{fontSize:27,fontWeight:'900',color:ink}}>{number}</Text><Text style={{fontSize:12,color:muted}}>{label}</Text>
     </View>)}
    </View>
    <View style={card}>
     <Text style={{fontSize:21,fontWeight:'900',color:ink,marginBottom:7}}>Przekaż kurs pracownikowi</Text>
     <Text style={{fontSize:13,color:muted,lineHeight:21,marginBottom:12}}>Podaj e-mail pracownika i zaznacz kursy. Każde miejsce można wykorzystać tylko raz.</Text>
     <TextInput placeholder="pracownik@firma.pl" accessibilityLabel="E-mail pracownika" value={recipient} onChangeText={setRecipient} editable={!busy} autoCapitalize="none" keyboardType="email-address"
      style={{borderWidth:1,borderColor:'#cbdcc6',padding:13,borderRadius:10,fontSize:15,color:ink,marginBottom:13}}/>
     {free.length===0?<Text style={{color:muted}}>Wszystkie dostępne kursy zostały już przydzielone.</Text>:
      free.map(seat=><Pressable key={seat.id} accessibilityRole="checkbox" accessibilityState={{checked:selected.includes(seat.id),disabled:busy}} disabled={busy} onPress={()=>select(seat)}
       style={{flexDirection:'row',alignItems:'center',gap:10,borderWidth:1,borderColor:'#e0eadd',padding:11,borderRadius:10,marginBottom:7,backgroundColor:selected.includes(seat.id)?pale:'white'}}>
       <View style={{width:22,height:22,borderWidth:2,borderColor:'#559268',borderRadius:5,alignItems:'center',justifyContent:'center',backgroundColor:selected.includes(seat.id)?'#276a40':'white'}}>
        {selected.includes(seat.id)&&<Text style={{color:'white',fontWeight:'900'}}>✓</Text>}
       </View>
       <Text style={{color:ink,fontSize:13,fontWeight:'800',flex:1}}>{seat.title_pl}</Text>
      </Pressable>)}
     <Pressable accessibilityRole="button" disabled={busy||!selected.length||!recipient.trim()} onPress={send}
      style={{backgroundColor:ink,padding:15,borderRadius:11,opacity:busy||!selected.length||!recipient.trim()?.45:1,marginTop:13}}>
      <Text style={{color:'white',textAlign:'center',fontWeight:'900'}}>{busy?'Wysyłam…':'Przydziel '+courseCount(selected.length)}</Text>
     </Pressable>
    </View>
    {!!links.length&&<View style={card}>
     <Text style={{color:ink,fontSize:20,fontWeight:'900',marginBottom:12}}>Nowe zaproszenia</Text>
     {links.map((item,i)=><View key={item.link} style={{paddingVertical:10,borderBottomWidth:1,borderColor:'#e2eadd',gap:6}}>
      <Text style={{color:ink,fontWeight:'800'}}>{i+1}. {item.title_pl}</Text>
      <Text style={{color:muted,fontSize:12}}>{item.recipient} · {item.email_sent?'Wysłano e-mail':'Wysyłka e-mail niepotwierdzona'}</Text>
      <Text selectable style={{color:'#2e7950',fontSize:12}}>{item.link}</Text>
     </View>)}
     <Pressable onPress={copy} style={{backgroundColor:ink,padding:13,borderRadius:10,marginTop:13}}><Text style={{color:'white',textAlign:'center',fontWeight:'800'}}>Kopiuj / udostępnij zaproszenia</Text></Pressable>
    </View>}
    <View style={card}>
     <Text style={{fontSize:21,fontWeight:'900',color:ink,marginBottom:12}}>Kursy Twojej firmy</Text>
     <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:12}}>
      {([['available','Wolne'],['assigned','Przydzielone'],['all','Wszystkie']] as const).map(([value,label])=><Pressable key={value} onPress={()=>setFilter(value)} style={{backgroundColor:filter===value?ink:pale,padding:11,borderRadius:10}}>
       <Text style={{color:filter===value?'white':ink,fontWeight:'800'}}>{label}</Text>
      </Pressable>)}
     </View>
     {!visible.length&&<Text style={{color:muted}}>Brak kursów w tym widoku.</Text>}
     {visible.map(s=><View key={s.id} style={{paddingVertical:11,borderBottomWidth:1,borderColor:'#e3ebe0',gap:5}}>
      <Text style={{color:ink,fontWeight:'800'}}>{s.title_pl}</Text>
      <Text style={{color:muted,fontSize:12}}>{s.state==='available'?'Dostępne miejsce':'Pracownik: '+s.assigned_email}</Text>
      {s.state==='assigned'&&<Text style={{color:s.redeemed?'#2b7845':'#976f2d',fontSize:12,fontWeight:'700'}}>{s.redeemed?'Odebrano kurs':'Oczekuje na odbiór'} · {s.email_sent_at?'Wysłano zaproszenie':'E-mail niepotwierdzony'}</Text>}
     </View>)}
    </View>
    <Pressable onPress={()=>router.replace('/moje-kursy')} style={{alignSelf:'center',padding:13}}><Text style={{color:'#39734d',fontWeight:'800'}}>Moje konto prywatne</Text></Pressable>
   </>}
  </View>
 </ScrollView>;
}
