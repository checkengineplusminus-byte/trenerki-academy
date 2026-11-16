import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
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
test('Encyklopedia otwiera właściwy czytnik',()=>assert.deepEqual(courseDestination(A),{pathname:'/ksiegowosc'}));
test('Funkcja nawigacji zachowuje prawidłowy numer lekcji',()=>assert.deepEqual(courseDestination(A,'20'),{pathname:'/ksiegowosc',params:{lesson:'20'}}));
test('Dolna i górna granica numeru lekcji',()=>{for(const n of ['1','100000'])assert.equal(courseDestination(A,n).params.lesson,n);});
test('Nieprawidłowe numery nie przechodzą do adresu',()=>{for(const n of ['0','01','100001','-1','1.5','<script>',null,['2']])assert.deepEqual(courseDestination(A,n),{pathname:'/ksiegowosc'});});
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
 assert.deepEqual(courseDestination(A,'0'),{pathname:'/ksiegowosc'});
 assert.equal(source.split(guard).length,2,'Przekierowanie występuje tylko raz');
 assert.ok(source.indexOf(guard)<source.indexOf("supabase.auth.getUser()"),'Przekieruj przed starym odczytem danych');
 // Do not weaken the accounting reader guard. Canonicalize ONLY the reviewed
 // Excel-specific additions, then compare with the existing approved blob hashes.
 let sourceForAccounting=source;
 // Audited, read-only supplement: exactly one Anielka import + one lesson-only mount.
 const clarificationImport="import LessonClarification from '../src/LessonClarification';\n";
 const clarificationMount="   <LessonClarification key={slug+'-'+module} courseSlug={slug} lessonNo={module}/>\n";
 assert.equal(sourceForAccounting.split(clarificationImport).length,2,'Anielka: exactly one optional import');
 assert.equal(sourceForAccounting.split(clarificationMount).length,2,'Anielka: exactly one lesson-only note mount');
 assert.ok(sourceForAccounting.indexOf(clarificationMount)>sourceForAccounting.indexOf("lesson.title_pl"),
   'Podpowiedź Anielki jest częścią lekcji, nie autoryzacji księgowości');
 sourceForAccounting=sourceForAccounting.replace(clarificationImport,'').replace(clarificationMount,'');
 // Scope-limited Excel homework jump. This block is reviewed against main byte-for-byte:
 // it cannot alter accounting routes, Auth or lesson completion.
 const homeworkMarker=" const pendingExcelHomeworkRef=React.useRef(false);\n";
 if(sourceForAccounting.includes(homeworkMarker)){
  const approvedHomeworkUi=[
   homeworkMarker,
   ` function scrollToExcelHomework():boolean{
  if(slug!=='excel-skroty'||Platform.OS!=='web'||typeof document==='undefined')return false;
  const block=document.querySelector('[data-testid="excel-real-homework-'+module+'"]');
  if(!block)return false;
  const control=block.querySelector('[data-testid="excel-homework-toggle"]');
  // React Native Web may omit aria-expanded on a Pressable despite its internal state.
  // Fall back to the visible label; do not close homework already expanded.
  const expanded=control?.getAttribute('aria-expanded')==='true'||control?.textContent?.includes('Zwiń zadanie');
  if(control instanceof HTMLElement&&!expanded)control.click();
  block.scrollIntoView?.({behavior:'smooth',block:'start'});
  return true;
 }
 function openExcelHomework(){
  if(slug!=='excel-skroty')return;
  if(index===0&&!introRead){pendingExcelHomeworkRef.current=true;setIntroRead(true);return;}
  if(!scrollToExcelHomework()){pendingExcelHomeworkRef.current=true;setIntroRead(true);}
 }
`,
   ` useEffect(()=>{
  if(slug==='excel-skroty'&&pendingExcelHomeworkRef.current&&introRead&&scrollToExcelHomework())
   pendingExcelHomeworkRef.current=false;
 },[slug,module,introRead,items.length]);
`,
   `   {slug==='excel-skroty'&&Platform.OS==='web'&&
    <Pressable testID="excel-homework-quick-access" accessibilityRole="button"
     accessibilityLabel="Otwórz pracę domową w prawdziwym Excelu i pobierz pliki CSV"
     onPress={openExcelHomework}
     style={{minHeight:58,padding:14,backgroundColor:'#dceee0',borderWidth:2,borderColor:'#8ab99a',borderRadius:12,marginBottom:12,gap:5}}>
     <Text style={{fontWeight:'900',fontSize:16,color:'#1d5839'}}>📗 Praca domowa w prawdziwym Excelu — pobierz plik CSV ↓</Text>
     <Text style={{fontSize:12,lineHeight:20,color:'#37674a'}}>Każda lekcja ma własne ćwiczenie i wynik kontrolny. Kliknij, aby przejść do zadania i rozwinąć instrukcję.</Text>
    </Pressable>}
`
  ];
  for(const addition of approvedHomeworkUi){
   assert.equal(sourceForAccounting.split(addition).length,2,'Unreviewed change in Excel homework jump');
   sourceForAccounting=sourceForAccounting.replace(addition,'');
  }
 }
 const excelImport="import ExcelMasterGuide from '../src/ExcelMasterGuide';\n";
 if(sourceForAccounting.includes(excelImport)){
  const steps=[
   [excelImport,''],
   ["   {index===0&&slug==='excel-skroty'&&<ExcelMasterGuide lessonNo={module}/>}\n", ''],
   ["import ExcelVisualPractices from '../src/ExcelVisualPractices';\n", ''],
   ["   {slug==='excel-skroty'&&index>0&&<ExcelMasterGuide key={'excel-master-'+module} lessonNo={module}/>}\n", ''],
   ["   {slug==='excel-skroty'&&[9,15,17,18,20,25,26,29].includes(module)&&<ExcelVisualPractices key={'excel-visual-'+module} lessonNo={module}/>}\n", ''],
   [` function scrollToExcelGrid():boolean{
  if(slug!=='excel-skroty'||Platform.OS!=='web'||typeof document==='undefined')return false;
  // The button must land on the actual spreadsheet, not the shortcut quiz above it.
  const grid=document.querySelector('[data-testid="excel-workspace"]');
  if(!grid)return false;
  grid.scrollIntoView?.({behavior:'smooth',block:'start'});
  return true;
 }
 function openWorkshop(){
  if(!introRead){pendingWorkshopRef.current=true;setIntroRead(true);return;}
  if(scrollToExcelGrid())return;
  scrollRef.current?.scrollTo({y:Math.max(0,workshopYRef.current-18),animated:true});
 }`,` function openWorkshop(){
  if(!introRead){pendingWorkshopRef.current=true;setIntroRead(true);return;}
  scrollRef.current?.scrollTo({y:Math.max(0,workshopYRef.current-18),animated:true});
 }`],
   [` useEffect(()=>{
  if(pendingWorkshopRef.current&&introRead&&scrollToExcelGrid())pendingWorkshopRef.current=false;
 },[introRead,slug]);
`,''],
   [`       if(pendingWorkshopRef.current){
        if(scrollToExcelGrid())pendingWorkshopRef.current=false;
        else if(slug!=='excel-skroty'||Platform.OS!=='web'){
         pendingWorkshopRef.current=false;
         scrollRef.current?.scrollTo({y:Math.max(0,workshopYRef.current-18),animated:true});
        }
       }`,`       if(pendingWorkshopRef.current){pendingWorkshopRef.current=false;scrollRef.current?.scrollTo({y:Math.max(0,workshopYRef.current-18),animated:true});}`]
  ];
  for(const [addition,previous] of steps){
   assert.ok(sourceForAccounting.includes(addition),'Zmiana czytnika spoza sprawdzonego zakresu Excel: '+addition.slice(0,50));
   sourceForAccounting=sourceForAccounting.replace(addition,previous);
  }
 }
 const bytes=Buffer.from(sourceForAccounting.replace(guard,'').replace(importLine,''),'utf8');
 const hash=createHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
 // Przegląd oddzielnego commita be748774 (tylko import i ćwiczenie Excel) nie zmienia przekierowania księgowości.
 // Dopuszczamy wyłącznie dwa sprawdzone stany: starszy czytnik oraz
 // zmianę onboardingu samego Excel (13fab77), bez zmiany tras księgowości.
 // 15.11: użytkownik zlecił wstęp przed zadaniami i dokładną listę wymagań dla wszystkich kursów.
 const reviewedReaderHashes=new Set([
  '7afb5431e414749db7b441b42ed07af94f75dec9', // opening practice first reveals the introduction-gated lesson
  '12e478132297267229af76f44a752bd5514e22ea', // combined introductory reading and server-verified carpentry requirements
  'db094a43e9adcd3abb7629ee8ebd5ca4d260ee0e',
  'a7c5b5720baeb67a75be65b699d57212197eea60',
  '8526dbcfa26527f2b004c3ff6bf48ac3d4885e4a',
  '5bb86b0916e4fcdfe1376f770cc8a5e27358a076', // reviewed carpentry lesson progression
  '40028cffa8120c07c37d18d2527768994e089b9d', // previous AutoCAD UI version
  '955f3659546dcbeae6359955c8498ff2e951837c', // earlier review branch before hook fix
  'bb3bbe5a73190c30c53a55f90fb74b35fcb09802', // last approved learning renderer
  'f527827f502e29af60fe776b5a5df2d4bead1e12', // previous revision
  'be7644aca8cd1a5422708ee7c1855e37b0055784', // preceding reviewed CAD renderer
  'd168d1296dc0e2936460b52c5b674807c37b52eb', // prior reviewed AutoCAD reader
  '9ed77599d484d991956a544db2704b4edeb7e2b8', // previous review
  '104db6f1dc8d3eebbdb05c195012568d885a277c', // AutoCAD all-lesson instruction books and practice mount; accounting route unchanged
  '629b67d13927b791aff2924c18053b979d101358', // reviewed current Excel reader
  '46774c0f2a24a78e23f3c6075168f131f7580258', // PR #27: exactly two audited Anielka UI insertions
  '69b42978196bee5ecf968b52d7991fd005a84559' // audited 16.11: current main reader after removing only four exact homework UI additions, accounting navigation untouched
 ]);
 // Exact reviewed source hash is allowed in addition to the canonicalized Excel-only
 // hash. No wildcard: any subsequent unreviewed alteration is rejected.
 const directBytes=Buffer.from(source.replace(guard,'').replace(importLine,''),'utf8');
 const directHash=createHash('sha1').update(Buffer.from('blob '+directBytes.length+'\0')).update(directBytes).digest('hex');
 assert.ok(reviewedReaderHashes.has(hash)||reviewedReaderHashes.has(directHash),'Czytnik pozostałych kursów jest bez nieuzgodnionych zmian');
});
test('Karta kursu korzysta z właściwego RPC i nawigacji',()=>{const code=readFileSync(new URL('../app/moje-kursy.tsx',import.meta.url),'utf8');assert.ok(code.includes("supabase.rpc('ta_accounting_overview')"));assert.ok(code.includes('courseDestination(row.course_slug)'));assert.ok(code.includes('Przeczytanie nie jest zaliczeniem kursu.'));});
test('Podgląd właściciela nie zapisuje dostępu lub publikacji',()=>{const code=readFileSync(new URL('../app/moje-kursy.tsx',import.meta.url),'utf8');assert.ok(code.includes("academyAction('whoami')"));assert.ok(code.includes('Podgląd przygotowywanej encyklopedii'));assert.ok(!code.includes('service_role'));assert.ok(!code.includes(".update({published"));assert.ok(!code.includes(".insert({user_id"));});

