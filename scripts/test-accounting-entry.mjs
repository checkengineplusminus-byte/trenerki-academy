import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ACCOUNTING_COURSE as A,courseDestination,accountingProgress,courseFinished} from '../src/accounting/course-entry.js';
import {materialCoverageKnown,materialCount} from '../src/accounting/program-visibility.js';
test('Główne strony programu i tematu księgowości są objęte logowaniem i RLS',()=>{
 const layout=readFileSync(new URL('../app/_layout.tsx',import.meta.url),'utf8');
 const open='<Stack.Protected guard={signedIn} redirectTo="/konto">';
 const start=layout.indexOf(open);
 assert.ok(start>=0,'Wspólna blokada sesji i przekierowanie na logowanie');
 const end=layout.indexOf('</Stack.Protected>',start);
 assert.ok(end>start,'Zamknięcie bloku chronionych ekranów');
 const secured=layout.slice(start,end);
 for(const route of ['ksiegowosc','program-ksiegowosci','temat-ksiegowosci','sciezka-ksiegowosci','biuro-ksiegowe','dane-biura','majatek-ksiegowy','slownik-ksiegowego','formularze-ksiegowego']){
  const screen='<Stack.Screen name="'+route+'"/>';
  assert.ok(secured.includes(screen),'Ekran wymaga logowania: '+route);
  assert.equal(layout.split(screen).length,2,'Ekran deklarowany dokładnie raz: '+route);
 }
 assert.ok(layout.includes('supabase.auth.onAuthStateChange'),'Wylogowanie powinno odświeżać guard');
 assert.ok(layout.includes('supabase.auth.getSession()'),'Sesja jest inicjalizowana przed otwarciem widoków');
 assert.ok(layout.indexOf('<Stack.Screen name="konto"/>')<start,'Logowanie musi pozostać publiczne');
 for(const route of ['program-ksiegowosci','temat-ksiegowosci']){
  const code=readFileSync(new URL('../app/'+route+'.tsx',import.meta.url),'utf8');
  assert.ok(code.includes('supabase.auth.getUser()'),'Ekran ponownie weryfikuje użytkownika: '+route);
 }
});
test('Kurs księgowości domyślnie otwiera nowy pulpit nauki',()=>assert.deepEqual(courseDestination(A),{pathname:'/program-ksiegowosci'}));
test('Funkcja nawigacji zachowuje prawidłowy numer lekcji',()=>assert.deepEqual(courseDestination(A,'20'),{pathname:'/ksiegowosc',params:{lesson:'20'}}));
test('Dolna i górna granica numeru lekcji',()=>{for(const n of ['1','100000'])assert.equal(courseDestination(A,n).params.lesson,n);});
test('Nieprawidłowe numery nie przechodzą do adresu',()=>{for(const n of ['0','01','100001','-1','1.5','<script>',null,['2']])assert.deepEqual(courseDestination(A,n),{pathname:'/program-ksiegowosci'});});
test('Pozostałe kursy zachowują dotychczasowy adres',()=>assert.deepEqual(courseDestination('excel-od-podstaw'),{pathname:'/nauka',params:{course:'excel-od-podstaw'}}));
test('45 dostępnych lekcji, nie 100000 pustych miejsc',()=>assert.deepEqual(accountingProgress({approved_count:45,read_count:9,target_lessons:100000}),{lessonCount:45,completedCount:9,progress:20,available:true}));
test('Brak odczytu nie jest udawanym zerowym postępem',()=>assert.equal(accountingProgress(null).available,false));
test('Brak dostępnych lekcji nie daje dzielenia przez zero',()=>assert.equal(accountingProgress({approved_count:0,read_count:0}).progress,0));
test('Historyczne oznaczenia nie dają więcej niż 100 procent czytania',()=>assert.equal(accountingProgress({approved_count:45,read_count:50}).completedCount,45));
test('Uszkodzone dane nie tworzą wyniku',()=>{for(const x of [{approved_count:'45',read_count:1},{approved_count:-1,read_count:0},{approved_count:45,read_count:NaN}])assert.equal(accountingProgress(x).available,false);});
test('Przeczytanie wszystkich dostępnych lekcji nie kończy encyklopedii',()=>assert.equal(courseFinished(A,45,45),false));
test('Stary certyfikat nie odblokowuje nowego egzaminu encyklopedii',()=>assert.equal(courseFinished(A,45,45,true),false));
test('Kurs wymaga wszystkich aktualnych lekcji, nawet gdy zachowano wcześniejszy dyplom',()=>{assert.equal(courseFinished('excel',8,8),true);assert.equal(courseFinished('excel',8,4),false);assert.equal(courseFinished('excel',30,8,true),false);assert.equal(courseFinished('excel',0,0,true),false);});
test('Stare linki księgowości przekierowują bez zmiany pozostałych kursów',()=>{
 const source=readFileSync(new URL('../app/nauka.tsx',import.meta.url),'utf8');
 const guard="   if(slug==='ksiegowosc-od-podstaw'){router.replace(courseDestination(slug,lessonParam));return;}\n";
 const importLine="// @ts-ignore — jednolita, testowana nawigacja starych i nowych odnośników.\nimport {courseDestination} from '../src/accounting/course-entry.js';\n";
 assert.ok(source.includes(importLine),'Tylko współdzielona, walidowana nawigacja');
 assert.deepEqual(courseDestination(A,'34'),{pathname:'/ksiegowosc',params:{lesson:'34'}});
 assert.deepEqual(courseDestination(A,'0'),{pathname:'/program-ksiegowosci'});
 assert.equal(source.split(guard).length,2,'Przekierowanie występuje tylko raz');
 assert.ok(source.indexOf(guard)<source.indexOf("supabase.auth.getUser()"),'Przekieruj przed starym odczytem danych');
 const enrollment=source.indexOf("supabase.from('ta_enrollments')");
 const lessons=source.indexOf("supabase.from('ta_lessons')");
 assert.ok(source.indexOf("supabase.auth.getUser()")<enrollment&&enrollment<lessons);
 assert.match(source.slice(enrollment,lessons),/\.eq\('user_id',u.id\)\.eq\('course_slug',slug\)\.eq\('status','active'\)\.gt\('expires_at',new Date\(\)\.toISOString\(\)\)/);
 assert.match(source.slice(enrollment,lessons),/if\(ee\)throw ee;\s*if\(!en\?\.length\)throw new Error/);
});
test('Karta kursu korzysta z właściwego RPC i nawigacji',()=>{const code=readFileSync(new URL('../app/moje-kursy.tsx',import.meta.url),'utf8');assert.ok(code.includes("supabase.rpc('ta_accounting_overview')"));assert.ok(code.includes('courseDestination(row.course_slug)'));assert.ok(code.includes('Przeczytanie nie jest zaliczeniem kursu.'));});
test('Podgląd właściciela nie zapisuje dostępu lub publikacji',()=>{const code=readFileSync(new URL('../app/moje-kursy.tsx',import.meta.url),'utf8');assert.ok(code.includes("academyAction('whoami')"));assert.ok(code.includes('Panel właściciela — księgowość'));assert.ok(!code.includes('service_role'));assert.ok(!code.includes(".update({published"));assert.ok(!code.includes(".insert({user_id"));});

