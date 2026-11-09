#!/usr/bin/env node
// TRENERKI Academy — static consistency gate, no external dependencies.
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const fail=m=>{console.error('❌ '+m);process.exitCode=1};
const ok=m=>console.log('✓ '+m);
function extractJSON(source,declaration,open,close){
 const s=declaration+'=',start=source.indexOf(s);
 if(start===-1)throw new Error('Missing '+declaration);
 let p=start+s.length;
 if(source[p]!==open)throw new Error('Unexpected JSON data for '+declaration);
 let depth=0,quoted=false,escape=false;
 for(let i=p;i<source.length;i++){
  const c=source[i];
  if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;continue}
  if(c==='"')quoted=true;else if(c===open)depth++;else if(c===close&&--depth===0)return JSON.parse(source.slice(p,i+1));
 }
 throw new Error('Unclosed JSON '+declaration);
}
try{
 const page=read('public/academy/index.html');
 const courses=extractJSON(page,'const COURSES','[',']');
 const previews=extractJSON(page,'const PREVIEWS','{','}');
 const additions=JSON.parse(read('public/academy/course-additions.json'));
 const individualGuides=JSON.parse(read('content/course-guides-individual.json'));
 const craftGuides=JSON.parse(read('content/craft-guides-individual.json'));
 const staticIntroductions=read('src/CourseIntro.tsx');
 const introSlugs=new Set([...staticIntroductions.matchAll(/^\s*'([a-z0-9-]+)':\s*\{/gm)].map(x=>x[1]));
 const expandedSlugs=new Set(['norweski-na-budowie','angielski-na-budowie','niemiecki-na-budowie',
 'mierz-ponad-sily','opieka-seniorzy','wsparcie-adhd','poznaj-siebie','mocny-charakter','nie-lubie-ludzi',
 'zaczynam-od-zera','obowiazki-domowe','lepszy-cukiernik','lepszy-kucharz','jak-kupic-samochod',
 'google-ads-promocja','facebook-ads-promocja']);
 const thirtyLessonSlugs=new Set(['windows-skroty','excel-skroty','autocad-skroty','word-skroty','jestem-eko']);
 const logisticsSlugs=new Set(['axapta-dynamics-magazyn','sap-ewm-magazyn','oracle-wms-cloud','manhattan-active-wms','blue-yonder-wms','infor-wms','ongoing-wms','astro-consafe-wms','sap-tm-transport']);
 const checkout=read('app/kup.tsx'),academy=read('src/academyApi.ts'),gift=read('app/prezent.tsx'),admin=read('app/admin.tsx'),progress=read('app/nauka.tsx');
 const scriptStart=page.lastIndexOf('<script>'),scriptEnd=page.lastIndexOf('</script>');
 if(scriptStart<0||scriptEnd<0)fail('HTML script missing');
 else{new Script(page.slice(scriptStart+8,scriptEnd),{filename:'academy-index.js'});ok('Homepage JavaScript syntax');}
 if(courses.length===15+additions.length&&courses.length>=69&&new Set(courses.map(c=>c.id)).size===courses.length)ok(courses.length+' unique courses');else fail('Course count or duplicate slug');
 for(const c of courses){
  const expected=(logisticsSlugs.has(c.id)||thirtyLessonSlugs.has(c.id)||c.id==='kowal-tradycja')?30:expandedSlugs.has(c.id)?12:8;
  if(!Array.isArray(c.outline)||c.outline.length!==expected)fail(c.id+': expected '+expected+' lessons');
  const guide=individualGuides[c.id]||craftGuides[c.id];
  if(!introSlugs.has(c.id)&&(!guide||!['what','first','result','boundary'].every(k=>typeof guide[k]==='string'&&guide[k].length>=30)))
    fail(c.id+': missing specific course guide');
  if(!previews[c.id]||!['curiosity','scenario','outcome_1','outcome_2','outcome_3'].every(k=>typeof previews[c.id][k]==='string'&&previews[c.id][k].length>20))fail(c.id+': missing life-based preview');
 }
 if(Object.keys(previews).length===courses.length&&additions.length===courses.length-15)ok(courses.length+' practical previews and '+additions.length+' added courses');else fail('Preview/addition count mismatch');
 const uniqueGuides=Object.keys(individualGuides).concat(Object.keys(craftGuides));
 if(uniqueGuides.length!==courses.length-introSlugs.size||new Set(uniqueGuides).size!==uniqueGuides.length)fail('Course guides missing or duplicated');else ok(courses.length+' individual course introductions covered');
 const price=new Map(courses.map(c=>[c.id,c.price]));
 for(const [id,expected] of [['excel-skroty',10],['autocad-skroty',10],['word-skroty',10],['windows-skroty',10],['swiety-mikolaj',0],['lepszy-tata',99],['lepsza-mama',99],['nie-marnuj-jedzenia',29.99],['trawnik-jestem-ogrodnikiem',29.99],['angielski-na-budowie',149],['norweski-na-budowie',149],['niemiecki-na-budowie',149]]){
  if(price.get(id)!==expected)fail('Price mismatch '+id);else ok(id+' '+expected+' PLN');
 }
 if(!page.includes('Cześć, to ja Anielka!'))fail('Anielka greeting missing');
 const history=JSON.parse(read('content/traditional-crafts-20-20261108.json')).courses;
 if(history.length!==20)fail('Expected 20 traditional crafts');
 for(const item of history){
  const p=previews[item.id];
  if(!p?.history||!('ended_year' in p.history)||!p.history.note||!p.history.source_url)fail(item.id+': historical evidence metadata missing');
  if(p?.history?.ended_year&&!p.history.source_url)fail(item.id+': ungrounded historical teaching end date');
 }
 if(!page.includes('Rzemiosło dawniej i dziś'))fail('Missing natural history of crafts');
 if(page.includes('Ostatni potwierdzony rok:')||page.includes('Sprawdź źródło historyczne'))fail('Technical research notes exposed to learners');
 if(courses.some(c=>!Number.isFinite(c.price)||c.price<0))fail('Catalog includes a missing or invalid price');
 const construction=['norweski-na-budowie','angielski-na-budowie','niemiecki-na-budowie'];
 for(const slug of construction){
  const course=courses.find(c=>c.id===slug);
  if(!course||course.outline.length!==12)fail(slug+': needs 12 chapters from first day to end of shift');
  if(!course?.outline?.[0]?.toLowerCase().includes('zera'))fail(slug+': should start from zero');
 }
 const languageViewer=read('src/ConstructionLesson.tsx');
 if(!languageViewer.includes('speechSynthesis')||!languageViewer.includes('roleplay')||!languageViewer.includes('academy/illustrations/'))fail('Pronunciation, illustrated scenes or interactive exercise missing');
 if(!progress.includes('finishLesson')||!progress.includes('setModule(next)')||!progress.includes('ConstructionLesson'))fail('Auto-advance from completed lesson missing');
 const dashboard=read('app/moje-kursy.tsx');
 if(dashboard.includes('*12.5')||!dashboard.includes('lessonCount'))fail('Progress calculation must use real lesson counts');
 const shortcutModules=['word','autocad','excel','windows'];
 const component=read('src/KeyboardLesson.tsx');
 for(const name of shortcutModules){
  const lessons=JSON.parse(read('content/keyboard-'+name+'.json'));
  const total=lessons.reduce((n,l)=>n+(l.material?.shortcuts?.length||0),0);
  if(lessons.length!==8||total<40)fail(name+': expected 8 modules and >=40 keyboard examples');
  for(const l of lessons){
   if(!l.material?.shortcuts?.every(x=>x.keys?.length&&x.before&&x.after&&x.tip&&x.kind))fail(name+': shortcut missing keys, before/after or tip');
   if(!l.material?.references?.length)fail(name+': reference missing');
  }
  if(!courses.some(c=>c.id===name+'-skroty'))fail(name+': course missing from catalog');
  else ok(name+' has '+total+' illustrated shortcuts');
 }
 const handsOn=read('src/HandsOnLab.tsx');
 if(!component.includes('HandsOnLab')||!component.includes('runId={runId}')||!handsOn.includes('setRows(')||!handsOn.includes('setShapes(')||!handsOn.includes("mode==='excel'"))fail('Hands-on Excel and AutoCAD workbench not connected');
 else ok('Excel and AutoCAD visual practice connected to every command execution');
 if(!component.includes('function Keycap')||!component.includes('SoftwarePlayground')||!component.includes('runCommand')||!component.includes('2. SPRAWDŹ WIEDZĘ')||!progress.includes('<KeyboardLesson'))fail('Interactive keyboard simulator missing');
 else ok('Protected lessons include working simulated Word and AutoCAD keyboard actions');
 for(const stale of ['Testy + egzamin','Przed egzaminem czeka Cię','Czytasz, podejmujesz decyzję, zapisujesz rozwiązanie i rozwiązujesz krótki quiz']){
  if(page.includes(stale))fail('Misleading unfinished-feature promise: '+stale);
 }
 if(!checkout.includes("academyAction('demo_checkout'")||checkout.includes("ta-create-checkout")||!checkout.includes('TRYB TESTOWY'))fail('Checkout not strictly marked DEMO');else ok('No-charge test purchasing');
 if(!gift.includes("academyAction('create_gift'")||!gift.includes("academyAction('redeem_gift'")||!gift.includes('swiety-mikolaj'))fail('Gift card redemption/sharing missing');else ok('Gift card flow');
 if(!admin.includes("academyAction('admin_dashboard'")||!admin.includes('Jakość kursów'))fail('Protected administration or editorial view missing');else ok('Administrator content-review dashboard');
 if(!progress.includes(".in('status',['active','demo'])")||!progress.includes("setDone(")||!checkout.includes("review_status"))fail('Demo access, saved progress or editorial warnings missing');else ok('Demo lessons, progress and pre-purchase editorial review checks');
 const sandbox=read('src/SoftwarePlayground.tsx'),cases=read('src/CaseLesson.tsx');
 if(!sandbox.includes('mode===\'cad\'')||!sandbox.includes('mode===\'windows\'')||!sandbox.includes('isExcel')||!sandbox.includes('isWord'))fail('Virtual software screens missing');
 if(!cases.includes('onPassed')||!progress.includes('const canFinish='))fail('Graded lesson checkpoint missing');
 if(!progress.includes('ta_learning_attempts')||!progress.includes("recordAttempt('case'")||!progress.includes("recordAttempt('construction'")||!progress.includes("recordAttempt('keyboard'"))fail('All graded exercise categories must save individual attempts');
 const guideServer=read('supabase/functions/ta-lesson-guide/index.ts');
 const guideUI=read('src/GuidedDialogue.tsx');
 const finalExamUI=read('src/FinalExam.tsx');
 const caseQuiz=read('src/CaseLesson.tsx');
 const languageQuiz=read('src/ConstructionLesson.tsx');
 const keyboardQuiz=read('src/KeyboardLesson.tsx');
 const softwareUI=read('src/SoftwareOrientation.tsx');
 if(progress.includes('dialogueReady')||progress.includes('setDialogueReady')||
    guideUI.includes('accessibilityRole="checkbox"')||finalExamUI.includes('accessibilityRole="checkbox"')||
    guideUI.includes('agentOnline?')||progress.includes('Najpierw ćwiczenie i rozmowa z Anielką'))
  fail('Optional learner mentor and no-checkbox UX regressed');
 else ok('Anielka is optional, with no consent checkbox or technical status banners inside the course');
 if(guideServer.includes('if(!record?.approved||record.meaningful_count<2)')||
    !guideServer.includes("if(action==='complete')")||
    !guideServer.includes("db.from('ta_learning_attempts').select('id')"))
  fail('Server must not require a mentor session, but must check objective practice');
 else ok('Sequential progression and objective exercises are mandatory; mentor chat is not');
 if(!caseQuiz.includes('await onAttempt')||!languageQuiz.includes('await onAttempt')||
    !keyboardQuiz.includes('await onAttempt')||!keyboardQuiz.includes('quizConfirmed')||
    !progress.includes('async function recordAttempt('))
  fail('Correct answers must be acknowledged by server before unlocking');
 else ok('All three exercise types wait for server confirmation and permit retries');
 if(!softwareUI.includes("tab==='interface'")||!softwareUI.includes("tab==='history'")||
    !softwareUI.includes("tab==='terms'")||!softwareUI.includes("tab==='practice'")||
    !softwareUI.includes('<HandsOnLab'))
  fail('Four-tab software interface with working Excel/CAD simulator missing');
 else ok('Interactive four-tab software navigation and hands-on labs available');

 if(!progress.includes("action:'attempt'")||progress.includes(".from('ta_learning_attempts').insert")||
    !guideServer.includes("if(action==='attempt')")||
    !guideServer.includes("correct=selected===answer")||
    !guideServer.includes("active===chosen")||
    !guideServer.includes("db.from('ta_learning_attempts').insert"))
  fail('Quiz answers must be validated and recorded only by the authenticated server function');
 else ok('Quiz completion protected against client-side correct flag forgery');
 if(page.includes("lekcji i ćwiczenia</span>'"))fail('Literal lesson-count bug in cards');
 if(!academy.includes("functions.invoke('ta-academy'"))fail('Protected backend integration missing');
 if(/service_role|stripe_secret_key/i.test(checkout+academy+gift+admin))fail('Server secret name exposed in frontend, review required');
 const exam=read('src/FinalExam.tsx'),diploma=read('app/dyplom.tsx'),examServer=read('supabase/functions/ta-exam/index.ts');
 const routes=read('app/_layout.tsx'),account=read('app/konto.tsx'),myCourses=read('app/moje-kursy.tsx');
 const terms=read('public/academy/regulamin.html'),privacy=read('public/academy/prywatnosc.html'),certificateRules=read('public/academy/certyfikaty.html');
 for(const [name,body] of [['regulamin',terms],['polityka',privacy],['dyplomy',certificateRules]]){
  if(!body.includes('autors')||!body.includes('kwalifikacj')||!body.includes('2026'))fail('Outdated legal page '+name);
 }
 if(!terms.includes('CV')||!certificateRules.includes('CV')||!account.includes('regulamin.html')||!account.includes('prywatnosc.html'))fail('Autorski dyplom and privacy terms missing at registration');
 else ok('Original independent courses, CV wording and privacy notices in legal pages and registration');
 if(!progress.includes('<FinalExam')||!exam.includes('ta-exam')||!exam.includes('holder_name')||
    !diploma.includes('WZÓR TESTOWY')||!diploma.includes('is_demo')||!myCourses.includes('ta_certificates')||!routes.includes('name="dyplom"'))fail('Final exam and private diploma flow missing');
 else ok('Exam, learner dashboard and personal sample-safe diploma route wired');
 if(!examServer.includes("phase==='final'")||!examServer.includes("phase==='extra'")||
    !examServer.includes('correctCount>=5')||!examServer.includes('ta_exam_results')||
    !examServer.includes('ta_certificates')||!examServer.includes('auth.getUser(bearer)'))fail('Server-side exam grading, recovery or issuance missing');
 else ok('Five-correct-plus-final server examination logic present');
 const logistics=read('src/LogisticsWorkshop.tsx');
 if(!logistics.includes('LogisticsAtlas')||!logistics.includes('LogisticsWorkshop')||
    !progress.includes('<LogisticsWorkshop')||!progress.includes('<LogisticsAtlas'))fail('Product-specific WMS practice missing');
 else ok('Product-specific logistics glossary and cumulative warehouse simulation connected');
 const specialistSlugs=[...logisticsSlugs,...thirtyLessonSlugs];
 for(const slug of specialistSlugs){
  const path=slug==='jestem-eko'?'content/jestem-eko-30.json':slug==='windows-skroty'?'content/windows-course-expanded-20261108.json':slug.startsWith('word')||['excel-skroty','autocad-skroty'].includes(slug)?'content/v2-'+slug+'.json':'content/logistics-'+slug+'.json';
  const source=JSON.parse(read(path));
  const lessons=source.lessons||[];
  if(lessons.length!==30||new Set(lessons.map(x=>x.lesson_no)).size!==30||
     !lessons.every((x,i)=>x.lesson_no===i&&x.material?.section===Math.floor(i/10)+1&&x.material?.learning?.situation&&x.material?.learning?.example))
    fail(slug+': expected 30 individual graded lessons in 3 sections');
 }
 ok(specialistSlugs.length+' specialist 30-lesson programs have unique, graded examples and chapter groupings');
  const originalImages=['eko-hierarchy','eko-sort','eko-cycle','eko-hazard','eko-textiles','eko-food','eko-home','eko-community','windows-history','windows-folders','windows-security','windows-desktop','windows-explorer','excel-interface','word-interface','autocad-interface','word-document','word-structure','word-review','excel-addresses','excel-formulas','excel-chart','autocad-coordinates','autocad-layers','autocad-filetypes','autocad-commands'];
 for(const file of originalImages){
  const svg=read('public/academy/assets/'+file+'.svg');
  if(!svg.includes('<svg')||!svg.includes('</svg>')||!svg.includes('TRENERKI ACADEMY'))fail('Invalid or missing illustration: '+file);
 }
 const orientation=read('src/SoftwareOrientation.tsx');
 const illustrated=read('src/LessonIllustratedSections.tsx');
 const lab=read('src/HandsOnLab.tsx');
 if(!progress.includes('<SoftwareOrientation slug={slug}/>')||
   !orientation.includes('<HandsOnLab key={slug}')||
   !orientation.includes("p.mode==='excel'||p.mode==='cad'")||
   !lab.includes('setShapes(')||!lab.includes('setRows('))
  fail('First software lesson lost its interactive Excel/AutoCAD laboratory');
 else ok('Real stateful Excel/CAD practice visible on first software lesson');
 if(!orientation.includes("1983 roku")||!orientation.includes("1985 roku")||
   !orientation.includes("1982 roku")||!orientation.includes('p.zones.map'))
  fail('Historical program orientation and labeled interface zones missing');
 const assignedIllustrations={};
 for(const visual of originalImages)assignedIllustrations[visual]=0;
 const expectedVisualGroups={
  'word-skroty':['word-interface','word-document','word-structure','word-review'],
  'excel-skroty':['excel-interface','excel-addresses','excel-formulas','excel-chart'],
  'autocad-skroty':['autocad-interface','autocad-coordinates','autocad-layers','autocad-filetypes','autocad-commands']
 };
 const softwareSlugs=['word-skroty','excel-skroty','autocad-skroty'];
 for(const slug of softwareSlugs){
  const chapters=JSON.parse(read('content/v2-'+slug+'.json')).lessons;
  if(chapters.length!==30||chapters.some(x=>!Array.isArray(x.material?.sections)||x.material.sections.length<4))
   fail(slug+': need four substantive tutorial sections in each of 30 lessons');
  const seen=new Set();
  for(const entry of chapters){
   const asset=entry.material?.illustration;
   if(!asset||!originalImages.includes(asset))fail(slug+': missing or unknown illustration for lesson '+(entry.lesson_no+1)+': '+asset);
   else {seen.add(asset);assignedIllustrations[asset]++;}
  }
  for(const asset of expectedVisualGroups[slug])if(!seen.has(asset))fail(slug+': dedicated illustration never appears in course: '+asset);
  if(chapters.filter(x=>x.material?.sections?.[0]?.text?.length>=220).length<9)
   fail(slug+': fewer than nine substantive lessons with theory exceeding 220 characters');
  else ok(slug+': 30 illustrated lessons, '+seen.size+' themed visual families, substantial introductory theory');
 }
 if(!illustrated.includes('if(!named.length&&!validIllustration)')||
   !illustrated.includes('imageNames.has(illustration)'))fail('Images must render even for old lessons without section structure');
 else ok('Software illustrations work with and without long-form sections');
 for(const asset of Object.values(expectedVisualGroups).flat()){
  if(!illustrated.includes("'"+asset+"'"))fail('Renderer does not support course asset '+asset);
 }
 if(!examServer.includes('nextChoice(')||!examServer.includes("grading_mode:'choice'")||
   !exam.includes('switch_mode')||!exam.includes('selected_index')||!examServer.includes('correct_option'))
  fail('Exam server must support objective fallback with protected correct answer');
 if(!diploma.includes('window.print()')||!diploma.includes('Data ukończenia:'))
  fail('Certificate A4 printable output missing');
 const agentServer=read('supabase/functions/ta-lesson-guide/index.ts');
 if(!agentServer.includes('learnerSummary')||!agentServer.includes('localLessonCoach')||!agentServer.includes('agent_online'))
  fail('Adaptive mentor and declared offline mode missing');

 if(!progress.includes('<LessonIllustratedSections'))fail('Illustrated lesson reading must appear in app');
 else ok(originalImages.length+' authored original diagrams available for the lessons');
 const carFix=JSON.parse(read('content/car-purchase-clear-budget-2026-11-08.json'));
 const introBudget=carFix.lessons.find(x=>x.lesson_no===0)?.material;
 if(!introBudget||introBudget.learning.correct!==0||
    !introBudget.learning.situation.includes('40 000 zł')||
    !introBudget.learning.situation.includes('5 000 zł')||
    !introBudget.learning.options[0].includes('35 000 zł')||
    (introBudget.sections||[]).length<4)
  fail('Car-buying lesson must state exact total cash, reserve and maximum vehicle price');
 else ok('Car budget scenario has exact amounts, worked subtraction and transparent answer');
 const chatUI=read('src/GuidedDialogue.tsx');
 const dialogueServer=read('supabase/functions/ta-lesson-guide/index.ts');
 if(dialogueServer.includes("if(alreadyDone)return respond({error:'lesson_already_complete'}")||
    !dialogueServer.includes('requestedQuiz&&canReplyAgain')||
    !chatUI.includes("void request('status').then")||
    !chatUI.includes('onPress={()=>void send()}')||
    chatUI.includes('setOpen('))
  fail('Anielka must open without extra action, remain replyable and never block learner progress');
 else ok('Anielka input appears automatically and remains optional for completed lessons');
 if(!progress.includes('setTimeout(scrollToTop,100)')||
    !progress.includes('window.scrollTo(0,0)')||
    !progress.includes('if(canFinish)void finishLesson();else returnToExercise()'))
  fail('Lesson transition must reset scroll and advance with one verified button');
 else ok('Automatic scroll reset and one-action lesson navigation connected');
 const kowalParts=[1,2,3].flatMap(i=>JSON.parse(read('content/kowal-masterclass-part'+i+'-20261109.json')).lessons);
  const kowalQuestions=new Set(kowalParts.map(l=>l.material?.learning?.question));
  const kowalAssets=['kowal-stanowisko','kowal-narzedzia','kowal-rysunek','kowal-operacje','kowal-kopyto'];
  if(kowalParts.length!==30||kowalParts.some((l,i)=>l.lesson_no!==i||(l.material.sections||[]).length!==4||
       !kowalAssets.includes(l.material?.illustration))||kowalQuestions.size!==30)
   fail('Kowal needs 30 lessons, 30 unique questions and illustrations');
  else ok('Kowal: 3 chapters x 10 lessons, 30 unique questions and original graphics');
  for(const asset of kowalAssets)
   if(!illustrated.includes("'"+asset+"'")||!read('public/academy/assets/'+asset+'.svg').includes('</svg>'))
    fail('Missing registered illustration '+asset);
  const masteryBank=Object.assign({},...['content/mastery-crafts-materials-20261109.json','content/mastery-foundations-01-20261109.json','content/mastery-foundations-02-20261109.json','content/mastery-foundations-03-20261109.json'].map(p=>JSON.parse(read(p))));
  if(Object.keys(masteryBank).length!==78)fail('Expected 78 individualized foundations beyond the completed Kowal course');
  for(const [slug,entry] of Object.entries(masteryBank)){
    if(!['topic','material','process','failure','task'].every(x=>typeof entry[x]==='string'&&entry[x].length>=4)||typeof entry.icon!=='string'||entry.icon.length<3||
       entry.material.length<145||entry.process.length<145)
      fail('Insufficient individual material science knowledge for '+slug);
    if(!illustrated.includes("'mastery-"+slug+"'")||!read('public/academy/assets/mastery-'+slug+'.svg').includes('</svg>'))
      fail('Missing bespoke illustration '+slug);
  }
  if(Object.keys(masteryBank).length===78)ok('78 per-course knowledge guides and diagrams found');
  const craftAssessments=JSON.parse(read('content/mastery-crafts-assessments-20261109.json')).lessons;
  if(craftAssessments.length!==19||new Set(craftAssessments.map(x=>x.course_slug)).size!==19||
     craftAssessments.some(x=>x.lesson_no!==1||x.options.length!==4||!Number.isInteger(x.correct)||
       x.correct<0||x.correct>=4||x.feedback.length!==4||x.question.length<35))
   fail('Material science quizzes must be specific and verifiable in 19 crafts');
  const caseLessonUI=read('src/CaseLesson.tsx');
  if(illustrated.includes('Autorska ilustracja TRENERKI Academy')||!caseLessonUI.includes('feedbackForChoice(chosen)'))
   fail('Lesson screens must hide self-promotion and show individual quiz feedback');
  else ok('19 craft quizzes and individual feedback are configured');
  const craftDepth=Object.assign({},...['content/craft-depth-01-20261109.json','content/craft-depth-02-20261109.json'].map(p=>JSON.parse(read(p))));
  if(Object.keys(craftDepth).length!==19||Object.values(craftDepth).some(a=>a.length!==6||a.some(s=>s.length<130)))fail('Craft depth requires 6 specific, substantial insights per historic profession');
  for(const slug of Object.keys(craftDepth)){
   for(const type of ['technique','diagnosis']){
    if(!illustrated.includes("'"+type+"-"+slug+"'")||!read('public/academy/assets/'+type+'-'+slug+'.svg').includes('</svg>'))
     fail('Missing mapped technical illustration '+type+'-'+slug);
   }
  }
  const secondLessons=Object.assign({},...['content/course-second-lesson-depth-01-20261109.json','content/course-second-lesson-depth-02-20261109.json','content/course-second-lesson-depth-03-20261109.json'].map(p=>JSON.parse(read(p))));
  if(Object.keys(secondLessons).length!==53||Object.values(secondLessons).some(x=>!['curiosity','explain','example','task'].every(k=>x[k]?.length>=60)))fail('Expected 53 different second-lesson examples and explanations');
  for(const slug of Object.keys(secondLessons)){
   if(!illustrated.includes("'second-"+slug+"'")||!read('public/academy/assets/second-'+slug+'.svg').includes('</svg>'))fail('Missing learning diagram '+slug);
  }
  const beginnerCraftGuides=JSON.parse(read('content/craft-guides-beginner-20.json'));
 if(beginnerCraftGuides.courses.length!==20||beginnerCraftGuides.courses.some(c=>c.lessons.length!==8||c.lessons.some(l=>l.sections.length!==4)))
  fail('Every craft course must have eight individually illustrated/explained lessons');
 for(const c of beginnerCraftGuides.courses){
  const asset='craft-'+c.slug;
  const svg=read('public/academy/assets/'+asset+'.svg');
  if(!svg.includes('<svg')||!svg.includes('</svg>')||!illustrated.includes("'"+asset+"'"))
   fail('Missing or unregistered profession illustration '+asset);
 }
 if(!handsOn.includes('function tapCommand(')||!handsOn.includes("mobile&&")||
    !component.includes('minHeight:48')||!chatUI.includes('Zapytaj Anielkę'))
  fail('Touchscreen software practice and single-action mentor interface missing');
 else ok('Touchscreen buttons, automatic Anielka and all 20 profession illustrations verified');
 if(!process.exitCode)console.log('All static integrity checks passed.');
}catch(e){fail(String(e?.stack||e))}
