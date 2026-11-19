-- Additional entitlement check: private worksheets belong to the paid accounting programme.
-- Existing owner-only RLS remains mandatory. Editor/admin preview uses the existing reviewed can_read guard.
drop policy if exists accounting_official_select_own on public.ta_accounting_official_drafts;
create policy accounting_official_select_own on public.ta_accounting_official_drafts
 for select to authenticated using (
  user_id=(select auth.uid()) and (select ta_accounting_internal.can_read())
 );
drop policy if exists accounting_official_insert_own on public.ta_accounting_official_drafts;
create policy accounting_official_insert_own on public.ta_accounting_official_drafts
 for insert to authenticated with check (
  user_id=(select auth.uid()) and (select ta_accounting_internal.can_read())
 );
drop policy if exists accounting_official_update_own on public.ta_accounting_official_drafts;
create policy accounting_official_update_own on public.ta_accounting_official_drafts
 for update to authenticated using (
  user_id=(select auth.uid()) and (select ta_accounting_internal.can_read())
 ) with check (
  user_id=(select auth.uid()) and (select ta_accounting_internal.can_read())
 );
