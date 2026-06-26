-- Bristol Care Dashboard - Production Supabase Verification (07)
-- Read-only: list all Supabase Storage buckets.
-- Run individually in Supabase Dashboard > SQL Editor.
-- Output: id, name, public, file_size_limit, allowed_mime_types.
-- Do not share output with business rows, secrets, JWT or keys.

SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
ORDER BY id;
