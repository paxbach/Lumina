-- ════════════════════════════════════════════════════════════════════
-- Lumina · Phase 3 — Fix storage bucket + policies
-- ────────────────────────────────────────────────────────────────────
-- Root cause for "Failed to fetch" on uploadFamilyPhoto:
--
--   Migration 0002 used `create policy if not exists "..." on
--   storage.objects ...`. Postgres does NOT support `IF NOT EXISTS`
--   on CREATE POLICY, so that statement raises a syntax error.
--   Depending on Supabase SQL Editor's transaction wrapping, either
--   the whole 0002 batch rolled back (no bucket, no policies) or the
--   bucket got created without any policies attached (anon clients
--   then fail to upload because RLS denies them by default).
--
-- This migration is idempotent: it (re)creates the bucket as public
-- and rewrites the four policies from scratch using `DROP IF EXISTS
-- ... THEN CREATE` so it's safe to run repeatedly.
-- ════════════════════════════════════════════════════════════════════

-- 1. Bucket exists + is public (demo).
insert into storage.buckets (id, name, public)
values ('family-photos', 'family-photos', true)
on conflict (id) do update set public = true;

-- 2. Make sure RLS is on so the policies actually gate access.
alter table storage.objects enable row level security;

-- 3. Reset any policies that may or may not exist under our names.
drop policy if exists "demo: read family-photos"   on storage.objects;
drop policy if exists "demo: write family-photos"  on storage.objects;
drop policy if exists "demo: update family-photos" on storage.objects;
drop policy if exists "demo: delete family-photos" on storage.objects;

-- 4. Recreate them, demo-permissive. Tighten to family-membership
--    scope before production (see comment in 0002).
create policy "demo: read family-photos"
  on storage.objects for select
  using (bucket_id = 'family-photos');

create policy "demo: write family-photos"
  on storage.objects for insert
  with check (bucket_id = 'family-photos');

create policy "demo: update family-photos"
  on storage.objects for update
  using (bucket_id = 'family-photos');

create policy "demo: delete family-photos"
  on storage.objects for delete
  using (bucket_id = 'family-photos');

-- 5. Diagnostic — paste this select after running, you should see
--    the bucket row with public = true, and four policy rows.
--
--   select id, name, public from storage.buckets where id = 'family-photos';
--   select policyname, cmd from pg_policies
--    where schemaname = 'storage' and tablename = 'objects'
--      and policyname like 'demo: % family-photos';
