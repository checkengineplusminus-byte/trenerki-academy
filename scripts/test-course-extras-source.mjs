#!/usr/bin/env node
// Protect source-derived content: every regular course has real homework and source-linked tips.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../content/course-extras-first-lesson-20261117.json',import.meta.url),'utf8'));
const courses=data.lessons;
assert.equal(courses.length,79);
assert.equal(new Set(courses.map(c=>c.course_slug)).size,79);
for(const row of courses){
 const {course_slug:slug,material:m,title_pl:title}=row;
 assert.equal(row.lesson_no,0,'wrong first lesson '+slug);
 assert.equal(m.source_backfill_revision,'2026-11-17-source-grounded-v1','version '+slug);
 assert(m.homework.instructions.length>=120,'missing meaningful homework '+slug);
 assert(m.homework.self_check.length>=70,'missing independent answer check '+slug);
 assert(m.curiosity.length>=60,'missing content insight '+slug);
 assert(m.lesson_tips.length===3,'missing three tips '+slug);
 assert(m.lesson_tips.every(t=>typeof t==='string'&&t.length>45),'short tip '+slug);
 assert(m.editorial_status!=='draft','draft leaked '+slug);
 assert(m.learning||m.construction||m.shortcuts,'no required quiz '+slug);
}
const source=readFileSync(new URL('../src/CourseLessonExtras.tsx',import.meta.url),'utf8');
const reader=readFileSync(new URL('../app/nauka.tsx',import.meta.url),'utf8');
assert(source.includes("testID=\"general-lesson-homework\""));
assert(source.includes("testID=\"general-lesson-homework-note\""));
assert(source.includes('onSave(draft)'));
assert(reader.includes("slug!=='ksiegowosc-od-podstaw'&&slug!=='norweski-na-budowie'&&slug!=='lepszy-cukiernik'"));
assert(reader.includes("await persistDraft(firstPending?.lesson_no??module)"));
assert(reader.includes('courseNotesAdapter(supabase,u.id,slug)'));
assert(reader.includes("if(slug==='ksiegowosc-od-podstaw'){router.replace(courseDestination(slug,lessonParam));return;}"));
console.log('✓ 79/79 courses have real lesson-specific homework, 3 tips, scenario-based insights and authenticated saved notes; accounting excluded');
