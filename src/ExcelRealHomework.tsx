import React,{useEffect,useState} from 'react';
import {Linking,Platform,Pressable,Text,TextInput,View,useWindowDimensions} from 'react-native';
import homeworkData from '../content/excel-real-homework-30.json';
import {checkExcelHomeworkAnswer,homeworkLabel,homeworkPlaceholder,type ExcelHomework} from './excelHomeworkAnswers';

const lessons=homeworkData.lessons as ExcelHomework[];
const ink='#163d2b',muted='#526f60',border='#c0d8c8',accent='#235f40';
const desktopOnly=new Set([10,16,21,25,26,27,28,29]);

function DownloadFile({file,label,id}:{file:string;label:string;id:string}){
 const href=file.startsWith('/academy/assets/')?file:'/academy/assets/excel-homework-basics.csv';
 return <View style={{marginTop:2}}>
  {Platform.OS==='web'?
   <a data-testid={id} href={href} download style={{
    display:'inline-flex',alignItems:'center',minHeight:48,padding:'11px 13px',
    borderRadius:9,border:'1px solid #86b99a',backgroundColor:'#e5f2e8',
    fontWeight:800,fontSize:13,textDecoration:'underline',color:'#1d6645',maxWidth:'100%',overflowWrap:'anywhere'
   }}>{label}</a>:
   <Pressable testID={id} accessibilityRole="link" accessibilityLabel={label}
    onPress={()=>void Linking.openURL('https://trenerki.com'+href)}
    style={{minHeight:48,padding:11,backgroundColor:'#e5f2e8',borderWidth:1,borderColor:'#86b99a',borderRadius:9,justifyContent:'center'}}>
    <Text style={{fontSize:13,fontWeight:'900',color:accent,textDecorationLine:'underline'}}>{label}</Text>
   </Pressable>}
 </View>;
}

