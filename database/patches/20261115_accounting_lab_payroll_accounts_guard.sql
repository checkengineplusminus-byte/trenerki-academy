-- TRENERKI core-v3 | 2026-11-15 | migracja jednorazowa, dane testowe
-- Usterka potwierdzona SQL: klient pokazuje 220/229/231/234/404,
-- a prywatny walidator lab_validate odrzucal je jako nieznane konto.
-- Zachowaj funkcje, RLS, konta, inne rekordy i wszystkie stare zapisy.
DO $patch$
DECLARE
  v_definition text;
  v_old text := 'not in(''010'',''071'',''100'',''130'',''201'',''202'',''221'',''222'',''300'',''400'',''401'',''700'',''761'',''800'')';
  v_new text := 'not in(''010'',''071'',''100'',''130'',''201'',''202'',''220'',''221'',''222'',''229'',''231'',''234'',''300'',''400'',''401'',''404'',''700'',''761'',''800'')';
  v_fixture jsonb := '{"schema_version":1,"invoices":[],"bank":[],"journals":[{"id":"PAYTEST","status":"posted","date":"2026-01-31","memo":"Fikcyjna lista plac","source_type":"manual","source_id":"","lines":[{"account":"404","debit":100000,"credit":0},{"account":"231","debit":0,"credit":70000},{"account":"229","debit":0,"credit":20000},{"account":"220","debit":0,"credit":9000},{"account":"234","debit":0,"credit":1000}]}],"matches":[]}'::jsonb;
  v_updated text;
BEGIN
  PERFORM 1 FROM ta_accounting_internal.build_leases
    WHERE lease_key='encyclopedia-builder'
      AND owner_run='550d5739-8be5-4ed0-8c7a-2f6f9de774f5'::uuid AND leased_until>now()
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Brak aktywnej wlasnej blokady; zapis wstrzymany';
  END IF;
  SELECT pg_get_functiondef('ta_accounting_internal.lab_validate(jsonb,jsonb)'::regprocedure)
    INTO v_definition;
  IF v_definition IS NULL OR strpos(v_definition,v_old)=0
     OR length(v_definition)-length(replace(v_definition,v_old,''))<>length(v_old)
  THEN
    RAISE EXCEPTION 'Nieznana wersja walidatora; brak zmian';
  END IF;
  EXECUTE replace(v_definition,v_old,v_new);
  SELECT pg_get_functiondef('ta_accounting_internal.lab_validate(jsonb,jsonb)'::regprocedure)
    INTO v_updated;
  IF strpos(v_updated,v_new)=0 OR
     (ta_accounting_internal.lab_validate(v_fixture,NULL)->'journals'->0->>'id') <> 'PAYTEST'
  THEN
    RAISE EXCEPTION 'Weryfikacja dekretu placy nieudana; rollback';
  END IF;
END
$patch$;
-- To nie jest naliczanie ustawowych stawek ZUS/PIT ani zaliczenie E2E.
