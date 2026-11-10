-- Keep permanent document numbering independent of requests, retries and test diplomas.
create table if not exists ta_private.diploma_numbers (
  is_demo boolean primary key,
  last_no bigint not null check (last_no >= 0)
);
alter table ta_private.diploma_numbers enable row level security;
insert into ta_private.diploma_numbers (is_demo, last_no)
select mode.is_demo, coalesce(max(substring(c.certificate_no from '^TRE-(?:DEMO-)?([0-9]+)$')::bigint), 0)
from (values (false), (true)) mode(is_demo)
left join public.ta_certificates c on c.is_demo=mode.is_demo
group by mode.is_demo
on conflict (is_demo) do update
set last_no=greatest(ta_private.diploma_numbers.last_no,excluded.last_no);

create unique index if not exists ta_certificates_current_kind
  on public.ta_certificates(user_id,course_slug,is_demo) where revoked_at is null;
drop index if exists public.ta_certificates_person_course_key;

create table if not exists public.ta_diploma_mail (
  certificate_id uuid primary key references public.ta_certificates(id) on delete cascade,
  request_key uuid not null default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  attempts smallint not null default 0 check (attempts between 0 and 8),
  next_attempt_at timestamptz not null default now(),
  lease_until timestamptz,
  requested_at timestamptz not null default now(),
  sent_at timestamptz,
  provider_id text,
  last_error text
);
alter table public.ta_diploma_mail enable row level security;
revoke all on public.ta_diploma_mail from public, anon, authenticated;
grant select, update on public.ta_diploma_mail to service_role;
create index if not exists ta_diploma_mail_due on public.ta_diploma_mail(next_attempt_at)
  where status in ('pending','sending');

create or replace function ta_private.assign_diploma_no()
returns trigger
language plpgsql security definer set search_path=''
as $$
declare serial bigint;
begin
  update ta_private.diploma_numbers set last_no=last_no+1
  where is_demo=new.is_demo returning last_no into strict serial;
  new.certificate_no := case when new.is_demo then 'TRE-DEMO-' else 'TRE-' end
    || lpad(serial::text,greatest(8,length(serial::text)),'0');
  return new;
end $$;
revoke all on function ta_private.assign_diploma_no() from public, anon, authenticated;
drop trigger if exists ta_assign_diploma_no on public.ta_certificates;
create trigger ta_assign_diploma_no before insert on public.ta_certificates
for each row execute function ta_private.assign_diploma_no();

create or replace function ta_private.queue_initial_diploma_mail()
returns trigger
language plpgsql security definer set search_path=''
as $$
begin
  if not new.is_demo then
    insert into public.ta_diploma_mail(certificate_id) values(new.id);
  end if;
  return new;
end $$;
revoke all on function ta_private.queue_initial_diploma_mail() from public, anon, authenticated;
drop trigger if exists ta_queue_initial_diploma_mail on public.ta_certificates;
create trigger ta_queue_initial_diploma_mail after insert on public.ta_certificates
for each row execute function ta_private.queue_initial_diploma_mail();

create or replace function public.ta_issue_diploma(p_user uuid, p_session uuid)
returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  exam public.ta_exam_sessions%rowtype;
  course public.ta_courses%rowtype;
  diploma public.ta_certificates%rowtype;
  demo boolean;
begin
  select * into strict exam from public.ta_exam_sessions
  where id=p_session and user_id=p_user and status='passed' and correct_count>=6;
  select * into strict course from public.ta_courses where slug=exam.course_slug;
  demo := exam.is_demo or not exists (
    select 1 from public.ta_course_previews where course_slug=exam.course_slug and review_status='approved'
  );
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text || '/' || exam.course_slug,0));
  insert into public.ta_exam_results(user_id,course_slug,score_percent,passed,assessed_at,exam_session_id)
  values(p_user,exam.course_slug,least(100,round(exam.correct_count::numeric*100/greatest(1,jsonb_array_length(exam.history))))::smallint,
    true,exam.updated_at,exam.id)
  on conflict (exam_session_id) where exam_session_id is not null do nothing;

  -- A revoked document for the same attempt stays revoked.
  select * into diploma from public.ta_certificates
  where user_id=p_user and course_slug=exam.course_slug and (
    exam_session_id=p_session or (is_demo=demo and revoked_at is null)
  ) order by revoked_at nulls first,issued_at desc limit 1;
  if not found then
    insert into public.ta_certificates(user_id,course_slug,holder_name,title_pl,title_en,issued_at,is_demo,exam_session_id)
    values(p_user,exam.course_slug,exam.holder_name,coalesce(nullif(course.certificate_pl,''),course.title_pl),
      coalesce(nullif(course.certificate_en,''),nullif(course.title_en,''),course.title_pl),exam.updated_at,demo,exam.id)
    returning * into diploma;
  end if;
  return to_jsonb(diploma) - 'user_id' - 'exam_session_id';
