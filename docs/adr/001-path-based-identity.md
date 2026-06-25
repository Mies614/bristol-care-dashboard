# ADR-001: Path-Based Identity Routing

**Status:** Accepted  
**Date:** 2026-06-25  
**Deciders:** Project maintainer  

## Context

Bristol Care Dashboard serves two fixed identities (partner "xiaoguai" and owner "me") sharing one codebase. A decision was needed on how to route requests to the correct identity without login/session complexity.

## Decision

Use **URL path prefix** as the sole identity discriminator:

- `/**` routes → partner side (小乖端), identity = `xiaoguai`
- `/me/**` routes → owner side (我端), identity = `me`

Identity is resolved by `lib/appIdentity.ts` which reads `usePathname()` and maps to the fixed identity ID. There is no session, no cookie, no JWT.

## Alternatives Considered

### 1. Subdomain routing (`xiaoguai.app.com` vs `me.app.com`)
- **Pros**: Cleaner URLs, clearer separation
- **Cons**: Requires DNS config, SSL per subdomain, complicates Vercel deployment
- **Rejected**: Overkill for a single-couple PWA

### 2. Query parameter (`?identity=me`)
- **Pros**: Simplest to implement
- **Cons**: Ugly URLs, easy to accidentally share wrong identity, breaks static generation
- **Rejected**: Poor UX

### 3. Login/authentication
- **Pros**: Standard, flexible for multi-user
- **Cons**: Adds auth infrastructure, session management, password management for both users
- **Rejected**: Unnecessary complexity for a couple's private app

## Consequences

### Positive
- Zero authentication infrastructure
- Deterministic — URL always knows which side
- Easy to test — just change the URL
- Works with static generation and SSR

### Negative
- No access control between sides (anyone who knows both URLs can see both sides)
- Cannot support more than 2 identities without code changes
- Identity is not cryptographically enforced
- `/me` prefix is semantically unusual for "owner"

## Compliance

- `AGENTS.md` rule: `/me/**` identity = `me`, `/**` = `xiaoguai`
- All business components accept `identityId` as prop (never read from localStorage)
- All E2E tests verify both sides
- Route guard tests in `tests/e2e/owner-routing.spec.ts`
