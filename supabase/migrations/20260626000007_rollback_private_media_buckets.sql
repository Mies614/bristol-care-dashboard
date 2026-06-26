-- Bristol Care Dashboard — S2.3 Rollback
-- Re-make couple-albums and love-notes buckets public.
-- WARNING: This makes existing media publicly readable again.
-- Does NOT re-enable anonymous INSERT policies (those were removed in S2.2).
-- Only use if signed-read code deployment is being rolled back.

BEGIN;

UPDATE storage.buckets SET public = true WHERE id = 'couple-albums';
UPDATE storage.buckets SET public = true WHERE id = 'love-notes';

COMMIT;

-- Post-check
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id IN ('couple-albums', 'love-notes', 'backgrounds')
ORDER BY id;
