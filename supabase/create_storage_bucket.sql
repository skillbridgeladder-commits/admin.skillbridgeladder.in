-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'applications', 'applications', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'applications'
);

-- Policy to allow public access to the files (to view them in admin dashboard)
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'applications');

-- Policy to allow authenticated users to upload files
CREATE POLICY "Allow Authenticated Uploads" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'applications' AND auth.role() = 'authenticated'
);

-- Policy to allow users to delete their own files
CREATE POLICY "Allow Individual Delete" ON storage.objects FOR DELETE USING (
    bucket_id = 'applications' AND auth.uid() = owner
);
