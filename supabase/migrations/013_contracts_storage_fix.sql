-- Fix contracts storage bucket RLS — allow authenticated users to upload

-- Drop existing restrictive policies if any
DROP POLICY IF EXISTS "Authenticated users can upload contract templates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view their contracts" ON storage.objects;
DROP POLICY IF EXISTS "Public can view signed contracts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their contracts" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload signed contracts" ON storage.objects;

-- Simple open policies for contracts bucket
CREATE POLICY "Allow authenticated uploads to contracts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contracts');

CREATE POLICY "Allow authenticated reads from contracts"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'contracts');

CREATE POLICY "Allow public reads from contracts"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'contracts');

CREATE POLICY "Allow authenticated deletes from contracts"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'contracts');

CREATE POLICY "Allow anon uploads to contracts"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'contracts');
