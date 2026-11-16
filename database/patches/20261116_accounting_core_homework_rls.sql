-- One saved homework response per learner and core-v3 topic; private, versioned.
-- Never grants course completion or releases unpublished materials.
DO $guard$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM ta_accounting_internal.build_leases
                WHERE lease_key='encyclopedia-builder'
                AND owner_run='67eac4ef-20f9-4c7e-bbd8-f42ce57dbdcb'::uuid
                AND leased_until>now() FOR UPDATE)
 THEN RAISE EXCEPTION 'No valid exclusive accounting build lease';
 END IF;
END
$guard$;

CREATE TABLE public.ta_accounting_core_homework_v3 (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 topic_no smallint NOT NULL REFERENCES public.ta_accounting_core_topics_v3(topic_no),
 response text NOT NULL DEFAULT '',
 version integer NOT NULL DEFAULT 1,
 submitted_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id,topic_no),
 CONSTRAINT accounting_homework_response_max CHECK(char_length(response)<=10000),
 CONSTRAINT accounting_homework_version_positive CHECK(version>=1),
 CONSTRAINT accounting_homework_submission_nonempty CHECK(submitted_at IS NULL OR char_length(btrim(response))>=120)
);
ALTER TABLE public.ta_accounting_core_homework_v3 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ta_accounting_core_homework_v3 FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.ta_accounting_core_homework_v3 TO authenticated;
CREATE POLICY accounting_homework_owner_read ON public.ta_accounting_core_homework_v3
 FOR SELECT TO authenticated USING (
  user_id=(SELECT auth.uid()) AND (SELECT ta_accounting_internal.can_read())
 );

-- All writes go through strict owner + entitlement + compare-and-swap.
-- No user_id parameter, no direct INSERT/UPDATE rights on the table.
CREATE FUNCTION public.ta_accounting_core_homework_save(
 p_topic_no smallint,p_response text,p_submit boolean,p_expected_version integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE
 v_user uuid := auth.uid();
 v_before public.ta_accounting_core_homework_v3;
 v_saved public.ta_accounting_core_homework_v3;
BEGIN
 IF v_user IS NULL OR NOT ta_accounting_internal.can_read() THEN
  RAISE EXCEPTION 'Wymagane zalogowane konto z dostępem do kursu.' USING ERRCODE='42501';
 END IF;
 IF p_topic_no IS NULL OR p_topic_no<1 OR p_topic_no>100 OR NOT EXISTS(
  SELECT 1 FROM public.ta_accounting_core_materials_v3 m WHERE m.topic_no=p_topic_no
    AND (m.editorial_status='approved' OR ta_accounting_internal.is_editor())
 ) THEN
  RAISE EXCEPTION 'Ten temat nie ma dostępnej praktyki.' USING ERRCODE='42501';
 END IF;
 IF p_response IS NULL OR char_length(p_response)>10000 OR p_submit IS NULL OR
   (p_submit AND char_length(btrim(p_response))<120) THEN
  RAISE EXCEPTION 'Zapisz odpowiedź do 10 000 znaków. Przed oddaniem zadania opisz pracę własnymi słowami (minimum 120 znaków).';
 END IF;
 SELECT * INTO v_before FROM public.ta_accounting_core_homework_v3
  WHERE user_id=v_user AND topic_no=p_topic_no FOR UPDATE;
 IF NOT FOUND THEN
  IF p_expected_version IS NOT NULL THEN
   RAISE EXCEPTION 'Wersja zadania zmieniła się. Odśwież i porównaj odpowiedzi.' USING ERRCODE='40001';
  END IF;
  INSERT INTO public.ta_accounting_core_homework_v3(user_id,topic_no,response,version,submitted_at,updated_at)
   VALUES(v_user,p_topic_no,p_response,1,CASE WHEN p_submit THEN now() ELSE NULL END,now())
   ON CONFLICT DO NOTHING RETURNING * INTO v_saved;
  IF v_saved.user_id IS NULL THEN
   RAISE EXCEPTION 'Zadanie zapisano w drugim oknie. Odczytaj aktualny tekst przed edycją.' USING ERRCODE='40001';
  END IF;
 ELSE
  IF p_expected_version IS DISTINCT FROM v_before.version THEN
   RAISE EXCEPTION 'W innym oknie zapisano nową wersję. Nie nadpisano Twojego tekstu.' USING ERRCODE='40001';
  END IF;
  UPDATE public.ta_accounting_core_homework_v3
   SET response=p_response,version=version+1,submitted_at=CASE WHEN p_submit THEN now() ELSE NULL END,updated_at=now()
   WHERE user_id=v_user AND topic_no=p_topic_no AND version=v_before.version
   RETURNING * INTO v_saved;
  IF v_saved.user_id IS NULL THEN
   RAISE EXCEPTION 'Konflikt wersji. Zachowaj swoje zmiany i odśwież.' USING ERRCODE='40001';
  END IF;
 END IF;
 RETURN to_jsonb(v_saved);
END
$fn$;
REVOKE ALL ON FUNCTION public.ta_accounting_core_homework_save(smallint,text,boolean,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ta_accounting_core_homework_save(smallint,text,boolean,integer) TO authenticated;
COMMENT ON TABLE public.ta_accounting_core_homework_v3 IS 'Private self-written homework; submitted_at is not proof of correctness, completed course, or legal review.';
COMMENT ON FUNCTION public.ta_accounting_core_homework_save(smallint,text,boolean,integer) IS 'Authenticated owner-only CAS write; does not confer graduation, approval, or publication.';
