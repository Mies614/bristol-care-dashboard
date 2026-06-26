# Security Phase S2 RLS Deployment Plan

## Draft Files

- `supabase/migrations/20260626000000_enable_business_rls.sql`
- `supabase/migrations/20260626000001_rollback_business_rls.sql`

Both files are drafts. Do not apply them until production RLS verification is complete.

## Required Preflight

Run `docs/security/production-rls-verification.sql` in Supabase SQL Editor and save the reviewed result outside public logs. Confirm:

- every listed business table exists;
- `content_comments.space_code`, `content_interactions.space_code`, `content_reads.space_code`, and `space_locations.space_code` are `text`;
- `content_id` remains `text` and supports non-UUID values such as `sample-love-note-1`;
- existing production policies are understood before any policy is dropped or changed;
- Storage policies are reviewed separately in the Dashboard.

Repository note: `supabase/schema.sql` contains traceable RLS statements, but production state is still unknown until the read-only SQL is run.

## Recommended S2 Shape

Current no-auth architecture:

```text
Browser -> Next.js API -> server-only Supabase service role -> Postgres
```

RLS should block direct anon/authenticated business table access. The service role bypasses RLS, so API route validation remains the authorization boundary.

## Rollback

Use the rollback draft only after confirming it matches the policies actually deployed. It does not disable RLS or delete data.
