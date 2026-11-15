-- A model-generated hint becomes invisible if the authoritative lesson is revised.
drop policy if exists ta_clarifications_enrolled on public.ta_lesson_clarifications;
create policy ta_clarifications_enrolled on public.ta_lesson_clarifications
 for select to authenticated using (
   status='active'
   and exists (
     select 1 from public.ta_enrollments e
     where e.user_id=(select auth.uid())
     and e.course_slug=ta_lesson_clarifications.course_slug
     and e.status in ('active','demo') and e.expires_at>now()
   )
   and exists (
     select 1 from public.ta_lessons l
     where l.course_slug=ta_lesson_clarifications.course_slug
       and l.lesson_no=ta_lesson_clarifications.lesson_no
       and l.updated_at=ta_lesson_clarifications.source_revision
   )
 );