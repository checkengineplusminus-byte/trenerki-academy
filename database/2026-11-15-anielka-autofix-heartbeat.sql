-- Heartbeat proves the signed GitHub Actions worker actually contacted Supabase.
create table if not exists public.ta_feedback_autofix_heartbeat(
 id smallint primary key default 1 check(id=1),
 last_success_at timestamptz not null default now(),
 ai_configured boolean not null default false,
 queued_count integer not null default 0 check(queued_count >=0),
 updated_at timestamptz not null default now()
);
alter table public.ta_feedback_autofix_heartbeat enable row level security;
revoke all on public.ta_feedback_autofix_heartbeat from public,anon,authenticated;
grant select,insert,update on public.ta_feedback_autofix_heartbeat to service_role;
comment on table public.ta_feedback_autofix_heartbeat is
 'Server-only health proof, updated after verified short-lived GitHub OIDC authentication. No personal data.';