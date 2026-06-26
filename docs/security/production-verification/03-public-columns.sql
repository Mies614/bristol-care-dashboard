-- Bristol Care Dashboard - Production Supabase Verification (03)
-- Read-only: list columns of key business tables for schema drift review.
-- Run individually in Supabase Dashboard > SQL Editor.
-- Output: table_schema, table_name, column_name, data_type, is_nullable, column_default, ordinal_position.
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
  c.table_schema,
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default,
  c.ordinal_position
FROM information_schema.columns c
JOIN business_tables bt ON bt.table_name = c.table_name
WHERE c.table_schema = 'public'
ORDER BY c.table_name, c.ordinal_position;
