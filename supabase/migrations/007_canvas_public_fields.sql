-- Supabase migration: public canvas sharing metadata
-- Depends on: 004_canvases.sql

alter table public.canvases
  add column if not exists is_public boolean not null default false,
  add column if not exists public_uuid uuid not null default gen_random_uuid(),
  add column if not exists last_estimation_report jsonb;

create index if not exists canvases_public_uuid_idx on public.canvases (public_uuid);
create index if not exists canvases_is_public_idx on public.canvases (is_public);
