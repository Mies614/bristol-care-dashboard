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
  updated_at timestamptz default now()
);

create table if not exists public.love_notes (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.couple_spaces(id) on delete cascade,
  content text not null,
  active boolean default true,
  pinned boolean default false,
  visible_from timestamptz default now(),
  created_by text default 'admin',
  image_url text,
  image_path text,
  image_alt text,
  deleted_at timestamptz,
  created_at timestamptz default now()
);

alter table public.love_notes
add column if not exists deleted_at timestamptz;

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

create index if not exists idx_couple_spaces_code on public.couple_spaces(code);
create index if not exists idx_settings_space_key on public.settings(space_id, key);
create index if not exists idx_courses_space on public.courses(space_id);
create index if not exists idx_deadlines_space_due_date on public.deadlines(space_id, due_date);
create index if not exists idx_love_notes_visible on public.love_notes(space_id, active, pinned, visible_from);
create index if not exists idx_quick_links_space_sort on public.quick_links(space_id, sort_order);

alter table public.couple_spaces enable row level security;
alter table public.settings enable row level security;
alter table public.courses enable row level security;
alter table public.deadlines enable row level security;
alter table public.love_notes enable row level security;
alter table public.quick_links enable row level security;

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

-- No anon write policies are defined. Server API routes use the service role key for:
-- settings, courses, deadlines, quick_links and admin love note writes.

insert into public.couple_spaces (code, name, girlfriend_name)
values ('BRISTOL2026', 'Bristol Care', '小乖')
on conflict (code) do update
set name = excluded.name,
    girlfriend_name = '小乖',
    updated_at = now();

with space as (
  select id from public.couple_spaces where code = 'BRISTOL2026'
)
insert into public.settings (space_id, key, value)
select id, 'next_meeting_date', 'null'::jsonb from space
on conflict (space_id, key) do update set value = excluded.value, updated_at = now();

with space as (
  select id from public.couple_spaces where code = 'BRISTOL2026'
)
insert into public.settings (space_id, key, value)
select id, 'semester_end_date', 'null'::jsonb from space
on conflict (space_id, key) do update set value = excluded.value, updated_at = now();

with space as (
  select id from public.couple_spaces where code = 'BRISTOL2026'
)
insert into public.settings (space_id, key, value)
select id, 'girlfriend_name', to_jsonb('小乖'::text) from space
on conflict (space_id, key) do update set value = to_jsonb('小乖'::text), updated_at = now();

-- Supabase Storage:
-- Create a public bucket named "love-notes" in the Supabase dashboard.
-- Image paths should look like: BRISTOL2026/1700000000000-random.webp
-- Optional public read policy for storage.objects, if your project requires explicit policies:
-- create policy "public read love note images"
-- on storage.objects for select to anon
-- using (bucket_id = 'love-notes');
