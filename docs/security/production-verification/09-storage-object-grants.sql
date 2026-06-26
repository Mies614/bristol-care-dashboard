-- Bristol Care Dashboard - Production Supabase Verification (09)
-- Read-only: list storage.objects grants for anon/authenticated.
-- Run individually in Supabase Dashboard > SQL Editor.
-- Output: grantee, table_schema, table_name, privilege_type, is_grantable.
-- Do not share output with business rows, secrets, JWT or keys.

SELECT
  grantee,
  table_schema,
  table_name,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'storage'
  AND table_name = 'objects'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;
