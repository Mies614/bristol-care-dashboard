# ADR-004: Service Role API Boundary

**Status:** Accepted
**Date:** 2026-06-26

## Context

The app has no Supabase Auth boundary in S2. Browser database access must therefore be minimized, and business writes must go through Next.js API routes.

## Decision

Use this boundary for business data:

```text
Browser -> Next.js API -> server-only Supabase service role -> Postgres
```

`lib/supabase/server.ts` keeps `import "server-only"`. Browser code must not import the service role client or call business-table `.from(...)` directly.

## Consequences

- Service role keys stay server-side.
- RLS can block direct anon/authenticated Data API access.
- Service role bypasses RLS, so API request validation remains mandatory.
- This is not a replacement for real user authentication.
