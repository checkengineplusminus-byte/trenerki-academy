-- TRENERKI: isolated company seat pool, only issued to verified company manager.
create table if not exists public.ta_company_bundles(
 id uuid primary key default gen_random_uuid(),
 admin_id uuid not null references auth.users(id),
 manager_email text not null,
 company_name text not null default '',
 created_at timestamptz not null default now(),
 check(manager_email=lower(manager_email)),
 check(length(manager_email) between 5 and 200)
);
create index if not exists ta_company_bundles_manager_email_idx on public.ta_company_bundles(manager_email);
create table if not exists public.ta_company_seats(
 id uuid primary key default gen_random_uuid(),
 bundle_id uuid not null references public.ta_company_bundles(id),
 course_slug text not null references public.ta_courses(slug),
 state text not null default 'available' check (state in ('available','assigned')),
 assigned_email text,
 gift_card_id uuid unique references public.ta_gift_cards(id),
 assigned_at timestamptz,
 email_sent_at timestamptz,
 created_at timestamptz not null default now(),
 check((state='available' and assigned_email is null and gift_card_id is null) or
       (state='assigned' and assigned_email is not null and gift_card_id is not null))
);
create index if not exists ta_company_seats_bundle_idx on public.ta_company_seats(bundle_id,state);
alter table public.ta_company_bundles enable row level security;
alter table public.ta_company_seats enable row level security;
revoke all on public.ta_company_bundles,public.ta_company_seats from anon,authenticated;
-- Service-role-only atomic bundle creation: never allow the browser to mint seats.
create or replace function public.ta_company_create_bundle(p_admin uuid,p_email text,p_name text,p_courses text[])
returns jsonb language plpgsql security definer set search_path='' as $$
declare n int; bundle_id uuid; slug text;
begin
 n:=coalesce(array_length(p_courses,1),0);
 if n<1 or n>10 or length(p_email)>200 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
  return jsonb_build_object('error','invalid_request');
 end if;
 if not exists(select 1 from public.ta_admins where user_id=p_admin and role in ('owner','admin')) then
  return jsonb_build_object('error','admin_only');
 end if;
 if exists(select 1 from unnest(p_courses) x(slug) left join public.ta_courses c on c.slug=x.slug
   where c.slug is null or c.published is distinct from true) then
  return jsonb_build_object('error','course_unavailable');
 end if;
 insert into public.ta_company_bundles(admin_id,manager_email,company_name)
 values(p_admin,lower(trim(p_email)),left(trim(coalesce(p_name,'')),150)) returning id into bundle_id;
 foreach slug in array p_courses loop
  insert into public.ta_company_seats(bundle_id,course_slug) values(bundle_id,slug);
 end loop;
 return jsonb_build_object('ok',true,'bundle_id',bundle_id,'seats',n);
end $$;
-- Atomic, single-use issuance. Each seat produces one individually redeemable gift code.
create or replace function public.ta_company_assign(p_seat uuid,p_manager uuid,p_employee text,p_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare seat_rec record; gift_id uuid; actual_email text;
begin
 select lower(u.email) into actual_email from auth.users u
 where u.id=p_manager and u.email_confirmed_at is not null;
 if actual_email is null then return jsonb_build_object('error','login_required'); end if;
 if p_employee !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(p_employee)>200 or length(p_hash)<>64 then
  return jsonb_build_object('error','invalid_request');
 end if;
 select s.*,b.admin_id,b.manager_email,c.title_pl into seat_rec
 from public.ta_company_seats s
 join public.ta_company_bundles b on b.id=s.bundle_id
 join public.ta_courses c on c.slug=s.course_slug
 where s.id=p_seat for update of s;
 if not found or seat_rec.manager_email<>actual_email then return jsonb_build_object('error','forbidden'); end if;
 if seat_rec.state<>'available' then return jsonb_build_object('error','already_assigned'); end if;
 insert into public.ta_gift_cards(code_hash,course_slug,created_by,recipient_email,gift_message,mode,status)
 values(p_hash,seat_rec.course_slug,seat_rec.admin_id,lower(trim(p_employee)),
  'Kurs przekazany przez firmę w TRENERKI Academy','free','issued') returning id into gift_id;
 update public.ta_company_seats set state='assigned',assigned_email=lower(trim(p_employee)),
 gift_card_id=gift_id,assigned_at=now() where id=p_seat;
 return jsonb_build_object('ok',true,'gift_card_id',gift_id,'course_slug',seat_rec.course_slug,'title_pl',seat_rec.title_pl);
end $$;
revoke execute on function public.ta_company_create_bundle(uuid,text,text,text[]) from public,anon,authenticated;
revoke execute on function public.ta_company_assign(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.ta_company_create_bundle(uuid,text,text,text[]),public.ta_company_assign(uuid,uuid,text,text) to service_role;
