import React,{useEffect,useState} from 'react';
import {ScrollView,View,Text,TextInput,Pressable,ActivityIndicator,Linking,Platform} from 'react-native';
import {useRouter} from 'expo-router';
import {supabase} from '../src/supabase';

type Partner={code:string;short_id?:number|null;partner_type:'individual'|'company';legal_name:string;status:string;stripe_connected:boolean;
 stripe_details_submitted:boolean;stripe_payouts_enabled:boolean;stripe_transfers_enabled:boolean;
 payout_tax_status:string;terms_version:string};
type Summary={pending_grosze:number;approved_grosze:number;in_process_grosze:number;transferred_grosze:number;total_sales:number};
type Data={ok?:boolean;error?:string;profile?:Partner;registration?:boolean;
 policy?:{commission_percent:number;min_payout_grosze:number;hold_days:number;payouts_live:boolean;terms_version:string};
 totals?:Summary;transactions?:{course_slug:string;amount_grosze:number;status:string;purchased_at:string;eligible_at:string}[];
 payouts?:{id:string;payout_month:string;amount_grosze:number;status:string;sent_at:string|null}[];url?:string};
const ink='#173629',muted='#536c5a',primary='#204a33',cream='#f9fbf5';
const codeRX=/^TA[A-F0-9]{12}$/;
const pln=(amount=0)=>(amount/100).toLocaleString('pl-PL',{style:'currency',currency:'PLN'});
const statusLabel:Record<string,string>={
 pending:'Oczekuje 30 dni',approved:'Zatwierdzone',in_payout:'W rozliczeniu',transferred:'Wypłacone / przekazane',
 void:'Anulowane',requires_review:'Do wyjaśnienia',prepared:'Przygotowano',
 processing:'W trakcie',failed:'Wymaga sprawdzenia',canceled:'Anulowano'};