end $$;
revoke all on function public.ta_issue_diploma(uuid,uuid) from public, anon, authenticated;
grant execute on function public.ta_issue_diploma(uuid,uuid) to service_role;

create or replace function public.ta_diploma_mail_claim(p_certificate uuid, p_limit int)
returns setof public.ta_diploma_mail
language plpgsql security definer set search_path=''
as $$
begin
  update public.ta_diploma_mail m set status='failed',lease_until=null,
    last_error=coalesce(m.last_error,'attempt_limit')
  where m.status='sending' and m.lease_until<=now() and m.attempts>=8;
  return query
  with due as (
    select m.certificate_id from public.ta_diploma_mail m
    join public.ta_certificates c on c.id=m.certificate_id
    where (p_certificate is null or m.certificate_id=p_certificate)
      and not c.is_demo and c.revoked_at is null and m.attempts<8
      and ((m.status='pending' and m.next_attempt_at<=now())
        or (m.status='sending' and m.lease_until<=now()))
    order by m.next_attempt_at
    limit greatest(1,least(p_limit,8)) for update of m skip locked
  )
  update public.ta_diploma_mail m set status='sending',attempts=m.attempts+1,lease_until=now()+interval '2 minutes'
  from due where m.certificate_id=due.certificate_id returning m.*;
end $$;
revoke all on function public.ta_diploma_mail_claim(uuid,int) from public, anon, authenticated;
grant execute on function public.ta_diploma_mail_claim(uuid,int) to service_role;

create or replace function public.ta_diploma_mail_resend(p_certificate uuid)
returns boolean
language plpgsql security definer set search_path=''
as $$
begin
  insert into public.ta_diploma_mail as m(certificate_id)
  select id from public.ta_certificates where id=p_certificate and revoked_at is null and not is_demo
  on conflict(certificate_id) do update
  set request_key=gen_random_uuid(),status='pending',attempts=0,next_attempt_at=now(),
      requested_at=now(),sent_at=null,provider_id=null,lease_until=null,last_error=null
  where m.status in ('sent','failed') and m.requested_at < now()-interval '2 minutes';
  return found;
end $$;
revoke all on function public.ta_diploma_mail_resend(uuid) from public, anon, authenticated;
grant execute on function public.ta_diploma_mail_resend(uuid) to service_role;

create or replace function public.ta_private_exam_bank(p_course text)
returns table(module_no smallint,question_text text,options jsonb,correct_option text,explanation text)
language sql stable security definer set search_path=''
as $$
  select q.module_no,q.question_text,q.options,q.correct_option,q.explanation
  from ta_private.questions q where q.course_slug=p_course and q.active order by q.module_no,q.id
$$;
revoke all on function public.ta_private_exam_bank(text) from public, anon, authenticated;
grant execute on function public.ta_private_exam_bank(text) to service_role;

create or replace function public.ta_is_diploma_worker(p_token text)
returns boolean
language sql stable security definer set search_path=''
as $$
  select p_token is not null and length(p_token)=64 and exists(
    select 1 from vault.decrypted_secrets where name='ta_diploma_worker_token' and decrypted_secret=p_token
  )
$$;
revoke all on function public.ta_is_diploma_worker(text) from public, anon, authenticated;
grant execute on function public.ta_is_diploma_worker(text) to service_role;
