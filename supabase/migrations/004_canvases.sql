-- Supabase migration: canvases table + canvas_id on workflows
-- Run in Supabase SQL Editor (Dashboard > SQL > New Query)
-- Depends on: 001_workflows_table.sql, 002_scenarios_and_preferences.sql

-- ================================================================
-- 1. CREATE CANVASES TABLE
-- ================================================================

create table if not exists public.canvases (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null default 'Untitled Canvas',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists canvases_user_id_idx on public.canvases (user_id);
create index if not exists canvases_updated_idx on public.canvases (updated_at desc);

-- Auto-update updated_at (reuses function from migration 001)
create trigger canvases_updated_at
  before update on public.canvases
  for each row execute function public.set_updated_at();

-- ================================================================
-- 2. ADD CANVAS_ID TO WORKFLOWS
-- ================================================================

alter table public.workflows
  add column if not exists canvas_id uuid references public.canvases (id) on delete set null;

create index if not exists workflows_canvas_id_idx on public.workflows (canvas_id);

-- ================================================================
-- 3. ENABLE RLS ON CANVASES
-- ================================================================

alter table public.canvases enable row level security;

create policy "canvases_select_own"
  on public.canvases for select
  to authenticated
  using (auth.uid() = user_id);

create policy "canvases_insert_own"
  on public.canvases for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "canvases_update_own"
  on public.canvases for update
  to authenticated
  using (auth.uid() = user_id);

create policy "canvases_delete_own"
  on public.canvases for delete
  to authenticated
  using (auth.uid() = user_id);

-- ================================================================
-- 4. BACKFILL: Create default canvas per user, assign workflows
-- ================================================================

-- For each user who has workflows, create one default canvas and assign workflows to it
insert into public.canvases (id, user_id, name)
select
  gen_random_uuid(),
  w.user_id,
  'My Workflows'
from public.workflows w
where not exists (
  select 1 from public.canvases c where c.user_id = w.user_id
)
group by w.user_id;

-- Assign each workflow to its user's default canvas
update public.workflows w
set canvas_id = (
  select c.id from public.canvases c
  where c.user_id = w.user_id
  order by c.created_at asc
  limit 1
)
where w.canvas_id is null;
