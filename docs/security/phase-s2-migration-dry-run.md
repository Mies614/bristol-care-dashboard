# Security Phase S2.1 Migration Dry Run

## Status

Not completed in this Codex run.

Reason: this machine has no Supabase CLI or `psql`, and Docker daemon is not
available. Codex did not install new database tooling or connect to production.

## Non-Production Dry Run Target

Use one of:

- local Supabase;
- temporary Supabase project;
- disposable PostgreSQL database with Supabase-like schemas.

Never use production.

## Required Steps

1. Load a minimal non-production schema matching production verification output.
2. Insert anonymous fake rows only.
3. Apply `supabase/migrations/20260626000000_enable_business_rls.sql`.
4. Verify anon/authenticated direct business table access behavior.
5. Verify service-role API path can still operate.
6. Verify `content_id` accepts non-UUID text.
7. Verify `space_code` partition assumptions.
8. Apply `supabase/migrations/20260626000001_rollback_business_rls.sql`.
9. Verify rollback removed only S2 policies.
10. Re-apply enable migration to check repeat behavior.

## Tooling Check From This Run

```text
Supabase CLI: unavailable
psql: unavailable
Docker CLI: present
Docker daemon: unavailable
```

The draft marker must remain until this dry run is actually executed.
