-- Supabase SQL migration: scenarios + user_preferences tables
-- Depends on: 001_workflows_table.sql (workflows table + set_updated_at function)
-- Run this in the Supabase SQL Editor (Dashboard > SQL > New Query)


-- ================================================================
-- 1. SCENARIOS TABLE
-- ================================================================

create table if not exists public.scenarios (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  workflow_id     uuid references public.workflows(id) on delete set null,
  name            text not null,
  nodes           jsonb not null default '[]',
  edges           jsonb not null default '[]',
  recursion_limit int default 25,
  estimate        jsonb,          -- cached WorkflowEstimation result
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Auto-update updated_at (reuses function from migration 001)
create trigger scenarios_updated_at
  before update on public.scenarios
  for each row execute function public.set_updated_at();


-- ================================================================
-- 2. USER PREFERENCES TABLE
-- ================================================================

create table if not exists public.user_preferences (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  theme              text default 'light',
  drawer_width       int default 420,
  active_workflow_id uuid references public.workflows(id) on delete set null,
  updated_at         timestamptz default now()
);

create trigger user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();


-- ================================================================
-- 3. ENABLE ROW-LEVEL SECURITY (must be before policies)
-- ================================================================

alter table public.scenarios        enable row level security;
alter table public.user_preferences enable row level security;


-- ================================================================
-- 4. RLS POLICIES — SCENARIOS
-- ================================================================

create policy "scenarios_select_own"
  on public.scenarios for select
  to authenticated
  using (auth.uid() = user_id);

create policy "scenarios_insert_own"
  on public.scenarios for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "scenarios_update_own"
  on public.scenarios for update
  to authenticated
  using (auth.uid() = user_id);

create policy "scenarios_delete_own"
  on public.scenarios for delete
  to authenticated
  using (auth.uid() = user_id);


-- ================================================================
-- 5. RLS POLICIES — USER PREFERENCES
-- ================================================================

create policy "prefs_select_own"
  on public.user_preferences for select
  to authenticated
  using (auth.uid() = user_id);

create policy "prefs_insert_own"
  on public.user_preferences for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "prefs_update_own"
  on public.user_preferences for update
  to authenticated
  using (auth.uid() = user_id);


-- ================================================================
-- 6. INDEXES
-- ================================================================

create index if not exists scenarios_user_id_idx  on public.scenarios(user_id);
create index if not exists scenarios_workflow_idx  on public.scenarios(workflow_id);
create index if not exists workflows_updated_idx   on public.workflows(updated_at desc);
