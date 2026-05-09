-- Storage bucket for contract PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for contracts bucket
-- Allow authenticated users to upload templates to their operator folder
CREATE POLICY "Authenticated users can upload contract templates" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contracts' AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM operators WHERE user_id = auth.uid()
  ));

-- Allow authenticated users to view their own contracts
CREATE POLICY "Authenticated users can view their contracts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'contracts' AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM operators WHERE user_id = auth.uid()
  ));

-- Allow public to view signed contracts (for download)
CREATE POLICY "Public can view signed contracts" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'contracts' AND (storage.foldername(name))[2] = 'signed');

-- Allow authenticated users to delete their contract files
CREATE POLICY "Authenticated users can delete their contracts" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'contracts' AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM operators WHERE user_id = auth.uid()
  ));

-- Allow public/anon to insert signed contracts (for signing page)
CREATE POLICY "Public can upload signed contracts" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'contracts' AND (storage.foldername(name))[2] = 'signed');
