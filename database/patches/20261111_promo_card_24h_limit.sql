-- Increase the owner's rolling 24-hour limit for promotional gift cards to PLN 10,000.
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
 if total_granted+p_amount>1000000 then return jsonb_build_object('error','daily_limit'); end if;
 insert into public.ta_credit_vouchers(id,code_hash,created_by,recipient_email,gift_message,amount_grosze,status,is_promo,promo_issued_at)
 values(p_id,p_hash,p_admin,lower(trim(p_email)),left(coalesce(p_message,''),300),p_amount,'issued',true,now());
 return jsonb_build_object('ok',true,'card_id',p_id,'recipient_email',lower(trim(p_email)),'amount_grosze',p_amount);
end $$;
