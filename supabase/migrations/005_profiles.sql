-- Supabase migration: profiles table + avatars storage bucket
-- Depends on: 001_workflows_table.sql (set_updated_at function)
-- Run in Supabase SQL Editor (Dashboard > SQL > New Query)

-- ================================================================
-- 1. CREATE PROFILES TABLE
-- ================================================================

create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  username_handle text not null,
  avatar_url      text,
  avatar_type     text check (avatar_type in ('upload', 'preset')),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Unique case-insensitive username
create unique index if not exists profiles_username_handle_lower_idx
  on public.profiles (lower(username_handle));

-- Check: 3-30 chars, alphanumeric + underscore
alter table public.profiles
  add constraint profiles_username_handle_format
  check (username_handle ~ '^[a-zA-Z0-9_]{3,30}$');

create index if not exists profiles_username_handle_idx on public.profiles (username_handle);

-- Auto-update updated_at (reuses function from migration 001)
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ================================================================
-- 2. ENABLE RLS ON PROFILES
-- ================================================================

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- No delete policy: profiles are 1:1 with auth.users, cascade on user delete

-- ================================================================
-- 3. AVATARS STORAGE BUCKET (public read)
-- ================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do nothing;

-- Users can upload/update/delete only their own folder: {user_id}/*
create policy "avatars_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read for avatar display
create policy "avatars_select_public"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');
