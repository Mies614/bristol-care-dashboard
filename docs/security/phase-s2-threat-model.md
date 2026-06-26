# Security Phase S2 Threat Model

## Status

S2 hardens API and data boundaries. It does not introduce real user authentication.

## Explicit Non-Goals

- No Supabase Auth.
- No login UI for the partner/owner product routes.
- No claim that only two real people can access the app.
- No production RLS or Storage policy changes are applied by this repository change.

## Boundaries

| Boundary | Protection | Residual Risk |
|---|---|---|
| Browser to Next.js write API | Origin allowlist plus request context validation | Origin is not authentication |
| Request space | Must match server-configured default space | `space_code` is not secret |
| Request identity | Derived from `/me` referer or partner route context | Path identity is not cryptographic |
| Next.js API to Supabase DB | Server-only service role client | Service role bypasses RLS |
| Browser to Supabase Storage | Public anon direct upload remains | Public bucket path prefix is not authorization |

## Key Statements

- routing identity is not authentication.
- `space_code` is a data partition field, not an authorization secret.
- `x-space-code` is accepted only as a compatibility hint and must match server config.
- Origin validation reduces cross-site writes but does not prove who the user is.
- RLS is defense in depth against direct anon/authenticated Data API access.
- The service role bypasses RLS, so API authorization remains mandatory.

## Next Real Access-Control Options

- Supabase Auth with membership tables and RLS ownership predicates.
- Device-bound signed token stored in HttpOnly cookies.
- Cloudflare Access or another external gate in front of the app.
