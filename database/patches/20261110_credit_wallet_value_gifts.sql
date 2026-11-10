-- TRENERKI Academy: prepaid value gift cards and account-linked balances (2026-11-10).
-- Never store plaintext redemption codes or expose wallet writes to the browser.
create table if not exists public.ta_credit_vouchers (
 id uuid primary key default gen_random_uuid(),
 code_hash text not null unique check (length(code_hash)=64),
 created_by uuid not null references auth.users(id) on delete restrict,
 recipient_email text not null,
 gift_message text,
 amount_grosze integer not null check (amount_grosze between 2500 and 100000),
 status text not null default 'pending' check (status in ('pending','issued','redeemed','cancelled','refund_review')),
 stripe_checkout_session_id text unique,
 stripe_payment_intent_id text unique,
 paid_at timestamptz,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '3 years'),
 redeemed_by uuid references auth.users(id),
 redeemed_at timestamptz,
 buyer_email_sent_at timestamptz,
 recipient_email_sent_at timestamptz
);
create table if not exists public.ta_credit_wallets (
 user_id uuid primary key references auth.users(id) on delete cascade,
 balance_grosze bigint not null default 0 check(balance_grosze>=0),
 updated_at timestamptz not null default now()
);
create table if not exists public.ta_credit_movements (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 amount_grosze bigint not null check(amount_grosze <> 0),
 balance_after_grosze bigint not null check(balance_after_grosze>=0),
 kind text not null check(kind in ('redeemed_card','paid_course','refunded_course','refunded_card')),
 reference_key text not null unique,
 description text,
 created_at timestamptz not null default now()
);
create index if not exists ta_credit_movements_user_date on public.ta_credit_movements(user_id,created_at desc);
create table if not exists public.ta_credit_holds (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 course_slug text not null references public.ta_courses(slug),
 course_price_grosze integer not null check(course_price_grosze>0),
 wallet_grosze integer not null check(wallet_grosze>0),
 stripe_grosze integer not null check(stripe_grosze>=200),
 status text not null default 'pending' check(status in ('pending','completed','released','refunded')),
 checkout_session_id text unique,
 payment_intent_id text unique,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists ta_credit_pending_hold_per_course on public.ta_credit_holds(user_id,course_slug) where status='pending';
create index if not exists ta_credit_pending_hold_user on public.ta_credit_holds(user_id) where status='pending';
alter table public.ta_credit_vouchers enable row level security;
alter table public.ta_credit_wallets enable row level security;
alter table public.ta_credit_movements enable row level security;
alter table public.ta_credit_holds enable row level security;
revoke all on public.ta_credit_vouchers from anon,authenticated;
revoke all on public.ta_credit_wallets from anon,authenticated;
revoke all on public.ta_credit_movements from anon,authenticated;
revoke all on public.ta_credit_holds from anon,authenticated;
grant select on public.ta_credit_wallets,public.ta_credit_movements to authenticated;
drop policy if exists ta_credit_wallet_owner on public.ta_credit_wallets;
create policy ta_credit_wallet_owner on public.ta_credit_wallets for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists ta_credit_movements_owner on public.ta_credit_movements;
create policy ta_credit_movements_owner on public.ta_credit_movements for select to authenticated using ((select auth.uid())=user_id);
-- All money-changing RPCs run only with service_role in verified Edge Functions.
create or replace function public.ta_credit_redeem(p_hash text,p_user uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.ta_credit_vouchers%rowtype; w public.ta_credit_wallets%rowtype; email text;
begin
 select * into v from public.ta_credit_vouchers where code_hash=p_hash for update;
 if not found then return jsonb_build_object('error','invalid_code'); end if;
 if v.status<>'issued' or v.paid_at is null or v.expires_at <= now() then
  return jsonb_build_object('error','code_used_or_expired');
 end if;
 select lower(u.email) into email from auth.users u where u.id=p_user and u.email_confirmed_at is not null;
 if email is null or email<>lower(v.recipient_email) then return jsonb_build_object('error','wrong_email'); end if;
 insert into public.ta_credit_wallets(user_id) values(p_user) on conflict do nothing;
 select * into w from public.ta_credit_wallets where user_id=p_user for update;
 update public.ta_credit_wallets set balance_grosze=w.balance_grosze+v.amount_grosze,updated_at=now() where user_id=p_user;
 insert into public.ta_credit_movements(user_id,amount_grosze,balance_after_grosze,kind,reference_key,description)
 values(p_user,v.amount_grosze,w.balance_grosze+v.amount_grosze,'redeemed_card','voucher:'||v.id,'Karta podarunkowa');
 update public.ta_credit_vouchers set status='redeemed',redeemed_by=p_user,redeemed_at=now() where id=v.id;
 return jsonb_build_object('ok',true,'added_grosze',v.amount_grosze,'balance_grosze',w.balance_grosze+v.amount_grosze);
end $$;
create or replace function public.ta_credit_begin_purchase(p_user uuid,p_course text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare w public.ta_credit_wallets%rowtype; price integer; held bigint; free bigint; using_amount integer; due integer; hid uuid; enrol_id uuid;
begin
 select c.price_grosze into price from public.ta_courses c where c.slug=p_course and c.published=true;
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
create or replace function public.ta_credit_attach_session(p_hold uuid,p_user uuid,p_session text)
returns boolean language plpgsql security definer set search_path='' as $$
declare h public.ta_credit_holds%rowtype;
begin
 select * into h from public.ta_credit_holds where id=p_hold for update;
 if not found or h.user_id<>p_user or h.status<>'pending' or h.checkout_session_id is not null or p_session not like 'cs_live_%' then return false; end if;
 update public.ta_credit_holds set checkout_session_id=p_session,updated_at=now() where id=p_hold;
 return true;
end $$;
create or replace function public.ta_credit_cancel_hold(p_hold uuid,p_session text)
returns boolean language plpgsql security definer set search_path='' as $$
declare h public.ta_credit_holds%rowtype;
begin
 select * into h from public.ta_credit_holds where id=p_hold for update;
 if not found or h.status<>'pending' or h.checkout_session_id is distinct from p_session then return false; end if;
 update public.ta_credit_holds set status='released',updated_at=now() where id=p_hold;
 return true;
end $$;
create or replace function public.ta_credit_finalize_split(p_hold uuid,p_user uuid,p_course text,p_session text,p_payment text,p_paid integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare h public.ta_credit_holds%rowtype; w public.ta_credit_wallets%rowtype; en uuid;
begin
 select * into h from public.ta_credit_holds where id=p_hold for update;
 if not found or h.user_id<>p_user or h.course_slug<>p_course or h.checkout_session_id is distinct from p_session
  or h.stripe_grosze<>p_paid or p_payment not like 'pi_%' then
   return jsonb_build_object('error','invalid_split');
 end if;
 if h.status='completed' and h.payment_intent_id=p_payment then return jsonb_build_object('ok',true,'already_processed',true); end if;
 if h.status<>'pending' then return jsonb_build_object('error','hold_not_active'); end if;
 select * into w from public.ta_credit_wallets where user_id=p_user for update;
 if not found or w.balance_grosze<h.wallet_grosze then return jsonb_build_object('error','insufficient_reserved_balance'); end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text||':'||p_course,0));
 if exists(select 1 from public.ta_enrollments where user_id=p_user and course_slug=p_course and status='active' and expires_at>now()) then
  return jsonb_build_object('error','already_owned');
 end if;
 en:=gen_random_uuid();
 update public.ta_credit_wallets set balance_grosze=w.balance_grosze-h.wallet_grosze,updated_at=now() where user_id=p_user;
 insert into public.ta_enrollments(user_id,course_slug,stripe_checkout_session_id,stripe_payment_intent_id,amount_grosze,currency,status,expires_at)
  values(p_user,p_course,p_session,p_payment,p_paid,'PLN','active',now()+interval '12 months');
 insert into public.ta_credit_movements(user_id,amount_grosze,balance_after_grosze,kind,reference_key,description)
  values(p_user,-h.wallet_grosze,w.balance_grosze-h.wallet_grosze,'paid_course','split:'||p_session,p_course);
 update public.ta_credit_holds set status='completed',payment_intent_id=p_payment,updated_at=now() where id=p_hold;
 return jsonb_build_object('ok',true,'balance_grosze',w.balance_grosze-h.wallet_grosze,'wallet_grosze',h.wallet_grosze);
end $$;
create or replace function public.ta_credit_refund_split(p_payment text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare h public.ta_credit_holds%rowtype; w public.ta_credit_wallets%rowtype;
begin
 select * into h from public.ta_credit_holds where payment_intent_id=p_payment for update;
 if not found or h.status<>'completed' then return jsonb_build_object('ok',true,'unchanged',true); end if;
 insert into public.ta_credit_wallets(user_id) values(h.user_id) on conflict do nothing;
 select * into w from public.ta_credit_wallets where user_id=h.user_id for update;
 update public.ta_credit_wallets set balance_grosze=w.balance_grosze+h.wallet_grosze,updated_at=now() where user_id=h.user_id;
 insert into public.ta_credit_movements(user_id,amount_grosze,balance_after_grosze,kind,reference_key,description)
 values(h.user_id,h.wallet_grosze,w.balance_grosze+h.wallet_grosze,'refunded_course','refund:'||p_payment,h.course_slug);
 update public.ta_credit_holds set status='refunded',updated_at=now() where id=h.id;
 return jsonb_build_object('ok',true,'refunded_wallet_grosze',h.wallet_grosze);
end $$;
-- Voucher refunds after redemption are flagged for human reconciliation, not silently debited or double credited.
create or replace function public.ta_credit_refund_voucher(p_payment text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.ta_credit_vouchers%rowtype;
begin
 select * into v from public.ta_credit_vouchers where stripe_payment_intent_id=p_payment for update;
 if not found then return jsonb_build_object('ok',true,'unchanged',true); end if;
 if v.status='issued' then
  update public.ta_credit_vouchers set status='cancelled' where id=v.id;
  return jsonb_build_object('ok',true,'cancelled',true);
 end if;
 if v.status='redeemed' then
  update public.ta_credit_vouchers set status='refund_review' where id=v.id;
  return jsonb_build_object('ok',true,'requires_manual_review',true);
 end if;
 return jsonb_build_object('ok',true,'unchanged',true);
end $$;
-- A webhook may mark the purchased voucher issued only after verifying the signed, live Stripe payment.
create or replace function public.ta_credit_issue_voucher(p_id uuid,p_user uuid,p_session text,p_payment text,p_amount integer,p_paid_at timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.ta_credit_vouchers%rowtype;
begin
 select * into v from public.ta_credit_vouchers where id=p_id for update;
 if not found or v.created_by<>p_user or v.amount_grosze<>p_amount or p_session not like 'cs_live_%' or p_payment not like 'pi_%' then
  return jsonb_build_object('error','voucher_mismatch');
 end if;
 if v.status='issued' and v.stripe_checkout_session_id=p_session then return jsonb_build_object('ok',true,'already_processed',true); end if;
 if v.status<>'pending' then return jsonb_build_object('error','voucher_not_pending'); end if;
 update public.ta_credit_vouchers set status='issued',paid_at=p_paid_at,stripe_checkout_session_id=p_session,stripe_payment_intent_id=p_payment where id=p_id;
 return jsonb_build_object('ok',true);
end $$;
revoke execute on function public.ta_credit_redeem(text,uuid) from public,anon,authenticated;
revoke execute on function public.ta_credit_begin_purchase(uuid,text) from public,anon,authenticated;
revoke execute on function public.ta_credit_attach_session(uuid,uuid,text) from public,anon,authenticated;
revoke execute on function public.ta_credit_cancel_hold(uuid,text) from public,anon,authenticated;
revoke execute on function public.ta_credit_finalize_split(uuid,uuid,text,text,text,integer) from public,anon,authenticated;
revoke execute on function public.ta_credit_refund_split(text) from public,anon,authenticated;
revoke execute on function public.ta_credit_refund_voucher(text) from public,anon,authenticated;
revoke execute on function public.ta_credit_issue_voucher(uuid,uuid,text,text,integer,timestamptz) from public,anon,authenticated;
grant execute on function public.ta_credit_redeem(text,uuid),public.ta_credit_begin_purchase(uuid,text),
 public.ta_credit_attach_session(uuid,uuid,text),public.ta_credit_cancel_hold(uuid,text),
 public.ta_credit_finalize_split(uuid,uuid,text,text,text,integer),public.ta_credit_refund_split(text),
 public.ta_credit_refund_voucher(text),public.ta_credit_issue_voucher(uuid,uuid,text,text,integer,timestamptz) to service_role;
