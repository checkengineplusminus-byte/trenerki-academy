-- TRENERKI: owner-controlled, day-specific discounts for courses and course-specific gifts.
-- Gift cards on a monetary balance are not discounted, to prevent cash-value arbitrage.
create table if not exists public.ta_daily_discounts(
 day date primary key,
 percent smallint not null check(percent between 0 and 80),
 created_by uuid not null references auth.users(id),
 updated_at timestamptz not null default now()
);
alter table public.ta_daily_discounts enable row level security;
revoke all on public.ta_daily_discounts from anon,authenticated;
grant select on public.ta_daily_discounts to anon,authenticated;
drop policy if exists ta_daily_discounts_public_read on public.ta_daily_discounts;
create policy ta_daily_discounts_public_read on public.ta_daily_discounts
for select to anon,authenticated using (true);

create or replace function public.ta_effective_course_price(p_slug text)
returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
  'course_slug',c.slug,
  'list_price_grosze',c.price_grosze,
  'discount_percent',coalesce(d.percent,0),
  'effective_price_grosze',case when c.price_grosze>0
     then greatest(200,round(c.price_grosze*(100-coalesce(d.percent,0))/100.0)::integer)
     else 0 end
 ) from public.ta_courses c
 left join public.ta_daily_discounts d on d.day=(now() at time zone 'Europe/Warsaw')::date
 where c.slug=p_slug and c.published=true
$$;
revoke execute on function public.ta_effective_course_price(text) from public,anon,authenticated;
grant execute on function public.ta_effective_course_price(text) to service_role;

-- Make wallet purchase logic reflect the EXACT same daily discounted price.
create or replace function public.ta_credit_begin_purchase(p_user uuid,p_course text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.ta_credit_wallets%rowtype; price integer; held bigint; free bigint; using_amount integer; due integer; hid uuid; enrol_id uuid;
begin
 select greatest(200,round(c.price_grosze*(100-coalesce(d.percent,0))/100.0)::integer)
 into price from public.ta_courses c
 left join public.ta_daily_discounts d on d.day=(now() at time zone 'Europe/Warsaw')::date
 where c.slug=p_course and c.published=true and c.price_grosze>0;
 if price is null or price<=0 then return jsonb_build_object('error','invalid_course'); end if;
 if not exists(select 1 from auth.users u where u.id=p_user and u.email_confirmed_at is not null) then
  return jsonb_build_object('error','login_required');
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text||':'||p_course,0));
 if exists(select 1 from public.ta_enrollments where user_id=p_user and course_slug=p_course and status='active' and expires_at>now()) then
  return jsonb_build_object('error','already_owned');
 end if;
 insert into public.ta_credit_wallets(user_id) values(p_user) on conflict do nothing;
 select * into w from public.ta_credit_wallets where user_id=p_user for update;
 select coalesce(sum(h.wallet_grosze),0) into held from public.ta_credit_holds h where h.user_id=p_user and h.status='pending';
 free:=greatest(0,w.balance_grosze-held);
 if free<=0 then return jsonb_build_object('error','no_balance'); end if;
 if exists(select 1 from public.ta_credit_holds h where h.user_id=p_user and h.course_slug=p_course and h.status='pending') then
  return jsonb_build_object('error','purchase_in_progress');
 end if;
 if free>=price then
  enrol_id:=gen_random_uuid();
  update public.ta_credit_wallets set balance_grosze=w.balance_grosze-price,updated_at=now() where user_id=p_user;
  insert into public.ta_enrollments(user_id,course_slug,stripe_checkout_session_id,amount_grosze,currency,status,expires_at)
   values(p_user,p_course,'credit:'||enrol_id,0,'PLN','active',now()+interval '12 months');
  insert into public.ta_credit_movements(user_id,amount_grosze,balance_after_grosze,kind,reference_key,description)
   values(p_user,-price,w.balance_grosze-price,'paid_course','credit:'||enrol_id,p_course);
  return jsonb_build_object('ok',true,'mode','covered','course_slug',p_course,'balance_grosze',w.balance_grosze-price);
 end if;
 using_amount:=least(free,price-200)::integer;
 if using_amount<=0 then return jsonb_build_object('error','no_balance'); end if;
 due:=price-using_amount;
 insert into public.ta_credit_holds(user_id,course_slug,course_price_grosze,wallet_grosze,stripe_grosze)
 values(p_user,p_course,price,using_amount,due) returning id into hid;
 return jsonb_build_object('ok',true,'mode','split','hold_id',hid,'wallet_grosze',using_amount,'stripe_grosze',due,'course_price_grosze',price);
end $$;
revoke execute on function public.ta_credit_begin_purchase(uuid,text) from public,anon,authenticated;
grant execute on function public.ta_credit_begin_purchase(uuid,text) to service_role;

-- Remove redundant, undesired anonymous read/trigger/reference grants from lesson attempts.
revoke all on public.ta_learning_attempts from anon;
revoke trigger,references on public.ta_learning_attempts from authenticated;
