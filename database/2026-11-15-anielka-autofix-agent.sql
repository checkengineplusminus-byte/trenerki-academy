-- Anielka improvement agent. Queue and learning hints are separate from exams,
-- payments, enrollments, grade calculations and paid course source material.
create table if not exists public.ta_feedback_autofix_runs (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null unique references public.ta_course_feedback(id) on delete cascade,
  state text not null default 'claimed'
    check (state in ('claimed','pr_open','issue_open','note_published','needs_review','failed')),
  attempts smallint not null default 1 check(attempts between 1 and 3),
  lease_until timestamptz,
  proposal jsonb not null default '{}'::jsonb,
  github_url text check (github_url is null or github_url ~ '^https://github.com/checkengineplusminus-byte/trenerki-academy/(issues|pull)/[0-9]+$'),
  last_error text check (last_error is null or char_length(last_error)<=180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ta_feedback_autofix_state_idx
 on public.ta_feedback_autofix_runs(state,lease_until,updated_at);
alter table public.ta_feedback_autofix_runs enable row level security;
revoke all on public.ta_feedback_autofix_runs from public,anon,authenticated;
grant select,insert,update,delete on public.ta_feedback_autofix_runs to service_role;
comment on table public.ta_feedback_autofix_runs is
  'Private improvement pipeline. Automated changes to code require PR+CI; no learner can trigger deployments.';

create table if not exists public.ta_lesson_clarifications (
  course_slug text not null,
  lesson_no smallint not null,
  note text not null check (char_length(note) between 80 and 750),
  source_feedback_id uuid references public.ta_course_feedback(id) on delete set null,
  source_revision timestamptz not null,
  status text not null default 'draft' check (status in ('draft','active','disabled')),
  checked_by_model boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(course_slug,lesson_no),
  constraint ta_clarification_lesson_fk foreign key (course_slug,lesson_no)
    references public.ta_lessons(course_slug,lesson_no) on delete cascade
);
create index if not exists ta_lesson_clarifications_status_idx
 on public.ta_lesson_clarifications(status,updated_at desc);
alter table public.ta_lesson_clarifications enable row level security;
revoke all on public.ta_lesson_clarifications from public,anon,authenticated;
grant select on public.ta_lesson_clarifications to authenticated;
grant select,insert,update,delete on public.ta_lesson_clarifications to service_role;
drop policy if exists ta_clarifications_enrolled on public.ta_lesson_clarifications;
create policy ta_clarifications_enrolled on public.ta_lesson_clarifications
 for select to authenticated
 using (
  status='active' and exists (
   select 1 from public.ta_enrollments e
   where e.user_id = (select auth.uid())
   and e.course_slug=ta_lesson_clarifications.course_slug
   and e.status in ('active','demo') and e.expires_at>now()
  )
 );
comment on table public.ta_lesson_clarifications is
  'Short, optional, model-checked explanation derived from existing lesson text. Restricted to enrolled users. Never affects quiz grading.';
