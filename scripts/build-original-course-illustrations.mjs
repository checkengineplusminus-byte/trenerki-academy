#!/usr/bin/env node
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('content/course-illustrations-missing-20261117.json',root),'utf8'));
if(manifest.lessons.length!==1885)throw Error('Expected 1885 topic-matched illustrations');
const palette=[["#e7f2e9","#618f75","#d2dfc5","#395f52","#fffaf1"],["#f5e8db","#bc826b","#edd2ae","#725243","#fff8ed"],["#e6eefa","#6d8aa9","#c8d8e5","#435d78","#fdf9ef"],["#f2e5ef","#ac7595","#e4c4d2","#705467","#fff9f0"],["#f3ede0","#9a946b","#d6d8a9","#635e45","#fff8e5"],["#e6eeee","#6d9a93","#c6dad7","#436965","#fff8ef"],["#ece8f3","#947dac","#ddd2e9","#655172","#fff9f4"],["#f7e8e1","#b97068","#f0c8b5","#7c4e43","#fff8eb"]];
const categoryExtras={"Budownictwo":["building","ruler","crane","helmet","roof"],"Technologie i logistyka":["computer","barcode","pallet","truck","chart"],"Biznes i praca":["document","coin","people","chart","megaphone"],"Rzemiosło i hobby":["hammer","barrel","basket","clay","wheel"],"Rodzina i rozwój":["family","heart","people","book","hands"],"Dom i codzienność":["home","food","plant","pet","broom"]};
const rules=[["samochod|auto|pojazd|vin|opon|lakier|silnik","car"],["bateri|elektrycz|akumulator|ładowan|ładowar","battery"],["skaner|kod kres|identyfikator|etykiet|kod qr","barcode"],["magazyn|regał|sku|wms|towar","pallet"],["dostaw|transport|ciężar|przewóz|logistyk|wysyłk","truck"],["dźwig|żuraw|podnoś|rozładunk","crane"],["pomiar|wymiar|rozstaw|toleranc|milimetr|długoś|geometri|skala","ruler"],["rysunek|rysunki|schemat|rewizj|projekt|plan|szkic","blueprint"],["dach|gont|pokryc|krokiew","roof"],["balustrad|poręcz|szkł|zabudow|szyba","glass"],["szkolen|hms|bezpiecze|zagroże|ryzyk|ochron|pierwsza pomoc","shield"],["wiercen|wiercark|pił|narzędz|cięc|przyrząd","hammer"],["beczk|klepk|obręcz|bednarz","barrel"],["kołodziej|szprych|piast|koło drewn","wheel"],["kosz|wiklina|plecion|splot","basket"],["glin|cerami|garncarz|szkliw","clay"],["tkact|krosn|tkanin|osnow|wątek","loom"],["dzieck|nastolat|rodzic|tata|mama|rodzin|szkoł","family"],["relacj|bliskoś|emocj|zaufan|przeprosin","heart"],["wolont|ekip|zespoł|pracown|koordynac","people"],["mikołaj|święt|kostium","gift"],["kot|pies|zwierzę|petsitter","pet"],["kuchar|gotow|jedzeni|żywno|ciast|przepis|posiłek","food"],["trawnik|ogrod|roślin|kwiat|nasion","plant"],["eko|recyk|odpady|segregac|środowisk","recycle"],["dom|apartament|mieszk|pokój|wnętrz","home"],["sprząta|myc|czyszcze|porząde","broom"],["zdjęc|fotograf|obraz|publikac","photo"],["word|excel|windows|komputer|plik|panel|interfejs|program|system","computer"],["koszt|rata|finans|budżet|pieniądz|kredyt|cena|wycena|faktura","coin"],["marketing|reklam|ads|promocj|facebook","megaphone"],["raport|dokument|formularz|protokół|umow|certyfikat","document"],["statysty|analiz|wynik|wykres|porównan","chart"],["czas|zegar|godzin|termin|harmonogram","clock"],["czytan|nauka|pamię|lekcj|książ","book"]];
const hash=s=>createHash('sha256').update(s).digest();
function seg(x1,y1,x2,y2,col,w=7){return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`}

function rct(x,y,w,h,r,col,stroke="none",sw=4){return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${col}" stroke="${stroke}" stroke-width="${sw}"/>`}

