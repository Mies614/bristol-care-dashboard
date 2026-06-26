-- Bristol Care Dashboard - Production Supabase Verification (01)
-- Read-only: list all public tables with their RLS status.
-- Run individually in Supabase Dashboard > SQL Editor.
-- Output: schema_name, table_name, rls_enabled, rls_forced.
-- Do not share output with business rows, secrets, JWT or keys.

SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;
