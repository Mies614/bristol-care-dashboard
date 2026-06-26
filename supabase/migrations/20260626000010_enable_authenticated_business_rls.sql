-- Bristol Care Dashboard — S3: Authenticated RLS Policies
-- Replace any remaining permissive policies with auth.uid()-based RLS.
-- All business table access requires authenticated membership via space_members.
-- Idempotent: uses DROP POLICY IF EXISTS before CREATE POLICY.

-- Helper: space_id tables access check via auth.uid() + space_members
-- Used by: album_items, courses, deadlines, love_notes, miss_you_events,
-- miss_you_seen_state, period_records, push_subscriptions, quick_links, settings

-- Helper: space_code tables access check via couple_spaces + space_members
-- Used by: content_comments, content_interactions, content_reads, user_identities

-- ============================================
-- 1. space_id tables — SELECT/INSERT/UPDATE/DELETE
-- ============================================

-- album_items
DROP POLICY IF EXISTS "Authenticated access" ON album_items;
CREATE POLICY "Authenticated access" ON album_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = album_items.space_id
        AND sm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = album_items.space_id
        AND sm.user_id = auth.uid()
    )
  );

-- love_notes
DROP POLICY IF EXISTS "Authenticated access" ON love_notes;
CREATE POLICY "Authenticated access" ON love_notes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = love_notes.space_id
        AND sm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = love_notes.space_id
        AND sm.user_id = auth.uid()
    )
  );

-- miss_you_events
DROP POLICY IF EXISTS "Authenticated access" ON miss_you_events;
CREATE POLICY "Authenticated access" ON miss_you_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = miss_you_events.space_id
        AND sm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = miss_you_events.space_id
        AND sm.user_id = auth.uid()
    )
  );

-- courses
DROP POLICY IF EXISTS "Authenticated access" ON courses;
CREATE POLICY "Authenticated access" ON courses FOR ALL
  USING (EXISTS (SELECT 1 FROM space_members sm WHERE sm.space_id = courses.space_id AND sm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM space_members sm WHERE sm.space_id = courses.space_id AND sm.user_id = auth.uid()));

-- deadlines
DROP POLICY IF EXISTS "Authenticated access" ON deadlines;
CREATE POLICY "Authenticated access" ON deadlines FOR ALL
  USING (EXISTS (SELECT 1 FROM space_members sm WHERE sm.space_id = deadlines.space_id AND sm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM space_members sm WHERE sm.space_id = deadlines.space_id AND sm.user_id = auth.uid()));

-- settings: members can read, only owner can write
DROP POLICY IF EXISTS "Members can read settings" ON settings;
DROP POLICY IF EXISTS "Owner can insert settings" ON settings;
DROP POLICY IF EXISTS "Owner can update settings" ON settings;
DROP POLICY IF EXISTS "Owner can delete settings" ON settings;
DROP POLICY IF EXISTS "Authenticated access" ON settings;
DROP POLICY IF EXISTS "Owner settings write" ON settings;
DROP POLICY IF EXISTS "Owner settings update" ON settings;

CREATE POLICY "Members can read settings" ON settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = settings.space_id
        AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can insert settings" ON settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = settings.space_id
        AND sm.user_id = auth.uid()
        AND sm.role = 'owner'
    )
  );

CREATE POLICY "Owner can update settings" ON settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = settings.space_id
        AND sm.user_id = auth.uid()
        AND sm.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = settings.space_id
        AND sm.user_id = auth.uid()
        AND sm.role = 'owner'
    )
  );

CREATE POLICY "Owner can delete settings" ON settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = settings.space_id
        AND sm.user_id = auth.uid()
        AND sm.role = 'owner'
    )
  );

-- quick_links
DROP POLICY IF EXISTS "Authenticated access" ON quick_links;
CREATE POLICY "Authenticated access" ON quick_links FOR ALL
  USING (EXISTS (SELECT 1 FROM space_members sm WHERE sm.space_id = quick_links.space_id AND sm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM space_members sm WHERE sm.space_id = quick_links.space_id AND sm.user_id = auth.uid()));

