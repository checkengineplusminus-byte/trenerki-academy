-- TRENERKI Academy / Anielka 2.0.
-- Applied in production as migrations:
-- ta_anielka_safe_learning_feedback_inbox_20261115
-- ta_anielka_feedback_watchdog_and_retention_20261115
-- Replay only on databases that do not already have these migrations.
create table if not exists public.ta_course_feedback (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 course_slug text not null,
 lesson_no smallint not null,
 kind text not null check (kind in ('bug','content','confusion')),
 message_excerpt text not null check (char_length(message_excerpt) between 1 and 600),
 message_hash text not null check (message_hash ~ '^[0-9a-f]{64}$'),
 report_day date not null default (timezone('UTC',now())::date),
 status text not null default 'new' check (status in ('new','triaging','fixing','resolved','rejected')),
 verification text not null default 'unverified' check (verification in ('unverified','confirmed','not_reproduced')),
 priority text not null default 'normal' check (priority in ('normal','high')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 due_at timestamptz,
 resolved_at timestamptz,
 resolution_note text check (resolution_note is null or char_length(resolution_note)<=600),
 constraint ta_feedback_lesson_fk foreign key (course_slug,lesson_no)
   references public.ta_lessons(course_slug,lesson_no) on delete cascade,
 constraint ta_feedback_daily_dedupe unique (user_id,course_slug,lesson_no,message_hash,report_day)
);
create index if not exists ta_course_feedback_open_due_idx
 on public.ta_course_feedback(due_at,created_at)
 where status in ('new','triaging','fixing') and due_at is not null;
create index if not exists ta_course_feedback_topic_idx
 on public.ta_course_feedback(course_slug,lesson_no,kind,created_at desc);
create index if not exists ta_course_feedback_user_idx
 on public.ta_course_feedback(user_id,created_at desc);
alter table public.ta_course_feedback enable row level security;
revoke all on table public.ta_course_feedback from public, anon, authenticated;
grant select,insert,update,delete on table public.ta_course_feedback to service_role;
comment on table public.ta_course_feedback is
'Private server-managed learner reports. No direct client grants. Freeform excerpts are redacted and deleted after 60 days; user feedback never grants authority to deploy code.';
comment on column public.ta_course_feedback.due_at is
'6-hour target for technical investigation, not a guaranteed resolution.';
-- Intentionally repeatable job registrations (pg_cron updates same name).
select cron.schedule(
 'ta_anielka_feedback_watchdog',
 '*/15 * * * *',
 $$update public.ta_course_feedback
   set priority='high',updated_at=now()
   where due_at is not null and due_at<now()
    and status in ('new','triaging','fixing') and priority='normal'$$
);
select cron.schedule(
 'ta_anielka_feedback_retention_60d',
 '14 3 * * *',
 $$delete from public.ta_course_feedback
    where created_at<now()-interval '60 days'$$
);
