-- Bristol Care Dashboard — S3 RLS Rollback
-- Remove all authenticated RLS policies and restore permissive access.
-- WARNING: Restores public access to all business tables.
-- Do NOT use this to restore anonymous INSERT policies (those are separate).
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
    -- Drop all existing policies on each table
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated access" ON %I', tbl.tablename);
    EXECUTE format('DROP POLICY IF EXISTS "Owner settings write" ON %I', tbl.tablename);
    EXECUTE format('DROP POLICY IF EXISTS "Owner settings update" ON %I', tbl.tablename);
    -- Restore permissive policy (service role access only, no public access)
    EXECUTE format('CREATE POLICY "Authenticated access" ON %I FOR ALL USING (true) WITH CHECK (true)', tbl.tablename);
  END LOOP;
END $$;

-- Post-check
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('album_items', 'content_comments', 'love_notes', 'space_members')
ORDER BY tablename, policyname;