export default function ExcelRealHomework({lessonNo}:{lessonNo:number}){
 const item=lessons.find(x=>x.lessonNo===lessonNo);
 const {width}=useWindowDimensions(),compact=width<650;
 const [expanded,setExpanded]=useState(lessonNo===0);
 const [checked,setChecked]=useState<number[]>([]);
 const [answer,setAnswer]=useState(''),[message,setMessage]=useState(''),[valid,setValid]=useState(false);
 const [solution,setSolution]=useState(false);
 const [evidence,setEvidence]=useState<number[]>([]);
 useEffect(()=>{setExpanded(lessonNo===0);setChecked([]);setAnswer('');setMessage('');setValid(false);setSolution(false);setEvidence([]);},[lessonNo]);
 if(!item)return null;
 const check=()=>{
  const r=checkExcelHomeworkAnswer(item,answer);
  setValid(r.correct);setMessage(r.feedback);
 };
 const toggle=(number:number,kind:'steps'|'checks')=>{
  const setter=kind==='steps'?setChecked:setEvidence;
  setter(old=>old.includes(number)?old.filter(x=>x!==number):[...old,number]);
 };
 return <View testID={'excel-real-homework-'+lessonNo}
  style={{marginVertical:12,borderWidth:1,borderColor:'#b7d5c1',borderRadius:17,overflow:'hidden',backgroundColor:'#f5faf6'}}>
  <Pressable testID="excel-homework-toggle" accessibilityRole="button" accessibilityState={{expanded}}
   onPress={()=>setExpanded(v=>!v)}
   style={{minHeight:76,padding:compact?13:17,backgroundColor:'#dfefe4',gap:6}}>
   <Text style={{fontSize:11,color:'#356d4b',fontWeight:'900'}}>PRACA DOMOWA W PRAWDZIWYM EXCELU · {lessonNo+1}/30</Text>
   <Text style={{fontSize:compact?17:20,fontWeight:'900',color:ink,lineHeight:compact?25:29}}>{item.title}</Text>
   <Text style={{color:muted,fontSize:12,lineHeight:20}}>{item.minutes} minut · własny plik XLSX · zadanie dodatkowe, bez resetowania zaliczeń</Text>
   <Text style={{color:accent,fontSize:13,fontWeight:'900'}}>{expanded?'Zwiń zadanie ▴':'Otwórz zadanie i pobierz plik ćwiczebny ▾'}</Text>
  </Pressable>
  {expanded&&<View style={{padding:compact?12:17,gap:15}}>
   <View style={{gap:6}}>
    <Text style={{fontSize:15,fontWeight:'900',color:ink}}>Cel: {item.goal}</Text>
    <Text style={{fontSize:13,lineHeight:23,color:muted}}>{item.why}</Text>
   </View>
   <View style={{padding:12,backgroundColor:'white',borderRadius:11,borderWidth:1,borderColor:'#d6e8d9',gap:8}}>
    <Text style={{fontWeight:'900',color:ink,fontSize:14}}>1. Pobierz dane i otwórz Microsoft Excel</Text>
    <Text style={{fontSize:12,lineHeight:20,color:muted}}>Plik CSV zawiera fikcyjne dane startowe. Otwórz go przez Dane → Z tekstu/CSV, wybierz separator średnik i sprawdź typy liczb oraz kodów. Następnie zapisz jako XLSX, aby zachować kolejne formuły i arkusze.</Text>
    <DownloadFile id="excel-homework-download" file={item.starter.file} label={'Pobierz: '+item.starter.label}/>
    {item.comparisonStarter&&<View style={{gap:6}}>
      <Text style={{fontSize:12,fontWeight:'900',color:accent}}>Drugi plik potrzebny do porównania danych</Text>
      <DownloadFile id="excel-homework-comparison-download" file={item.comparisonStarter.file} label={'Plik porównawczy: '+item.comparisonStarter.label}/>
    </View>}
    {item.bonusStarter&&<View style={{gap:7,marginTop:4}}>
     <Text style={{fontSize:12,fontWeight:'900',color:accent}}>Rozszerzenie dla ambitnych — po głównym zadaniu</Text>
     <Text style={{fontSize:12,lineHeight:21,color:muted}}>{item.bonusTask}</Text>
     <DownloadFile id="excel-homework-bonus-download" file={item.bonusStarter.file} label={'Dodatkowe dane: '+item.bonusStarter.label}/>
    </View>}
    <Text style={{fontSize:12,lineHeight:20,color:'#866331'}}>Jeśli pracujesz na telefonie i brakuje poleceń Excel, wykonaj tę pracę na komputerze. Funkcje, import i drukowanie zależą od posiadanej wersji programu. {desktopOnly.has(lessonNo)?'Ten temat najlepiej wykonywać w Excelu na komputerze.':''}</Text>
   </View>
   <View style={{padding:12,backgroundColor:'#eaf4ed',borderRadius:11,gap:8}}>
    <Text style={{fontSize:14,color:accent,fontWeight:'900'}}>2. Najpierw prosty przykład</Text>
    <Text style={{fontSize:13,lineHeight:23,color:ink}}>{item.example}</Text>
    <Text style={{fontSize:12,lineHeight:20,color:muted}}>Przykład wyjaśnia zasadę. Poniżej wykonasz własny wariant — nie zastępuj arkusza samą odpowiedzią z formularza.</Text>
   </View>
   <View style={{gap:10}}>
    <Text style={{fontSize:15,fontWeight:'900',color:ink}}>3. Zrób to krok po kroku w swoim Excelu</Text>
    <Text style={{fontSize:12,lineHeight:19,color:muted}}>Zaznaczaj kroki po wykonaniu ich we własnym pliku. To lista kontrolna, a nie automatyczny zapis postępów.</Text>
    {item.steps.map((step,index)=><Pressable key={index} testID={'excel-homework-step-'+index}
      accessibilityRole="checkbox" accessibilityState={{checked:checked.includes(index)}}
      onPress={()=>toggle(index,'steps')}
      style={{flexDirection:'row',alignItems:'flex-start',gap:10,padding:12,backgroundColor:checked.includes(index)?'#e6f4e9':'white',borderRadius:9,borderWidth:1,borderColor:checked.includes(index)?'#89b59a':border,minHeight:47}}>
      <Text style={{fontSize:18,fontWeight:'900',color:checked.includes(index)?'#2e754c':'#738c7a'}}>{checked.includes(index)?'☑':'□'}</Text>
      <Text style={{flex:1,fontSize:13,lineHeight:22,color:ink}}><Text style={{fontWeight:'900'}}>{index+1}. </Text>{step}</Text>
     </Pressable>)}
    <Text testID="excel-homework-step-progress" style={{fontSize:12,color:accent,fontWeight:'800'}}>Kroki zaznaczone: {checked.length}/{item.steps.length}</Text>
   </View>
   <View style={{padding:12,borderRadius:11,backgroundColor:'white',borderWidth:1,borderColor:border,gap:9}}>
    <Text style={{color:ink,fontWeight:'900',fontSize:15}}>4. Sprawdź wynik z własnego pliku</Text>
    <Text style={{color:ink,fontSize:13,lineHeight:22}}>{homeworkLabel(item.kind)}. Wpisz wynik uzyskany w Microsoft Excel, a nie przepisany z rozwiązania.</Text>
    <TextInput testID="excel-homework-answer" accessibilityLabel="Odpowiedź z pracy domowej w Excelu"
     value={answer} onChangeText={v=>{setAnswer(v);setMessage('');setValid(false);}}
     placeholder={homeworkPlaceholder(item.kind)}
     placeholderTextColor="#789283" autoCorrect={false} autoCapitalize="none"
     keyboardType={['number','count','percent'].includes(item.kind)?'decimal-pad':'default'}
     style={{minHeight:49,borderWidth:1,borderColor:'#a4c7ae',borderRadius:9,backgroundColor:'white',padding:12,fontSize:16,color:ink}}/>
    <Pressable testID="excel-homework-check" accessibilityRole="button" onPress={check}
      style={{minHeight:46,paddingHorizontal:15,paddingVertical:11,backgroundColor:'#265f42',alignSelf:'flex-start',justifyContent:'center',borderRadius:10}}>
      <Text style={{fontSize:13,fontWeight:'900',color:'white'}}>Sprawdź mój wynik z Excela</Text>
    </Pressable>
    {!!message&&<View testID="excel-homework-feedback" accessibilityLiveRegion="polite"
     style={{padding:11,backgroundColor:valid?'#e2f4e6':'#fff3e6',borderRadius:9,borderWidth:1,borderColor:valid?'#9fd3ad':'#efdab6'}}>
     <Text style={{fontSize:13,lineHeight:22,color:valid?'#22613f':'#83572f'}}>{valid?'✓ ':'Uwaga: '}{message}</Text>
    </View>}
    <Text style={{fontSize:11,lineHeight:19,color:muted}}>Ten formularz sprawdza tylko wpisany wynik. Nie odczytujemy pliku XLSX z Twojego urządzenia, więc poprawna liczba nie stanowi dowodu, że wszystkie formuły zostały wykonane samodzielnie.</Text>
   </View>
   <View style={{gap:9}}>
    <Text style={{fontSize:15,fontWeight:'900',color:ink}}>5. Kontrola jakości przed zapisaniem pliku</Text>
    {item.checks.map((criterion,i)=><Pressable key={i} testID={'excel-homework-criterion-'+i}
      accessibilityRole="checkbox" accessibilityState={{checked:evidence.includes(i)}}
      onPress={()=>toggle(i,'checks')}
      style={{flexDirection:'row',gap:9,padding:10,backgroundColor:'white',borderColor:border,borderWidth:1,borderRadius:8,minHeight:44}}>
     <Text style={{fontSize:17,color:accent}}>{evidence.includes(i)?'☑':'□'}</Text>
     <Text style={{flex:1,color:ink,fontSize:13,lineHeight:21}}>{criterion}</Text>
    </Pressable>)}
    <Text testID="excel-homework-criterion-progress" style={{fontSize:12,color:accent,fontWeight:'800'}}>Sprawdzone kryteria: {evidence.length}/{item.checks.length}</Text>
   </View>
   <View style={{padding:11,backgroundColor:'#fff7e8',borderRadius:10,gap:7}}>
    <Text style={{fontSize:13,color:'#82582b',fontWeight:'900'}}>Typowe pomyłki — sprawdź, zanim oddasz</Text>
    {item.mistakes.map((text,i)=><Text key={i} style={{fontSize:12,lineHeight:21,color:'#76552f'}}>• {text}</Text>)}
   </View>
   <View style={{padding:11,backgroundColor:'#eff6ef',borderRadius:10,gap:8}}>
    <Text style={{fontSize:14,color:ink,fontWeight:'900'}}>6. Co zapisać na swoim komputerze?</Text>
    <Text style={{fontSize:13,lineHeight:22,color:ink}}>{item.delivery}</Text>
    <Text style={{fontSize:12,lineHeight:20,color:muted}}>Nazwa pliku głównego: <Text style={{fontWeight:'900'}}>{item.filename}</Text>. Praca nie jest wysyłana do TRENERKI automatycznie. Trzymaj ją u siebie, aby móc później wrócić do każdego ćwiczenia.</Text>
   </View>
   <Pressable testID="excel-homework-solution-toggle" accessibilityRole="button"
    accessibilityState={{expanded:solution}} onPress={()=>setSolution(v=>!v)}
    style={{minHeight:46,justifyContent:'center',alignSelf:'flex-start',paddingVertical:8}}>
    <Text style={{fontSize:13,color:'#2a6d51',fontWeight:'900',textDecorationLine:'underline'}}>{solution?'Ukryj wzorcowy wynik ▴':'Potrzebuję pomocy — pokaż wzorcowy wynik i co sprawdzić ▾'}</Text>
   </Pressable>
   {solution&&<View testID="excel-homework-solution" style={{padding:12,borderRadius:10,backgroundColor:'white',borderWidth:1,borderColor:border,gap:7}}>
    <Text style={{fontSize:13,color:ink,fontWeight:'900'}}>Wzorcowa odpowiedź do tego konkretnego wariantu</Text>
    <Text selectable style={{fontSize:17,fontWeight:'900',color:accent}}>{item.expected}{item.kind==='percent'?'%':item.kind==='number'?' zł':''}</Text>
    <Text style={{fontSize:12,lineHeight:22,color:muted}}>Jeżeli wynik jest inny, wróć do punktu 3 i sprawdź liczby, adresy oraz zastosowane formuły. Rozwiązanie nie oznacza, że Twój plik XLSX przeszedł kontrolę struktury.</Text>
   </View>}
  </View>}
 </View>;
}
