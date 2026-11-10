-- Hosted TRENERKI Academy. Run after installing the diploma registry and deploying ta-diplomas.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),
  'ta_diploma_worker_token','Private diploma mail dispatcher')
where not exists (select 1 from vault.secrets where name='ta_diploma_worker_token');
select vault.create_secret('https://kcvvixcjuwglfvdpypzs.supabase.co/functions/v1/ta-diplomas',
  'ta_diploma_worker_url','Diploma mail dispatcher endpoint')
where not exists (select 1 from vault.secrets where name='ta_diploma_worker_url');
select cron.schedule('ta-diploma-delivery','*/2 * * * *',$job$
  select net.http_post(
    url:=(select decrypted_secret from vault.decrypted_secrets where name='ta_diploma_worker_url'),
    headers:=jsonb_build_object('Content-Type','application/json','x-ta-diploma-worker',
      (select decrypted_secret from vault.decrypted_secrets where name='ta_diploma_worker_token')),
    body:='{"action":"deliver"}'::jsonb,
    timeout_milliseconds:=30000
  )
  where exists (select 1 from public.ta_diploma_mail where
     (status='pending' and next_attempt_at<=now()) or (status='sending' and lease_until<=now()))
$job$);
