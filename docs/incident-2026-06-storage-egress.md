# Incident Report: Supabase Storage Cached Egress Spike

**Date:** 2026-06-25  
**Severity:** Medium (cost impact only, no data loss or downtime)  
**Status:** Resolved  

## Summary

Supabase Free Plan Cached Egress reached **15.81 GB** (Storage size only **0.036 GB**), indicating media files were being downloaded far more frequently than expected. Uncached egress was 0.424 GB.

## Timeline

| Time | Event |
|---|---|
| 2026-06-25 | Egress numbers observed in Supabase dashboard |
| 2026-06-25 | Full codebase audit conducted |
| 2026-06-25 | Fixes implemented and deployed |

## Root Causes

1. **LoveNoteCard video `preload` defaulted to `auto`**: The `<video>` element in `LoveNoteCard.tsx` had no `preload` attribute, causing browsers to download full videos on page load — even when the video wasn't being played.

2. **No `cacheControl` on uploads**: Files uploaded to Supabase Storage via `albumUpload.ts`, `noteUpload.ts`, and `backgroundUpload.ts` had no `cache-control` header. Browsers were forced to re-download unchanged files on every visit.

3. **E2E tests loaded real Supabase Storage media**: All Playwright E2E tests navigated real pages that loaded images and videos directly from production Supabase Storage, consuming egress bandwidth on every test run.

## Fixes Applied

| Fix | File(s) | Impact |
|---|---|---|
| `preload="none"` on LoveNoteCard video | `components/LoveNoteCard.tsx` | Stops auto-download of full videos on page load |
| `cacheControl: "31536000"` on uploads | `lib/albumUpload.ts`, `lib/noteUpload.ts`, `lib/backgroundUpload.ts` | Enables 1-year browser cache for immutable assets |
| E2E Storage request intercept | `tests/e2e/utils/storage-intercept.ts`, `tests/e2e/fixtures.ts` | All 16 E2E specs now mock Supabase Storage responses |
| Storage egress regression tests | `tests/storageEgress.test.ts`, `tests/e2e/storage-egress.spec.ts` | Prevents regression of egress issues |

## Prevention

1. **All new video elements must include `preload="none"` or `preload="metadata"`** — enforced by `tests/storageEgress.test.ts`.
2. **All new upload functions must include `cacheControl`** — enforced by unit test.
3. **All E2E specs must use the shared fixture** (`tests/e2e/fixtures.ts`) which intercepts Supabase Storage — enforced by unit test.
4. **Monitor Supabase usage dashboard monthly** for unexpected egress patterns.

## Lessons Learned

- Default HTML video behavior (`preload="auto"`) is dangerously aggressive for media-heavy PWAs on free-tier Storage.
- E2E tests must be treated as "production traffic" when they access real backend resources.
- Static public URLs with long cache headers are always preferable to signed URLs for immutable user content.
- Storage size is NOT a reliable indicator of egress — a tiny 36 MB bucket can generate 15+ GB egress if cache is missing.

## Related

- `docs/supabase-storage-egress-guard.md` — ongoing egress prevention strategy
- `tests/storageEgress.test.ts` — automated regression tests
- `tests/e2e/utils/storage-intercept.ts` — E2E intercept implementation
