# Security Phase S2.1 Schema Drift Report

## Status

Pending production SQL output.

## Current Repository Baseline

| Object | Repository State | Production State | Difference | Risk | Migration Handling |
|---|---|---|---|---|---|
| `love_notes` partition column | `space_id` in `supabase/schema.sql`; `space_code` in docs | Pending verification | Possible `space_id`/`space_code` drift | High | Do not finalize migration |
| `album_items` partition column | `space_id` in `supabase/schema.sql`; `space_code` in docs | Pending verification | Possible `space_id`/`space_code` drift | High | Do not finalize migration |
| `miss_you_events` partition column | `space_id` in `supabase/schema.sql`; `space_code` in docs | Pending verification | Possible `space_id`/`space_code` drift | High | Do not finalize migration |
| `content_comments.content_id` | text in schema | Pending verification | Unknown | Medium | Must remain text |
| `content_interactions.content_id` | text in schema | Pending verification | Unknown | Medium | Must remain text |
| `content_reads.content_id` | text in schema | Pending verification | Unknown | Medium | Must remain text |
| `user_identities` access | Browser anon client dependency exists | Pending verification | RLS may block client dependency | Medium | Decide API migration or temporary policy before deploy |
| Storage buckets | Public direct upload assumed by app | Pending verification | Unknown policies | High | Do not change Storage automatically |

## Production Result Template

Fill after `production-rls-verification.sql` output is reviewed:

| Object | Production State | Compatible With Draft | Required Change |
|---|---|---|---|
| public tables | Pending | Pending | Pending |
| public policies | Pending | Pending | Pending |
| public grants | Pending | Pending | Pending |
| Storage buckets | Pending | Pending | Pending |
| storage.objects policies | Pending | Pending | Pending |
