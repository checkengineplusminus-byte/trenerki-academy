import React,{useEffect,useState} from 'react';
import {ActivityIndicator,Pressable,Text,TextInput,View} from 'react-native';
import {supabase} from '../supabase';
import {safeContact,type Contact} from './directory';

const ink='#183b2c';
const fields=[
 ['name','Nazwa instytucji',160],['phone','Numer telefonu (jeśli dotyczy)',24],
 ['url','Adres strony HTTPS',350],['description','Zakres pomocy',600],['hours','Godziny działania',280]
] as const;

export default function ContactEditor(){
 const [rows,setRows]=useState<Contact[]>([]);
 const [selected,setSelected]=useState('');
 const [draft,setDraft]=useState<Contact|null>(null);
 const [order,setOrder]=useState('');
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [notice,setNotice]=useState('');
 useEffect(()=>{
  let active=true;
  void supabase.from('ta_support_contacts').select('id,category,name,phone,url,description,hours,sort_order').order('sort_order').then(({data,error})=>{
   if(!active)return;
   if(error||!data)setNotice('Nie udało się pobrać kontaktów.');
   else setRows(data);
   setLoading(false);
  });
  return()=>{active=false};
 },[]);
 function edit(row:Contact){
  setSelected(row.id);setDraft(row);setOrder(String(row.sort_order));setNotice('');
 }
 async function save(){
  if(!draft||saving)return;
  const next={...draft,name:draft.name.trim(),phone:draft.phone?.trim()||null,url:draft.url.trim(),description:draft.description.trim(),hours:draft.hours.trim(),sort_order:Number(order)};
  if(!safeContact(next)||next.name.length<2||next.description.length<5||next.hours.length<3||!/^\d{1,5}$/.test(order)||next.sort_order>10000){
   setNotice('Sprawdź nazwę, numer telefonu, adres HTTPS, opis, godziny i kolejność od 0 do 10 000.');return;
  }
  setSaving(true);setNotice('');
  try{
   const {data,error}=await supabase.rpc('ta_update_support_contact',{
    p_id:next.id,p_name:next.name,p_phone:next.phone,p_url:next.url,
    p_description:next.description,p_hours:next.hours,p_sort_order:next.sort_order
   });
   if(error||!data){setNotice(error?.code==='42501'?'Edycja wymaga uprawnień administratora.':'Zapis się nie powiódł. Sprawdź dane i spróbuj ponownie.');return;}
   setRows(values=>values.map(row=>row.id===next.id?next:row).sort((a,b)=>a.sort_order-b.sort_order));
   setDraft(next);setNotice('Kontakt został zapisany.');
  }catch{setNotice('Zapis się nie powiódł. Spróbuj ponownie.');}
  finally{setSaving(false)}
 }
 return <View style={{gap:12,padding:18,borderRadius:14,borderWidth:1,borderColor:'#d6e4d2',backgroundColor:'white'}}>
  <Text accessibilityRole="header" style={{fontWeight:'900',fontSize:21,color:ink}}>Kontakty pomocowe</Text>
  <Text style={{color:ink,lineHeight:21}}>Przed zapisaniem porównaj dane z oficjalną stroną instytucji. Numer alarmowy 112 jest stałym elementem strony pomocy.</Text>
  {loading&&<ActivityIndicator color={ink}/>}
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>
   {rows.map(row=><Pressable key={row.id} disabled={saving} accessibilityRole="button" accessibilityState={{selected:selected===row.id}} onPress={()=>edit(row)} style={{minHeight:44,justifyContent:'center',padding:9,borderRadius:8,backgroundColor:selected===row.id?'#d7ead3':'#eff5ed'}}>
    <Text style={{color:ink,fontWeight:'700'}}>{row.name}</Text></Pressable>)}
  </View>
  {!!draft&&<>
   {fields.map(([key,label,maxLength])=><View key={key} style={{gap:4}}>
    <Text style={{color:ink,fontWeight:'700'}}>{label}</Text>
    <TextInput editable={!saving} accessibilityLabel={label} autoCapitalize="none" value={draft[key]||''} maxLength={maxLength} multiline={key==='description'||key==='hours'}
     onChangeText={value=>setDraft(old=>old&&({...old,[key]:value}))} style={{color:ink,borderWidth:1,borderColor:'#a9bea8',padding:10,borderRadius:7,minHeight:44}}/>
   </View>)}
   <Text style={{color:ink,fontWeight:'700'}}>Kolejność</Text>
   <TextInput editable={!saving} accessibilityLabel="Kolejność" keyboardType="number-pad" maxLength={5} value={order} onChangeText={setOrder} style={{color:ink,borderWidth:1,borderColor:'#a9bea8',padding:10,borderRadius:7}}/>
   <Pressable disabled={saving} accessibilityRole="button" onPress={()=>void save()} style={{backgroundColor:ink,padding:12,borderRadius:8,minHeight:44}}>
    <Text style={{color:'white',fontWeight:'800'}}>{saving?'Zapisuję…':'Zapisz kontakt'}</Text></Pressable>
  </>}
  {!!notice&&<Text accessibilityRole="alert" style={{color:ink}}>{notice}</Text>}
 </View>;
}
