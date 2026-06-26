# S2.3 Private Media Read — Deployment Order

1. **Deploy signed-read code** (Vercel auto-deploy on push)
2. **Keep buckets public**
3. **Verify in production**: all historical and new media still loads via URL-only fallback (public URLs still work since buckets are public)
4. **Verify signed-read path**: check that `/api/media/sign` returns valid signed URLs
5. **Verify UI**: images, audio, video, Lightbox all work
6. **Run `20260626000006_make_private_media_buckets.sql`** in Supabase SQL Editor
7. **Verify again**: all media still loads (now via signed URLs)
8. **Verify old public URLs** return 404 (bucket is private)
9. **Monitor**: Vercel logs, Storage egress, error rates
10. **After stability**: optionally remove public URL fallback from `SignedMediaImage` etc.

## Never

- Make buckets private before deploying signed-read code
- Re-enable anonymous INSERT (that policy was removed in S2.2)
- Make backgrounds private (backgrounds remain public)
