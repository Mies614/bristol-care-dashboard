# S2.2 Production Exposure Remediation Report

## Confirmed Exposure

### Database (production-verified via verification SQL)

- `content_comments`: public SELECT/INSERT/UPDATE/DELETE, USING true / WITH CHECK true
- `content_interactions`: public SELECT/INSERT/UPDATE/DELETE, USING true / WITH CHECK true
- `user_identities`: public SELECT/INSERT/UPDATE/DELETE, USING true / WITH CHECK true
- `couple_spaces`: anon SELECT, USING true
- `love_notes`: anon SELECT on active visible notes, no space_id or identity restriction
- All business tables: RLS enabled but `rls_forced=false`

### Storage (production-verified)

- `backgrounds`: public=true, anon SELECT + INSERT (bucket_id check only)
- `couple-albums`: public=true, anon SELECT + INSERT (bucket_id check only)
- `love-notes`: public=true, anon SELECT + INSERT (bucket_id check only)

## Remediation Approach

### user_identities
Browser no longer accesses `user_identities` directly. All reads/writes go through `/api/identities` which uses service role client. Client cannot:
- Specify arbitrary `space_code` (enforced server-side from env)
- Set `role=admin` (blocked by API)
- Delete built-in identities (blocked by API)

### Storage Uploads
Anonymous `storage.from(bucket).upload()` replaced by signed-upload flow:
1. Client calls `POST /api/upload/authorize` with bucket, MIME, fileSize
2. Server validates Origin, space, MIME, size, extension
3. Server generates signed URL via service role `createSignedUploadUrl`
4. Client uploads directly to signed URL via `fetch(signedUrl, { method: 'PUT' })`
5. Client receives immutable UUID path from server — no arbitrary path control

### Why public buckets remain public
- Existing media uses public URLs throughout the app
- Migration to signed read URLs requires metadata tracking (future S3 task)
- The signed-upload flow prevents new anonymous writes without breaking reads
- Backgrounds public SELECT is preserved for current AppBackground usage
