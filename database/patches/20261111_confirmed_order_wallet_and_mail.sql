-- Preserve the displayed total and wallet share at the point of purchase.
grant execute on function public.ta_effective_course_price(text) to anon,authenticated;

create table if not exists public.ta_order_mail_outbox (
 order_ref text primary key,
 email text not null,
 course_title text not null,
 amount_grosze integer not null check(amount_grosze>0),
 terms_version text not null,
 accepted_at timestamptz not null,
 access_expires_at timestamptz not null,
 leased_until timestamptz,
 sent_at timestamptz
);
create index if not exists ta_order_mail_pending on public.ta_order_mail_outbox(accepted_at) where sent_at is null;
alter table public.ta_order_mail_outbox enable row level security;
revoke all on public.ta_order_mail_outbox from anon,authenticated;
grant select,update on public.ta_order_mail_outbox to service_role;

create or replace function public.ta_claim_order_mail()
returns setof public.ta_order_mail_outbox language sql security definer set search_path='' as $$
 update public.ta_order_mail_outbox j
 set leased_until=now()+interval '4 minutes'
 where j.order_ref in (
  select m.order_ref from public.ta_order_mail_outbox m
  where m.sent_at is null and (m.leased_until is null or m.leased_until<now())
  order by m.accepted_at limit 5 for update skip locked
 )
 returning j.*
$$;
revoke all on function public.ta_claim_order_mail() from public,anon,authenticated;
grant execute on function public.ta_claim_order_mail() to service_role;

create or replace function public.ta_check_order_mail_worker(p_token text)
returns boolean language sql security definer set search_path='' as $$
 select exists(select 1 from vault.decrypted_secrets where name='ta_order_mail_worker_token' and decrypted_secret=p_token)
$$;
revoke all on function public.ta_check_order_mail_worker(text) from public,anon,authenticated;
grant execute on function public.ta_check_order_mail_worker(text) to service_role;

create or replace function public.ta_credit_confirm_purchase(p_user uuid,p_course text,p_price integer,p_credit integer,p_terms_version text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.ta_credit_wallets%rowtype; price integer; held bigint; free bigint; using_amount integer; due integer; hid uuid; enrol_id uuid; buyer_email text; course_title text;
begin
 select greatest(200,round(c.price_grosze*(100-coalesce(d.percent,0))/100.0)::integer),c.title_pl
 into price,course_title from public.ta_courses c
 left join public.ta_daily_discounts d on d.day=(now() at time zone 'Europe/Warsaw')::date
 where c.slug=p_course and c.published=true and c.price_grosze>0;
 if price is null or price<=0 then return jsonb_build_object('error','invalid_course'); end if;
 select email into buyer_email from auth.users u where u.id=p_user and u.email_confirmed_at is not null;
 if buyer_email is null then
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
 using_amount:=case when free>=price then price else least(free,price-200)::integer end;
 if p_terms_version is distinct from '2026-11-11' or p_price is distinct from price or p_credit is distinct from using_amount then
  return jsonb_build_object('error','quote_changed');
 end if;
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
  insert into public.ta_order_mail_outbox(order_ref,email,course_title,amount_grosze,terms_version,accepted_at,access_expires_at)
   values('credit:'||enrol_id,buyer_email,course_title,price,p_terms_version,now(),now()+interval '12 months');
  return jsonb_build_object('ok',true,'mode','covered','course_slug',p_course,'balance_grosze',w.balance_grosze-price);
 end if;
 if using_amount<=0 then return jsonb_build_object('error','no_balance'); end if;
 due:=price-using_amount;
 insert into public.ta_credit_holds(user_id,course_slug,course_price_grosze,wallet_grosze,stripe_grosze)
 values(p_user,p_course,price,using_amount,due) returning id into hid;
 return jsonb_build_object('ok',true,'mode','split','hold_id',hid,'wallet_grosze',using_amount,'stripe_grosze',due,'course_price_grosze',price);
end $$;
revoke execute on function public.ta_credit_confirm_purchase(uuid,text,integer,integer,text) from public,anon,authenticated;
grant execute on function public.ta_credit_confirm_purchase(uuid,text,integer,integer,text) to service_role;
