import React,{useEffect,useState} from 'react';
import {ScrollView,View,Text,TextInput,Pressable,ActivityIndicator,Platform} from 'react-native';
import {useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
type Totals={pending_grosze:number;approved_grosze:number;in_process_grosze:number;transferred_grosze:number;needs_review_grosze:number;total_sales:number};
type Partner={partner_id:string;code:string;legal_name:string;partner_type:string;company_tax_id?:string|null;status:string;tax_status:string;stripe_connected:boolean;stripe_payouts_enabled:boolean;stripe_transfers_enabled:boolean;created_at:string;totals:Totals};
type Row={code:string;legal_name:string;partner_type:string;company_tax_id?:string|null;tax_status:string;sales:number;gross_sales_grosze:number;commission_grosze:number;pending_grosze:number;approved_grosze:number;transferred_grosze:number;void_grosze:number;needs_review_grosze:number};
type Config={program_enabled:boolean;payout_enabled:boolean;tax_review_approved:boolean;commission_percent:number;payout_min_grosze:number;hold_days:number;terms_version:string};
const ink='#183c2a',muted='#58705f',pale='#f8fbf6';
const money=(value=0)=>(value/100).toLocaleString('pl-PL',{style:'currency',currency:'PLN'});
const inputStyle={borderWidth:1,borderColor:'#c2d4c1',backgroundColor:'#fff',padding:12,borderRadius:10,color:ink,fontSize:16,minHeight:49} as const;
function Btn({text,onPress,disabled=false,secondary=false}:{text:string;onPress:()=>void;disabled?:boolean;secondary?:boolean}){
 return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
  style={{minHeight:46,padding:12,justifyContent:'center',alignItems:'center',borderRadius:10,
   backgroundColor:secondary?'#e7f0e2':ink,opacity:disabled?.45:1}}>
  <Text style={{fontWeight:'900',color:secondary?ink:'white'}}>{text}</Text>
 </Pressable>;
}
export default function AffiliateAdmin(){
 const router=useRouter();
 const [busy,setBusy]=useState(true),[working,setWorking]=useState(''),[error,setError]=useState('');
 const [partners,setPartners]=useState<Partner[]>([]),[config,setConfig]=useState<Config|null>(null);
 const [month,setMonth]=useState(new Date().toISOString().slice(0,7)),[monthly,setMonthly]=useState<Row[]>([]);
 const [taxTarget,setTaxTarget]=useState(''),[taxEvidence,setTaxEvidence]=useState(''),[taxConfirmed,setTaxConfirmed]=useState(false);
 const [suspending,setSuspending]=useState(''),[reason,setReason]=useState('');
 async function action(action:string,fields:Record<string,unknown>={}):Promise<any>{
  const response=await supabase.functions.invoke('ta-affiliate-admin',{body:{action,...fields}});
  if(response.error||!response.data?.ok)throw new Error('Brak dostępu do raportu lub błąd weryfikacji. Sprawdź konto właściciela TRENERKI.');
  return response.data;
 }
 async function load(){
  const [r,m]=await Promise.all([action('report'),action('monthly',{month})]);
  setConfig(r.config);setPartners(Array.isArray(r.partners)?r.partners:[]);
  setMonthly(Array.isArray(m.rows)?m.rows:[]);
 }
 useEffect(()=>{let active=true;
  void load().catch(e=>{if(active)setError(String(e?.message||'Brak dostępu'))})
    .finally(()=>{if(active)setBusy(false)});
  return()=>{active=false};
 },[]);
 async function refreshMonth(){
  setWorking('month');setError('');
  try{const result=await action('monthly',{month});setMonthly(Array.isArray(result.rows)?result.rows:[])}
  catch(e:any){setError(e.message)}finally{setWorking('')}
 }
 async function verifyTax(){
  setWorking('tax');setError('');
  try{
   await action('mark_tax_verified',{partner_id:taxTarget,tax_reviewer_confirmed:taxConfirmed,evidence_reference:taxEvidence.trim()});
   setTaxEvidence('');setTaxConfirmed(false);setTaxTarget('');await load();
  }catch(e:any){setError(String(e?.message||'Nie udało się zatwierdzić dokumentów'))}
  finally{setWorking('')}
 }
 async function suspend(){
  setWorking('suspend');setError('');
  try{await action('suspend_partner',{partner_id:suspending,reason:reason.trim()});setSuspending('');setReason('');await load()}
  catch(e:any){setError(String(e?.message||'Nie udało się wstrzymać partnera'))}
  finally{setWorking('')}
 }
 function download(){
  if(Platform.OS!=='web'||typeof document==='undefined')return;
  const names=['Kod','Partner','Typ','NIP','Status podatkowy','Sprzedaże','Przychód PLN','Prowizja PLN','Oczekuje PLN','Zatwierdzone PLN','Przekazano PLN','Anulowane PLN','Do wyjaśnienia PLN'];
  const extract=(r:Row)=>[r.code,r.legal_name,r.partner_type,r.company_tax_id?"'"+r.company_tax_id:'',r.tax_status,r.sales,
   r.gross_sales_grosze/100,r.commission_grosze/100,r.pending_grosze/100,r.approved_grosze/100,
   r.transferred_grosze/100,r.void_grosze/100,r.needs_review_grosze/100];
  const csv=(rows:unknown[][])=>rows.map(row=>row.map(v=>{
    let cell=String(v??'');
    if(/^[\s]*[=+@-]/u.test(cell))cell="'"+cell; // Protect Excel from executing formulas placed in partner names.
    return '"'+cell.replaceAll('"','""')+'"';
   }).join(';')).join('\r\n');
  const blob=new Blob(['\ufeff'+csv([names,...monthly.map(extract)])],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='trenerki-afiliacja-'+month+'.csv';document.body.appendChild(a);a.click();a.remove();
  URL.revokeObjectURL(url);
 }
 const totals=partners.reduce((a,p)=>({pending:a.pending+(p.totals?.pending_grosze||0),
  approved:a.approved+(p.totals?.approved_grosze||0),transferred:a.transferred+(p.totals?.transferred_grosze||0),
  sales:a.sales+(p.totals?.total_sales||0)}),{pending:0,approved:0,transferred:0,sales:0});
 return <ScrollView style={{flex:1,backgroundColor:pale}} contentContainerStyle={{padding:23,paddingBottom:100}}>
  <View style={{width:'100%',maxWidth:1100,alignSelf:'center',gap:18}}>
   <Pressable onPress={()=>router.replace('/admin')} accessibilityRole="link"><Text style={{color:ink,fontWeight:'800'}}>← Panel administratora</Text></Pressable>
   <Text style={{fontSize:12,fontWeight:'900',letterSpacing:2,color:'#66836b'}}>ADMIN · AFILIACJA</Text>
   <Text accessibilityRole="header" style={{fontSize:34,fontWeight:'900',color:ink}}>Partnerzy i prowizje</Text>
   {!!error&&<View style={{padding:14,borderRadius:11,backgroundColor:'#fae9e4'}}><Text style={{color:'#923c29'}}>{error}</Text></View>}
   {busy?<ActivityIndicator size="large" color={ink}/>:<>
    <View style={{padding:17,backgroundColor:'#fff',borderRadius:14,borderWidth:1,borderColor:'#dae9d7',gap:7}}>
     <Text style={{color:ink,fontWeight:'900'}}>Stan programu</Text>
     <Text style={{color:muted}}>Rejestracje: {config?.program_enabled?'włączone':'wstrzymane'} · Prowizja: {config?.commission_percent}% · Okres kontrolny: {config?.hold_days} dni · Próg: {money(config?.payout_min_grosze)}</Text>
     <Text style={{color:config?.payout_enabled&&config?.tax_review_approved?'#327c46':'#915c27',fontWeight:'800'}}>
      {config?.payout_enabled&&config?.tax_review_approved?'Wypłaty dopuszczone':'Wypłaty zablokowane — wymagane zatwierdzenie podatkowe i Stripe'}
     </Text>
    </View>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:11}}>
     {[['Partnerzy',String(partners.length)],['Sprzedaże',String(totals.sales)],['Weryfikowane',money(totals.pending)],['Zatwierdzone',money(totals.approved)],['Przekazane',money(totals.transferred)]].map(([label,val])=>
      <View key={label} style={{minWidth:145,flexGrow:1,padding:15,borderRadius:12,backgroundColor:'#eef4e9',gap:5}}>
       <Text style={{color:muted}}>{label}</Text><Text style={{fontWeight:'900',fontSize:23,color:ink}}>{val}</Text>
      </View>)}
    </View>
    <View style={{backgroundColor:'white',padding:18,borderRadius:15,gap:12}}>
     <Text style={{fontSize:20,fontWeight:'900',color:ink}}>Zestawienie miesięczne dla księgowej</Text>
     <Text style={{color:muted,lineHeight:22}}>Zestawienie pokazuje prowizje wynikające z zakupów w wybranym miesiącu. Wypłaty są oddzielną operacją. CSV zawiera wyłącznie dane partnerów, bez danych kupujących.</Text>
     <TextInput value={month} onChangeText={setMonth} accessibilityLabel="Miesiąc raportu w formacie RRRR-MM" placeholder="2026-11" style={inputStyle}/>
     <Btn text={working==='month'?'Wczytuję…':'Pokaż miesiąc'} onPress={()=>void refreshMonth()} disabled={!!working}/>
     {Platform.OS==='web'&&<Btn text="Pobierz zestawienie CSV dla księgowej" secondary onPress={download}/>}
     {monthly.filter(r=>r.sales>0||r.commission_grosze>0).length===0?<Text style={{color:muted}}>Brak naliczeń w wybranym miesiącu.</Text>:
      monthly.filter(r=>r.sales>0||r.commission_grosze>0).map(r=><View key={r.code} style={{padding:12,borderWidth:1,borderColor:'#edf2e8',borderRadius:10,gap:5}}>
       <Text style={{fontWeight:'800',color:ink}}>{r.legal_name} · {r.code}</Text>
       <Text style={{color:muted}}>Sprzedaże: {r.sales} · Prowizje: {money(r.commission_grosze)} · Oczekuje: {money(r.pending_grosze)} · Zatwierdzone: {money(r.approved_grosze)}</Text>
      </View>)}
    </View>
    <View style={{backgroundColor:'white',padding:18,borderRadius:15,gap:12}}>
     <Text style={{fontSize:20,fontWeight:'900',color:ink}}>Konta partnerów</Text>
     {partners.length===0?<Text style={{color:muted}}>Jeszcze nikt nie zarejestrował się jako partner.</Text>:partners.map(p=>
      <View key={p.partner_id} style={{paddingVertical:14,borderBottomWidth:1,borderColor:'#e6efe5',gap:5}}>
       <Text style={{fontWeight:'900',color:ink}}>{p.legal_name} · {p.code}</Text>
       <Text style={{color:muted}}>Typ: {p.partner_type==='company'?'Firma':'Osoba prywatna'} · {p.status} · PIT/dokumenty: {p.tax_status}</Text>
       <Text style={{color:muted}}>Stripe: {p.stripe_connected?'połączone':'oczekuje'} · Payout: {p.stripe_payouts_enabled?'tak':'nie'} · Transfers: {p.stripe_transfers_enabled?'tak':'nie'}</Text>
       <Text style={{color:muted}}>Prowizje zatwierdzone: {money(p.totals?.approved_grosze)} · Wymagają kontroli: {money(p.totals?.needs_review_grosze)}</Text>
       {p.status==='active'&&<View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>
        <Pressable onPress={()=>{setTaxTarget(p.partner_id);setSuspending('')}}><Text style={{color:'#245d3a',textDecorationLine:'underline'}}>Dokumenty podatkowe</Text></Pressable>
        <Pressable onPress={()=>{setSuspending(p.partner_id);setTaxTarget('')}}><Text style={{color:'#95532a',textDecorationLine:'underline'}}>Zawieś partnera</Text></Pressable>
       </View>}
       {taxTarget===p.partner_id&&<View style={{backgroundColor:'#f2f6ed',padding:13,borderRadius:10,gap:11}}>
        <Text style={{color:ink,fontWeight:'800'}}>Zatwierdzenie dokumentów podatkowych · po konsultacji z księgową</Text>
        <TextInput value={taxEvidence} onChangeText={setTaxEvidence} style={inputStyle} placeholder="Numer opinii/dokumentu księgowej (min. 12 znaków)"/>
        <Pressable accessibilityRole="checkbox" accessibilityState={{checked:taxConfirmed}} onPress={()=>setTaxConfirmed(v=>!v)}><Text style={{color:ink,fontWeight:'700'}}>{taxConfirmed?'☑':'☐'} Potwierdzam rzeczywistą weryfikację dokumentów</Text></Pressable>
        <Btn text="Zatwierdź dokumenty podatkowe" disabled={!!working||!taxConfirmed||taxEvidence.trim().length<12} onPress={()=>void verifyTax()}/>
       </View>}
       {suspending===p.partner_id&&<View style={{backgroundColor:'#f8f1e9',padding:13,borderRadius:10,gap:11}}>
        <Text style={{color:ink,fontWeight:'800'}}>Zawieszenie konta — podaj powód dla audytu</Text>
        <TextInput value={reason} onChangeText={setReason} style={inputStyle} placeholder="Co najmniej 10 znaków"/>
        <Btn text="Zawieś partnera" disabled={!!working||reason.trim().length<10} onPress={()=>void suspend()}/>
       </View>}
      </View>)}
    </View>
   </>}
  </View>
 </ScrollView>;
}
