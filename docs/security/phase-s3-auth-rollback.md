# S3 Auth Rollback

1. Set `AUTH_ENFORCEMENT_MODE=off`
2. Run `20260626000011_rollback_authenticated_business_rls.sql`
3. Run `20260626000009_rollback_space_members.sql` (optional — removes membership table)

## Risk
Rollback restores permissive access. All auth-based restrictions are removed. The app returns to pre-S3 behavior where identity is untrusted and path-based.
