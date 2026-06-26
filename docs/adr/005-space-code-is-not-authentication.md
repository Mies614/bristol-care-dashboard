# ADR-005: Space Code Is Not Authentication

**Status:** Accepted
**Date:** 2026-06-26

## Context

`space_code` partitions data for the private couple space. It is also present in client requests for backward compatibility and local-first sync.

## Decision

`space_code` is never treated as a password, credential, or authorization secret.

S2 request handling only accepts client-provided `space_code`, legacy `code`, or `x-space-code` when it matches the server-configured default space. Mismatch returns 403. Missing values fall back to the server default.

## Consequences

- Clients cannot choose arbitrary spaces.
- Error handling avoids space enumeration details.
- This does not prove who sent the request.
- True access control still requires Supabase Auth, a device credential, or an external access gate.
