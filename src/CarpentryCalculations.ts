export type Field={key:string;label:string;initial:string;unit:string};
export type Problem={
 title:string;goal:string;fields:Field[];unit:string;
 calculate:(v:Record<string,number>)=>number;
 tip:string;expectedLabel:string;
};
export const examples:Record<number,Problem>={
 1:{title:'Oblicz objętość tarcicy',goal:'Oblicz m³ dla zadanej liczby desek. Najpierw zamień wszystkie milimetry na metry.',
  fields:[{key:'thickness',label:'Grubość',initial:'40',unit:'mm'},{key:'width',label:'Szerokość',initial:'200',unit:'mm'},{key:'length',label:'Długość',initial:'4000',unit:'mm'},{key:'count',label:'Liczba sztuk',initial:'6',unit:'szt.'}],
  unit:'m³',calculate:v=>v.thickness*v.width*v.length*v.count/1e9,
  tip:'Pamiętaj, że mnożysz trzy wielkości długości wyrażone w metrach, a potem liczbę sztuk.',
  expectedLabel:'Objętość łączna'},
 8:{title:'Sprawdź przekątną ramy',goal:'Na podstawie dwóch prostopadłych boków oblicz przekątną zgodnie z Pitagorasem.',
  fields:[{key:'a',label:'Bok A',initial:'2,4',unit:'m'},{key:'b',label:'Bok B',initial:'3,2',unit:'m'}],
  unit:'m',calculate:v=>Math.hypot(v.a,v.b),
  tip:'Podnieś oba boki do kwadratu, dodaj wyniki i wyciągnij pierwiastek.',
  expectedLabel:'Przekątna ramy'},
 18:{title:'Oblicz przełożenie kół pasowych',goal:'Oblicz średnicę koła na wale obrabiarki dla podanych obrotów. Wzór zakłada brak poślizgu i opisuje przykład teoretyczny.',
  fields:[{key:'rpmMotor',label:'Obroty silnika',initial:'1200',unit:'obr./min'},{key:'diamMotor',label:'Koło silnika',initial:'10',unit:'cm'},{key:'rpmMachine',label:'Obroty wału',initial:'2400',unit:'obr./min'}],
  unit:'cm',calculate:v=>v.rpmMotor*v.diamMotor/v.rpmMachine,
  tip:'Jeżeli wał ma obracać się dwa razy szybciej od silnika, idealne koło napędzane musi być dwa razy mniejsze.',
  expectedLabel:'Średnica koła na wale'},
 23:{title:'Policz wilgotność metodą wagową',goal:'Wilgotność drewna obliczasz względem masy suchej próbki.',
  fields:[{key:'wet',label:'Masa przed suszeniem',initial:'12,4',unit:'kg'},{key:'dry',label:'Masa całkiem sucha',initial:'10',unit:'kg'}],
  unit:'%',calculate:v=>(v.wet-v.dry)/v.dry*100,
  tip:'Odejmij masę suchą, aby uzyskać masę wody. Podziel tę różnicę przez masę suchą.',
  expectedLabel:'Wilgotność'},
 56:{title:'Oblicz cenę z dodatkiem procentowym',goal:'Procent dodatku liczymy od ceny bazowej, a następnie dodajemy do niej otrzymaną kwotę.',
  fields:[{key:'base',label:'Cena bazowa',initial:'35',unit:'zł'},{key:'surcharge',label:'Dodatek',initial:'18',unit:'%'}],
  unit:'zł',calculate:v=>v.base*(1+v.surcharge/100),
  tip:'Dla dodatku 18% pomnóż cenę bazową przez 0,18.',
  expectedLabel:'Cena łączna'},
 58:{title:'Sprawdź przekątną ze szkicu',goal:'Oblicz przekątną ramy w projekcie teoretycznym. To podstawa kontroli kąta prostego.',
  fields:[{key:'a',label:'Długość A',initial:'3',unit:'m'},{key:'b',label:'Długość B',initial:'4',unit:'m'}],
  unit:'m',calculate:v=>Math.hypot(v.a,v.b),
  tip:'Podstaw kwadraty dwóch boków i wyciągnij pierwiastek z ich sumy.',
  expectedLabel:'Przekątna'}
};
export const hasCarpentryLab=(lessonNo:number)=>Object.prototype.hasOwnProperty.call(examples,lessonNo);

export function readCarpentryNumber(value:string){
 const cleaned=value.trim().replace(/[\s\u00a0]/g,'').replace(',','.');
 return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(cleaned)?Number(cleaned):NaN;
}
export function sampleValues(problem:Problem){
 return Object.fromEntries(problem.fields.map(field=>[field.key,field.initial]));
}
export function calculateCarpentry(problem:Problem,values:Record<string,string>){
 const parsed:Record<string,number>={};
 for(const field of problem.fields){
  const value=readCarpentryNumber(values[field.key]??'');
  if(!Number.isFinite(value)||(field.key==='surcharge'?value<0:value<=0)){
   return {error:'Uzupełnij „'+field.label+'” '+(field.key==='surcharge'?'liczbą równą zero lub dodatnią.':'dodatnią liczbą.')};
  }
  parsed[field.key]=value;
 }
 if('count' in parsed&&!Number.isSafeInteger(parsed.count))return {error:'Liczba sztuk musi być liczbą całkowitą.'};
 if('wet' in parsed&&parsed.wet<parsed.dry)return {error:'Masa przed suszeniem musi być co najmniej równa masie suchej.'};
 const value=problem.calculate(parsed);
 if(!Number.isFinite(value))return {error:'Te dane wykraczają poza zakres obliczeń.'};
 return {values:parsed,value};
}
export function formatCarpentry(value:number){
 return value>0&&value<0.000001?value.toExponential(3).replace('.',','):value.toLocaleString('pl-PL',{maximumFractionDigits:6});
}
export function explainCarpentry(lessonNo:number,v:Record<string,number>,value:number){
 const f=formatCarpentry,result=f(value)+' '+examples[lessonNo].unit;
 if(lessonNo===1)return '('+f(v.thickness)+' ÷ 1000) × ('+f(v.width)+' ÷ 1000) × ('+f(v.length)+' ÷ 1000) × '+f(v.count)+' = '+result;
 if(lessonNo===8||lessonNo===58)return '√('+f(v.a)+'² + '+f(v.b)+'²) = '+result;
 if(lessonNo===18)return '('+f(v.rpmMotor)+' × '+f(v.diamMotor)+') ÷ '+f(v.rpmMachine)+' = '+result;
 if(lessonNo===23)return '('+f(v.wet)+' − '+f(v.dry)+') ÷ '+f(v.dry)+' × 100 = '+result;
 if(lessonNo===56)return f(v.base)+' × (1 + '+f(v.surcharge)+' ÷ 100) = '+result;
 return result;
}
