-- Supabase SQL migration: workflows table + RLS policies
-- Run this in the Supabase SQL Editor (Dashboard > SQL > New Query)

-- 1. Create the workflows table
create table if not exists public.workflows (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  description text,
  graph       jsonb not null,          -- { nodes, edges, recursionLimit }
  last_estimate jsonb,                 -- cached WorkflowEstimation
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Index for fast per-user lookups
create index if not exists workflows_user_id_idx on public.workflows (user_id);

-- 2. Enable Row-Level Security
alter table public.workflows enable row level security;

-- 3. RLS policies — each user can only CRUD their own rows
create policy "Users can view their workflows"
  on public.workflows for select
  to authenticated
  using ( auth.uid() = user_id );

create policy "Users can insert their workflows"
  on public.workflows for insert
  to authenticated
  with check ( auth.uid() = user_id );

create policy "Users can update their workflows"
  on public.workflows for update
  to authenticated
  using ( auth.uid() = user_id );

create policy "Users can delete their workflows"
  on public.workflows for delete
  to authenticated
  using ( auth.uid() = user_id );

-- 4. Auto-update `updated_at` on row changes
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger workflows_updated_at
  before update on public.workflows
  for each row execute function public.set_updated_at();
