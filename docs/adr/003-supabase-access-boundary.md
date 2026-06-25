# ADR-003: Supabase Access Boundary

**Status:** Accepted
**Date:** 2026-06-25
**Deciders:** Project maintainer

## Context

The app accesses Supabase in two ways:
1. **Server-side** via API routes using service role key (full access)
2. **Client-side** via browser using anon key (limited to Storage upload + public URLs)

A decision was needed on where to draw the boundary between these access patterns.

## Decision

**Server-side for DB, Client-side only for Storage uploads.**

| Operation | Access Path | Key Used |
|---|---|---|
| Read/write DB tables | `app/api/**` → `createSupabaseServerClient()` | Service Role |
| Upload files | Browser → `getSupabaseBrowserClient()` → Storage | Anon Key |
| Read file URLs | Browser → `getPublicUrl()` | None (public URL) |

### Rules

1. `lib/supabase/server.ts` is protected by `import "server-only"` — cannot be imported into client components.
2. `lib/supabase/client.ts` uses anon key exclusively — never exposes service role.
3. No client component calls `supabase.from("table_name")` directly.
4. All DB mutations go through API routes that validate identity and space_code.

## Consequences

### Positive
- Clear security boundary: DB access always goes through server validation
- Service role key never exposed to browser bundle
- Build-time enforcement via `import "server-only"`
- Storage uploads are efficient (direct client→Supabase, no server proxy)

### Negative
- Storage buckets are public (no RLS on object access)
- Anon key can upload to any path within a bucket (no path restrictions)
- API routes add latency compared to direct DB access from client

## Compliance Verification

- `tests/securityBoundary.test.ts` verifies service role key patterns are NOT in client-reachable modules
- `tests/envGuard.test.ts` verifies env validation logic
- Lint/build catches `import "server-only"` violations
