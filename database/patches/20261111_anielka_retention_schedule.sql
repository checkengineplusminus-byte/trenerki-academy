-- Limit retention of optional coaching messages and daily request counters.
select cron.schedule('ta-anielka-retention','25 2 * * *',$job$
 delete from public.ta_lesson_dialogues where updated_at < now()-interval '90 days';
 delete from public.ta_tutor_usage where usage_day < (now() at time zone 'UTC')::date-30;
 delete from ta_internal.anielka_rate where usage_day < (now() at time zone 'UTC')::date-30;
$job$);
