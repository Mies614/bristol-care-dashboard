-- Bristol Care Dashboard — S3 Authenticated RLS Status
-- Read-only: verify RLS is enabled and authenticated policies exist.

-- 1. RLS status on business tables
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'album_items', 'courses', 'deadlines', 'love_notes',
    'miss_you_events', 'miss_you_seen_state', 'period_records',
    'push_subscriptions', 'quick_links', 'settings',
    'content_comments', 'content_interactions', 'content_reads',
    'user_identities', 'couple_spaces', 'space_members'
  )
ORDER BY c.relname;

-- 2. Policies referencing auth.uid()
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  -- Show whether policy uses auth.uid()
  (qual ILIKE '%auth.uid()%' OR with_check ILIKE '%auth.uid()%') AS uses_auth_uid
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('album_items', 'content_comments', 'love_notes', 'space_members')
ORDER BY tablename, policyname;
