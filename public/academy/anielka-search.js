/* TRENERKI Anielka: one primary search, immediate contextual help.
   Local, private, accessible suggestions. Not an AI-generated conversation. */
(function(){
'use strict';
const normalize=s=>String(s||'').toLocaleLowerCase('pl').replace(/ł/g,'l').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const stop=new Set(('chce chcialbym chcialabym chcial chcialam chcialem sie nauczyc nauka nauczyc kurs kursu kursy szukam szuka potrzebuje prosze pomoc jak gdzie ktory ktora ktore co zrobic dobrze lepiej chce potrafie umiem umiec mnie moj moje ten takie te tego tych od dla przy bez do na i oraz albo byc jestem zostac co').split(/\s+/));
const terms=s=>[...new Set(normalize(s).split(' ').filter(t=>t.length>2&&!stop.has(t)))];
const aliases=[
 ['ciesla-przygotowanie-czeladnicze',/\b(ciesl|ciesiel|stolar|wiezb|krokwi|krokiew|drewnian|ciesio|konstrukcj drewna)/],
 ['brygadzista',/\b(brygadz|majster|zarzadzac ekipa|prowadzic zespol na budowie)/],
 ['kierownik-budowy',/\b(kierownik budow|prowadzic budow|nadzor budow|koordynacja budow)/],
 ['lepszy-szef',/\b(szef|kierowac pracownik|zarzadzac lud|delegowac zadania)/],
 ['apartamenty',/\b(apartament|airbnb|wynajem krotko|gosci hotel)/],
 ['gpsr',/\b(gpsr|bezpieczenstw produkt|rekojmia recodzie)/],
 ['bdo',/\b(bdo|ewidencj odpad|opakowan|odpady firm)/],
 ['dostepne-pdf',/\b(pdf|dostepnosc cyfrow|wcag|dostepne dokument)/],
 ['kgw',/\b(kgw|kolo gospodyn|dotacj|granty)/],
 ['festyn',/\b(festyn|stoisk|jarmark|targach)/],
 ['petsitter',/\b(petsitter|opieka nad zwierzet|opiekun kot|opieka nad kot)/],
 ['odbiory',/\b(usterk|odbior mieszk|reklamacj mieszkania|deweloper)/],
 ['wspolnota',/\b(wspolnot mieszk|zarzad nieruchomosc)/],
 ['pasieka',/\b(pasiek|pszczol|miod|pszczelar)/],
 ['koordynator',/\b(firma sprzataj|sprzatan|serwis sprzataj)/],
 ['dziennik-kota',/\b(hotelik kot|hotel dla kot|organizacj hotelu zwierzat)/],
 ['opieka-seniorzy',/\b(senior|starsz|opieka nad osoba)/],
 ['wsparcie-adhd',/\b(adhd|nadpobudliw|koncentracj)/],
 ['poznaj-siebie',/\b(poznaj siebie|mocn stron|samoocen|samopozn)/],
 ['mocny-charakter',/\b(asertywn|stanowcz|pewnosc siebie|mocny charakter)/],
 ['zwiazek-rozmowa',/\b(zwiazek|komunikacja w relacji|rozmow z partner)/],
 ['blizej-dziecka',/\b(blizej dzieck|wiez z dzieck|relacj z dziec)/],
 ['rodzice-50-50',/\b(opieka naprzemien|rodzic 50|po rozwodzie dziec)/],
 ['zaczynam-od-zera',/\b(utrata majatk|zaczynam od zera|stracilem wszystko|odbudowac zycie)/],
 ['obowiazki-domowe',/\b(obowiazk dom|porzadk w domu|organizacja domu)/],
 ['lepszy-cukiernik',/\b(cukiernik|wypiek|tort|ciast|deser)/],
 ['lepszy-kucharz',/\b(kuchar|gotowan|kuchni|przepis)/],
 ['nie-lubie-ludzi',/\b(nie lubie ludzi|trudno z ludzmi|relacj z lud)/],
 ['jak-kupic-samochod',/\b(samochod|kupno aut|kupic auto|uzywanego aut|motoryzacj)/],
 ['mierz-ponad-sily',/\b(ambicj|bez szkoly|samorozwoj|zmienic swoje zycie)/],
 ['excel-skroty',/\b(excel|arkusz|formul|komork|spreadsheet|tabeli przestawn)/],
 ['autocad-skroty',/\b(autocad|rysunek techniczn|cad|warstw|model 2d)/],
 ['google-ads-promocja',/\b(google ads|reklam w google|pozycjonowanie reklam|kampani google)/],
 ['facebook-ads-promocja',/\b(facebook|meta ads|instagram|reklam w social|kampanie meta)/],
 ['swiety-mikolaj',/\b(mikolaj|santa|prezent swiatecz)/],
 ['lepszy-tata',/\b(tata|ojcem|ojcostw|tatus)/],
 ['lepsza-mama',/\b(mama|matka|macierzynst)/],
 ['word-skroty',/\b(word|edytor tekst|dokument tekstow|microsoft office)/],
 ['wyjdz-z-toksycznego-zwiazku',/\b(toksyczn|przemoc w zwiazku|manipulacj|kontrolujac partner)/],
 ['kryzys-po-40-bez-dlugow',/\b(kryzys po|czterdziest|dlug po 40)/],
 ['partner-z-uzaleznieniem',/\b(alkohol|narkotyk|uzaleznien|partner pije)/],
 ['nie-marnuj-jedzenia',/\b(nie marn|resztk jedzen|nie wyrzucac jedzen|gotowac z reszt)/],
 ['trawnik-jestem-ogrodnikiem',/\b(trawnik|trawa|ogrod|ogrodnic)/],
 ['ekonomia-domowa-bez-dlugow',/\b(budzet domow|oszczedz|dlug|finans domow|wydatki)/],
 ['angielski-na-budowie',/\b(angielsk|english|englis)/],
 ['norweski-na-budowie',/\b(norwesk|norsk|norweg)/],
 ['niemiecki-na-budowie',/\b(niemieck|deutsch|german)/],
 ['pomagaj-dziecku-w-lekcjach',/\b(prace domowe dziec|odrabian|pomagac dziecku w nauce)/],
 ['windows-skroty',/\b(windows|obsluga komputer|folder|skroty klawiatur)/],
 ['transport-logistyka-praktycznie',/\b(logistyk|transport|spedycj|dostaw|kierowanie flota)/],
 ['kowal-tradycja',/\b(kowal|kowalstw|kuznia|kucie|podkow)/],
 ['zdun-tradycja',/\b(zdun|kaflow|budowa pieca|palenisk)/],
 ['kolodziej',/\b(kolodziej|drewnian kole|drewnianych kol|wozow konnych)/],
 ['bednarz',/\b(bednar|beczk|drewnian naczyn)/],
 ['woznica',/\b(woznic|powoz|powozen)/],
 ['rymarz',/\b(rymar|uprzez|siodl)/],
 ['garncarz-tradycja',/\b(garncar|ceramik|glina|toczenie na kole)/],
 ['plecionkarz',/\b(plecionkar|wiklin|plecenie kosz)/],
 ['powroznik',/\b(powroz|liny|sznur)/],
 ['snycerz',/\b(snycer|rzezb w drewnie|ornament)/],
 ['sitarz',/\b(sitarz|sita|sito reczn)/],
 ['zecer',/\b(zecer|sklad druk|typograf)/],
 ['ludwisarz',/\b(ludwisar|odlewan dzwon|dzwon)/],
 ['introligator-tradycja',/\b(introligator|oprawa ksiazek|introligatorn)/],
 ['tkacz-reczny',/\b(tkacz|krosn|tkani)/],
 ['kaletnik-tradycja',/\b(kaletnik|portfel|torebk|skorzane torby)/],
 ['zegarmistrz-tradycja',/\b(zegarmistrz|zegark|mechanizm zegar)/],
 ['mlynarz-tradycyjny',/\b(mlynarz|mlyn|maka|ziarn)/],
 ['gontarz',/\b(gontarz|gonty|drewnian dach)/],
 ['szewc-tradycja',/\b(szewc|naprawa but|obuwi)/],
 ['axapta-dynamics-magazyn',/\b(axapta|dynamics|d365|scm)/],
 ['sap-ewm-magazyn',/\b(sap ewm|system ewm)/],
 ['oracle-wms-cloud',/\b(oracle wms|oracle warehouse)/],
 ['manhattan-active-wms',/\b(manhattan|active warehouse)/],
 ['blue-yonder-wms',/\b(blue yonder|jda)/],
 ['infor-wms',/\b(infor wms|cloudsuite)/],
 ['ongoing-wms',/\b(ongoing wms|3pl)/],
 ['astro-consafe-wms',/\b(consafe|astro wms)/],
 ['sap-tm-transport',/\b(sap tm|transportation management)/],
 ['jestem-eko',/\b(eko|ekolog|segregacj|recykling)/]
];
const level=(q)=>/\b(od zera|poczatkuj|pierwszy raz|nie umiem|bez doswiadczen|od podstaw)/.test(q)?'beginner':/\b(doswiadcz|zaawansow|juz pracuj|znam podstaw|rozwinac|poglebic)/.test(q)?'advanced':null;
const purpose=q=>/\b(prac|zawod|zarabia|etat|firma|awans|biznes)/.test(q)?'work':/\b(hobby|pasj|dla siebie|w domu|wolny czas)/.test(q)?'personal':null;
let lastIntent='',lastQuery='';
const aiEndpoint='https://kcvvixcjuwglfvdpypzs.supabase.co/functions/v1/ta-anielka';
const publicKey='sb_publishable_wpRp2JuWNW_WcjZdWXwIRQ_HfCPlxrj';
let aiTimer=null,aiController=null,aiSerial=0;
const dialogue=[];
function resetAiRequest(){
 if(aiTimer!==null&&typeof clearTimeout==='function')clearTimeout(aiTimer);
 aiTimer=null;
 if(aiController?.abort)aiController.abort();
 aiController=null;
 aiSerial++;
}
async function askIndividualAi(question,serial){
 const output=document.getElementById('anielka-output');
 if(!output||!question||serial!==aiSerial||typeof window.fetch!=='function')return;
 const match=find(question);
 const picks=[match.primary,...match.similar].filter(Boolean).slice(0,3);
 aiController=typeof AbortController!=='undefined'?new AbortController():null;
 try{
  const response=await window.fetch(aiEndpoint,{
   method:'POST',
   headers:{'content-type':'application/json','apikey':publicKey},
   body:JSON.stringify({question,candidates:picks.map(c=>c.id),history:dialogue.slice(-2)}),
   signal:aiController?.signal
  });
  if(!response.ok)return;
  const data=await response.json();
  if(serial!==aiSerial||String(question)!==lastQuery||!data?.ok||typeof data.answer!=='string')return;
  const message=output.querySelector?.('.anielka-message');
  if(!message)return;
  message.textContent='Anielka: '+data.answer.slice(0,1150);
  const preview=document.getElementById('anielka-peek')?.querySelector?.('p');
  if(preview)preview.textContent=data.answer.slice(0,340);
  dialogue.push({question:question.slice(0,180),answer:data.answer.slice(0,280)});
  if(dialogue.length>3)dialogue.shift();
 }catch{ /* Local matching remains available even if server AI is offline. */ }
}
function scheduleAi(question){
 resetAiRequest();
 if(question.length<12||typeof window.fetch!=='function'||typeof setTimeout!=='function')return;
 const serial=aiSerial;
 aiTimer=setTimeout(()=>{if(serial===aiSerial)void askIndividualAi(question,serial);},1650);
}
function contextualQuery(query){
 const raw=String(query||'').trim().slice(0,250);
 const norm=normalize(raw);
 if(!raw)return '';
 if(lastIntent&&raw.length<80&&/^(a |i |ale |tylko |bardziej |zupelnie |od zera|bez doswiadczen|w pracy|dla siebie|jestem poczatkujac|mam doswiadczen)/.test(norm)&&!aliases.some(([_,rx])=>rx.test(norm)))return (lastIntent+' '+raw).slice(0,250);
 return raw;
}
function rank(question){
 const q=normalize(question),tokens=terms(question);
 return COURSES.map((course,index)=>{
  const title=normalize(course.title),id=normalize(course.id.replace(/-/g,' ')),desc=normalize(course.short),
   outline=normalize((course.outline||[]).join(' ')),cat=normalize(course.cat);
  let score=0;
  if(q&&q===title)score+=200;
  if(q.length>4&&q.includes(title))score+=100;
  if(q.length>4&&q.includes(id))score+=90;
  for(const t of tokens){
   if(title.includes(t))score+=30;
   if(id.includes(t))score+=35;
   if(cat.includes(t))score+=5;
   if(desc.includes(t))score+=6;
   if(outline.includes(t))score+=2;
  }
  for(const [slug,pattern] of aliases)if(slug===course.id&&pattern.test(q))score+=75;
  if(score&&/\b(kurs|szkoleni)/.test(q))score+=2;
  return{course,score,index};
 }).sort((a,b)=>b.score-a.score||a.index-b.index);
}
function find(query){
 const q=contextualQuery(query);
 const ordered=rank(q).filter(x=>x.score>0);
 const head=ordered[0];
 if(!head)return{primary:null,similar:[],bonus:null,found:false,query:q,scores:[]};
 const related=ordered.slice(1).filter(x=>x.score>=Math.max(10,head.score*.23)&&x.score>0).slice(0,2).map(x=>x.course);
 return{primary:head.course,similar:related,bonus:null,found:true,query:q,scores:ordered};
}
const price=c=>c.price===0?'bezpłatny podgląd':c.price.toLocaleString('pl-PL')+' zł';
function reason(c,query){
 const q=normalize(query),bits=[],mode=level(q),goal=purpose(q);
 if(mode==='beginner')bits.push('Zaczynasz od podstaw');
 if(mode==='advanced')bits.push('Chcesz rozwinąć to, co już potrafisz');
 if(goal==='work')bits.push('Myślisz o zastosowaniu tej umiejętności w pracy');
 if(goal==='personal')bits.push('Chcesz wykorzystać ją dla siebie');
 const topic=normalize(c.title).split(' ').filter(x=>x.length>4).slice(0,3).join(' ');
 if(!bits.length)return 'Najbliżej Twojego opisu jest temat '+topic+'.';
 return bits.join('. ')+'. Ten kurs dotyczy właśnie tego obszaru.';
}
function keyQuestion(query,p){
 const q=normalize(query);
 if(level(q)==='beginner')return 'Co chcesz wykonać jako pierwszą praktyczną rzecz? Dopisz to w wyszukiwarce.';
 if(level(q)==='advanced')return 'Która konkretna czynność sprawia Ci najwięcej trudności? Dopisz ją.';
 if(purpose(q)==='work')return 'Szukasz nowego zawodu, awansu czy poprawy obecnej pracy? Dopisz ten szczegół.';
 if(/dziec|rodzic|zwiazek/.test(normalize(p.title)))return 'W jakiej sytuacji najbardziej potrzebujesz poprawy? Opisz ją własnymi słowami.';
 return 'Od czego chcesz zacząć i do czego wykorzystasz nową umiejętność? Możesz dopisać szczegóły.';
}
function card(c,label,note){
 return '<article class="anielka-choice"><span class="anielka-choice-label">'+esc(label)+'</span><h4>'+esc(c.title)+'</h4><p>'+esc(note)+'</p><div class="anielka-choice-footer"><span>'+esc(c.outline?.length||8)+' lekcji · '+esc(price(c))+'</span><button type="button" data-anielka-course="'+esc(c.id)+'">Zobacz program kursu →</button></div></article>';
}
function response(query){
 const result=find(query);
 if(!result.found){
  return '<div class="anielka-message"><strong>Anielka:</strong> Jeszcze nie widzę kursu, który pasuje do tego opisu. Nie będę proponować przypadkowego tematu. Powiedz mi, <strong>co dokładnie chcesz umieć zrobić</strong> — możesz dopisać zawód, program lub sytuację z życia.</div>';
 }
 const p=result.primary;
 const intro='Z Twojego pytania rozumiem, że interesuje Cię <strong>'+esc(p.title)+'</strong>. '+esc(reason(p,result.query));
 const related=result.similar.length?'<div class="anielka-recommendations">'+result.similar.map(c=>card(c,'Powiązany temat','To także nawiązuje do tego, co napisałeś.')).join('')+'</div>':'';
 return '<div class="anielka-message"><strong>Anielka:</strong> '+intro+'<div class="anielka-followup">'+esc(keyQuestion(result.query,p))+'</div></div><div class="anielka-recommendations">'+card(p,'Najbliżej Twojego celu','Zobacz pełny program i sprawdź, czy obejmuje zadania, na których Ci zależy.')+'</div>'+related;
}
function setPeek(query){
 const peek=document.getElementById('anielka-peek');if(!peek)return;
 const q=String(query||'').trim();
 if(q.length<3){peek.innerHTML='';return;}
 const match=find(q);
 if(!match.found){
  peek.innerHTML='<strong>Anielka</strong><p>Rozumiem, że szukasz czegoś konkretnego. Dopisz, jaki problem chcesz rozwiązać.</p>';return;
 }
 peek.innerHTML='<strong>Anielka · dopasowanie na żywo</strong><p>'+esc(match.primary.title)+'</p><button type="button" data-anielka-course="'+esc(match.primary.id)+'">Otwórz ten kurs →</button>';
}
function show(query,scroll=false){
 const input=document.getElementById('anielka-question');
 const v=String(query||'').trim().slice(0,250);
 if(input&&input.value!==v)input.value=v;
 if(v.length<3){
  resetAiRequest();const out=document.getElementById('anielka-output');
  if(out)out.innerHTML='';setPeek('');
  if(typeof searchCourses==='function')searchCourses('');return;
 }
 // Searches remain available while viewing any course detail, not just the homepage.
 // The catalog may need to render before Anielka can write to its output element.
 if(typeof searchCourses==='function')searchCourses(v);
 const out=document.getElementById('anielka-output');
 if(out)out.innerHTML=response(v);
 setPeek(v);
 lastQuery=v;
 if(find(v).found)lastIntent=v;
 scheduleAi(v);
 if(scroll&&out&&typeof out.scrollIntoView==='function')out.scrollIntoView({behavior:'smooth',block:'start'});
}
document.addEventListener('input',event=>{
 if(event.target?.id!=='anielka-question')return;
 show(event.target.value,false);
});
document.addEventListener('keydown',event=>{
 if(event.target?.id!=='anielka-question')return;
 if(event.key==='Enter'){event.preventDefault();show(event.target.value,true);const peek=document.getElementById('anielka-peek');if(peek)peek.innerHTML='';}
 if(event.key==='Escape'){const peek=document.getElementById('anielka-peek');if(peek)peek.innerHTML='';}
});
document.addEventListener('click',event=>{
 const course=event.target.closest?.('[data-anielka-course]');
 if(course){
  const peek=document.getElementById('anielka-peek');if(peek)peek.innerHTML='';
  if(typeof openCourse==='function')openCourse(course.getAttribute('data-anielka-course'));return;
 }
 const details=event.target.closest?.('[data-anielka-details]');
 if(details){
  const input=document.getElementById('anielka-question');
  show(input?.value||'',true);
  const peek=document.getElementById('anielka-peek');if(peek)peek.innerHTML='';
  return;
 }
 if(!event.target.closest?.('.anielka-nav-search')){
  const peek=document.getElementById('anielka-peek');if(peek)peek.innerHTML='';
 }
});
window.anielkaFindCourses=find;
window.anielkaShowRecommendations=show;
window.anielkaCatalogIds=query=>String(query||'').trim().length<3?[]:rank(contextualQuery(query)).filter(x=>x.score>0).slice(0,15).map(x=>x.course.id);
})();
