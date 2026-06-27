ALTER TABLE public.match_results
  ADD COLUMN IF NOT EXISTS tournament_id text,
  ADD COLUMN IF NOT EXISTS round_number integer,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS winner text;

CREATE INDEX IF NOT EXISTS match_results_tournament_id_idx
  ON public.match_results (tournament_id);