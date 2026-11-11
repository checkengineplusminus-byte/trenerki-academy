select vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'ta_order_mail_worker_token')
where not exists(select 1 from vault.secrets where name='ta_order_mail_worker_token');
select cron.schedule('ta-order-delivery','* * * * *',$job$
 select net.http_post(
  url:=replace((select decrypted_secret from vault.decrypted_secrets where name='ta_diploma_worker_url'),'/ta-diplomas','/ta-order-mail'),
  headers:=jsonb_build_object('Content-Type','application/json','x-ta-order-worker',
   (select decrypted_secret from vault.decrypted_secrets where name='ta_order_mail_worker_token')),
  body:='{}'::jsonb,timeout_milliseconds:=30000
 )
$job$);
