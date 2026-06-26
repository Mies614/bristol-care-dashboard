-- Bristol Care Dashboard — S3 RLS Rollback
-- Remove all authenticated RLS policies.
-- Restores S2.3 state: all business table access goes through
-- service-role API layer. Does NOT recreate permissive or anonymous policies.
-- WARNING: After rollback, tables have NO policies — accessible only via
-- service role API (server-only). Browser-anon-key access will be denied
-- by Supabase Data API when no policy matches.
-- Table structure and data are NOT modified.

DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    AND tablename IN (
      'album_items', 'courses', 'deadlines', 'love_notes',
      'miss_you_events', 'miss_you_seen_state', 'period_records',
      'push_subscriptions', 'quick_links', 'settings',
      'content_comments', 'content_interactions', 'content_reads',
      'user_identities', 'couple_spaces', 'space_members'
    )
  LOOP
    -- Drop all known authenticated policy names
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated access" ON %I', tbl.tablename);
    EXECUTE format('DROP POLICY IF EXISTS "Members can read settings" ON %I', tbl.tablename);
    EXECUTE format('DROP POLICY IF EXISTS "Owner can insert settings" ON %I', tbl.tablename);
    EXECUTE format('DROP POLICY IF EXISTS "Owner can update settings" ON %I', tbl.tablename);
    EXECUTE format('DROP POLICY IF EXISTS "Owner can delete settings" ON %I', tbl.tablename);
    EXECUTE format('DROP POLICY IF EXISTS "Owner settings write" ON %I', tbl.tablename);
    EXECUTE format('DROP POLICY IF EXISTS "Owner settings update" ON %I', tbl.tablename);
    EXECUTE format('DROP POLICY IF EXISTS "Users can read own membership" ON %I', tbl.tablename);
  END LOOP;
END $$;

-- Post-check: verify no authenticated policies remain on business tables
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('album_items', 'settings', 'love_notes', 'content_comments', 'space_members')
ORDER BY tablename, policyname;

-- Expected: no rows returned (all authenticated policies dropped)
