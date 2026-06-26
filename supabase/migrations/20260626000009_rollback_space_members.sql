-- Bristol Care Dashboard — S3 Rollback
-- Drop space_members table.
-- Does NOT delete auth.users or any business data.
-- WARNING: All space membership records will be lost.

BEGIN;

DROP TABLE IF EXISTS public.space_members CASCADE;

COMMIT;

-- Post-check
SELECT
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'space_members') AS table_exists;
