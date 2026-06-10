# Bristol Care Dashboard — Architecture Guide

## Overview

Next.js App Router dual-entry PWA for couples. Two fixed identity sides sharing one codebase:

| Side | Path prefix | Identity ID | Role |
|---|---|---|---|
| Partner (小乖端) | `/**` | `xiaoguai` | partner |
| Owner (我端) | `/me/**` | `me` | owner |

## Core Architecture Decisions

### Dual-Entry Routing

- Identity is determined solely by URL path prefix (`appIdentity.ts`).
- No runtime identity switching — the path determines the side.
- `/me/layout.tsx` wraps all owner-side pages with `/me` prefix.
- Root `layout.tsx` wraps partner-side pages.

### Navigation

Single `navigation.ts` module produces different nav items per side:
- Partner: `/`, `/records`, `/memories`, `/cards`, `/settings`
- Owner: `/me`, `/me/records`, `/me/memories`, `/me/cards`, `/me/settings`

### Data Layer

Two modes:
1. **Supabase mode** — cloud sync via Supabase (production).
2. **localStorage mode** — offline/local development without Supabase env vars.

All cloud tables use `space_code` (not `space_id`) for multi-space isolation.

### Key Modules

| Module | Purpose |
|---|---|
| `lib/appIdentity.ts` | Path-based identity resolution |
| `lib/navigation.ts` | Nav items & active route logic |
| `lib/readState.ts` | Cloud read-state sync |
| `lib/reactions.ts` | Like/reaction system |
| `lib/cloudSync.ts` | Local↔Supabase sync engine |
| `lib/identity.ts` | Identity types & constants |
| `lib/supabase.ts` | Supabase client factory |
| `lib/push.ts` | Web Push notification helpers |

### Pages

| Path | Component | Side |
|---|---|---|
| `/` | Home | Partner |
| `/notes` | Notes wall | Partner |
| `/albums` | Albums gallery | Partner |
| `/memories` | Memories timeline | Partner |
| `/records` | Records dashboard | Partner |
| `/cards` | Cards wallet | Partner |
| `/settings` | Settings | Partner |
| `/me` | Home | Owner |
| `/me/notes` | Notes wall | Owner |
| `/me/albums` | Albums gallery | Owner |
| `/me/memories` | Memories timeline | Owner |
| `/me/records` | Records dashboard | Owner |
| `/me/cards` | Cards wallet | Owner |
| `/me/settings` | Settings | Owner |
| `/admin` | Admin panel | Partner |
| `/me/admin` | Admin panel | Owner |

## Testing Strategy

- **Unit tests**: Vitest in `tests/` — pure logic, mock-free, fast.
- **E2E tests**: Playwright in `tests/e2e/` — browser-level routing & interaction verification.
- **Identity testing**: Both sides must be tested (`/me` prefix vs no prefix).
