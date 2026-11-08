import React,{useState} from 'react';
import {View,Text,Pressable} from 'react-native';
const ink='#173f2d';
type Term={term:string;meaning:string;example:string};
const terms:Term[]=[
{term:'Hierarchia odpadów',meaning:'Kolejność działań od najbardziej preferowanych: zapobieganie, przygotowanie do ponownego użycia, recykling, inny odzysk, unieszkodliwianie.',example:'Zanim oddasz kurtkę do recyklingu, sprawdź możliwość naprawy.'},
{term:'Zapobieganie',meaning:'Niedopuszczenie do powstania odpadu, np. przez odłożenie niepotrzebnego zakupu.',example:'Nie kupujesz nowej butelki, gdy masz sprawną.'},
{term:'Ponowne użycie',meaning:'Powtórne wykorzystanie produktu do podobnego celu bez zamiany go w nowy surowiec.',example:'Oddajesz sprawny stolik następnej osobie.'},
{term:'Recykling',meaning:'Przetwarzanie odpadów materiałowych lub biologicznych w nowe materiały i produkty; nie oznacza dowolnego wyrzucenia do kolorowego kosza.',example:'Stary karton może dostarczyć włókien do produkcji nowej tektury.'},
{term:'Odpad resztkowy',meaning:'Odpady, których nie należy zbierać w dostępnych osobnych frakcjach; lista zależy od lokalnego systemu.',example:'Nie traktuj resztkowych jak miejsca dla baterii.'},
{term:'BIO / matavfall',meaning:'Wyodrębnione odpady kuchenne lub biodegradowalne. Szczegółowe zasady składu zależą od operatora.',example:'Obierki do odpowiedniej zbiórki; zużyty olej sprawdź osobno.'},
{term:'PSZOK',meaning:'Punkt Selektywnego Zbierania Odpadów Komunalnych w Polsce, przyjmujący określone kategorie odpadów zgodnie z regulaminem gminy.',example:'Przed oddaniem farb sprawdź, jakie ilości i opakowania punkt przyjmuje.'},
{term:'Plastemballasje',meaning:'Norweska nazwa opakowań z plastiku, nie wszystkich przedmiotów wykonanych z tego materiału.',example:'Butelka po szamponie jest opakowaniem, szczoteczka do zębów już nie.'},
{term:'Restavfall',meaning:'Norweska nazwa odpadów pozostałych po prawidłowej segregacji, nie pojemnik na odpady niebezpieczne.',example:'Sprawdź instrukcję gminy, zanim wyrzucisz ceramikę.'},
{term:'Kaucja / pant',meaning:'Zwrotna opłata naliczana dla wybranych, oznakowanych opakowań w odpowiednim systemie.',example:'Zwracasz oznakowaną butelkę w automacie lub punkcie przyjmowania.'},
{term:'Odpady niebezpieczne',meaning:'Odpady mogące stanowić zagrożenie dla ludzi i środowiska; wymagają specjalnego zbierania lub przetwarzania.',example:'Rozpuszczalnik i uszkodzony akumulator nie są zwykłymi odpadami kuchennymi.'},
{term:'Elektroodpady',meaning:'Zużyte urządzenia elektryczne i elektroniczne, często zawierające baterie lub inne wymagające odzysku składniki.',example:'Przed oddaniem telefonu usuń swoje dane.'},
{term:'Tekstylia',meaning:'Tkaniny i wyroby włókiennicze, np. ubrania, pościel i ręczniki. Przydatność do ponownego użycia i odbiór odpadu to dwie różne sprawy.',example:'Napraw zamek kurtki; zniszczone tekstylia oddaj do selektywnej zbiórki.'},
{term:'Greenwashing',meaning:'Tworzenie mylnego wrażenia ekologiczności produktu przez ogólniki, wybiórcze informacje lub nieudowodnione deklaracje.',example:'Samo hasło „100% zielony” nie mówi o produkcji i trwałości.'},
{term:'Cykl życia produktu',meaning:'Całość drogi od surowca, przez produkcję, transport i użytkowanie, aż do naprawy lub zagospodarowania.',example:'Rzecz wielorazowa też wymaga materiału i energii na początku.'},
{term:'Ślad środowiskowy',meaning:'Opis wpływu produktu lub działania na różne elementy środowiska w zdefiniowanych granicach.',example:'Sam transport nie mówi wszystkiego o wpływie żywności.'},
{term:'Kompost',meaning:'Produkt kontrolowanego rozkładu odpowiednich materiałów organicznych w obecności organizmów i właściwych warunków.',example:'Nie wrzucaj farby i innych chemikaliów do kompostownika.'},
{term:'FEFO w żywności',meaning:'Zasada wykorzystania wcześniej produktów o krótszym bezpiecznym terminie, ale nie oznacza jedzenia żywności po dacie „należy spożyć do”.',example:'Przy porządkowaniu lodówki rozmieść produkty zgodnie z datami.'},
{term:'Opakowanie wielomateriałowe',meaning:'Opakowanie z kilku warstw materiałów, których nie można ocenić po samym wyglądzie.',example:'Kartony po napojach mogą mieć inne zasady w Polsce i Norwegii.'},
{term:'Odpowiedzialna konsumpcja',meaning:'Kupowanie i użytkowanie rzeczy zgodnie z rzeczywistą potrzebą, trwałością, budżetem i bezpieczeństwem.',example:'Wybierasz naprawę sprawnego urządzenia zamiast zakupu pod wpływem reklamy.'}
];
export default function EcoAtlas(){
 const [selected,setSelected]=useState(0),[expanded,setExpanded]=useState(false);
 const list=expanded?terms:terms.slice(0,8);
 return <View style={{marginBottom:18,backgroundColor:'#e4f2dd',padding:20,borderRadius:17,borderColor:'#c8e0c4',borderWidth:1,gap:13}}>
  <Text style={{color:ink,fontSize:21,fontWeight:'900'}}>Mała encyklopedia EKO</Text>
  <Text style={{color:'#4b694d',lineHeight:23,fontSize:15}}>Zaczynamy od podstaw. Wybierz hasło, zobacz proste wyjaśnienie i codzienny przykład. Nie musisz nic wiedzieć wcześniej.</Text>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
   {list.map((x,i)=><Pressable key={x.term} accessibilityRole="button" onPress={()=>setSelected(i)} style={{paddingHorizontal:11,paddingVertical:10,backgroundColor:i===selected?'#c8e2c5':'white',borderRadius:10,borderColor:'#c9ddc9',borderWidth:1}}>
    <Text style={{color:ink,fontSize:12,fontWeight:'900'}}>{x.term}</Text>
   </Pressable>)}
  </View>
  <View style={{padding:17,borderRadius:11,backgroundColor:'white',gap:8}}>
   <Text style={{fontSize:18,color:ink,fontWeight:'900'}}>{terms[selected].term}</Text>
   <Text style={{color:'#3e6048',fontSize:15,lineHeight:24}}>{terms[selected].meaning}</Text>
   <Text style={{color:'#40704e',fontSize:14,lineHeight:22,fontWeight:'700'}}>Przykład: {terms[selected].example}</Text>
  </View>
  <Pressable onPress={()=>setExpanded(v=>!v)} style={{paddingVertical:7}}>
   <Text style={{color:'#2c7245',fontWeight:'900'}}>{expanded?'Pokaż mniej':'Odkryj wszystkie '+terms.length+' pojęć →'}</Text>
  </Pressable>
 </View>;
}
