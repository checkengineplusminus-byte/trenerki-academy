#!/usr/bin/env node
// Verify the actual Expo export contains the Academy, all five icon sprites,
// and the interactive assets referenced from the catalog. Run AFTER expo export.
import assert from 'node:assert/strict';
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
required('academy/anielka-search.css');
const catalog=JSON.parse(academy.split('const COURSES=')[1].split('];')[0]+']');
assert.equal(catalog.length,81,'Expected 81 exported courses');
assert(academy.includes('class="course-icon-art"'),'Catalog does not render topic-specific icons');
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
const volunteerLanding=required('academy/kursy/zaufany-wolontariusz.html');
const volunteerLegacy=required('academy/kursy/zaufany-wolontariusz-nauka.html');
assert(!volunteerLanding.includes('bez konta'),'Volunteer landing promises access without an account');
assert(volunteerLegacy.includes('/materialy-wolontariusza'),'Legacy material URL must lead to authenticated materials');
assert(volunteerLegacy.length<4000&&!/<fieldset|data-answer|data-view|<textarea/.test(volunteerLegacy),
 'Private volunteer lessons and answers must not be shipped as public HTML');
console.log('✓ Expo export includes the academy catalog, search assets and course visuals');
console.log('✓ All '+catalog.length+' referenced course icons are shipped in the exported site');
console.log('✓ Reference illustrations for wooden wheel and timber roof included');