-- miss_you_seen_state
DROP POLICY IF EXISTS "Authenticated access" ON miss_you_seen_state;
CREATE POLICY "Authenticated access" ON miss_you_seen_state FOR ALL
  USING (EXISTS (SELECT 1 FROM space_members sm WHERE sm.space_id = miss_you_seen_state.space_id AND sm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM space_members sm WHERE sm.space_id = miss_you_seen_state.space_id AND sm.user_id = auth.uid()));

-- period_records
DROP POLICY IF EXISTS "Authenticated access" ON period_records;
CREATE POLICY "Authenticated access" ON period_records FOR ALL
  USING (EXISTS (SELECT 1 FROM space_members sm WHERE sm.space_id = period_records.space_id AND sm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM space_members sm WHERE sm.space_id = period_records.space_id AND sm.user_id = auth.uid()));

-- push_subscriptions
DROP POLICY IF EXISTS "Authenticated access" ON push_subscriptions;
CREATE POLICY "Authenticated access" ON push_subscriptions FOR ALL
  USING (EXISTS (SELECT 1 FROM space_members sm WHERE sm.space_id = push_subscriptions.space_id AND sm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM space_members sm WHERE sm.space_id = push_subscriptions.space_id AND sm.user_id = auth.uid()));

-- ============================================
-- 2. space_code tables — via couple_spaces lookup
-- ============================================

-- content_comments
DROP POLICY IF EXISTS "Authenticated access" ON content_comments;
CREATE POLICY "Authenticated access" ON content_comments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM couple_spaces cs
      JOIN space_members sm ON sm.space_id = cs.id
      WHERE cs.code = content_comments.space_code
        AND sm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couple_spaces cs
      JOIN space_members sm ON sm.space_id = cs.id
      WHERE cs.code = content_comments.space_code
        AND sm.user_id = auth.uid()
    )
  );

-- content_interactions
DROP POLICY IF EXISTS "Authenticated access" ON content_interactions;
CREATE POLICY "Authenticated access" ON content_interactions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM couple_spaces cs
      JOIN space_members sm ON sm.space_id = cs.id
      WHERE cs.code = content_interactions.space_code
        AND sm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM couple_spaces cs
      JOIN space_members sm ON sm.space_id = cs.id
      WHERE cs.code = content_interactions.space_code
        AND sm.user_id = auth.uid()
    )
  );

-- content_reads
DROP POLICY IF EXISTS "Authenticated access" ON content_reads;
CREATE POLICY "Authenticated access" ON content_reads FOR ALL
  USING (EXISTS (SELECT 1 FROM couple_spaces cs JOIN space_members sm ON sm.space_id = cs.id WHERE cs.code = content_reads.space_code AND sm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM couple_spaces cs JOIN space_members sm ON sm.space_id = cs.id WHERE cs.code = content_reads.space_code AND sm.user_id = auth.uid()));

-- user_identities
DROP POLICY IF EXISTS "Authenticated access" ON user_identities;
CREATE POLICY "Authenticated access" ON user_identities FOR ALL
  USING (EXISTS (SELECT 1 FROM couple_spaces cs JOIN space_members sm ON sm.space_id = cs.id WHERE cs.code = user_identities.space_code AND sm.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM couple_spaces cs JOIN space_members sm ON sm.space_id = cs.id WHERE cs.code = user_identities.space_code AND sm.user_id = auth.uid()));

-- ============================================
-- 3. couple_spaces — read own space only
-- ============================================
DROP POLICY IF EXISTS "Authenticated access" ON couple_spaces;
CREATE POLICY "Authenticated access" ON couple_spaces
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = couple_spaces.id
        AND sm.user_id = auth.uid()
    )
  );

-- ============================================
-- 4. Owner-only settings policies already applied above
-- ============================================

-- ============================================
-- Post-check
-- ============================================
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'album_items', 'courses', 'deadlines', 'love_notes',
    'miss_you_events', 'miss_you_seen_state', 'period_records',
    'push_subscriptions', 'quick_links', 'settings',
    'content_comments', 'content_interactions', 'content_reads',
    'user_identities', 'couple_spaces', 'space_members'
  )
ORDER BY tablename, policyname;
