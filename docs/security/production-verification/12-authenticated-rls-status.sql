-- Bristol Care Dashboard — S3 Authenticated RLS Status
-- Read-only: automated PASS/FAIL checks for RLS policy correctness.

-- Check 1: No FOR ALL policies on settings
SELECT
  'Check 1: No FOR ALL on settings' AS check_name,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result,
  COUNT(*)::TEXT AS detail
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'settings' AND cmd = 'ALL';

-- Check 2: No policy named "Authenticated access" on settings
SELECT
  'Check 2: No "Authenticated access" on settings' AS check_name,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result,
  COUNT(*)::TEXT AS detail
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'settings' AND policyname = 'Authenticated access';

-- Check 3: Settings has at least 4 policies (SELECT, INSERT, UPDATE, DELETE)
SELECT
  'Check 3: Settings has 4+ policies' AS check_name,
  CASE WHEN COUNT(*) >= 4 THEN 'PASS' ELSE 'FAIL' END AS result,
  COUNT(*)::TEXT AS detail
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'settings';

-- Check 4: Settings has member SELECT policy
SELECT
  'Check 4: Member SELECT on settings' AS check_name,
  CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END AS result,
  COUNT(*)::TEXT AS detail
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'settings'
  AND cmd = 'SELECT' AND qual ILIKE '%auth.uid()%';

-- Check 5: Settings owner INSERT has WITH CHECK
SELECT
  'Check 5: Owner INSERT WITH CHECK on settings' AS check_name,
  CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END AS result,
  COUNT(*)::TEXT AS detail
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'settings'
  AND cmd = 'INSERT' AND with_check ILIKE '%role%owner%';

-- Check 6: Settings owner UPDATE has both USING and WITH CHECK
SELECT
  'Check 6: Owner UPDATE USING+WITH CHECK on settings' AS check_name,
  CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END AS result,
  COUNT(*)::TEXT AS detail
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'settings'
  AND cmd = 'UPDATE'
  AND qual ILIKE '%role%owner%'
  AND with_check ILIKE '%role%owner%';

-- Check 7: Settings owner DELETE has USING
SELECT
  'Check 7: Owner DELETE USING on settings' AS check_name,
  CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END AS result,
  COUNT(*)::TEXT AS detail
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'settings'
  AND cmd = 'DELETE' AND qual ILIKE '%role%owner%';

-- Check 8: Settings policies use TO authenticated
SELECT
  'Check 8: Settings policies TO authenticated' AS check_name,
  CASE WHEN COUNT(*) = 0 THEN 'PASS'
       WHEN COUNT(*) FILTER (WHERE roles = '{authenticated}') = COUNT(*) THEN 'PASS'
       ELSE 'FAIL'
  END AS result,
  COUNT(*)::TEXT || ' policies; ' ||
  COUNT(*) FILTER (WHERE roles = '{authenticated}')::TEXT || ' authenticated' AS detail
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'settings';

-- Check 9: No anon write policies on any business table
SELECT
  'Check 9: No anon write on business tables' AS check_name,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result,
  COUNT(*)::TEXT AS detail
FROM pg_policies
WHERE schemaname = 'public' AND roles = '{anon}'
  AND cmd IN ('INSERT', 'UPDATE', 'DELETE');

-- Check 10: No USING/CHECK with literal true on business tables
SELECT
  'Check 10: No USING/CHECK true on business tables' AS check_name,
  CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result,
  COUNT(*)::TEXT AS detail
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'album_items', 'courses', 'deadlines', 'love_notes',
    'miss_you_events', 'miss_you_seen_state', 'period_records',
    'push_subscriptions', 'quick_links', 'settings',
    'content_comments', 'content_interactions', 'content_reads',
    'user_identities', 'couple_spaces', 'space_members'
  )
  AND (
    qual = 'true' OR qual = '(true)'
    OR with_check = 'true' OR with_check = '(true)'
  );

-- Overview: all policies on settings
SELECT
  'Overview: Settings policies' AS section,
  policyname,
  cmd,
  roles,
  CASE WHEN qual ILIKE '%owner%' THEN 'owner-only' ELSE 'member' END AS access_level
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'settings'
ORDER BY cmd;
