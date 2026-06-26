# Bristol Care Dashboard — Dual-End QA Matrix

Generated: 2026-06-26 | Commit: 0f44180 | Mode: observe

## Legend
- PASS: verified by automated test or code audit
- FAIL: known issue requiring fix
- NOT_TESTED: no automated coverage yet
- N/A: not applicable to this role/end

## Identity Matrix

| Module | Owner /me | Owner / | Partner / | Assertion |
|---|---|---|---|---|
| identity from auth | me | me | xiaoguai | space_members.identity_id |
| role from auth | owner | owner | partner | space_members.role |
| pathname not identity | PASS | PASS | PASS | middleware + auth context |
| localStorage not identity | PASS | PASS | PASS | OwnerViewSwitcher uses context |
| body identity ignored | PASS | PASS | PASS | requireAuth ignores client input |

## Auth & Login

| Feature | Owner /me | Owner / | Partner / | Test |
|---|---|---|---|---|
| OTP send | PASS | PASS | PASS | authAllowlist.test.ts |
| OTP verify | PASS | PASS | PASS | authAllowlist.test.ts |
| allowlist gate | PASS | PASS | PASS | authAllowlist.test.ts |
| login page OTP UI | PASS | PASS | PASS | component audit |
| rate limiting | PASS | PASS | PASS | authAllowlist.test.ts |
| owner default /me | PASS | N/A | N/A | middleware audit |
| partner default / | N/A | N/A | PASS | middleware audit |
| callback open redirect | PASS | PASS | PASS | authAllowlist.test.ts |

## Routing & Navigation

| Feature | Owner /me | Owner / | Partner / | Test |
|---|---|---|---|---|
| /me accessible | PASS | N/A | PASS (redirect /) | middleware audit |
| / accessible | PASS | PASS | PASS | middleware audit |
| /login → /me (owner) | PASS | PASS | N/A | middleware audit |
| /login → / (partner) | N/A | N/A | PASS | middleware audit |
| owner route guard | PASS | PASS | N/A | owner-routing.spec.ts |
| partner route guard | N/A | N/A | PASS | owner-routing.spec.ts |
| owner view switcher visible | PASS | PASS | N/A | OwnerViewSwitcher.tsx |
| partner no switcher | N/A | N/A | PASS | OwnerViewSwitcher.tsx |

## Home Page

| Feature | Owner /me | Owner / | Partner / | Test |
|---|---|---|---|---|
| hero section | PASS | PASS | PASS | homepage-layout.spec.ts |
| recent memories signed | PASS | PASS | PASS | code audit |
| TodayCareStrip | PASS | PASS | PASS | homepage-layout.spec.ts |
| weather card | PASS | PASS | PASS | homepage-layout.spec.ts |

## Love Notes

| Feature | Owner /me | Owner / | Partner / | Test |
|---|---|---|---|---|
| note list | NOT_TESTED | NOT_TESTED | NOT_TESTED | notes-page.spec.ts |
| create note | NOT_TESTED | NOT_TESTED | NOT_TESTED | |
| note media signed | PASS | PASS | PASS | code audit |
| note download | NOT_TESTED | NOT_TESTED | NOT_TESTED | |
| note reaction | NOT_TESTED | NOT_TESTED | NOT_TESTED | |
| note comment | NOT_TESTED | NOT_TESTED | NOT_TESTED | |

## Albums

| Feature | Owner /me | Owner / | Partner / | Test |
|---|---|---|---|---|
| album list | NOT_TESTED | NOT_TESTED | NOT_TESTED | albums-page.spec.ts |
| album upload | NOT_TESTED | NOT_TESTED | NOT_TESTED | |
| album media signed | PASS | PASS | PASS | code audit |
| album lightbox | PASS | PASS | PASS | albums-page.spec.ts |
| album download | NOT_TESTED | NOT_TESTED | NOT_TESTED | |

## Memories

