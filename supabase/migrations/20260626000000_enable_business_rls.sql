-- DRAFT — DO NOT APPLY UNTIL PRODUCTION RLS VERIFICATION IS COMPLETE.
-- Security Phase S2: direct anon/authenticated business table access guard.
--
-- This migration is intentionally conservative for the current no-auth model:
-- Browser -> Next.js API -> server-only service role -> Postgres.
-- The service role bypasses RLS, so API authorization remains mandatory.

begin;

do $$
declare
  missing_tables text[];
begin
  select array_agg(table_name order by table_name)
  into missing_tables
  from (
    values
      ('couple_spaces'),
      ('settings'),
      ('courses'),
      ('deadlines'),
      ('love_notes'),
      ('album_items'),
      ('miss_you_events'),
      ('miss_you_seen_state'),
      ('period_records'),
      ('push_subscriptions'),
      ('reminder_preferences'),
      ('reminder_delivery_log'),
      ('reminder_run_logs'),
      ('user_identities'),
      ('content_interactions'),
      ('content_comments'),
      ('content_reads'),
      ('space_locations')
  ) as required(table_name)
  where not exists (
    select 1
    from information_schema.tables t
    where t.table_schema = 'public'
      and t.table_name = required.table_name
  );

  if missing_tables is not null then
    raise exception 'Missing required public tables: %', array_to_string(missing_tables, ', ');
  end if;
end $$;

do $$
declare
  missing_columns text[];
begin
  select array_agg(table_name || '.space_code' order by table_name)
  into missing_columns
  from (
    values
      ('content_interactions'),
      ('content_comments'),
      ('content_reads'),
      ('space_locations'),
      ('reminder_preferences'),
      ('reminder_delivery_log'),
      ('user_identities')
  ) as required(table_name)
  where not exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = required.table_name
      and c.column_name = 'space_code'
      and c.data_type = 'text'
  );

  if missing_columns is not null then
    raise exception 'Missing required text space_code columns: %', array_to_string(missing_columns, ', ');
  end if;
end $$;

alter table public.couple_spaces enable row level security;
alter table public.settings enable row level security;
alter table public.courses enable row level security;
alter table public.deadlines enable row level security;
alter table public.love_notes enable row level security;
alter table public.album_items enable row level security;
alter table public.miss_you_events enable row level security;
alter table public.miss_you_seen_state enable row level security;
alter table public.period_records enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reminder_preferences enable row level security;
alter table public.reminder_delivery_log enable row level security;
alter table public.reminder_run_logs enable row level security;
alter table public.user_identities enable row level security;
alter table public.content_interactions enable row level security;
alter table public.content_comments enable row level security;
alter table public.content_reads enable row level security;
alter table public.space_locations enable row level security;

drop policy if exists "s2 service api only couple_spaces" on public.couple_spaces;
drop policy if exists "s2 service api only settings" on public.settings;
drop policy if exists "s2 service api only courses" on public.courses;
drop policy if exists "s2 service api only deadlines" on public.deadlines;
drop policy if exists "s2 service api only love_notes" on public.love_notes;
drop policy if exists "s2 service api only album_items" on public.album_items;
drop policy if exists "s2 service api only miss_you_events" on public.miss_you_events;
drop policy if exists "s2 service api only miss_you_seen_state" on public.miss_you_seen_state;
drop policy if exists "s2 service api only period_records" on public.period_records;
drop policy if exists "s2 service api only push_subscriptions" on public.push_subscriptions;
drop policy if exists "s2 service api only reminder_preferences" on public.reminder_preferences;
drop policy if exists "s2 service api only reminder_delivery_log" on public.reminder_delivery_log;
drop policy if exists "s2 service api only reminder_run_logs" on public.reminder_run_logs;
drop policy if exists "s2 service api only user_identities" on public.user_identities;
drop policy if exists "s2 service api only content_interactions" on public.content_interactions;
drop policy if exists "s2 service api only content_comments" on public.content_comments;
drop policy if exists "s2 service api only content_reads" on public.content_reads;
drop policy if exists "s2 service api only space_locations" on public.space_locations;

-- No anon/authenticated policies are created in S2. Business access is via
-- Next.js API routes using the service role, which bypasses RLS.

commit;

-- Post-deploy verification:
-- select schemaname, tablename, policyname, roles, cmd, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
-- order by tablename, policyname;
--
-- select relname, relrowsecurity
-- from pg_class c
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public'
--   and c.relkind = 'r'
-- order by relname;
