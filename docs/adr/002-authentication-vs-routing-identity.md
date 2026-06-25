# ADR-002: Routing Identity ≠ Authentication

**Status:** Accepted
**Date:** 2026-06-25
**Deciders:** Project maintainer

## Context

The app uses URL path prefix to determine which "side" is active (`/me/**` = owner, `/**` = partner). This is a routing identity — it tells the UI which data to display. It is NOT authentication.

## Decision

**Routing identity and authentication are separate concerns:**

| Concept | Mechanism | Purpose |
|---|---|---|
| Routing identity | URL path (`/me/**` vs `/**`) | Which UI/data to show |
| Authentication | Admin password (`ADMIN_PASSWORD`) | Who can access admin functions |
| Authorization | API route guards (`validateAdminPassword`) | What operations are allowed |

### Rules

1. Routing identity MUST NOT be trusted for authorization decisions on the server.
2. Admin API routes MUST validate credentials independently of the URL path.
3. The fact that someone knows the `/me` URL does NOT grant them owner privileges — the URL is not a secret.
4. `space_code` is a data partitioning field, NOT an authorization secret.

## Consequences

### Positive
- Clear separation between presentational routing and actual security
- Admin functions are protected independently of URL knowledge
- The model is explicit and auditable

### Negative
- No cryptographic binding between identity and requests
- Anyone who knows both `/me` and `/` can see both sides
- Admin auth is password-only (no MFA, no OAuth)

## Related
- ADR-001: Path-based identity routing
- `docs/security-model.md`
- `docs/security/rls-design-proposal.md`
