# Bristol Care Dashboard Agent Rules

## Identity Rules

- `/**` routes are partner side (小乖端).
- Partner side identity is `DEFAULT_NORMAL_IDENTITY_ID` = `"xiaoguai"`.
- `/me/**` routes are owner side (我端).
- Owner side identity is always `"me"`.
- `/me/**` pages must never rely on localStorage `currentIdentity`.
- `/me/**` pages must pass `identityId="me"` explicitly to business components.
- Partner side pages must pass `identityId={DEFAULT_NORMAL_IDENTITY_ID}` explicitly.
- Admin visible author/identity defaults to `"me"`.

## Route Rules

- `/me/**` links must stay under `/me`.
- `/me/notes` must not link to `/notes`.
- `/me/albums` must not link to `/albums`.
- `/me/memories` must not link to `/memories`, `/notes`, or `/albums` unless explicitly switching to partner side.
- BottomNav owner links (`/me/**`):
  - `/me`
  - `/me/records`
  - `/me/memories`
  - `/me/cards`
  - `/me/settings`
- BottomNav partner links (`/**`):
  - `/`
  - `/records`
  - `/memories`
  - `/cards`
  - `/settings`

## Supabase Schema Rules

Production Supabase schema is the source of truth.

Confirmed production content helper tables:

- `content_interactions.space_code`
- `content_comments.space_code`
- `content_reads.space_code`
- `space_locations.space_code`
- `love_notes.space_code`
- `album_items.space_code`
- `miss_you_events.space_code`

Do not infer schema from local tests alone. Always verify production schema before changing database field names.

## React & Next.js Rules

- Hooks must never be called conditionally (fixed call order before any early return).
- `usePathname()`, `useSearchParams()`, `useRouter()` must be called at the top of the component, unconditionally.
- Business components must accept `identityId` as a prop — never read `currentIdentity` from localStorage.
- Do not pass `space_id` when the schema uses `space_code`. These are different columns.
- All API failures must return safe JSON (never throw raw errors to the client).

## Development Rules

- Run `npm run lint` before each commit — zero warnings required.
- Run `npm test` before each commit — all tests must pass.
- Do not run `npm audit fix --force`.
- Do not leak Supabase keys or service role keys.
- Always check `.env.example` before modifying environment variables.
- `docs/` directory is the canonical source for project documentation — keep it in sync with code changes.

## Testing Rules

- Unit tests live in `tests/` and use Vitest.
- E2E tests live in `tests/e2e/` and use Playwright.
- Identity/routing tests must verify both `/me` and `/` sides.
- Cloud read state tests must verify correct identity is written to `content_reads`.
