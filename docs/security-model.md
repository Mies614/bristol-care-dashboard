# Security Model

## Overview

Bristol Care Dashboard is a **single-couple PWA** with two identity sides. Security is path-based, not session-based — the URL prefix (`/me/**` vs `/**`) determines the actor.

## Identity Model

| Path Prefix | Identity ID | Role | Description |
|---|---|---|---|
| `/**` | `xiaoguai` (configurable) | Partner | 小乖端 |
| `/me/**` | `me` | Owner | 我端 |
| `/me/admin/**` | `me` (authenticated) | Admin | 管理后台 |

Identity is resolved purely by URL path in `lib/appIdentity.ts`. There is no login, no session, no JWT. This is intentional for a couple's private dashboard.

## Authentication

### Admin Access

- Admin password stored in `ADMIN_PASSWORD` env var (server-side only).
- Admin API routes validate via `x-admin-password` header.
- Admin login sets a signed cookie or session token.
- Admin password is **never exposed to the client**.

### Cron Jobs

- Vercel Cron jobs authenticate via `Authorization: Bearer <CRON_SECRET>`.
- `CRON_SECRET` is stored server-side only.

### Shared Access

- `bristol_dashboard_shared_access` localStorage key acts as a simple gate.
- E2E tests set this via `page.addInitScript`.

## Authorization

### Supabase Row Level Security

⚠️ **RLS policies are NOT currently configured.** This is the highest-priority security gap.

Recommended RLS baseline:

```sql
-- All content tables should be scoped to the couple's space_code
ALTER TABLE love_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Couple access" ON love_notes
  USING (space_code = current_setting('app.current_space_code', true));
```

### API Route Guards

- All `/me/admin/**` routes require admin password validation.
- `space_code` is always passed as a query parameter, never inferred from identity.
- Content CRUD operations validate `space_code` against the couple's space.

## Data Protection

### Secrets

| Secret | Storage | Exposure |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Server env only | Never sent to client |
| `ADMIN_PASSWORD` | Server env only | Never sent to client |
| `CRON_SECRET` | Server env only | Never sent to client |
| `VAPID_PRIVATE_KEY` | Server env only | Never sent to client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client env | Public (anon key by design) |
| `NEXT_PUBLIC_SUPABASE_URL` | Client env | Public |

### Data at Rest

- All data stored in Supabase (PostgreSQL + Storage).
- Storage buckets (`love-notes`, `couple-albums`, `backgrounds`) are **public** — anyone with the URL can access files.
- ⚠️ **This is an accepted risk** for a personal couple's app, but files are technically accessible if URLs are leaked.

### Data in Transit

- All Supabase connections use HTTPS.
- Vercel serves the app over HTTPS.

## Threat Model

| Threat | Likelihood | Impact | Mitigation |
|---|---|---|---|
| URL leakage of Storage files | Medium | Low | Accept risk (private app) |
| Brute force admin password | Low | High | Rate limiting not implemented ⚠️ |
| CSRF on admin API | Low | Medium | Same-origin by default; no mitigation |
| XSS in note content | Low | Medium | React auto-escapes JSX |
| Supabase anon key abuse | Low | Medium | Anon key scoped to public tables only |
| Storage egress bill shock | Medium | Medium | Cache headers, E2E mock, monitoring |
| Accidental production data in E2E | Medium | Low | Storage intercept in E2E |

## Gaps Requiring Attention

1. **No RLS policies** — P0, must be added before multi-couple use.
2. **No rate limiting** — P1, admin login and API routes vulnerable to brute force.
3. **No CSRF tokens** — P2, admin mutations could be forged by third-party sites.
4. **Public Storage buckets** — P2, acceptable for private use but risky if shared.
5. **No Content-Security-Policy header** — P2, XSS defense in depth.
