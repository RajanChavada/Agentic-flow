-- Supabase migration: canvas thumbnails (thumbnail_url + storage bucket)
-- Depends on: 004_canvases.sql

-- ================================================================
-- 1. ADD THUMBNAIL_URL TO CANVASES
-- ================================================================

alter table public.canvases
  add column if not exists thumbnail_url text;

-- ================================================================
-- 2. CREATE STORAGE BUCKET (if not exists)
-- ================================================================

insert into storage.buckets (id, name, public)
select 'canvas-thumbnails', 'canvas-thumbnails', true
where not exists (select 1 from storage.buckets where id = 'canvas-thumbnails');

-- ================================================================
-- 3. STORAGE RLS POLICIES
-- ================================================================

drop policy if exists "canvas_thumbnails_insert_own" on storage.objects;
drop policy if exists "canvas_thumbnails_update_own" on storage.objects;
drop policy if exists "canvas_thumbnails_delete_own" on storage.objects;
drop policy if exists "canvas_thumbnails_select_public" on storage.objects;

-- Users can upload to their own folder: {user_id}/{canvas_id}.png
create policy "canvas_thumbnails_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'canvas-thumbnails'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own files
create policy "canvas_thumbnails_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'canvas-thumbnails'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own files
create policy "canvas_thumbnails_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'canvas-thumbnails'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read (bucket is public)
create policy "canvas_thumbnails_select_public"
  on storage.objects for select
  to public
  using (bucket_id = 'canvas-thumbnails');
