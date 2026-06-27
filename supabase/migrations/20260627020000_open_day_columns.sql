-- Add open-day tournament columns to playoff_signups and match_results
-- These columns support the Open Day tournament flow (4 public pages).

-- ── playoff_signups ────────────────────────────────────────────────────
ALTER TABLE playoff_signups
  ADD COLUMN IF NOT EXISTS tournament_id text;

-- Allow anon SELECT on playoff_signups (so /bracket can read signups)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'playoff_signups' AND policyname = 'anon select playoff_signups'
  ) THEN
    CREATE POLICY "anon select playoff_signups" ON playoff_signups
      FOR SELECT USING (true);
  END IF;
END $$;

-- ── match_results ──────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_results' AND column_name = 'player_1') THEN
    ALTER TABLE match_results ADD COLUMN player_1 text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_results' AND column_name = 'player_2') THEN
    ALTER TABLE match_results ADD COLUMN player_2 text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_results' AND column_name = 'round') THEN
    ALTER TABLE match_results ADD COLUMN round integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_results' AND column_name = 'status') THEN
    ALTER TABLE match_results ADD COLUMN status text NOT NULL DEFAULT 'scheduled';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_results' AND column_name = 'winner') THEN
    ALTER TABLE match_results ADD COLUMN winner text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_results' AND column_name = 'tournament_id') THEN
    ALTER TABLE match_results ADD COLUMN tournament_id text;
  END IF;
END $$;

-- Policies for match_results
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'match_results' AND policyname = 'anon select match_results'
  ) THEN
    CREATE POLICY "anon select match_results" ON match_results FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'match_results' AND policyname = 'anon insert match_results'
  ) THEN
    CREATE POLICY "anon insert match_results" ON match_results FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'match_results' AND policyname = 'anon update match_results'
  ) THEN
    CREATE POLICY "anon update match_results" ON match_results FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;
