-- Run only after the printable promo batch patch, as the migration/database owner.
-- Creates isolated random fixtures and rolls back ALL users, roles, cards, wallets
-- and ledger movements. No email, payment or external API is invoked.
-- The test deliberately does not reference any existing user or voucher ID.
begin;
set local statement_timeout='30s';

do $test$
declare
 owner_id uuid := gen_random_uuid();
 limit_owner_id uuid := gen_random_uuid();
 foundation_id uuid := gen_random_uuid();
 beneficiary_id uuid := gen_random_uuid();
 unconfirmed_id uuid := gen_random_uuid();
 request_id uuid := gen_random_uuid();
 bad_batch_id uuid;
 limit_batch_id uuid := gen_random_uuid();
 card_ids uuid[] := array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
 legacy_id uuid := gen_random_uuid();
 bound_id uuid := gen_random_uuid();
 legacy_hash text;
 bound_hash text;
 foundation_email text;
 cards jsonb;
 fresh_cards jsonb;
 limit_cards jsonb;
 result jsonb;
 replay jsonb;
 first_hash text;
 before_count bigint;
 constraint_blocked boolean := false;
 proc_signature text := 'public.ta_credit_issue_promo_batch(uuid,uuid,text,integer,integer,text,boolean,jsonb)';
begin
 foundation_email := 'voucher-rollback+'||foundation_id::text||'@example.invalid';
 legacy_hash := md5(legacy_id::text)||md5('legacy:'||legacy_id::text);
 bound_hash := md5(bound_id::text)||md5('bound:'||bound_id::text);

 insert into auth.users(id,email,email_confirmed_at,aud,role,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
 values
  (owner_id,'voucher-rollback+'||owner_id::text||'@example.invalid',now(),'authenticated','authenticated','{}','{}',now(),now()),
  (limit_owner_id,'voucher-rollback+'||limit_owner_id::text||'@example.invalid',now(),'authenticated','authenticated','{}','{}',now(),now()),
  (foundation_id,foundation_email,now(),'authenticated','authenticated','{}','{}',now(),now()),
  (beneficiary_id,'voucher-rollback+'||beneficiary_id::text||'@example.invalid',now(),'authenticated','authenticated','{}','{}',now(),now()),
  (unconfirmed_id,'voucher-rollback+'||unconfirmed_id::text||'@example.invalid',null,'authenticated','authenticated','{}','{}',now(),now());
 insert into public.ta_admins(user_id,role) values(owner_id,'owner'),(limit_owner_id,'owner');

 -- Privileged RPC and batch metadata must remain unavailable to browser roles.
 if has_function_privilege('anon',proc_signature,'EXECUTE')
    or has_function_privilege('authenticated',proc_signature,'EXECUTE')
    or not has_function_privilege('service_role',proc_signature,'EXECUTE') then
  raise exception 'Promo batch RPC privileges are incorrect';
 end if;
 if has_function_privilege('anon','public.ta_credit_redeem(text,uuid)','EXECUTE')
    or has_function_privilege('authenticated','public.ta_credit_redeem(text,uuid)','EXECUTE') then
  raise exception 'Browser roles can call the privileged redemption RPC';
 end if;
 if has_table_privilege('anon','public.ta_credit_promo_batches','SELECT')
    or has_table_privilege('authenticated','public.ta_credit_promo_batches','SELECT')
    or has_table_privilege('authenticated','public.ta_credit_promo_batches','INSERT')
    or not (select relrowsecurity from pg_class where oid='public.ta_credit_promo_batches'::regclass) then
  raise exception 'Promo batch table privileges/RLS are incorrect';
 end if;
 if (select prosecdef from pg_proc where oid=proc_signature::regprocedure) then
  raise exception 'New batch RPC must use SECURITY INVOKER';
 end if;

 select jsonb_agg(jsonb_build_object('id',id,'code_hash',md5(id::text)||md5('card:'||id::text)) order by ordinal)
 into cards from unnest(card_ids) with ordinality as ids(id,ordinal);
 first_hash := cards->0->>'code_hash';

 -- Run the real issuance call under the role used by the Edge Function.
 execute 'set local role service_role';
 result := public.ta_credit_issue_promo_batch(request_id,owner_id,upper(foundation_email),10000,3,'  Dla fundacji  ',true,cards);
 execute 'reset role';
 if (result->>'ok')::boolean is distinct from true or (result->>'replayed')::boolean is distinct from false then
  raise exception 'Initial batch failed: %',result;
 end if;
 if jsonb_array_length(result->'cards')<>3
    or result->'batch'->>'recipient_email' is distinct from foundation_email
    or result->'batch'->>'gift_message' is distinct from 'Dla fundacji' then
  raise exception 'Batch normalization or quantity failed';
 end if;
 if exists(
  select 1 from jsonb_array_elements(result->'cards') with ordinality c(value,ordinal)
  where (c.value->>'id')::uuid is distinct from card_ids[c.ordinal::integer]
     or (c.value->>'batch_position')::integer is distinct from c.ordinal::integer
     or (c.value->>'transferable')::boolean is distinct from true
     or (c.value->>'is_promo')::boolean is distinct from true
     or c.value->>'status' is distinct from 'issued'
 ) then
  raise exception 'Issued cards lost their order, flags or status';
 end if;
 if (select sum(v.amount_grosze) from public.ta_credit_vouchers v where v.batch_id=(result->'batch'->>'id')::uuid)<>30000 then
  raise exception 'Three PLN 100 cards must total PLN 300';
 end if;

 select jsonb_agg(jsonb_build_object('id',id,'code_hash',md5(id::text)||md5('retry:'||id::text)))
 into fresh_cards from (select gen_random_uuid() id from generate_series(1,3)) candidates;
 replay := public.ta_credit_issue_promo_batch(request_id,owner_id,foundation_email,10000,3,'Dla fundacji',true,fresh_cards);
 if (replay->>'ok')::boolean is distinct from true or (replay->>'replayed')::boolean is distinct from true
    or replay->'cards' is distinct from result->'cards'
    or (select count(*) from public.ta_credit_vouchers v where v.created_by=owner_id)<>3 then
  raise exception 'Retry issued new cards or changed their order';
 end if;
 replay := public.ta_credit_issue_promo_batch(request_id,owner_id,foundation_email,20000,3,'Dla fundacji',true,fresh_cards);
 if replay->>'error' is distinct from 'request_conflict' then raise exception 'Changed amount was accepted on retry'; end if;
 replay := public.ta_credit_issue_promo_batch(request_id,limit_owner_id,foundation_email,10000,3,'Dla fundacji',true,fresh_cards);
 if replay->>'error' is distinct from 'request_conflict' then raise exception 'Another owner reused a request ID'; end if;
 replay := public.ta_credit_issue_promo_batch(gen_random_uuid(),beneficiary_id,foundation_email,10000,3,'Dla fundacji',true,fresh_cards);
 if replay->>'error' is distinct from 'owner_only' then raise exception 'Non-owner issued cards'; end if;

 -- Invalid payloads and collisions never leave a batch or partial cards behind.
 bad_batch_id := gen_random_uuid();
 replay := public.ta_credit_issue_promo_batch(bad_batch_id,owner_id,foundation_email,10000,3,'',true,'[]');
 if replay->>'error' is distinct from 'invalid_cards' or exists(select 1 from public.ta_credit_promo_batches where id=bad_batch_id) then
  raise exception 'Invalid card count left a batch behind';
 end if;
 replay := public.ta_credit_issue_promo_batch(bad_batch_id,owner_id,foundation_email,10000,2,'',true,jsonb_build_array(fresh_cards->0,fresh_cards->0));
 if replay->>'error' is distinct from 'invalid_cards' then raise exception 'Duplicate candidate cards were accepted'; end if;
 replay := public.ta_credit_issue_promo_batch(bad_batch_id,owner_id,foundation_email,10000,3,'',true,cards);
 if replay->>'error' is distinct from 'card_conflict' or exists(select 1 from public.ta_credit_promo_batches where id=bad_batch_id) then
  raise exception 'Existing card collision created a partial batch';
 end if;

 -- Printing/delivery does not credit a wallet. Unconfirmed users cannot redeem.
 if exists(select 1 from public.ta_credit_wallets where user_id in (foundation_id,beneficiary_id) and balance_grosze<>0) then
  raise exception 'Issuance unexpectedly credited a wallet';
 end if;
 replay := public.ta_credit_redeem(first_hash,unconfirmed_id);
 if replay->>'error' is distinct from 'wrong_email' then raise exception 'An unconfirmed user redeemed a card'; end if;
 replay := public.ta_credit_redeem(first_hash,beneficiary_id);
 if (replay->>'ok')::boolean is distinct from true or (replay->>'added_grosze')::integer<>10000 then
  raise exception 'Beneficiary could not redeem a transferable card';
 end if;
 replay := public.ta_credit_redeem(first_hash,foundation_id);
 if replay->>'error' is distinct from 'code_used_or_expired' then raise exception 'Card was redeemable by a second person'; end if;
 replay := public.ta_credit_redeem(first_hash,beneficiary_id);
 if replay->>'error' is distinct from 'code_used_or_expired'
    or (select balance_grosze from public.ta_credit_wallets where user_id=beneficiary_id)<>10000
    or (select count(*) from public.ta_credit_movements where user_id=beneficiary_id)<>1 then
  raise exception 'Repeated redemption changed the balance or ledger';
 end if;

 -- Old issuance remains available and stays email-bound by default.
 replay := public.ta_credit_issue_promo(legacy_id,owner_id,foundation_email,2500,legacy_hash,'Legacy fixture');
 if (replay->>'ok')::boolean is distinct from true then raise exception 'Legacy issuance regressed'; end if;
 if exists(select 1 from public.ta_credit_vouchers where id=legacy_id and (transferable or batch_id is not null)) then
  raise exception 'Legacy card acquired transferability';
 end if;
 replay := public.ta_credit_redeem(legacy_hash,beneficiary_id);
 if replay->>'error' is distinct from 'wrong_email' then raise exception 'Legacy email binding was weakened'; end if;
 replay := public.ta_credit_redeem(legacy_hash,foundation_id);
 if (replay->>'ok')::boolean is distinct from true then raise exception 'Intended legacy recipient cannot redeem'; end if;

 replay := public.ta_credit_issue_promo_batch(gen_random_uuid(),owner_id,foundation_email,2500,1,'Bound fixture',false,
  jsonb_build_array(jsonb_build_object('id',bound_id,'code_hash',bound_hash)));
 if (replay->>'ok')::boolean is distinct from true then raise exception 'Email-bound batch failed'; end if;
 replay := public.ta_credit_redeem(bound_hash,beneficiary_id);
 if replay->>'error' is distinct from 'wrong_email' then raise exception 'New nontransferable card was transferable'; end if;
 replay := public.ta_credit_redeem(bound_hash,foundation_id);
 if (replay->>'ok')::boolean is distinct from true then raise exception 'Intended batch recipient cannot redeem'; end if;

 begin
  insert into public.ta_credit_vouchers(id,created_by,code_hash,recipient_email,amount_grosze,is_promo,transferable)
  values(gen_random_uuid(),owner_id,md5('disallowed:'||owner_id::text)||md5(owner_id::text),foundation_email,2500,false,true);
 exception when check_violation then
  constraint_blocked := true;
 end;
 if not constraint_blocked then raise exception 'A non-promotional transferable card was accepted'; end if;

 -- Exactly PLN 15,000 is permitted; the next card is blocked across both APIs.
 select jsonb_agg(jsonb_build_object('id',id,'code_hash',md5(id::text)||md5('limit:'||id::text)))
 into limit_cards from (select gen_random_uuid() id from generate_series(1,10)) candidates;
 result := public.ta_credit_issue_promo_batch(limit_batch_id,limit_owner_id,foundation_email,100000,10,'Limit fixture',true,limit_cards);
 if (result->>'ok')::boolean is distinct from true then raise exception 'PLN 10,000 batch failed'; end if;
 select jsonb_agg(jsonb_build_object('id',id,'code_hash',md5(id::text)||md5('limit2:'||id::text)))
 into fresh_cards from (select gen_random_uuid() id from generate_series(1,5)) candidates;
 replay := public.ta_credit_issue_promo_batch(gen_random_uuid(),limit_owner_id,foundation_email,100000,5,'Limit fixture',true,fresh_cards);
 if (replay->>'ok')::boolean is distinct from true then raise exception 'Exact PLN 15,000 limit was rejected'; end if;
 select count(*) into before_count from public.ta_credit_vouchers where created_by=limit_owner_id;
 bad_batch_id := gen_random_uuid();
 replay := public.ta_credit_issue_promo_batch(bad_batch_id,limit_owner_id,foundation_email,2500,1,'Over limit',true,
  jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'code_hash',md5(bad_batch_id::text)||md5('over:'||bad_batch_id::text))));
 if replay->>'error' is distinct from 'daily_limit'
    or exists(select 1 from public.ta_credit_promo_batches where id=bad_batch_id)
    or (select count(*) from public.ta_credit_vouchers where created_by=limit_owner_id)<>before_count then
  raise exception 'Daily limit failed or left partial records';
 end if;
 replay := public.ta_credit_issue_promo(gen_random_uuid(),limit_owner_id,foundation_email,2500,
  md5('old-limit:'||limit_owner_id::text)||md5(limit_owner_id::text),'Over limit via legacy API');
 if replay->>'error' is distinct from 'daily_limit' then raise exception 'Legacy and batch APIs do not share the limit'; end if;
 replay := public.ta_credit_issue_promo_batch(limit_batch_id,limit_owner_id,foundation_email,100000,10,'Limit fixture',true,'[]');
 if (replay->>'ok')::boolean is distinct from true or (replay->>'replayed')::boolean is distinct from true
    or replay->'cards' is distinct from result->'cards' then
  raise exception 'A committed batch could not be retried after reaching the limit';
 end if;
 raise notice 'PASS: 3-card batch, normalization, service_role execution, ordered idempotency, conflicts, atomic validation, transferability, confirmed-user requirement, single redemption, legacy compatibility, daily limit and ACL/RLS.';
end
$test$;

rollback;
