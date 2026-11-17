-- TRENERKI editorial catch-up: source-grounded enrichment for existing lessons only.
-- Non-destructive: no new courses, lessons, quizzes, prices, enrollments, progress or certificates.
-- Accounting and existing complete Norwegian/pastry learning plans explicitly excluded.
-- Source-derived text is NOT independent specialist approval; preserve editorial_status.
begin;
with source as (
 select l.course_slug,l.lesson_no,l.title_pl,l.material m,c.category_pl,
 coalesce(nullif(trim(l.material->'learning'->>'situation'),''),
          nullif(trim(l.material->'construction'->>'story'),''),
          nullif(trim(l.material->'learning'->>'question'),'')) as situation,
 coalesce(nullif(trim(l.material->'learning'->>'example'),''),
          nullif(trim(l.material->'learning'->>'explanation'),''),
          nullif(trim(l.material->'construction'->'roleplay'->>'why'),'')) as solution,
 (select e->>'text' from jsonb_array_elements(coalesce(l.material->'sections','[]'::jsonb)) with ordinality s(e,n)
  where e->>'heading'~*'ciekaw|smaczek|histori|dlaczego|warto wiedzieć|mechanizm'
    and length(trim(coalesce(e->>'text','')))>100 order by n limit 1) as interesting,
 (select e->>'text' from jsonb_array_elements(coalesce(l.material->'sections','[]'::jsonb)) with ordinality s(e,n)
  where e->>'heading'~*'zasad|zrozum|co oznacza|technologi|jak działa|dlaczego|definicja'
    and length(trim(coalesce(e->>'text','')))>100
    and e->>'text'!~*'^(Opracuj|Przygotuj|Zrób|Wykonaj|Ustal|Zapisz|Przećwicz|Rozdziel|Zastanów|Spróbuj|Skorzystaj|Zastosuj|Przyjrzyj|Porównaj|Wybierz|Zdefiniuj|Narysuj|Zbuduj)'
    order by n limit 1) as explain,
 (select e->>'text' from jsonb_array_elements(coalesce(l.material->'sections','[]'::jsonb)) with ordinality s(e,n)
  where length(trim(coalesce(e->>'text','')))>100
    and e->>'text'!~*'^(materiał wstępny|ten moduł poświęcony|Opracuj|Przygotuj|Zrób|Wykonaj|Ustal|Zapisz|Przećwicz|Rozdziel|Zastanów|Spróbuj|Skorzystaj|Zastosuj|Przyjrzyj|Porównaj|Wybierz|Zdefiniuj|Narysuj|Zbuduj)'
    order by n limit 1) as first_fact,
 (select e->>'text' from jsonb_array_elements(coalesce(l.material->'sections','[]'::jsonb)) with ordinality s(e,n)
  where e->>'heading'~*'zadanie|ćwiczenie|wykonaj|zastosuj|przećwicz'
    and length(trim(coalesce(e->>'text','')))>75 order by n limit 1) as section_task
 from public.ta_lessons l
 join public.ta_courses c on c.slug=l.course_slug
 where l.course_slug not in ('ksiegowosc-od-podstaw','lepszy-cukiernik','norweski-na-budowie')
),
enrich as(
 select *,
 coalesce(nullif(interesting,''),nullif(explain,''),first_fact,
          nullif(m->'learning'->>'explanation',''),
          nullif(m->'learning'->>'intro','')) as fact,
 coalesce(nullif(section_task,''),nullif(m->'learning'->>'task',''),
          nullif(m->'construction'->>'takeaway','')) as task,
 case
  when course_slug ~* '^(excel|word|windows|autocad)|wms|sap-|dynamics|google-ads|facebook-ads'
   then 'Ćwicz na kopii dokumentu lub na danych testowych; nie modyfikuj cudzego konta ani produkcyjnych zapisów.'
  when course_slug ~* 'zdrow|adhd|opieka|dzieck|tata|mama|rodzic|związek|zwiazek|uzalezn|relac|kryzys|poznaj-siebie|nie-lubie-ludzi'
   then 'Wykorzystaj fikcyjną sytuację, nie ujawniaj cudzych danych i nie traktuj ćwiczenia jako diagnozy ani porady specjalisty.'
  when category_pl ~* 'budownictw|rzemiosł|zawod|mechanik|ogrodnic'
   then 'Wykonuj ćwiczenie na papierze lub makiecie. Czynności przy maszynach i zagrożeniach wymagają właściwego szkolenia i nadzoru.'
  else 'Ćwiczenie wykonaj na bezpiecznym przykładzie; nie wprowadzaj fikcyjnych danych do rzeczywistych dokumentów ani systemów.'
 end as safety_note
 from source
),
built as(
 select *,
 case when length(trim(coalesce(m->>'curiosity','')))>=60 then m->>'curiosity'
 else concat_ws(' ',
  nullif(trim(m->>'curiosity'),''),
  'Warto wiedzieć przy temacie „'||title_pl||'”:',
  coalesce(nullif(case when length(coalesce(fact,''))>520 then left(fact,500)||'…' else fact end,''),
            'Rezultat zależy od wskazania punktu wyjścia i świadomego sprawdzenia tego, co rzeczywiście się wydarzyło.'),
  case when situation is not null and length(situation)>35
         and position(left(situation,35) in coalesce(fact,''))=0
   then 'Przypadek do rozważenia: '||left(situation,300) else null end
 ) end as new_curiosity,
 case when coalesce(length(m->'homework'->>'instructions'),0)>=70 then m->'homework'
 else jsonb_build_object(
  'title','Zadanie domowe — '||title_pl,
  'instructions',concat_ws(' ',
   coalesce(nullif(task,''),'Przedstaw własny przypadek związany z zagadnieniem „'||title_pl||'”.'),
   case when situation is not null and position(left(situation,26) in coalesce(task,''))=0
     then 'Sytuacja do przećwiczenia: '||left(situation,410) else null end,
   'W zeszycie zapisz potrzebne dane lub obserwacje, swoje kroki, uzasadnienie rozwiązania oraz sposób sprawdzenia wyniku.',
   safety_note
  ),
  'self_check',concat_ws(' ',
   'Czy wskazałeś warunki początkowe, działanie i sprawdzalny wynik, bez mylenia domysłów z faktami?',
   case when length(coalesce(solution,''))>=25 then 'Wniosek z tej lekcji: '||left(solution,440) else null end),
  'source','existing_lesson_content',
  'review_status','source_derived_pending_editorial_verification'
 ) end as new_homework,
 case when jsonb_typeof(m->'lesson_tips')='array' and jsonb_array_length(m->'lesson_tips')>=2
  then m->'lesson_tips'
 else jsonb_build_array(
  concat_ws(' ','Wypisz punkt wyjścia:',case when situation is not null then left(situation,300) else 'z czego wynika problem opisany w temacie „'||title_pl||'”?' end),
  concat_ws(' ','Przed decyzją porównaj swój pomysł z zasadą z lekcji:',
    coalesce(nullif(left(solution,260),''),
             nullif(left(fact,260),''),
             'sprawdź warunki, ograniczenia i możliwe konsekwencje.')),
  'Nie kończ na samej odpowiedzi. Zapisz, po czym rozpoznasz poprawny rezultat; jeśli brakuje danych, zaznacz to zamiast zgadywać.'
 ) end as new_tips
 from enrich
)
update public.ta_lessons l set
material=l.material || jsonb_build_object(
 'curiosity',b.new_curiosity,
 'homework',b.new_homework,
 'lesson_tips',b.new_tips,
 'source_backfill_revision','2026-11-17-source-grounded-v1',
 'source_backfill_editorial_review','pending_human_review',
 'sections',
 case when jsonb_array_length(coalesce(b.m->'sections','[]'::jsonb))>=4 then b.m->'sections'
 else coalesce(b.m->'sections','[]'::jsonb) ||
 jsonb_build_array(
 jsonb_build_object('heading','Przykład zastosowania — krok po kroku',
  'text',concat_ws(' ',
   'Temat: '||b.title_pl||'.',
   case when b.situation is not null then 'Dane scenariusza: '||b.situation end,
   'Najpierw odróżnij obserwację od przypuszczenia. Następnie porównaj możliwe decyzje z materiałem lekcji.',
   case when length(coalesce(b.solution,''))>20 then 'Punkt odniesienia: '||b.solution end)),
 jsonb_build_object('heading','Jak sprawdzić własne rozwiązanie',
  'text',concat_ws(' ','Wykonaj próbę na przykładzie opisanym w lekcji.',
   'Zapisz punkt wyjścia, kolejne kroki i wynik. Zwróć uwagę na warunki oraz ograniczenia.',
   'Wyjaśnij, jakie dane musiałbyś dodatkowo potwierdzić, zanim użyjesz tej decyzji w prawdziwej pracy.'))
 )
 end
),
updated_at=now()
from built b
where l.course_slug=b.course_slug and l.lesson_no=b.lesson_no
and l.course_slug not in('ksiegowosc-od-podstaw','lepszy-cukiernik','norweski-na-budowie')
and l.material->>'source_backfill_revision' is distinct from '2026-11-17-source-grounded-v1';
commit;
select count(*) n,
 count(*) filter(where length(coalesce(material->>'curiosity',''))>=60) curiosity,
 count(*) filter(where length(coalesce(material->'homework'->>'instructions',''))>=70) homework,
 count(*) filter(where jsonb_typeof(material->'lesson_tips')='array' and jsonb_array_length(material->'lesson_tips')>=2) tips,
 count(*) filter(where jsonb_array_length(material->'sections')>=4) sufficient_sections,
 count(*) filter(where material->>'editorial_status'='needs_expert_review') expert_flags,
 count(*) filter(where material->>'source_backfill_revision'='2026-11-17-source-grounded-v1') backfilled
from public.ta_lessons where course_slug<>'ksiegowosc-od-podstaw';