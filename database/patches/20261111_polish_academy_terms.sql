-- Polish labels shown to participants and two English certificate title corrections.
begin;

update public.ta_lessons
set
  title_pl = replace(title_pl, 'Expert:', 'Zaawansowane:'),
  material = replace(
    replace(
      replace(material::text, 'Expert:', 'Zaawansowane:'),
      'Na poziomie Expert', 'Na poziomie zaawansowanym'
    ),
    'Poziom Expert', 'Poziom zaawansowany'
  )::jsonb,
  updated_at = now()
where title_pl like '%Expert:%'
   or material::text like any (array['%Expert:%', '%Na poziomie Expert%', '%Poziom Expert%']);

update public.ta_course_previews
set module_titles = replace(module_titles::text, 'Expert:', 'Zaawansowane:')::jsonb,
    updated_at = now()
where module_titles::text like '%Expert:%';

update public.ta_courses
set certificate_en = 'Support and Healthy Boundaries for Families and Friends Affected by Addiction'
where slug = 'partner-z-uzaleznieniem'
  and certificate_en = 'Supporting Loved Ones with Addiction and Healthy Boundaries';

update public.ta_courses
set certificate_en = 'Leather Harness Making and Repair Fundamentals'
where slug = 'rymarz'
  and certificate_en = 'Harness Making and Leather Harness Assessment';

commit;
