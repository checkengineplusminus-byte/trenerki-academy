-- TRENERKI core-v3: require real course entitlement before writing practice or reading-progress rows.
-- Tightens only INSERT RLS on accounting-only tables. No user records, course price,
-- course publication, purchases, grants or other courses are changed.
-- The base owner/exercise checks remain; RESTRICTIVE policies add a second gate.
DO $guard$
BEGIN
 PERFORM 1 FROM ta_accounting_internal.build_leases
  WHERE lease_key='encyclopedia-builder'
    AND owner_run='11a53c8d-b248-4e87-b41b-d799597577fc'::uuid AND leased_until>now()
  FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Missing current encyclopedia-builder lease'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.ta_courses WHERE
   slug='ksiegowosc-od-podstaw' AND price_grosze=99900 AND published=false)
 THEN RAISE EXCEPTION 'Unexpected course price or publication status'; END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE
   oid='public.ta_accounting_progress'::regclass)
  OR NOT (SELECT relrowsecurity FROM pg_class WHERE
   oid='public.ta_accounting_practice_answers'::regclass)
 THEN RAISE EXCEPTION 'Required RLS is disabled'; END IF;
 IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND policyname IN ('accounting_progress_entitlement_insert_v1',
                       'accounting_practice_entitlement_insert_v1'))
 THEN RAISE EXCEPTION 'Entitlement policy already exists; review before migration'; END IF;
 IF to_regprocedure('ta_accounting_internal.can_read()') IS NULL
 THEN RAISE EXCEPTION 'Entitlement predicate is missing'; END IF;

 EXECUTE $sql$
  CREATE POLICY accounting_progress_entitlement_insert_v1
  ON public.ta_accounting_progress AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT ta_accounting_internal.can_read()))
 $sql$;
 EXECUTE $sql$
  CREATE POLICY accounting_practice_entitlement_insert_v1
  ON public.ta_accounting_practice_answers AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT ta_accounting_internal.can_read()))
 $sql$;

 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public'
     AND policyname IN ('accounting_progress_entitlement_insert_v1',
                        'accounting_practice_entitlement_insert_v1')
     AND cmd='INSERT'
     AND with_check LIKE '%can_read()%') <> 2
 THEN RAISE EXCEPTION 'Policy readback failed'; END IF;
 IF NOT EXISTS (SELECT 1 FROM ta_accounting_internal.build_leases
     WHERE lease_key='encyclopedia-builder' AND owner_run='11a53c8d-b248-4e87-b41b-d799597577fc'::uuid
       AND leased_until>now())
 THEN RAISE EXCEPTION 'Lease expired during migration'; END IF;
END
$guard$;