const policyVersion='2026-11-18-v4';
function visit(url:string){
 if(Platform.OS==='web'&&typeof window!=='undefined')window.location.assign(url);
 else void Linking.openURL(url);
}
function Button({title,onPress,disabled=false,outline=false}:{title:string;onPress:()=>void;disabled?:boolean;outline?:boolean}){
 return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
  style={{minHeight:48,justifyContent:'center',alignItems:'center',paddingHorizontal:18,paddingVertical:11,
    backgroundColor:outline?'white':primary,borderWidth:1,borderColor:primary,borderRadius:12,opacity:disabled?.5:1}}>
  <Text style={{fontWeight:'800',fontSize:15,color:outline?primary:'white',textAlign:'center'}}>{title}</Text>
 </Pressable>;
}
function Agree({label,value,onPress,children}:{label:string;value:boolean;onPress:()=>void;children:React.ReactNode}){
 return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{checked:value}} onPress={onPress}
  style={{flexDirection:'row',gap:10,alignItems:'flex-start',paddingVertical:6,minHeight:44}}>
  <Text style={{fontSize:22,color:primary}}>{value?'☑':'☐'}</Text>
  <Text style={{flex:1,fontSize:14,lineHeight:21,color:ink}}>{children}</Text>
 </Pressable>;
}
export default function AffiliatePartner(){
 const router=useRouter();
 const [busy,setBusy]=useState(true),[sending,setSending]=useState(false),[account,setAccount]=useState<'no'|'yes'|'unknown'>('unknown');
 const [data,setData]=useState<Data|null>(null),[error,setError]=useState(''),[kind,setKind]=useState<'individual'|'company'>('individual');
 const [legalName,setLegalName]=useState(''),[nip,setNip]=useState(''),[adult,setAdult]=useState(false),
 [terms,setTerms]=useState(false),[privacy,setPrivacy]=useState(false),[copied,setCopied]=useState('');
 async function status(){
  setError('');
  const {data:{user}}=await supabase.auth.getUser();
  if(!user){setAccount('no');setData(null);return;}
  setAccount('yes');
  const response=await supabase.functions.invoke<Data>('ta-affiliate',{body:{action:'status'}});
  if(response.error){
   let err='';
   try{err=String((await (response.error as any).context?.json())?.error||'')}catch{}
   if(err==='not_registered'){setData(null);return;}
   throw new Error('Nie udało się wczytać panelu partnera. Spróbuj ponownie.');
  }
  if(response.data?.error==='not_registered'){setData(null);return;}
  setData(response.data||null);
 }
 useEffect(()=>{let active=true;void status().catch(e=>{if(active)setError(String(e.message||e))})
  .finally(()=>{if(active)setBusy(false)});return()=>{active=false};},[]);
 async function register(){
  if(sending)return;
  setSending(true);setError('');
  try{
   const payload={action:'register',partner_type:kind,legal_name:legalName.trim(),
    company_tax_id:kind==='company'?nip.replace(/\s/g,''):null,tax_residency:'PL',adult_confirmed:adult,
    terms_accepted:terms,privacy_acknowledged:privacy,terms_version:policyVersion};
   const r=await supabase.functions.invoke<Data>('ta-affiliate',{body:payload});
   if(r.error||!r.data?.ok)throw new Error('Nie udało się zapisać zgłoszenia. Sprawdź dane, e-mail i zgody.');
   await status();
  }catch(e:any){setError(String(e?.message||'Błąd zgłoszenia.'))}
  finally{setSending(false)}
 }
 async function downloadLogoPng(){
  if(Platform.OS!=='web'||typeof window==='undefined'||typeof document==='undefined')return;
  try{
   const image=new window.Image();
   image.onload=()=>{
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=360;
    const ctx=canvas.getContext('2d');
    if(!ctx){setCopied('Nie udało się utworzyć PNG. Pobierz wersję SVG.');return;}
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    canvas.toBlob(blob=>{
     if(!blob){setCopied('Nie udało się zapisać PNG. Pobierz SVG.');return;}
     const href=window.URL.createObjectURL(blob);
     const a=document.createElement('a');a.href=href;a.download='TRENERKI_Academy_logo.png';
     a.click();window.setTimeout(()=>window.URL.revokeObjectURL(href),1000);
     setCopied('Zapisano logo PNG.');
    },'image/png');
   };
   image.onerror=()=>setCopied('Grafika jest chwilowo niedostępna. Spróbuj wersji SVG.');
   image.src='/academy/assets/trenerki-logo-partner.svg';
  }catch{setCopied('Nie można pobrać PNG. Wybierz SVG.')}
 }
 async function copy(value:string,description:string){
  try{
   if(Platform.OS==='web'&&typeof navigator!=='undefined'&&navigator.clipboard){
    await navigator.clipboard.writeText(value);setCopied(description);
   }else{setCopied('Link: '+value);}
  }catch{setCopied('Zaznacz i skopiuj link z pola poniżej.')}
 }
 const profile=data?.profile,code=profile?.code&&codeRX.test(profile.code)?profile.code:'';
 const number=Number(profile?.short_id||0);
 const shortNumber=Number.isSafeInteger(number)&&number>=1&&number<=999999999?number:0;
 const link=shortNumber?'https://trenerki.com/'+shortNumber:
  code?'https://trenerki.com/academy/index.html?ref='+code:'';
 const canSubmit=legalName.trim().length>=3&&(kind==='individual'||/^\d{10}$/.test(nip.replace(/\s/g,'')))&&adult&&terms&&privacy;
 return <ScrollView style={{flex:1,backgroundColor:cream}} contentContainerStyle={{padding:22,paddingBottom:100}}>
  <View style={{width:'100%',maxWidth:850,alignSelf:'center',gap:18}}>
   <Pressable onPress={()=>router.replace('/')} accessibilityRole="link"><Text style={{color:primary,fontWeight:'800'}}>← Wróć do Trenerki</Text></Pressable>
   <Text style={{fontSize:12,color:'#638469',letterSpacing:2,fontWeight:'900'}}>TRENERKI · PARTNERZY</Text>
   <Text accessibilityRole="header" style={{color:ink,fontWeight:'900',fontSize:34,lineHeight:40}}>Polecaj wiedzę. Zarabiaj 10%.</Text>
   <Text style={{color:muted,fontSize:16,lineHeight:25}}>Prowizja za potwierdzony zakup kursu z Twojego indywidualnego linku. Nie musisz kupować kursów ani publikować reklam według narzuconego harmonogramu.</Text>
   <View style={{backgroundColor:'#eef5e9',borderRadius:14,padding:17,gap:8}}>
    <Text style={{fontWeight:'900',color:ink,fontSize:17}}>Jasne zasady rozliczeń</Text>
    <Text style={{color:muted,lineHeight:22}}>10% faktycznie zapłaconej ceny kursu (po rabacie), bez prowizji za własne zakupy, podarunki i zwrócone transakcje. Rozliczenia miesięczne, próg wypłaty 500 zł, okres weryfikacji 30 dni. Na koniec roku rozliczamy i wypłacamy również zatwierdzone salda niższe niż 500 zł, po kontroli dokumentów. Kwoty podane przed ewentualnym podatkiem dochodowym.</Text>
    <Text style={{color:muted,lineHeight:22}}>Firmy wystawiają faktury i otrzymują zwykłe przelewy bankowe. Osoby prywatne również mogą otrzymać zwykły przelew bez Stripe Connect, po potwierdzeniu podatków i wymaganych danych przez księgowość.</Text>
    <Text style={{color:ink,lineHeight:22,fontWeight:'700'}}>Jeśli dobrowolna prowizja osoby prywatnej jest przychodem z innych źródeł, partner rozlicza podatek w rocznym PIT, a Trenerki przygotowują PIT-11 bez pobierania zaliczki. Inny rodzaj współpracy może wymagać zaliczek lub ZUS. Przed pierwszą wypłatą potrzebna jest kontrola księgowa.</Text>
   </View>
   <View style={{backgroundColor:'white',borderWidth:1,borderColor:'#dbe8da',padding:20,borderRadius:16,gap:14}}>
    {busy?<ActivityIndicator color={primary}/>:
      account==='no'?<><Text style={{fontSize:20,fontWeight:'900',color:ink}}>Zaloguj się lub załóż konto</Text>
       <Text style={{color:muted,lineHeight:22}}>Użyj zwykłego konta Trenerki — nie tworzymy osobnego hasła dla programu.</Text>
       <Button title="Przejdź do logowania / rejestracji" onPress={()=>router.push('/konto?next=affiliate')}/></>
      :!profile?<><Text style={{fontSize:22,fontWeight:'900',color:ink}}>Dołącz do programu partnerskiego</Text>
       <View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>
        <Button title="Osoba prywatna" outline={kind!=='individual'} onPress={()=>setKind('individual')}/>
        <Button title="Firma" outline={kind!=='company'} onPress={()=>setKind('company')}/>
       </View>
       <Text style={{color:ink,fontWeight:'800'}}>Imię i nazwisko / pełna nazwa firmy</Text>
       <TextInput value={legalName} onChangeText={setLegalName} accessibilityLabel="Imię i nazwisko albo nazwa firmy" placeholder="Wpisz pełną nazwę"
        style={{borderWidth:1,borderColor:'#b7cdb7',borderRadius:10,padding:13,fontSize:16,color:ink,minHeight:50}}/>
       {kind==='company'&&<><Text style={{color:ink,fontWeight:'800'}}>NIP firmy z Polski</Text>
       <TextInput value={nip} onChangeText={setNip} accessibilityLabel="NIP firmy" keyboardType="number-pad" placeholder="10 cyfr"
        maxLength={10} style={{borderWidth:1,borderColor:'#b7cdb7',borderRadius:10,padding:13,fontSize:16,color:ink,minHeight:50}}/></>}
       <Agree label="Potwierdzam pełnoletność i polską rezydencję podatkową" value={adult} onPress={()=>setAdult(v=>!v)}>Potwierdzam, że mam ukończone 18 lat oraz rozliczam się podatkowo w Polsce.</Agree>
       <Agree label="Akceptuję regulamin programu afiliacyjnego" value={terms} onPress={()=>setTerms(v=>!v)}>Zapoznałem(-am) się z <Text onPress={()=>visit('https://trenerki.com/academy/regulamin-afiliacyjny.html')} style={{textDecorationLine:'underline'}}>regulaminem programu afiliacyjnego</Text> (wersja {policyVersion}) i akceptuję jego warunki.</Agree>
       <Agree label="Potwierdzam zapoznanie się z informacją o prywatności programu" value={privacy} onPress={()=>setPrivacy(v=>!v)}>Zapoznałem(-am) się z <Text onPress={()=>visit('https://trenerki.com/academy/prywatnosc-afiliacja.html')} style={{textDecorationLine:'underline'}}>informacją o przetwarzaniu danych partnerów</Text>. Obie grupy mogą otrzymać zwykły przelew po zatwierdzeniu właściwych dokumentów.</Agree>
       <Button title={sending?'Zapisuję…':'Załóż konto partnerskie'} disabled={!canSubmit||sending} onPress={()=>void register()}/>
       </>:<>
        <Text style={{fontSize:22,fontWeight:'900',color:ink}}>Twój panel partnerski</Text>
        <Text style={{fontWeight:'700',color:muted}}>{profile.legal_name} · {profile.partner_type==='individual'?'Osoba prywatna':'Firma'}</Text>
        <Text style={{color:muted}}>Twój numer partnera: <Text style={{fontWeight:'900',color:ink}}>{shortNumber||'W trakcie nadawania'}</Text></Text>
        <Text style={{color:muted,fontSize:12}}>Kod rozliczeniowy przechowujemy bezpiecznie w systemie. Nie musisz go kopiować ani wpisywać.</Text>
        <Text style={{fontWeight:'800',color:ink}}>Twój link do polecania kursów</Text>
        <TextInput editable={false} selectTextOnFocus value={link} accessibilityLabel="Twój link afiliacyjny"
         style={{borderWidth:1,borderColor:'#b7cfb8',padding:12,borderRadius:10,color:ink,fontSize:14}}/>
        <Button title="Skopiuj link" onPress={()=>void copy(link,'Skopiowano link')}/>
        {!!copied&&<Text style={{color:'#2d8049'}}>{copied}</Text>}
        <Text style={{color:muted,fontSize:13,lineHeight:21}}>Twój krótki link prowadzi do katalogu. Ktoś kupuje dowolny kwalifikujący się kurs po wejściu z Twojego linku — naliczenie 10% zapisuje się na Twoim koncie. Udostępniając link oznacz publikację: „Materiał reklamowy — link afiliacyjny Trenerki”.</Text>
        <View style={{backgroundColor:'#f1f7ed',padding:16,borderRadius:14,borderWidth:1,borderColor:'#d7e7d1',gap:11}}>
          <Text style={{fontWeight:'900',fontSize:18,color:ink}}>Logo Trenerki do Twoich materiałów</Text>
          {Platform.OS==='web'
            ?<img src="/academy/assets/trenerki-logo-partner.svg" alt="Oficjalny znak TRENERKI Academy do udostępniania" width={540}
              style={{display:'block',maxWidth:'100%',height:'auto',borderRadius:10}}/>
            :<Text style={{color:muted}}>Logo dostępne na stronie Trenerki.com w formacie wektorowym.</Text>}
          <Text style={{color:muted,lineHeight:21}}>Możesz umieszczać logo w swoich postach polecających kursy. Nie sugeruj jednak, że występujesz jako pracownik Trenerki.</Text>
          {Platform.OS==='web'?<a href="/academy/assets/trenerki-logo-partner.svg" download="TRENERKI_Academy_logo.svg"
             style={{padding:'12px 16px',backgroundColor:primary,color:'white',borderRadius:10,textAlign:'center',fontWeight:800,textDecoration:'none'}}>
             Pobierz logo SVG (najwyższa jakość)
           </a>:<Button title="Otwórz logo SVG" outline onPress={()=>visit('https://trenerki.com/academy/assets/trenerki-logo-partner.svg')}/>}
          {Platform.OS==='web'&&<Button title="Pobierz logo PNG" outline onPress={()=>void downloadLogoPng()}/>}
        </View>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>
         {([
          ['W oczekiwaniu',data?.totals?.pending_grosze],
          ['Zatwierdzone',data?.totals?.approved_grosze],
          ['Wypłacone / przekazane',data?.totals?.transferred_grosze]
         ] as const).map(([label,value])=><View key={label} style={{flexGrow:1,minWidth:150,backgroundColor:'#edf5e9',padding:15,borderRadius:12,gap:5}}>
          <Text style={{color:muted,fontSize:13}}>{label}</Text><Text style={{fontWeight:'900',fontSize:23,color:ink}}>{pln(value)}</Text>
         </View>)}
        </View>
        {profile.partner_type==='company'?<>
         <Text style={{color:ink,fontWeight:'900',fontSize:17}}>Firma: faktura i przelew bankowy</Text>
         <Text style={{color:muted,lineHeight:22}}>Po miesięcznym zestawieniu i osiągnięciu 500 zł zatwierdzonych prowizji wystaw prawidłową fakturę lub inny wymagany dokument. Trenerki sprawdzą dokument i wykonają zwykły przelew na rachunek podany na fakturze. Nie potrzebujesz Stripe Connect.</Text>
        </>:<>
         <Text style={{color:ink,fontWeight:'900',fontSize:17}}>Osoba prywatna: zwykły przelew bankowy</Text>
         <Text style={{color:muted,lineHeight:22}}>Nie trzeba otwierać konta Stripe Connect wyłącznie dla wypłaty prowizji. Gdy zatwierdzone saldo osiągnie 500 zł, księgowość poprosi bezpiecznym kanałem o potrzebne dane podatkowe i rachunek bankowy. Nie podawaj PESEL ani numeru konta w czacie lub publicznych wiadomościach.</Text>
         <Text style={{color:muted,lineHeight:22}}>W przypadku zakwalifikowania prowizji jako przychodu z innych źródeł partner sam rozlicza podatek w rocznym PIT, a Trenerki sporządzają PIT-11. Ostateczna kwalifikacja zależy od współpracy.</Text>
        </>}
        {!data?.policy?.payouts_live&&<Text style={{color:'#895d24',lineHeight:22}}>Rejestracja i naliczanie prowizji są aktywne. Przelewy są wstrzymane do zatwierdzenia dokumentów i sposobu rozliczenia przez księgowość. Naliczenie nie jest jeszcze potwierdzeniem wypłaty.</Text>}
        <Button title="Odśwież stan wypłat i prowizji" outline onPress={()=>void status().catch(e=>setError(String(e)) )}/>
        <Text style={{color:ink,fontWeight:'900',fontSize:17}}>Ostatnie naliczenia</Text>
        {(data?.transactions||[]).length===0?<Text style={{color:muted}}>Nie masz jeszcze potwierdzonych zakupów z polecenia.</Text>:
         (data?.transactions||[]).slice(0,30).map((r,i)=><View key={i} style={{borderBottomWidth:1,borderColor:'#edf0e8',paddingVertical:10,flexDirection:'row',justifyContent:'space-between',gap:12}}>
          <View style={{flex:1}}><Text style={{color:ink,fontWeight:'700'}}>{r.course_slug}</Text>
          <Text style={{color:muted,fontSize:12}}>{new Date(r.purchased_at).toLocaleDateString('pl-PL')} · {statusLabel[r.status]||r.status}</Text></View>
          <Text style={{fontWeight:'900',color:ink}}>{pln(r.amount_grosze)}</Text>
         </View>)}
        <Text style={{color:ink,fontWeight:'900',fontSize:17,marginTop:10}}>Rozliczenia miesięczne i zamknięcie roku</Text>
        {(data?.payouts||[]).length===0?<Text style={{color:muted}}>Nie ma jeszcze zatwierdzonych wypłat. Prowizje gromadzą się w saldzie zgodnie z regulaminem.</Text>:
         (data?.payouts||[]).map(p=><View key={p.id} style={{paddingVertical:10,borderBottomWidth:1,borderColor:'#edf0e8',flexDirection:'row',justifyContent:'space-between',gap:12}}>
          <View style={{flex:1}}><Text style={{color:ink,fontWeight:'800'}}>{new Date(p.payout_month).toLocaleDateString('pl-PL',{month:'long',year:'numeric'})}</Text>
           <Text style={{color:muted,fontSize:12}}>{statusLabel[p.status]||p.status} · {p.sent_at?new Date(p.sent_at).toLocaleDateString('pl-PL'):'bez potwierdzonej daty przelewu'}</Text></View>
          <Text style={{color:ink,fontWeight:'900'}}>{pln(p.amount_grosze)}</Text>
         </View>)}
       </>
    }
    {!!error&&<Text accessibilityLiveRegion="polite" style={{color:'#a53529',lineHeight:23}}>{error}</Text>}
   </View>
   <Text style={{fontSize:13,color:muted,lineHeight:21}}>Trenerki sp. z o.o. · <Text onPress={()=>visit('https://trenerki.com/academy/regulamin-afiliacyjny.html')} style={{textDecorationLine:'underline'}}>Regulamin programu</Text> · <Text onPress={()=>visit('https://trenerki.com/academy/prywatnosc-afiliacja.html')} style={{textDecorationLine:'underline'}}>Prywatność partnerów</Text> · <Text onPress={()=>visit('https://trenerki.com/academy/kontakt.html')} style={{textDecorationLine:'underline'}}>Kontakt</Text>.</Text>
  </View>
 </ScrollView>;
}
