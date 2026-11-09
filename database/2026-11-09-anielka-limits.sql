-- TRENERKI Academy | 2026-11-09
-- Reproducible SQL for the installed Anielka public AI rate limiter.
-- Separate from any CheckEngine or TaxiTrip database.
-- The function is callable by service_role ONLY, never by public clients.
begin;
create schema if not exists ta_internal;
revoke all on schema ta_internal from public, anon, authenticated;
grant usage on schema ta_internal to service_role;
create table if not exists ta_internal.anielka_rate (
  visitor_hash text not null,
  usage_day date not null,
  requests integer not null default 0 check(requests >= 0),
  last_request_at timestamptz not null default 'epoch',
  primary key (visitor_hash,usage_day)
);
alter table ta_internal.anielka_rate enable row level security;
revoke all on ta_internal.anielka_rate from public, anon, authenticated;
grant select,insert,update on ta_internal.anielka_rate to service_role;
create or replace function public.ta_anielka_take_budget(_visitor_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  d date := (now() at time zone 'UTC')::date;
  recent_count integer;
  last_call timestamptz;
  overall_count integer;
begin
  if _visitor_hash is null or _visitor_hash !~ '^[0-9a-f]{64}$' then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(908377152);
  select r.requests into overall_count
    from ta_internal.anielka_rate r
    where r.visitor_hash='__global__' and r.usage_day=d for update;
  if coalesce(overall_count,0)>=300 then return false; end if;
  select r.requests,r.last_request_at into recent_count,last_call
    from ta_internal.anielka_rate r
    where r.visitor_hash=_visitor_hash and r.usage_day=d for update;
  if coalesce(recent_count,0)>=12
    or (last_call is not null and last_call > now()-interval '7 seconds')
  then return false; end if;
  insert into ta_internal.anielka_rate as r(visitor_hash,usage_day,requests,last_request_at)
    values (_visitor_hash,d,1,now())
    on conflict (visitor_hash,usage_day)
    do update set requests=r.requests+1,last_request_at=now();
  insert into ta_internal.anielka_rate as r(visitor_hash,usage_day,requests,last_request_at)
    values ('__global__',d,1,now())
    on conflict (visitor_hash,usage_day)
    do update set requests=r.requests+1,last_request_at=now();
  return true;
end;
$$;
revoke all on function public.ta_anielka_take_budget(text) from PUBLIC,anon,authenticated;
grant execute on function public.ta_anielka_take_budget(text) to service_role;
commit;
-- Manual cleanup when implementing retention rules:
-- delete from ta_internal.anielka_rate where usage_day < current_date - 30;
