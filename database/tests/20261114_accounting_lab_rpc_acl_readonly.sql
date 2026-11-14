-- READ-ONLY tests. No user impersonation, no personal-data reads.
-- They prove privilege metadata, NOT authenticated E2E or dual-account isolation.
SELECT
  NOT has_column_privilege('authenticated','public.ta_accounting_lab_workspaces','state','UPDATE')
    AS direct_state_update_denied,
  NOT has_column_privilege('authenticated','public.ta_accounting_lab_workspaces','version','UPDATE')
    AS direct_version_update_denied,
  has_table_privilege('authenticated','public.ta_accounting_lab_workspaces','SELECT')
    AS own_workspace_select_grant_preserved,
  has_function_privilege('authenticated','public.ta_accounting_lab_save(uuid,integer,jsonb)','EXECUTE')
    AS rpc_execute_granted,
  NOT has_function_privilege('anon','public.ta_accounting_lab_save(uuid,integer,jsonb)','EXECUTE')
    AS anon_rpc_execute_denied,
  (SELECT prosecdef FROM pg_proc WHERE oid='ta_accounting_internal.lab_save_authorized(uuid,integer,jsonb)'::regprocedure)
    AS private_helper_definer,
  NOT (SELECT prosecdef FROM pg_proc WHERE oid='public.ta_accounting_lab_save(uuid,integer,jsonb)'::regprocedure)
    AS public_wrapper_invoker,
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.ta_accounting_lab_workspaces'::regclass)
    AS rls_remains_enabled;
-- Real positive and negative authenticated RPC calls, stale-write conflicts,
-- direct REST UPDATE, isolation of two genuine test accounts: NOT_TESTED.