| Feature | Owner /me | Owner / | Partner / | Test |
|---|---|---|---|---|
| memory timeline | NOT_TESTED | NOT_TESTED | NOT_TESTED | memories-page.spec.ts |
| memory media signed | PASS | PASS | PASS | code audit |

## Miss You

| Feature | Owner /me | Owner / | Partner / | Test |
|---|---|---|---|---|
| miss-you animation | NOT_TESTED | NOT_TESTED | NOT_TESTED | miss-you-animation.spec.ts |

## Media Infrastructure

| Feature | Owner /me | Owner / | Partner / | Test |
|---|---|---|---|---|
| signed upload | PASS | PASS | PASS | s2ExposureRemediationContract |
| signed read (Mode B batch) | PASS | PASS | PASS | privateMediaMigrationContract |
| signed read (Mode A) | PASS | PASS | PASS | privateMediaMigrationContract |
| download API | PASS | PASS | PASS | code audit |
| legacy path support | PASS | PASS | PASS | privateMediaMigrationContract |
| public URL parser | PASS | PASS | PASS | mediaReference.test.ts |
| no object/public private | PASS | PASS | PASS | code audit |

## Backgrounds & Settings

| Feature | Owner /me | Owner / | Partner / | Test |
|---|---|---|---|---|
| background (public) | PASS | PASS | PASS | code audit |
| theme settings | NOT_TESTED | NOT_TESTED | NOT_TESTED | |
| identity settings | NOT_TESTED | NOT_TESTED | NOT_TESTED | |
| owner-only settings | NOT_TESTED | NOT_TESTED | N/A | |

## RLS & Security

| Feature | Owner /me | Owner / | Partner / | Test |
|---|---|---|---|---|
| settings owner-only RLS | PASS | PASS | PASS | spaceMembership.test.ts |
| space_members membership | PASS | PASS | PASS | spaceMembership.test.ts |
| business table RLS | PASS | PASS | PASS | privateMediaMigrationContract |
| no public CRUD | PASS | PASS | PASS | s2ExposureRemediationContract |
| no anon upload | PASS | PASS | PASS | s2ExposureRemediationContract |
| origin guard | PASS | PASS | PASS | originGuard.test.ts |
| service role server-only | PASS | PASS | PASS | code audit |

## PWA & Mobile

| Feature | Desktop | Mobile 375 | Mobile 430 |
|---|---|---|---|
| sw.js syntax | PASS | PASS | PASS |
| signed URL not cached | PASS | PASS | PASS |
| /api/ not cached | PASS | PASS | PASS |
| no horizontal overflow | NOT_TESTED | NOT_TESTED | NOT_TESTED |

## Error Handling

| Scenario | Status |
|---|---|
| 401 unauthenticated | PASS (code audit) |
| 403 unauthorized | PASS (code audit) |
| media not found | PASS (code audit) |
| download failed toast | PASS (code audit) |

## Notification Identity Audit (S3)

| Route | Before | After | Identity Source |
|---|---|---|---|
| push/subscribe | resolveRequestContext + pathname role | resolveApiAuth → space_members.identity_id | auth.uid() |
| push/test | resolveRequestContext + pathname role | resolveApiAuth → role check | auth.uid() |
| push/unsubscribe | endpoint-based (no auth) | endpoint-based (de-identification OK) | N/A |
| miss-you GET | resolveRequestContext | resolveApiAuth | auth.uid() |
| miss-you POST | resolveRequestContext identity | resolveApiAuth identity | auth.uid() |
| miss-you PATCH | resolveRequestContext identity | resolveApiAuth identity | auth.uid() |
| cron/reminders | CRON_SECRET + service role | CRON_SECRET + service role (correct) | N/A |

## Owner-on-Partner-Side Identity

| Operation | Actor Identity | Recipient |
|---|---|---|
| miss-you from / | me | xiaoguai |
| push subscribe from / | me | N/A |
| push test from / | me | xiaoguai or me |
