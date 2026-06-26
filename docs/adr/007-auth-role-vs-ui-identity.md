# ADR 007: Auth Role vs UI Identity

## Status
Proposed (Phase S3)

## Context
The app has two distinct identity concepts:
1. **Auth user** (`auth.users.id`) — the real person who logged in
2. **UI identity** (`user_identities.id`) — the display name/avatar shown in comments and interactions

There is also:
3. **Auth role** (`space_members.role`) — `owner` or `partner`, determines permissions
4. **Path-based side** (`/` vs `/me`) — determines which product view is shown

## Decision
These must be kept strictly separate:

- `auth.users.id` = the authenticated person (never exposed to client as modifiable)
- `space_members.role` = authorization role, stored in database, queried server-side
- `user_identities.id` = UI display configuration (e.g., "小乖", "me")
- `space_members.identity_id` = which UI identity this auth user uses

The mapping `auth.user → space_members.role → UI identity` is resolved server-side and the client only receives the resolved UI identity for display purposes.

The client must never:
- Send `role` or `identity` to API routes for authorization
- Choose which UI identity to use based on path
- Elevate from partner to owner by changing a query parameter

## Consequences
- All API routes must resolve auth context server-side
- `user_identities.role` is deprecated for authorization (only for display defaults)
- Path-based routing (`/` vs `/me`) remains for UX but does not grant permissions
