-- Disable public listing on all storage buckets.
-- When public = true, anyone can list all objects in the bucket.
-- With public = false, only authenticated users / service_role can list,
-- while individual object URLs remain accessible if row-level policies allow.
-- Existing SELECT policies for public read of individual assets still apply.
UPDATE storage.buckets SET public = false WHERE public = true;

-- Ensure no anonymous bucket listing is allowed (belt and suspenders).
DROP POLICY IF EXISTS "anon list assets" ON storage.objects;

-- Allow authenticated (anon) SELECT on objects in the assets bucket for
-- direct URL access to continue working (e.g. favicon delivered via Supabase URL).
DROP POLICY IF EXISTS "public read assets" ON storage.objects;
CREATE POLICY "public read assets"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'assets');
