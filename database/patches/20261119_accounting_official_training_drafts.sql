-- Private fictitious learner worksheets for official PIT/CIT/VAT reference forms.
-- This does NOT change an original ministry form or file real tax returns.
create table if not exists public.ta_accounting_official_drafts(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 form_code text not null check (form_code ~ '^[A-Z][A-Z0-9/-]{1,19}$'),
 tax_year integer not null check (tax_year between 2020 and 2100),
 fields jsonb not null default '{}'::jsonb
   check (jsonb_typeof(fields)='object' and pg_column_size(fields)<12000),
 version integer not null default 1 check (version between 1 and 1000000),
 updated_at timestamptz not null default now(),
 unique(user_id,form_code,tax_year)
);
alter table public.ta_accounting_official_drafts enable row level security;
revoke all on public.ta_accounting_official_drafts from anon, public;
grant select,insert,update on public.ta_accounting_official_drafts to authenticated;
drop policy if exists accounting_official_select_own on public.ta_accounting_official_drafts;
create policy accounting_official_select_own on public.ta_accounting_official_drafts
 for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists accounting_official_insert_own on public.ta_accounting_official_drafts;
create policy accounting_official_insert_own on public.ta_accounting_official_drafts
 for insert to authenticated with check (user_id=(select auth.uid()));
drop policy if exists accounting_official_update_own on public.ta_accounting_official_drafts;
create policy accounting_official_update_own on public.ta_accounting_official_drafts
 for update to authenticated using (user_id=(select auth.uid()))
 with check (user_id=(select auth.uid()));

create or replace function public.ta_accounting_official_draft_save(
 p_form_code text,p_tax_year integer,p_fields jsonb,p_expected_version integer
) returns public.ta_accounting_official_drafts
language plpgsql security invoker set search_path=''
as $$
declare v_user uuid:=auth.uid();result public.ta_accounting_official_drafts;
begin
 if v_user is null then raise exception 'Login required' using errcode='42501';end if;
 if p_form_code is null or p_form_code !~ '^[A-Z][A-Z0-9/-]{1,19}$' or
    p_tax_year not between 2020 and 2100 or
    p_expected_version is null or p_expected_version<0 or p_expected_version>1000000 or
    p_fields is null or jsonb_typeof(p_fields)<>'object' or pg_column_size(p_fields)>=12000
 then raise exception 'Invalid training worksheet' using errcode='22023';end if;
 -- Check that only short text answers are stored; no embedded files or URLs.
 if exists(select 1 from jsonb_each(p_fields) kv where
  length(kv.key)>64 or jsonb_typeof(kv.value)<>'string' or
  length(trim(both '"' from kv.value::text))>4000)
 then raise exception 'Training worksheet has invalid fields' using errcode='22023';end if;
 insert into public.ta_accounting_official_drafts(user_id,form_code,tax_year,fields,version,updated_at)
 values(v_user,p_form_code,p_tax_year,p_fields,1,now())
 on conflict(user_id,form_code,tax_year) do update
 set fields=excluded.fields,version=public.ta_accounting_official_drafts.version+1,updated_at=now()
 where public.ta_accounting_official_drafts.user_id=v_user
 and public.ta_accounting_official_drafts.version=p_expected_version
 returning * into result;
 if result.id is null then
  raise exception 'Nowsza wersja szkicu istnieje na koncie; odswiez i porownaj zmiany.' using errcode='40001';
 end if;
 return result;
end $$;
revoke all on function public.ta_accounting_official_draft_save(text,integer,jsonb,integer) from public,anon;
grant execute on function public.ta_accounting_official_draft_save(text,integer,jsonb,integer) to authenticated;
