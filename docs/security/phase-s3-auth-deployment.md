# S3 Auth Deployment Order

1. Deploy auth infrastructure code (`AUTH_ENFORCEMENT_MODE=off`)
2. Enable Supabase Auth in Supabase Dashboard
3. Create two user accounts (via Supabase Dashboard or API)
4. Set `ALLOWED_AUTH_EMAILS` in Vercel env
5. Run `20260626000008_create_space_members.sql`
6. Insert both members into `space_members`
7. Both users test login
8. Set `AUTH_ENFORCEMENT_MODE=observe`
9. Verify all features work
10. Run `20260626000010_enable_authenticated_business_rls.sql`
11. Set `AUTH_ENFORCEMENT_MODE=enforce`
12. Verify unauthenticated access is denied
13. Monitor logs

## Never
- Enable enforce mode before space_members is populated
- Apply RLS before auth infrastructure is deployed
- Skip observe mode
