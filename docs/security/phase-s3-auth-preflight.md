# S3 Auth Preflight

## Before deployment
- [ ] Supabase Auth enabled on project
- [ ] Two user accounts created in Supabase Auth
- [ ] `ALLOWED_AUTH_EMAILS` env var set in Vercel
- [ ] `AUTH_ENFORCEMENT_MODE=off` initially

## Before inserting space_members
- [ ] Obtain both `auth.users.id` values
- [ ] Identify which user is owner, which is partner
- [ ] Know the `couple_spaces.id` to assign

## Before enabling enforce mode
- [ ] Both users can log in
- [ ] `space_members` has both records
- [ ] All app features work in observe mode
- [ ] RLS migration has been applied
