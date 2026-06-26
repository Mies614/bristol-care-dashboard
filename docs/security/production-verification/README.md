# Production Supabase Verification

This directory contains split read-only SQL queries for the Bristol Care Dashboard
Security Phase S2 production preflight.

## Why split?

The Supabase Dashboard SQL Editor only shows the **last** result set when you run
a script with multiple queries in one go. Splitting each query into its own file
ensures every result is visible and copyable.

## How to run

1. Sign in to your Supabase Dashboard for the Bristol project.
2. Open **SQL Editor**.
3. Run **one file at a time** in this order:

   01. `01-public-tables-rls.sql`
   02. `02-public-policies.sql`
   03. `03-public-columns.sql`
   04. `04-public-indexes.sql`
   05. `05-public-constraints.sql`
   06. `06-public-grants.sql`
   07. `07-storage-buckets.sql`
   08. `08-storage-object-policies.sql`
   09. `09-storage-object-grants.sql`

4. After each run, copy **all result columns and all result rows**.

## What to share

- Column names and their values (structure output)
- RLS status flags
- Policy definitions (qual / with_check expressions)
- Grant records
- Bucket metadata

## What NOT to share

- **Business data rows** from `love_notes`, `album_items`, `miss_you_events`, etc.
- **Media URLs** from `storage.objects`
- **JWT tokens**
- **API keys** (anon key / service role key)
- **Database passwords**
- **Service role key**

## Important

Do **not** apply the S2 RLS draft migration until all verification results have
been collected and reviewed for schema drift against this repo.
