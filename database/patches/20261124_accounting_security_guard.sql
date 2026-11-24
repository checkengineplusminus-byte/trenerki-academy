-- TRENERKI Academy production hardening, applied 2026-11-24.
-- Keeps course progress, notes, and payments unchanged.
-- Safe to re-run if policies are already installed.
BEGIN;

-- Table-wide privileges bypass row-level security and are not needed by app users.
REVOKE TRUNCATE, TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Existing permissive INSERT policies are combined using OR.
-- The following RESTRICTIVE policies add an essential owner-and-entitlement AND gate.
DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ta_accounting_bookmarks'
      AND policyname='ta_bookmarks_insert_owner_entitlement_guard'
  ) THEN
    CREATE POLICY ta_bookmarks_insert_owner_entitlement_guard
      ON public.ta_accounting_bookmarks AS RESTRICTIVE FOR INSERT TO authenticated
      WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT ta_accounting_internal.can_read()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ta_accounting_notes'
      AND policyname='ta_notes_insert_owner_entitlement_guard'
  ) THEN
    CREATE POLICY ta_notes_insert_owner_entitlement_guard
      ON public.ta_accounting_notes AS RESTRICTIVE FOR INSERT TO authenticated
      WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT ta_accounting_internal.can_read()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ta_accounting_practice_answers'
      AND policyname='ta_practice_insert_owner_entitlement_guard'
  ) THEN
    CREATE POLICY ta_practice_insert_owner_entitlement_guard
      ON public.ta_accounting_practice_answers AS RESTRICTIVE FOR INSERT TO authenticated
      WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT ta_accounting_internal.can_read()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='ta_accounting_progress'
      AND policyname='ta_progress_insert_owner_entitlement_guard'
  ) THEN
    CREATE POLICY ta_progress_insert_owner_entitlement_guard
      ON public.ta_accounting_progress AS RESTRICTIVE FOR INSERT TO authenticated
      WITH CHECK (user_id = (SELECT auth.uid()) AND (SELECT ta_accounting_internal.can_read()));
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
      AND (
        has_table_privilege('authenticated',c.oid,'TRUNCATE')
        OR has_table_privilege('authenticated',c.oid,'TRIGGER')
        OR has_table_privilege('authenticated',c.oid,'REFERENCES')
      )
  ) THEN
    RAISE EXCEPTION 'Unexpected app-wide table privileges remain';
  END IF;

  IF (
    SELECT count(*) FROM pg_policies
    WHERE schemaname='public'
      AND policyname IN (
        'ta_bookmarks_insert_owner_entitlement_guard',
        'ta_notes_insert_owner_entitlement_guard',
        'ta_practice_insert_owner_entitlement_guard',
        'ta_progress_insert_owner_entitlement_guard'
      )
      AND permissive='RESTRICTIVE' AND cmd='INSERT'
  ) <> 4 THEN
    RAISE EXCEPTION 'Required restrictive guards are missing';
  END IF;
END;
$guard$;

COMMIT;