function circ(x,y,r,col,stroke="none",sw=4){return `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" stroke="${stroke}" stroke-width="${sw}"/>`}

function ph(d,col,stroke="none",w=5){return `<path d="${d}" fill="${col}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`}

function draw(k,c){
 const [bg,a,b,d,l]=c,w="#fffaf0";
 switch(k){
  case"building":return rct(59,71,203,196,9,a,d,7)+ph("M42 78L159 25 282 78Z",b,d,5)+Array.from({length:3},(_,y)=>Array.from({length:3},(_,x)=>rct(81+x*61,98+y*46,38,32,5,w,d,3)).join("")).join("")+rct(135,222,50,45,3,d);
  case"ruler":return rct(33,92,258,114,15,b,d,8)+Array.from({length:13},(_,i)=>seg(48+i*19,106,48+i*19,106+(i%2?33:60),d,4)).join("")+seg(45,247,276,247,a,9)+ph("M44 234l-14 13 14 13m230-26 14 13-14 13","none",a,6);
  case"blueprint":return rct(44,34,235,236,10,w,d,8)+Array.from({length:6},(_,i)=>seg(55,66+i*34,270,66+i*34,b,2)).join("")+Array.from({length:7},(_,i)=>seg(66+i*32,45,66+i*32,258,b,2)).join("")+rct(92,93,127,103,0,"none",a,8)+seg(155,93,155,195,d,7)+seg(92,144,220,144,d,7);
  case"crane":return seg(28,261,289,261,d,12)+seg(198,47,198,254,d,13)+seg(53,55,269,55,d,10)+seg(188,56,60,56,b,7)+Array.from({length:4},(_,i)=>seg(184,83+i*38,201,102+i*38,b,6)).join("")+seg(104,57,104,180,d,7)+ph("M92 174q12 37 28 0","none",a,9)+rct(76,214,120,30,3,a);
  case"helmet":return ph("M63 176Q47 72 157 62Q261 75 257 176Z",a,d,9)+rct(42,173,240,35,16,b,d,7)+rct(141,66,32,106,8,l)+seg(68,230,254,230,d,8);
  case"roof":return ph("M37 139L161 38 287 139","none",d,16)+ph("M59 139L161 60 267 139V261H59Z",b,d,6)+Array.from({length:4},(_,y)=>Array.from({length:4},(_,x)=>rct(66+x*50+(y%2)*8,138+y*28,51,26,3,x%2?a:"#f5e7c9",d,1.7)).join("")).join("");
  case"pallet":return rct(39,220,248,19,4,d)+rct(59,240,41,23,4,a)+rct(219,240,40,23,4,a)+Array.from({length:2},(_,y)=>Array.from({length:3},(_,x)=>rct(49+x*81,78+y*69,70,63,4,x%2?a:b,d,5)).join("")).join("");
  case"truck":return rct(21,125,194,98,9,a)+ph("M216 155h60l34 40v29h-94Z",d)+rct(229,168,34,28,3,"#e6eff2")+circ(83,232,29,d)+circ(83,232,14,w)+circ(265,232,29,d)+circ(265,232,14,w);
  case"glass":return Array.from({length:3},(_,i)=>rct(37+i*83,63,81,171,4,"#e5eff3",a,5)).join("")+seg(34,239,290,239,d,13)+Array.from({length:4},(_,i)=>seg(42+i*83,240,42+i*83,274,d,8)).join("");
  case"computer":return rct(28,47,268,191,13,d)+rct(44,62,236,161,6,w)+rct(59,79,152,19,5,b)+Array.from({length:3},(_,i)=>rct(59,118+i*29,155-i*18,15,4,i===1?a:b)).join("")+rct(238,121,28,79,4,a)+ph("M17 244h291l-28 23H44Z",d);
  case"barcode":return rct(40,51,239,204,12,w,d,7)+Array.from({length:16},(_,i)=>rct(59+i*13+(i%4)*2,83,(i%3+1)*2,115,0,d)).join("")+rct(64,213,139,17,5,b);
  case"document":return ph("M82 27h136l48 47v191H82Z",w,d,8)+ph("M218 30v45h47Z",b,d,4)+Array.from({length:5},(_,i)=>rct(103,110+i*27,130+(i%2)*30,10,5,i===2?a:b)).join("");
  case"chart":return seg(40,263,287,263,d,10)+seg(40,263,40,44,d,9)+Array.from({length:4},(_,i)=>rct(68+i*51,213-i*38,34,48+i*38,4,i%2?a:b)).join("")+ph("M72 127l42-38 54 32 69-66","none",d,7);
  case"coin":return Array.from({length:4},(_,i)=>Array.from({length:3+i%3},(_,j)=>rct(54+i*61,246-j*23,44,19,7,i%2?a:b,d,2)).join("")).join("")+rct(55,53,210,99,10,w,d,6)+ph("M76 134l43-26 28 16 46-47 34 24","none",a,8);
  case"shield":return ph("M161 30L276 81v72q-5 85-115 123Q52 238 46 153V81Z",a,d,9)+ph("M95 144l45 39 86-95","none",w,18);
  case"barrel":return `<ellipse cx="160" cy="79" rx="100" ry="30" fill="${b}"/>`+ph("M61 79q-17 80 0 159q97 51 198 0q15-79 0-159",a,d,9)+Array.from({length:5},(_,i)=>ph(`M${80+i*40} 79q-12 90 1 165`,"none",d,4)).join("")+ph("M63 125q96 31 194 0m-194 76q96 31 194 0","none",b,13);
  case"wheel":return circ(161,151,116,b,d,14)+circ(161,151,75,w,d,9)+Array.from({length:8},(_,i)=>{const v=i*Math.PI/4;return seg(161+Math.cos(v)*31,151+Math.sin(v)*31,161+Math.cos(v)*108,151+Math.sin(v)*108,d,7)}).join("")+circ(161,151,31,a,d,6);
  case"basket":return ph("M55 113h216l-23 147H78Z",b,d,8)+ph("M82 112q0-99 81-99q83 0 83 99","none",d,12)+Array.from({length:6},(_,i)=>seg(78+i*34,127,85+i*30,251,a,8)).join("")+Array.from({length:4},(_,i)=>ph(`M68 ${143+i*31}q94 39 189 0`,"none",d,6)).join("");
  case"clay":return `<ellipse cx="157" cy="262" rx="106" ry="17" fill="${d}"/>`+ph("M86 57h142q-37 53 0 91q29 68-16 103H99q-49-34-14-103q41-40 1-91Z",a,d,8)+`<ellipse cx="157" cy="57" rx="71" ry="18" fill="${b}"/>`;
  case"hammer":return rct(132,93,36,170,8,a,d,6)+ph("M47 61h187q25 13 29 43q-10 18-29 25H47Z",b,d,8)+seg(168,80,231,80,d,9);
  case"loom":return rct(52,32,224,237,0,"none",d,14)+Array.from({length:13},(_,i)=>seg(77+i*14,60,77+i*14,239,i%2?a:b,4)).join("")+Array.from({length:5},(_,i)=>seg(69,99+i*29,262,99+i*29,d,6)).join("");
  case"family":return circ(95,96,37,a)+circ(224,97,37,b)+circ(165,164,29,"#e9bd99")+ph("M34 262q-12-115 63-115q68 0 60 115",a)+ph("M165 262q-6-115 62-115q76 0 64 115",b)+ph("M113 277q-9-79 53-79q60 0 50 79","#e9bd99");
  case"heart":return ph("M162 268Q4 178 43 92Q88 0 162 86Q233 3 278 92Q316 176 162 268Z",a,d,11)+ph("M71 155h58l23-38 25 75 22-41h54","none",w,11);
  case"hands":return ph("M31 154q31-43 85 7l50 34q52-16 95-43q44-7 31 25q-69 75-130 95q-79-22-131-118Z",b,d,8)+ph("M66 156q27 22 63 53m36-17 42 36","none",a,10);
  case"gift":return rct(56,123,211,143,7,a,d,8)+rct(44,95,236,39,5,b,d,7)+rct(144,96,40,169,2,w)+ph("M162 94q-88 10-63-47q38-45 63 47m0 0q89 8 66-47q-43-45-66 47","none",d,8);
  case"pet":return ph("M72 130L64 43l69 38q28-18 59 0l69-38-9 87q42 37 6 105q-98 64-180 0q-42-68-6-105Z",a,d,9)+circ(115,162,11,d)+circ(215,162,11,d)+ph("M151 199h31l-15 15Z",d)+ph("M164 216q-18 18-32 0m32 0q16 18 33 0","none",d,5);
  case"food":return circ(160,159,110,w,d,12)+circ(160,159,77,b)+ph("M111 145q41-57 88 4q-35 57-88 20Z",a,d,6)+Array.from({length:7},(_,i)=>circ(113+i*16,191+(i%2)*8,6,"#c66b61")).join("");
  case"plant":return rct(95,201,132,70,8,b,d,7)+seg(160,205,160,79,d,11)+ph("M161 127q-95 7-76-77q76-5 76 77m0 22q95-3 74-81q-72-4-74 81",a,d,8);
  case"home":return ph("M30 149L160 30 294 149","none",d,17)+rct(60,146,200,119,7,b,d,7)+rct(141,179,50,85,5,a)+rct(80,167,41,34,3,w)+rct(217,167,24,34,3,w);
  case"car":return ph("M53 170l45-72h117l52 72h29v75H27v-75Z",a,d,9)+rct(116,110,90,53,5,"#e2f1f1")+circ(84,245,30,d)+circ(84,245,13,w)+circ(245,245,30,d)+circ(245,245,13,w);
  case"battery":return rct(37,68,237,172,15,w,d,10)+rct(277,125,23,59,4,d)+rct(60,93,149,117,9,a)+ph("M153 89l-46 69h43l-18 54 75-91h-47l15-32Z",w,d,3);
  case"clock":return circ(161,154,116,w,d,15)+Array.from({length:12},(_,i)=>{const v=i*Math.PI/6;return seg(161+Math.sin(v)*82,154-Math.cos(v)*82,161+Math.sin(v)*99,154-Math.cos(v)*99,d,5)}).join("")+ph("M161 87v68l53 34","none",a,12);
  case"book":return ph("M161 71q-61-39-117-8v177q73-28 117 14q61-41 119-14V63q-69-32-119 8Z",w,d,9)+seg(161,73,161,251,a,7)+Array.from({length:4},(_,i)=>seg(67,104+i*35,131,104+i*35,b,5)+seg(192,104+i*35,259,104+i*35,b,5)).join("");
  case"people":return Array.from({length:3},(_,i)=>circ(67+i*95,105,33,i%2?a:b)).join("")+Array.from({length:3},(_,i)=>ph(`M${24+i*95} 263q-6-116 43-116q50 0 44 116Z`,i%2?a:b,d,4)).join("");
  case"megaphone":return ph("M45 129h51l140-71v181L96 164H45Z",a,d,8)+rct(69,162,42,98,7,d)+ph("M255 116q51 30 0 74m13-96q75 50 0 121","none",b,10);
  case"recycle":return ph("M149 31l33 32-21 42M70 97q29-57 84-62M260 139q48 45-5 97M86 253q-57-4-52-70","none",a,22)+ph("M185 62l-1 52-54-24M252 234l-53 5 22-49M34 182l32-41 23 45",b,d,4);
  case"broom":return seg(194,40,125,213,d,15)+ph("M97 195h75l49 81H48Z",a,d,7)+Array.from({length:5},(_,i)=>seg(78+i*30,217,60+i*43,267,d,5)).join("");
  case"photo":return rct(41,46,242,210,12,w,d,8)+circ(208,109,29,b)+ph("M58 220l76-99 51 61 26-39 57 77Z",a,d,6);
  default:return circ(160,157,100,a,d,8);
 }
}

