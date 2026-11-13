-- Printable promotional gift-card batches. Existing cards stay email-bound.
-- Apply after 20261111_promo_card_24h_limit_15000.sql.
-- Only verified owner requests from the ta-credit Edge Function may call the RPC.
-- SECURITY INVOKER deliberately uses service_role's existing RLS bypass instead
-- of introducing another privileged SECURITY DEFINER endpoint.

create table if not exists public.ta_credit_promo_batches (
 id uuid primary key,
 created_by uuid not null references auth.users(id) on delete restrict,
 recipient_email text not null check (
  length(recipient_email) between 3 and 200
  and recipient_email = lower(btrim(recipient_email))
  and recipient_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 ),
 amount_grosze integer not null check (amount_grosze between 2500 and 100000),
 quantity integer not null check (quantity between 1 and 10),
 gift_message text not null default '' check (length(gift_message) <= 300),
 transferable boolean not null default false,
 created_at timestamptz not null default now(),
 recipient_email_sent_at timestamptz
);

alter table public.ta_credit_promo_batches enable row level security;
revoke all on public.ta_credit_promo_batches from public,anon,authenticated,service_role;
grant select,insert on public.ta_credit_promo_batches to service_role;
grant update (recipient_email_sent_at) on public.ta_credit_promo_batches to service_role;
create index if not exists ta_credit_promo_batches_owner_created
 on public.ta_credit_promo_batches(created_by,created_at desc);

alter table public.ta_credit_vouchers
 add column if not exists transferable boolean not null default false,
 add column if not exists batch_id uuid references public.ta_credit_promo_batches(id) on delete restrict,
 add column if not exists batch_position smallint;

alter table public.ta_credit_vouchers
 add constraint ta_credit_transferable_promo_only check (not transferable or is_promo),
 add constraint ta_credit_batch_position_valid check (
  (batch_id is null and batch_position is null)
  or (batch_id is not null and batch_position is not null and batch_position between 1 and 10 and is_promo)
 ),
 add constraint ta_credit_batch_position_unique unique (batch_id,batch_position);

-- The partial index serves the same rolling limit in both the old and new RPC.
create index if not exists ta_credit_vouchers_promo_owner_created
 on public.ta_credit_vouchers(created_by,created_at) where is_promo;
grant select on public.ta_admins to service_role;
grant select,insert on public.ta_credit_vouchers to service_role;

create or replace function public.ta_credit_issue_promo_batch(
 p_request_id uuid,
 p_admin uuid,
 p_email text,
 p_amount integer,
 p_quantity integer,
 p_message text,
 p_transferable boolean,
 p_cards jsonb
)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 batch public.ta_credit_promo_batches%rowtype;
 normalized_email text := lower(btrim(coalesce(p_email,'')));
 normalized_message text := left(btrim(coalesce(p_message,'')),300);
 total_granted bigint;
 cards_result jsonb;
 replayed boolean := false;
