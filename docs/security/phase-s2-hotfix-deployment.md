# S2.2 Hotfix Deployment Order

## Order is critical

1. **Deploy code** (API routes + signed upload) to production
2. **Verify** identity, comments, interactions, and all three upload types
3. **Confirm** no browser code depends on direct DB/Storage writes
4. **Apply** `20260626000002_remove_public_business_access.sql` in Supabase Dashboard
5. **Verify** app still works (identity, comments, interactions)
6. **Apply** `20260626000004_disable_anonymous_storage_uploads.sql` in Supabase Dashboard
7. **Verify** uploads still work via signed URL
8. **Monitor** error rates, Storage usage, egress

## Never

- Apply DB hotfix before code deployment
- Apply Storage hotfix before verifying signed uploads
- Apply both hotfixes simultaneously without intermediate verification