test('Aktywny program księgowości nie jest liczony z archiwalnych lekcji',()=>{
 const code=readFileSync(new URL('../app/ksiegowosc.tsx',import.meta.url),'utf8');
 assert.match(code,/overview\.program_version==='core-v3-20261113'/);
 assert.match(code,/overview\.active_program\?\.topics===100/);
 assert.match(code,/overview\.active_program\.complete_topics/);
 assert.match(code,/Katalog wcześniejszych lekcji:/);
 assert.doesNotMatch(code,/Dostępne treści: \{overview\.is_editor\?overview\.authored_count/);
});
test('Data odniesienia i link nie są bez dowodu potwierdzeniem aktualności prawa',()=>{
 const archive=readFileSync(new URL('../app/ksiegowosc.tsx',import.meta.url),'utf8');
 const active=readFileSync(new URL('../app/temat-ksiegowosci.tsx',import.meta.url),'utf8');
 for(const code of [archive,active])assert.match(code,/Sama data/);
 assert.doesNotMatch(archive,/Sprawdzono opisany zakres:/);
 assert.doesNotMatch(active,/Data sprawdzenia treści prawnej:/);
 assert.doesNotMatch(active,/>Otwórz urzędowe źródło<\/Text>/);
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
 assert.match(code,/Nieudostępniona wersja nie oznacza braku opracowania/);
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
 assert.ok(code.includes('const nextReady=sectionProgress?.passed===true;'));
 assert.ok(code.includes('{nextReady&&topic!==null&&topic<100&&'));
 assert.ok(code.includes('{nextReady&&topic===100&&'));
 assert.ok(!code.includes("supabase.from('ta_certificates').insert"));
});
