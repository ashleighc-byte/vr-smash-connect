-- Add karawhiua_user_id field to playoff_signups for house-points linking.
-- Nullable — students can opt out or fill it in later via their profile.

ALTER TABLE playoff_signups
  ADD COLUMN IF NOT EXISTS karawhiua_user_id text;

-- Allow anon INSERT on the new column (the existing anon-insert policy covers the table)
