-- Bristol Care Dashboard - Production Supabase Verification (08)
-- Read-only: list all RLS policies on storage.objects.
-- Run individually in Supabase Dashboard > SQL Editor.
-- Output: schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check.
-- Do not share output with business rows, secrets, JWT or keys.

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;
