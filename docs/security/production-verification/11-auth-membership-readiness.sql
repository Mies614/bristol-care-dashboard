-- Bristol Care Dashboard — S3 Auth Membership Readiness
-- Read-only: count auth users and space membership.
-- Output counts only — no emails, no tokens, no user IDs.

-- 1. Auth user count (requires access to auth schema)
SELECT
  'auth_users' AS metric,
  COUNT(*)::TEXT AS value
FROM auth.users;

-- 2. Space members count
SELECT
  'space_members' AS metric,
  COUNT(*)::TEXT AS value
FROM space_members;

-- 3. Members by role
SELECT
  'members_by_role' AS metric,
  role AS detail,
  COUNT(*)::TEXT AS value
FROM space_members
GROUP BY role
ORDER BY role;

-- 4. Spaces without members
SELECT
  'spaces_without_members' AS metric,
  COUNT(*)::TEXT AS value
FROM couple_spaces cs
WHERE NOT EXISTS (
  SELECT 1 FROM space_members sm WHERE sm.space_id = cs.id
);
