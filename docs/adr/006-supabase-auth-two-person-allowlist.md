# ADR 006: Supabase Auth with Two-Person Email Allowlist

## Status
Proposed (Phase S3)

## Context
The current identity system is purely path-based (`/` = partner, `/me` = owner) with no real authentication. Origin Guard reduces cross-site abuse but cannot authenticate individuals. A real two-person auth system is needed.

## Decision
Use Supabase Auth with Email OTP (magic link) and a two-email allowlist.

Key decisions:
1. **Email OTP over password**: Only 2 users, no need for password management. OTP is simpler and more secure.
2. **Allowlist over open registration**: Only two pre-approved emails can request login links. Env var `ALLOWED_AUTH_EMAILS`.
3. **`space_members` table**: Maps `auth.users.id` → `couple_spaces` with roles (`owner` | `partner`). This is the source of truth for authorization.
4. **`@supabase/ssr`**: Official SSR package for cookie-based session management via Next.js middleware.
5. **Feature flag `AUTH_ENFORCEMENT_MODE`**: `off` / `observe` / `enforce` for gradual rollout.

## Why not Supabase Auth UI
The default Supabase Auth UI component is designed for public registration flows. For a two-person private app, a custom minimal login page is more appropriate and fits the existing design system.

## Why not password auth
OTP removes password management burden for two users. Future MFA/passkey can be added.

## Consequences
- Requires Supabase Auth to be enabled on the project
- Requires middleware for session refresh
- Requires `ALLOWED_AUTH_EMAILS` env var
- Requires `space_members` table populated before enabling enforce mode
- Login page must be designed to match existing UI
