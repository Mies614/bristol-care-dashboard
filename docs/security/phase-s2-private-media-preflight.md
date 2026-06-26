# S2.3 Private Media Read — Preflight Checklist

## Before deploying signed-read code

- [ ] `/api/media/sign` route tested locally (returns signed URLs for notes and albums)
- [ ] `SignedMediaImage`, `SignedMediaVideo`, `SignedMediaAudio` components ready
- [ ] `lib/mediaReference.ts` public URL parser tested with production-format URLs
- [ ] `lib/signedMediaCache.ts` in-memory cache with 5-minute expiry
- [ ] Backgrounds still use public URLs (not going through /api/media/sign)

## Before applying make-private migration

- [ ] Signed-read code deployed to production
- [ ] All historical media loads correctly (URL-only fallback works)
- [ ] Images load in albums, notes, memory timeline, and unread pages
- [ ] Videos play with click-to-load pattern
- [ ] Audio plays with click-to-load pattern
- [ ] Lightbox loads images via signed URLs
- [ ] AppBackground still renders (public bucket, no signed URL needed)
- [ ] No new console errors related to signed URL loading
- [ ] Storage egress normal (signed URLs don't trigger unexpected requests)

## Rollback readiness

- [ ] Rollback SQL (`20260626000007_rollback_private_media_buckets.sql`) reviewed
- [ ] Rollback does NOT restore anonymous INSERT (S2.2 hotfix remains)
- [ ] Decision on when to apply vs when to hold documented
