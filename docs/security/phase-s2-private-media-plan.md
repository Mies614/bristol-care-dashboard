# S2.3 Private Media Plan (Design Only)

## Goal
Convert public buckets to private and serve media via server-generated signed read URLs.

## Current state (S2.2)
- `couple-albums`, `love-notes`, `backgrounds` are all `public=true`
- All existing media URLs are public (no signed tokens)
- Browser loads images/video/audio directly from public URLs

## Target state (S2.3)
- Buckets set to `public=false`
- All media access via `/api/media/:bucket/:path` → signed read URL redirect
- Old public URLs continue working during migration window

## Migration steps (future)

1. Add `media_objects` tracking table (path, bucket, content_type, size)
2. Generate signed read URL endpoint: `/api/media/resolve`
3. Migrate `AppBackground` to use signed read URLs
4. Migrate album lightbox to use signed read URLs
5. Migrate note media to use signed read URLs
6. Set buckets to `public=false`
7. Monitor for broken media URLs (404 from direct access)
8. Remove public SELECT policies on storage.objects

## Concerns
- **CDN caching**: signed URLs expire — need client-side cache management
- **Offline/PWA**: signed URLs are time-limited — need prefetch strategy
- **Storage egress**: signed read URLs still count toward egress
- **Background images**: change frequently, need frequent re-signing
- **Performance**: extra API round-trip before every media load

## Decision
Not implementing in S2.2. Public buckets remain public for reads.
