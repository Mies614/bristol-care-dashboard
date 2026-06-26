# S2.2 Hotfix Rollback

## Database rollback

Run `20260626000003_rollback_public_business_access.sql`.

Re-enables:
- `content_comments` public CRUD (USING true)
- `content_interactions` public CRUD (USING true)
- `user_identities` public CRUD (USING true)
- `couple_spaces` anon SELECT (USING true)
- `love_notes` anon active-notes SELECT

Risk: Anyone with the anon key can read/write all business data.

## Storage rollback

Run `20260626000005_rollback_anonymous_storage_uploads.sql`.

Re-enables anon INSERT on `backgrounds`, `couple-albums`, `love-notes`.

Risk: Anyone with the anon key can upload to all three buckets.

## Rollback order

1. Storage rollback first (if uploads are broken)
2. Database rollback second (if identity/comments/interactions are broken)
3. Or roll back code deployment to restore direct Supabase access
