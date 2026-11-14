-- Core-v3 TRENERKI: narzucona atomowa kontrola wersji pracowni księgowej.
-- Tylko fikcyjne dane, bez zmian w rekordach użytkowników.
-- Po zastosowaniu: authenticated NIE ma UPDATE(state, version) bez RPC.
-- SECURITY DEFINER wyłącznie w niewystawionym schemacie internal.
-- Wymóg migracji: aktywny lease właściciela poniżej.
DO $precheck$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM ta_accounting_internal.build_leases
  WHERE lease_key='encyclopedia-builder'
    AND owner_run='16167610-0b30-4368-8295-129f196739df'::uuid
    AND leased_until>now() FOR UPDATE
 ) THEN RAISE EXCEPTION 'Migration blocked: no valid owner lease'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.ta_courses
    WHERE slug='ksiegowosc-od-podstaw' AND price_grosze=99900 AND published=false)
 THEN RAISE EXCEPTION 'Unexpected course price/publication'; END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class
    WHERE oid='public.ta_accounting_lab_workspaces'::regclass)
 THEN RAISE EXCEPTION 'RLS is not enabled'; END IF;
 IF (SELECT prosecdef FROM pg_proc
    WHERE oid='public.ta_accounting_lab_save(uuid,integer,jsonb)'::regprocedure)
 THEN RAISE EXCEPTION 'RPC contract changed: already SECURITY DEFINER'; END IF;
 IF to_regprocedure('ta_accounting_internal.lab_save_authorized(uuid,integer,jsonb)') IS NOT NULL
 THEN RAISE EXCEPTION 'Another helper already exists'; END IF;
 IF NOT has_schema_privilege('authenticated','ta_accounting_internal','USAGE')
 THEN RAISE EXCEPTION 'Authenticated cannot use private helper schema'; END IF;
END
$precheck$;

CREATE FUNCTION ta_accounting_internal.lab_save_authorized(
 workspace_id uuid, expected_version integer, next_state jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
 saved public.ta_accounting_lab_workspaces;
 caller_id uuid;
BEGIN
 caller_id:=auth.uid();
 IF caller_id IS NULL OR NOT ta_accounting_internal.can_read() THEN
  RAISE EXCEPTION 'Brak aktywnego dostępu do ćwiczeń.' USING ERRCODE='42501';
 END IF;
 -- Dwie warstwy obrony: jawny właściciel i atomowa wersja.
 -- Bez INSERT/DELETE i bez możliwości wyboru innego user_id.
 UPDATE public.ta_accounting_lab_workspaces
 SET state=next_state, version=expected_version+1
 WHERE id=workspace_id AND user_id=caller_id AND version=expected_version
 RETURNING * INTO saved;
 IF saved.id IS NULL THEN
  RAISE EXCEPTION 'Konflikt wersji lub brak dostępu. Pobierz zapis z bazy; nie nadpisuj drugiego okna.'
   USING ERRCODE='40001';
 END IF;
 RETURN to_jsonb(saved);
END
$function$;

REVOKE ALL ON FUNCTION ta_accounting_internal.lab_save_authorized(uuid,integer,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION ta_accounting_internal.lab_save_authorized(uuid,integer,jsonb) TO authenticated, service_role;

-- Zachowujemy publiczny kontrakt oraz SECURITY INVOKER;
-- prywatny helper wykonuje kontrolowany zapis.
CREATE OR REPLACE FUNCTION public.ta_accounting_lab_save(
 workspace_id uuid, expected_version integer, next_state jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path TO ''
AS $function$
BEGIN
 RETURN ta_accounting_internal.lab_save_authorized(workspace_id,expected_version,next_state);
END
$function$;

REVOKE EXECUTE ON FUNCTION public.ta_accounting_lab_save(uuid,integer,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ta_accounting_lab_save(uuid,integer,jsonb) TO authenticated, service_role;
-- Pozostawiamy odczyt własnych danych oraz dotychczasowe INSERT(name).
REVOKE UPDATE (state,version) ON TABLE public.ta_accounting_lab_workspaces FROM authenticated;

DO $postcheck$
BEGIN
 IF has_column_privilege('authenticated','public.ta_accounting_lab_workspaces','state','UPDATE')
  OR has_column_privilege('authenticated','public.ta_accounting_lab_workspaces','version','UPDATE')
 THEN RAISE EXCEPTION 'Direct state/version UPDATE still granted'; END IF;
 IF NOT has_table_privilege('authenticated','public.ta_accounting_lab_workspaces','SELECT')
  OR NOT has_function_privilege('authenticated','public.ta_accounting_lab_save(uuid,integer,jsonb)','EXECUTE')
 THEN RAISE EXCEPTION 'Read/Save RPC contract broken'; END IF;
 IF has_function_privilege('anon','public.ta_accounting_lab_save(uuid,integer,jsonb)','EXECUTE')
 THEN RAISE EXCEPTION 'Anonymous execution permitted'; END IF;
 IF NOT (SELECT prosecdef FROM pg_proc
  WHERE oid='ta_accounting_internal.lab_save_authorized(uuid,integer,jsonb)'::regprocedure)
 THEN RAISE EXCEPTION 'Internal helper is not SECURITY DEFINER'; END IF;
 IF (SELECT prosecdef FROM pg_proc
  WHERE oid='public.ta_accounting_lab_save(uuid,integer,jsonb)'::regprocedure)
 THEN RAISE EXCEPTION 'Exposed wrapper must be SECURITY INVOKER'; END IF;
 IF NOT EXISTS (SELECT 1 FROM ta_accounting_internal.build_leases
    WHERE lease_key='encyclopedia-builder'
      AND owner_run='16167610-0b30-4368-8295-129f196739df'::uuid
      AND leased_until>now())
 THEN RAISE EXCEPTION 'Lost lease during migration'; END IF;
END
$postcheck$;
