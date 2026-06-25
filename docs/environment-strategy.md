# Environment Strategy

## Current State

Bristol Care Dashboard currently runs with a **single environment** — local development uses the same Supabase project as production when credentials are configured.

| Aspect | Current | Risk |
|---|---|---|
| Local dev | Uses production Supabase if env vars set | High — dev actions affect production data |
| E2E tests | Uses whatever server is running (usually production build) | High — test interactions pollute real data |
| Vercel Preview | Unknown — likely uses production credentials | High — preview deployments may write to production |
| Production | Vercel + production Supabase | Normal |

## Target Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Local Dev  │    │  CI / Test    │    │  Production  │
│              │    │               │    │              │
│ localStorage │    │ localStorage  │    │  Supabase     │
│ (no Supabase)│    │ (no Supabase) │    │  Production   │
└─────────────┘    └──────────────┘    └─────────────┘
                                              │
┌─────────────┐                               │
│ E2E Tests    │                               │
│              │                               │
│ Mock Storage │                               │
│ Mock DB      │                               │
└─────────────┘
```

## Environment Variables Strategy

### `.env.local` (local development)

```bash
# Leave Supabase empty for localStorage mode during development
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Required
NEXT_PUBLIC_DEFAULT_SPACE_CODE=test-space
ADMIN_PASSWORD=dev-password
```

### `.env.production` (Vercel Production)

```bash
NEXT_PUBLIC_SUPABASE_URL=<production-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<production-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<production-service-role-key>
NEXT_PUBLIC_DEFAULT_SPACE_CODE=<production-space-code>
ADMIN_PASSWORD=<production-admin-password>
CRON_SECRET=<production-cron-secret>
```

### `.env.preview` (Vercel Preview — NOT YET IMPLEMENTED)

⚠️ Previews should use localStorage mode or a separate test Supabase project.

## Guards

### 1. Local dev guard (TODO)

Add to `next.config.ts`:

```ts
// Warn if production Supabase URL is detected in development
if (process.env.NODE_ENV === 'development') {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url && !url.includes('localhost') && !url.includes('127.0.0.1')) {
    console.warn('⚠️  Using remote Supabase in development. E2E and dev actions will affect production data.');
  }
}
```

### 2. E2E Storage guard (DONE)

`tests/e2e/fixtures.ts` intercepts all Supabase Storage requests.

### 3. E2E API guard (TODO)

Consider intercepting Supabase REST API requests in E2E to prevent test mutations.

### 4. Vercel Preview guard (TODO)

Set `NEXT_PUBLIC_SUPABASE_URL=` and `NEXT_PUBLIC_SUPABASE_ANON_KEY=` in Vercel Preview environment to force localStorage mode.

## Migration Path

| Phase | Action | Risk |
|---|---|---|
| Now | Document current state | None |
| Now | Add dev warning for remote Supabase | None |
| Phase 2 | Create separate test Supabase project | Medium — requires DB schema copy |
| Phase 3 | E2E uses localStorage mode exclusively | Low — tests are self-contained |
| Phase 4 | Vercel Preview uses test Supabase | Medium — requires env config |
