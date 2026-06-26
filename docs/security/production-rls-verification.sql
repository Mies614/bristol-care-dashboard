-- Bristol Care Dashboard — Production Supabase Verification
-- Read-only structure audit for Security Phase S2.1.
-- Run in Supabase Dashboard SQL Editor.
-- Share only structure/policy output. Do not share rows from user tables or secrets.

-- 1. Public table RLS status.
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

-- 2. Public table policies.
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
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Business table columns needed for schema drift review.
WITH business_tables(table_name) AS (
  VALUES
    ('couple_spaces'),
    ('settings'),
    ('courses'),
    ('deadlines'),
    ('quick_links'),
    ('love_notes'),
    ('album_items'),
    ('miss_you_events'),
    ('miss_you_seen_state'),
    ('period_records'),
    ('push_subscriptions'),
    ('reminder_preferences'),
    ('reminder_delivery_log'),
    ('reminder_run_logs'),
    ('user_identities'),
    ('content_interactions'),
    ('content_comments'),
    ('content_reads'),
    ('space_locations')
)
SELECT
  c.table_schema,
  c.table_name,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default
FROM information_schema.columns c
JOIN business_tables bt ON bt.table_name = c.table_name
WHERE c.table_schema = 'public'
ORDER BY c.table_name, c.ordinal_position;

-- 4. Constraints for uniqueness, primary keys, checks and foreign keys.
WITH business_tables(table_name) AS (
  VALUES
    ('couple_spaces'),
    ('settings'),
    ('courses'),
    ('deadlines'),
    ('quick_links'),
    ('love_notes'),
    ('album_items'),
    ('miss_you_events'),
    ('miss_you_seen_state'),
    ('period_records'),
    ('push_subscriptions'),
    ('reminder_preferences'),
    ('reminder_delivery_log'),
    ('reminder_run_logs'),
    ('user_identities'),
    ('content_interactions'),
    ('content_comments'),
    ('content_reads'),
    ('space_locations')
)
SELECT
  tc.table_schema,
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_schema = tc.constraint_schema
 AND kcu.constraint_name = tc.constraint_name
 AND kcu.table_schema = tc.table_schema
 AND kcu.table_name = tc.table_name
LEFT JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_schema = tc.constraint_schema
 AND ccu.constraint_name = tc.constraint_name
JOIN business_tables bt ON bt.table_name = tc.table_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position;

-- 5. Index definitions for partition and policy planning.
WITH business_tables(table_name) AS (
  VALUES
    ('couple_spaces'),
    ('settings'),
    ('courses'),
    ('deadlines'),
    ('quick_links'),
    ('love_notes'),
    ('album_items'),
    ('miss_you_events'),
    ('miss_you_seen_state'),
    ('period_records'),
    ('push_subscriptions'),
    ('reminder_preferences'),
    ('reminder_delivery_log'),
    ('reminder_run_logs'),
    ('user_identities'),
    ('content_interactions'),
    ('content_comments'),
    ('content_reads'),
    ('space_locations')
)
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (SELECT table_name FROM business_tables)
ORDER BY tablename, indexname;

-- 6. Data API grants for anon/authenticated exposure review.
WITH business_tables(table_name) AS (
  VALUES
    ('couple_spaces'),
    ('settings'),
    ('courses'),
    ('deadlines'),
    ('quick_links'),
    ('love_notes'),
    ('album_items'),
    ('miss_you_events'),
    ('miss_you_seen_state'),
    ('period_records'),
    ('push_subscriptions'),
    ('reminder_preferences'),
    ('reminder_delivery_log'),
    ('reminder_run_logs'),
    ('user_identities'),
    ('content_interactions'),
    ('content_comments'),
    ('content_reads'),
    ('space_locations')
)
SELECT
  grantee,
  table_schema,
  table_name,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (SELECT table_name FROM business_tables)
  AND grantee IN ('anon', 'authenticated')
ORDER BY table_name, grantee, privilege_type;

-- 7. Storage bucket configuration.
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
ORDER BY id;

-- 8. Storage object policies.
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

-- 9. Storage object grants for anon/authenticated exposure review.
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
