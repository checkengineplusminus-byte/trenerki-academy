import React,{useState} from 'react';
import {View,Text,Pressable,TextInput,ScrollView} from 'react-native';
import {parseSpreadsheetNumber} from './SpreadsheetFormula';

type Platform='google'|'meta';
type Props={slug:string;lessonNo:number};
const green='#194d35',gray='#496354',line='#d2dfd0';
const groups={
 google:[
 {name:'Kampania',fields:'Cel, lokalizacja, budżet dzienny, typ kampanii',why:'Kampania określa cel, budżet i podstawowe ustawienia. Nie każda kampania używa słów kluczowych.'},
 {name:'Grupa reklam',fields:'Temat, słowa kluczowe w kampanii Search, powiązane reklamy',why:'Grupuj intencje, aby tekst reklam i strona odpowiadały temu, czego użytkownik szuka.'},
 {name:'Reklama',fields:'Nagłówek, komunikat, docelowy URL, zasoby',why:'Tekst ma opisywać rzeczywistą ofertę; najpierw zweryfikuj stronę docelową.'},
 {name:'Konwersje',fields:'Formularz, zakup, połączenie, identyfikator zdarzenia',why:'Kliknięcie to nie to samo co zakup. Pomiar konwersji musi być przetestowany.'}
 ],
 meta:[
 {name:'Kampania',fields:'Cel kampanii, struktura i wybór rodzaju optymalizacji',why:'Cel powinien wynikać z realnego działania klienta, a nie z chęci zdobycia samych wyświetleń.'},
 {name:'Zestaw reklam',fields:'Budżet lub podział budżetu, grupa odbiorców, harmonogram, umiejscowienia',why:'Nie łącz ustawienia odbiorców ze zmianą kreacji, jeśli chcesz uczciwie przeprowadzić test.'},
 {name:'Reklama',fields:'Materiały wideo lub obraz, tekst, wezwanie do działania, adres',why:'Kreacja ma jasno opisać ofertę. Nie sugeruj gwarantowanych wyników i nie ukrywaj opłat.'},
 {name:'Pomiar',fields:'Zdarzenie, źródło danych, atrybucja i zgodność z prywatnością',why:'Wynik raportu zależy od sposobu mierzenia i okresu atrybucji. Nie utożsamiaj go z gwarantowaną sprzedażą.'}
 ]
};

