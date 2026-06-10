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
