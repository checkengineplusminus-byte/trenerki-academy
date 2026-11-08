import React,{useEffect,useState} from 'react';
import {ScrollView,View,Text,Pressable,ActivityIndicator,Linking} from 'react-native';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {supabase} from '../src/supabase';
type Course={slug:string,title_pl:string,description_pl:string|null,category_pl:string|null,price_grosze:number};
const dark='#173228';
export default function Purchase(){
 const {course}=useLocalSearchParams<{course?:string}>(),slug=typeof course==='string'?course:'';
 const router=useRouter(),[item,setItem]=useState<Course|null>(null),[email,setEmail]=useState(''),[busy,setBusy]=useState(true),[paying,setPaying]=useState(false),[owned,setOwned]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{let active=true;void (async()=>{
  if(!slug){if(active){setMessage('Wybierz kurs z katalogu.');setBusy(false);}return;}
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser();
   if(authError||!user){router.replace({pathname:'/konto',params:{course:slug,next:'kup'}});return;}
   if(active)setEmail(user.email||'');
   const [{data:c,error:ce},{data:en,error:ee}]=await Promise.all([
    supabase.from('ta_courses').select('slug,title_pl,description_pl,category_pl,price_grosze').eq('slug',slug).eq('published',true).maybeSingle(),
    supabase.from('ta_enrollments').select('id').eq('course_slug',slug).eq('user_id',user.id).eq('status','active').gt('expires_at',new Date().toISOString()).limit(1)]);
   if(ce||ee)throw ce||ee;
   if(!c)throw new Error('Nie znaleziono kursu.');
   if(active){setItem(c);setOwned(!!en?.length);}
  }catch(e:any){if(active)setMessage(e?.message||'Nie udało się pobrać kursu.');}
  finally{if(active)setBusy(false);}
 })();return()=>{active=false}},[slug]);
 async function enroll(){
  if(!item)return;setPaying(true);setMessage('');
  try{
   const functionName=item.price_grosze===0?'ta-enroll-free':'ta-create-checkout';
   const {data,error}=await supabase.functions.invoke(functionName,{body:{course_slug:item.slug}});
   if(error){
    let code='';
    try{const ctx=(error as any).context;if(ctx&&typeof ctx.json==='function'){const result=await ctx.json();code=String(result?.error||'');}}catch(_){}
    if(code==='payments_not_configured')throw new Error('Płatności online nie zostały jeszcze uruchomione. Kurs jest zapisany jako wybrany, ale nie pobraliśmy żadnych pieniędzy.');
    if(code==='already_purchased'||code==='already_enrolled_or_expired')throw new Error('Ten kurs jest już powiązany z Twoim kontem. Sprawdź Moje kursy.');
    if(code==='confirmed_login_required'||code==='login_required'){router.replace({pathname:'/konto',params:{course:slug,next:'kup'}});return;}
    throw new Error('Nie można teraz zrealizować zamówienia. '+(code&&code!=='checkout_unavailable'?'Kod: '+code:'Spróbuj ponownie później.'));
   }
   if(item.price_grosze===0&&data?.ok){router.replace('/moje-kursy');return;}
   if(typeof data?.url==='string'&&/^https:\/\/checkout\.stripe\.com\//.test(data.url)){await Linking.openURL(data.url);return;}
   throw new Error('Płatność nie jest jeszcze dostępna.');
  }catch(e:any){setMessage(e?.message||'Nie udało się dokończyć.');}
  finally{setPaying(false);}
 }
 return <ScrollView style={{backgroundColor:'#fcfcf7',flex:1}} contentContainerStyle={{padding:22,minHeight:'100%',justifyContent:'center'}}>
 <View style={{width:'100%',maxWidth:720,alignSelf:'center'}}>
  <Pressable onPress={()=>router.replace('/')} style={{marginBottom:24}}><Text style={{color:'#456748',fontWeight:'800'}}>← Wróć do katalogu</Text></Pressable>
  <Text style={{color:'#65876a',fontSize:12,letterSpacing:2,fontWeight:'900',marginBottom:10}}>TRENERKI ACADEMY · ZAMÓWIENIE</Text>
  <Text style={{fontSize:37,color:dark,fontWeight:'900',marginBottom:12}}>Twój wybrany kurs.</Text>
  <Text style={{color:'#57745e',fontSize:16,marginBottom:22}}>Najpierw konto, potem decyzja o zakupie. Twoje dane pozostają na koncie — nie musisz rejestrować się dwa razy.</Text>
  {busy&&<ActivityIndicator/>}
  {!!item&&<View style={{backgroundColor:'white',borderWidth:1,borderColor:'#dfe9d9',borderRadius:20,padding:25}}>
   <Text style={{color:'#66836c',fontWeight:'700',fontSize:12}}>{item.category_pl||'KURS ONLINE'}</Text>
   <Text style={{color:dark,fontSize:24,fontWeight:'900',marginTop:7}}>{item.title_pl}</Text>
   <Text style={{color:'#66806c',marginTop:11,lineHeight:22}}>{item.description_pl}</Text>
   <View style={{borderTopWidth:1,borderColor:'#e3eae0',marginTop:20,paddingTop:20,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
    <Text style={{fontWeight:'700',color:'#526956'}}>Cena całkowita</Text>
    <Text style={{fontSize:27,fontWeight:'900',color:dark}}>{item.price_grosze===0?'GRATIS':(item.price_grosze/100).toFixed(0)+' zł'}</Text>
   </View>
   <Text style={{color:'#5b7763',fontSize:13,marginTop:9}}>Zalogowano: {email}</Text>
   {owned?<View style={{backgroundColor:'#e9f3de',padding:16,borderRadius:12,marginTop:20}}>
    <Text style={{color:dark,fontWeight:'800',marginBottom:10}}>Masz już aktywny dostęp.</Text>
    <Pressable onPress={()=>router.replace({pathname:'/nauka',params:{course:slug}})} style={{backgroundColor:dark,padding:15,borderRadius:11,alignItems:'center'}}><Text style={{color:'white',fontWeight:'800'}}>Przejdź do nauki →</Text></Pressable>
   </View>:<Pressable disabled={paying} onPress={enroll} style={{backgroundColor:dark,padding:16,borderRadius:12,alignItems:'center',marginTop:20,opacity:paying?.6:1}}>
    <Text style={{color:'white',fontWeight:'900'}}>{paying?'Przetwarzanie…':item.price_grosze===0?'Odbierz kurs za darmo →':'Kup kurs i przejdź do płatności →'}</Text>
   </Pressable>}
   {item.price_grosze>0&&<Text style={{color:'#758574',fontSize:12,marginTop:12}}>Płatność zostanie zrealizowana wyłącznie u operatora płatności, gdy integracja będzie aktywna. Nie wpisuj danych karty na tej stronie.</Text>}
   {item.price_grosze===0&&<Text style={{color:'#758574',fontSize:12,marginTop:12}}>Darmowy kurs świąteczny ma charakter humorystyczny. Nie daje formalnych uprawnień zawodowych.</Text>}
  </View>}
  {!!message&&<Text style={{backgroundColor:'#f5eee0',borderColor:'#e6d9bf',borderWidth:1,padding:15,borderRadius:12,color:'#77562d',marginTop:16}}>{message}</Text>}
  <Pressable onPress={()=>router.replace('/moje-kursy')} style={{padding:16,alignItems:'center'}}><Text style={{color:dark,fontWeight:'800'}}>Moje kursy</Text></Pressable>
 </View></ScrollView>
}
