-- Protected, per-user practical homework. This does NOT replace official exam scores.
CREATE TABLE IF NOT EXISTS public.ta_autocad_homework (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 lesson_no smallint NOT NULL CHECK (lesson_no BETWEEN 0 AND 29),
 note text NOT NULL DEFAULT '' CHECK (char_length(note)<=4000),
 steps_done jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(steps_done)='array'),
 completed boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, lesson_no)
);
ALTER TABLE public.ta_autocad_homework ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ta_autocad_homework FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ta_autocad_homework TO authenticated;
DROP POLICY IF EXISTS ta_autocad_hw_select_own ON public.ta_autocad_homework;
DROP POLICY IF EXISTS ta_autocad_hw_insert_own ON public.ta_autocad_homework;
DROP POLICY IF EXISTS ta_autocad_hw_update_own ON public.ta_autocad_homework;
DROP POLICY IF EXISTS ta_autocad_hw_delete_own ON public.ta_autocad_homework;
CREATE POLICY ta_autocad_hw_select_own ON public.ta_autocad_homework
 FOR SELECT TO authenticated USING ((SELECT auth.uid())=user_id);
CREATE POLICY ta_autocad_hw_insert_own ON public.ta_autocad_homework
 FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY ta_autocad_hw_update_own ON public.ta_autocad_homework
 FOR UPDATE TO authenticated USING ((SELECT auth.uid())=user_id)
 WITH CHECK ((SELECT auth.uid())=user_id);
CREATE POLICY ta_autocad_hw_delete_own ON public.ta_autocad_homework
 FOR DELETE TO authenticated USING ((SELECT auth.uid())=user_id);
COMMENT ON TABLE public.ta_autocad_homework IS 'Private practical AutoCAD homework notes and self-checks. Not graded, not a certificate.';
