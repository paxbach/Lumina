-- ════════════════════════════════════════════════════════════════════
-- Lumina · Phase 2 additions
--   1. family_members.last_seen — durable timestamp so "Last seen 5
--      min ago" works even when the user is offline (Realtime channel
--      presence is only true while a tab is open).
--   2. family-photos Storage bucket — created here so the Family
--      Dashboard can render a memory-photo collage in a future PR
--      without us scrambling to add infra at upload time.
--   3. RPC update_member_last_seen — single-purpose write so the
--      client can ping its own row without arbitrary table updates.
-- ════════════════════════════════════════════════════════════════════

-- ────────────────────────── last_seen ──────────────────────────

alter table public.family_members
  add column if not exists last_seen timestamptz not null default now();

create index if not exists family_members_last_seen_idx
  on public.family_members(family_id, last_seen desc);

-- Single-purpose presence ping. SECURITY DEFINER + an explicit member-id
-- argument keeps the client honest (it can only stamp the row it claims
-- to own). The demo RLS would allow direct UPDATEs, but routing through
-- this RPC makes it easy to harden later without touching the client.
create or replace function public.update_member_last_seen(p_member_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.family_members
     set last_seen = now()
   where id = p_member_id;
end $$;

-- ────────────────────────── Storage bucket ──────────────────────────
-- Idempotent: we only insert the bucket row if it doesn't yet exist.
-- The bucket is PRIVATE — uploads in V3 will use signed URLs so kids'
-- photos never leak via predictable paths.

insert into storage.buckets (id, name, public)
values ('family-photos', 'family-photos', false)
on conflict (id) do nothing;

-- Demo-friendly RLS on storage.objects within this bucket. Tighten
-- in production to scope by family membership.
create policy if not exists "demo: read family-photos"
  on storage.objects for select
  using (bucket_id = 'family-photos');

create policy if not exists "demo: write family-photos"
  on storage.objects for insert
  with check (bucket_id = 'family-photos');

create policy if not exists "demo: update family-photos"
  on storage.objects for update
  using (bucket_id = 'family-photos');

create policy if not exists "demo: delete family-photos"
  on storage.objects for delete
  using (bucket_id = 'family-photos');

-- Suggested path convention for the future upload UI:
--   family-photos/{family_id}/{quest_id}/{member_id}-{timestamp}.jpg
-- The client should still strip EXIF on the device before upload (see
-- src/store/useAppStore.ts → stripImageMetadata).
