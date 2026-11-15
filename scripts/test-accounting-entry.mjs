import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ACCOUNTING_COURSE as A,courseDestination,accountingProgress,courseFinished} from '../src/accounting/course-entry.js';
import {materialCoverageKnown,materialCount} from '../src/accounting/program-visibility.js';
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
 const bytes=Buffer.from(source.replace(guard,'').replace(importLine,''),'utf8');
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
  '40028cffa8120c07c37d18d2527768994e089b9d' // reviewed AutoCAD real DXF links and screenshots only; accounting route unchanged
 ]);
 assert.ok(reviewedReaderHashes.has(hash),'Czytnik pozostałych kursów jest bez nieuzgodnionych zmian');
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
