-- Bristol Care Supabase schema.
-- Client browser code should call this app's /api/cloud/* and /api/admin/* routes.
-- Sensitive reads/writes for settings, courses, deadlines and quick_links are performed by server routes
-- with SUPABASE_SERVICE_ROLE_KEY. Do not expose the service role key to browser code.

create extension if not exists pgcrypto;

create table if not exists public.couple_spaces (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text default 'Bristol Care',
  girlfriend_name text default '小乖',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.couple_spaces(id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz default now(),
  unique(space_id, key)
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.couple_spaces(id) on delete cascade,
  name text not null,
  day text not null,
  start_time text not null,
  end_time text not null,
  location text,
  teacher text,
  note text,
  color text default 'rose',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.deadlines (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.couple_spaces(id) on delete cascade,
  title text not null,
  course_name text,
  due_date date not null,
  due_time text,
  priority text default 'medium',
  status text default 'todo',
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create table if not exists public.love_notes (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.couple_spaces(id) on delete cascade,
  content text not null,
  active boolean default true,
  pinned boolean default false,
  visible_from timestamptz default now(),
  created_by text default 'admin',
  author text default 'admin',
  note_type text default 'text',
  display_style text default 'sticky',
  mood text,
  image_url text,
  image_path text,
  image_alt text,
  audio_url text,
  audio_path text,
  video_url text,
  video_path text,
  media_size bigint,
  deleted_at timestamptz,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.love_notes
add column if not exists deleted_at timestamptz,
add column if not exists author text default 'admin',
add column if not exists note_type text default 'text',
add column if not exists display_style text default 'sticky',
add column if not exists mood text,
add column if not exists audio_url text,
add column if not exists audio_path text,
add column if not exists video_url text,
add column if not exists video_path text,
add column if not exists media_size bigint,
add column if not exists updated_at timestamptz default now();

create table if not exists public.quick_links (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.couple_spaces(id) on delete cascade,
  title text not null,
  url text not null,
  category text default 'general',
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.album_items (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.couple_spaces(id) on delete cascade,
  title text,
  note text,
  taken_at timestamptz,
  location text,
  type text not null default 'photo',
  image_url text,
  image_path text,
  video_url text,
  video_path text,
  width int,
  height int,
  file_size bigint,
  is_favorite boolean default false,
  created_by text default 'admin',
  created_at timestamptz default now(),
  deleted_at timestamptz
);

-- ================================================================
-- Miss You Events
-- ================================================================
create table if not exists public.miss_you_events (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.couple_spaces(id) on delete cascade,
  author text default 'xiaoguai',
  recipient text default 'admin',
  message text default '想你一下',
  local_date text,
  source text default 'button',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  deleted_at timestamptz
);

-- Add new columns if upgrading from old schema
alter table public.miss_you_events
add column if not exists recipient text default 'admin',
add column if not exists source text default 'button',
add column if not exists metadata jsonb default '{}'::jsonb;

create index if not exists miss_you_events_space_created_idx
on public.miss_you_events(space_id, created_at desc);

create index if not exists miss_you_events_space_local_date_idx
on public.miss_you_events(space_id, local_date);

create index if not exists miss_you_events_recipient_created_idx
on public.miss_you_events(space_id, recipient, created_at desc);

-- ================================================================
-- Miss You Seen State
-- ================================================================
create table if not exists public.miss_you_seen_state (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.couple_spaces(id) on delete cascade,
  viewer text not null,
  last_seen_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists miss_you_seen_state_space_viewer_unique
on public.miss_you_seen_state(space_id, viewer);

create index if not exists miss_you_seen_state_space_updated_idx
on public.miss_you_seen_state(space_id, updated_at desc);

-- ================================================================
-- Push Subscriptions
-- ================================================================
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.couple_spaces(id) on delete cascade,
  role text default 'admin',
  endpoint text not null,
  subscription jsonb not null,
  user_agent text,
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create unique index if not exists push_subscriptions_endpoint_unique
on public.push_subscriptions(endpoint);

create index if not exists push_subscriptions_space_enabled_idx
on public.push_subscriptions(space_id, enabled);

create table if not exists public.period_records (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.couple_spaces(id) on delete cascade,
  start_date date not null,
  end_date date,
  flow text,
  symptoms text[],
  mood text,
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

create index if not exists idx_couple_spaces_code on public.couple_spaces(code);
create index if not exists idx_settings_space_key on public.settings(space_id, key);
create index if not exists idx_courses_space on public.courses(space_id);
create index if not exists idx_deadlines_space_due_date on public.deadlines(space_id, due_date);
create index if not exists idx_love_notes_visible on public.love_notes(space_id, active, pinned, visible_from);
create index if not exists love_notes_space_wall_idx on public.love_notes(space_id, active, pinned, created_at desc);
create index if not exists love_notes_space_author_idx on public.love_notes(space_id, author, created_at desc);
create index if not exists love_notes_space_type_idx on public.love_notes(space_id, note_type, created_at desc);
create index if not exists love_notes_space_style_idx on public.love_notes(space_id, display_style, created_at desc);
create index if not exists idx_quick_links_space_sort on public.quick_links(space_id, sort_order);
create index if not exists album_items_space_created_idx on public.album_items(space_id, created_at desc);
create index if not exists album_items_space_favorite_idx on public.album_items(space_id, is_favorite, created_at desc);
create index if not exists period_records_space_start_idx on public.period_records(space_id, start_date desc);

-- Schema migration: add deleted_at to deadlines table (for soft delete support during sync)
alter table public.deadlines
add column if not exists deleted_at timestamptz;

-- Schema migration: add deleted_at and timestamp fields to courses table
alter table public.courses
add column if not exists created_at timestamptz default now(),
add column if not exists updated_at timestamptz default now(),
add column if not exists deleted_at timestamptz;

alter table public.album_items
add column if not exists created_by text default 'xiaoguai';

alter table public.couple_spaces enable row level security;
alter table public.settings enable row level security;
alter table public.courses enable row level security;
alter table public.deadlines enable row level security;
alter table public.love_notes enable row level security;
alter table public.quick_links enable row level security;
alter table public.album_items enable row level security;
alter table public.period_records enable row level security;
alter table public.miss_you_events enable row level security;
alter table public.miss_you_seen_state enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists "anon can read couple space by code" on public.couple_spaces;
create policy "anon can read couple space by code"
on public.couple_spaces
for select
to anon
using (true);

drop policy if exists "anon can read visible love notes" on public.love_notes;
create policy "anon can read visible love notes"
on public.love_notes
for select
to anon
using (active = true and visible_from <= now() and deleted_at is null);

-- No anon database write policies are defined. Server API routes use the service role key for:
-- settings, courses, deadlines, quick_links and love note metadata writes.
-- Album reads/writes also go through /api/albums with the service role key.

insert into public.couple_spaces (code, name, girlfriend_name)
values ('xiaoguai520', 'Bristol Care', '小乖')
on conflict (code) do update
set name = excluded.name,
    girlfriend_name = '小乖',
    updated_at = now();

with space as (
  select id from public.couple_spaces where code = 'xiaoguai520'
)
insert into public.settings (space_id, key, value)
select id, 'next_meeting_date', 'null'::jsonb from space
on conflict (space_id, key) do update set value = excluded.value, updated_at = now();

with space as (
  select id from public.couple_spaces where code = 'xiaoguai520'
)
insert into public.settings (space_id, key, value)
select id, 'semester_end_date', 'null'::jsonb from space
on conflict (space_id, key) do update set value = excluded.value, updated_at = now();

with space as (
  select id from public.couple_spaces where code = 'xiaoguai520'
)
insert into public.settings (space_id, key, value)
select id, 'girlfriend_name', to_jsonb('小乖'::text) from space
on conflict (space_id, key) do update set value = to_jsonb('小乖'::text), updated_at = now();

with space as (
  select id from public.couple_spaces where code = 'xiaoguai520'
)
insert into public.settings (space_id, key, value)
select id, 'period_settings', jsonb_build_object(
  'averageCycleLength', 28,
  'averagePeriodLength', 5,
  'reminderDaysBefore', 2
) from space
on conflict (space_id, key) do update set value = excluded.value, updated_at = now();

with space as (
  select id from public.couple_spaces where code = 'xiaoguai520'
)
insert into public.settings (space_id, key, value)
select id, 'theme_settings', jsonb_build_object(
  'style', 'soft',
  'cardStyle', 'glass',
  'navStyle', 'glass',
  'radius', 'extra',
  'decoration', 'stars'
) from space
on conflict (space_id, key) do update set value = excluded.value, updated_at = now();

-- Supabase Storage:
-- Create a public bucket named "love-notes" in the Supabase dashboard.
-- Create another public bucket named "couple-albums" for album photos and videos.
-- Create another public bucket named "backgrounds" for synced background images.
-- Image paths should look like: xiaoguai520/1700000000000-random.webp
-- Album paths should look like: xiaoguai520/images/1700000000000-random.webp
-- or xiaoguai520/videos/1700000000000-random.mp4
-- Optional public read policy for storage.objects, if your project requires explicit policies:
-- create policy "public read love note images"
-- on storage.objects for select to anon
-- using (bucket_id = 'love-notes');
-- Album uploads use the browser publishable key to upload files directly to Storage.
-- Database metadata is still written only by /api/albums with the service role key.
-- If direct album upload returns "permission denied", add a Storage insert policy like:
-- create policy "anon upload couple album files"
-- on storage.objects for insert to anon
-- with check (bucket_id = 'couple-albums');
-- Optional public read policy:
-- create policy "public read couple album files"
-- on storage.objects for select to anon
-- using (bucket_id = 'couple-albums');
-- User note wall media uploads use browser direct uploads to love-notes.
-- Add these policies if the bucket blocks public uploads:
-- create policy "Allow public uploads to love notes"
-- on storage.objects for insert to anon
-- with check (bucket_id = 'love-notes');
-- create policy "Allow public reads from love notes"
-- on storage.objects for select to anon
-- using (bucket_id = 'love-notes');
-- Background image uploads use browser direct uploads to backgrounds:
-- create policy "Allow public uploads to backgrounds"
-- on storage.objects for insert to anon
-- with check (bucket_id = 'backgrounds');
-- create policy "Allow public reads from backgrounds"
-- on storage.objects for select to anon
-- using (bucket_id = 'backgrounds');