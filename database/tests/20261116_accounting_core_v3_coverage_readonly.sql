-- TRENERKI / istniejący kurs „Księgowość od podstaw — Encyklopedia”
-- core-v3-20261113: WYŁĄCZNIE ODCZYT, bez tworzenia kursu i bez dostępu do danych uczniów.
-- Uruchom w projekcie TRENERKI Academy. Weryfikacja ilościowa ≠ odbiór eksperta.
-- Nie eksportuj treści material, exercise.expected/correctIndex ani response uczniów.
--
-- Oczekiwane: 10 działów po 10 tematów, 100 materiałów, 100 zadań domowych,
-- 100 użytecznych kluczy do samokontroli, 36 fikcyjnych dowodów D01–D36.
-- Nawet wynik bez braków nie zmienia NO_GO, published ani ceny 999 PLN.
WITH section_sizes AS (
  SELECT section_no, count(*) AS size
  FROM public.ta_accounting_core_topics_v3
  GROUP BY section_no
),
curriculum AS (
  SELECT count(*) AS total, count(*) FILTER (WHERE status='complete') AS complete_count
  FROM public.ta_accounting_core_topics_v3
),
materials AS (
  SELECT topic_no, editorial_status, material,
    coalesce(material #>> '{practice,task}', '') AS task_text,
    coalesce(material #>> '{practice,expected_output}', '') AS self_check_text
  FROM public.ta_accounting_core_materials_v3
),
exercises AS (
  SELECT m.topic_no, ex->>'id' AS exercise_id, ex->>'type' AS exercise_type,
    ex AS task
  FROM materials AS m
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(m.material->'exercises')='array'
      THEN m.material->'exercises' ELSE '[]'::jsonb END
  ) AS ex
),
exercise_issues AS (
  SELECT topic_no, exercise_id
  FROM exercises
  WHERE exercise_id IS NULL OR exercise_id=''
    OR exercise_type NOT IN ('number','choice')
    OR coalesce(length(task->>'prompt'),0)<10
),
duplicate_exercises AS (
  SELECT topic_no, exercise_id FROM exercises
  GROUP BY topic_no, exercise_id HAVING count(*)>1
),
-- Check only the SHAPE of confidential answer keys: never select their values.
solution_issues AS (
  SELECT topic_no, exercise_id FROM exercises
  WHERE NOT (
    CASE WHEN exercise_type='choice' THEN
      CASE WHEN jsonb_typeof(task->'choices')='array'
        AND (task->>'correctIndex') ~ '^[0-9]{1,3}homework_gaps AS (
  SELECT topic_no FROM materials
  WHERE jsonb_typeof(material->'practice') IS DISTINCT FROM 'object'
    OR length(task_text)<100
),
self_check_gaps AS (
  SELECT topic_no FROM materials WHERE length(self_check_text)<40
),
manifest AS (
  SELECT
    CASE WHEN jsonb_typeof(material #> '{scenario,documents}')='array'
      THEN jsonb_array_length(material #> '{scenario,documents}') ELSE 0 END AS document_count,
    coalesce(material #>> '{scenario,id}', '') AS manifest_id
  FROM materials WHERE topic_no=96
)
SELECT
  'core-v3-20261113' AS plan,
  'NO_GO — wymaga niezależnego odbioru; kontrola wyłącznie strukturalna' AS release_gate,
  (SELECT total FROM curriculum) AS topics,
  (SELECT count(*)=10 AND coalesce(bool_and(size=10),false) FROM section_sizes)
    AS sections_10_x_10,
  (SELECT count(*) FROM materials) AS materials,
  (SELECT count(*) FROM materials WHERE jsonb_typeof(material->'practice')='object')
    AS homework_descriptions,
  (SELECT count(*) FROM materials WHERE length(task_text)>=100)
    AS homework_instructions_min_100_chars,
  (SELECT count(*) FROM materials WHERE length(self_check_text)>=40)
    AS homework_self_check_min_40_chars,
  (SELECT coalesce(array_agg(topic_no ORDER BY topic_no),'{}'::smallint[]) FROM homework_gaps)
    AS homework_instruction_gap_topics,
  (SELECT coalesce(array_agg(topic_no ORDER BY topic_no),'{}'::smallint[]) FROM self_check_gaps)
    AS homework_self_check_gap_topics,
  (SELECT count(*) FROM exercises) AS exercise_count,
  (SELECT count(*) FROM exercise_issues) AS invalid_exercises,
  (SELECT count(*) FROM duplicate_exercises) AS duplicate_exercise_ids,
  (SELECT count(*) FROM solution_issues) AS invalid_answer_key_shapes,
  (SELECT document_count FROM manifest) AS d01_d36_documents,
  (SELECT manifest_id FROM manifest) AS d01_d36_manifest_id,
  (SELECT complete_count FROM curriculum) AS topics_expert_accepted,
  (SELECT count(*) FROM materials WHERE editorial_status='complete') AS materials_expert_accepted;

      THEN jsonb_array_length(task->'choices')>=2
        AND (task->>'correctIndex')::integer < jsonb_array_length(task->'choices')
      ELSE false END
    WHEN exercise_type='number' THEN
      CASE WHEN jsonb_typeof(task->'expected')='number'
      THEN (task->>'expected')::numeric BETWEEN -1000000000000 AND 1000000000000
      ELSE false END
    ELSE false END
  )
),
homework_gaps AS (
  SELECT topic_no FROM materials
  WHERE jsonb_typeof(material->'practice') IS DISTINCT FROM 'object'
    OR length(task_text)<100
),
self_check_gaps AS (
  SELECT topic_no FROM materials WHERE length(self_check_text)<40
),
manifest AS (
  SELECT
    CASE WHEN jsonb_typeof(material #> '{scenario,documents}')='array'
      THEN jsonb_array_length(material #> '{scenario,documents}') ELSE 0 END AS document_count,
    coalesce(material #>> '{scenario,id}', '') AS manifest_id
  FROM materials WHERE topic_no=96
)
SELECT
  'core-v3-20261113' AS plan,
  'NO_GO — wymaga niezależnego odbioru; kontrola wyłącznie strukturalna' AS release_gate,
  (SELECT total FROM curriculum) AS topics,
  (SELECT count(*)=10 AND coalesce(bool_and(size=10),false) FROM section_sizes)
    AS sections_10_x_10,
  (SELECT count(*) FROM materials) AS materials,
  (SELECT count(*) FROM materials WHERE jsonb_typeof(material->'practice')='object')
    AS homework_descriptions,
  (SELECT count(*) FROM materials WHERE length(task_text)>=100)
    AS homework_instructions_min_100_chars,
  (SELECT count(*) FROM materials WHERE length(self_check_text)>=40)
    AS homework_self_check_min_40_chars,
  (SELECT coalesce(array_agg(topic_no ORDER BY topic_no),'{}'::smallint[]) FROM homework_gaps)
    AS homework_instruction_gap_topics,
  (SELECT coalesce(array_agg(topic_no ORDER BY topic_no),'{}'::smallint[]) FROM self_check_gaps)
    AS homework_self_check_gap_topics,
  (SELECT count(*) FROM exercises) AS exercise_count,
  (SELECT count(*) FROM exercise_issues) AS invalid_exercises,
  (SELECT count(*) FROM duplicate_exercises) AS duplicate_exercise_ids,
  (SELECT document_count FROM manifest) AS d01_d36_documents,
  (SELECT manifest_id FROM manifest) AS d01_d36_manifest_id,
  (SELECT complete_count FROM curriculum) AS topics_expert_accepted,
  (SELECT count(*) FROM materials WHERE editorial_status='complete') AS materials_expert_accepted;
