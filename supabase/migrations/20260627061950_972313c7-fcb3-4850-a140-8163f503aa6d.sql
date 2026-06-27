-- Allow client-side admin reset/regenerate flows on bracket page to actually delete rows.
-- Matches existing anon INSERT/UPDATE policy posture on these open-day tables.

CREATE POLICY "anon delete playoff_signups" ON public.playoff_signups
  FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "anon delete match_results" ON public.match_results
  FOR DELETE TO anon, authenticated USING (true);

GRANT DELETE ON public.playoff_signups TO anon, authenticated;
GRANT DELETE ON public.match_results TO anon, authenticated;