-- Bristol Care Dashboard — S2.3 Private Media Read Migration
-- Make couple-albums and love-notes buckets private.
-- Deploy AFTER signed-read code has been deployed and verified in production.
-- Keeps backgrounds public. Does NOT delete or move any objects.
-- Does NOT re-enable anonymous INSERT.
-- Idempotent: checks current state before updating.

BEGIN;

-- Check buckets exist and current public status
DO $$
DECLARE
  albums_public boolean;
  notes_public boolean;
BEGIN
  SELECT public INTO albums_public FROM storage.buckets WHERE id = 'couple-albums';
  SELECT public INTO notes_public FROM storage.buckets WHERE id = 'love-notes';

  IF albums_public IS NULL THEN
    RAISE EXCEPTION 'Bucket couple-albums not found';
  END IF;
  IF notes_public IS NULL THEN
    RAISE EXCEPTION 'Bucket love-notes not found';
  END IF;

  -- Only update if currently public
  IF albums_public THEN
    UPDATE storage.buckets SET public = false WHERE id = 'couple-albums';
    RAISE NOTICE 'couple-albums set to private';
  ELSE
    RAISE NOTICE 'couple-albums already private';
  END IF;

  IF notes_public THEN
    UPDATE storage.buckets SET public = false WHERE id = 'love-notes';
    RAISE NOTICE 'love-notes set to private';
  ELSE
    RAISE NOTICE 'love-notes already private';
  END IF;
END $$;

COMMIT;

-- Post-check: verify bucket states
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id IN ('couple-albums', 'love-notes', 'backgrounds')
ORDER BY id;
