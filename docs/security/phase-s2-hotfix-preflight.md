# S2.2 Hotfix Preflight Checklist

## Before applying database hotfix

- [ ] Code with `/api/identities` deployed and verified
- [ ] Code with signed-upload flow deployed and verified
- [ ] Identity CRUD works via API (not direct Supabase)
- [ ] Note media upload works via signed URL
- [ ] Album upload works via signed URL
- [ ] Background upload works via signed URL
- [ ] Comments still work via `/api/comments`
- [ ] Interactions still work via `/api/interactions`
- [ ] No browser code imports `getSupabaseBrowserClient` for writes
- [ ] No browser code calls `.from("user_identities")` directly

## Before applying Storage hotfix

- [ ] Database hotfix applied and verified (step above)
- [ ] All uploads confirmed working via signed-URL path
- [ ] No browser code calls `supabase.storage.from().upload()`
- [ ] E2E upload tests pass

## Rollback readiness

- [ ] Rollback SQL reviewed and understood
- [ ] Rollback re-introduces known public-access risks (documented)
- [ ] Decision made on when to apply database vs storage hotfix independently
