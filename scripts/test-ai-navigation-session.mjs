import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('AI lesson and My Courses have exportable URLs without a transient root redirect',()=>{
 const layout=read('app/_layout.tsx');
 const protectedStart=layout.indexOf('<Stack.Protected guard={signedIn}');
 const publicStart=layout.indexOf('<Stack.Screen name="index"/>');
 assert(publicStart>=0&&protectedStart>publicStart);
 for(const screen of ['nauka','moje-kursy']){
  const html='<Stack.Screen name="'+screen+'"/>';
  assert.equal(layout.split(html).length,2,screen+' declared exactly once');
  assert(layout.indexOf(html)<protectedStart,screen+' must be exportable and not guarded by a transient session state');
 }
 assert(!layout.includes("if(!signedIn&&pathname==='/nauka')"),'No eager redirect from protected AI route');
 assert(layout.includes('<Stack.Protected guard={signedIn}'), 'Other protected routes remain guarded');
});
test('AI student access is still enforced by verified Supabase user and enrollment',()=>{
 const learning=read('app/nauka.tsx');
 assert(learning.includes("supabase.auth.getSession()"));
 assert(learning.includes("supabase.auth.getUser()"));
 assert(learning.includes("supabase.from('ta_enrollments')"));
 assert(learning.includes(".eq('course_slug',slug).eq('status','active')"));
 assert(learning.includes("supabase.from('ta_lessons')"));
 assert(learning.includes("if(sessionError)throw"));
 assert(learning.includes("if(ue)throw new Error("));
 assert(learning.includes("Spróbuj ponownie — bez wylogowania"));
 assert(!learning.includes('supabase.auth.signOut('));
 assert(learning.includes("router.replace({pathname:'/konto',params:{course:slug,next:'kup'}})"));
});
test('AI preview and owned checkout keep the current browser session',()=>{
 const ai=read('public/academy/kursy/ai-bez-tajemnic.html');
 const buy=read('app/kup.tsx');
 const my=read('app/moje-kursy.tsx');
 assert(ai.includes('href="/kup?course=ai-bez-tajemnic"'),'Do not show login to an already logged-in owner');
 assert(!ai.includes('href="/konto?course=ai-bez-tajemnic&amp;next=kup"'));
 assert(buy.includes("if(sessionError)throw new Error("));
 assert(buy.includes("if(authError)throw new Error("));
 assert(buy.includes("setReload(v=>v+1)"));
 assert(buy.includes("router.replace(accountingCourse?'/program-ksiegowosci':{pathname:'/nauka',params:{course:slug}})"));
 assert(buy.includes("window.location.assign('/nauka?course='+encodeURIComponent(slug))"),'AI purchase CTA must use stable same-origin page navigation');
 assert(my.includes("supabase.auth.signOut({scope:'local'})"),'Signing out of one device must not log out all devices');
 assert(my.includes("courseDestination(row.course_slug)"));
 assert(my.includes("window.location.assign('/nauka?course='+encodeURIComponent(row.course_slug))"),'Owned AI course card must use same-origin navigation');
 assert(my.includes("if(authError)throw new Error("));
});
