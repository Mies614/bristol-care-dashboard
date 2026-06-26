# Security Phase S2 API Boundary

## Request Context

`lib/security/requestContext.ts` centralizes browser-facing API context:

- `spaceCode` is the server-configured default from `NEXT_PUBLIC_DEFAULT_SPACE_CODE`.
- Client `spaceCode`, legacy `code`, and `x-space-code` must match that configured value.
- `side` is inferred from `/me` referer when present, otherwise partner by default.
- `identity` is derived from side: owner -> `me`, partner -> `xiaoguai`.
- Client-provided `identity`, `author`, `createdBy`, `viewer`, or `role` must not conflict.

This is a product context guard, not authentication.

## Hardened Routes

| Route | Boundary Change |
|---|---|
| `/api/comments` | Space checked; write/delete require Origin; identity derived |
| `/api/interactions` | Space checked; write/delete require Origin; identity derived |
| `/api/read-state` | Space checked; writes require Origin; `content_id` remains text |
| `/api/location` | Space checked; writes require Origin; location writer identity derived |
| `/api/miss-you` | Space checked; author/recipient/viewer derived |
| `/api/notes` | Space checked; author/created_by derived |
| `/api/albums` | Space checked; created_by derived |
| `/api/push/subscribe` | Role derived from side |
| `/api/push/test` | Owner side required |

## Residual Risk

These routes are hardened against accidental cross-space and cross-side writes, but the app still has no real user authentication. A same-origin attacker or anyone with app access is not cryptographically distinguished until a later auth/device boundary is introduced.
