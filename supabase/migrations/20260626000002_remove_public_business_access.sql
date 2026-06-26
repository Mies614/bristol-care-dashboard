-- Bristol Care Dashboard — S2.2 Production DB Hotfix
-- Remove public CRUD policies on business tables.
-- Deploy AFTER code compatibility has been verified in production.
-- Idempotent: uses IF EXISTS to avoid errors on re-run.
-- Does NOT disable RLS. Does NOT modify data or schema columns.
-- Does NOT revoke service_role access.

-- 1. content_comments: remove public SELECT/INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "public can select comments" ON content_comments;
DROP POLICY IF EXISTS "public can insert comments" ON content_comments;
DROP POLICY IF EXISTS "public can update comments" ON content_comments;
DROP POLICY IF EXISTS "public can delete comments" ON content_comments;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON content_comments;

-- 2. content_interactions: remove public SELECT/INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "public can select interactions" ON content_interactions;
DROP POLICY IF EXISTS "public can insert interactions" ON content_interactions;
DROP POLICY IF EXISTS "public can update interactions" ON content_interactions;
DROP POLICY IF EXISTS "public can delete interactions" ON content_interactions;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON content_interactions;

-- 3. user_identities: remove public SELECT/INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "public can select identities" ON user_identities;
DROP POLICY IF EXISTS "public can insert identities" ON user_identities;
DROP POLICY IF EXISTS "public can update identities" ON user_identities;
DROP POLICY IF EXISTS "public can delete identities" ON user_identities;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON user_identities;

-- 4. couple_spaces: remove anon full-table SELECT
DROP POLICY IF EXISTS "anon can select spaces" ON couple_spaces;
DROP POLICY IF EXISTS "anon can select couple_spaces" ON couple_spaces;

-- 5. love_notes: remove anon visible-notes SELECT
DROP POLICY IF EXISTS "anon can select visible notes" ON love_notes;
DROP POLICY IF EXISTS "anon can select active notes" ON love_notes;

-- Verification: list remaining public-schema policies for business tables
-- Expected: only service_role policies (if any) remain; no public-access policies
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'content_comments', 'content_interactions', 'user_identities',
    'couple_spaces', 'love_notes'
  )
ORDER BY tablename, policyname;
