-- ═══════════════════════════════════════════════════════════
-- Bristol Care Dashboard — Production RLS Verification
-- ═══════════════════════════════════════════════════════════
-- READ-ONLY. 不包含 ALTER、CREATE POLICY、DROP、UPDATE、INSERT。
-- 在 Supabase Dashboard → SQL Editor 中执行。
-- ═══════════════════════════════════════════════════════════

-- ── 1. 表是否启用 RLS ──
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;

-- ── 2. 所有 Policy 清单 ──
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ── 3. 关键表列和类型 ──
-- content_comments
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'content_comments'
ORDER BY ordinal_position;

-- content_interactions
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'content_interactions'
ORDER BY ordinal_position;

-- content_reads
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'content_reads'
ORDER BY ordinal_position;

-- space_locations
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'space_locations'
ORDER BY ordinal_position;

-- love_notes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'love_notes'
ORDER BY ordinal_position;

-- album_items
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'album_items'
ORDER BY ordinal_position;

-- ── 4. Storage Bucket 信息 ──
-- 在 Supabase Dashboard → Storage → Policies 中查看各 bucket：
--   love-notes
--   couple-albums
--   backgrounds
--
-- 检查每项：
-- ✅ bucket 是否为 public
-- ✅ 是否有 storage.objects 的 SELECT/INSERT/UPDATE/DELETE policy
-- ✅ policy 角色是否为 anon/authenticated
-- ✅ object path 是否包含 space_code 或 identity 限制

-- ── 5. Storage Object Policies (SQL版) ──
SELECT
  name AS policy_name,
  bucket_id,
  operation,
  definition
FROM storage.policies
ORDER BY bucket_id, operation;

-- ── 6. 关键数据抽样 ──
-- 不输出具体值到日志，仅确认查询可用
SELECT count(*) AS total_love_notes FROM love_notes;
SELECT count(*) AS total_album_items FROM album_items;
SELECT count(*) AS total_interactions FROM content_interactions;
SELECT count(*) AS total_comments FROM content_comments;
SELECT count(*) AS total_reads FROM content_reads;
