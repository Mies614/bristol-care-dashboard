# Security Phase S2.1 Production Rollback

## Status

Rollback SQL is draft-only until production policy names are verified.

Draft rollback:

```text
supabase/migrations/20260626000001_rollback_business_rls.sql
```

## Rollback Principles

- Do not delete data.
- Do not disable RLS unless a reviewed previous policy set requires it.
- Roll back only policies introduced by the S2 deployment.
- Preserve production policies that predate S2 unless explicitly reviewed.

## Required Dry Run

In non-production:

1. Apply minimal schema.
2. Apply enable migration.
3. Verify expected direct anon/authenticated behavior.
4. Apply rollback.
5. Verify S2 policy names are gone.
6. Re-apply enable migration to check repeat behavior.

## Current Limitation

This repository cannot prove rollback safety against production until the
production `pg_policies` output is reviewed.
