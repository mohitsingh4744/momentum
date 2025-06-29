-- Create storage buckets for the application
-- Note: Storage buckets are created via the Supabase dashboard or CLI
-- This migration documents the required buckets

-- Bucket for weekly reports and other user-generated PDFs
-- Run: supabase storage create reports
-- Or create via dashboard: Storage > New bucket > "reports"

-- Bucket for user avatars and profile images  
-- Run: supabase storage create avatars
-- Or create via dashboard: Storage > New bucket > "avatars"

-- Set up RLS policies for the reports bucket
-- This will be done when the bucket is created via the dashboard
-- or we can add policies here if needed

-- Example RLS policy for reports bucket (run after bucket creation):
-- CREATE POLICY "Users can view their own reports" ON storage.objects
--   FOR SELECT USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can upload their own reports" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can update their own reports" ON storage.objects
--   FOR UPDATE USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete their own reports" ON storage.objects
--   FOR DELETE USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]); 