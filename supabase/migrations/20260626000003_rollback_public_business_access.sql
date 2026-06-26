-- Bristol Care Dashboard — S2.2 Production DB Hotfix ROLLBACK
-- Re-enables public CRUD policies on business tables.
-- WARNING: This re-introduces the known public-access exposure.
--   - Anyone with the anon key can read/write business table data
--   - identity can be freely specified
--   - space_code is not enforced on reads
-- Only run this if the code deployment is being rolled back.

-- 1. content_comments: restore public CRUD
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'content_comments' AND policyname = 'Enable all access for authenticated users'
  ) THEN
    CREATE POLICY "Enable all access for authenticated users" ON content_comments
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2. content_interactions: restore public CRUD
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'content_interactions' AND policyname = 'Enable all access for authenticated users'
  ) THEN
    CREATE POLICY "Enable all access for authenticated users" ON content_interactions
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3. user_identities: restore public CRUD
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_identities' AND policyname = 'Enable all access for authenticated users'
  ) THEN
    CREATE POLICY "Enable all access for authenticated users" ON user_identities
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 4. couple_spaces: restore anon SELECT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'couple_spaces' AND policyname = 'anon can select couple_spaces'
  ) THEN
    CREATE POLICY "anon can select couple_spaces" ON couple_spaces
      FOR SELECT TO anon USING (true);
  END IF;
END $$;

-- 5. love_notes: restore anon SELECT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'love_notes' AND policyname = 'anon can select active notes'
  ) THEN
    CREATE POLICY "anon can select active notes" ON love_notes
      FOR SELECT TO anon
      USING (active = true AND visible_from <= now() AND deleted_at IS NULL);
  END IF;
END $$;

-- Verification
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'content_comments', 'content_interactions', 'user_identities',
    'couple_spaces', 'love_notes'
  )
ORDER BY tablename, policyname;
