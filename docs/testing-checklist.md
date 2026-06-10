# Testing Checklist

## Identity / Route

- [ ] `/me` home page interactions API call uses `identity=me`
- [ ] `/` home page interactions API call uses `identity=DEFAULT_NORMAL_IDENTITY_ID` (`xiaoguai`)
- [ ] `/me/notes` publishes with `author=me`
- [ ] `/notes` publishes with `author=DEFAULT_NORMAL_IDENTITY_ID` (`xiaoguai`)
- [ ] `/me/memories` does not redirect to partner `/notes`
- [ ] `/me/memories` does not redirect to partner `/albums`
- [ ] `/me/cards` does not show partner-only routes
- [ ] `/me/settings` nav items all start with `/me/`
- [ ] `/settings` nav items all start with `/` (no `/me` prefix)
- [ ] BottomNav `href` values match expected side (owner vs partner)

## Cloud Read State

- [ ] `/notes` unread notes show "未读" indicator
- [ ] Unread state clears after click / like / comment
- [ ] `/albums` new albums show red dot
- [ ] Red dot clears after lightbox open
- [ ] `/me` and `/` read states are independent (different identity)
- [ ] `content_reads` table records correct identity
- [ ] Read state persists across page reloads (Supabase mode)
- [ ] Read state syncs correctly after coming back online

## Interactions / Comments

- [ ] `POST /api/interactions` supports `sample-love-note-1`
- [ ] Like interaction does not return 500
- [ ] `GET /api/comments` does not return 500
- [ ] `POST /api/comments` does not return 500
- [ ] API failures return JSON error, not empty response
- [ ] Comments show correct author identity label
- [ ] Delete own comment works

## UI / Mobile

- [ ] Comment send button is visible
- [ ] Lightbox close button is tappable
- [ ] Download button is tappable on mobile
- [ ] BottomNav does not overlap input fields
- [ ] 375px viewport width has no horizontal scroll
- [ ] Touch targets are at least 44x44px
- [ ] Safe area insets respected on notched devices

## Navigation

- [ ] Owner BottomNav links: `/me`, `/me/records`, `/me/memories`, `/me/cards`, `/me/settings`
- [ ] Partner BottomNav links: `/`, `/records`, `/memories`, `/cards`, `/settings`
- [ ] `/me/notes` → BottomNav highlights `/me/records`
- [ ] `/me/albums` → BottomNav highlights `/me/memories`
- [ ] `/notes` → BottomNav highlights `/records`
- [ ] `/albums` → BottomNav highlights `/memories`
- [ ] `/admin` hides BottomNav
- [ ] `/cards/scan` hides BottomNav

## Backup / Restore

- [ ] Export produces valid JSON
- [ ] Import merges without duplicating existing records
- [ ] Soft-deleted notes can be restored
- [ ] Orphan file check runs without error

## Push Notifications

- [ ] Subscribe creates valid push subscription
- [ ] Test notification is delivered
- [ ] Unsubscribe cleans up subscription
- [ ] Expired subscriptions are cleaned up

## Offline / Degraded Mode

- [ ] App runs without Supabase env vars (localStorage mode)
- [ ] Cloud features show graceful message when Supabase is unavailable
- [ ] Push notification UI shows "not configured" when VAPID keys missing


## E2E Testing Workflow

### Prerequisites

- Dev server on port 3000. `playwright.config.ts` no longer auto-starts webServer; start it manually.
- If your machine has an HTTP proxy (e.g. `http_proxy=http://127.0.0.1:7897`), you must bypass it for localhost traffic.

### Local E2E (dev mode)

Terminal 1 — start dev server:

```bash
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY
export NO_PROXY=localhost,127.0.0.1
export no_proxy=localhost,127.0.0.1
npm run dev -- -p 3000
```

Terminal 2 — run E2E:

```bash
NO_PROXY=localhost,127.0.0.1 no_proxy=localhost,127.0.0.1 npx playwright test tests/e2e/miss-you-animation.spec.ts --reporter=line
NO_PROXY=localhost,127.0.0.1 no_proxy=localhost,127.0.0.1 npx playwright test tests/e2e/final-ui-qa.spec.ts --reporter=line
```

Note: dev mode compiles pages on first request, which may cause timeouts for large suites.
For full regression, use production-like mode below.

### Production-like E2E (recommended for full QA)

Terminal 1 — build and start:

```bash
rm -rf .next
npm run build
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY
export NO_PROXY=localhost,127.0.0.1
export no_proxy=localhost,127.0.0.1
npm run start -- -p 3000
```

Terminal 2 — run E2E:

```bash
NO_PROXY=localhost,127.0.0.1 no_proxy=localhost,127.0.0.1 npx playwright test tests/e2e/final-ui-qa.spec.ts --reporter=line
NO_PROXY=localhost,127.0.0.1 no_proxy=localhost,127.0.0.1 npx playwright test tests/e2e/miss-you-animation.spec.ts --reporter=line
```

### Full regression (production-like)

```bash
NO_PROXY=localhost,127.0.0.1 no_proxy=localhost,127.0.0.1 npx playwright test tests/e2e/owner-routing.spec.ts --reporter=line
NO_PROXY=localhost,127.0.0.1 no_proxy=localhost,127.0.0.1 npx playwright test tests/e2e/homepage-layout.spec.ts --reporter=line
NO_PROXY=localhost,127.0.0.1 no_proxy=localhost,127.0.0.1 npx playwright test tests/e2e/global-ui-polish.spec.ts --reporter=line
NO_PROXY=localhost,127.0.0.1 no_proxy=localhost,127.0.0.1 npx playwright test tests/e2e/notes-page.spec.ts --reporter=line
NO_PROXY=localhost,127.0.0.1 no_proxy=localhost,127.0.0.1 npx playwright test tests/e2e/albums-page.spec.ts --reporter=line
NO_PROXY=localhost,127.0.0.1 no_proxy=localhost,127.0.0.1 npx playwright test tests/e2e/memories-page.spec.ts --reporter=line
```

### Package scripts (Unix/Mac)

```bash
npm run test:e2e          # all E2E with proxy bypass
npm run test:e2e:final    # final-ui-qa only
npm run test:e2e:missyou  # miss-you-animation only
```

On machines without a proxy, you can use plain `npx playwright test` directly.
Windows users should set `NO_PROXY` via System Environment Variables and run `npx playwright test` manually.

### Quick pre-commit checklist

```bash
npm run lint              # zero warnings required
npm test                  # all unit tests pass
npm run build             # production build succeeds
```

### E2E test files

| File | Focus |
|---|---|
| `tests/e2e/final-ui-qa.spec.ts` | All 16 pages: crash, 375px, undefined/null/NaN, route guards, BottomNav, a11y |
| `tests/e2e/miss-you-animation.spec.ts` | MissYou delight: buttons, a11y, reduced-motion, click safety |
| `tests/e2e/owner-routing.spec.ts` | /me route isolation, BottomNav href audit |
| `tests/e2e/homepage-layout.spec.ts` | / and /me layout, weather, time hint, card order |
| `tests/e2e/global-ui-polish.spec.ts` | BottomNav, PageHeader, safe-area, side-aware accents |
| `tests/e2e/notes-page.spec.ts` | Notes wall, composer, filter, identity |
| `tests/e2e/albums-page.spec.ts` | Albums gallery, upload, lightbox |
| `tests/e2e/memories-page.spec.ts` | Memories timeline, unread flow |
