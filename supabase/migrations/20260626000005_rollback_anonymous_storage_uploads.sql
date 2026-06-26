-- Bristol Care Dashboard — S2.2 Storage Hotfix ROLLBACK
-- Re-enables anonymous INSERT policies on Storage buckets.
-- WARNING: This re-introduces the risk of anonymous upload to all three buckets.
--   - Anyone with the anon key can upload arbitrary files
--   - Bucket-level MIME/size restrictions are the only gate
-- Only run if the signed-upload code is being rolled back.

-- Restore anonymous INSERT policies using the most-permissive pattern
-- matching the production-verified policy shape (bucket_id = 'bucket-name')

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'anon_can_upload_backgrounds'
  ) THEN
    CREATE POLICY "anon_can_upload_backgrounds" ON storage.objects
      FOR INSERT TO anon
      WITH CHECK (bucket_id = 'backgrounds');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'anon_can_upload_albums'
  ) THEN
    CREATE POLICY "anon_can_upload_albums" ON storage.objects
      FOR INSERT TO anon
      WITH CHECK (bucket_id = 'couple-albums');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'anon_can_upload_notes'
  ) THEN
    CREATE POLICY "anon_can_upload_notes" ON storage.objects
      FOR INSERT TO anon
      WITH CHECK (bucket_id = 'love-notes');
  END IF;
END $$;

-- Verification
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;