begin
 if p_request_id is null or p_admin is null
    or p_amount is null or p_amount < 2500 or p_amount > 100000
    or p_quantity is null or p_quantity < 1 or p_quantity > 10
    or p_transferable is null
    or length(normalized_email) > 200
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
  return jsonb_build_object('error','invalid_input');
 end if;

 if not exists(select 1 from public.ta_admins where user_id=p_admin and role='owner') then
  return jsonb_build_object('error','owner_only');
 end if;

 -- Matches ta_credit_issue_promo exactly, so both issuance paths share a limit.
 perform pg_advisory_xact_lock(hashtextextended('credit-promos:'||p_admin::text,0));
 -- Serialize request IDs across owners as well as retries by the same owner.
 perform pg_advisory_xact_lock(hashtextextended('credit-promo-batch:'||p_request_id::text,0));
 select * into batch from public.ta_credit_promo_batches where id=p_request_id;
 if found then
  if batch.created_by is distinct from p_admin
     or batch.recipient_email is distinct from normalized_email
     or batch.amount_grosze is distinct from p_amount
     or batch.quantity is distinct from p_quantity
     or batch.gift_message is distinct from normalized_message
     or batch.transferable is distinct from p_transferable then
   return jsonb_build_object('error','request_conflict');
  end if;
  -- The Edge Function can generate fresh candidate IDs on a retry. The already
  -- committed cards win; do not revalidate or use those fresh candidates.
  replayed := true;
 else
  if p_cards is null or jsonb_typeof(p_cards) is distinct from 'array' then
   return jsonb_build_object('error','invalid_cards');
  end if;
  if jsonb_array_length(p_cards) <> p_quantity then
   return jsonb_build_object('error','invalid_cards');
  end if;
  if exists(
   select 1 from jsonb_array_elements(p_cards) c
   where jsonb_typeof(c) is distinct from 'object'
      or jsonb_typeof(c->'id') is distinct from 'string'
      or (c->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or jsonb_typeof(c->'code_hash') is distinct from 'string'
      or (c->>'code_hash') !~ '^[0-9a-f]{64}$'
  ) then
   return jsonb_build_object('error','invalid_cards');
  end if;
  if (select count(distinct (c->>'id')::uuid) from jsonb_array_elements(p_cards) c) <> p_quantity
     or (select count(distinct c->>'code_hash') from jsonb_array_elements(p_cards) c) <> p_quantity then
   return jsonb_build_object('error','invalid_cards');
  end if;
  if exists(
   select 1 from public.ta_credit_vouchers v
   join jsonb_array_elements(p_cards) c on v.id=(c->>'id')::uuid or v.code_hash=c->>'code_hash'
  ) then
   return jsonb_build_object('error','card_conflict');
  end if;

  select coalesce(sum(v.amount_grosze),0) into total_granted
  from public.ta_credit_vouchers v
  where v.created_by=p_admin and v.is_promo and v.created_at>=now()-interval '24 hours';
  if total_granted+p_amount::bigint*p_quantity>1500000 then
   return jsonb_build_object('error','daily_limit');
  end if;

  -- Both inserts roll back together even on a cross-owner code/ID collision.
  begin
   insert into public.ta_credit_promo_batches(
    id,created_by,recipient_email,amount_grosze,quantity,gift_message,transferable
   ) values (
    p_request_id,p_admin,normalized_email,p_amount,p_quantity,normalized_message,p_transferable
   ) returning * into batch;

   insert into public.ta_credit_vouchers(
    id,code_hash,created_by,recipient_email,gift_message,amount_grosze,
    status,is_promo,promo_issued_at,transferable,batch_id,batch_position
   ) select
    (c.value->>'id')::uuid,c.value->>'code_hash',p_admin,normalized_email,normalized_message,p_amount,
    'issued',true,now(),p_transferable,p_request_id,c.ordinal::smallint
   from jsonb_array_elements(p_cards) with ordinality as c(value,ordinal);
  exception when unique_violation then
   return jsonb_build_object('error','card_conflict');
  end;
 end if;

 select coalesce(jsonb_agg(to_jsonb(v) order by v.batch_position),'[]'::jsonb)
 into cards_result from public.ta_credit_vouchers v where v.batch_id=batch.id;
 return jsonb_build_object('ok',true,'replayed',replayed,'batch',to_jsonb(batch),'cards',cards_result);
end $$;

revoke execute on function public.ta_credit_issue_promo_batch(uuid,uuid,text,integer,integer,text,boolean,jsonb)
 from public,anon,authenticated;
grant execute on function public.ta_credit_issue_promo_batch(uuid,uuid,text,integer,integer,text,boolean,jsonb)
 to service_role;

-- Preserve the existing transaction, row locks, ledger and single-use behavior.
-- Only an explicitly transferable promotional card can bypass email matching.
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
 if email is null or (not (v.is_promo and v.transferable) and email<>lower(v.recipient_email)) then
  return jsonb_build_object('error','wrong_email');
 end if;
 insert into public.ta_credit_wallets(user_id) values(p_user) on conflict do nothing;
 select * into w from public.ta_credit_wallets where user_id=p_user for update;
 update public.ta_credit_wallets set balance_grosze=w.balance_grosze+v.amount_grosze,updated_at=now() where user_id=p_user;
 insert into public.ta_credit_movements(user_id,amount_grosze,balance_after_grosze,kind,reference_key,description)
 values(p_user,v.amount_grosze,w.balance_grosze+v.amount_grosze,case when v.is_promo then 'redeemed_promo' else 'redeemed_card' end,'voucher:'||v.id,'Karta podarunkowa');
 update public.ta_credit_vouchers set status='redeemed',redeemed_by=p_user,redeemed_at=now() where id=v.id;
 return jsonb_build_object('ok',true,'added_grosze',v.amount_grosze,'balance_grosze',w.balance_grosze+v.amount_grosze);
end $$;

revoke execute on function public.ta_credit_redeem(text,uuid) from public,anon,authenticated;
grant execute on function public.ta_credit_redeem(text,uuid) to service_role;