test('Kurs księgowości otwiera prosty widok ucznia; archiwum wymaga świadomego wyboru',()=>{
 const code=readFileSync(new URL('../app/ksiegowosc.tsx',import.meta.url),'utf8');
 assert.match(code,/supabase\.rpc\('ta_accounting_overview'\)/);
 assert.ok(code.includes("useState<'home'|'program'|'search'|'saved'>('home')"));
 assert.match(code,/mode==='home'/);
 assert.match(code,/chapters\.filter\(c=>Number\(c\.authored_count\)>0\)/);
 assert.ok(code.includes('Starsze materiały'));
 assert.ok(code.includes('Rozpocznij lub kontynuuj naukę'));
 assert.doesNotMatch(code,/Aktywny program: 10 działów/);
 assert.doesNotMatch(code,/Katalog wcześniejszych lekcji:/);
 assert.doesNotMatch(code,/Dostępne treści: \{overview\.is_editor\?overview\.authored_count/);
});
test('AI bez tajemnic pozostaje otwarty po odświeżeniu katalogu, bez obejścia publikacji',()=>{
 const html=readFileSync(new URL('../public/academy/index.html',import.meta.url),'utf8');
 assert.match(html,/const current=publicCatalogCourses\(\)\.find\(c=>c\.id===selectedCourse\.id\)/);
 assert.match(html,/if\(current\)\{selectedCourse=current;render\(\);\}/);
 assert.match(html,/else showCatalog\(\); \/\/ Withdrawn\/unpublished courses/);
 assert.doesNotMatch(html,/!COURSES\.includes\(selectedCourse\)/);
 assert.match(html,/livePublishedCatalogIds=new Set\(bySlug\.keys\(\)\)/);
});
test('Data odniesienia i link nie są bez dowodu potwierdzeniem aktualności prawa',()=>{
 const archive=readFileSync(new URL('../app/ksiegowosc.tsx',import.meta.url),'utf8');
 const active=readFileSync(new URL('../app/temat-ksiegowosci.tsx',import.meta.url),'utf8');
 for(const code of [archive,active])assert.match(code,/Sama data/);
 assert.doesNotMatch(archive,/Sprawdzono opisany zakres:/);
 assert.doesNotMatch(active,/Data sprawdzenia treści prawnej:/);
 assert.doesNotMatch(active,/>Otwórz urzędowe źródło<\/Text>/);
});
test('Lekcja księgowości ma pięć czytelnych ekranów i objaśnienia dla początkujących',()=>{
 const ui=readFileSync(new URL('../app/temat-ksiegowosci.tsx',import.meta.url),'utf8');
 for(const id of ["id:'learn'","id:'example'","id:'practice'","id:'homework'","id:'summary'"])
  assert.ok(ui.includes(id),'Brak kroku '+id);
 assert.match(ui,/BEGINNER_GUIDES/);
 assert.match(ui,/introComplete&&currentSection/);
 assert.match(ui,/!introComplete&&<View/);
 assert.ok(ui.includes('Rozumiem — pokaż pierwszą część'));
 assert.ok(ui.includes('Tu rozwiązujesz ćwiczenia'));
 assert.ok(ui.includes('ĆWICZENIE {exercises.length?quizIndex+1:0}'));
 assert.ok(ui.includes('Tu oddajesz rozwiązanie'));
 assert.ok(ui.includes('Tu rozwiązujesz ćwiczenia'));
 assert.ok(ui.includes('goStep(\'summary\')'));
 assert.ok(ui.includes('showExtraHomework&&'));
 assert.ok(ui.includes('showGlossary&&(m.glossary||[]).map'));
 assert.ok(ui.includes('showSources&&'));
 const start=ui.indexOf('<Text style={s.body}>{m.practice.task}</Text>');
 const input=ui.indexOf('accessibilityLabel="Rozwiązanie pracy domowej"');
 const extras=ui.indexOf('Dodatkowe polecenia');
 assert.ok(start>0&&input>start&&extras>input,'Pole odpowiedzi powinno być bezpośrednio pod poleceniem, przed dodatkami');
 assert.ok(!ui.includes('Zrób zadanie również we własnym Excelu'));
 assert.ok(ui.includes("const nextReady=sectionProgress?.passed===true&&hasHomework;"),'Nie osłabiać warunków przejścia');
});

test('Licznik ćwiczeń bieżącego tematu odpowiada zapisanej liczbie, nie sztucznym czterem',()=>{
 const code=readFileSync(new URL('../app/temat-ksiegowosci.tsx',import.meta.url),'utf8');
 assert.match(code,/\{\(m\.exercises\|\|\[\]\)\.length\}/);
 assert.doesNotMatch(code,/Cztery zadania\. Klucz/);
});

test('Brak uprawnień do szkiców nie jest brakiem materiałów',()=>{
 assert.equal(materialCoverageKnown(false,true),false);
 assert.equal(materialCoverageKnown(true,true),true);
 assert.equal(materialCoverageKnown(true,false),false);
 assert.equal(materialCount(false,true,0,100),100,'Zwykły użytkownik nie widzi stu wersji do recenzji przez RLS, lecz RPC ujawnia licznik');
 assert.equal(materialCount(false,true,0,null),null,'Nie wolno zastępować nieznanej liczby zerem');
 assert.equal(materialCount(true,true,100,100),100);
 assert.equal(materialCount(true,false,0,100),null);
});
test('Ekran programu nie myli RLS z brakiem nowego materiału',()=>{
 const code=readFileSync(new URL('../app/program-ksiegowosci.tsx',import.meta.url),'utf8');
 assert.match(code,/access\.data\?\.is_editor===true/);
 assert.match(code,/const coverageKnown=materialCoverageKnown\(isEditor,materialsReady\)/);
 assert.match(code,/filter==='missing'&&!coverageKnown/);
 assert.match(code,/Ćwiczenia korzystają z fikcyjnych danych/);
 assert.match(code,/isEditor&&showEditorial&&<View style=\{s\.grid\}>/);
 assert.match(code,/showProgress&&<View style=\{s\.card\}>/);
 assert.match(code,/const \[expanded,setExpanded\]=useState<number\|null>\(null\)/);
 assert.doesNotMatch(code,/Wczesny dostęp pokazuje materiały wersji rozwojowej/);
 assert.doesNotMatch(code,/materialsReady\?total-draftCount/);
});


import {buildCorePracticeProgress} from '../src/accounting/core-progress.js';
test('Postęp 100 tematów: dokładne rozróżnienie poprawnych, błędnych i brakujących odpowiedzi',()=>{
 const topics=[{topic_no:1,status:'review_needed'},{topic_no:2,status:'complete'}];
 const materials=[
  {topic_no:1,material:{exercises:[{id:'a',type:'choice',choices:['X','Y'],correctIndex:1},{id:'b',type:'number',expected:12}]}},
  {topic_no:2,material:{exercises:[{id:'c',type:'number',expected:0}]}}
 ];
 const answers=[{topic_no:1,exercise_id:'a',answer:'1'},{topic_no:1,exercise_id:'b',answer:'11'},{topic_no:2,exercise_id:'c',answer:'0'}];
 const result=buildCorePracticeProgress(topics,materials,answers,{materialsReady:true,answersReady:true});
 assert.equal(result.known,true);assert.equal(result.availableTopics,2);
 assert.equal(result.correctAnswers,2);assert.equal(result.attemptedAnswers,3);
 assert.equal(result.totalQuestions,3);assert.equal(result.passedTopics,1);
 assert.equal(result.nextTopic,1);assert.equal(result.byTopic[2].passed,true);
 assert.equal(result.byTopic[1].passed,false);
});
test('Postęp bez odczytu jest nieznany, nie 0%; RLS i ukryte szkice nie dają pozornego zaliczenia',()=>{
 const topics=[{topic_no:1,status:'review_needed'}];
 const materials=[{topic_no:1,material:{exercises:[{id:'a',type:'number',expected:5}]}}];
 const answer=[{topic_no:1,exercise_id:'a',answer:'5'}];
 assert.equal(buildCorePracticeProgress(topics,materials,answer,{materialsReady:false,answersReady:true}).known,false);
 assert.equal(buildCorePracticeProgress(topics,materials,answer,{materialsReady:true,answersReady:false}).passedTopics,null);
 const blocked=buildCorePracticeProgress(topics,[],answer,{materialsReady:true,answersReady:true});
 assert.equal(blocked.availableTopics,0);assert.equal(blocked.nextTopic,null);
 assert.deepEqual(blocked.byTopic,{});
});
test('Postęp pomija nieznane odpowiedzi i odrzuca niejednoznaczne dane zamiast nadawać komplet',()=>{
 const topics=[{topic_no:1,status:'review_needed'}];
 const materials=[{topic_no:1,material:{exercises:[{id:'a',type:'choice',choices:['A','B'],correctIndex:1}]}}];
 const answers=[{topic_no:1,exercise_id:'a',answer:'1'},{topic_no:1,exercise_id:'a',answer:'0'}];
 const result=buildCorePracticeProgress(topics,materials,answers,{materialsReady:true,answersReady:true});
 assert.equal(result.passedTopics,0);assert.equal(result.attemptedAnswers,0);
 const stale=buildCorePracticeProgress(topics,materials,[{topic_no:1,exercise_id:'removed',answer:'1'}],{materialsReady:true,answersReady:true});
 assert.equal(stale.correctAnswers,0);assert.equal(stale.byTopic[1].total,1);
});
test('Mapa kursu czyta wyłącznie własne odpowiedzi przez RLS, nie wydaje dyplomu',()=>{
 const ui=readFileSync(new URL('../app/program-ksiegowosci.tsx',import.meta.url),'utf8');
 assert.ok(ui.includes(".from('ta_accounting_core_answers_v3')"));
 assert.ok(ui.includes(".eq('user_id',session.data.user.id)"));
 assert.ok(ui.includes("buildCorePracticeProgress(topics,practiceMaterials,savedAnswers"));
 assert.ok(!ui.includes("from('ta_certificates').insert"));
});


test('Czytnik tematu wymaga zapisania wszystkich poprawnych zadań przed przyciskiem następnego kroku',()=>{
 const code=readFileSync(new URL('../app/temat-ksiegowosci.tsx',import.meta.url),'utf8');
 assert.ok(code.includes('onSaved(exercise.id,answer);'));
 assert.ok(code.includes('setAnswers(old=>({...old,[id]:answer}))'));
 assert.ok(code.includes('const nextReady=sectionProgress?.passed===true&&hasHomework;'));
 assert.ok(code.includes('{nextReady&&topic!==null&&topic<100&&'));
 assert.ok(code.includes('{nextReady&&topic===100&&'));
 assert.ok(!code.includes("supabase.from('ta_certificates').insert"));
});

import {homeworkCanSubmit,homeworkSubmitted,homeworkVersion,homeworkProgress,firstUnfinishedPracticeTopic} from '../src/accounting/homework-core.js';
test('Zadania domowe: nie wolno uznać pustej pracy lub samego szkicu za oddanie',()=>{
 const words='Moja analiza dokumentów i obliczeń. '.repeat(5);
 assert.equal(homeworkCanSubmit(words),true);
 assert.equal(homeworkCanSubmit('krótki wynik'),false);
 assert.equal(homeworkSubmitted({version:1,response:words,submitted_at:null}),false);
 assert.equal(homeworkSubmitted({version:1,response:words,submitted_at:'2026-11-16T14:00:00Z'}),true);
 assert.equal(homeworkSubmitted({version:2,response:'krótki wynik',submitted_at:'2026-11-16T14:00:00Z'}),false);
 assert.equal(homeworkVersion({version:1}),1);
 assert.equal(homeworkVersion(null),null);
});
test('Zadania domowe: 100 tematów bez podwójnego naliczania i bez fikcyjnego dyplomu',()=>{
 const txt='Przeanalizowano wszystkie fikcyjne dokumenty, zapisano rachunek i wnioski. '.repeat(3);
 const accepted={topic_no:7,version:1,response:txt,submitted_at:'2026-11-16T14:00:00Z'};
 assert.deepEqual(homeworkProgress([accepted,accepted,{topic_no:8,version:1,response:txt,submitted_at:null}],100),
  {submitted:1,total:100,topics:[7]});
 assert.equal(homeworkProgress(null,100),null);
});
test('Samodzielne ćwiczenie księgowości: arkusz lokalny dostępny w każdej lekcji',()=>{
 const ui=readFileSync(new URL('../app/temat-ksiegowosci.tsx',import.meta.url),'utf8');
 const exporter=readFileSync(new URL('../src/accounting/homework-worksheet.js',import.meta.url),'utf8');
 assert.match(ui,/buildHomeworkCsv\(topic,lesson\.title_pl,lesson\.material\.practice\)/);
 assert.match(ui,/Pobierz arkusz pracy domowej \(Excel \/ CSV\)/);
 assert.match(ui,/onPress=\{downloadHomeworkWorksheet\}/);
 assert.match(exporter,/Samokontrola/);
 assert.doesNotMatch(exporter,/service_role|auth\.getUser|supabase\.from/);
});
test('Praktyka 100 tematów jest w czytniku, zapisywana przez RPC CAS, bez obejścia sesji',()=>{
 const code=readFileSync(new URL('../app/temat-ksiegowosci.tsx',import.meta.url),'utf8');
 assert.ok(code.includes("supabase.rpc('ta_accounting_core_homework_save'"));
 assert.ok(code.includes("p_expected_version:homeworkVersion(homework)"));
 assert.ok(code.includes("supabase.from('ta_accounting_core_homework_v3')"));
 assert.ok(code.includes("homeworkText===homework?.response"));
 assert.ok(code.includes("const nextReady=sectionProgress?.passed===true&&hasHomework;"));
 assert.ok(!code.includes("supabase.from('ta_accounting_core_homework_v3').insert"));
 assert.ok(!code.includes("supabase.from('ta_accounting_core_homework_v3').update"));
});

test('Praktyka pisemna: ukryte tematy nie zawyżają oddanych prac i nie odblokowują kursu',()=>{
 const long='Wykonałem pracę na dokumentach fikcyjnych i uzasadniłem każdy zapis. '.repeat(3);
 const samples=[{topic_no:2,response:long,version:1,submitted_at:'2026-11-16T14:15:00Z'},
 {topic_no:90,response:long,version:1,submitted_at:'2026-11-16T14:15:00Z'}];
 const x=homeworkProgress(samples,[1,2,3]);
 assert.deepEqual(x,{submitted:1,total:3,topics:[2]});
 assert.equal(firstUnfinishedPracticeTopic({known:true,byTopic:{1:{passed:true},2:{passed:true},3:{passed:false}}},x),1);
 assert.equal(firstUnfinishedPracticeTopic({known:false,byTopic:{}},x),null);
});
test('Program księgowości pokazuje prace domowe i pierwszy niezakończony temat',()=>{
 const ui=readFileSync(new URL('../app/program-ksiegowosci.tsx',import.meta.url),'utf8');
 assert.ok(ui.includes(".from('ta_accounting_core_homework_v3')"));
 assert.ok(ui.includes(".eq('user_id',session.data.user.id)"));
 assert.ok(ui.includes('firstUnfinishedPracticeTopic(practice,homeworks)'));
 assert.ok(ui.includes('homeworks.submitted}/{homeworks.total'));
});


test('Księgowość: zwykła oferta w katalogu i kategoria Biznes i praca',()=>{
 const home=readFileSync(new URL('../public/academy/index.html',import.meta.url),'utf8');
 const category=readFileSync(new URL('../public/academy/kategorie/biznes-i-praca.html',import.meta.url),'utf8');
 const page=readFileSync(new URL('../public/academy/ksiegowosc-od-podstaw.html',import.meta.url),'utf8');
 assert.doesNotMatch(home,/acct-feature-title|NOWOŚĆ · WCZESNY DOSTĘP/);
 assert.match(home,/const ACCOUNTING_CATALOG=/);
 assert.match(home,/function publicCatalogCourses\(/);
 assert.match(home,/const priorities=\['ai-bez-tajemnic','ksiegowosc-od-podstaw'(?:,'[^']+')*\]/);
 assert.match(home,/catalogCourseMatches\(c,query\)/);
 assert.match(category,/Księgowość od podstaw/);
 assert.doesNotMatch(category,/Księgowość od podstaw — Encyklopedia/);
 assert.match(page,/CIEKAWOSTKA/);
 assert.match(page,/100 tematów/);
 assert.match(page,/Kup kurs online/);
 assert.doesNotMatch(page,/wczesny dostęp|wersja rozwojowa|w trakcie recenzji/i);
});

test('Księgowość: standardowy zakup chroni zgodę, konto i potwierdzenie płatności',()=>{
 const checkout=readFileSync(new URL('../supabase/functions/ta-create-checkout/index.ts',import.meta.url),'utf8');
 const wallet=readFileSync(new URL('../supabase/functions/ta-credit/index.ts',import.meta.url),'utf8');
 const webhook=readFileSync(new URL('../supabase/functions/ta-stripe-webhook/index.ts',import.meta.url),'utf8');
 const view=readFileSync(new URL('../app/kup.tsx',import.meta.url),'utf8');
 for(const src of [checkout,wallet,webhook,view]){
  assert.doesNotMatch(src,/development_version_acknowledged|development_version_consent_required|accountingEarlyAccessNotice/);
 }
 assert.match(checkout,/accepted_terms/);
 assert.match(checkout,/immediate_content_consent/);
 assert.match(checkout,/ta_effective_course_price/);
 assert.match(wallet,/immediate_content_consent/);
 assert.match(webhook,/ta_enrollments/);
 assert.match(view,/termsAccepted/);
 assert.match(view,/earlyAccessConsent/);
});
