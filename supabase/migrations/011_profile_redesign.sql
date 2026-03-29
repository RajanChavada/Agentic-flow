-- Supabase migration: profile redesign support
-- Adds profile fields, estimate_runs activity table, and pinning metadata.

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists bio text,
  add column if not exists location text,
  add column if not exists website text;

alter table public.profiles
  drop constraint if exists profiles_bio_length;

alter table public.profiles
  add constraint profiles_bio_length
  check (bio is null or char_length(bio) <= 160);

alter table public.canvases
  add column if not exists is_pinned boolean not null default false,
  add column if not exists pin_order int not null default 0;

create index if not exists canvases_user_pinned_idx on public.canvases (user_id, is_pinned, pin_order);

create table if not exists public.estimate_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  canvas_id uuid references public.canvases(id) on delete set null,
  node_count int,
  total_cost numeric,
  created_at timestamptz not null default now()
);

create index if not exists estimate_runs_user_created_idx on public.estimate_runs (user_id, created_at desc);
create index if not exists estimate_runs_canvas_created_idx on public.estimate_runs (canvas_id, created_at desc);

alter table public.estimate_runs enable row level security;

drop policy if exists "estimate_runs_select_own" on public.estimate_runs;
create policy "estimate_runs_select_own"
  on public.estimate_runs for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "estimate_runs_insert_own" on public.estimate_runs;
create policy "estimate_runs_insert_own"
  on public.estimate_runs for insert
  to authenticated
  with check (auth.uid() = user_id);
