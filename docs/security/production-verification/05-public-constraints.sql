-- Bristol Care Dashboard - Production Supabase Verification (05)
-- Read-only: list constraints on key business tables.
-- Run individually in Supabase Dashboard > SQL Editor.
-- Output: table_schema, table_name, constraint_name, constraint_type, constraint_def.
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
  tc.table_schema,
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  pg_get_constraintdef(pgc.oid) AS constraint_def
FROM information_schema.table_constraints tc
JOIN business_tables bt ON bt.table_name = tc.table_name
LEFT JOIN pg_constraint pgc
  ON pgc.connamespace = (SELECT oid FROM pg_namespace WHERE nspname = tc.table_schema)
 AND pgc.conname = tc.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;
