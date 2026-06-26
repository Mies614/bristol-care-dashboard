-- Bristol Care Dashboard — S2.2 Storage Hotfix
-- Remove anonymous INSERT policies on public Storage buckets.
-- Deploy AFTER signed-upload code (lib/signedUpload.ts + /api/upload/authorize)
-- has been deployed and verified in production.
-- Idempotent: uses IF EXISTS.
-- Does NOT delete existing objects. Does NOT change bucket to private.

-- 1. backgrounds: remove anon INSERT
DROP POLICY IF EXISTS "anon can upload backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon upload to backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Give anon access to backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "anon_can_upload_backgrounds" ON storage.objects;

-- 2. couple-albums: remove anon INSERT
DROP POLICY IF EXISTS "anon can upload albums" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon upload to couple-albums" ON storage.objects;
DROP POLICY IF EXISTS "Give anon access to couple-albums" ON storage.objects;
DROP POLICY IF EXISTS "anon_can_upload_albums" ON storage.objects;

-- 3. love-notes: remove anon INSERT
DROP POLICY IF EXISTS "anon can upload notes" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon upload to love-notes" ON storage.objects;
DROP POLICY IF EXISTS "Give anon access to love-notes" ON storage.objects;
DROP POLICY IF EXISTS "anon_can_upload_notes" ON storage.objects;

-- Verification: list remaining policies on storage.objects
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;
