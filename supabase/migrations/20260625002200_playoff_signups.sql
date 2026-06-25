-- Playoff sign-up table: public-facing registration for school bracket tournament
CREATE TABLE IF NOT EXISTS playoff_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  school text NOT NULL,
  student_name text NOT NULL,
  year_group text,
  house text,
  played_before text,
  status text DEFAULT 'pending'
);
-- status values: pending, confirmed, reserve, withdrawn, closed

ALTER TABLE playoff_signups ENABLE ROW LEVEL SECURITY;

-- Anyone can sign up (public form)
CREATE POLICY "anon insert" ON playoff_signups
  FOR INSERT WITH CHECK (true);

-- Only service role can read
CREATE POLICY "service role read" ON playoff_signups
  FOR SELECT USING (auth.role() = 'service_role');

-- Only service role can update
CREATE POLICY "service role update" ON playoff_signups
  FOR UPDATE USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Unique per school+student to prevent duplicate signups
CREATE UNIQUE INDEX IF NOT EXISTS idx_playoff_signups_school_name ON playoff_signups (school, student_name);

-- Per-school sign-up closure state
CREATE TABLE IF NOT EXISTS playoff_school_settings (
  school text PRIMARY KEY,
  signups_open boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE playoff_school_settings ENABLE ROW LEVEL SECURITY;

-- Public can read sign-up open/closed status
CREATE POLICY "anon read school settings" ON playoff_school_settings
  FOR SELECT USING (true);

-- Only service role can update school settings
CREATE POLICY "service role write school settings" ON playoff_school_settings
  FOR ALL USING (auth.role() = 'service_role');
