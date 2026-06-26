-- Bristol Care Dashboard - Production Supabase Verification (06)
-- Read-only: list Data API grants for anon/authenticated on business tables.
-- Run individually in Supabase Dashboard > SQL Editor.
-- Output: grantee, table_schema, table_name, privilege_type, is_grantable.
-- Do not share output with business rows, secrets, JWT or keys.

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
