-- Supabase migration: workflow_shares table for shareable workflow/canvas links
-- Depends on: 001_workflows_table.sql, 004_canvases.sql
-- Run in Supabase SQL Editor (Dashboard > SQL > New Query)

-- ================================================================
-- 1. CREATE WORKFLOW_SHARES TABLE
-- ================================================================

create table if not exists public.workflow_shares (
  id           uuid primary key default gen_random_uuid(),
  share_token  text not null unique,
  user_id      uuid not null references auth.users (id) on delete cascade,
  share_type   text not null check (share_type in ('workflow', 'canvas')),
  workflow_id  uuid references public.workflows (id) on delete set null,
  canvas_id    uuid references public.canvases (id) on delete set null,
  snapshot     jsonb not null,
  expires_at   timestamptz,
  created_at   timestamptz default now()
);

create index if not exists workflow_shares_share_token_idx on public.workflow_shares (share_token);
create index if not exists workflow_shares_user_id_idx on public.workflow_shares (user_id);

-- ================================================================
-- 2. ENABLE RLS
-- ================================================================

alter table public.workflow_shares enable row level security;

-- Authenticated users can select their own shares
create policy "workflow_shares_select_own"
  on public.workflow_shares for select
  to authenticated
  using (auth.uid() = user_id);

-- RPC for anon/authenticated to fetch a share by token (public link)
create or replace function public.get_share_by_token(token text)
returns setof public.workflow_shares
language sql
security definer
set search_path = public
as $$
  select * from workflow_shares
  where share_token = token
    and (expires_at is null or expires_at > now());
$$;

grant execute on function public.get_share_by_token(text) to anon;
grant execute on function public.get_share_by_token(text) to authenticated;

-- Authenticated users can insert their own shares
create policy "workflow_shares_insert_own"
  on public.workflow_shares for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Authenticated users can update/delete their own shares
create policy "workflow_shares_update_own"
  on public.workflow_shares for update
  to authenticated
  using (auth.uid() = user_id);

create policy "workflow_shares_delete_own"
  on public.workflow_shares for delete
  to authenticated
  using (auth.uid() = user_id);
