alter table public.ta_gift_cards
  drop constraint ta_gift_cards_mode_check,
  drop constraint ta_gift_cards_status_check,
  add constraint ta_gift_cards_mode_check check (mode in ('free','demo','stripe')),
  add constraint ta_gift_cards_status_check check (status in ('pending','issued','redeemed','cancelled')),
  add column stripe_checkout_session_id text unique,
  add column stripe_payment_intent_id text unique,
  add column amount_grosze integer check (amount_grosze > 0),
  add column paid_at timestamptz,
  add column recipient_email_sent_at timestamptz,
  add column buyer_email_sent_at timestamptz;

alter table public.ta_enrollments add column buyer_email_sent_at timestamptz;

create function public.ta_redeem_gift(p_hash text, p_user uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare
  gift public.ta_gift_cards%rowtype;
  email text;
  expiry timestamptz := now() + interval '12 months';
begin
  select * into gift from public.ta_gift_cards where code_hash = p_hash for update;
  if not found or gift.mode not in ('free','stripe') then
    return jsonb_build_object('error','invalid_gift_code');
  end if;
  if gift.status <> 'issued' or gift.expires_at <= now() or (gift.mode = 'stripe' and gift.paid_at is null) then
    return jsonb_build_object('error','gift_used_or_expired');
  end if;
  select u.email into email from auth.users u where u.id = p_user and u.email_confirmed_at is not null;
  if email is null or (gift.recipient_email is not null and lower(gift.recipient_email) <> lower(email)) then
    return jsonb_build_object('error','gift_for_another_email');
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user::text || ':' || gift.course_slug, 0));
  if exists (select 1 from public.ta_enrollments
    where user_id = p_user and course_slug = gift.course_slug and status = 'active' and expires_at > now()) then
    return jsonb_build_object('error','course_already_active');
  end if;
  insert into public.ta_enrollments (user_id,course_slug,stripe_checkout_session_id,amount_grosze,currency,status,expires_at)
  values (p_user,gift.course_slug,'gift:' || gift.id,0,'PLN','active',expiry);
  update public.ta_gift_cards set status = 'redeemed', redeemed_by = p_user, redeemed_at = now() where id = gift.id;
  return jsonb_build_object('ok',true,'course_slug',gift.course_slug,'mode',gift.mode,'expires_at',expiry);
end;
$$;

create table public.ta_stripe_refunds (
  payment_id text primary key
);
alter table public.ta_stripe_refunds enable row level security;
revoke all on public.ta_stripe_refunds from anon, authenticated;
grant select, insert on public.ta_stripe_refunds to service_role;

create function public.ta_refund_stripe_payment(p_payment text)
returns void language plpgsql set search_path = '' as $$
declare gift_id uuid;
begin
  insert into public.ta_stripe_refunds(payment_id) values (p_payment) on conflict do nothing;
  update public.ta_gift_cards set status = 'cancelled'
    where stripe_payment_intent_id = p_payment returning id into gift_id;
  update public.ta_enrollments set status = 'refunded', updated_at = now()
    where stripe_payment_intent_id = p_payment or stripe_checkout_session_id = 'gift:' || gift_id;
end;
$$;

revoke all on function public.ta_redeem_gift(text,uuid), public.ta_refund_stripe_payment(text) from public, anon, authenticated;
grant execute on function public.ta_redeem_gift(text,uuid), public.ta_refund_stripe_payment(text) to service_role;

alter policy ta_lessons_paid on public.ta_lessons using (
  exists (select 1 from public.ta_enrollments e where e.user_id = (select auth.uid())
    and e.course_slug = ta_lessons.course_slug and e.status = 'active' and e.expires_at > now())
);
