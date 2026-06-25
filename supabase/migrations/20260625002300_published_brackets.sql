-- Published brackets: stores the final bracket state for public viewing
CREATE TABLE IF NOT EXISTS published_brackets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school text UNIQUE NOT NULL,
  bracket_data jsonb NOT NULL,
  published_at timestamptz DEFAULT now(),
  is_live boolean DEFAULT true
);

ALTER TABLE published_brackets ENABLE ROW LEVEL SECURITY;

-- Public can read published brackets (read-only view)
CREATE POLICY "public read" ON published_brackets
  FOR SELECT USING (true);

-- Only service role can write
CREATE POLICY "service role write" ON published_brackets
  FOR ALL USING (auth.role() = 'service_role');
