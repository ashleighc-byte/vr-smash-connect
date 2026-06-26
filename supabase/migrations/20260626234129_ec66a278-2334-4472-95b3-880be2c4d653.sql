CREATE TABLE public.playoff_school_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school text NOT NULL UNIQUE,
  signups_open boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.playoff_school_settings TO anon;
GRANT SELECT ON public.playoff_school_settings TO authenticated;
GRANT ALL ON public.playoff_school_settings TO service_role;

ALTER TABLE public.playoff_school_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read school settings"
  ON public.playoff_school_settings FOR SELECT
  USING (true);