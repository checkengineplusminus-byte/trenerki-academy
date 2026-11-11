-- The Edge function supplies the confirmed address from Supabase Auth.
-- Keep redemption atomic and avoid direct service-role access to auth.users.
CREATE OR REPLACE FUNCTION public.ta_redeem_gift(p_hash text, p_user uuid, p_verified_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
declare
  gift public.ta_gift_cards%rowtype;
  email text := lower(btrim(p_verified_email));
  expiry timestamptz := now() + interval '12 months';
begin
  select * into gift from public.ta_gift_cards where code_hash = p_hash for update;
  if not found or gift.mode not in ('free','stripe') then
    return jsonb_build_object('error','invalid_gift_code');
  end if;
  if gift.status <> 'issued' or gift.expires_at <= now() or (gift.mode = 'stripe' and gift.paid_at is null) then
    return jsonb_build_object('error','gift_used_or_expired');
  end if;
  if email is null or email = '' or (gift.recipient_email is not null and lower(gift.recipient_email) <> lower(email)) then
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
$function$;
revoke all on function public.ta_redeem_gift(text,uuid,text) from public, anon, authenticated;
grant execute on function public.ta_redeem_gift(text,uuid,text) to service_role;