function selectMotif(item,rules,extras,hash){
 const search=(item.title+" "+item.hint).toLocaleLowerCase("pl");
 for(const [pat,name] of rules)if(new RegExp(pat,"i").test(search))return name;
 const picks=extras[item.category]||extras["Dom i codzienność"];
 return picks[hash(item.slug)[0]%picks.length];
}

function makeSvg(item,params){
 const {palette,categoryExtras,rules,hash}=params;
 const seed=hash(item.slug+":"+item.n+":"+item.title),colors=palette[(seed[0]+seed[2])%palette.length];
 const main=selectMotif(item,rules,categoryExtras,hash),choices=categoryExtras[item.category]||categoryExtras["Dom i codzienność"];
 let secondary=choices[(seed[1]+item.n)%choices.length];if(secondary===main)secondary=choices[(choices.indexOf(secondary)+1)%choices.length];
 const colors2=palette[(seed[3]+4)%palette.length],dx=seed[4]%49-24,dy=seed[5]%31-15,scale=1.14+(seed[6]%10)*.017,small=.61+(seed[7]%12)*.01;
 const particles=Array.from({length:15},(_,i)=>circ(26+(seed[(i*2+9)%32]%250)*3.5,36+(seed[(i*3+3)%32]%230)*2.04,2+(seed[i]%4),colors[1])).join("");
 const nm=String(item.title).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
 return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="Autorska ilustracja: ${nm}"><defs><linearGradient id="background" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[4]}"/></linearGradient></defs><rect width="960" height="540" fill="url(#background)"/><rect x="33" y="29" width="894" height="482" rx="31" fill="#fffaf7" opacity=".35" stroke="#fff" stroke-width="2"/><circle cx="${749-dx}" cy="${92+dy}" r="253" fill="${colors[2]}" opacity=".16"/><circle cx="${93+dx}" cy="${465-dy}" r="162" fill="${colors[1]}" opacity=".12"/>${particles}<ellipse cx="${355+dx}" cy="454" rx="215" ry="30" fill="${colors[3]}" opacity=".12"/><ellipse cx="761" cy="442" rx="126" ry="22" fill="${colors[3]}" opacity=".10"/><g transform="translate(${185+dx} ${61+dy}) scale(${scale.toFixed(3)})">${draw(main,colors)}</g><g transform="translate(${625-dx} ${211-dy}) scale(${small.toFixed(3)})">${draw(secondary,colors2)}</g><path d="M71 ${431+dy}q85-34 148-13" fill="none" stroke="${colors[1]}" opacity=".29" stroke-width="8"/></svg>`;
}
const destination='public/academy/assets/';
mkdirSync(new URL(destination,root),{recursive:true});
const ids=new Set(),perType={};let bytes=0;
for(const item of manifest.lessons){
 if(!/^[a-z0-9-]+$/.test(item.slug)||!Number.isInteger(item.n)||item.n<0)throw Error('Bad ID');
 const name='lesson-visual-'+item.slug+'-'+String(item.n+1).padStart(3,'0');
 if(ids.has(name))throw Error('Duplicate ID '+name);ids.add(name);
 const target=new URL(destination+name+'.svg',root);
 if(existsSync(target))throw Error('Asset already exists: '+name);
 const svg=makeSvg(item,{palette,categoryExtras,rules,hash});
 if(!svg.includes('viewBox="0 0 960 540"')||!svg.endsWith('</svg>')||/<text\\b|<image\\b|<script|href=/.test(svg))throw Error('Unsafe SVG '+name);
 writeFileSync(target,svg);bytes+=Buffer.byteLength(svg);
 const motif=selectMotif(item,rules,categoryExtras,hash);perType[motif]=(perType[motif]||0)+1;
}
const report={version:'2026-11-17-v1',format:'original SVG',generated:ids.size,totalBytes:bytes,uniqueTopics:Object.keys(perType).length,motifs:perType};
writeFileSync(new URL('content/course-illustrations-coverage.json',root),JSON.stringify(report,null,2)+'\\n');
console.log('✓ '+ids.size+' original topic illustrations with '+Object.keys(perType).length+' visual motifs, '+bytes+' bytes');
