-- Add round-robin columns to match_results
-- Enables a single player-vs-player tournament mode with win/loss tracking.

ALTER TABLE match_results
  ADD COLUMN IF NOT EXISTS round_number integer,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS winner text,
  ADD COLUMN IF NOT EXISTS tournament_id text;

-- Allow anon SELECT on match_results (readable by everyone for the live screen)
-- and anon UPDATE (for result entry — no login required).
-- Only the winner + status fields can be mutated by the public; the
-- generate-round-robin endpoint uses the service-role key.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'match_results' AND policyname = 'anon select match_results'
  ) THEN
    CREATE POLICY "anon select match_results" ON match_results FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'match_results' AND policyname = 'anon update match_results'
  ) THEN
    CREATE POLICY "anon update match_results" ON match_results FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;
