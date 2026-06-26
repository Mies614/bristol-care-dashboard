-- Bristol Care Dashboard - Production Supabase Verification (04)
-- Read-only: list indexes on key business tables for partition and policy planning.
-- Run individually in Supabase Dashboard > SQL Editor.
-- Output: schemaname, tablename, indexname, indexdef.
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
  i.schemaname,
  i.tablename,
  i.indexname,
  i.indexdef
FROM pg_indexes i
JOIN business_tables bt ON bt.table_name = i.tablename
WHERE i.schemaname = 'public'
ORDER BY i.tablename, i.indexname;
