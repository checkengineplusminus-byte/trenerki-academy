-- Authenticated owner may issue audited promotional value cards without Stripe revenue.
alter table public.ta_credit_vouchers add column if not exists is_promo boolean not null default false;
alter table public.ta_credit_vouchers add column if not exists promo_issued_at timestamptz;
alter table public.ta_credit_vouchers add constraint ta_credit_promo_requires_no_payment
 check (not is_promo or (stripe_checkout_session_id is null and stripe_payment_intent_id is null));
-- Distinguish promotional grants from purchased gift cards in the owner-only audit ledger.
alter table public.ta_credit_movements drop constraint if exists ta_credit_movements_kind_check;
alter table public.ta_credit_movements add constraint ta_credit_movements_kind_check
 check(kind in ('redeemed_card','redeemed_promo','paid_course','refunded_course','refunded_card'));
create or replace function public.ta_credit_redeem(p_hash text,p_user uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.ta_credit_vouchers%rowtype; w public.ta_credit_wallets%rowtype; email text;
begin
 select * into v from public.ta_credit_vouchers where code_hash=p_hash for update;
 if not found then return jsonb_build_object('error','invalid_code'); end if;
 if v.status<>'issued' or (v.paid_at is null and not v.is_promo) or v.expires_at <= now() then
  return jsonb_build_object('error','code_used_or_expired');
 end if;
 select lower(u.email) into email from auth.users u where u.id=p_user and u.email_confirmed_at is not null;
 if email is null or email<>lower(v.recipient_email) then return jsonb_build_object('error','wrong_email'); end if;
 insert into public.ta_credit_wallets(user_id) values(p_user) on conflict do nothing;
 select * into w from public.ta_credit_wallets where user_id=p_user for update;
 update public.ta_credit_wallets set balance_grosze=w.balance_grosze+v.amount_grosze,updated_at=now() where user_id=p_user;
 insert into public.ta_credit_movements(user_id,amount_grosze,balance_after_grosze,kind,reference_key,description)
 values(p_user,v.amount_grosze,w.balance_grosze+v.amount_grosze,case when v.is_promo then 'redeemed_promo' else 'redeemed_card' end,'voucher:'||v.id,'Karta podarunkowa');
 update public.ta_credit_vouchers set status='redeemed',redeemed_by=p_user,redeemed_at=now() where id=v.id;
 return jsonb_build_object('ok',true,'added_grosze',v.amount_grosze,'balance_grosze',w.balance_grosze+v.amount_grosze);
end $$;
create or replace function public.ta_credit_issue_promo(p_id uuid,p_admin uuid,p_email text,p_amount integer,p_hash text,p_message text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare total_granted bigint;
begin
 if p_amount<2500 or p_amount>100000 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or length(p_hash)<>64 or p_hash !~ '^[0-9a-f]{64}$' or length(p_email)>200 then
    return jsonb_build_object('error','invalid_input');
 end if;
 if not exists(select 1 from public.ta_admins where user_id=p_admin and role='owner') then
  return jsonb_build_object('error','owner_only');
 end if;
 perform pg_advisory_xact_lock(hashtextextended('credit-promos:'||p_admin::text,0));
 select coalesce(sum(v.amount_grosze),0) into total_granted
 from public.ta_credit_vouchers v where v.created_by=p_admin and v.is_promo
 and v.created_at>=now()-interval '24 hours';
 if total_granted+p_amount>500000 then return jsonb_build_object('error','daily_limit'); end if;
 insert into public.ta_credit_vouchers(id,code_hash,created_by,recipient_email,gift_message,amount_grosze,status,is_promo,promo_issued_at)
 values(p_id,p_hash,p_admin,lower(trim(p_email)),left(coalesce(p_message,''),300),p_amount,'issued',true,now());
 return jsonb_build_object('ok',true,'card_id',p_id,'recipient_email',lower(trim(p_email)),'amount_grosze',p_amount);
end $$;
revoke execute on function public.ta_credit_redeem(text,uuid) from public,anon,authenticated;
revoke execute on function public.ta_credit_issue_promo(uuid,uuid,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.ta_credit_redeem(text,uuid),public.ta_credit_issue_promo(uuid,uuid,text,integer,text,text) to service_role;
