
-- Lock down survey tables: remove the always-true anon INSERT policies.
-- Inserts go through server functions using the service role key, which bypasses RLS,
-- so anon does not need INSERT access.
DROP POLICY IF EXISTS "anon insert only" ON public.staff_survey_responses;
DROP POLICY IF EXISTS "anon insert only" ON public.student_survey_responses;

-- Revoke broad table grants so anon/authenticated cannot touch survey data through PostgREST.
-- Only service_role (used by server functions) retains access.
REVOKE ALL ON public.staff_survey_responses FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.student_survey_responses FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.tournament_rosters FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.staff_survey_responses TO service_role;
GRANT ALL ON public.student_survey_responses TO service_role;
GRANT ALL ON public.tournament_rosters TO service_role;

-- Storage: restrict writes on the assets bucket to service_role only.
-- Public read of assets remains for displaying images on the site.
DROP POLICY IF EXISTS "service role upload" ON storage.objects;
DROP POLICY IF EXISTS "service role delete" ON storage.objects;
DROP POLICY IF EXISTS "service role update assets" ON storage.objects;

CREATE POLICY "service role insert assets"
  ON storage.objects FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'assets');

CREATE POLICY "service role update assets"
  ON storage.objects FOR UPDATE TO service_role
  USING (bucket_id = 'assets')
  WITH CHECK (bucket_id = 'assets');

CREATE POLICY "service role delete assets"
  ON storage.objects FOR DELETE TO service_role
  USING (bucket_id = 'assets');
