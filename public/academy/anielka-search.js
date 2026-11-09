/* Anielka: client-side course recommendations. No chat messages leave the browser. */
(function(){
'use strict';
const stop=new Set(['chce','chcialbym','chcialabym','chcial','chcesz','chcialam','chcialem','nauczyc','sie','jak','zrobic','poznac','podstaw','podstawy','kurs','kursu','kursy','szukam','potrzebuje','prosze','mnie','mozna','moze','czy','jest','dla','pracy','praca','pracowac','temat','tego','te','tych','oraz','przez','troche','bardziej','dobrze','ktory','ktora','ktore','tak','bardzo','rozne','gdzie','moglbym','moglabym','nauka','umiem','umiec','zaczac','czego','chodzi','nowego','bede','byc']);
const normalize=s=>String(s||'').toLocaleLowerCase('pl').replace(/ł/g,'l').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const words=s=>[...new Set(normalize(s).split(/\s+/).filter(t=>t.length>2&&!stop.has(t)))];
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const aliases=[
 ['ciesla-przygotowanie-czeladnicze',/\b(ciesl|ciesie|stolar|wiezb|krokwi|krokiew|drewno|ciesiel)/],
 ['angielski-na-budowie',/\b(angielsk|english|englis)/],
 ['norweski-na-budowie',/\b(norwesk|norsk|norweg)/],
 ['niemiecki-na-budowie',/\b(niemieck|deutsch|german)/],
 ['brygadzista',/\b(brygadz|majster|kierowac ekipa)/],
 ['kierownik-budowy',/\b(kierownik budow|prowadzic budow|zarzadzac budow)/],
 ['autocad-skroty',/\b(autocad|rysunek techniczn|cad|model 2d)/],
 ['excel-skroty',/\b(excel|arkusz|tabel|formula|formul|spreadsheet)/],
 ['word-skroty',/\b(word|dokument tekstow|edytor tekst)/],
 ['windows-skroty',/\b(windows|obsluga komputer|folder|skroty klawiatur)/],
 ['dostepne-pdf',/\b(pdf|dostepnosc cyfrow|dokument dostepn)/],
 ['jak-kupic-samochod',/\b(samochod|kupno aut|kupic auto|motoryzacj|uzywanego aut)/],
 ['lepszy-tata',/\b(tata|ojcem|ojcostw|tatus)/],
 ['lepsza-mama',/\b(mama|matka|macierzynst)/],
 ['apartamenty',/\b(apartament|wynajem krotkoterminow|airbnb)/],
 ['trawnik-jestem-ogrodnikiem',/\b(trawnik|trawa|ogrod|ogrodnic)/],
 ['ekonomia-domowa-bez-dlugow',/\b(budzet domow|oszczedz|dlug|finans domow)/],
 ['transport-logistyka-praktycznie',/\b(logistyk|transport|spedycj|dostaw)/],
 ['sap-ewm-magazyn',/\b(sap|ewm)/],
 ['facebook-ads-promocja',/\b(facebook|meta ads|reklama facebook)/],
 ['google-ads-promocja',/\b(google ads|reklama google|kampania google)/],
 ['kowal-tradycja',/\b(kowal|kowalstw|kuznia|kucie)/],
 ['garncarz-tradycja',/\b(garncar|ceramik|glina|toczenie na kole)/],
 ['szewc-tradycja',/\b(szewc|butow|obuwnic)/],
 ['lepszy-kucharz',/\b(kuchar|gotowan|kuchni)/],
 ['lepszy-cukiernik',/\b(cukiernik|wypiek|ciast|tortow)/],
 ['opieka-seniorzy',/\b(senior|starsz|opieka nad osoba)/],
 ['petsitter',/\b(petsitter|opiekun zwierzat|opieka nad zwierzet)/]
];
const path={
 'ciesla-przygotowanie-czeladnicze':['autocad-skroty','norweski-na-budowie','brygadzista'],
 'autocad-skroty':['ciesla-przygotowanie-czeladnicze','excel-skroty','kierownik-budowy'],
 'excel-skroty':['word-skroty','windows-skroty','transport-logistyka-praktycznie'],
 'brygadzista':['kierownik-budowy','angielski-na-budowie','ciesla-przygotowanie-czeladnicze'],
 'kierownik-budowy':['brygadzista','autocad-skroty','excel-skroty'],
 'angielski-na-budowie':['brygadzista','norweski-na-budowie','ciesla-przygotowanie-czeladnicze'],
 'norweski-na-budowie':['ciesla-przygotowanie-czeladnicze','angielski-na-budowie','brygadzista'],
 'jak-kupic-samochod':['ekonomia-domowa-bez-dlugow','excel-skroty','mocny-charakter'],
 'lepszy-tata':['blizej-dziecka','pomagaj-dziecku-w-lekcjach','mocny-charakter'],
 'lepsza-mama':['blizej-dziecka','pomagaj-dziecku-w-lekcjach','mocny-charakter'],
 'apartamenty':['odbiory','wspolnota','excel-skroty']
};
const bridges={
 'Budownictwo':'autocad-skroty',
 'Rzemiosło i hobby':'lepszy-szef',
 'Technologie i logistyka':'lepszy-szef',
 'Biznes i praca':'excel-skroty',
 'Rodzina i rozwój':'mocny-charakter',
 'Dom i codzienność':'ekonomia-domowa-bez-dlugow'
};
function rank(query){
 const q=normalize(query),tokens=words(query);
 return COURSES.map((c,index)=>{
  const name=normalize(c.title),id=normalize(c.id.replace(/-/g,' ')),desc=normalize(c.short),outline=normalize((c.outline||[]).join(' ')),category=normalize(c.cat+' '+(c.originalCategory||''));
  let score=0;
  if(q&&q===name)score+=110;
  if(q.length>5&&(q.includes(name)||name.includes(q)))score+=65;
  if(q.length>5&&q.includes(id))score+=65;
  for(const t of tokens){
   if(name.includes(t))score+=22;
   if(id.includes(t))score+=23;
   if(category.includes(t))score+=6;
   if(desc.includes(t))score+=4;
   if(outline.includes(t))score+=2;
  }
  for(const [slug,pattern] of aliases)if(slug===c.id&&pattern.test(q))score+=55;
  return {course:c,score,index};
 }).sort((a,b)=>b.score-a.score||a.index-b.index);
}
function find(query){
 const scored=rank(query),primary=scored[0]?.score>0?scored[0].course:null;
 if(!primary)return {primary:null,similar:[],bonus:null,found:false,query};
 const pool=COURSES.filter(c=>c.id!==primary.id),ids=path[primary.id]||[];
 const related=ids.map(id=>pool.find(c=>c.id===id)).filter(Boolean);
 const similar=[...related,...pool.filter(c=>c.cat===primary.cat&&!related.some(v=>v.id===c.id))].slice(0,2);
 const bonus=ids.slice(2).map(id=>pool.find(c=>c.id===id)).find(c=>c&&!similar.some(v=>v.id===c.id))||
 pool.find(c=>c.id===bridges[primary.cat]&&!similar.some(v=>v.id===c.id))||
 pool.find(c=>c.cat!==primary.cat&&!similar.some(v=>v.id===c.id));
 return {primary,similar,bonus:bonus||null,found:true,query};
}
function card(c,label,note){
 return '<article class="anielka-choice"><span class="anielka-choice-label">'+esc(label)+'</span><h4>'+esc(c.title)+'</h4><p>'+esc(note)+'</p><div class="anielka-choice-footer"><span>'+esc(c.outline?.length||8)+' lekcji · '+esc(c.price===0?'bez opłat':c.price.toLocaleString('pl-PL')+' zł')+'</span><button type="button" data-anielka-course="'+esc(c.id)+'">Zobacz kurs →</button></div></article>';
}
function response(query){
 const match=find(query);
 if(!match.found){
  const list=['ciesla-przygotowanie-czeladnicze','excel-skroty','lepszy-tata'].map(id=>COURSES.find(c=>c.id===id)).filter(Boolean);
  return '<div class="anielka-message"><strong>Anielka:</strong> Nie widzę dokładnego kursu o „'+esc(query.slice(0,140))+'”. Napisz mi, jakie zadanie chcesz umieć wykonać, albo zobacz trzy różne kierunki.</div><div class="anielka-recommendations">'+list.map(c=>card(c,'Spróbuj odkryć','Zajrzyj do programu i zdecyduj, czy Cię zainteresuje.')).join('')+'</div>';
 }
 const p=match.primary;
 const text='Szukasz sposobu, żeby nauczyć się: „'+esc(query.slice(0,140))+'”. Najpierw proponuję <strong>'+esc(p.title)+'</strong>. Nie musisz jednak kończyć na jednej rzeczy — zobacz moje kolejne propozycje.';
 const related=match.similar.map((c,i)=>card(c,i===0?'Podobna umiejętność':'Kolejny krok','Ten temat może uzupełnić Twój pierwszy wybór.')).join('');
 const bonus=match.bonus?card(match.bonus,'Coś dodatkowego od Anielki','Nieco inny kierunek, który może otworzyć Ci kolejne możliwości.'): '';
 return '<div class="anielka-message"><strong>Anielka:</strong> '+text+'</div><div class="anielka-recommendations">'+card(p,'Najlepsze dopasowanie','Zobacz dokładny program i zakres lekcji przed wyborem.')+related+bonus+'</div>';
}
function show(query){
 const out=document.getElementById('anielka-output');
 const input=document.getElementById('anielka-question');
 if(!out)return;
 const value=String(query||'').trim().slice(0,250);
 if(!value){out.innerHTML='<p class="anielka-hint">Powiedz mi, czego chcesz się nauczyć.</p>';return;}
 if(input)input.value=value;
 out.innerHTML=response(value);
 out.scrollIntoView({behavior:'smooth',block:'nearest'});
}
document.addEventListener('submit',event=>{
 if(event.target?.id!=='anielka-form')return;
 event.preventDefault();
 show(event.target.querySelector('#anielka-question')?.value||'');
});
document.addEventListener('click',event=>{
 const sample=event.target.closest?.('[data-anielka-query]');
 if(sample){show(sample.getAttribute('data-anielka-query'));return;}
 const item=event.target.closest?.('[data-anielka-course]');
 if(item&&typeof openCourse==='function')openCourse(item.getAttribute('data-anielka-course'));
});
window.anielkaFindCourses=find;
window.anielkaShowRecommendations=show;
})();