const number=(s:string)=>parseSpreadsheetNumber(s);
export const hasCampaignLab=(slug:string)=>slug==='google-ads-promocja'||slug==='facebook-ads-promocja';
export default function CampaignWorkshop({slug,lessonNo}:Props){
 const platform:Platform=slug==='google-ads-promocja'?'google':'meta';
 const [step,setStep]=useState(0),[budget,setBudget]=useState('100'),[cpc,setCpc]=useState('2.50'),[conversion,setConversion]=useState('4'),[leadValue,setLeadValue]=useState('80'),[negative,setNegative]=useState(''),
 [checked,setChecked]=useState(false);
 const daily=number(budget),clickCost=number(cpc),rate=number(conversion),value=number(leadValue);
 const valid=[budget,cpc,conversion,leadValue].every(x=>x.trim()!=='')&&[daily,clickCost,rate,value].every(Number.isFinite)&&daily>=0&&clickCost>0&&rate>=0&&rate<=100&&value>=0;
 const clicks=valid?daily/clickCost:0,leads=clicks*rate/100,cpa=valid&&leads>0?daily/leads:null,
 revenue=leads*value,net=revenue-daily;
 const options=groups[platform];
 return <View style={{marginVertical:14,borderWidth:1,borderColor:line,borderRadius:16,backgroundColor:'#f6faf3',overflow:'hidden'}}>
  <View style={{padding:15,backgroundColor:'#e6f1e2',gap:5}}>
   <Text style={{color:green,fontWeight:'900',fontSize:17}}>{platform==='google'?'Google Ads':'Meta Ads'} — warsztat kampanii</Text>
   <Text style={{fontSize:13,lineHeight:20,color:gray}}>Interaktywna symulacja szkoleniowa. Poznajesz strukturę i liczysz wynik na danych próbnych; to nie jest prawdziwy panel reklamowy ani prognoza platformy.</Text>
   <Text style={{color:gray,fontSize:12}}>Lekcja {lessonNo+1} · ustawienia i rozliczanie wyników</Text>
  </View>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{padding:10,gap:5}}>
    {options.map((x,i)=><Pressable accessibilityRole="button" key={x.name} onPress={()=>setStep(i)} style={{paddingVertical:10,paddingHorizontal:13,borderRadius:9,backgroundColor:step===i?green:'#fff',borderWidth:1,borderColor:step===i?green:line}}>
      <Text style={{color:step===i?'#fff':green,fontSize:12,fontWeight:'800'}}>{i+1} · {x.name}</Text>
    </Pressable>)}
  </ScrollView>
  <View style={{paddingHorizontal:15,paddingBottom:13,gap:7}}>
   <Text style={{fontWeight:'900',fontSize:16,color:green}}>{options[step].name}</Text>
   <Text style={{fontSize:14,lineHeight:21,color:gray}}>{options[step].fields}</Text>
   <Text style={{fontSize:13,lineHeight:20,color:green}}>{options[step].why}</Text>
  </View>
  <View style={{backgroundColor:'#fff',padding:15,borderTopWidth:1,borderColor:line,gap:12}}>
   <Text style={{fontSize:15,fontWeight:'900',color:green}}>Laboratorium kosztów — licz samodzielnie</Text>
   <Text style={{fontSize:12,color:gray}}>Dane ćwiczebne (nie rzeczywista statystyka reklam)</Text>
   {([
    ['Budżet dzienny (zł)',budget,setBudget],
    ['Średni CPC (zł za kliknięcie)',cpc,setCpc],
    ['Współczynnik konwersji (%)',conversion,setConversion],
    ['Wartość jednego leada (zł)',leadValue,setLeadValue]
   ] as [string,string,(s:string)=>void][]).map(([label,val,setVal])=><View key={label} style={{gap:3}}>
      <Text style={{fontSize:12,color:gray,fontWeight:'700'}}>{label}</Text>
      <TextInput value={val} onChangeText={x=>{setVal(x);setChecked(false)}} keyboardType="decimal-pad" accessibilityLabel={label} style={{borderWidth:1,borderColor:line,borderRadius:8,padding:10,color:green,backgroundColor:'#fff',fontSize:15}} />
   </View>)}
   {!valid&&<Text accessibilityRole="alert" style={{color:'#8a3d31',fontSize:13,fontWeight:'800'}}>Sprawdź dane: wpisz liczby dodatnie, CPC większe od zera i konwersję od 0 do 100%.</Text>}
   {valid&&<View style={{backgroundColor:'#eef5eb',borderRadius:10,padding:12,gap:5}}>
    <Text style={{color:green,fontSize:13}}>Szacowane kliknięcia: <Text style={{fontWeight:'900'}}>{clicks.toFixed(1)}</Text></Text>
    <Text style={{color:green,fontSize:13}}>Szacowane konwersje: <Text style={{fontWeight:'900'}}>{leads.toFixed(2)}</Text></Text>
    <Text style={{color:green,fontSize:13}}>Koszt jednej konwersji: <Text style={{fontWeight:'900'}}>{cpa===null?'brak danych':cpa.toFixed(2)+' zł'}</Text></Text>
    <Text style={{color:green,fontSize:13}}>Wartość hipotetyczna − wydatek: <Text style={{fontWeight:'900'}}>{net.toFixed(2)} zł</Text></Text>
   </View>}
   <Text style={{fontSize:12,color:gray,lineHeight:18}}>Uwaga: wartość leada nie jest automatycznie przychodem ani zyskiem. Model nie uwzględnia kosztu produktu, stałych wydatków, atrybucji ani rzeczywistej zmienności aukcji reklamowych.</Text>
   {platform==='google'&&<View style={{gap:4}}>
     <Text style={{fontSize:12,color:gray,fontWeight:'800'}}>Przykład wykluczenia słowa kluczowego (Search)</Text>
     <TextInput value={negative} onChangeText={setNegative} placeholder="np. za darmo" style={{borderWidth:1,borderColor:line,borderRadius:8,padding:10,fontSize:14,color:green}} />
     <Text style={{color:gray,fontSize:12,lineHeight:18}}>Przykład wymaga kontroli raportu wyszukiwanych haseł; wykluczenie nie gwarantuje identycznego działania dla wszystkich typów kampanii.</Text>
   </View>}
   <Pressable accessibilityRole="button" disabled={!valid} onPress={()=>setChecked(true)} style={{padding:13,backgroundColor:valid?green:"#a0b4a7",borderRadius:10}}>
     <Text style={{color:'#fff',fontWeight:'900',textAlign:'center'}}>Sprawdź wynik ćwiczenia</Text>
   </Pressable>
   {checked&&<Text style={{fontSize:13,lineHeight:20,color:green}}>Wynik obliczony. Teraz porównaj CPC, liczbę kliknięć i koszt konwersji. Ustal, czy zdarzenie jest prawdziwą konwersją, a nie tylko kliknięciem. {negative?'Wykluczenie „'+negative+'” wymaga weryfikacji na danych wyszukiwanych haseł.':''}</Text>}
  </View>
 </View>;
}
