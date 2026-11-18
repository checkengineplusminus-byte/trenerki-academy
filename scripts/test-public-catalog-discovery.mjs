import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,Script,runInContext} from 'node:vm';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('public/academy/index.html');
const anielka=read('public/academy/anielka-search.js');
const match=html.match(/^const COURSES=(\[.*\]);$/m);
assert(match,'Static catalogue not found');
const core=JSON.parse(match[1]);
assert.equal(core.length,81,'Preserve historical 81 course baseline');
const intro=html.slice(html.indexOf('const ACCOUNTING_CATALOG='),html.indexOf('const $='));
const catalog=html.slice(html.indexOf('let catalogVisibleByCategory={}'),html.indexOf('function taAffiliateCode(){'));
assert(intro.includes('function publicCatalogCourses()'),'Public catalogue source must expose published course lookup');
assert(catalog.includes('function catalogCourseMatches('),'Search cannot drop standalone paid courses');
const mainInline=html.slice(html.indexOf('const COURSES='),html.lastIndexOf('</script>'));
new Script(mainInline,{filename:'academy-inline.js'}); // syntax check, no execution

const elements={'#chips':{innerHTML:''},'#course-cards':{innerHTML:''}};
const env={
 window:{innerWidth:1280,anielkaCatalogIds:()=>['excel-skroty']},
 $:id=>elements[id],
 esc:value=>String(value??''),
 cardHTML:c=>'<article data-course-id="'+c.id+'">'+c.title+'</article>',
 console
};
createContext(env);
new Script('const COURSES='+match[1]+';\n'+intro+
 '\nlet filter="Wszystkie",query="";\n'+catalog,
 {filename:'catalog-discovery.js'}).runInContext(env);
function search(q){
 runInContext('query='+JSON.stringify(q)+';filter="Wszystkie";updateCatalog();',env);
 return elements['#course-cards'].innerHTML;
}
for(const q of ['AI','ai','sztuczna inteligencja','ChatGPT']){
 assert(search(q).includes('data-course-id="ai-bez-tajemnic"'),
  'No public AI course for search '+q);
}
for(const q of ['księgowość','ksiegowosc','księgowości','rachunkowość','faktury']){
 assert(search(q).includes('data-course-id="ksiegowosc-od-podstaw"'),
  'No public accounting course for search '+q);
}
const featured=search('');
assert(featured.includes('data-course-id="ai-bez-tajemnic"'));
assert(featured.includes('data-course-id="ksiegowosc-od-podstaw"'));
assert.equal((featured.match(/data-course-id=/g)||[]).length,12,
 'Keep 3 free plus 9 featured course cards');

runInContext('livePublishedCatalogIds=new Set(COURSES.map(x=>x.id).concat("ksiegowosc-od-podstaw"));',env);
assert(!search('AI').includes('data-course-id="ai-bez-tajemnic"'),
 'Withdrawal from live published list must hide course');
runInContext('livePublishedCatalogIds=null;',env);

const handlers={},ui={out:{innerHTML:'',scrollIntoView(){}},
 peek:{innerHTML:''},question:{value:''}};
const rec={
 COURSES:core,
 window:{TrenerkiPublicCatalog:()=>[
  ...core,
  {id:'ai-bez-tajemnic',title:'AI bez tajemnic',cat:'Technologie i logistyka',
   short:'Sztuczna inteligencja',outline:[],price:39.99},
  {id:'ksiegowosc-od-podstaw',title:'Księgowość od podstaw',cat:'Biznes i praca',
   short:'Faktury i VAT',outline:[],price:999}
 ]},
 document:{
  addEventListener(name,fn){handlers[name]=fn;},
  getElementById(id){return id==='anielka-output'?ui.out:
    id==='anielka-peek'?ui.peek:id==='anielka-question'?ui.question:null;}
 },
 console,searchCourses(q){rec.lastSearch=q;}
};
createContext(rec);
new Script(anielka,{filename:'anielka-search.js'}).runInContext(rec);
assert.equal(rec.window.anielkaFindCourses('AI').primary.id,'ai-bez-tajemnic');
assert.equal(rec.window.anielkaFindCourses('ksiegowosc').primary.id,'ksiegowosc-od-podstaw');
handlers.input({target:{id:'anielka-question',value:'AI'}});
assert.equal(rec.lastSearch,'AI','Two-letter query must reach public catalog');
assert(ui.peek.innerHTML.includes('AI bez tajemnic'));
handlers.input({target:{id:'anielka-question',value:'księgowość'}});
assert(ui.peek.innerHTML.includes('Księgowość od podstaw'));

console.log('✓ Unauthenticated visitor: AI / ChatGPT / sztuczna inteligencja and księgowość / ksiegowosc visible');
console.log('✓ Featured courses, unchanged 81-core catalogue, approved fallback, live unpublish protection');
console.log('✓ Anielka and direct catalog search agree for both new paid courses, without login or admin');
