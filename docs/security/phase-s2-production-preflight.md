# Security Phase S2.1 Production Preflight

## Status

Blocked until production read-only verification results are reviewed.

## User Action

In Supabase Dashboard:

```text
SQL Editor -> New query
```

Run:

```text
docs/security/production-rls-verification.sql
```

Share only structure output:

- public table RLS status;
- public policies;
- business table columns, constraints and indexes;
- anon/authenticated grants;
- Storage buckets;
- storage.objects policies and grants.

Do not share production rows, media URLs, JWTs, API keys, database passwords or
service role keys.

## Required Checks

- Confirm production table names before editing migration SQL.
- Confirm `space_code` versus `space_id` per table.
- Confirm `content_id` is text where used by content APIs.
- Confirm existing policy names before dropping or replacing anything.
- Confirm Storage bucket public/private status and anon upload/update/delete
  exposure.

## Current Known Drift Risk

`docs/production-schema.md` says production has `space_code` on
`love_notes`, `album_items` and `miss_you_events`, while repository
`supabase/schema.sql` uses `space_id` for these tables. Treat this as unverified
schema drift until production SQL output is reviewed.
