# Production Schema Reference

> Source of truth: the production Supabase database.  
> Do not infer schema from local tests alone. Always verify against production before changing database field names.

## Confirmed Tables & Space Code Fields

| Table | Space-isolation column |
|---|---|
| `content_interactions` | `space_code` |
| `content_comments` | `space_code` |
| `content_reads` | `space_code` |
| `space_locations` | `space_code` |
| `love_notes` | `space_code` |
| `album_items` | `space_code` |
| `miss_you_events` | `space_code` |

## Schema Verification SQL

Run these queries in Supabase SQL Editor to inspect production schema:

```sql
-- content_interactions
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'content_interactions'
order by ordinal_position;

-- content_comments
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'content_comments'
order by ordinal_position;

-- content_reads
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'content_reads'
order by ordinal_position;

-- space_locations
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'space_locations'
order by ordinal_position;
```

## Data Safety

For Security Phase S2.1, use `docs/security/production-rls-verification.sql`.
It only requests structure, policy, grant and Storage metadata. Do not paste
production user content, media paths, keys, JWTs, tokens or database passwords
into Codex.

## Migration & Change Rules

1. Always run verification SQL against production **before** writing any migration.
2. Never rename columns without confirming both local test data AND production.
3. `space_code` is a `text` column — do not change it to `space_id`.
4. When adding new tables, always include a `space_code` column for multi-space isolation.
5. All timestamp columns should use `timestamptz` with default `now()`.
