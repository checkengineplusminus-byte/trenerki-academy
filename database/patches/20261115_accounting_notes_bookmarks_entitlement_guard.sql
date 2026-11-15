-- TRENERKI core-v3 follow-up to progress/practice RLS entitlement guard.
-- Restricts INSERT of personal accounting notes and bookmarks to active course
-- entitlements, leaving existing owner checks and DELETE for privacy intact.
DO $guard$
BEGIN
 PERFORM 1 FROM ta_accounting_internal.build_leases
 WHERE lease_key='encyclopedia-builder'
   AND owner_run='11a53c8d-b248-4e87-b41b-d799597577fc'::uuid AND leased_until>now() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Missing active exclusive lease'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.ta_courses WHERE
   slug='ksiegowosc-od-podstaw' AND price_grosze=99900 AND published=false)
 THEN RAISE EXCEPTION 'Protected course guard failed'; END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class
    WHERE oid='public.ta_accounting_bookmarks'::regclass)
  OR NOT (SELECT relrowsecurity FROM pg_class
    WHERE oid='public.ta_accounting_notes'::regclass)
 THEN RAISE EXCEPTION 'RLS disabled'; END IF;
 IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND
   policyname IN ('accounting_bookmarks_entitlement_insert_v1',
                  'accounting_notes_entitlement_insert_v1'))
 THEN RAISE EXCEPTION 'Policy collision; manual review required'; END IF;
 CREATE POLICY accounting_bookmarks_entitlement_insert_v1
  ON public.ta_accounting_bookmarks AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT ta_accounting_internal.can_read()));
 CREATE POLICY accounting_notes_entitlement_insert_v1
  ON public.ta_accounting_notes AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT ta_accounting_internal.can_read()));
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND
    policyname IN ('accounting_bookmarks_entitlement_insert_v1',
                   'accounting_notes_entitlement_insert_v1')
    AND permissive='RESTRICTIVE' AND cmd='INSERT'
    AND with_check LIKE '%can_read()%')<>2
 THEN RAISE EXCEPTION 'Policy postcondition failed'; END IF;
 IF NOT EXISTS (SELECT 1 FROM ta_accounting_internal.build_leases WHERE
   lease_key='encyclopedia-builder' AND owner_run='11a53c8d-b248-4e87-b41b-d799597577fc'::uuid
   AND leased_until>now())
 THEN RAISE EXCEPTION 'Exclusive lease expired'; END IF;
END
$guard$;
