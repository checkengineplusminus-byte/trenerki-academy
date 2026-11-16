-- Existing course only. Prepares paid EARLY ACCESS without claiming editorial completion.
-- This migration intentionally does not publish the course or change its price.
DO $$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM ta_accounting_internal.build_leases
  WHERE lease_key='encyclopedia-builder'
    AND owner_run='8e621752-990d-42a5-bf7d-b7f8ef599291'::uuid
    AND leased_until>now() FOR UPDATE
 ) THEN RAISE EXCEPTION 'Valid exclusive accounting build lease required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.ta_courses WHERE slug='ksiegowosc-od-podstaw'
   AND published=false AND price_grosze=99900) THEN
  RAISE EXCEPTION 'Accounting publication guard changed; review manually';
 END IF;
 IF (SELECT count(*) FROM public.ta_accounting_core_materials_v3
      WHERE editorial_status='review_needed') <> 100 THEN
  RAISE EXCEPTION 'Unexpected accounting material state; do not alter RLS';
 END IF;
END $$;
ALTER TABLE public.ta_courses DROP CONSTRAINT ta_courses_ksiegowosc_invariant;
ALTER TABLE public.ta_courses ADD CONSTRAINT ta_courses_ksiegowosc_price_invariant
 CHECK (slug<>'ksiegowosc-od-podstaw' OR price_grosze=99900);

DROP POLICY core_material_v3_read ON public.ta_accounting_core_materials_v3;
CREATE POLICY core_material_v3_read ON public.ta_accounting_core_materials_v3 FOR SELECT TO authenticated
 USING (
  (editorial_status='approved' AND (SELECT ta_accounting_internal.can_read()))
  OR
  (editorial_status='review_needed' AND (
    (SELECT ta_accounting_internal.is_editor())
    OR (
      (SELECT ta_accounting_internal.can_read())
      AND EXISTS (SELECT 1 FROM public.ta_courses c
        WHERE c.slug='ksiegowosc-od-podstaw' AND c.published=true)
    )
  ))
 );
COMMENT ON POLICY core_material_v3_read ON public.ta_accounting_core_materials_v3 IS
'Review_needed materials are visible to authenticated editor, or to entitled early-access learners ONLY while course is publicly published; content remains review_needed and never becomes legally approved automatically.';


-- Buyer can also hand in homework for accessible developmental lessons. Approval state remains review_needed.
DO $$
DECLARE v_definition text; v_old text := '(m.editorial_status=''approved'' OR ta_accounting_internal.is_editor())';
v_new text := '(m.editorial_status=''approved'' OR ta_accounting_internal.is_editor() OR (m.editorial_status=''review_needed'' AND EXISTS (SELECT 1 FROM public.ta_courses c WHERE c.slug=''ksiegowosc-od-podstaw'' AND c.published=true)))';
BEGIN
 IF NOT EXISTS (SELECT 1 FROM ta_accounting_internal.build_leases WHERE lease_key='encyclopedia-builder'
   AND owner_run='8e621752-990d-42a5-bf7d-b7f8ef599291'::uuid AND leased_until>now() FOR UPDATE)
 THEN RAISE EXCEPTION 'Accounting builder lease not held'; END IF;
 SELECT pg_get_functiondef('public.ta_accounting_core_homework_save(smallint,text,boolean,integer)'::regprocedure) INTO v_definition;
 IF v_definition IS NULL OR (length(v_definition)-length(replace(v_definition,v_old,'')))<>length(v_old)
 THEN RAISE EXCEPTION 'Unknown homework function version, release aborted'; END IF;
 EXECUTE replace(v_definition,v_old,v_new);
END $$;
