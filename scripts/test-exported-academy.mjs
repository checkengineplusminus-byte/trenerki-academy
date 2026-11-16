#!/usr/bin/env node
// Verify the actual Expo export contains the Academy, all five icon sprites,
// and the interactive assets referenced from the catalog. Run AFTER expo export.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, existsSync} from 'node:fs';
import {resolve, join} from 'node:path';
const root=resolve(process.argv[2]||'dist');
function required(relative){
 const file=join(root,relative);
 assert(existsSync(file),'Missing exported asset: '+relative);
 const data=readFileSync(file,'utf8');
 assert(data.length>100,'Empty exported asset: '+relative);
 return data;
}
const academy=required('academy/index.html');
required('academy/anielka-search.js');
const accountingOffer=required('academy/ksiegowosc-od-podstaw.html');
assert.match(accountingOffer,/<h1>Księgowość od podstaw<\/h1>/i);
assert.match(accountingOffer,/Faktury bez zgadywania/);
assert.match(accountingOffer,/CIEKAWOSTKA/);
assert.match(accountingOffer,/Kup kurs online/i);
assert.doesNotMatch(accountingOffer,/wczesny dostęp|wersja rozwojowa|w trakcie recenzji/i);
assert(!academy.includes('acct-feature-title'),'Accounting must not appear as a large homepage promotion');
assert(academy.includes('const ACCOUNTING_CATALOG='),'Accounting must be included as a regular category-only course card');
assert(required('academy/kategorie/biznes-i-praca.html').includes('/academy/ksiegowosc-od-podstaw.html'),'Accounting must be listed in the business course group');
required('academy/anielka-search.css');
required('academy/footer.css');
required('academy/app-footer.css');
const catalog=JSON.parse(academy.split('const COURSES=')[1].split('];')[0]+']');
assert.equal(catalog.length,81,'Expected 81 exported courses');
assert(academy.includes('class="course-icon-art"'),'Catalog does not preserve topic-specific fallback icons');
const photoManifest=JSON.parse(required('academy/course-photo-manifest.json'));
assert.equal(photoManifest.version,1,'Unsupported course photo manifest version');
assert.deepEqual(Object.keys(photoManifest.courses).sort(),catalog.map(course=>course.id).sort(),'Photo manifest must match the exported catalog');
const photoDigests=new Set();
for(const course of catalog){
 const photo=photoManifest.courses[course.id];
 assert.equal(photo.iconBundle,course.iconBundle,'Incorrect fallback icon bundle for '+course.id);
 assert(typeof photo.alt==='string'&&photo.alt.trim(),'Missing photo description for '+course.id);
 if(course.id==='excel-skroty'){
   // The Excel catalog image must be a genuine spreadsheet screenshot, not generic finance imagery.
   const realExcelScreenshot='https://upload.wikimedia.org/wikipedia/commons/0/0a/Anzahl_der_B%C3%A4ume_pro_Quadrat_1.png';
   assert.equal(photo.file,realExcelScreenshot,'Excel must use the verified real Excel screenshot');
   assert.equal(photo.license,'CC0 1.0','Missing image reuse provenance');
   assert(photo.alt.includes('Microsoft Excel'),'Excel screenshot alt text is not specific');
   assert(academy.includes('const EXCEL_REAL_SCREENSHOT=\''+realExcelScreenshot+'\''),'Catalog renderer must support the actual screenshot URL');
   assert(academy.includes('photo.src=spotlightFile?coursePhotoSrc(spotlightFile)'),'Featured Excel card must use the same image source');
   continue;
 }
 assert.equal(photo.file,course.id+'.webp','Unexpected photo filename for '+course.id);
 const image=readFileSync(join(root,'academy/photos',photo.file));
 assert(image.length>100&&image.toString('ascii',0,4)==='RIFF'&&image.toString('ascii',8,12)==='WEBP','Invalid WebP photo for '+course.id);
 const digest=createHash('sha256').update(image).digest('hex');
 assert(!photoDigests.has(digest),'The same photo is used on more than one course: '+course.id);
 photoDigests.add(digest);
}
assert(!academy.includes('<span class="card-emoji" role="img"'),'Obsolete emoji icons are still in use');
for(let i=1;i<=5;i++){
 const sprite=required('academy/course-icons-'+i+'.svg');
 const ids=[...sprite.matchAll(/<symbol id="course-([^"]+)"/g)];
 const courses=catalog.filter(c=>c.iconBundle===i);
 assert.equal(ids.length,courses.length,'Icon count in exported bundle '+i);
 for(const {id} of courses){
   assert(sprite.includes('id="course-'+id+'"'),'Course icon missing from exported bundle: '+id);
 }
}
required('academy/assets/craft-kolodziej.svg');
required('academy/assets/ciesla-dach.svg');
// The real AutoCAD training files and original-screen extracts must survive Expo export.
for(const file of ['autocad-triangle-lines.dxf','autocad-room-4000x3000.dxf','autocad-panel-A.dxf']){
 const dxf=required('academy/assets/'+file);
 assert(dxf.includes('9\n$INSUNITS\n70\n4\n'),'AutoCAD training DXF must use millimetres: '+file);
 assert(dxf.endsWith('0\nEOF\n'),'AutoCAD training DXF appears truncated: '+file);
}
for(const file of ['autocad-original-ribbon.png','autocad-original-tabs.png','autocad-original-command.png']){
 const path=join(root,'academy/assets',file);
 assert(existsSync(path),'Missing original Autodesk program screenshot: '+file);
 const png=readFileSync(path);
 assert(png.length>200&&png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'Broken original AutoCAD PNG: '+file);
}

const volunteerLanding=required('academy/kursy/zaufany-wolontariusz.html');
const volunteerLegacy=required('academy/kursy/zaufany-wolontariusz-nauka.html');
assert(!volunteerLanding.includes('bez konta'),'Volunteer landing promises access without an account');
assert(volunteerLegacy.includes('/materialy-wolontariusza'),'Legacy material URL must lead to authenticated materials');
assert(volunteerLegacy.length<4000&&!/<fieldset|data-answer|data-view|<textarea/.test(volunteerLegacy),
 'Private volunteer lessons and answers must not be shipped as public HTML');
console.log('✓ Expo export includes the academy catalog, search assets and course visuals');
console.log('✓ '+photoDigests.size+' distinct local course photos plus the verified CC0 Excel screenshot, with SVG fallbacks');
console.log('✓ Reference illustrations for wooden wheel and timber roof included');
console.log('✓ All 3 real AutoCAD DXF drawings and 3 original interface screenshots are included in Expo export');
