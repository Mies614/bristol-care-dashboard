# S2.3 Private Media Read — Verification

## After deployment (buckets still public)

1. Open `/albums` — images load via public URL fallback
2. Open `/notes` — note images, audio, video load
3. Open `/memories` — timeline images load
4. Open album lightbox — full-size images load
5. Check `/api/media/sign` returns signed URLs (test via curl or browser console)

## After make-private migration

1. Open `/albums` — images load via signed URLs (cache hit)
2. Open `/notes` — all media loads via signed URLs
3. Open `/memories` — timeline images load via signed URLs
4. Try old public URL directly — should return 404 or forbidden
5. Refresh — signed URLs should come from cache (no re-fetch to /api/media/sign)
6. Wait 6 minutes — signed URL should expire and get refreshed on next load

## Failure modes to watch

- Signed URL expiry during Lightbox browsing (should be pre-cached)
- Video seeking across expiry boundary (URL should outlast typical watch time)
- Audio playback across expiry boundary
- Mobile network switching (signed URLs might be cached differently by CDN)
