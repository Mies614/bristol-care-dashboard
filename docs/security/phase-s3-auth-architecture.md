# S3 Auth Architecture

## Overview

Two-person authentication via Supabase Auth Email OTP with server-enforced allowlist.

## Components

### Client
- `lib/supabase/browser.ts` — `createClient()` using `createBrowserClient` from `@supabase/ssr`
- Used by: login page to trigger OTP

### Server (User-facing)
- `lib/supabase/server.ts` — `createClient()` using `createServerClient` from `@supabase/ssr`
- Reads session from cookies, enforces RLS
- Used by: API routes for authenticated operations

### Server (Service Role)
- `lib/supabase/server.ts` — `createSupabaseServerClient()` (existing, unchanged)
- Uses service role key, bypasses RLS
- Used by: cron jobs, admin operations, membership queries

### Middleware
- `middleware.ts` — refreshes session, enforces auth on protected routes when `AUTH_ENFORCEMENT_MODE=enforce`

### Auth Context
- `lib/security/authenticatedRequestContext.ts` — resolves `auth.uid()` → `space_members` → role + space

### Feature Flag
```
AUTH_ENFORCEMENT_MODE=off|observe|enforce
ALLOWED_AUTH_EMAILS=email1@example.com,email2@example.com
```
